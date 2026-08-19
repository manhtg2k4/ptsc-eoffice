import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  OrganizationUnit,
  OrganizationUnitDocument,
} from './organization-unit.schema';
import {
  CreateOrganizationUnitDto,
  UpdateOrganizationUnitDto,
} from './organization-unit.dto';
import {
  isValidMongoId,
  areFiltersValid,
  buildMongoQuery,
  parseSortParam,
  convertFiltersBySchema,
} from '../utils/util';
import { clampLimit, clampPage } from '../utils/pagination.validator';
import { STATUS } from '../variables/CONST_STATUS';

import { UsersService } from 'src/users/users.service';
import { RoleGroupService } from 'src/role-group/role-group.service';
import { QueryParams } from 'src/interfaces';
import { EntityRoleGroupService } from 'src/entity-rolegroup/entity-rolegroup.service';
import { EntityRoleGroupController } from 'src/entity-rolegroup/entity-rolegroup.controller';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
@Injectable()
export class OrganizationUnitService {
  public static OrganizationModel: Model<OrganizationUnitDocument>;
  constructor(
    @InjectModel(OrganizationUnit.name) model: Model<OrganizationUnitDocument>,
    private readonly roleGroupService: RoleGroupService,
    private readonly entityRoleGroupService: EntityRoleGroupService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly entityRoleGroupController: EntityRoleGroupController,
  ) {
    OrganizationUnitService.OrganizationModel = model;
  }

  // Tạo đơn vị mới
  async create(createDto: CreateOrganizationUnitDto): Promise<any> {
    // Kiểm tra mã đơn vị đã tồn tại
    const existingCode =
      await OrganizationUnitService.OrganizationModel.findOne({
        code: createDto.code,
        status: STATUS.ACTIVED,
      }).lean();
    if (existingCode) {
      throw new BadRequestException({
        message: `Mã đơn vị ${createDto.code} đã tồn tại`,
      });
    }

    // Xử lý path: nếu có parent thì lấy path của parent, nếu không thì để trống
    let path = '';
    if (createDto.parent) {
      const parentUnit =
        await OrganizationUnitService.OrganizationModel.findById(
          createDto.parent,
        ).lean();
      if (!parentUnit) {
        throw new BadRequestException({
          success: false,
          message: `Đơn vị cha với ID ${createDto.parent} không tồn tại`,
        });
      }
      path = parentUnit.path
        ? `${parentUnit.path}/${parentUnit._id}`
        : `${parentUnit._id}`;
    }

    // Lưu các quyền của đơn vị vào bảng ánh xạ
    if (!createDto.roleGroup && !Array.isArray(createDto.roleGroup)) {
      return {
        success: false,
        message: 'Vui lòng nhập quyền cho đơn vị',
      };
    }
    this.roleGroupService.create({
      clientId: 'TTHC', // Thay đổi theo yêu cầu
      name: `Quyền của ${createDto.name}`,
      code: `RG_${createDto.code}`,
      entityType: 'organization',
      roles: createDto.roleGroup,
    });

    // Tạo đơn vị mới
    const newUnit = new OrganizationUnitService.OrganizationModel({
      ...createDto,
      parent: createDto.parent || null,
      status: STATUS.ACTIVED,
    });

    // Lưu đơn vị mới
    const savedUnit = await newUnit.save();

    // Nếu không có parent thì path giữ nguyên '', tức là đơn vị cấp cao nhất
    savedUnit.path = path ? `${path}/${savedUnit._id}` : '';

    // Cập nhật path (chỉ update trường path để tránh ghi đè dữ liệu khác)
    await OrganizationUnitService.OrganizationModel.updateOne(
      { _id: savedUnit._id },
      { path: savedUnit.path },
    );

    return savedUnit;
  }

  async addManager(unitId: string, userId: Types.ObjectId): Promise<void> {
    const unit = await OrganizationUnitService.OrganizationModel.findOne({
      _id: unitId,
      status: STATUS.ACTIVED,
    }).exec();
    if (!unit) {
      throw new BadRequestException({
        success: false,
        message: `Đơn vị với ID ${unitId} không tồn tại hoặc không hoạt động`,
      });
    }
    if (!unit.managers) unit.managers = [];
    if (!unit.managers.some((id) => id.equals(userId))) {
      unit.managers.push(userId);
      await unit.save();
    }
  }

