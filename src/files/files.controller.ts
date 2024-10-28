import {
  Controller,
  Get,
  Post,
  Param,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  ParseIntPipe,
  Res,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { FilesService } from './files.service';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiProduces,
  ApiResponse,
} from '@nestjs/swagger';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 50 }),
          new FileTypeValidator({
            fileType:
              /^(image\/(jpeg|png|gif)|application\/(msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document|vnd\.ms-excel|vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|pdf|zip|rar|x-rar-compressed))$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.filesService.upload(file);
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
  findOne(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    return this.filesService.getFile(id, res);
  }
}
