// src/news/news.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  ParseArrayPipe,
  Req,
  ConflictException,
  Inject,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { BpmnRoleGuard } from 'src/oauth/bpmn-role.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsService } from './news.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { CreateNewsCommentDto } from './dto/create-news-comment.dto';
import { UpdateNewsCommentDto } from './dto/update-news-comment.dto';
import { LikeNewsDto } from './dto/like-news.dto';
import { QueryMyNewsListDto } from './dto/query-my-news-list.dto';
import { NewsWorkflowService } from './news-workflow.service';
import { Public } from 'src/oauth/decorator/public.decorator';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { SQLSVRepository } from 'src/database/sqlsvRepo';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { MSSQL_REPO } from 'src/database/database.provider';
import { TopicEntity } from 'src/topic/entities/topic.entity';
import { GroupUserEntity } from 'src/group-users/entities/group-users.entity';
import { Roles } from 'src/oauth/decorator/roles.decorator';
import { ProcessKey } from 'src/oauth/decorator/process-key.decorator';
import { News } from './entities/news.entity';

@ApiTags('Quản lý Tin tức')
@Controller('news')
export class NewsController {
  constructor(
    @Inject(MSSQL_REPO) private readonly sqlRepo: MSSQLRepository,
    private readonly newsService: NewsService,
    private readonly newsWorkflowService: NewsWorkflowService,
    private readonly systemLogService: SystemLogServiceSql,
    private readonly sqlsvRepo: SQLSVRepository,
    @InjectRepository(TopicEntity, 'mssqlConnection')
    private readonly topicRepository: Repository<TopicEntity>,
    @InjectRepository(GroupUserEntity, 'mssqlConnection')
    private readonly groupUserRepository: Repository<GroupUserEntity>,
  ) { }

  // ========== COMMENT & LIKE APIs ==========

