import { Test, TestingModule } from '@nestjs/testing';
import { listRoleService } from './list-role.service';

describe('ListRoleService', () => {
  let service: listRoleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [listRoleService],
    }).compile();

    service = module.get<listRoleService>(listRoleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
