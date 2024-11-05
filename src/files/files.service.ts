import {
  BadRequestException,
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

@Injectable()
export class FilesService {
  constructor(
    @Inject('S3_CLIENT') private s3,
    @InjectRepository(TransferredFile)
    private fileRepository: Repository<TransferredFile>,
  ) {}

  async upload(file: Express.Multer.File, body?: { password: string }) {
    const allowedMimeTypes = [
      'application/zip',
      'application/x-7z-compressed',
      'application/x-rar-compressed',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
      'application/msword', // DOC
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
      'application/vnd.ms-excel', // XLS
    ];   
    const fileTypeResult = await fileTypeFromBuffer(file.buffer);    
    if (!fileTypeResult || !allowedMimeTypes.includes(fileTypeResult.mime)) {
      throw new BadRequestException(`Invalid file type. Allowed types are: ${allowedMimeTypes.join(', ')}`);
    }

    const fileRecord = this.fileRepository.create({
      originalFileName: file.originalname,
    });
    const awsFile = await this.fileRepository.save(fileRecord);
    awsFile.awsFileName = awsFile.id + '-' + file.originalname;

    if (body.password) {
      awsFile.password = await this.hashData(body.password);
    }

    try {
      await this.s3.send(
        new PutObjectCommand(getParams(awsFile.awsFileName, file)),
      );

      awsFile.link = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${awsFile.awsFileName}`;
      return await this.fileRepository.save(awsFile);
    } catch (error) {
      throw new BadRequestException(
        `Failed to upload ${file.originalname} to S3:`,
        error,
      );
    }
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
          'Content-Disposition': `attachment; filename="${awsFile.originalFileName}"`,
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
}
