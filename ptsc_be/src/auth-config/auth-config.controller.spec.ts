import { Test, TestingModule } from '@nestjs/testing';
import { AuthConfigController } from './auth-config.controller';
import { AuthConfigService } from './auth-config.service';

describe('AuthConfigController', () => {
  let controller: AuthConfigController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthConfigController],
      providers: [AuthConfigService],
    }).compile();

    controller = module.get<AuthConfigController>(AuthConfigController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
