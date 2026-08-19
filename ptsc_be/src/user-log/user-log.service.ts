import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { UserLogEntity } from './user-log.entity';

@Injectable()
export class UserLogService {
  private readonly logger = new Logger(UserLogService.name);

  constructor(
    @InjectRepository(UserLogEntity, 'mssqlConnection') // Nếu dùng named connection
    // @InjectRepository(UserLogEntity) // Nếu chỉ có 1 connection mặc định
    private readonly userLogRepository: Repository<UserLogEntity>,
  ) { }

  /**
   * Tạo mới một bản ghi log
   */
  async createLog(data: {
    ip: string;
    userId?: string;
    userName: string;
    department: string;
    feature: string;
    action: string;
    status: string;
  }) {
    const log = this.userLogRepository.create({
      ip: data.ip,
      userName: data.userName,
      department: data.department,
      feature: data.feature,
      action: data.action,
      status: data.status,
    });

    return await this.userLogRepository.save(log);
  }

  /**
   * Lấy danh sách log với phân trang, sort, và tìm kiếm OR case-insensitive
   */
  async findAllLogs(queryParams: any = {}) {
    const {
      page = 1,
      limit = 25,
      sort = '-createdAt',
      ...filters
    } = queryParams;

    // 🚫 Validate: không cho phép ký tự nguy hiểm trong filter
    const hasInvalidChar = Object.values(filters).some((value: any) =>
      typeof value === 'string' && /[<>$]/.test(value),
    );

    if (hasInvalidChar) {
      return {
        success: false,
        message: 'Tìm kiếm không được chứa ký tự đặc biệt như <, >, $',
      };
    }

    // 🔍 Xây dựng điều kiện tìm kiếm OR (case-insensitive) cho tất cả các field
    const whereConditions: any[] = [];

    if (Object.keys(filters).length > 0) {
      const orCondition: any = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
          // Sử dụng ILike để tìm kiếm không phân biệt hoa thường (LIKE %value%)
          orCondition[key] = ILike(`%${value}%`);
        }
      });

      if (Object.keys(orCondition).length > 0) {
        whereConditions.push(orCondition);
      }
    }

    // Nếu không có filter → whereConditions = [] → lấy tất cả
    const queryBuilder = this.userLogRepository.createQueryBuilder('log');

    if (whereConditions.length > 0) {
      queryBuilder.where(whereConditions[0]); // Chỉ có 1 điều kiện OR
    }

    // Đếm tổng số bản ghi
    const totalRecords = await queryBuilder.getCount();

    const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit as string, 10) || 25, 1);
    const skip = (pageNum - 1) * limitNum;
    const totalPages = Math.ceil(totalRecords / limitNum);

    // Xử lý sort: hỗ trợ cả chuỗi ('-createdAt') và object
    let order: any = { createdAt: 'DESC' };
    if (typeof sort === 'string') {
      if (sort.startsWith('-')) {
        const field = sort.substring(1);
        order = { [field]: 'DESC' };
      } else if (sort.startsWith('+')) {
        const field = sort.substring(1);
        order = { [field]: 'ASC' };
      } else {
        order = { [sort]: 'ASC' };
      }
    } else if (typeof sort === 'object') {
      order = sort;
    }

    // Áp dụng sort, skip, take
    const data = await queryBuilder
      .orderBy(`log.${Object.keys(order)[0]}`, Object.values(order)[0] as 'ASC' | 'DESC')
      .skip(skip)
      .take(limitNum)
      .getMany();


    return {
      success: true,
      total: totalRecords,
      page: pageNum,
      limit: limitNum,
      totalPages,
      data,
      filter: filters, // Trả về filter gốc để frontend hiển thị
    };
  }
}