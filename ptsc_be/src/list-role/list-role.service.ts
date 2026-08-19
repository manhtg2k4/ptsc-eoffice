import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  CreatelistRoleDto,
  UpdateUserColumnConfigDto,
  UpdatelistRoleDto,
} from './list-role.dto';
import { STATUS } from '../variables/CONST_STATUS';
import { areFiltersValid } from '../utils/util';
import { QueryParams } from 'src/interfaces';
import { UserColumnConfigEntity } from './user-column-config.entity';
import { ListRoleEntity } from './entities/list-role.entity';

@Injectable()
export class listRoleService {
  constructor(
    @InjectRepository(ListRoleEntity, 'mssqlConnection')
    private readonly listRoleRepo: Repository<ListRoleEntity>,
    @InjectRepository(UserColumnConfigEntity, 'mssqlConnection')
    private readonly userColumnConfigRepo: Repository<UserColumnConfigEntity>,
  ) { }

  // Thêm nhóm người dùng
  async create(createlistRoleDto: CreatelistRoleDto): Promise<ListRoleEntity> {
    const existingGroup = await this.listRoleRepo.findOne({
      where: [
        { code: createlistRoleDto.code, status: STATUS.ACTIVED },
        { name: createlistRoleDto.name, status: STATUS.ACTIVED },
      ],
    });

    if (existingGroup) {
      if (existingGroup.code === createlistRoleDto.code) {
        throw new BadRequestException(
          `Mã chức năng ${createlistRoleDto.code} đã tồn tại`,
        );
      }
      throw new BadRequestException({
        success: false,
        message: `Tên chức năng ${createlistRoleDto.name} đã tồn tại`,
      });
    }

    const newGroup = this.listRoleRepo.create({
      id: uuidv4(),
      ...createlistRoleDto,
      status: STATUS.ACTIVED,
    });

    return await this.listRoleRepo.save(newGroup);
  }

  async findById(id: string): Promise<{ data: ListRoleEntity }> {
    const unit = await this.listRoleRepo.findOne({
      where: { id, status: STATUS.ACTIVED },
    });

    if (!unit) throw new BadRequestException('Không tìm thấy nhóm người dùng');
    if (unit.status !== STATUS.ACTIVED) {
      throw new BadRequestException('Nhóm người dùng không hoạt động');
    }

    return { data: unit as any };
  }

  // async findAll(queryParams: QueryParams): Promise<any> {
  //   const {
  //     page = 1,
  //     limit = 25,
  //     sort = '-createdAt',
  //     ...filters
  //   } = queryParams;

  //   if (!areFiltersValid(filters)) {
  //     return {
  //       success: false,
  //       message: `tìm kiếm không được chứa ký tự đặc biệt`,
  //     };
  //   }

  //   const { convertedFilters, errors } = convertFiltersBySchema(
  //     filters,
  //     listRoleService.listRoleModel.schema,
  //   );

  //   if (errors.length > 0) {
  //     return {
  //       success: false,
  //       message: 'Lỗi dữ liệu đầu vào',
  //       errors,
  //     };
  //   }

  //   // Chuẩn bị điều kiện query theo AND / OR
  //   const andConditions: any[] = [];
  //   const orConditions: any[] = [];

  //   // Xử lý logic OR cho name và code
  //   if (convertedFilters.code) {
  //     orConditions.push({
  //       code: { $regex: convertedFilters.code, $options: 'i' },
  //     });
  //   }
  //   if (convertedFilters.name) {
  //     orConditions.push({
  //       name: { $regex: convertedFilters.name, $options: 'i' },
  //     });
  //   }

  //   // Nếu có functionName thì thêm vào AND
  //   if (convertedFilters['roles.functionName']) {
  //     andConditions.push({
  //       'roles.functionName': convertedFilters['roles.functionName'],
  //     });
  //   }

  //   // Gộp OR của name/code nếu có
  //   if (orConditions.length > 0) {
  //     andConditions.push({ $or: orConditions });
  //   }

  //   // Luôn thêm điều kiện status
  //   andConditions.push({
  //     status: { $in: [STATUS.ACTIVED, STATUS.NOT_ACTIVED] },
  //   });

  //   const queryFinal = { $and: andConditions };

  //   const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
  //   const limitNum = Math.max(parseInt(limit as string, 10) || 10, 1);
  //   const skip = (pageNum - 1) * limitNum;

  //   const totalRecords =
  //     await listRoleService.listRoleModel.countDocuments(queryFinal);
  //   const totalPages = Math.ceil(totalRecords / limitNum);

  //   // ✅ Parse sort - Thêm log để debug
  //   let sortField = '';
  //   let sortOrder = 1;
  //   try {
  //     const sortObj = typeof sort === 'string' ? JSON.parse(sort) : sort;

  //     // Debug log
  //     console.log('Sort param:', sort);
  //     console.log('Parsed sortObj:', sortObj);

