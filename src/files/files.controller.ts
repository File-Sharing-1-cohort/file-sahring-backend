import {
  Controller,
  Get,
  Post,
  Param,
  UseInterceptors,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  ParseIntPipe,
  Res,
  NotFoundException,
  BadRequestException,
  Body,
  Query,
} from '@nestjs/common';
import { Response } from 'express';
import { FilesService } from './files.service.js';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { UploadFileDto } from '../models/uploadFileDto.js';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
        password: {
          type: 'string',
          description: 'Optional password to protect the file',
          example: 'yourPassw0rd',
          nullable: true,
        },
        expirationHours: {
          type: 'number',
          description: 'Optional expirationHours to save file in cloud',
          example: 36,
          nullable: true,
        },
        toCompress: {
          type: 'boolean',
          description: 'If true uploaded files will be compressed',
          example: true,
          nullable: true,
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 10, {}))
  async upload(
    @Body() body: UploadFileDto,
    @UploadedFiles()
    files: Express.Multer.File[],
  ) {
    return await this.filesService.upload(files, body);
  }

  @Get('metadata/:id')
  @ApiOperation({ summary: 'Get information about file from DB' })
  @ApiQuery({
    name: 'password',
    required: false,
    description: 'Password to access the file, if required',
    example: '',
  })
  async getInfo(
    @Query('password') password: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.filesService.getFileInfo(id, password);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get fileName from DB, and download file from S3' })
  @ApiResponse({
    status: 200,
    description: 'File content successfully retrieved',
    content: {
      'application/octet-stream': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiProduces('application/octet-stream')
  @ApiResponse({
    status: 404,
    description: 'File not found',
    type: NotFoundException,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
    type: BadRequestException,
  })
  @ApiQuery({
    name: 'password',
    required: false,
    description: 'Password to access the file, if required',
    example: 'your_password_here',
  })
  findOne(
    @Query('password') password: string,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    return this.filesService.getFile(id, res, password);
  }
}