  async removeUserFromUnit(unitId: string, userId: string): Promise<void> {
    // Kiểm tra OrganizationUnit
    const unit = await OrganizationUnitService.OrganizationModel.findOne({
      _id: unitId,
      status: STATUS.ACTIVED,
    }).lean(); // Dùng lean() vì chỉ kiểm tra, không cần cập nhật
    if (!unit) {
      throw new BadRequestException({
        success: false,
        message: `Đơn vị với ID ${unitId} không tồn tại hoặc không hoạt động`,
      });
    }

    // Kiểm tra và cập nhật User

    const user = await this.userRepository.findOne({
      where: {
        id: userId,
        status: STATUS.ACTIVED,
      },
      relations: ['parent'],
    });
    if (!user) {
      throw new BadRequestException(
        `Người dùng với ID ${userId} không tồn tại hoặc không hoạt động`,
      );
    }

    // Nếu parent của user là unitId, đặt về null
    if (user.parent && user.parent.id === unitId) {
      user.parent = null;
      await this.userRepository.save(user);
    }
    // Không cần cập nhật managers trong OrganizationUnit
  }

  // Lấy tất cả đơn vị
  async findAll(queryParams: any) {
    return findAll(queryParams);
  }

  // Lấy tất cả đơn vị đang hoạt động (không phân trang)
  async findAllActive(queryParams: Record<string, string>): Promise<any> {
    return findAllActive(queryParams);
  }

  async deleteManyByIds(ids: string[]) {
    return deleteManyByIds(ids);
  }

  // Tìm đơn vị theo ID
  async findById(id: string): Promise<any> {
    const unit =
      await OrganizationUnitService.OrganizationModel.findById(id).populate(
        'parent',
      );

    if (!unit) throw new BadRequestException('Không tìm thấy đơn vị');
    if (unit.status !== STATUS.ACTIVED) {
      return null;
    }

    const unitId = `RG_${unit.code}`;

    const mapping = await this.entityRoleGroupService.findByUnitId(
      unitId,
      'TTHC',
    );
    if (!mapping) return unit.toObject();

    // Convert roleGroupId to string if it's ObjectId
    const roleGroupId = typeof mapping.roleGroupId === 'object' && (mapping.roleGroupId as any)?.toString()
      ? (mapping.roleGroupId as any).toString()
      : String(mapping.roleGroupId);

    const roleGroup = await EntityRoleGroupController.RoleGroup.findOne({
      where: { id: roleGroupId },
    });
    if (!roleGroup) return unit.toObject();

    const data = {
      ...unit.toObject(),
      roleGroup: roleGroup,
    };
    return data;
  }

  async findByUserId(id: string, userId: string): Promise<any> {
    // Find the organization unit by ID and populate the 'parent' field
    const unit =
      await OrganizationUnitService.OrganizationModel.findById(id).populate(
        'parent',
      );

    if (!unit) throw new BadRequestException('Không tìm thấy đơn vị');
    if (unit.status !== STATUS.ACTIVED) return null;

    const unitId = `RG_${unit.code}`;

    // Find the role group mapping for the unit
    const mapping = await this.entityRoleGroupService.findByUnitId(
      unitId,
      'TTHC',
    );
    if (!mapping) return unit.toObject();

    // Find the role group by ID
    // Convert roleGroupId to string if it's ObjectId
    const roleGroupId = typeof mapping.roleGroupId === 'object' && (mapping.roleGroupId as any)?.toString()
      ? (mapping.roleGroupId as any).toString()
      : String(mapping.roleGroupId);

    const roleGroup = await EntityRoleGroupController.RoleGroup.findOne({
      where: { id: roleGroupId },
    });
    if (!roleGroup) return unit.toObject();

    // Prepare the response data
    const data = {
      ...unit.toObject(),
      roleGroup: roleGroup,
    };

    return data;
  }