  // Thêm comment cho bài viết
  @ApiOperation({
    summary: 'Thêm bình luận cho bài viết',
    description: 'Thêm bình luận mới cho bài viết. Yêu cầu xác thực. WebSocket sẽ broadcast comment realtime đến tất cả clients trong room.'
  })
  @ApiParam({
    name: 'id',
    description: 'ID của bài viết cần bình luận',
    type: Number,
    example: 123
  })
  @ApiBody({
    description: 'Nội dung bình luận',
    type: CreateNewsCommentDto,
    schema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Nội dung bình luận',
          example: 'Đây là một bài viết rất hay!'
        },
        parentId: {
          type: 'number',
          description: 'ID bình luận cha (nếu là reply)',
          // required: false,
          example: 456
        }
      },
      required: ['content']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Thêm bình luận thành công',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 789 },
        newsId: { type: 'number', example: 123 },
        userId: { type: 'string', example: 'user_001' },
        content: { type: 'string', example: 'Đây là một bài viết rất hay!' },
        parentId: { type: 'number', nullable: true, example: null },
        createdAt: { type: 'string', example: '2026-01-14T07:00:00.000Z' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài viết' })
  @Post(':id/comment')
  async addComment(
    @Param('id', ParseIntPipe) newsId: number,
    @Body() dto: CreateNewsCommentDto,
    @Req() req: any
  ) {
    const user = req?.user;
    const ipAddress = req?.socket?.remoteAddress || 'Unknown';
    return await this.newsService.addComment(newsId, dto, user, ipAddress);
  }

  // Cập nhật comment
  @ApiOperation({
    summary: 'Cập nhật bình luận',
    description: 'Cập nhật nội dung bình luận. Chỉ người tạo bình luận mới có quyền sửa. WebSocket sẽ broadcast comment đã cập nhật.'
  })
  @ApiParam({
    name: 'commentId',
    description: 'ID của bình luận cần cập nhật',
    type: Number,
    example: 789
  })
  @ApiResponse({ status: 200, description: 'Cập nhật bình luận thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ hoặc không có quyền' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bình luận' })
  @Patch('comment/:commentId')
  async updateComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() dto: UpdateNewsCommentDto,
    @Req() req: any
  ) {
    const user = req?.user;
    const ipAddress = req?.socket?.remoteAddress || 'Unknown';
    return await this.newsService.updateComment(commentId, dto, user, ipAddress);
  }

  // Xóa comment
  @ApiOperation({
    summary: 'Xóa bình luận',
    description: 'Xóa bình luận và các phản hồi. Chỉ người tạo bình luận mới có quyền xóa.'
  })
  @ApiParam({
    name: 'commentId',
    description: 'ID của bình luận cần xóa',
    type: Number,
    example: 789
  })
  @ApiResponse({ status: 200, description: 'Xóa bình luận thành công' })
  @ApiResponse({ status: 400, description: 'Không có quyền xóa hoặc lỗi khác' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bình luận' })
  @Delete('comment/:commentId')
  async deleteComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Req() req: any
  ) {
    const user = req?.user;
    const ipAddress = req?.socket?.remoteAddress || 'Unknown';
    return await this.newsService.deleteComment(commentId, user, ipAddress);
  }

  // Lấy danh sách comment theo bài viết
  @ApiOperation({
    summary: 'Lấy danh sách bình luận',
    description: 'Lấy tất cả bình luận của bài viết. Yêu cầu xác thực.'
  })
  @ApiParam({
    name: 'id',
    description: 'ID của bài viết',
    type: Number,
    example: 123
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách bình luận thành công',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          newsId: { type: 'number' },
          userId: { type: 'string' },
          userName: { type: 'string' },
          content: { type: 'string' },
          parentId: { type: 'number', nullable: true },
          likeCount: { type: 'number' },
          createdAt: { type: 'string' },
          updatedAt: { type: 'string' }
        }
      }
    }
  })
  // @Public()
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiQuery({ name: 'type', required: false, description: 'Lọc theo loại bình luận (vd: comment, rating, ...)' })
  @Get(':id/comments')
  async getComments(@Param('id', ParseIntPipe) newsId: number, @Req() req: any, @Query() query: any) {
    const userId = req?.user?.userId || req?.user?.user || req?.user?.sub || req?.user?.id;
    try {
      const result = await this.newsService.getComments(newsId, userId, query);
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Tin tức: Truy cập danh sách bình luận bài viết ID ${newsId}`,
          method: 'GET',
          status: 'SUCCESS',
          type: 'NEWS',
          subType: 'NEWS_COMMENT_LIST',
          userInfo: userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      return result;
    } catch (error) {
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi: Tin tức: Truy cập danh sách bình luận bài viết ID ${newsId} - ${error.message}`,
          method: 'GET',
          status: 'ERROR',
          type: 'NEWS',
          subType: 'NEWS_COMMENT_LIST',
          userInfo: userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  }

  // Like bài viết hoặc comment
  @ApiOperation({
    summary: 'Like/Unlike bài viết hoặc bình luận',
    description: 'Toggle like cho bài viết hoặc bình luận. Yêu cầu xác thực. WebSocket sẽ broadcast thay đổi realtime.'
  })
  @ApiBody({
    description: 'Thông tin like',
    type: LikeNewsDto,
    schema: {
      type: 'object',
      properties: {
        newsId: {
          type: 'number',
          description: 'ID của bài viết',
          example: 123
        },
        commentId: {
          type: 'number',
          description: 'ID của bình luận (optional, nếu like comment)',
          // required: false,
          example: 789
        },
        action: {
          type: 'string',
          enum: ['like', 'unlike'],
          description: 'Hành động: like hoặc unlike',
          example: 'like'
        }
      },
      required: ['newsId', 'action']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Like/Unlike thành công',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'number', example: 1 },
        message: { type: 'string', example: 'Đã thích bài viết' },
        likeCount: { type: 'number', example: 42 }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài viết/bình luận' })
  @Post('like')
  async likeNewsOrComment(@Body() dto: LikeNewsDto, @Req() req: any) {
    const ipAddress = req?.socket?.remoteAddress || 'Unknown';
    return await this.newsService.likeNewsOrComment(dto, req.user, ipAddress);
  }

  // Lấy tổng số like của bài viết
  @ApiOperation({
    summary: 'Lấy số lượng like của bài viết',
    description: 'Lấy tổng số like và danh sách người đã like. Yêu cầu xác thực.'
  })
  @ApiParam({
    name: 'id',
    description: 'ID của bài viết',
    type: Number,
    example: 123
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin like thành công',
    schema: {
      type: 'object',
      properties: {
        newsId: { type: 'number', example: 123 },
        likeCount: { type: 'number', example: 42 },
        likes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              userName: { type: 'string' },
              createdAt: { type: 'string' }
            }
          }
        },
        dislikes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              userName: { type: 'string' },
              createdAt: { type: 'string' }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài viết' })
  @Get(':id/likes')
  async getNewsLikes(@Param('id', ParseIntPipe) newsId: number, @Req() req: any) {
    const userId = req?.user?.userId || req?.user?.user || req?.user?.sub || req?.user?.id;
    try {
      const result = await this.newsService.getNewsLikes(newsId, userId);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Tin tức: Xem danh sách lượt thích bài viết ID ${newsId}`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'NEWS_LIKE_LIST',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Lỗi: Tin tức: Xem danh sách lượt thích bài viết ID ${newsId} - ${error.message}`,
        method: 'GET',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'NEWS_LIKE_LIST',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  // Lấy danh sách người đã xem bài viết
  @ApiOperation({
    summary: 'Lấy danh sách người xem bài viết',
    description: 'Lấy danh sách tất cả những người dùng đã xem bài viết này. Yêu cầu xác thực.'
  })
  @ApiParam({
    name: 'id',
    description: 'ID của bài viết',
    type: Number,
    example: 123
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách người xem thành công',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        total: { type: 'number', example: 15 },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              userName: { type: 'string' },
              username: { type: 'string' },
              viewedAt: { type: 'string' }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài viết' })
  @Get(':id/viewers')
  async getNewsViewers(@Param('id', ParseIntPipe) newsId: number, @Req() req: any) {
    const userId = req?.user?.userId || req?.user?.user || req?.user?.sub || req?.user?.id;
    try {
      const result = await this.newsService.getNewsViewers(newsId);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Tin tức: Xem danh sách người xem bài viết ID ${newsId}`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'NEWS_VIEWER_LIST',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Lỗi: Tin tức: Xem danh sách người xem bài viết ID ${newsId} - ${error.message}`,
        method: 'GET',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'NEWS_VIEWER_LIST',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  // Kiểm tra quyền xuất bản của user
  @Get('check-publish-permission')
  @UseGuards(BpmnRoleGuard)
  @Roles('canView')
  @ProcessKey('quan_ly_tin_tuc')
  @ApiOperation({ summary: 'Kiểm tra quyền xuất bản của user theo processKey' })
  @ApiResponse({
    status: 200,
    description: 'Thông tin quyền xuất bản',
    schema: {
      type: 'object',
      properties: {
        canPublishDirectly: { type: 'boolean', description: 'User có thể xuất bản trực tiếp' },
        requiresApproval: { type: 'boolean', description: 'User phải đi luồng trình duyệt' },
        userRole: { type: 'string', description: 'Role của user trong workflow', nullable: true },
        processKey: { type: 'string', description: 'Process key được sử dụng' }
      }
    }
  })
  async checkPublishPermission(
    @Query('processFn') processFn: string = 'quan_ly_tin_tuc',
    @Req() req: any
  ) {
    const userId = req?.user?.userId;
    if (!userId) {
      throw new BadRequestException('Không tìm thấy thông tin người dùng');
    }

    try {
      const result = await this.newsWorkflowService.checkPublishPermission(processFn, userId);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Tin tức: Kiểm tra quyền xuất bản cho quy trình ${processFn}`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'NEWS_CHECK_PERMISSION',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Lỗi: Tin tức: Kiểm tra quyền xuất bản cho quy trình ${processFn} - ${error.message}`,
        method: 'GET',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'NEWS_CHECK_PERMISSION',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  @Get('user-role')
  @ApiOperation({ summary: 'Lấy vai trò của tài khoản trong luồng tin tức (Người soạn tin hay Người phê duyệt)' })
  @ApiQuery({ name: 'userId', required: false, description: 'ID người dùng (mặc định lấy user đang đăng nhập)' })
  @ApiQuery({ name: 'processFn', required: false, description: 'Mã chức năng quy trình (mặc định: quan_ly_tin_tuc)' })
  @ApiResponse({
    status: 200,
    description: 'Thông tin vai trò người dùng trong luồng tin tức',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Lấy vai trò tài khoản trong luồng tin tức thành công' },
        data: {
          type: 'object',
          properties: {
            userId: { type: 'string', example: 'user-id-123' },
            role: { type: 'string', example: 'NGUOI_PHE_DUYET' },
            roleName: { type: 'string', example: 'Người phê duyệt tin' },
            isAuthor: { type: 'boolean', example: false },
            isApprover: { type: 'boolean', example: true },
            userRoles: { type: 'array', items: { type: 'string' } },
            processKey: { type: 'string', example: 'quan_ly_tin_tuc' },
            processFn: { type: 'string', example: 'quan_ly_tin_tuc' }
          }
        }
      }
    }
  })
  async getNewsUserRole(
    @Query('userId') userId: string,
    @Query('processFn') processFn: string = 'quan_ly_tin_tuc',
    @Req() req: any
  ) {
    const finalUserId = userId || req?.user?.userId || req?.user?.id || req?.user?.username;
    if (!finalUserId) {
      throw new BadRequestException('Không tìm thấy thông tin người dùng');
    }

    return await this.newsWorkflowService.getNewsUserRole(finalUserId, processFn);
  }

  @Get('workflow/user-role')
  // @UseGuards(BpmnRoleGuard)
  // @Roles('canView')
  // @ProcessKey('quan_ly_tin_tuc')
  @ApiOperation({ summary: 'Lấy danh sách vai trò của user trong luồng xử lý' })
  @ApiQuery({ name: 'userId', required: false, description: 'ID người dùng (mặc định lấy user đang đăng nhập)' })
  @ApiQuery({ name: 'processFn', required: false, description: 'Mã chức năng quy trình (mặc định quan_ly_tin_tuc)' })
  async getUserRolesInWorkflow(
    @Query('userId') userId: string,
    @Query('processFn') processFn: string = 'quan_ly_tin_tuc',
    @Req() req: any
  ) {
    const finalUserId = userId || req?.user?.userId;
    if (!finalUserId) {
      throw new BadRequestException('Không tìm thấy thông tin người dùng');
    }

    try {
      const result = await this.newsWorkflowService.getUserRolesInWorkflow(finalUserId, processFn);
      // Log hệ thống
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Tin tức: Truy vấn danh sách vai trò trong luồng ${processFn} cho user ${finalUserId}`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'NEWS_GET_USER_ROLE',
        userInfo: req?.user?.userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Admin: Tạo tin mới
  // @Post()
  // async create(@Body() dto: CreateNewsDto, @Req() req: any) {
  //   const userId = req?.user;
  //   return this.newsService.create(dto, userId);
  // }
  @Post()
  @UseGuards(BpmnRoleGuard)
  @Roles('canCreate')
  @ProcessKey('quan_ly_tin_tuc')
  async create(@Body() dto: CreateNewsDto, @Req() req: any) {
    const userId = req?.user?.userId;
    try {
      const user: any = await this.sqlsvRepo.getUserById(userId);
      if (!user?.parent?.id) {
        throw new BadRequestException('Người dùng không có parent');
      }

      const flowConfig = await this.sqlsvRepo.getFlowByUnit(
        String(user.parent.id), 'News'
      );
      if (!flowConfig) {
        throw new BadRequestException('Không tìm thấy luồng cho người dùng');
      }

      const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig?.id);
      const documentId = String(Date.now());
      const authorName = user?.name || 'Unknown';
      // Đặt authorId và authorName SAU ...dto để không bị override
      const data = { documentId, bpmnVersion: flowConfig?.id, ...dto, authorId: userId, authorName };

      // Kiểm tra topic có yêu cầu duyệt không
      let requiresApproval = true; // Mặc định = true

      if (data.topic) {
        try {
          const topic = await this.topicRepository.findOne({
            where: { id: data.topic }
          });
          if (topic) {
            requiresApproval = topic.requiresApproval ?? true;
          }
        } catch (error) {
          console.warn(`Không tìm thấy topic ${data.topic}, mặc định yêu cầu duyệt`);
        }
      }
      // Kiểm tra trùng tiêu đề
      if (data.title) {
        const titleExists = await this.newsService.checkTitleExists(data.title);
        if (titleExists) {
          throw new BadRequestException('Tên bài viết đã tồn tại trong hệ thống');
        }
      }

      // Validate độ dài chuỗi giống trong news.service.ts
      this.newsService.validateNewsStringLengths(data as Partial<News>);

      // LUÔN tạo workitem đầu tiên (không auto-approve)
      const doc = await this.newsWorkflowService.createNewsAtNode({
        bpmnXML,
        data,
        assigneeUserId: userId,
      });

      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Tin tức: Thêm mới tin tức`,
        method: 'POST',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'NEWS',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      return {
        status: 1,
        document: doc,
        message: 'Tin tức được tạo thành công'
      };
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Lỗi: Tin tức: Thêm mới tin tức - ${error.message}`,
        method: 'POST',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'NEWS',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  // Public: Lấy danh sách tin (phân trang + tìm kiếm)
  @Get()
  async findAll(
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 10,
    @Query('filter') filter?: object,
    @Req() req?: any,
  ) {
    const userId = req?.user?.userId || "";
    try {
      const result = await this.newsService.findAll({ page, limit, filter });
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập lấy danh sách tin tức trang: ${page}, limit: ${limit}`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'NEWS',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Lỗi: Truy cập lấy danh sách tin tức trang: ${page}, limit: ${limit} - ${error.message}`,
        method: 'GET',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'NEWS',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  // Public: Lấy chi tiết theo slug (SEO friendly)
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string, @Req() req: any) {
    const userId = req?.user?.userId || "";
    try {
      const result = await this.newsService.findBySlug(slug);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Tin tức: Xem chi tiết tin tức qua slug: ${slug}`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'NEWS_DETAIL_SLUG',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Lỗi: Tin tức: Xem chi tiết tin tức qua slug: ${slug} - ${error.message}`,
        method: 'GET',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'NEWS_DETAIL_SLUG',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  // Admin: Lấy chi tiết theo ID
  @Get(':id')
  @UseGuards(BpmnRoleGuard)
  @Roles('canView', 'canUpdate', 'canApprove')
  @ProcessKey('quan_ly_tin_tuc')
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req?.user?.userId || "";
    try {
      const result = await this.newsService.findOne(id, false, userId, false);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Tin tức: Xem chi tiết tin tức ID ${id}`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'NEWS_DETAIL',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Lỗi: Tin tức: Xem chi tiết tin tức ID ${id} - ${error.message}`,
        method: 'GET',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'NEWS_DETAIL',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }
  @Get('/detail/:id/cancelled')
  @UseGuards(BpmnRoleGuard)
  @Roles('canView')
  @ProcessKey('quan_ly_tin_tuc')
  async findOneCancelled(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req?.user?.userId || "";
    try {
      const result = await this.newsService.findOneCancel(id, false, userId);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Tin tức: Xem chi tiết tin tức đã hủy ID ${id}`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'NEWS_DETAIL_CANCELLED',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Lỗi: Tin tức: Xem chi tiết tin tức đã hủy ID ${id} - ${error.message}`,
        method: 'GET',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'NEWS_DETAIL_CANCELLED',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  // Admin: Cập nhật
  @Patch(':id')
  @UseGuards(BpmnRoleGuard)
  @Roles('canUpdate')
  @ProcessKey('quan_ly_tin_tuc')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateNewsDto, @Req() req: any) {
    const userId = req?.user?.userId || "";
    const ipAddress = req?.socket?.remoteAddress || 'Unknown';
    return await this.newsService.update(id, dto, ipAddress, userId);
  }

  @Delete('bulk')
  @UseGuards(BpmnRoleGuard)
  @Roles('canDelete')
  @ProcessKey('quan_ly_tin_tuc')
  async removeMany(@Body('ids', new ParseArrayPipe({ items: Number, separator: ',' })) ids: number[], @Req() req: any) {
    const userId = req?.user?.userId || "";
    const ipAddress = req?.socket?.remoteAddress || 'Unknown';
    return await this.newsService.removeMany(ids, ipAddress, userId);
  }

  // Admin: Xóa
  @Delete(':id')
  @UseGuards(BpmnRoleGuard)
  @Roles('canDelete')
  @ProcessKey('quan_ly_tin_tuc')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req?.user?.userId || "";
    const ipAddress = req?.socket?.remoteAddress || 'Unknown';
    return await this.newsService.remove(id, ipAddress, userId);
  }

  // ========== WORKFLOW ACTIONS ==========

  // Trình duyệt tin tức (nhiều tin cùng lúc)
  @ApiOperation({ summary: 'Trình duyệt tin tức', description: 'Trình duyệt một hoặc nhiều tin tức để chuyển vào workflow' })
  @ApiParam({ name: 'workItemId', description: 'ID của work item', type: String })
  @ApiBody({
    description: 'Thông tin trình duyệt',
    schema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'number' },
          description: 'Danh sách ID tin tức cần trình duyệt'
        },
        roleCode: { type: 'string', description: 'Mã vai trò' },
        processKey: { type: 'string', description: 'Khóa quy trình' },
        note: { type: 'string', description: 'Ghi chú' }
      },
      required: ['ids', 'roleCode', 'processKey']
    }
  })
  @ApiResponse({ status: 200, description: 'Trình duyệt thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @Post('submit/:workItemId')
  @UseGuards(BpmnRoleGuard)
  @Roles('canUpdate')
  @ProcessKey('quan_ly_tin_tuc')
  async submitNews(
    @Param('workItemId') workItemId: string,
    @Body() dto: { ids: number[]; roleCode: string; processKey: string; note?: string },
    @Req() req: any
  ) {
    const userId = req?.user?.userId;
    const user: any = await this.sqlsvRepo.getUserById(userId);
    const userName = user?.name || 'Unknown';

    if (!user?.parent?.id) {
      throw new BadRequestException('Người dùng không có parent');
    }

    const flowConfig = await this.sqlsvRepo.getFlowByUnit(
      String(user.parent.id), 'News'
    );

    if (!flowConfig) {
      throw new BadRequestException('Không tìm thấy luồng cho người dùng');
    }

    const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig?.id);

    if (!dto.ids || dto.ids.length === 0) {
      throw new BadRequestException('Vui lòng cung cấp danh sách tin tức cần trình duyệt');
    }

    // Xử lý từng tin tức
    const results: Array<{ id: number; status: string; document: any }> = [];
    const errors: Array<{ id: number; status: string; message: string }> = [];

    for (const newsId of dto.ids) {
      try {
        const result = await this.newsWorkflowService.submitNews(
          String(newsId),
          dto,
          userId,
          userName,
          bpmnXML,
          workItemId
        );

        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Tin tức: Trình duyệt tin tức ID ${newsId}`,
          method: 'POST',
          status: 'SUCCESS',
          type: 'NEWS',
          subType: 'SUBMIT',
          userInfo: userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });

        results.push({ id: newsId, status: 'success', document: result });
      } catch (error) {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Lỗi: Tin tức: Trình duyệt tin tức ID ${newsId} - ${error.message}`,
          method: 'POST',
          status: 'ERROR',
          type: 'NEWS',
          subType: 'SUBMIT',
          userInfo: userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });

        errors.push({
          id: newsId,
          status: 'error',
          message: error.message || 'Lỗi không xác định'
        });
      }
    }

    return {
      status: 1,
      total: dto.ids.length,
      success: results.length,
      failed: errors.length,
      results,
      errors
    };
  }

  // Phê duyệt tin tức
  @ApiOperation({ summary: 'Phê duyệt tin tức', description: 'Phê duyệt tin tức và chuyển đến bước tiếp theo trong workflow' })
  @ApiParam({ name: 'id', description: 'ID của tin tức cần phê duyệt', type: Number })
  @ApiBody({
    description: 'Thông tin phê duyệt',
    schema: {
      type: 'object',
      properties: {
        roleCode: { type: 'string', description: 'Mã vai trò tiếp theo' },
        processKey: { type: 'string', description: 'Khóa quy trình' },
        note: { type: 'string', description: 'Ghi chú khi phê duyệt' },
        publishImmediately: { type: 'boolean', description: 'Xuất bản ngay lập tức' },
        workItemId: { type: 'string', description: 'ID của work item' }
      },
      required: ['workItemId', 'roleCode', 'processKey']
    }
  })
  @ApiResponse({ status: 200, description: 'Phê duyệt thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @Post(':id/approve')
  @UseGuards(BpmnRoleGuard)
  @Roles('canApprove')
  @ProcessKey('quan_ly_tin_tuc')
  async approveNews(
    @Param('id', ParseIntPipe) newsId: number,
    @Body() dto: {
      roleCode: string;
      processKey: string;
      note?: string;
      // publishImmediately?: boolean; 
      workItemId: string
    },
    @Req() req: any
  ) {
    const userId = req?.user?.userId;
    try {
      const user: any = await this.sqlsvRepo.getUserById(userId);
      const userName = user?.name || 'Unknown';

      // Lấy flowConfig và bpmnXML
      if (!user?.parent?.id) {
        throw new BadRequestException('Người dùng không có parent');
      }
      const flowConfig = await this.sqlsvRepo.getFlowByUnit(
        String(user.parent.id), 'News'
      );
      if (!flowConfig) {
        throw new BadRequestException('Không tìm thấy luồng cho người dùng');
      }
      const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig?.id);

      const result = await this.newsWorkflowService.approveNews(
        newsId,
        dto,
        userId,
        userName,
        bpmnXML,
        dto.workItemId
      );

      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Tin tức: Phê duyệt tin tức ID ${newsId}`,
        method: 'POST',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'APPROVE',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      return { status: 1, document: result };
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Lỗi: Tin tức: Phê duyệt tin tức ID ${newsId} - ${error.message}`,
        method: 'POST',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'APPROVE',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  @ApiOperation({ summary: 'Xuất bản trực tiếp (Topic không cần duyệt)', description: 'Xuất bản tin khi topic không yêu cầu duyệt (chỉ dành cho NGUOI_TAO_TIN)' })
  @ApiBody({
    description: 'Thông tin xuất bản',
    schema: {
      type: 'object',
      properties: {
        workItemId: { type: 'string', description: 'ID work item' }
      },
      required: ['workItemId']
    }
  })
  @ApiResponse({ status: 200, description: 'Xuất bản thành công' })
  @Post(':id/publish-directly')
  @UseGuards(BpmnRoleGuard)
  @Roles('canPublishDirectly')
  @ProcessKey('quan_ly_tin_tuc')
  async publishDirectly(
    @Param('id', ParseIntPipe) newsId: number,
    @Body() dto: { workItemId: string },
    @Req() req: any
  ) {
    const userId = req?.user?.userId;
    try {
      const user: any = await this.sqlsvRepo.getUserById(userId);
      const userName = user?.name || 'Unknown';

      if (!user?.parent?.id) {
        throw new BadRequestException('Người dùng không có parent');
      }
      const flowConfig = await this.sqlsvRepo.getFlowByUnit(
        String(user.parent.id), 'News'
      );
      if (!flowConfig) {
        throw new BadRequestException('Không tìm thấy luồng cho người dùng');
      }
      const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig?.id);

      const result = await this.newsWorkflowService.publishNewsDirectly(
        newsId,
        userId,
        userName,
        bpmnXML,
        dto.workItemId
      );

      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Tin tức: Xuất bản trực tiếp tin tức ID ${newsId}`,
        method: 'POST',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'PUBLISH_DIRECTLY',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      return { status: 1, document: result };
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Lỗi: Tin tức: Xuất bản trực tiếp tin tức ID ${newsId} - ${error.message}`,
        method: 'POST',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'PUBLISH_DIRECTLY',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Phê duyệt nhiều tin tức cùng lúc
   */
  @ApiOperation({ summary: 'Phê duyệt nhiều tin tức', description: 'Phê duyệt nhiều tin tức cùng một lúc' })
  @ApiBody({
    description: 'Thông tin phê duyệt nhiều tin',
    schema: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'number' }, description: 'Danh sách ID tin tức cần phê duyệt' },
        workItemIds: { type: 'array', items: { type: 'string' }, description: 'Danh sách ID work item tương ứng' },
        roleCode: { type: 'string', description: 'Mã vai trò tiếp theo' },
        processKey: { type: 'string', description: 'Khóa quy trình' },
        note: { type: 'string', description: 'Ghi chú khi phê duyệt' },
        publishImmediately: { type: 'boolean', description: 'Xuất bản ngay lập tức' }
      },
      required: ['ids', 'workItemIds', 'roleCode', 'processKey']
    }
  })
  @ApiResponse({ status: 200, description: 'Phê duyệt thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @Post('approve/bulk')
  @UseGuards(BpmnRoleGuard)
  @Roles('canApprove')
  @ProcessKey('quan_ly_tin_tuc')
  async approveNewsMultiple(
    @Body() dto: {
      ids: number[];
      workItemIds: string[];
      roleCode: string;
      processKey: string;
      note?: string;
      publishImmediately?: boolean;
    },
    @Req() req: any
  ) {
    const userId = req?.user?.userId;
    try {
      const user: any = await this.sqlsvRepo.getUserById(userId);
      const userName = user?.name || 'Unknown';

      if (!user?.parent?.id) {
        throw new BadRequestException('Người dùng không có parent');
      }

      if (!dto.ids || dto.ids.length === 0) {
        throw new BadRequestException('Vui lòng cung cấp danh sách tin tức');
      }

      if (!dto.workItemIds || dto.workItemIds.length === 0) {
        throw new BadRequestException('Vui lòng cung cấp danh sách work item');
      }

      if (dto.ids.length !== dto.workItemIds.length) {
        throw new BadRequestException('Số lượng ids và workItemIds phải bằng nhau');
      }

      const flowConfig = await this.sqlsvRepo.getFlowByUnit(
        String(user.parent.id), 'News'
      );

      if (!flowConfig) {
        throw new BadRequestException('Không tìm thấy luồng cho người dùng');
      }

      const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig?.id);

      const result = await this.newsWorkflowService.approveNewsMultiple(
        dto.ids,
        {
          roleCode: dto.roleCode,
          processKey: dto.processKey,
          note: dto.note,
          publishImmediately: dto.publishImmediately,
        },
        userId,
        userName,
        bpmnXML,
        dto.workItemIds
      );

      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Tin tức: Phê duyệt nhiều tin tức, danh sách ID: ${dto.ids.join(', ')}`,
        method: 'POST',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'APPROVE_BULK',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      return { status: 1, ...result };
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Lỗi: Tin tức: Phê duyệt nhiều tin tức - ${error.message}`,
        method: 'POST',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'APPROVE_BULK',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  // Từ chối tin tức
  @ApiOperation({ summary: 'Từ chối tin tức', description: 'Từ chối tin tức và trả lại cho tác giả' })
  @ApiParam({ name: 'id', description: 'ID của tin tức cần từ chối', type: Number })
  @ApiBody({
    description: 'Thông tin từ chối',
    schema: {
      type: 'object',
      properties: {
        roleCode: { type: 'string', description: 'Mã vai trò tiếp theo' },
        processKey: { type: 'string', description: 'Khóa quy trình' },
        reason: { type: 'string', description: 'Lý do từ chối' },
        note: { type: 'string', description: 'Ghi chú thêm' },
        workItemId: { type: 'string', description: 'ID của work item' }
      },
      required: ['reason', 'workItemId', 'roleCode', 'processKey']
    }
  })
  @ApiResponse({ status: 200, description: 'Từ chối thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @Post(':id/reject')
  @UseGuards(BpmnRoleGuard)
  @Roles('canReject')
  @ProcessKey('quan_ly_tin_tuc')
  async rejectNews(
    @Param('id', ParseIntPipe) newsId: number,
    @Body() dto: { roleCode: string; processKey: string; reason: string; note?: string; workItemId: string },
    @Req() req: any
  ) {
    const userId = req?.user?.userId;
    try {
      const user: any = await this.sqlsvRepo.getUserById(userId);
      const userName = user?.name || 'Unknown';

      // Lấy flowConfig và bpmnXML
      if (!user?.parent?.id) {
        throw new BadRequestException('Người dùng không có parent');
      }
      const flowConfig = await this.sqlsvRepo.getFlowByUnit(
        String(user.parent.id), 'News'
      );
      if (!flowConfig) {
        throw new BadRequestException('Không tìm thấy luồng cho người dùng');
      }
      const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig?.id);

      const result = await this.newsWorkflowService.rejectNews(
        newsId,
        dto,
        userId,
        userName,
        bpmnXML,
        dto.workItemId
      );

      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Tin tức: Từ chối tin tức ID ${newsId}`,
        method: 'POST',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'REJECT',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      return { status: 1, document: result };
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Lỗi: Tin tức: Từ chối tin tức ID ${newsId} - ${error.message}`,
        method: 'POST',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'REJECT',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Từ chối nhiều tin tức cùng lúc
   */
  @ApiOperation({ summary: 'Từ chối nhiều tin tức', description: 'Từ chối nhiều tin tức cùng một lúc' })
  @ApiBody({
    description: 'Thông tin từ chối nhiều tin',
    schema: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'number' }, description: 'Danh sách ID tin tức cần từ chối' },
        workItemIds: { type: 'array', items: { type: 'string' }, description: 'Danh sách ID work item tương ứng' },
        roleCode: { type: 'string', description: 'Mã vai trò tiếp theo' },
        processKey: { type: 'string', description: 'Khóa quy trình' },
        reason: { type: 'string', description: 'Lý do từ chối' },
        note: { type: 'string', description: 'Ghi chú thêm' }
      },
      required: ['ids', 'workItemIds', 'roleCode', 'processKey', 'reason']
    }
  })
  @ApiResponse({ status: 200, description: 'Từ chối thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @Post('reject/bulk')
  @UseGuards(BpmnRoleGuard)
  @Roles('canReject')
  @ProcessKey('quan_ly_tin_tuc')
  async rejectNewsMultiple(
    @Body() dto: {
      ids: number[];
      workItemIds: string[];
      roleCode: string;
      processKey: string;
      reason: string;
      note?: string;
    },
    @Req() req: any
  ) {
    const userId = req?.user?.userId;
    try {
      const user: any = await this.sqlsvRepo.getUserById(userId);
      const userName = user?.name || 'Unknown';

      if (!user?.parent?.id) {
        throw new BadRequestException('Người dùng không có parent');
      }

      if (!dto.ids || dto.ids.length === 0) {
        throw new BadRequestException('Vui lòng cung cấp danh sách tin tức');
      }

      if (!dto.workItemIds || dto.workItemIds.length === 0) {
        throw new BadRequestException('Vui lòng cung cấp danh sách work item');
      }

      if (dto.ids.length !== dto.workItemIds.length) {
        throw new BadRequestException('Số lượng ids và workItemIds phải bằng nhau');
      }

      const flowConfig = await this.sqlsvRepo.getFlowByUnit(
        String(user.parent.id), 'News'
      );

      if (!flowConfig) {
        throw new BadRequestException('Không tìm thấy luồng cho người dùng');
      }

      const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig?.id);

      const result = await this.newsWorkflowService.rejectNewsMultiple(
        dto.ids,
        {
          roleCode: dto.roleCode,
          processKey: dto.processKey,
          reason: dto.reason,
          note: dto.note,
        },
        userId,
        userName,
        bpmnXML,
        dto.workItemIds
      );

      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Tin tức: Từ chối nhiều tin tức, danh sách ID: ${dto.ids.join(', ')}`,
        method: 'POST',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'REJECT_BULK',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      return { status: 1, ...result };
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Lỗi: Tin tức: Từ chối nhiều tin tức - ${error.message}`,
        method: 'POST',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'REJECT_BULK',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  // Hủy tin tức
  @ApiOperation({ summary: 'Hủy tin tức', description: 'Hủy tin tức và đóng tất cả work item liên quan' })
  @ApiParam({ name: 'id', description: 'ID của tin tức cần hủy', type: Number })
  @ApiBody({
    description: 'Thông tin hủy',
    schema: {
      type: 'object',
      properties: {
        roleCode: { type: 'string', description: 'Mã vai trò tiếp theo (optional)' },
        processKey: { type: 'string', description: 'Khóa quy trình (optional)' },
        reason: { type: 'string', description: 'Lý do hủy' },
        note: { type: 'string', description: 'Ghi chú thêm' },
        workItemId: { type: 'string', description: 'ID của work item' }
      },
      required: ['reason', 'workItemId']
    }
  })
  @ApiResponse({ status: 200, description: 'Hủy thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @Post(':id/cancel')
  @UseGuards(BpmnRoleGuard)
  @Roles('canCancel')
  @ProcessKey('quan_ly_tin_tuc')
  async cancelNews(
    @Param('id', ParseIntPipe) newsId: number,
    @Body() dto: { roleCode?: string; processKey?: string; reason: string; note?: string; workItemId: string },
    @Req() req: any
  ) {
    const userId = req?.user?.userId;
    try {
      const user: any = await this.sqlsvRepo.getUserById(userId);
      const userName = user?.name || 'Unknown';

      // Lấy flowConfig và bpmnXML
      if (!user?.parent?.id) {
        throw new BadRequestException('Người dùng không có parent');
      }
      const flowConfig = await this.sqlsvRepo.getFlowByUnit(
        String(user.parent.id), 'News'
      );
      if (!flowConfig) {
        throw new BadRequestException('Không tìm thấy luồng cho người dùng');
      }
      const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig?.id);

      const result = await this.newsWorkflowService.cancelNews(
        newsId,
        dto,
        userId,
        userName,
        bpmnXML,
        dto.workItemId
      );

      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Tin tức: Hủy tin tức ID ${newsId}`,
        method: 'POST',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'CANCEL',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      return { status: 1, document: result };
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Lỗi: Tin tức: Hủy tin tức ID ${newsId} - ${error.message}`,
        method: 'POST',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'CANCEL',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Hủy nhiều tin tức cùng lúc
   */
  @ApiOperation({ summary: 'Hủy nhiều tin tức', description: 'Hủy nhiều tin tức cùng một lúc' })
  @ApiBody({
    description: 'Thông tin hủy nhiều tin',
    schema: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'number' }, description: 'Danh sách ID tin tức cần hủy' },
        workItemIds: { type: 'array', items: { type: 'string' }, description: 'Danh sách ID work item tương ứng' },
        roleCode: { type: 'string', description: 'Mã vai trò tiếp theo (optional)' },
        processKey: { type: 'string', description: 'Khóa quy trình (optional)' },
        reason: { type: 'string', description: 'Lý do hủy' },
        note: { type: 'string', description: 'Ghi chú thêm' }
      },
      required: ['ids', 'workItemIds', 'reason']
    }
  })
  @ApiResponse({ status: 200, description: 'Hủy thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @Post('cancel/bulk')
  @UseGuards(BpmnRoleGuard)
  @Roles('canCancel')
  @ProcessKey('quan_ly_tin_tuc')
  async cancelNewsMultiple(
    @Body() dto: {
      ids: number[];
      workItemIds: string[];
      roleCode?: string;
      processKey?: string;
      reason: string;
      note?: string;
    },
    @Req() req: any
  ) {
    const userId = req?.user?.userId;
    try {
      const user: any = await this.sqlsvRepo.getUserById(userId);
      const userName = user?.name || 'Unknown';

      if (!user?.parent?.id) {
        throw new BadRequestException('Người dùng không có parent');
      }

      if (!dto.ids || dto.ids.length === 0) {
        throw new BadRequestException('Vui lòng cung cấp danh sách tin tức');
      }

      if (!dto.workItemIds || dto.workItemIds.length === 0) {
        throw new BadRequestException('Vui lòng cung cấp danh sách work item');
      }

      if (dto.ids.length !== dto.workItemIds.length) {
        throw new BadRequestException('Số lượng ids và workItemIds phải bằng nhau');
      }

      const flowConfig = await this.sqlsvRepo.getFlowByUnit(
        String(user.parent.id), 'News'
      );

      if (!flowConfig) {
        throw new BadRequestException('Không tìm thấy luồng cho người dùng');
      }

      const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig?.id);

      const result = await this.newsWorkflowService.cancelNewsMultiple(
        dto.ids,
        {
          roleCode: dto.roleCode,
          processKey: dto.processKey,
          reason: dto.reason,
          note: dto.note,
        },
        userId,
        userName,
        bpmnXML,
        dto.workItemIds
      );

      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Tin tức: Hủy nhiều tin tức, danh sách ID: ${dto.ids.join(', ')}`,
        method: 'POST',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'CANCEL_BULK',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      return { status: 1, ...result };
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Lỗi: Tin tức: Hủy nhiều tin tức - ${error.message}`,
        method: 'POST',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'CANCEL_BULK',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  // Thu hồi tin đã xuất bản
  @Post(':id/recall')
  @UseGuards(BpmnRoleGuard)
  @Roles('canRecall')
  @ProcessKey('quan_ly_tin_tuc')
  async recallNews(
    @Param('id', ParseIntPipe) newsId: number,
    @Body() dto: { roleCode?: string; processKey?: string; reason: string; note?: string; workItemId?: string },
    @Req() req: any
  ) {
    const userId = req?.user?.userId;
    try {
      const user: any = await this.sqlsvRepo.getUserById(userId);
      const userName = user?.name || 'Unknown';

      if (!user?.parent?.id) {
        throw new BadRequestException('Người dùng không có parent');
      }

      const flowConfig = await this.sqlsvRepo.getFlowByUnit(
        String(user.parent.id), 'News'
      );
      if (!flowConfig) {
        throw new BadRequestException('Không tìm thấy luồng cho người dùng');
      }

      const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig?.id);

      // Lấy workItemId từ body hoặc query work items
      const workItemId = dto.workItemId;
      // if (!workItemId) {
      //   const workItems = await this.newsWorkflowService.getWorkItems(newsId);
      //   const openWorkItem = workItems.find((wi: any) => wi.state === 'open');
      //   workItemId = openWorkItem?.id;
      // }

      if (!workItemId) {
        throw new BadRequestException('Không tìm thấy workItem cho tin tức này');
      }

      const result = await this.newsWorkflowService.recallNews(newsId, dto, userId, userName, bpmnXML, workItemId);

      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Tin tức: Thu hồi tin tức ID ${newsId}`,
        method: 'POST',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'RECALL',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      return { status: 1, document: result };
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Lỗi: Tin tức: Thu hồi tin tức ID ${newsId} - ${error.message}`,
        method: 'POST',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'RECALL',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Thu hồi nhiều tin tức cùng lúc
   */
  @ApiOperation({ summary: 'Thu hồi nhiều tin tức', description: 'Thu hồi nhiều tin tức đã xuất bản cùng một lúc' })
  @ApiBody({
    description: 'Thông tin thu hồi nhiều tin',
    schema: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'number' }, description: 'Danh sách ID tin tức cần thu hồi' },
        workItemIds: { type: 'array', items: { type: 'string' }, description: 'Danh sách ID work item tương ứng' },
        roleCode: { type: 'string', description: 'Mã vai trò tiếp theo (optional)' },
        processKey: { type: 'string', description: 'Khóa quy trình (optional)' },
        reason: { type: 'string', description: 'Lý do thu hồi' },
        note: { type: 'string', description: 'Ghi chú thêm' }
      },
      required: ['ids', 'workItemIds', 'reason']
    }
  })
  @ApiResponse({ status: 200, description: 'Thu hồi thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @Post('recall/bulk')
  @UseGuards(BpmnRoleGuard)
  @Roles('canRecall')
  @ProcessKey('quan_ly_tin_tuc')
  async recallNewsMultiple(
    @Body() dto: {
      ids: number[];
      workItemIds: string[];
      roleCode?: string;
      processKey?: string;
      reason: string;
      note?: string;
    },
    @Req() req: any
  ) {
    const userId = req?.user?.userId;
    try {
      const user: any = await this.sqlsvRepo.getUserById(userId);
      const userName = user?.name || 'Unknown';

      if (!user?.parent?.id) {
        throw new BadRequestException('Người dùng không có parent');
      }

      if (!dto.ids || dto.ids.length === 0) {
        throw new BadRequestException('Vui lòng cung cấp danh sách tin tức');
      }

      if (!dto.workItemIds || dto.workItemIds.length === 0) {
        throw new BadRequestException('Vui lòng cung cấp danh sách work item');
      }

      if (dto.ids.length !== dto.workItemIds.length) {
        throw new BadRequestException('Số lượng ids và workItemIds phải bằng nhau');
      }

      const flowConfig = await this.sqlsvRepo.getFlowByUnit(
        String(user.parent.id), 'News'
      );

      if (!flowConfig) {
        throw new BadRequestException('Không tìm thấy luồng cho người dùng');
      }

      const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig?.id);

      const result = await this.newsWorkflowService.recallNewsMultiple(
        dto.ids,
        {
          roleCode: dto.roleCode,
          processKey: dto.processKey,
          reason: dto.reason,
          note: dto.note,
        },
        userId,
        userName,
        bpmnXML,
        dto.workItemIds
      );

      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Tin tức: Thu hồi nhiều tin tức, danh sách ID: ${dto.ids.join(', ')}`,
        method: 'POST',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'RECALL_BULK',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      return { status: 1, ...result };
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Lỗi: Tin tức: Thu hồi nhiều tin tức - ${error.message}`,
        method: 'POST',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'RECALL_BULK',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  // Lấy lịch sử audit
  @Get(':id/audit')
  @UseGuards(BpmnRoleGuard)
  @Roles('canView')
  @ProcessKey('quan_ly_tin_tuc')
  async getAuditLog(@Param('id', ParseIntPipe) newsId: number, @Req() req: any) {
    const userId = req?.user?.userId || "";
    try {
      const result = await this.newsWorkflowService.getAuditLog(newsId);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Tin tức: Xem lịch sử xử lý (audit) tin tức ID ${newsId}`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'NEWS_AUDIT_LOG',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return { status: 1, data: result };
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Lỗi: Tin tức: Xem lịch sử xử lý (audit) tin tức ID ${newsId} - ${error.message}`,
        method: 'GET',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'NEWS_AUDIT_LOG',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  // Lấy danh sách work items
  @Get(':id/work-items')
  @UseGuards(BpmnRoleGuard)
  @Roles('canView')
  @ProcessKey('quan_ly_tin_tuc')
  async getWorkItems(@Param('id', ParseIntPipe) newsId: number, @Req() req: any) {
    const userId = req?.user?.userId || "";
    try {
      const result = await this.newsWorkflowService.getWorkItems(newsId);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Tin tức: Xem danh sách work items tin tức ID ${newsId}`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'NEWS_WORK_ITEMS',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return { status: 1, data: result };
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Lỗi: Tin tức: Xem danh sách work items tin tức ID ${newsId} - ${error.message}`,
        method: 'GET',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'NEWS_WORK_ITEMS',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  // ===== CÁC API DANH SÁCH LỌC TIN TỨC =====

  /**
   * Danh sách tin đang tạo (Draft) của người dùng hiện tại
   */
  @Get('my-list/drafts')
  @UseGuards(BpmnRoleGuard)
  @Roles('canView')
  @ProcessKey('quan_ly_tin_tuc')
  @ApiOperation({ summary: 'Danh sách tin đang tạo của tôi' })
  @ApiQuery({ type: QueryMyNewsListDto, style: 'deepObject', explode: true })
  async getMyDrafts(@Query() query: QueryMyNewsListDto, @Req() req: any) {
    const userId = req?.user?.userId;
    if (!userId) {
      throw new BadRequestException('Không tìm thấy thông tin người dùng');
    }

    try {
      const user: any = await this.sqlsvRepo.getUserById(userId);
      const userRoles = req?.user?.roles || [];
      const receiverUnit = user?.parent?.id;

      const flowConfig = await this.sqlsvRepo.getFlowByUnit(
        String(receiverUnit), 'News'
      );

      let bpmnXML: string | undefined;
      if (flowConfig?.id) {
        bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig.id);
      }

      const result = await this.newsWorkflowService.getNewsDrafts(
        query,
        userId,
        bpmnXML,
        userRoles,
        receiverUnit
      );

      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách tin nháp của tôi, trang: ${query.page || 1}, limit: ${query.limit || 20}`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'NEWS_DRAFT',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      return { status: 1, ...result };
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Lỗi: Truy cập danh sách tin nháp của tôi - ${error.message}`,
        method: 'GET',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'NEWS_DRAFT',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  @Get('my-list/count-drafts')
  @UseGuards(BpmnRoleGuard)
  @Roles('canView')
  @ProcessKey('quan_ly_tin_tuc')
  @ApiOperation({ summary: 'Đếm số lượng tin đang tạo của tôi' })
  async countNewsDrafts(@Query() query: QueryMyNewsListDto, @Req() req: any) {
    const userId = req?.user?.userId;
    if (!userId) throw new BadRequestException('Không tìm thấy thông tin người dùng');
    const count = await this.newsWorkflowService.countNewsDrafts(query, userId);
    return { statusCode: 200, data: count };
  }


  /**
   * Danh sách tin chờ duyệt - các tin tôi đang có work item
   */
  @Get('my-list/pending')
  @UseGuards(BpmnRoleGuard)
  @Roles('canView')
  @ProcessKey('quan_ly_tin_tuc')
  @ApiOperation({ summary: 'Danh sách tin chờ duyệt của tôi' })
  @ApiQuery({ type: QueryMyNewsListDto, style: 'deepObject', explode: true })
  async getMyPending(@Query() query: QueryMyNewsListDto, @Req() req: any) {
    const userId = req?.user?.userId;
    if (!userId) {
      throw new BadRequestException('Không tìm thấy thông tin người dùng');
    }

    try {
      const user: any = await this.sqlsvRepo.getUserById(userId);
      const userRoles = req?.user?.roles || [];
      const receiverUnit = user?.parent?.id;

      const flowConfig = await this.sqlsvRepo.getFlowByUnit(
        String(receiverUnit), 'News'
      );

      let bpmnXML: string | undefined;
      if (flowConfig?.id) {
        bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig.id);
      }

      const result = await this.newsWorkflowService.getNewsPendingApproval(
        query,
        userId,
        bpmnXML,
        userRoles,
        receiverUnit
      );

      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách tin chờ duyệt của tôi, trang: ${query.page || 1}, limit: ${query.limit || 20}`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'NEWS_PENDING',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      return { status: 1, ...result };
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Lỗi: Truy cập danh sách tin chờ duyệt của tôi - ${error.message}`,
        method: 'GET',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'NEWS_PENDING',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  @Get('my-list/count-pending')
  @UseGuards(BpmnRoleGuard)
  @Roles('canView')
  @ProcessKey('quan_ly_tin_tuc')
  @ApiOperation({ summary: 'Đếm số lượng tin chờ duyệt của tôi' })
  @ApiQuery({ type: QueryMyNewsListDto, style: 'deepObject', explode: true })
  async countNewsPendingApproval(@Query() query: QueryMyNewsListDto, @Req() req: any) {
    const userId = req?.user?.userId;
    if (!userId) throw new BadRequestException('Không tìm thấy thông tin người dùng');
    const count = await this.newsWorkflowService.countNewsPendingApproval(query, userId);
    return { statusCode: 200, data: count };
  }


  /**
   * Danh sách tin đã xuất bản của người dùng hiện tại
   */
  @Get('my-list/published')
  @UseGuards(BpmnRoleGuard)
  @Roles('canView')
  @ProcessKey('quan_ly_tin_tuc')
  @ApiOperation({ summary: 'Danh sách tin đã xuất bản của tôi' })
  @ApiQuery({ type: QueryMyNewsListDto, style: 'deepObject', explode: true })
  async getMyPublished(@Query() query: QueryMyNewsListDto, @Req() req: any) {
    const userId = req?.user?.userId;
    if (!userId) {
      throw new BadRequestException('Không tìm thấy thông tin người dùng');
    }

    try {
      const user: any = await this.sqlsvRepo.getUserById(userId);
      const userRoles = req?.user?.roles || [];
      const receiverUnit = user?.parent?.id;

      const flowConfig = await this.sqlsvRepo.getFlowByUnit(
        String(receiverUnit), 'News'
      );

      let bpmnXML: string | undefined;
      if (flowConfig?.id) {
        bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig.id);
      }

      const result = await this.newsWorkflowService.getNewsPublished(
        query,
        userId,
        bpmnXML,
        userRoles,
        receiverUnit
      );

      let details = `Truy cập danh sách tin đã xuất bản của tôi, trang: ${query.page || 1}, limit: ${query.limit || 20}`;
      if (query.processFn === 'dspdt') {
        details = `Truy cập danh sách tin đã duyệt của tôi, trang: ${query.page || 1}, limit: ${query.limit || 20}`;
      }

      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: details,
        method: 'GET',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'NEWS_PUBLISHED',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      return { status: 1, ...result };
    } catch (error) {
      let details = `Lỗi: Truy cập danh sách tin đã xuất bản của tôi - ${error.message}`;
      if (query.processFn === 'dspdt') {
        details = `Lỗi: Truy cập danh sách tin đã duyệt của tôi - ${error.message}`;
      }
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: details,
        method: 'GET',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'NEWS_PUBLISHED',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  @Get('my-list/count-published')
  @UseGuards(BpmnRoleGuard)
  @Roles('canView')
  @ProcessKey('quan_ly_tin_tuc')
  @ApiOperation({ summary: 'Đếm số lượng tin đã xuất bản của tôi' })
  @ApiQuery({ type: QueryMyNewsListDto, style: 'deepObject', explode: true })
  async countNewsPublished(@Query() query: QueryMyNewsListDto, @Req() req: any) {
    const userId = req?.user?.userId;
    if (!userId) throw new BadRequestException('Không tìm thấy thông tin người dùng');
    const count = await this.newsWorkflowService.countNewsPublished(query, userId);
    return { statusCode: 200, data: count };
  }


  /**
   * Danh sách tin đã trả lại (bị reject)
   */
  @Get('my-list/returned')
  @UseGuards(BpmnRoleGuard)
  @Roles('canView')
  @ProcessKey('quan_ly_tin_tuc')
  @ApiOperation({ summary: 'Danh sách tin đã trả lại của tôi' })
  async getMyReturned(@Query() query: QueryMyNewsListDto, @Req() req: any) {
    const userId = req?.user?.userId;
    if (!userId) {
      throw new BadRequestException('Không tìm thấy thông tin người dùng');
    }

    try {
      console.debug(`[getMyReturned] request queryKeys=${Object.keys(query || {}).join(',')}`);
      
      const user: any = await this.sqlsvRepo.getUserById(userId);
      
      const userRoles = req?.user?.roles || [];
      const receiverUnit = user?.parent?.id;

      const flowConfig = await this.sqlsvRepo.getFlowByUnit(
        String(receiverUnit), 'News'
      );

      let bpmnXML: string | undefined;
      if (flowConfig?.id) {
        bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig.id);
      }

      const result = await this.newsWorkflowService.getNewsReturned(
        query,
        userId,
        bpmnXML,
        userRoles,
        receiverUnit
      );

      let details = `Truy cập danh sách tin đã trả lại của tôi, trang: ${query.page || 1}, limit: ${query.limit || 20}`;
      if (query.processFn === 'dstl') {
        details = `Truy cập danh sách tin đã trả lại (quy trình dstl) của tôi, trang: ${query.page || 1}, limit: ${query.limit || 20}`;
      }

      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: details,
        method: 'GET',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'NEWS_RETURNED',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      return { status: 1, ...result };
    } catch (error) {
      console.error(`[getMyReturned] Full Error Stack:`, error);
      let details = `Lỗi: Truy cập danh sách tin đã trả lại của tôi - ${error.message}`;
      if (query.processFn === 'dstl') {
        details = `Lỗi: Truy cập danh sách tin đã trả lại (quy trình dstl) của tôi - ${error.message}`;
      }
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: details + ` | Stack: ${error.stack?.substring(0, 500)}`,
        method: 'GET',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'NEWS_RETURNED',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  @Get('my-list/count-returned')
  @UseGuards(BpmnRoleGuard)
  @Roles('canView')
  @ProcessKey('quan_ly_tin_tuc')
  @ApiOperation({ summary: 'Đếm số lượng tin đã trả lại của tôi' })
  @ApiQuery({ type: QueryMyNewsListDto, style: 'deepObject', explode: true })
  async countNewsReturned(@Query() query: QueryMyNewsListDto, @Req() req: any) {
    const userId = req?.user?.userId;
    if (!userId) throw new BadRequestException('Không tìm thấy thông tin người dùng');
    const count = await this.newsWorkflowService.countNewsReturned(query, userId);
    return { statusCode: 200, data: count };
  }


  /**
   * Danh sách tin đã hủy
   */
  @Get('my-list/cancelled')
  @UseGuards(BpmnRoleGuard)
  @Roles('canView')
  @ProcessKey('quan_ly_tin_tuc')
  @ApiOperation({ summary: 'Danh sách tin đã hủy của tôi' })
  async getMyCancelled(@Query() query: QueryMyNewsListDto, @Req() req: any) {
    const userId = req?.user?.userId;
    if (!userId) {
      throw new BadRequestException('Không tìm thấy thông tin người dùng');
    }

    try {
      const user: any = await this.sqlsvRepo.getUserById(userId);
      const userRoles = req?.user?.roles || [];
      const receiverUnit = user?.parent?.id;

      const flowConfig = await this.sqlsvRepo.getFlowByUnit(
        String(receiverUnit), 'News'
      );

      let bpmnXML: string | undefined;
      if (flowConfig?.id) {
        bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig.id);
      }

      const result = await this.newsWorkflowService.getNewsCancelled(
        query,
        userId,
        bpmnXML,
        userRoles,
        receiverUnit
      );

      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách tin đã hủy của tôi, trang: ${query.page || 1}, limit: ${query.limit || 20}`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'NEWS_CANCELLED',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      return { status: 1, ...result };
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Lỗi: Truy cập danh sách tin đã hủy của tôi - ${error.message}`,
        method: 'GET',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'NEWS_CANCELLED',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  @Get('my-list/count-cancelled')
  @UseGuards(BpmnRoleGuard)
  @Roles('canView')
  @ProcessKey('quan_ly_tin_tuc')
  @ApiOperation({ summary: 'Đếm số lượng tin đã hủy của tôi' })
  async countNewsCancelled(@Query() query: QueryMyNewsListDto, @Req() req: any) {
    const userId = req?.user?.userId;
    if (!userId) throw new BadRequestException('Không tìm thấy thông tin người dùng');
    const count = await this.newsWorkflowService.countNewsCancelled(query, userId);
    return { statusCode: 200, data: count };
  }


  /**
   * Danh sách tin đã thu hồi
   */
  @Get('my-list/recalled')
  @UseGuards(BpmnRoleGuard)
  @Roles('canView')
  @ProcessKey('quan_ly_tin_tuc')
  @ApiOperation({ summary: 'Danh sách tin đã thu hồi của tôi' })
  async getMyRecalled(@Query() query: QueryMyNewsListDto, @Req() req: any) {
    const userId = req?.user?.userId;
    if (!userId) {
      throw new BadRequestException('Không tìm thấy thông tin người dùng');
    }

    try {
      const result = await this.newsWorkflowService.getNewsRecalled(query, userId);

      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách tin đã thu hồi của tôi, trang: ${query.page || 1}, limit: ${query.limit || 20}`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'NEWS_RECALLED',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      return { status: 1, ...result };
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Lỗi: Truy cập danh sách tin đã thu hồi của tôi - ${error.message}`,
        method: 'GET',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'NEWS_RECALLED',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  @Get('my-list/count-recalled')
  @UseGuards(BpmnRoleGuard)
  @Roles('canView')
  @ProcessKey('quan_ly_tin_tuc')
  @ApiOperation({ summary: 'Đếm số lượng tin đã thu hồi của tôi' })
  @ApiQuery({ type: QueryMyNewsListDto, style: 'deepObject', explode: true })
  async countNewsRecalled(@Query() query: QueryMyNewsListDto, @Req() req: any) {
    const userId = req?.user?.userId;
    if (!userId) throw new BadRequestException('Không tìm thấy thông tin người dùng');
    const count = await this.newsWorkflowService.countNewsRecalled(query, userId);
    return { statusCode: 200, data: count };
  }


  /**
   * Danh sách tin đã thu hồi
   */
  @Get('my-list/recalled-by-user')
  @UseGuards(BpmnRoleGuard)
  @Roles('canView')
  @ProcessKey('quan_ly_tin_tuc')
  @ApiOperation({ summary: 'Danh sách tin đã thu hồi của tôi' })
  async getMyRecalledByUser(@Query() query: QueryMyNewsListDto, @Req() req: any) {
    const userId = req?.user?.userId;
    if (!userId) {
      throw new BadRequestException('Không tìm thấy thông tin người dùng');
    }

    try {
      const result = await this.newsWorkflowService.getNewsRecalledByUser(query, userId);

      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách tin đã thu hồi của tôi, trang: ${query.page || 1}, limit: ${query.limit || 20}`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'NEWS_RECALLED_BY_USER',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      return { status: 1, ...result };
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Lỗi: Truy cập danh sách tin đã thu hồi của tôi - ${error.message}`,
        method: 'GET',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'NEWS_RECALLED_BY_USER',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  @Get('my-list/count-recalled-by-user')
  @UseGuards(BpmnRoleGuard)
  @Roles('canView')
  @ProcessKey('quan_ly_tin_tuc')
  @ApiOperation({ summary: 'Đếm số lượng tin đã thu hồi của tôi (by user)' })
  async countNewsRecalledByUser(@Query() query: QueryMyNewsListDto, @Req() req: any) {
    const userId = req?.user?.userId;
    if (!userId) throw new BadRequestException('Không tìm thấy thông tin người dùng');
    const count = await this.newsWorkflowService.countNewsRecalledByUser(query, userId);
    return { statusCode: 200, data: count };
  }


  /**
   * Danh sách tin chờ phê duyệt của tôi - các tin tôi đang có quyền phê duyệt
   */
  @Get('my-list/waiting-approval')
  @UseGuards(BpmnRoleGuard)
  @Roles('canView')
  @ProcessKey('quan_ly_tin_tuc')
  @ApiOperation({ summary: 'Danh sách tin chờ tôi phê duyệt' })
  @ApiQuery({ type: QueryMyNewsListDto, style: 'deepObject', explode: true })
  async getWaitingMyApproval(@Query() query: QueryMyNewsListDto, @Req() req: any) {
    const userId = req?.user?.userId;
    if (!userId) {
      throw new BadRequestException('Không tìm thấy thông tin người dùng');
    }

    try {
      const user: any = await this.sqlsvRepo.getUserById(userId);
      const userRoles = req?.user?.roles || [];
      const receiverUnit = user?.parent?.id;

      const flowConfig = await this.sqlsvRepo.getFlowByUnit(
        String(receiverUnit), 'News'
      );

      let bpmnXML: string | undefined;
      if (flowConfig?.id) {
        bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig.id);
      }

      const result = await this.newsWorkflowService.getNewsWaitingMyApproval(
        query,
        userId,
        bpmnXML,
        userRoles,
        receiverUnit
      );

      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Danh sách tin chờ tôi phê duyệt, trang: ${query.page || 1}, limit: ${query.limit || 20}`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'NEWS_WAITING_APPROVAL',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      return { status: 1, ...result };
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Lỗi: Danh sách tin chờ tôi phê duyệt - ${error.message}`,
        method: 'GET',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'NEWS_WAITING_APPROVAL',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  @Get('my-list/count-waiting-approval')
  @UseGuards(BpmnRoleGuard)
  @Roles('canView')
  @ProcessKey('quan_ly_tin_tuc')
  @ApiOperation({ summary: 'Đếm số lượng tin chờ để phê duyệt của tôi' })
  @ApiQuery({ type: QueryMyNewsListDto, style: 'deepObject', explode: true })
  async countNewsWaitingMyApproval(@Query() query: QueryMyNewsListDto, @Req() req: any) {
    const userId = req?.user?.userId;
    if (!userId) throw new BadRequestException('Không tìm thấy thông tin người dùng');
    const count = await this.newsWorkflowService.countNewsWaitingMyApproval(query, userId);
    return { statusCode: 200, data: count };
  }


  ///////////////////////////////////////////////////////////////////////
  /**
   * Public API - Danh sách tin tức đã được phê duyệt (không cần đăng nhập)
   */
  // @Public()
  @Get('public/published')
  @ApiOperation({ summary: 'Danh sách tin tức đã phê duyệt (public)' })
  async getPublicPublishedNews(@Query() query: any, @Req() req: any) {
    // Sử dụng phương thức mới không cần userId
    const userId = req?.user?.userId || "";

    try {
      const result = await this.newsWorkflowService.getAllPublishedNews(query, userId);
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Truy cập danh sách tin tức đã phê duyệt (public), trang: ${query.page || 1}, limit: ${query.limit || 10}`,
          method: 'GET',
          status: 'SUCCESS',
          type: 'NEWS',
          subType: 'NEWS_PUBLIC_PUBLISHED',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      return { status: 1, ...result };
    } catch (error) {
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi: Truy cập danh sách tin tức đã phê duyệt (public) - ${error.message}`,
          method: 'GET',
          status: 'ERROR',
          type: 'NEWS',
          subType: 'NEWS_PUBLIC_PUBLISHED',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  }

  /**
   * Public API - Chi tiết tin tức đã phê duyệt theo ID (không cần đăng nhập)
   */

  /**
   * Public API - Danh sách tin tức nổi bật (isSpecial = true)
   */
  // @Public()
  @Get('public/special/list')
  @ApiOperation({
    summary: 'Danh sách tin tức nổi bật',
    description: 'Lấy danh sách tin tức nổi bật đã được duyệt (isSpecial = true)'
  })
  async getSpecialNews(@Query() query: any, @Req() req: any) {
    const userId = req?.user?.userId || "";
    try {
      const result = await this.newsService.getSpecialNews(query);
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Truy cập danh sách tin tức nổi bật`,
          method: 'GET',
          status: 'SUCCESS',
          type: 'NEWS',
          subType: 'NEWS_SPECIAL',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      return { status: 1, ...result };
    } catch (error) {
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi: Truy cập danh sách tin tức nổi bật - ${error.message}`,
          method: 'GET',
          status: 'ERROR',
          type: 'NEWS',
          subType: 'NEWS_SPECIAL',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  }

  /**
   * Public API - Có thể bạn quan tâm (3 tin random) - không loại trừ tin nào
   */
  // @Public()
  @Get('public/suggested')
  @ApiOperation({
    summary: 'Tin tức gợi ý - Có thể bạn quan tâm',
    description: 'Trả về 5 tin tức liên quan cùng chủ đề hoặc tags hoặc random đã được duyệt'
  })
  @ApiQuery({ name: 'topic', required: false, type: String, description: 'ID của chủ đề để lấy tin liên quan' })
  @ApiQuery({ name: 'tags', required: false, type: String, description: 'Danh sách tags (cách nhau bởi dấu phẩy) để lấy tin liên quan' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng tin muốn lấy (mặc định 5)' })
  async getSuggestedNews(
    @Query('topic') topic: string,
    @Query('tags') tags: string,
    @Query('limit') limit: number,
    @Req() req: any
  ) {
    const userId = req?.user?.userId || "";
    const limitFinal = limit ? Number(limit) : 5;
    try {
      const result = await this.newsService.getSuggestedNews(undefined, topic, limitFinal, tags);
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Truy cập danh sách tin tức gợi ý (topic: ${topic || 'random'}, tags: ${tags || 'none'}, limit: ${limitFinal})`,
          method: 'GET',
          status: 'SUCCESS',
          type: 'NEWS',
          subType: 'NEWS_SUGGESTED',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      return { status: 1, ...result };
    } catch (error) {
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi: Truy cập danh sách tin tức gợi ý - ${error.message}`,
          method: 'GET',
          status: 'ERROR',
          type: 'NEWS',
          subType: 'NEWS_SUGGESTED',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      return { status: 0, message: error.message };
    }
  }

  /**
   * Public API - Có thể bạn quan tâm (3 tin random) - loại trừ tin hiện tại
   */
  @Get('public/suggested/exclude/:excludeId')
  @ApiOperation({
    summary: 'Tin tức gợi ý - Loại trừ tin hiện tại',
    description: 'Trả về 5 tin tức liên quan cùng chủ đề hoặc tags hoặc random đã được duyệt (loại trừ tin đang xem)'
  })
  @ApiParam({ name: 'excludeId', type: Number, description: 'ID tin tức cần loại trừ' })
  @ApiQuery({ name: 'topic', required: false, type: String, description: 'ID của chủ đề để lấy tin liên quan' })
  @ApiQuery({ name: 'tags', required: false, type: String, description: 'Danh sách tags (cách nhau bởi dấu phẩy) để lấy tin liên quan' })
  async getSuggestedNewsWithExclude(
    @Param('excludeId', ParseIntPipe) excludeId: number,
    @Query('topic') topic: string,
    @Query('tags') tags: string,
    @Req() req: any
  ) {
    const userId = req?.user?.userId || "";
    try {
      const result = await this.newsService.getSuggestedNews(excludeId, topic, 5, tags);
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Truy cập tin tức gợi ý, loại trừ ID ${excludeId} (topic: ${topic || 'random'}, tags: ${tags || 'none'})`,
          method: 'GET',
          status: 'SUCCESS',
          type: 'NEWS',
          subType: 'NEWS_SUGGESTED_EXCLUDE',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      return { status: 1, ...result };
    } catch (error) {
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi: Truy cập tin tức gợi ý, loại trừ ID ${excludeId} - ${error.message}`,
          method: 'GET',
          status: 'ERROR',
          type: 'NEWS',
          subType: 'NEWS_SUGGESTED_EXCLUDE',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      return { status: 0, message: error.message };
    }
  }

  /**
   * Public API - Lọc tin tức theo nhiều tiêu chí
   */
  // @Public()
  @Get('public/filter')
  @ApiOperation({
    summary: 'Lọc tin tức theo nhiều tiêu chí',
    description: `
      Lọc tin tức với các tham số:
      - topic: ID chủ đề
      - tags: các tag phân cách bởi dấu phẩy (vd: "công nghệ,giáo dục")
      - status: trạng thái (0=nháp, 1=đã xuất bản)
      - isSpecial: tin nổi bật (true/false)
      - fromDate: lọc từ ngày (ISO format)
      - toDate: lọc đến ngày (ISO format)
      - keyword: tìm kiếm trong tiêu đề, nội dung, tóm tắt
      - department: phòng ban
      - sortBy: trường sắp xếp (mặc định: publishedAt)
      - sortOrder: thứ tự sắp xếp (ASC/DESC, mặc định: DESC)
      - page: trang (mặc định: 1)
      - limit: số lượng/trang (mặc định: 10)
    `
  })
  async filterNews(@Query() query: any, @Req() req: any) {
    const userId = req?.user?.userId || "";
    try {
      const result = await this.newsService.filterNews(query);
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Truy cập bộ lọc tin tức, trang: ${query.page || 1}, limit: ${query.limit || 10}`,
          method: 'GET',
          status: 'SUCCESS',
          type: 'NEWS',
          subType: 'NEWS_FILTER',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      return { status: 1, ...result };
    } catch (error) {
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi: Truy cập bộ lọc tin tức - ${error.message}`,
          method: 'GET',
          status: 'ERROR',
          type: 'NEWS',
          subType: 'NEWS_FILTER',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  }

  /**
   * Public API - Danh sách tin mới nhất
   */
  // @Public()
  @Get('public/latest')
  @ApiOperation({
    summary: 'Danh sách tin mới nhất',
    description: `
      Lấy danh sách tin mới nhất (được tạo trong vòng X ngày).
      Cấu hình số ngày mặc định từ system_setting_log.newArticlesDays
      
      Query params:
      - page: số trang (mặc định: 1)
      - limit: số lượng/trang (mặc định: 10)
      - newArticlesDays: số ngày để coi là "mới" (mặc định: 7, có thể override)
    `
  })
  async getLatestNews(@Query() query: any, @Req() req: any) {
    const userId = req?.user?.userId || "";
    try {
      const result = await this.newsService.getLatestNews(query);
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Truy cập danh sách tin mới nhất, trang: ${query.page || 1}, limit: ${query.limit || 10}`,
          method: 'GET',
          status: 'SUCCESS',
          type: 'NEWS',
          subType: 'NEWS_LATEST',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      return { status: 1, ...result };
    } catch (error) {
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi: Truy cập danh sách tin mới nhất - ${error.message}`,
          method: 'GET',
          status: 'ERROR',
          type: 'NEWS',
          subType: 'NEWS_LATEST',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  }

  /**
   * Public API - Danh sách tin xem nhiều nhất
   */
  // @Public()
  @Get('public/most-viewed')
  @ApiOperation({
    summary: 'Danh sách tin xem nhiều nhất',
    description: `
      Lấy danh sách tin có lượt xem nhiều nhất xuất bản trong 30 ngày gần nhất.
      
      Query params:
      - page: số trang (mặc định: 1)
      - limit: số lượng/trang (mặc định: 15)
      - sortBy: trường để sort (viewCount, likeCount, createdAt, publishedAt, title, id) - mặc định: viewCount
      - sortOrder: thứ tự sort (ASC hoặc DESC) - mặc định: DESC
    `
  })
  async getMostViewedNews(@Query() query: any, @Req() req: any) {
    const userId = req?.user?.userId || "";
    try {
      const result = await this.newsService.getMostViewedNews(query);
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Truy cập danh sách tin xem nhiều nhất, trang: ${query.page || 1}, limit: ${query.limit || 15}`,
          method: 'GET',
          status: 'SUCCESS',
          type: 'NEWS',
          subType: 'NEWS_MOST_VIEWED',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      return { status: 1, ...result };
    } catch (error) {
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi: Truy cập danh sách tin xem nhiều nhất - ${error.message}`,
          method: 'GET',
          status: 'ERROR',
          type: 'NEWS',
          subType: 'NEWS_MOST_VIEWED',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  }

  /**
   * Public API - Danh sách tin được yêu thích (like nhiều)
   */
  // @Public()
  @Get('public/favorites')
  @ApiOperation({
    summary: 'Danh sách tin được yêu thích',
    description: `
      Lấy danh sách tin được yêu thích (số like >= threshold).
      Cấu hình threshold mặc định từ system_setting_log.favoriteArticlesThreshold
      
      Query params:
      - page: số trang (mặc định: 1)
      - limit: số lượng/trang (mặc định: 10)
      - threshold: số lượt like tối thiểu (mặc định: 20, có thể override)
      - sortBy: trường để sort (likeCount, viewCount, createdAt, publishedAt, title) - mặc định: likeCount
      - sortOrder: thứ tự sort (ASC hoặc DESC) - mặc định: DESC
    `
  })
  async getFavoriteNews(@Query() query: any, @Req() req: any) {
    const userId = req?.user?.userId || "";
    try {
      const result = await this.newsService.getFavoriteNews(query);
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Truy cập danh sách tin được yêu thích, trang: ${query.page || 1}, limit: ${query.limit || 10}`,
          method: 'GET',
          status: 'SUCCESS',
          type: 'NEWS',
          subType: 'NEWS_FAVORITES',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      return { status: 1, ...result };
    } catch (error) {
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi: Truy cập danh sách tin được yêu thích - ${error.message}`,
          method: 'GET',
          status: 'ERROR',
          type: 'NEWS',
          subType: 'NEWS_FAVORITES',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  }

  /**
   * Public API - Tăng lượt xem cho tin tức
   */
  // @Public()
  @Post('public/postviewnews/:id')
  @ApiOperation({ summary: 'Tăng lượt xem cho tin tức' })
  async postViewNews(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req?.user?.userId || "";
    try {
      const result = await this.newsService.incrementViewCount(id);
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Tin tức: Tăng lượt xem cho tin tức ID ${id}`,
          method: 'POST',
          status: 'SUCCESS',
          type: 'NEWS',
          subType: 'NEWS_VIEW_INCREMENT',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      return { status: 1, ...result };
    } catch (error) {
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Lỗi: Tin tức: Tăng lượt xem cho tin tức ID ${id} - ${error.message}`,
          method: 'POST',
          status: 'ERROR',
          type: 'NEWS',
          subType: 'NEWS_VIEW_INCREMENT',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  }

  /**
   * Public API - Danh sách tin tức quan trọng (isImportant = true)
   */
  // @Public()
  @Get('public/important')
  @ApiOperation({ summary: 'Danh sách tin tức quan trọng đã phê duyệt (public)' })
  async getImportantNews(@Query() query: any, @Req() req: any) {
    const userId = req?.user?.userId || "";
    try {
      const result = await this.newsService.getImportantNews(query);
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Truy cập danh sách tin tức quan trọng`,
          method: 'GET',
          status: 'SUCCESS',
          type: 'NEWS',
          subType: 'NEWS_IMPORTANT',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      return { status: 1, ...result };
    } catch (error) {
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi: Truy cập danh sách tin tức quan trọng - ${error.message}`,
          method: 'GET',
          status: 'ERROR',
          type: 'NEWS',
          subType: 'NEWS_IMPORTANT',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  }

  // @Public()
  @Get('public/:id')
  @ApiOperation({ summary: 'Chi tiết tin tức đã phê duyệt (public)' })
  async getPublicNewsDetail(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req?.user?.userId || "";
    try {
      // Chỉ lấy tin tức đã được phê duyệt và tăng lượt xem
      const news = await this.newsService.findOne(id, false, userId, true);
      if (!news) {
        throw new BadRequestException('Không tìm thấy tin tức');
      }

      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Truy cập chi tiết tin tức (public) ID ${id}`,
          method: 'GET',
          status: 'SUCCESS',
          type: 'NEWS',
          subType: 'NEWS_PUBLIC_DETAIL',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }

      return { status: 1, data: news };
    } catch (error) {
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi: Truy cập chi tiết tin tức (public) ID ${id} - ${error.message}`,
          method: 'GET',
          status: 'ERROR',
          type: 'NEWS',
          subType: 'NEWS_PUBLIC_DETAIL',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  }

  /**
   * Public API - Danh sách tất cả tag không trùng
   */
  // @Public()
  @Get('public/tags/all')
  @ApiOperation({
    summary: 'Danh sách tất cả tag',
    description: 'Lấy danh sách các tag không trùng từ tất cả tin tức đã được duyệt, sắp xếp theo số lần xuất hiện giảm dần'
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách tag thành công',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'number', example: 1 },
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'công nghệ' },
              count: { type: 'number', example: 15, description: 'Số bài viết có tag này' }
            }
          }
        },
        total: { type: 'number', example: 25, description: 'Tổng số tag không trùng' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Lỗi khi lấy danh sách tag' })
  async getAllTags(@Req() req: any) {
    const userId = req?.user?.userId || "";
    try {
      const result = await this.newsService.getAllTags();
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Truy cập danh sách tất cả tags`,
          method: 'GET',
          status: 'SUCCESS',
          type: 'NEWS',
          subType: 'NEWS_TAGS_ALL',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      return { status: 1, ...result };
    } catch (error) {
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi: Truy cập danh sách tất cả tags - ${error.message}`,
          method: 'GET',
          status: 'ERROR',
          type: 'NEWS',
          subType: 'NEWS_TAGS_ALL',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  }
}

