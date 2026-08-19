import { Controller, Get, Post, HttpCode, HttpStatus, Logger, Sse, MessageEvent, Body } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import { HrmSyncService } from './hrm-sync.service';

@Controller('hrm-sync')
export class HrmSyncController {
  private readonly logger = new Logger(HrmSyncController.name);

  constructor(private readonly hrmSyncService: HrmSyncService) {}

  /**
   * POST /hrm-sync/sync
   * Phơi endpoint để frontend có thể kích hoạt đồng bộ HRM thủ công
   */
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async syncHrm() {
    try {
      await this.hrmSyncService.sync();
      return {
        success: true,
        message: 'Đồng bộ HRM hoàn tất thành công.',
      };
    } catch (error) {
      this.logger.error(`❌ Lỗi đồng bộ HRM thủ công: ${error.message}`);
      return {
        success: false,
        message: `Đồng bộ HRM thất bại: ${error.message}`,
      };
    }
  }

  @Sse('progress')
  progress(): Observable<MessageEvent> {
    return this.hrmSyncService.getProgress().pipe(
      map((data) => ({
        data: data,
      } as MessageEvent)),
    );
  }

  /**
   * POST /hrm-sync/local
   * Endpoint để chạy đồng bộ từ file JSON cục bộ
   * Cho phép truyền đường dẫn file qua Body để linh hoạt khi triển khai ở các môi trường khác nhau
   */
  @Post('local')
  @HttpCode(HttpStatus.OK)
  async localSync(@Body() body: { userPath?: string; orgPath?: string } = {}) {
    // Sử dụng đường dẫn mặc định tới folder fake-data-hrm trong project nếu không được truyền vào
    const userPath = body?.userPath || path.join(process.cwd(), 'fake-data-hrm', 'Employee_Accounts.json');
    const orgPath = body?.orgPath || path.join(process.cwd(), 'fake-data-hrm', 'hrm-organization-units-data-uuid.json');

    
    try {
      // Kiểm tra file tồn tại trước khi chạy ngầm
      if (!fs.existsSync(userPath) || !fs.existsSync(orgPath)) {
        return {
          success: false,
          message: `Không tìm thấy file tại đường dẫn cung cấp. Vui lòng kiểm tra lại.`,
          paths: { userPath, orgPath }
        };
      }
      // Chạy bất đồng bộ để trả về ngay cho Client, progress sẽ qua SSE
      this.hrmSyncService.syncFromLocalFiles(userPath, orgPath).catch(err => {
        this.logger.error(`❌ Lỗi đồng bộ từ file: ${err.message}`);
      });

      return {
        success: true,
        message: 'Đã bắt đầu quá trình đồng bộ từ file. Vui lòng theo dõi qua SSE progress.',
      };
    } catch (error) {
      return {
        success: false,
        message: `Không thể khởi chạy quá trình đồng bộ: ${error.message}`,
      };
    }
  }

  @Get('jobs')
  async getJobs() {
    return this.hrmSyncService.getHrmJobs();
  }
}
