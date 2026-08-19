import { Test, TestingModule } from '@nestjs/testing';
import { Wso2UserSyncService } from './wso2-user-sync.service';

describe('Wso2UserSyncService', () => {
  let service: Wso2UserSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Wso2UserSyncService],
    }).compile();

    service = module.get<Wso2UserSyncService>(Wso2UserSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
