import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { dataSourceOptionst } from './database/db-config.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { FilesModule } from './files/files.module.js';
import { s3ClientProvider } from './aws/s3-client.provider.js';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot(dataSourceOptionst),
    FilesModule,
  ],
  controllers: [AppController],
  providers: [s3ClientProvider, AppService],
})
export class AppModule {}
