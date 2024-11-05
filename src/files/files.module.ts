import { Module } from '@nestjs/common';
import { FilesService } from './files.service.js';
import { FilesController } from './files.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransferredFile } from './entities/file.entity.js';
import { s3ClientProvider } from '../aws/s3-client.provider.js';

@Module({
  imports: [TypeOrmModule.forFeature([TransferredFile])],
  controllers: [FilesController],
  providers: [FilesService, s3ClientProvider],
})
export class FilesModule {}
