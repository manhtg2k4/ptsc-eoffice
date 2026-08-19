import { Test, TestingModule } from '@nestjs/testing';
import { CrmSourcesService } from './crmsource.service';
import { CrmSourceMSSQLRepository } from './crmsource.mssql.repository';
import { CrmSourceDataMSSQLRepository } from './crmsource-data.mssql.repository';

describe('CrmSourcesService', () => {
  let service: CrmSourcesService;

  beforeEach(async () => {
    // Tạo các mock object cho repository
    const mockCrmSourceRepository = {};
    const mockCrmSourceDataRepository = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrmSourcesService,
        {
          provide: CrmSourceMSSQLRepository,
          useValue: mockCrmSourceRepository,
        },
        {
          provide: CrmSourceDataMSSQLRepository,
          useValue: mockCrmSourceDataRepository,
        },
      ],
    }).compile();

    service = module.get<CrmSourcesService>(CrmSourcesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
