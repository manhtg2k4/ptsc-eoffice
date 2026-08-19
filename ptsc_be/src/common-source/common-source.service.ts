import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommonSourceEntity } from './common-source.entity';

@Injectable()
export class CommonSourceService {
  private readonly logger = new Logger(CommonSourceService.name);

  constructor(
    @InjectRepository(CommonSourceEntity, 'mssqlConnection')
    private commonSourceRepository: Repository<CommonSourceEntity>,
  ) { }

  async findAll() {
    return this.commonSourceRepository.find();
  }

  async findByCode(code: string) {
    return this.commonSourceRepository.findOne({ where: { code } });
  }

  async create(data: Partial<CommonSourceEntity>) {
    const entity = this.commonSourceRepository.create(data);
    return this.commonSourceRepository.save(entity);
  }
}
