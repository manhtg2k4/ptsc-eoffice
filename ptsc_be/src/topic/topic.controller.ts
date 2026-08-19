import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, BadRequestException, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/oauth/jwt.guard';
import { FeatureGuard } from 'src/oauth/feature.guard';
import { ModulesKey } from 'src/oauth/decorator/module-key.decorator';
import { AuthorityGuard } from 'src/authority-documents';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { TopicService } from './topic.service';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { ListTopicDto } from './dto/list-topic.dto';
import { DeleteManyDto } from './dto/delete-many.dto';
import { Public } from 'src/oauth/decorator/public.decorator';

@ApiTags('Quản lý Chủ đề')
@UseGuards(JwtAuthGuard, AuthorityGuard)
@Controller('topic')
export class TopicController {
  constructor(
    private readonly topicService: TopicService,
    private readonly systemLogService: SystemLogServiceSql,
  ) { }


  @Post()
  @ApiOperation({
    summary: 'Tạo mới chủ đề',
    description: 'Tạo mới một chủ đề với tiêu đề, mô tả và các thông tin khác',
  })
  @ApiBody({
    type: CreateTopicDto,
    description: 'Dữ liệu tạo chủ đề',
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  @ModulesKey('dschude')
  @UseGuards(FeatureGuard)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      skipMissingProperties: false,
      whitelist: true,
      exceptionFactory: (errors) => {
        const formattedErrors = errors.map(err => {
          let message: string | unknown[] = [];
          if (err.constraints) {
            const val = Object.values(err.constraints)[0];
            try { message = JSON.parse(val); } catch { message = val; }
          }
          return { field: err.property, message };
        });

        return new BadRequestException({
          success: false,
          message: 'Dữ liệu không hợp lệ',
          errors: formattedErrors,
        });
      },
    }),
  )
  async create(@Body() createTopicDto: CreateTopicDto, @Req() req: any) {
    const userId = req?.user?.userId || "";
    try {
      const result = await this.topicService.create(createTopicDto);
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Chủ đề: Thêm mới chủ đề`,
        method: 'POST',
        status: 'SUCCESS',
        type: 'TOPIC',
        subType: 'TOPIC',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Lỗi: Chủ đề: Thêm mới chủ đề - ${error.message}`,
        method: 'POST',
        status: 'ERROR',
        type: 'TOPIC',
        subType: 'TOPIC',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }
  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách chủ đề',
    description: 'Lấy danh sách tất cả chủ đề với hỗ trợ phân trang và tìm kiếm',
  })
  @ApiQuery({
    name: 'page',
    type: Number,
    required: false,
    description: 'Số trang',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Số bản ghi trên một trang',
  })
  @ApiQuery({
    name: 'search',
    type: String,
    required: false,
    description: 'Từ khóa tìm kiếm',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành công',
  })
  async findAll(@Query() queryParams: ListTopicDto, @Req() req: any) {
    const userId = req?.user?.userId || "";
    try {
      const result = await this.topicService.findAll(queryParams);
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Chủ đề: Truy cập danh sách chủ đề`,
          method: 'GET',
          status: 'SUCCESS',
          type: 'TOPIC',
          subType: 'TOPIC',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      return result;
    } catch (error) {
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi: Chủ đề: Truy cập danh sách chủ đề - ${error.message}`,
          method: 'GET',
          status: 'ERROR',
          type: 'TOPIC',
          subType: 'TOPIC',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  }

  @Get('next-display-order')
  @ApiOperation({
    summary: 'Lấy thứ tự hiển thị tiếp theo',
    description: 'Lấy số thứ tự hiển thị tự động cho chủ đề mới',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thứ tự thành công',
    type: Number,
  })
  async getNextDisplayOrder(@Req() req: any) {
    const userId = req?.user?.userId || "";
    try {
      const result = await this.topicService.getNextDisplayOrder();
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Chủ đề: Lấy thứ tự hiển thị tiếp theo`,
          method: 'GET',
          status: 'SUCCESS',
          type: 'TOPIC',
          subType: 'TOPIC_NEXT_ORDER',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      return result;
    } catch (error) {
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi: Chủ đề: Lấy thứ tự hiển thị tiếp theo - ${error.message}`,
          method: 'GET',
          status: 'ERROR',
          type: 'TOPIC',
          subType: 'TOPIC_NEXT_ORDER',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  }

  @Get('display-orders')
  @ApiOperation({
    summary: 'Lấy danh sách tất cả thứ tự hiển thị',
    description: 'Lấy danh sách các thứ tự hiển thị của tất cả chủ đề',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành công',
  })
  async getAllDisplayOrders(@Req() req: any) {
    const userId = req?.user?.userId || "";
    try {
      const result = await this.topicService.getAllDisplayOrders();
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Chủ đề: Lấy danh sách tất cả thứ tự hiển thị`,
          method: 'GET',
          status: 'SUCCESS',
          type: 'TOPIC',
          subType: 'TOPIC_ORDERS_LIST',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      return result;
    } catch (error) {
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi: Chủ đề: Lấy danh sách tất cả thứ tự hiển thị - ${error.message}`,
          method: 'GET',
          status: 'ERROR',
          type: 'TOPIC',
          subType: 'TOPIC_ORDERS_LIST',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Lấy chi tiết chủ đề',
    description: 'Lấy thông tin chi tiết của một chủ đề theo ID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID của chủ đề',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy chủ đề',
  })
  async findOne(@Param('id') id: string, @Req() req: any) {
    const userId = req?.user?.userId || "";
    try {
      const result = await this.topicService.findOne(id);
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Chủ đề: Xem chi tiết chủ đề ID ${id}`,
          method: 'GET',
          status: 'SUCCESS',
          type: 'TOPIC',
          subType: 'TOPIC_DETAIL',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      return result;
    } catch (error) {
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi: Chủ đề: Xem chi tiết chủ đề ID ${id} - ${error.message}`,
          method: 'GET',
          status: 'ERROR',
          type: 'TOPIC',
          subType: 'TOPIC_DETAIL',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Cập nhật chủ đề',
    description: 'Cập nhật thông tin của một chủ đề theo ID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID của chủ đề cần cập nhật',
  })
  @ApiBody({
    type: UpdateTopicDto,
    description: 'Dữ liệu cập nhật',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy chủ đề',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  @ModulesKey('dschude')
  @UseGuards(FeatureGuard)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      skipMissingProperties: true,
      whitelist: true,
      exceptionFactory: (errors) => {
        const formattedErrors = errors.map(err => {
          let message: string | unknown[] = [];
          if (err.constraints) {
            const val = Object.values(err.constraints)[0];
            try { message = JSON.parse(val); } catch { message = val; }
          }
          return { field: err.property, message };
        });

        return new BadRequestException({
          success: false,
          message: 'Dữ liệu không hợp lệ',
          errors: formattedErrors,
        });
      },
    }),
  )
  async update(@Param('id') id: string, @Body() updateTopicDto: UpdateTopicDto, @Req() req: any) {
    const userId = req?.user?.userId || "";
    try {
      const result = await this.topicService.update(id, updateTopicDto);
      await this.systemLogService.createLogFromSystem({
        action: 'PATCH',
        details: `Chủ đề: Cập nhật chủ đề ID ${id}`,
        method: 'PATCH',
        status: 'SUCCESS',
        type: 'TOPIC',
        subType: 'TOPIC_UPDATE',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'PATCH',
        details: `Lỗi: Chủ đề: Cập nhật chủ đề ID ${id} - ${error.message}`,
        method: 'PATCH',
        status: 'ERROR',
        type: 'TOPIC',
        subType: 'TOPIC_UPDATE',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xóa chủ đề',
    description: 'Xóa một chủ đề theo ID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID của chủ đề cần xóa',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy chủ đề',
  })
  @ModulesKey('dschude')
  @UseGuards(FeatureGuard)
  async remove(@Param('id') id: string, @Req() req: any) {
    const userId = req?.user?.userId || "";
    try {
      const result = await this.topicService.remove(id);
      await this.systemLogService.createLogFromSystem({
        action: 'DELETE',
        details: `Chủ đề: Xóa chủ đề ID ${id}`,
        method: 'DELETE',
        status: 'SUCCESS',
        type: 'TOPIC',
        subType: 'TOPIC_DELETE',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'DELETE',
        details: `Lỗi: Chủ đề: Xóa chủ đề ID ${id} - ${error.message}`,
        method: 'DELETE',
        status: 'ERROR',
        type: 'TOPIC',
        subType: 'TOPIC_DELETE',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  @Delete()
  @ApiOperation({
    summary: 'Xóa nhiều chủ đề',
    description: 'Xóa nhiều chủ đề cùng một lúc',
  })
  @ApiBody({
    type: DeleteManyDto,
    description: 'Danh sách ID cần xóa',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  @ModulesKey('dschude')
  @UseGuards(FeatureGuard)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      skipMissingProperties: false,
      whitelist: true,
      exceptionFactory: (errors) => {
        const formattedErrors = errors.map(err => {
          let message: string | unknown[] = [];
          if (err.constraints) {
            const val = Object.values(err.constraints)[0];
            try { message = JSON.parse(val); } catch { message = val; }
          }
          return { field: err.property, message };
        });

        return new BadRequestException({
          success: false,
          message: 'Dữ liệu không hợp lệ',
          errors: formattedErrors,
        });
      },
    }),
  )
  async deleteMany(@Body() dto: DeleteManyDto, @Req() req: any) {
    const userId = req?.user?.userId || "";
    try {
      const result = await this.topicService.removeMany(dto.ids);
      await this.systemLogService.createLogFromSystem({
        action: 'DELETE',
        details: `Chủ đề: Xóa nhiều chủ đề`,
        method: 'DELETE',
        status: 'SUCCESS',
        type: 'TOPIC',
        subType: 'TOPIC_DELETE_MANY',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'DELETE',
        details: `Lỗi: Chủ đề: Xóa nhiều chủ đề - ${error.message}`,
        method: 'DELETE',
        status: 'ERROR',
        type: 'TOPIC',
        subType: 'TOPIC_DELETE_MANY',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }
}
