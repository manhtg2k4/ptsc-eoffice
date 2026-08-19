import { Test, TestingModule } from '@nestjs/testing';
import { BookDocumentsService } from './book-documents.service';

describe('BookDocumentsService', () => {
  let service: BookDocumentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BookDocumentsService],
    }).compile();

    service = module.get<BookDocumentsService>(BookDocumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
