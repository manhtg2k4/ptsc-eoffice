import { Test, TestingModule } from '@nestjs/testing';
import { MediaGaleryService } from './media-galery.service';

describe('MediaGaleryService', () => {
  let service: MediaGaleryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MediaGaleryService],
    }).compile();

    service = module.get<MediaGaleryService>(MediaGaleryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
