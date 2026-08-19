import { Test, TestingModule } from '@nestjs/testing';
import { MediaGaleryController } from './media-galery.controller';
import { MediaGaleryService } from './media-galery.service';

describe('MediaGaleryController', () => {
  let controller: MediaGaleryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaGaleryController],
      providers: [MediaGaleryService],
    }).compile();

    controller = module.get<MediaGaleryController>(MediaGaleryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
