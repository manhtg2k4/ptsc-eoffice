import { Test, TestingModule } from '@nestjs/testing';
import { AuthorityProcessController } from './authority-process.controller';

describe('AuthorityProcessController', () => {
  let controller: AuthorityProcessController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthorityProcessController],
    }).compile();

    controller = module.get<AuthorityProcessController>(AuthorityProcessController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
