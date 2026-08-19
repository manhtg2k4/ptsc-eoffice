import { Test, TestingModule } from '@nestjs/testing';
import { DocumentLibraryController } from './document-library.controller';
import { DocumentLibraryService } from './document-library.service';

describe('DocumentLibraryController', () => {
  let controller: DocumentLibraryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentLibraryController],
      providers: [DocumentLibraryService],
    }).compile();

    controller = module.get<DocumentLibraryController>(DocumentLibraryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
