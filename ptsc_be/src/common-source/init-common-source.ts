import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { CommonSourceEntity } from './common-source.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InitCommonSourceService implements OnModuleInit {
  private readonly logger = new Logger(InitCommonSourceService.name);
  private readonly COMMON_CRM_SOURCE_SDLD: string;
  private readonly COMMON_CRM_SOURCE_DC: string;

  constructor(
    @InjectRepository(CommonSourceEntity, 'mssqlConnection')
    private commonSourceRepository: Repository<CommonSourceEntity>,
    @InjectDataSource('mssqlConnection')
    private dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.COMMON_CRM_SOURCE_SDLD = this.configService.get<string>(
      'COMMON_CRM_SOURCE_SDLD',
      'SDLD003',
    );
    this.COMMON_CRM_SOURCE_DC = this.configService.get<string>(
      'COMMON_CRM_SOURCE_DC',
      'DC001',
    );
  }

  async onModuleInit() {
    await this.createTableIfNotExists();
    await this.seedData();
  }

  private async createTableIfNotExists() {
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();

      // Check if table exists
      const tableExists = await queryRunner.hasTable('commonsources');

      if (!tableExists) {

        await queryRunner.query(`
          CREATE TABLE [dbo].[commonsources] (
            [id] INT IDENTITY(1,1) PRIMARY KEY,
            [code] NVARCHAR(255) NOT NULL,
            [title] NVARCHAR(500) NOT NULL,
            [canDragDrop] BIT NOT NULL DEFAULT 0,
            [type] NVARCHAR(255) NOT NULL,
            [data] NVARCHAR(MAX) NULL,
            [status] INT NOT NULL DEFAULT 1,
            [createdAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
            [updatedAt] DATETIME2 NOT NULL DEFAULT GETDATE()
          );
        `);

        // Create unique index on code
        await queryRunner.query(`
          CREATE UNIQUE INDEX [IX_commonsources_code] 
          ON [dbo].[commonsources] ([code]);
        `);

      } else {
      }
    } catch (error) {
      this.logger.error('Error creating table:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async seedData() {
    const data = [
      {
        code: 'S001',
        title: 'Loại Đơn Vị',
        canDragDrop: false,
        type: 'DocumentConfig',
        data: [
          { title: 'Sở', value: 'So', index: 1 },
          { title: 'Ban', value: 'Ban', index: 2 },
          { title: 'Ngành', value: 'Nganh', index: 3 },
          { title: 'Phòng', value: 'Phong', index: 4 },
        ],
      },
      {
        code: 'S002',
        title: 'Chức vụ',
        canDragDrop: true,
        type: 'DocumentConfig',
        data: [
          { title: 'Quản trị hệ thống', value: 'Admin', index: 0 },
          { title: 'Văn thư', value: 'Vanthu', index: 1 },
          { title: 'Giám đốc', value: 'Giamdoc', index: 2 },
          { title: 'Phó giám đốc', value: 'Phogiamdoc', index: 3 },
          { title: 'Trưởng phòng', value: 'Truongphong', index: 4 },
          { title: 'Phó trưởng phòng', value: 'Photruongphong', index: 5 },
          { title: 'Cán bộ', value: 'Canbo', index: 6 },
        ],
      },
      {
        code: 'S003',
        title: 'Ngành nghề',
        canDragDrop: true,
        type: 'DocumentConfig',
        data: [],
      },
      {
        title: 'Kiểu nhập',
        canDragDrop: true,
        code: 'SDLD001',
        type: 'typeInput',
        data: [
          {
            title: 'Chữ',
            index: 1,
            value: 'String',
          },
          {
            title: 'Số nguyên',
            index: 2,
            value: 'Number',
          },
          {
            title: 'Ngày tháng',
            index: 3,
            value: 'Date',
          },
          {
            title: 'Danh mục động',
            index: 4,
            value: 'crmSource',
          },
          {
            title: 'TextArea',
            index: 5,
            value: 'TextArea',
          },
        ],
      },
      {
        code: 'SDD004',
        title: 'Trạng thái chuẩn giữ liệu đầu vào',
        canDragDrop: false,
        type: 'statusDocumentStandard',
        data: [
          { title: 'Định dạng', value: 'DINH_DANG', index: 1 },
          { title: 'Kích thước', value: 'KICH_THUOC', index: 2 },
          { title: 'Chất lượng', value: 'CHAT_LUONG', index: 3 },
          { title: 'ORC', value: 'OCR', index: 4 },
          { title: 'Bảo mật', value: 'BAO_MAT', index: 5 },
        ],
      },
      {
        code: 'SDD001',
        title: 'Loại tài liệu',
        canDragDrop: false,
        type: 'typeDocumentStandard',
        data: [
          { title: 'Ảnh', value: 'IMG', index: 1 },
          { title: 'PDF', value: 'PDF', index: 2 },
        ],
      },
      {
        code: 'SDD002',
        title: 'Trạng thái',
        canDragDrop: false,
        type: 'status',
        data: [
          { title: 'Đang áp dụng', value: '1', index: 1 },
          { title: 'Đã hủy', value: '0', index: 2 },
          { title: 'Tạm ngừng', value: '2', index: 3 },
        ],
      },
      {
        code: this.COMMON_CRM_SOURCE_SDLD,
        title: 'Siêu dữ liệu động',
        canDragDrop: true,
        type: 'typeInput',
        data: [],
      },
      {
        code: this.COMMON_CRM_SOURCE_DC,
        title: 'Loại hình tài liệu',
        canDragDrop: true,
        type: 'typeInput',
        data: [],
      },
      {
        code: 'F001',
        title: 'Loại Phông',
        canDragDrop: true,
        type: 'typeInput',
        data: [],
      },
      {
        code: 'TTHC001',
        title: 'TTHC',
        canDragDrop: true,
        type: 'typeInput',
        data: [],
      },
    ];

    for (const item of data) {
      const exists = await this.commonSourceRepository.findOne({ where: { code: item.code } });
      if (!exists) {
        const entity = this.commonSourceRepository.create(item as any);
        await this.commonSourceRepository.save(entity);
      }
    }

  }
}
