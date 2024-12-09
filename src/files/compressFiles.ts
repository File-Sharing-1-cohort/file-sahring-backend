import { PassThrough } from 'stream';
import archiver from 'archiver';

const compressFiles = async (
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

export default compressFiles;