  async findByIdUpdate(id: string): Promise<any> {
    const unit = await OrganizationUnitService.OrganizationModel.findById(id);

    if (!unit) throw new BadRequestException('Không tìm thấy đơn vị');
    if (unit.status !== STATUS.ACTIVED) return null;

    const unitId = `RG_${unit.code}`;

    const mapping = await this.entityRoleGroupService.findByUnitId(
      unitId,
      'TTHC',
    );
    if (!mapping) return unit.toObject();

    // Convert roleGroupId to string if it's ObjectId
    const roleGroupId = typeof mapping.roleGroupId === 'object' && (mapping.roleGroupId as any)?.toString()
      ? (mapping.roleGroupId as any).toString()
      : String(mapping.roleGroupId);

    const roleGroup = await EntityRoleGroupController.RoleGroup.findOne({
      where: { id: roleGroupId },
    });
    if (!roleGroup) return unit.toObject();

    const data = {
      ...unit.toObject(),
      roleGroup: roleGroup,
    };

    return data;
  }
  // Cập nhật đơn vị
  async update(
    id: string,
    updateDto: UpdateOrganizationUnitDto,
  ): Promise<OrganizationUnit> {
    // Kiểm tra ID hợp lệ
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`ID ${id} không hợp lệ`);
    }

    // Tìm đơn vị hiện tại (document để có thể lấy các thông tin cũ)
    const unit = await OrganizationUnitService.OrganizationModel.findOne({
      _id: id,
      status: STATUS.ACTIVED,
    });
    if (!unit) {
      throw new BadRequestException(`Không tìm thấy đơn vị với ID ${id}`);
    }

    // Kiểm tra trùng code (nếu thay đổi code)
    if (updateDto.code && updateDto.code !== unit.code) {
      const existingCode =
        await OrganizationUnitService.OrganizationModel.findOne({
          code: updateDto.code,
          status: STATUS.ACTIVED,
        }).lean();
      if (existingCode) {
        throw new BadRequestException({
          message: `Mã đơn vị ${updateDto.code} đã tồn tại`,
        });
      }
    }

    // Nếu client gửi roleGroup, đảm bảo đó là mảng — nếu không gửi thì bỏ qua (không bắt buộc)
    if (
      updateDto.roleGroup !== undefined &&
      !Array.isArray(updateDto.roleGroup)
    ) {
      throw new BadRequestException({
        message: 'roleGroup phải là một mảng',
      });
    }

    // xử lý thay đổi parent / path
    let newPathForCurrentUnit = unit.path || '';

    if (
      updateDto.parent !== undefined &&
      updateDto.parent !== unit.parent?.toString()
    ) {
      // validate không thể gán cha là chính nó
      if (updateDto.parent && updateDto.parent === id) {
        throw new BadRequestException('Không thể gán đơn vị cha là chính nó');
      }

      // nếu parent khác null => kiểm tra parent có tồn tại và không là descendant
      if (updateDto.parent) {
        if (!Types.ObjectId.isValid(updateDto.parent)) {
          throw new BadRequestException(
            `ID đơn vị cha ${updateDto.parent} không hợp lệ`,
          );
        }
        const parentUnit =
          await OrganizationUnitService.OrganizationModel.findOne({
            _id: updateDto.parent,
            status: STATUS.ACTIVED,
          }).lean();
        if (!parentUnit)
          throw new BadRequestException(
            `Đơn vị cha với ID ${updateDto.parent} không tồn tại hoặc không hoạt động`,
          );

        // Kiểm tra vòng lặp: parent không được là descendant của unit
        const descendants =
          await OrganizationUnitService.OrganizationModel.find({
            path: { $regex: `^${unit.path ? `${unit.path}/${id}` : id}` },
            status: STATUS.ACTIVED,
          })
            .select('_id')
            .lean();
        const descendantIds = descendants.map((d) => d._id.toString());
        if (descendantIds.includes(updateDto.parent)) {
          throw new BadRequestException(
            'Không thể gán đơn vị cha là một trong các đơn vị con của chính nó',
          );
        }

        // build new path for current unit
        newPathForCurrentUnit = parentUnit.path
          ? `${parentUnit.path}/${parentUnit._id}`
          : (parentUnit._id as any).toString();
      } else {
        // parent set to null => this becomes root
        newPathForCurrentUnit = '';
      }

      // Cập nhật path cho các đơn vị con/cháu (nếu có)
      if (newPathForCurrentUnit !== (unit.path || '')) {
        const oldFullPath = unit.path ? `${unit.path}/${id}` : id;
        const newFullPath = newPathForCurrentUnit
          ? `${newPathForCurrentUnit}/${id}`
          : id;

        const allDescendants =
          await OrganizationUnitService.OrganizationModel.find({
            path: { $regex: `^${oldFullPath}` },
            status: STATUS.ACTIVED,
          });

        for (const descendant of allDescendants) {
          const newDescendantPath = (descendant.path || '').replace(
            oldFullPath,
            newFullPath,
          );
          await OrganizationUnitService.OrganizationModel.updateOne(
            { _id: descendant._id },
            { $set: { path: newDescendantPath } },
          );
        }
      }
    }

    // Tách roleGroup ra khỏi updateDto để không ghi vào collection OrganizationUnit
    const { roleGroup, ...restUpdate } = updateDto as any;

    // Chuẩn bị object chỉ chứa các field của OrganizationUnit (không bao gồm roleGroup)
    const updateFields: any = {
      ...restUpdate,
      path: newPathForCurrentUnit, // đảm bảo path được cập nhật
    };

    // Thực hiện update cho document OrganizationUnit (chỉ các field thuộc unit)
    const updatedUnit =
      await OrganizationUnitService.OrganizationModel.findOneAndUpdate(
        { _id: id, status: STATUS.ACTIVED },
        { $set: updateFields },
        { new: true, runValidators: true },
      );

    if (!updatedUnit) {
      throw new BadRequestException(`Không thể cập nhật đơn vị với ID ${id}`);
    }

    // Nếu client gửi roleGroup (mảng) -> xử lý tạo/cập nhật roleGroup thông qua service
    if (Array.isArray(roleGroup)) {
      // unit.code là code cũ — nếu client thay code, bạn có thể dùng updateFields.code nếu muốn mapping đổi tên
      const unitId = `RG_${updatedUnit.code || updateFields.code}`;

      const mapping = await this.entityRoleGroupService.findByUnitId(
        unitId,
        'TTHC',
      );

      if (!mapping) {
        // Tạo mới roleGroup (như ở create)
        await this.roleGroupService.create({
          clientId: 'TTHC',
          name: `Quyền của ${updateDto.name || updatedUnit.name}`,
          code: `RG_${updateDto.code || updatedUnit.code}`,
          entityType: 'organization',
          roles: roleGroup,
        });
        // Lưu ý: nếu cần tạo mapping entityRoleGroup, gọi entityRoleGroupService tương ứng ở đây
      } else {
        // Cập nhật roleGroup đã có
        await this.roleGroupService.update(mapping.roleGroupId.toString(), {
          clientId: 'TTHC',
          entityType: 'organization',
          name: `Quyền của ${updateDto.name || updatedUnit.name}`,
          code: `RG_${updateDto.code || updatedUnit.code}`,
          roles: roleGroup,
        });
      }
    }

    return updatedUnit as OrganizationUnit;
  }

  // Xóa đơn vị
  async delete(id: string): Promise<void> {
    if (!isValidMongoId(id)) {
      throw new BadRequestException(`ID ${id} không hợp lệ`);
    }

    // Tìm đơn vị cần xóa để lấy path
    const unit =
      await OrganizationUnitService.OrganizationModel.findById(id).lean();
    if (!unit) {
      throw new BadRequestException(`Đơn vị với ID ${id} không tồn tại`);
    }
    const unitIdStr = unit._id.toString();

    // Tìm tất cả các đơn vị cần xóa (chính nó và các con của nó)
    const query = {
      $or: [{ _id: unit._id }, { path: { $regex: `(^|/)${unitIdStr}(/|$)` } }],
      status: { $ne: STATUS.DELETED }, // Chỉ xóa những đơn vị chưa bị xóa
    };

    const unitsToDelete =
      await OrganizationUnitService.OrganizationModel.find(query).lean();

    if (unitsToDelete.length === 0) {
      // Có thể không cần throw lỗi ở đây, vì có thể nó đã được xóa trước đó
      // throw new NotFoundException(`Không tìm thấy đơn vị nào để xóa với ID ${id}`);
      return;
    }

    // Tạo các thao tác bulk update
    const bulkOps = unitsToDelete.map((u) => {
      const newCode = `${u.code}_deleted_${new Types.ObjectId().toHexString()}`;
      return {
        updateOne: {
          filter: { _id: u._id },
          update: { $set: { status: STATUS.DELETED, code: newCode } },
        },
      };
    });

    if (bulkOps.length > 0) {
      await OrganizationUnitService.OrganizationModel.bulkWrite(bulkOps);
    }
  }
}

