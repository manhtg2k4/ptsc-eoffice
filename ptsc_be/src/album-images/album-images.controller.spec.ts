import { Test, TestingModule } from '@nestjs/testing';
import { AlbumImagesController } from './album-images.controller';
import { AlbumImagesService } from './album-images.service';

describe('AlbumImagesController', () => {
  let controller: AlbumImagesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlbumImagesController],
      providers: [AlbumImagesService],
    }).compile();

    controller = module.get<AlbumImagesController>(AlbumImagesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
