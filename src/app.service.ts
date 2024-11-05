import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { getParams } from './aws/s3-upload.params.js';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Response } from 'express';
import { Readable } from 'stream';

@Injectable()
export class AppService {
  constructor(@Inject('S3_CLIENT') private s3) {}

  async getLogo(res: Response): Promise<any> {
    try {
      const logoResponse = (
        await this.s3.send(new GetObjectCommand(getParams(process.env.LOGO)))
      ).Body as Readable;
      logoResponse.pipe(res.set({ 'Content-Type': 'image/png' }));
    } catch (error) {
      throw new InternalServerErrorException(
        `Error fetching logo from S3: ${error}`,
      );
    }
  }
}
