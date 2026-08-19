import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { AuthConfigEntity } from './entities/auth-config.entity';
import { CreateAuthConfigDto } from './dto/create-auth-config.dto';
import { UpdateAuthConfigDto } from './dto/update-auth-config.dto';
import { v4 as uuidv4 } from 'uuid';
@Injectable()
export class AuthConfigService {
  constructor(
    @InjectRepository(AuthConfigEntity, 'mssqlConnection')
    private authConfigRepository: Repository<AuthConfigEntity>,
  ) { }

  /**
   * Trộn cấu hình từ DB với biến môi trường (Ưu tiên Env)
   */
  private mergeWithEnv(config: AuthConfigEntity): AuthConfigEntity {
    if (!config || config.authType !== 'keycloak' || !config.config) {
      return config;
    }

    const mergedConfig = {
      ...config.config,
      issuer: process.env.KEYCLOAK_ISSUER || config.config.issuer,
      baseUrl: process.env.KEYCLOAK_BASE_URL || config.config.baseUrl,
      clientId: process.env.KEYCLOAK_CLIENT_ID || config.config.clientId,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || config.config.clientSecret,
      redirectUri: process.env.KEYCLOAK_REDIRECT_URI || config.config.redirectUri,
      scope: process.env.KEYCLOAK_SCOPE || config.config.scope,
      domainFe: process.env.KEYCLOAK_DOMAIN_FE || config.config.domainFe,
    };

    return {
      ...config,
      config: mergedConfig,
    };
  }

  // THÊM MỚI
  async create(dto: CreateAuthConfigDto): Promise<any> {
    try {
      // Kiểm tra trùng authType
      const exist = await this.authConfigRepository.findOne({
        where: { authType: dto.authType, status: 1 },
      });
      if (exist) {
        return this.update(exist.id, dto);
      }

      // Nếu bật isActive → tắt tất cả loại khác
      if (dto.isActive) {
        await this.authConfigRepository.update(
          { status: 1 },
          { isActive: false },
        );
      }

      // Tạo mới
      const newConfig = this.authConfigRepository.create({
        id: uuidv4(),
        createdAt: new Date(),
        ...dto,
        isActive: !!dto.isActive,
        status: 1,
      });

      return await this.authConfigRepository.save(newConfig);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Lỗi khi tạo cấu hình xác thực: ${error.message}`,
      );
    }
  }

  // Thêm method
  async findByAuthType(authType: string): Promise<AuthConfigEntity | null> {
    try {
      // Ưu tiên tìm status = 1
      const config = await this.authConfigRepository.findOne({
        where: { authType, status: 1 },
      });

      return config;
    } catch (error) {
      throw new InternalServerErrorException(
        `Lỗi khi tìm cấu hình theo authType: ${error.message}`
      );
    }
  }

  async findActive(): Promise<AuthConfigEntity | null> {
    try {
      const config = await this.authConfigRepository.findOne({
        where: { isActive: true, status: 1 },
      });
      return config ? this.mergeWithEnv(config) : null;
    } catch (error) {
      throw new InternalServerErrorException(
        `Lỗi khi tìm cấu hình đang hoạt động: ${error.message}`,
      );
    }
  }

  // CẬP NHẬT
  async update(id: string, dto: UpdateAuthConfigDto): Promise<AuthConfigEntity> {
    try {
      // Kiểm tra tồn tại
      const config = await this.authConfigRepository.findOne({
        where: { id, status: 1 },
      });
      if (!config) {
        throw new NotFoundException('Không tìm thấy cấu hình');
      }

      // Nếu bật isActive → tắt tất cả loại khác
      if (dto.isActive === true) {
        await this.authConfigRepository.update(
          { id: Not(id), status: 1 },
          { isActive: false },
        );
      }

      // Cập nhật
      await this.authConfigRepository.update(id, dto);
      const updated = await this.authConfigRepository.findOneBy({ id });

      if (!updated) {
        throw new NotFoundException('Không tìm thấy cấu hình sau cập nhật');
      }

      return updated;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Lỗi khi cập nhật cấu hình: ${error.message}`,
      );
    }
  }

  // XÓA MỀM
  async softDelete(id: string): Promise<{ message: string }> {
    try {
      // Kiểm tra tồn tại
      const config = await this.authConfigRepository.findOne({
        where: { id, status: 1 },
      });
      if (!config) {
        throw new NotFoundException('Không tìm thấy cấu hình');
      }

      // Nếu đang active → bật loại khác (nếu có)
      if (config.isActive) {
        const other = await this.authConfigRepository.findOne({
          where: { id: Not(id), status: 1 },
        });
        if (other) {
          await this.authConfigRepository.update(other.id, {
            isActive: true,
          });
        }
      }

      // Xóa mềm
      await this.authConfigRepository.update(id, { status: 3 });

      return { message: 'Xóa mềm thành công' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Lỗi khi xóa mềm cấu hình: ${error.message}`,
      );
    }
  }

  //hàm này check nếu có bản ghi isActive thì không cho xóa
  async bulkSoftDelete(ids: string[]): Promise<{
    deletedCount: number;
    failedIds: string[];
    message: string;
  }> {
    // === 1. Validate input ===
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('Danh sách ID không hợp lệ hoặc rỗng');
    }

    const cleanIds = ids.filter(id => typeof id === 'string' && id.trim() !== '');
    if (cleanIds.length === 0) {
      throw new BadRequestException('Không có ID hợp lệ để xóa');
    }

    try {
      // === 2. Tìm các bản ghi hợp lệ (status = 1) ===
      const configs = await this.authConfigRepository.find({
        where: {
          id: In(cleanIds),
          status: 1,
        },
      });

      const validIds = configs.map(c => c.id);
      const failedIds = cleanIds.filter(id => !validIds.includes(id));

      if (configs.length === 0) {
        return {
          deletedCount: 0,
          failedIds: cleanIds,
          message: 'Không tìm thấy bản ghi nào để xóa',
        };
      }

      // === 3. NGĂN XÓA NẾU CÓ BẢN GHI ĐANG isActive: true ===
      const activeConfig = configs.find(c => c.isActive);
      if (activeConfig) {
        throw new BadRequestException(
          `Không thể xóa: Loại xác thực "${activeConfig.authType}" đang được sử dụng (isActive = true). ` +
          `Vui lòng chuyển sang loại xác thực khác trước khi xóa.`
        );
      }

      // === 4. XÓA MỀM (an toàn vì không có active) ===
      const result = await this.authConfigRepository.update(
        { id: In(validIds) },
        { status: 3 }
      );

      return {
        deletedCount: result.affected || 0,
        failedIds,
        // message: `Xóa mềm thành công ${result.modifiedCount} bản ghi`,
        message: `Xóa mềm thành công bản ghi`,
      };

    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Lỗi khi xóa mềm hàng loạt: ${error.message}`
      );
    }
  }
}