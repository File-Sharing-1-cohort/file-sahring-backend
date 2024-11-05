import { Test, TestingModule } from '@nestjs/testing';
import { FilesService } from './files.service.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TransferredFile } from './entities/file.entity.js';
import { Repository } from 'typeorm';
import { S3Client } from '@aws-sdk/client-s3';

describe('FilesService', () => {
  let service: FilesService;
  let repository: Repository<TransferredFile>;
  let s3Client: S3Client;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        {
          provide: getRepositoryToken(TransferredFile),
          useClass: Repository,
        },
        {
          provide: 'S3_CLIENT',
          useValue: {
            send: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
    repository = module.get<Repository<TransferredFile>>(
      getRepositoryToken(TransferredFile),
    );
    s3Client = module.get<S3Client>('S3_CLIENT');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
