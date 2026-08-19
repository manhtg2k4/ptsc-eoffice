import { Test, TestingModule } from '@nestjs/testing';
import { EntityRoleGroupService } from './entity-rolegroup.service';

describe('EntityRolegroupService', () => {
  let service: EntityRoleGroupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EntityRoleGroupService],
    }).compile();

    service = module.get<EntityRoleGroupService>(EntityRoleGroupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
