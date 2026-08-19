import { Test, TestingModule } from '@nestjs/testing';
import { CrmSourcesController } from './crmsource.controller';
import { CrmSourcesService } from './crmsource.service';

describe('CrmSourcesController', () => {
  let controller: CrmSourcesController;
  let service: CrmSourcesService;

  beforeEach(async () => {
    const mockCrmSourcesService = {};

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CrmSourcesController],
      providers: [
        {
          provide: CrmSourcesService,
          useValue: mockCrmSourcesService,
        },
      ],
    }).compile();

    controller = module.get<CrmSourcesController>(CrmSourcesController);
    service = module.get<CrmSourcesService>(CrmSourcesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
