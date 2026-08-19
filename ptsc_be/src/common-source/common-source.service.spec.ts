import { Test, TestingModule } from '@nestjs/testing';
import { CommonSourceService } from './common-source.service';

describe('CommonSourceService', () => {
  let service: CommonSourceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CommonSourceService],
    }).compile();

    service = module.get<CommonSourceService>(CommonSourceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
