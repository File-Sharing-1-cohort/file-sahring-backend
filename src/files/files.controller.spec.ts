import { Test, TestingModule } from '@nestjs/testing';
import { FilesController } from './files.controller.js';
import { FilesService } from './files.service.js';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { UploadFileDto } from '../models/uploadFileDto.js';

describe('FilesController', () => {
  let controller: FilesController;
  let service: FilesService;

  const fileTypes = [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.pdf',
    '.zip',
    '.rar',
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        {
          provide: FilesService,
          useValue: {
            upload: jest.fn((body, files) => Promise.resolve([])),
            getFile: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<FilesController>(FilesController);
    service = module.get<FilesService>(FilesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('upload', () => {
    fileTypes.forEach((fileType) => {
      it(`should upload a test${fileType} file`, async () => {
        const body = {
          password: 'Test123',
          expirationHours: 2,
        } as UploadFileDto;
        const file = {
          originalname: `test${fileType}`,
          buffer: Buffer.from('test'),
        } as any;

        await controller.upload(body, [file]);

        expect(service.upload).toHaveBeenCalledWith(body, [file]);
      });
    });

    it('should throw BadRequestException if file upload fails', async () => {
      service.upload = jest.fn().mockRejectedValue(new BadRequestException());

      const body = { password: 'Test123', expirationHours: 2 } as UploadFileDto;
      const file = {
        originalname: 'test.txt',
        buffer: Buffer.from('test'),
      } as any;

      await expect(controller.upload(body, [file])).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne', () => {
    it('should return file content', async () => {
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as any as Response;

      const password = 'Test123';
      const id = 16;

      await controller.findOne(password, id, res);

      expect(service.getFile).toHaveBeenCalledWith(password, id, res);
    });

    it('should throw NotFoundException if file not found', async () => {
      service.getFile = jest.fn().mockRejectedValue(new NotFoundException());

      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as any as Response;

      const password = 'WrongPassword';
      const id = 2;

      await expect(controller.findOne(password, id, res)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if error occurs during file retrieval', async () => {
      service.getFile = jest.fn().mockRejectedValue(new BadRequestException());

      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as any as Response;

      const password = 'Test123';
      const id = 2;

      await expect(controller.findOne(password, id, res)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
