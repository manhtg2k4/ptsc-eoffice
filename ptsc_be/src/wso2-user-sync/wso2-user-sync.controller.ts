// src/users/wso2-sync.controller.ts
import { Controller, Post, Sse } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { Wso2UserSyncService } from './wso2-user-sync.service';
// import { CreateWso2UserSyncDto } from './dto/create-wso2-user-sync.dto';
// import { UpdateWso2UserSyncDto } from './dto/update-wso2-user-sync.dto';

@ApiTags('Đồng bộ người dùng WSO2')
@Controller('wso2-user-sync')
export class Wso2UserSyncController {
  constructor(private readonly wso2UserSyncService: Wso2UserSyncService) { }

  @ApiOperation({
    summary: 'Bắt đầu đồng bộ người dùng',
    description: 'Bắt đầu quá trình đồng bộ người dùng từ hệ thống WSO2',
  })
  @ApiResponse({
    status: 200,
    description: 'Đồng bộ thành công',
  })
  @Post('start')
  async startSync() {
    return this.wso2UserSyncService.syncFromWso2WithProgress();
  }

  @ApiOperation({
    summary: 'Theo dõi tiến độ đồng bộ',
    description: 'Theo dõi tiến độ đồng bộ người dùng theo thời gian thực qua Server-Sent Events',
  })
  @ApiResponse({
    status: 200,
    description: 'Kết nối SSE thành công',
  })
  // SSE: Xem tiến độ realtime
  @Sse('progress')
  progress(): Observable<MessageEvent> {
    return new Observable((observer) => {
      const sub = this.wso2UserSyncService.progressSubject.subscribe({
        next: (data) => observer.next({ data } as MessageEvent),
        error: (err) => observer.error(err),
      });
      return () => sub.unsubscribe();
    });
  }
}
