import { Test, TestingModule } from '@nestjs/testing';
import { Wso2UserSyncController } from './wso2-user-sync.controller';
import { Wso2UserSyncService } from './wso2-user-sync.service';

describe('Wso2UserSyncController', () => {
  let controller: Wso2UserSyncController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [Wso2UserSyncController],
      providers: [Wso2UserSyncService],
    }).compile();

    controller = module.get<Wso2UserSyncController>(Wso2UserSyncController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
