import { Test, TestingModule } from '@nestjs/testing';
import { GroupUserService } from './group-users.service';

describe('GroupUsersService', () => {
  let service: GroupUserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GroupUserService],
    }).compile();

    service = module.get<GroupUserService>(GroupUserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
