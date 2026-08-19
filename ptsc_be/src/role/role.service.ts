// src/role/role.service.ts

import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRoleDto } from './dto/create-role.dto';
import { RoleEntity } from './role.entity';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(RoleEntity, 'mssqlConnection')
    private readonly roleRepo: Repository<RoleEntity>,
  ) { }

  /**
   * Tìm role theo code và trả về object với allow = false cho tất cả method
   */
  async findAll(code: string): Promise<Record<string, any>> {
    const roles = await this.roleRepo.find({
      where: { code },
    });

    if (!roles.length) {
      throw new BadRequestException(`Không tìm thấy quyền nào với mã ${code}`);
    }

    // Sanitize: set allow = false cho mọi method
    const sanitizedRoles = roles.map((role) => ({
      ...role,
      roles: role.roles.map((roleFunction) => ({
        ...roleFunction,
        methods: roleFunction.methods.map((method) => ({
          ...method,
          allow: false,
        })),
      })),
    }));

    // Chuyển thành object đơn (giống logic cũ của bạn)
    const result: any = {};
    sanitizedRoles.forEach((role) => {
      result['clientId'] = role.clientId;
      result['name'] = role.name;
      result['code'] = role.code;
      result['description'] = role.description;
      result['roles'] = role.roles;
    });

    return result;
  }

  /**
   * Tìm theo ID
   */
  async findById(id: string): Promise<RoleEntity> {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role with id ${id} not found`);
    }
    return role;
  }

  /**
   * Tạo mới role
   */
  async create(createRoleDto: CreateRoleDto): Promise<RoleEntity> {
    // Kiểm tra code trùng
    const exists = await this.roleRepo.findOne({ where: { code: createRoleDto.code } });
    if (exists) {
      throw new BadRequestException(`Mã role "${createRoleDto.code}" đã tồn tại`);
    }

    const newRole = this.roleRepo.create({
      clientId: createRoleDto.clientId,
      name: createRoleDto.name,
      code: createRoleDto.code,
      description: createRoleDto.description,
      roles: createRoleDto.roles || [],
    });

    return this.roleRepo.save(newRole);
  }
}