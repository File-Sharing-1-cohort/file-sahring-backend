import { Controller, Get, Res } from '@nestjs/common';
import { AppService } from './app.service.js';
import { Response } from 'express';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('files')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('ping')
  ping() {
    return { status: 200 };
  }

  @Get('public/logo')
  @ApiOperation({ summary: 'Get the logo from S3' })
  @ApiResponse({ status: 200, description: 'The logo image' })
  @ApiResponse({ status: 404, description: 'Logo not found' })
  async getLogo(@Res() res: Response) {
    return this.appService.getLogo(res);
  }
}
