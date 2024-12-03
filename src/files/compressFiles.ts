import { Express } from 'express';
import { PassThrough } from 'stream';
import archiver from 'archiver';

const compressFiles = async (
  files: Express.Multer.File[],
): Promise<Express.Multer.File> => {
  if (!files || files.length === 0) {
    throw new Error('No files provided for compression');
  }

  // Создаём поток в память
  const archiveStream = new PassThrough();
  const archive = archiver('zip', { zlib: { level: 9 } }); // Максимальная компрессия
  const buffers: Buffer[] = [];

  // Подключаем поток архива
  archive.pipe(archiveStream);

  archive.on('error', (err) => {
    throw err;
  });

  archiveStream.on('data', (chunk) => {
    buffers.push(chunk);
  });

  archiveStream.on('end', () => {
    console.log('Archive stream ended');
  });

  // Добавляем файлы в архив
  for (const file of files) {
    console.log(`Adding file: ${file.originalname}`);
    archive.append(file.buffer, { name: file.originalname });
  }

  // Ждём завершения записи архива
  await new Promise<void>((resolve, reject) => {
    archive.on('finish', resolve); // Когда архив завершён
    archive.on('error', reject);
    archive.finalize().catch(reject); // Завершаем архив
  });

  console.log('Archive finalized');

  // Создаём буфер из собранных данных
  const buffer = Buffer.concat(buffers);

  console.log('Buffer size:', buffer.length);

  // Формируем объект, соответствующий структуре Express.Multer.File
  const archivedFile: Express.Multer.File = {
    fieldname: 'archive',
    originalname: 'archive.zip',
    encoding: '7bit',
    mimetype: 'application/zip',
    size: buffer.length,
    buffer,
    destination: '', // Не используется для файлов в памяти
    filename: 'archive.zip',
    path: '', // Не используется для файлов в памяти
    stream: archiveStream, // Поток архива
  };

  return archivedFile;
};

export default compressFiles;
