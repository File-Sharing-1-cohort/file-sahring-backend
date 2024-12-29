import { Module } from '@nestjs/common';
import { FilesService } from './files.service.js';
import { FilesController } from './files.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransferredFile } from './entities/file.entity.js';
import { s3ClientProvider } from '../aws/s3-client.provider.js';
import { ScheduleModule } from '@nestjs/schedule';
import { CronService } from './cron.service.js';
import { FileCompressionService } from '../file-compression/file-compression.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransferredFile]),
    ScheduleModule.forRoot(),
  ],
  controllers: [FilesController],
  providers: [FilesService, s3ClientProvider, CronService, FileCompressionService],
})
export class FilesModule {}
