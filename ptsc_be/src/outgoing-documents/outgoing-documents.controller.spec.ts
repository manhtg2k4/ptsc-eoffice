import { Test, TestingModule } from '@nestjs/testing';
import { OutgoingDocumentsController } from './outgoing-documents.controller';
import { OutgoingDocumentsService } from './outgoing-documents.service';

describe('OutgoingDocumentsController', () => {
  let controller: OutgoingDocumentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OutgoingDocumentsController],
      providers: [OutgoingDocumentsService],
    }).compile();

    controller = module.get<OutgoingDocumentsController>(OutgoingDocumentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
