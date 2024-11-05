import { Test, TestingModule } from '@nestjs/testing';
import { FilesController } from './files.controller.js';
import { FilesService } from './files.service.js';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Response } from 'express';

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
            upload: jest.fn(),
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
        const file = {
          originalname: `test${fileType}`,
          buffer: Buffer.from('test'),
        } as any;

        await controller.upload(file);

        expect(service.upload).toHaveBeenCalledWith(file);
      });
    });

    it('should throw BadRequestException if file upload fails', async () => {
      service.upload = jest.fn().mockRejectedValue(new BadRequestException());

      const file = {
        originalname: 'test.txt',
        buffer: Buffer.from('test'),
      } as any;

      await expect(controller.upload(file)).rejects.toThrow(
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

      const id = 16; // якщо не буде на сервері?

      await controller.findOne(id, res);

      expect(service.getFile).toHaveBeenCalledWith(id, res);
    });

    it('should throw NotFoundException if file not found', async () => {
      service.getFile = jest.fn().mockRejectedValue(new NotFoundException());

      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as any as Response;

      const id = 2; // немає

      await expect(controller.findOne(id, res)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if error occurs during file retrieval', async () => {
      service.getFile = jest.fn().mockRejectedValue(new BadRequestException());

      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as any as Response;

      const id = 2;

      await expect(controller.findOne(id, res)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
