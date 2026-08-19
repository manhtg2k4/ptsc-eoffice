import { Test, TestingModule } from '@nestjs/testing';
import { AlbumImagesService } from './album-images.service';

describe('AlbumImagesService', () => {
  let service: AlbumImagesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlbumImagesService],
    }).compile();

    service = module.get<AlbumImagesService>(AlbumImagesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
