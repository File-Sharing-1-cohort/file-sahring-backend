import { PassThrough } from 'stream';
import archiver from 'archiver';
import sharp from 'sharp';

import fetch from 'node-fetch';
import FormData from 'form-data';

export const compressPDF = async (
  file: Express.Multer.File,
): Promise<Express.Multer.File | null> => {
  try {
    const form = new FormData();
    form.append('file', file.buffer, file.originalname);
    form.append('compression_level', 'high');

    const response = await fetch('https://api.pdfrest.com/compressed-pdf', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Api-Key': 'b2d164db-a1dd-4ffa-b955-fdee20fa205c',
      },
      body: form,
    });
    console.log(response);
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const result = await response.json();

    const compressedFileResponse = await fetch(result.outputUrl);
    const compressedFileBuffer = await compressedFileResponse.buffer();

    const compressedFile: Express.Multer.File = {
      ...file,
      buffer: compressedFileBuffer,
      size: compressedFileBuffer.length,
      mimetype: 'application/pdf',
    };

    return compressedFile;
  } catch (error) {
    console.error('Error during compression:', error);
    return null;
  }
};

export const resizeImageFileInPercent = async (
  file: Express.Multer.File,
  percent: number,
): Promise<Express.Multer.File> => {
  const image = sharp(file.buffer);

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

export const archiveFiles = async (
  files: Express.Multer.File[],
): Promise<Express.Multer.File> => {
  if (!files || files.length === 0) {
    throw new Error('No files provided for compression');
  }

  const archiveStream = new PassThrough();
  const archive = archiver('zip', { zlib: { level: 9 } });
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
};
