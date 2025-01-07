import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransferredFile } from './entities/file.entity.js';
import { getParams } from '../aws/s3-upload.params.js';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { Response } from 'express';
import * as bcrypt from 'bcrypt';
import { genSalt } from 'bcrypt';
import { fileTypeFromBuffer } from 'file-type';
import { instanceToPlain } from 'class-transformer';
import { UploadFileDto } from 'src/models/uploadFileDto.js';
import { FileCompressionService } from '../file-compression/file-compression.service.js';

@Injectable()
export class FilesService {
  constructor(
    @Inject('S3_CLIENT') private s3,
    @InjectRepository(TransferredFile)
    private fileRepository: Repository<TransferredFile>,
    private fileCompressionService: FileCompressionService,
  ) {}

  async upload(files: Express.Multer.File[], body?: UploadFileDto) {
    await this.checkFileType(files);
    const filesToUpload: Express.Multer.File[] = [];
    if (body.toCompress) {
      const fileType = files[0].mimetype.split('/');
      if (
        files.length == 1 &&
        (fileType[0] == 'image' || fileType[1] == 'pdf')
      ) {
        if (fileType[1] == 'pdf') {
          filesToUpload.push(
            await this.fileCompressionService.compressPDF(files[0]),
          );
        }
        if (fileType[1] == 'gif') {
          filesToUpload.push(
            await this.fileCompressionService.resizeGif(files[0]),
          );
        } else if (fileType[0] == 'image') {
          filesToUpload.push(
            await this.fileCompressionService.resizeImage(files[0]),
          );
        }
      } else {
        filesToUpload.push(
          await this.fileCompressionService.archiveFiles(files),
        );
      }
    } else {
      filesToUpload.push(...files);
    }
    await this.checkFileSize(filesToUpload);
    return await this.uploadMultipleFiles(filesToUpload, body);
  }

  private async checkFileSize(files: Express.Multer.File[]) {
    let check: boolean = true;
    for (const file of files) {
      if (file.size > +process.env.MAX_FILE_SIZE) {
        check = false;
      }
    }
    if (!check) {
      throw new HttpException(
        `Payload Too Large: One or more files exceed the maximum size of ${process.env.MAX_FILE_SIZE} bytes.`,
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }
  }

  private async uploadMultipleFiles(
    files: Express.Multer.File[],
    info?: UploadFileDto,
  ) {
    const uploadedFiles = [];
    for (const file of files) {
      const awsFile = await this.saveFileMetadata(file, info);
      await this.uploadFileToS3(file, awsFile);
      uploadedFiles.push(awsFile);
    }
    return uploadedFiles;
  }

  private async uploadFileToS3(
    file: Express.Multer.File,
    awsFile: TransferredFile,
  ) {
    try {
      await this.s3.send(
        new PutObjectCommand(getParams(awsFile.awsFileName, file)),
      );

      awsFile.link = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${awsFile.awsFileName}`;
      return await this.fileRepository.save(awsFile);
    } catch (error) {
      throw new BadRequestException(
        `Error uploading file ${file.originalname} to S3: ${error.message}`,
      );
    }
  }

  private async saveFileMetadata(
    file: Express.Multer.File,
    body?: UploadFileDto,
  ) {
    const fileRecord = this.fileRepository.create({
      originalFileName: file.originalname,
    });
    const awsFile = await this.fileRepository.save(fileRecord);
    awsFile.awsFileName = awsFile.id + '-' + file.originalname;
    awsFile.fileSize = file.size;
    awsFile.fileType = file.mimetype;

    if (body.expirationHours) {
      awsFile.expirationHours = body.expirationHours;
    }

    if (body.password) {
      awsFile.password = await this.hashData(body.password);
    }

    return awsFile;
  }

  async getFileInfo(id: number, password?: string) {
    const awsFile = await this.fileRepository.findOneBy({ id });
    if (!awsFile) {
      throw new NotFoundException(`File with id ${id} is not found`);
    }
    if (awsFile.password) {
      if (!password) {
        throw new BadRequestException(
          'Password is required to access this file',
        );
      }
      if (!(await this.compareHash(password, awsFile.password))) {
        throw new BadRequestException('Incorrect password');
      }
    }
    return instanceToPlain(awsFile);
  }

  async getFile(id: number, res: Response, password?: string) {
    const awsFile = await this.fileRepository.findOneBy({ id });
    if (!awsFile) {
      throw new NotFoundException(`File with id ${id} is not found`);
    }
    if (awsFile.password) {
      if (!password) {
        throw new BadRequestException(
          'Password is required to access this file',
        );
      }
      if (!(await this.compareHash(password, awsFile.password))) {
        throw new BadRequestException('Incorrect password');
      }
    }
    try {
      const s3Response = (
        await this.s3.send(new GetObjectCommand(getParams(awsFile.awsFileName)))
      ).Body as Readable;

      s3Response.pipe(
        res.set({
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment;  filename="${encodeURIComponent(awsFile.originalFileName)}"`,
        }),
      );
    } catch (error) {
      throw new BadRequestException(
        `Error retrieving file ${awsFile.awsFileName} from S3: ${error.message}`,
      );
    }
  }

  async hashData(data: string) {
    const saltRounds = +process.env.SALT_FOR_BCRYPT;
    const salt = await genSalt(saltRounds);
    return await bcrypt.hash(data, salt);
  }

  async compareHash(password: string, hashedPass: string) {
    return await bcrypt.compare(password, hashedPass);
  }

  async checkFileType(files: Express.Multer.File[]) {
    const allowedMimeTypes = [
      'application/zip',
      'application/x-rar-compressed',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
      'application/msword', // DOC
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
      'application/vnd.ms-excel', // XLS
      'application/pdf',
      'application/x-cfb', //DOC/XLS and other MS formats
    ];
    const allowedExtensions = [
      'zip',
      'rar',
      'jpg',
      'jpeg',
      'png',
      'gif',
      'docx',
      'doc',
      'xlsx',
      'xls',
      'pdf',
    ];

    for (const file of files) {
      const fileTypeResult = await fileTypeFromBuffer(file.buffer);
      if (!fileTypeResult || !allowedMimeTypes.includes(fileTypeResult.mime)) {
        throw new BadRequestException(
          `Invalid file type. Allowed types are: ${allowedMimeTypes.join(', ')}`,
        );
      }

      const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
      if (fileExtension && !allowedExtensions.includes(fileExtension)) {
        throw new BadRequestException(
          `Invalid file extension. Allowed extensions are: ${allowedExtensions.join(', ')}`,
        );
      }
    }
  }
}
