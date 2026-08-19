import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateIssuingAgencyDto } from './dto/create-issuing-agency.dto';
import { UpdateIssuingAgencyDto } from './dto/update-issuing-agency.dto';
import {
  IssuingAgency,
  IssuingAgencyDocument,
} from './issuing-agencies.schema';
import { areFiltersValid, buildMongoQuery, convertFiltersBySchema, parseSortParam } from '../utils/util';
import { STATUS } from '../variables/CONST_STATUS';

@Injectable()
export class IssuingAgenciesService {
  constructor(
    @InjectModel(IssuingAgency.name)
    private issuingAgencyModel: Model<IssuingAgencyDocument>,
  ) {}

  async create(
    createIssuingAgencyDto: CreateIssuingAgencyDto,
  ): Promise<IssuingAgency> {
    const existing = await this.issuingAgencyModel
      .findOne({ code: createIssuingAgencyDto.code, status: STATUS.ACTIVED })
      .exec();
    if (existing) {
      throw new BadRequestException(
        `Mã cơ quan ban hành '${createIssuingAgencyDto.code}' đã tồn tại.`,
      );
    }
    const createdAgency = new this.issuingAgencyModel(createIssuingAgencyDto);
    return createdAgency.save();
  }

  /**
   * @description Lấy danh sách cơ quan ban hành cho mục đích sử dụng nội bộ (ví dụ: populate)
   * @returns {Promise<IssuingAgency[]>}
   */
  async findAllForInternalUse(): Promise<(IssuingAgency & { _id: any })[]> {
    // Sử dụng lean() để tăng hiệu suất khi chỉ cần đọc dữ liệu
    return this.issuingAgencyModel
      .find({ status: STATUS.ACTIVED })
      .lean()
      .exec();
  }

  async findAll(queryParams: any) {
    const { page = 1, limit = 25, sort = '-createdAt', ...filters } = queryParams;

    const { convertedFilters, errors } = convertFiltersBySchema(
      filters,
      this.issuingAgencyModel.schema,
    );

    if (!areFiltersValid(filters)) {
      throw new BadRequestException({
        success: false,
        message: 'Tham số tìm kiếm không hợp lệ.',
      });
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        success: false,
        message: 'Lỗi dữ liệu đầu vào',
        errors,
      });
    }

    const queryFinal = buildMongoQuery(convertedFilters, {
      status: STATUS.ACTIVED,
    });

    const totalRecords = await this.issuingAgencyModel.countDocuments(queryFinal);
    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.max(Number(limit) || 10, 1);
    const skip = (pageNum - 1) * limitNum;
    const totalPages = Math.ceil(totalRecords / limitNum);
    const sortFinal = parseSortParam(sort);

    const data = await this.issuingAgencyModel
      .find(queryFinal)
      .sort(sortFinal)
      .skip(skip)
      .limit(limitNum)
      .lean();

    return {
      total: totalRecords,
      page: pageNum,
      limit: limitNum,
      totalPages,
      data,
    };
  }

  async findOne(id: string): Promise<IssuingAgency> {
    const agency = await this.issuingAgencyModel.findById(id).exec();
    if (!agency || agency.status !== STATUS.ACTIVED) {
      throw new NotFoundException(`Không tìm thấy cơ quan ban hành với ID '${id}'.`);
    }
    // Trả về một plain object để tránh các vấn đề về context của Mongoose
    return agency.toObject();
  }

  async update(
    id: string,
    updateIssuingAgencyDto: UpdateIssuingAgencyDto,
  ): Promise<IssuingAgency> {
    const updatedAgency = await this.issuingAgencyModel
      .findOneAndUpdate(
        { _id: id, status: STATUS.ACTIVED }, // Chỉ cập nhật bản ghi đang hoạt động
        updateIssuingAgencyDto,
        { new: true, runValidators: true }, // Thêm runValidators để kích hoạt validation của schema
      )
      .exec();
    if (!updatedAgency) {
      throw new NotFoundException(`Không tìm thấy cơ quan ban hành với ID '${id}' để cập nhật.`);
    }
    return updatedAgency;
  }

  async remove(id: string): Promise<{ deleted: boolean; message?: string }> {
    const result = await this.issuingAgencyModel
      // Sử dụng findOneAndUpdate để đảm bảo chỉ xóa mềm bản ghi đang hoạt động
      .findOneAndUpdate({ _id: id, status: STATUS.ACTIVED }, { status: STATUS.DELETED })
      .exec();
    if (!result) {
      throw new NotFoundException(`Không tìm thấy cơ quan ban hành với ID '${id}' để xóa.`);
    }
    return { deleted: true, message: 'Xóa thành công.' };
  }

  async removeMany(ids: string[]): Promise<{ deletedCount: number }> {
    const result = await this.issuingAgencyModel.updateMany(
      { _id: { $in: ids }, status: { $ne: STATUS.DELETED } },
      { $set: { status: STATUS.DELETED } },
    );

    if (result.modifiedCount === 0) {
      throw new NotFoundException(
        `Không tìm thấy cơ quan ban hành nào với các ID đã cho để xóa hoặc các bản ghi đã được xóa trước đó.`,
      );
    }

    return { deletedCount: result.modifiedCount };
  }

  async findByName(name: string): Promise<IssuingAgencyDocument[]> {
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return [];
    }

    // Sử dụng buildMongoQuery để tạo câu truy vấn tìm kiếm theo tên
    const query = buildMongoQuery({ name });

    return this.issuingAgencyModel
      .find(query)
      .lean() as any;
  }
}
