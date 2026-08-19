import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BpmnVersionEntity } from './bpmn-version.entity';

@Injectable()
export class BpmnVersionService {
  constructor(
    @InjectRepository(BpmnVersionEntity, 'mssqlConnection')
    private readonly bpmnVersionRepo: Repository<BpmnVersionEntity>,
  ) {}

  // Tạo version mới
  async createVersion(designId?: string, processKey?: string, base64File?: string) {
    const lastVersion = await this.bpmnVersionRepo.findOne({
      where: { designId },
      order: { version: 'DESC' },
    });

    const newVersion = (lastVersion?.version ?? 0) + 1;

    const versionEntity = this.bpmnVersionRepo.create({
      designId,
      processKey,
      version: newVersion,
      base64File,
    });

    return this.bpmnVersionRepo.save(versionEntity);
  }

  // Lấy version mới nhất theo designId
  async getLatestVersion(designId: string) {
    const latest = await this.bpmnVersionRepo.findOne({
      where: { designId },
      order: { version: 'DESC' },
    });
    if (!latest) throw new NotFoundException(`No BPMN version found for ${designId}`);
    return latest;
  }

  // Lấy version theo id
  async getVersionById(id: string) {
    const ver = await this.bpmnVersionRepo.findOne({ where: { id: parseInt(id, 10) } });
    if (!ver) throw new NotFoundException(`BPMN version ${id} not found`);
    return ver;
  }
}
