import { Test, TestingModule } from '@nestjs/testing';
import { DocumentLibraryService } from './document-library.service';

describe('DocumentLibraryService', () => {
  let service: DocumentLibraryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentLibraryService],
    }).compile();

    service = module.get<DocumentLibraryService>(DocumentLibraryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
