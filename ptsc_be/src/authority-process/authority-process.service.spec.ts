import { Test, TestingModule } from '@nestjs/testing';
import { AuthorityProcessService } from './authority-process.service';

describe('AuthorityProcessService', () => {
  let service: AuthorityProcessService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthorityProcessService],
    }).compile();

    service = module.get<AuthorityProcessService>(AuthorityProcessService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