async function findAllActive(queryParams: QueryParams) {
  const { page = 1, limit = 25, sort = '-createdAt', ...filters } = queryParams;

  if (!areFiltersValid(filters)) {
    return {
      success: false,
      message: `tìm kiếm không được chứa ký tự đặc biệt`,
    };
  }

  const { convertedFilters, errors } = convertFiltersBySchema(
    filters,
    OrganizationUnitService.OrganizationModel.schema,
  );

  if (errors.length > 0) {
    return {
      success: false,
      message: 'Lỗi dữ liệu đầu vào',
      errors,
    };
  }

  const queryFinal = buildMongoQuery(convertedFilters, {
    status: STATUS.ACTIVED,
  });

  const totalRecords =
    await OrganizationUnitService.OrganizationModel.countDocuments(queryFinal);

  const pageNum = clampPage(page ?? 1);
  const limitNum = clampLimit(limit ?? 10);
  const skip = (pageNum - 1) * limitNum;
  const totalPages = Math.ceil(totalRecords / limitNum);

  const sortFinal = parseSortParam(sort);

  const rawData = await OrganizationUnitService.OrganizationModel.find(queryFinal)
    .sort(sortFinal)
    .skip(skip)
    .limit(limitNum)
    .lean(); // Sử dụng lean() để có object Javascript thuần túy, dễ chỉnh sửa

  // Chỉnh sửa dữ liệu để đảm bảo order luôn là null
  const data = rawData.map((item) => {
    return { ...item };
  });

  return {
    total: totalRecords,
    page: pageNum,
    limit: limitNum,
    totalPages,
    data,
    filter: queryFinal,
  };
}
async function findAll(queryParams: QueryParams) {
  const { page = 1, limit = 25, sort = '-createdAt', ...filters } = queryParams;

  if (!areFiltersValid(filters)) {
    return {
      success: false,
      message: `tìm kiếm không được chứa ký tự đặc biệt`,
    };
  }

  const { convertedFilters, errors } = convertFiltersBySchema(
    filters,
    OrganizationUnitService.OrganizationModel.schema,
  );

  if (errors.length > 0) {
    return {
      success: false,
      message: 'Lỗi dữ liệu đầu vào',
      errors,
    };
  }

  const queryFinal = buildMongoQuery(convertedFilters, {
    status: STATUS.ACTIVED,
  });

  const totalRecords =
    await OrganizationUnitService.OrganizationModel.countDocuments(queryFinal);

  const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
  const limitNum = Math.max(parseInt(limit as string, 10) || 10, 1);
  const skip = (pageNum - 1) * limitNum;
  const totalPages = Math.ceil(totalRecords / limitNum);

  const sortFinal = parseSortParam(sort);

  const data = await OrganizationUnitService.OrganizationModel.find(queryFinal)
    .sort(sortFinal)
    .skip(skip)
    .limit(limitNum);

  return {
    total: totalRecords,
    page: pageNum,
    limit: limitNum,
    totalPages,
    data,
    filter: queryFinal,
  };
}

async function deleteManyByIds(ids: string[]) {
  const validIds = ids.filter(isValidMongoId);
  if (validIds.length === 0) {
    return false;
  }

  const result = await OrganizationUnitService.OrganizationModel.updateMany(
    { _id: { $in: validIds } },
    { status: STATUS.DELETED },
  );

  return result.modifiedCount > 0;
}

export class OrganizationUnitModule { }