  //     if (sortObj.functionNameDisplay) {
  //       sortField = 'roles.functionName.name';
  //       sortOrder = sortObj.functionNameDisplay;
  //     }
  //   } catch (e) {
  //     if (typeof sort === 'string') {
  //       if (sort.startsWith('-functionNameDisplay')) {
  //         sortField = 'roles.functionName.name';
  //         sortOrder = -1;
  //       } else if (sort === 'functionNameDisplay') {
  //         sortField = 'roles.functionName.name';
  //         sortOrder = 1;
  //       }
  //     }
  //   }

  //   if (sortField === 'roles.functionName.name') {
  //     const aggregatePipeline: any[] = [
  //       { $match: queryFinal },
  //       {
  //         $addFields: {
  //           firstFunctionId: { $arrayElemAt: ['$roles.functionName', 0] },
  //         },
  //       },
  //       {
  //         $lookup: {
  //           from: 'menumanagers',
  //           localField: 'firstFunctionId',
  //           foreignField: '_id',
  //           as: 'functionDetails',
  //         },
  //       },
  //       {
  //         $addFields: {
  //           firstFunctionName: {
  //             $ifNull: [{ $arrayElemAt: ['$functionDetails.name', 0] }, ''],
  //           },
  //         },
  //       },
  //       {
  //         $sort: {
  //           firstFunctionName: sortOrder as 1 | -1,
  //           _id: 1, // Thêm sort theo _id để đảm bảo thứ tự ổn định
  //         },
  //       },
  //       { $skip: skip },
  //       { $limit: limitNum },
  //       { $project: { _id: 1 } },
  //     ];

  //     const aggregateResult = await listRoleService.listRoleModel
  //       .aggregate(aggregatePipeline, {
  //         collation: { locale: 'vi', strength: 2 },
  //       });

  //     const sortedIds = aggregateResult.map((doc) => doc._id);

  //     const data = await listRoleService.listRoleModel
  //       .find({ _id: { $in: sortedIds } })
  //       .select('code name describe roles status')
  //       .populate('roles.functionName', 'name')
  //       .lean();

  //     const orderedData = sortedIds
  //       .map((id) => data.find((d) => d._id.toString() === id.toString()))
  //       .filter(Boolean); // Loại bỏ undefined nếu có

  //     return {
  //       total: totalRecords,
  //       page: pageNum,
  //       limit: limitNum,
  //       totalPages,
  //       data: orderedData,
  //       filter: queryFinal,
  //     };
  //   }

  //   // ✅ Ngược lại: sort bình thường
  //   const sortFinal = parseSortParam(
  //     typeof sort === 'string' && sort.trim() ? sort : '-createdAt',
  //   );

  //   const data = await listRoleService.listRoleModel
  //     .find(queryFinal)
  //     .select('code name describe roles status')
  //     .sort(sortFinal)
  //     .skip(skip)
  //     .limit(limitNum)
  //     .collation({ locale: 'vi', strength: 2 }) // strength: 2 để không phân biệt hoa thường
  //     .populate('roles.functionName', 'name')
  //     .lean();

  //   return {
  //     total: totalRecords,
  //     page: pageNum,
  //     limit: limitNum,
  //     totalPages,
  //     data,
  //     filter: queryFinal,
  //   };
  // }

  // Sửa nhóm người dùng

