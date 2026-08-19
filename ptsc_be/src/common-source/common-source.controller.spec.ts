import { Test, TestingModule } from '@nestjs/testing';
import { CommonSourceController } from './common-source.controller';

describe('CommonSourceController', () => {
  let controller: CommonSourceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommonSourceController],
    }).compile();

    controller = module.get<CommonSourceController>(CommonSourceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
