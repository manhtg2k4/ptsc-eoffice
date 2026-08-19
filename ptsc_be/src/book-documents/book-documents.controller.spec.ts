import { Test, TestingModule } from '@nestjs/testing';
import { BookDocumentsController } from './book-documents.controller';
import { BookDocumentsService } from './book-documents.service';

describe('BookDocumentsController', () => {
  let controller: BookDocumentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookDocumentsController],
      providers: [BookDocumentsService],
    }).compile();

    controller = module.get<BookDocumentsController>(BookDocumentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
