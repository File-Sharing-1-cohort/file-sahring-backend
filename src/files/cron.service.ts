import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { TransferredFile } from './entities/file.entity.js';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    @InjectRepository(TransferredFile)
    private readonly fileRepository: Repository<TransferredFile>,
  ) {}

  @Cron('* * * * *')
  async handleCron() {
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const result = await this.fileRepository.delete({
      loadedAt: LessThan(oneDayAgo),
    });
  }
}
