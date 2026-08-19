import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationUnitService } from './organization-unit.service';

describe('OrganizationUnitService', () => {
  let service: OrganizationUnitService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrganizationUnitService],
    }).compile();

    service = module.get<OrganizationUnitService>(OrganizationUnitService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
