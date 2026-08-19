import { Test, TestingModule } from '@nestjs/testing';
import { OutgoingDocumentsService } from './outgoing-documents.service';

describe('OutgoingDocumentsService', () => {
  let service: OutgoingDocumentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OutgoingDocumentsService],
    }).compile();

    service = module.get<OutgoingDocumentsService>(OutgoingDocumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
