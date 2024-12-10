import {
  GetObjectCommandInput,
  PutObjectCommandInput,
} from '@aws-sdk/client-s3';

export const getParams = (
  fileName: string,
  file?: Express.Multer.File,
): PutObjectCommandInput | GetObjectCommandInput => {
  return file
    ? {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'private',
      }
    : { Bucket: process.env.AWS_S3_BUCKET_NAME, Key: fileName };
};
