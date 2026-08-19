import { Test, TestingModule } from '@nestjs/testing';
import { MenuManagerService } from './menu-manager.service';

describe('MenuManagerService', () => {
  let service: MenuManagerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MenuManagerService],
    }).compile();

    service = module.get<MenuManagerService>(MenuManagerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
