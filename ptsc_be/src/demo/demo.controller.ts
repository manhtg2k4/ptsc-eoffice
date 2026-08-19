import {
  Controller,
  Post,
  Put,
  Body,
  Param,
  ConflictException,
  UsePipes,
  ValidationPipe,
  Req,
  Inject,
  BadRequestException,
  Get,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { RuntimeDbService } from '../bpmn/runtime-dbmssql.service';
import { MSSQLRepository } from '../database/sqlRepo.mssql';
import { MSSQL_REPO } from '../database/database.provider';
import { CreateDocDto, CreateDocDtoDraft } from './dto/create-demo.dto';
import { UpdateDocDto } from './dto/update-demo.dto';
import { BpmnVersionService } from 'src/bpmn-version/bpmn-version.service';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { PostStorageAiService } from 'src/post-storage-ai/post-storage-ai.service';
import { SQLSVRepository } from 'src/database/sqlsvRepo';

@ApiBearerAuth()
@ApiTags('Demo BPMN Engine')
@Controller('demo')
export class DemoController {
  constructor(
    private readonly runtimeService: RuntimeDbService,
    @Inject(MSSQL_REPO) private readonly sqlRepo: MSSQLRepository,
    private readonly sqlsvRepo: SQLSVRepository,
    private readonly bpmnVersionService: BpmnVersionService,
    private readonly systemLogService: SystemLogServiceSql,
    private readonly postStorageAiService: PostStorageAiService,
  ) { }

  @Post('docs')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Tạo mới 1 văn bản tại 1 bước trong quy trình' })
  @ApiBody({ type: CreateDocDto })
  @ApiResponse({ status: 201, description: 'Document created successfully' })
  @ApiResponse({ status: 409, description: 'Document with the given ID already exists' })
  @ApiBearerAuth()
  async createDoc(@Body() createDocDto: CreateDocDto, @Req() req: any) {
    // try {
    //   const userId = req?.user?.userId;
    //   // 👉 Lấy version mới nhất từ bảng bpmndesignversions
    //   const latestVersion = await this.bpmnVersionService.getLatestVersion("PHOIHOP_NHANDEBIET");
    //   if (!latestVersion) {
    //     throw new Error('Không tìm thấy version BPMN mới nhất');
    //   }
    //   // 👉 Lấy XML từ version
    //   const bpmnXML = await this.runtimeService.getBpmnFileByVersion(latestVersion._id.toString());
    //   const { nodeId, assigneeUserId, ...docData } = createDocDto;
    //   const documentId = String(Date.now());
    //   const data = { documentId, bpmnVersion: latestVersion._id.toString(), ...docData };

    //   if (await this.sqlRepo.checkExistsDocument({ toBook: data.toBook, senderUnit: data.senderUnit, receiverUnit: data.receiverUnit, documentDate: data.documentDate })) {
    //     throw new ConflictException('Văn bản đến bị trùng. Vui lòng kiểm tra lại');
    //   }

    //   const doc = await this.runtimeService.createDocumentAtNode({
    //     bpmnXML,
    //     data,
    //     nodeId,
    //     assigneeUserId: assigneeUserId || userId,
    //   });

    //   return { status: 1, document: doc };
    // } 
    try {
      ; // lấy trực tiếp từ service
      const userId = req?.user?.userId;
      const user: any = await this.sqlsvRepo.getUserById(userId);
      if (!user?.parent?.id) {
        throw new BadRequestException('Người dùng không có parent');
      }
      const flowConfig = await this.sqlsvRepo.getFlowByUnit(
        String(user.parent.id), 'IncommingDocument'
      );
      if (!flowConfig) {
        throw new BadRequestException('Không tìm thấy luồng cho người dùng');
      }
      const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig?.id);
      const { nodeId, assigneeUserId, ...docData } = createDocDto;
      const documentId = String(Date.now());
      const data = { documentId, bpmnVersion: flowConfig?.id, ...docData };

      if (await this.sqlRepo.checkExistsDocument({ toBook: data.toBook, senderUnit: data.senderUnit, receiverUnit: data.receiverUnit, documentDate: data.documentDate })) {
        throw new ConflictException('Văn bản đến bị trùng. Vui lòng kiểm tra lại');
      }
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Văn bản đến/Tiếp nhận: Thêm mới văn bản tiếp nhận`,
        method: 'POST',
        status: 'SUCCESS',
        type: 'INCOMING_DOCUMENT',
        subType: 'INCOMING_DOCUMENT',
        userInfo: req?.user?.userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      const doc = await this.runtimeService.createDocumentAtNode({
        bpmnXML,
        data,
        assigneeUserId: assigneeUserId || userId,
      });

      /**
       * Push metadata incoming sang AI
       * - documentId = doc.documentId (bạn dùng timestamp string)
       * - event = 'metadata' để service cache và ưu tiên push combined nếu file đã upload trước đó
       * 
       * Lưu ý: không throw nếu AI lỗi, tránh fail tạo văn bản
       */
      this.postStorageAiService
        .trySyncIncoming({
          documentId: String(doc?.documentId || ''),
          metadata: doc,
          event: 'metadata',
        })
        .catch((err) => console.error('[PostStorageAI] trySyncIncoming failed (createDoc):', err));

      return { status: 1, document: doc };
    }
    catch (error) {
      throw error;
    }
  }

  @Get('draft-create')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Tạo mới 1 văn bản tại 1 bước trong quy trình' })
  @ApiBody({ type: CreateDocDtoDraft })
  @ApiResponse({ status: 201, description: 'Document created successfully' })
  @ApiResponse({ status: 409, description: 'Document with the given ID already exists' })
  @ApiBearerAuth()
  async draftCreateDoc(@Body() createDocDto: CreateDocDtoDraft, @Req() req: any) {
    try {
      const userId = req?.user?.userId;
      const user: any = await this.sqlsvRepo.getUserById(userId);
      if (!user?.parent?.id) {
        throw new BadRequestException('Người dùng không có parent');
      }
      const flowConfig = await this.sqlsvRepo.getFlowByUnit(
        String(user.parent.id), 'IncommingDocument'
      );
      if (!flowConfig) {
        throw new BadRequestException('Không tìm thấy luồng cho người dùng');
      }
      const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig?.id);
      const { nodeId, assigneeUserId, ...docData } = createDocDto;
      const documentId = String(Date.now());
      const data = { documentId, bpmnVersion: flowConfig?.id, ...docData };

      if (await this.sqlRepo.checkExistsDocument({ toBook: data.toBook, senderUnit: data.senderUnit, receiverUnit: data.receiverUnit, documentDate: data.documentDate })) {
        throw new ConflictException('Văn bản đến bị trùng. Vui lòng kiểm tra lại');
      }
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Văn bản đến/Tiếp nhận: Thêm mới văn bản tiếp nhận`,
        method: 'POST',
        status: 'SUCCESS',
        type: 'INCOMING_DOCUMENT',
        subType: 'INCOMING_DOCUMENT',
        userInfo: req?.user?.userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      const doc = await this.runtimeService.createDocumentAtNodeDraft({
        bpmnXML,
        data,
        assigneeUserId: assigneeUserId || userId,
      });
      this.postStorageAiService
        .trySyncIncoming({
          documentId: String(doc?.documentId || ''),
          metadata: doc,
          event: 'metadata',
        })
        .catch((err) => console.error('[PostStorageAI] trySyncIncoming failed (createDoc):', err));
      const roles: string[] = (doc?.openWorkItems ?? [])
      .map(item => item?.role)
      .filter((r): r is string => typeof r === 'string' && r.length > 0);
      return this.runtimeService.getDetails({
        bpmnXML,
        documentId,
        userContext: { userId, roles },
        prefetchedIncomingActiveAssignments: [],
      });
    }
    catch (error) {
      throw error;
    }
  }

  @Put('docs/:id')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Cập nhật văn bản' })
  @ApiParam({ name: 'id', type: String, description: 'Document ID to update' })
  @ApiBody({ type: UpdateDocDto })
  @ApiResponse({ status: 200, description: 'Document updated successfully' })
  async updateDoc(@Param('id') documentId: string, @Body() updateDocDto: UpdateDocDto, @Req() req?: any) {
    await this.systemLogService.createLogFromSystem({
      action: 'PUT',
      details: `Văn bản đến/Tiếp nhận: Cập nhật chi tiết văn bản tiếp nhận`,
      method: 'PUT',
      status: 'SUCCESS',
      type: 'INCOMING_DOCUMENT',
      subType: 'INCOMING_DOCUMENT',
      userInfo: req?.user?.userId || "",
      ipAddress: req?.socket?.remoteAddress || 'Unknown',
      timestamp: new Date().toISOString(),
    });
    const doc = await this.runtimeService.updateDocument({ documentId, data: updateDocDto });
    return { status: 1, document: doc };
  }
}