  async findAll(queryParams: QueryParams): Promise<any> {
    const {
      page = 1,
      limit = 25,
      sort = '-createdAt',
      ...filters
    } = queryParams;

    if (!areFiltersValid(filters)) {
      return {
        success: false,
        message: `Tìm kiếm không được chứa ký tự đặc biệt`,
      };
    }

    const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit as string, 10) || 10, 1);
    const skip = (pageNum - 1) * limitNum;

    const qb = this.listRoleRepo.createQueryBuilder('lr').where('lr.status IN (:...status)', {
      status: [STATUS.ACTIVED, STATUS.NOT_ACTIVED],
    });

    if (filters.code) {
      qb.andWhere('lr.code LIKE :code', { code: `%${filters.code}%` });
    }
    if (filters.name) {
      qb.andWhere('lr.name LIKE :name', { name: `%${filters.name}%` });
    }

    // Sort parsing: accept '-field' or 'field,ASC/DESC'
    const sortMap: Record<string, string> = {
      code: 'lr.code',
      name: 'lr.name',
      describe: 'lr.describe',
      status: 'lr.status',
      createdAt: 'lr.createdAt',
      updatedAt: 'lr.updatedAt',
    };
    let sortField = 'lr.createdAt';
    let sortOrder: 'ASC' | 'DESC' = 'DESC';
    if (typeof sort === 'string' && sort.trim()) {
      if (sort.startsWith('-')) {
        const field = sort.substring(1);
        sortField = sortMap[field] || sortField;
        sortOrder = 'DESC';
      } else if (sort.includes(',')) {
        const [field, order] = sort.split(',');
        sortField = sortMap[field] || sortField;
        sortOrder = order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      } else {
        sortField = sortMap[sort] || sortField;
        sortOrder = 'ASC';
      }
    }

    qb.orderBy(sortField, sortOrder)
      .skip(skip)
      .take(limitNum);

    const [data, totalRecords] = await qb.getManyAndCount();
    const totalPages = Math.ceil(totalRecords / limitNum);

    return {
      total: totalRecords,
      page: pageNum,
      limit: limitNum,
      totalPages,
      data,
      filter: qb.getSql(),
    };
  }



  async update(
    groupId: string,
    updatelistRoleDto: UpdatelistRoleDto,
  ): Promise<ListRoleEntity | null> {
    const group = await this.listRoleRepo.findOne({
      where: { id: groupId, status: STATUS.ACTIVED },
    });
    if (!group) {
      throw new BadRequestException({
        message: `Vai trò với ID ${groupId} không tồn tại hoặc không hoạt động`,
      });
    }

    if (updatelistRoleDto.code && updatelistRoleDto.code !== group.code) {
      const existingGroup = await this.listRoleRepo.findOne({
        where: { code: updatelistRoleDto.code, status: STATUS.ACTIVED },
      });
      if (existingGroup) {
        throw new BadRequestException({
          success: false,
          message: `Mã chức năng ${updatelistRoleDto.code} đã tồn tại`,
        });
      }
    }

    const updateFields: Partial<ListRoleEntity> = {};

    if (updatelistRoleDto.code !== undefined)
      updateFields.code = updatelistRoleDto.code;
    if (updatelistRoleDto.describe !== undefined)
      updateFields.describe = updatelistRoleDto.describe;
    if (updatelistRoleDto.name !== undefined)
      updateFields.name = updatelistRoleDto.name;
    if (updatelistRoleDto.status !== undefined)
      updateFields.status = updatelistRoleDto.status;
    if (updatelistRoleDto.roles !== undefined)
      updateFields.roles = updatelistRoleDto.roles;

    if (Object.keys(updateFields).length === 0) {
      throw new BadRequestException({
        success: false,
        message: `Không có thông tin nào được cập nhật`,
      });
    }

    const updatedGroup = await this.listRoleRepo.save({
      ...group,
      ...updateFields,
      id: groupId,
    });

    return updatedGroup as any;
  }
  async deleteManyByIds(ids: string[]) {
    const validIds = ids.filter((id) => typeof id === 'string' && id.trim().length > 0);
    if (validIds.length === 0) {
      return false;
    }

    const result = await this.listRoleRepo.update(
      { id: In(validIds) },
      { status: STATUS.DELETED },
    );

    return (result.affected || 0) > 0;
  }
  // Xóa nhóm người dùng
  async delete(groupId: string): Promise<void> {
    const group = await this.listRoleRepo.findOne({
      where: { id: groupId, status: STATUS.ACTIVED },
    });
    if (!group) {
      throw new BadRequestException({
        message: `Vai trò với ID ${groupId} không tồn tại hoặc không hoạt động`,
      });
    }

    await this.listRoleRepo.update(
      { id: groupId },
      { status: STATUS.DELETED },
    );
  }

  // Lấy cấu hình cột của người dùng
  async getColumnConfig(userId: string, codeModule: string) {
    const userConfig = await this.userColumnConfigRepo.findOne({
      where: { codeModule },
    });

    if (userConfig) {
      return userConfig.columns;
    }

    // Nếu không có config, trả về config mặc định cho module 'list-role'
    if (codeModule === 'list-role') {
      return [
        { row: 'code', name: 'Mã vai trò', visible: true, width: '150px' },
        { row: 'name', name: 'Tên vai trò', visible: true, width: '250px' },
        { row: 'describe', name: 'Mô tả', visible: true, width: '300px' },
        { row: 'status', name: 'Trạng thái', visible: true, width: '150px' },
        { row: 'createdAt', name: 'Ngày tạo', visible: false, width: '200px' },
      ];
    }

    // Trả về mảng rỗng nếu không có module nào khớp
    return [];
  }

  // Cập nhật cấu hình cột của người dùng
  async updateColumnConfig(
    userId: string,
    updateDto: UpdateUserColumnConfigDto,
  ): Promise<UserColumnConfigEntity> {
    const { codeModule, columns } = updateDto;

    let existingConfig = await this.userColumnConfigRepo.findOne({
      where: { codeModule },
    });

    if (existingConfig) {
      existingConfig.columns = columns;
      return this.userColumnConfigRepo.save(existingConfig);
    } else {
      const newConfig = this.userColumnConfigRepo.create({
        userId,
        codeModule,
        columns,
      });
      return this.userColumnConfigRepo.save(newConfig);
    }
  }
}
