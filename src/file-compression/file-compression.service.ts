import { Injectable } from '@nestjs/common';
import { PassThrough } from 'stream';
import archiver from 'archiver';
import sharp from 'sharp';
import fetch from 'node-fetch';
import FormData from 'form-data';
import gifResize from '@gumlet/gif-resize';
import gifInfo from 'gif-info';

@Injectable()
export class FileCompressionService {
  resizeGif = async (
    file: Express.Multer.File,
  ): Promise<Express.Multer.File> => {
    const percent =
      +process.env.IMAGE_COMPRESSION > 0 && +process.env.IMAGE_COMPRESSION < 100
        ? +process.env.IMAGE_COMPRESSION
        : 10;
    const arrayBuffer = file.buffer.buffer.slice(
      file.buffer.byteOffset,
      file.buffer.byteOffset + file.buffer.byteLength,
    );

    const width = gifInfo(arrayBuffer).width;
    console.log(width);
    const buffer = await gifResize({
      width: Math.round((percent / 100) * width),
    })(file.buffer);

    const passthroughStream = new PassThrough();

    const compressedFile: Express.Multer.File = {
      fieldname: file.fieldname,
      originalname: file.originalname,
      encoding: file.encoding,
      mimetype: file.mimetype,
      size: buffer.length,
      buffer,
      destination: file.destination,
      filename: file.filename,
      path: file.path,
      stream: passthroughStream,
    };

    return compressedFile;
  };

  compressPDF = async (
    file: Express.Multer.File,
  ): Promise<Express.Multer.File | null> => {
    try {
      const compressionLevel: string =
        +process.env.PDF_COMPRESSION >= 1 && +process.env.PDF_COMPRESSION <= 5
          ? process.env.PDF_COMPRESSION
          : '5';
      const form = new FormData();
      form.append('fileInput', file.buffer, file.originalname);
      form.append('optimizeLevel', compressionLevel);
      const response = await fetch(
        'https://stirling-pdf-twr2.onrender.com/api/v1/misc/compress-pdf',
        {
          method: 'POST',
          body: form,
        },
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const compressedPDFBuffer = await response.buffer();

      const compressedPDF: Express.Multer.File = {
        ...file,
        buffer: compressedPDFBuffer,
        size: compressedPDFBuffer.length,
        mimetype: 'application/pdf',
      };

      return compressedPDF;
    } catch (error) {
      console.error('Error during compression:', error);
      return null;
    }
  };

  resizeImage = async (
    file: Express.Multer.File,
  ): Promise<Express.Multer.File> => {
    const image = sharp(file.buffer);
    const percent =
      +process.env.IMAGE_COMPRESSION > 0 && +process.env.IMAGE_COMPRESSION < 100
        ? +process.env.IMAGE_COMPRESSION
        : 10;

    const { width, height } = await image.metadata();
    const buffer = await sharp(file.buffer)
      .resize({
        width: Math.round((percent / 100) * width),
        height: Math.round((percent / 100) * height),
      })
      .toBuffer();

    const passthroughStream = new PassThrough();

    const compressedFile: Express.Multer.File = {
      fieldname: file.fieldname,
      originalname: file.originalname,
      encoding: file.encoding,
      mimetype: file.mimetype,
      size: buffer.length,
      buffer,
      destination: file.destination,
      filename: file.filename,
      path: file.path,
      stream: passthroughStream,
    };

    return compressedFile;
  };

  archiveFiles = async (
    files: Express.Multer.File[],
  ): Promise<Express.Multer.File> => {
    if (!files || files.length === 0) {
      throw new Error('No files provided for compression');
    }

    const compressionLevel: number =
      +process.env.ARCHIVE_COMPRESSION >= 1 &&
      +process.env.ARCHIVE_COMPRESSION <= 9
        ? +process.env.ARCHIVE_COMPRESSION
        : 9;
    const archiveStream = new PassThrough();
    const archive = archiver('zip', { zlib: { level: compressionLevel } });
    const buffers: Buffer[] = [];

    archive.pipe(archiveStream);

    archive.on('error', (err) => {
      throw err;
    });

    archiveStream.on('data', (chunk) => {
      buffers.push(chunk);
    });

    for (const file of files) {
      archive.append(file.buffer, { name: file.originalname });
    }

    await new Promise<void>((resolve, reject) => {
      archive.on('finish', resolve);
      archive.on('error', reject);
      archive.finalize().catch(reject);
    });

    const buffer = Buffer.concat(buffers);
    if (files.length > 1) {
      const archivedFile: Express.Multer.File = {
        fieldname: 'archive',
        originalname: 'archive.zip',
        encoding: '7bit',
        mimetype: 'application/zip',
        size: buffer.length,
        buffer,
        destination: '',
        filename: 'archive.zip',
        path: '',
        stream: archiveStream,
      };

      return archivedFile;
    } else {
      const archivedFile: Express.Multer.File = {
        fieldname: files[0].fieldname,
        originalname: files[0].originalname + '.zip',
        encoding: '7bit',
        mimetype: 'application/zip',
        size: buffer.length,
        buffer,
        destination: '',
        filename: files[0].originalname + '.zip',
        path: '',
        stream: archiveStream,
      };

      return archivedFile;
    }
  };
}
