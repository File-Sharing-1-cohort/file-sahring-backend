import { Module } from '@nestjs/common';
import { FileCompressionService } from './file-compression.service.js';

@Module({
  providers: [FileCompressionService],
  exports: [FileCompressionService],
})
export class FileProcessingModule {}