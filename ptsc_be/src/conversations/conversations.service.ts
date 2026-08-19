import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConversationEntity } from './entities/conversation.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { ConnectionPool } from 'mssql';
import { ConversationType } from './conversation.types';
import { ConversationMember } from './entities/conversation-member.entity';
import { ConversationMemberState } from './entities/conversation-member-state.entity';
import { randomUUID } from 'crypto';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';

function res(data: any, message = 'Success') {
  return {
    status: 1,
    message,
    count: Array.isArray(data) ? data.length : data ? 1 : 0,
    data,
  };
}

// ✅ Di chuyển generateId() lên trước class và implement đúng
function generateId(): string {
  return randomUUID();
}

@Injectable()
export class ConversationsService {
  private dbname: string;
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ConversationEntity, 'mssqlConnection')
    private readonly convRepo: Repository<ConversationEntity>,

    @Inject('MSSQL_POOL')
    private readonly pool: ConnectionPool,

    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  private validateId(id: string, field = 'id'): string {
    if (!id) throw new BadRequestException(`${field} is required`);
    return id;
  }
  private getDatabaseName(): string {
    const dbName = this.configService.get<string>('SQLSERVER_DATABASE');
    if (!dbName) throw new Error('SQLSERVER_DATABASE not defined in .env');
    return dbName + '.dbo';
  }

  onModuleInit() {
    this.dbname = this.getDatabaseName();
  }
    /**
   * ✅ Socket auto-join: lấy danh sách conversationId mà user đang là member
   * và state.deletedAt = null
   */
  async getConversationIdsByUser(userId: string): Promise<string[]> {
    const uid = this.validateId(userId, 'userId');

    const convs = await this.convRepo
      .createQueryBuilder('c')
      .leftJoin('c.members', 'm')
      .leftJoin('c.memberStates', 'ms')
      .where('m.userId = :uid', { uid })
      .andWhere('ms.userId = :uid', { uid })
      .andWhere('ms.deletedAt IS NULL')
      .select(['c.id'])
      .getMany();

    return (convs || []).map((c) => c.id).filter(Boolean);
  }

  /**
   * ✅ Helper method to populate user information
   */
  private async populateConversationUsers(conv: ConversationEntity) {
    try {
      // 1. Lấy thông tin createdBy (dùng findById2 - không throw error)
      const createdByUser = await this.usersService.findById2(conv.createdBy);
      
      // ✅ Nếu không tìm thấy createdBy, dùng giá trị mặc định thay vì throw error
      const createdByInfo = createdByUser ? {
        _id: createdByUser.id,
        name: createdByUser.name,
        avatar: createdByUser.avatar
      } : {
        _id: conv.createdBy,
        name: 'Unknown User',
        avatar: []
      };

      // 2. Lấy danh sách memberIds từ members
      const memberIds = conv.members?.map(m => m.userId) || [];
      
      // 3. Lấy danh sách memberIds từ memberStates
      const stateUserIds = conv.memberStates?.map(s => s.userId) || [];
      
      // Gộp tất cả userIds và loại bỏ trùng lặp (validate trước khi query)
      const allUserIds = [...new Set([...memberIds, ...stateUserIds])].filter(id => id && id.trim());

      // 4. Lấy thông tin tất cả users một lần (dùng findById2)
      const users = await Promise.all(
        allUserIds.map(userId => this.usersService.findById2(userId))
      );

      // Tạo map để tra cứu nhanh
      const userMap = new Map();
      users.forEach(user => {
        if (user) {
          userMap.set(user.id, {
            _id: user.id,
            name: user.name,
            avatar: user.avatar
          });
        }
      });

      // 5. Format response data
      const responseData: any = {
        _id: conv.id,
        createdBy: createdByInfo, // ✅ Dùng createdByInfo thay vì createdByUser
        name: conv.title,
        type: conv.type === 0 ? 'direct' : 'group',
        avatar: conv.avatar,
        backgroundImage: conv.backgroundImage,
        
        // Populate members
        members: conv.members?.map(member => 
          userMap.get(member.userId) || {
            _id: member.userId,
            name: 'Unknown User',
            avatar: []
          }
        ) || [],

        // Populate memberStates
        memberStates: conv.memberStates?.map(state => ({
          userId: userMap.get(state.userId) || {
            _id: state.userId,
            name: 'Unknown User',
            avatar: []
          },
          pinnedOrder: state.pinnedOrder,
          unread: state.unread,
          hidden: state.hidden,
          deletedAt: state.deletedAt,
          lastReadAt: state.lastReadAt
        })) || [],

        lastMessagePreview: conv.lastMessagePreview,
        lastMessageId: conv.lastMessageId,
        lastMessageAt: conv.lastMessageAt,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt
      };

      return responseData; // ✅ Chỉ return data object
    } catch (error) {
      console.error('Error populating conversation users:', error);
      
      // Return more specific error message
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException(
        `Không thể lấy thông tin người dùng: ${error.message || 'Lỗi không xác định'}`
      );
    }
  }
async existsExactDirectConversation(
  userId1: string,
  userId2: string,
): Promise<boolean> {
  const result = await this.convRepo.manager.query(
    `
    SELECT c.id
    FROM ${this.dbname}.conversations c
    JOIN ${this.dbname}.conversation_members cm
      ON cm.conversationId = c.id
    WHERE c.[type] = 0
    GROUP BY c.id
    HAVING
      COUNT(DISTINCT cm.userId) = 2
      AND SUM(CASE WHEN cm.userId = @0 THEN 1 ELSE 0 END) = 1
      AND SUM(CASE WHEN cm.userId = @1 THEN 1 ELSE 0 END) = 1
    `,
    [userId1, userId2],
  );

  return result.length > 0;
}
async create(dto: CreateConversationDto) {

  /* =====================================================
   * 1️⃣ CHECK DIRECT TRƯỚC KHI TẠO
   * ===================================================== */
  if (dto.type === ConversationType.DIRECT) {

    if (!dto.memberIds || dto.memberIds.length !== 2) {
      throw new BadRequestException(
        'Direct conversation phải có đúng 2 user',
      );
    }

    const [userA, userB] = dto.memberIds;

    const existed = await this.existsExactDirectConversation(userA, userB);

    if (existed) {
      throw new ConflictException(
        'Conversation direct giữa 2 user này đã tồn tại',
      );
    }
  }

  /* =====================================================
   * 2️⃣ TẠO CONVERSATION (GIỮ NGUYÊN CODE CỦA MÀY)
   * ===================================================== */
  const entity = this.convRepo.create({
    id: generateId(),
    createdBy: dto.userId,
    type: dto.type === ConversationType.DIRECT ? 0 : 1,
    title: dto.name,
    avatar: dto.avatar,
    backgroundImage: dto.backgroundImage,
  });

  const saved = await this.convRepo.save(entity);

  /* =====================================================
   * 3️⃣ TẠO MEMBERS + STATES (GIỮ NGUYÊN)
   * ===================================================== */
  const members: ConversationMember[] = [];
  const states: ConversationMemberState[] = [];

  for (const userId of dto.memberIds) {
    const member = this.convRepo.manager.create(ConversationMember, {
      id: generateId(),
      conversation: saved,
      userId,
      role: userId === dto.userId ? 1 : 0,
      joinedAt: new Date(),
    });
    members.push(member);

    const state = this.convRepo.manager.create(ConversationMemberState, {
      id: generateId(),
      conversation: saved,
      userId,
      pinnedOrder: null,
      unread: 0,
      hidden: false,
      deletedAt: null,
      lastReadAt: null,
    });
    states.push(state);
  }

  await this.convRepo.manager.save(ConversationMember, members);
  await this.convRepo.manager.save(ConversationMemberState, states);

  /* =====================================================
   * 4️⃣ LOAD + POPULATE (GIỮ NGUYÊN)
   * ===================================================== */
  const reloadedConv = await this.convRepo.findOne({
    where: { id: saved.id },
    relations: ['members', 'memberStates'],
  });

  const populated = await this.populateConversationUsers(reloadedConv!);
  return res(populated, 'Tạo cuộc hội thoại thành công');
}

      private removeVietnameseAccents(str: string): string {
        if (!str) return '';
        
        str = str.toLowerCase();
        str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
        str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
        str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
        str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
        str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
        str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
        str = str.replace(/đ/g, 'd');
        str = str.replace(/\s+/g, ' ').trim();
        
        return str;
      }

    async list(
      userId: string,
      limit?: number,
      skip?: number,
      search?: string,
    ) {
      const uid = this.validateId(userId);
      const pageLimit = limit ? Number(limit) : 20;
      const pageSkip = skip ? Number(skip) : 0;
      const searchTerm = search?.trim();

      // ✅ Build query cơ bản
      const query = this.convRepo
        .createQueryBuilder('c')
        .leftJoinAndSelect('c.members', 'm')
        .leftJoinAndSelect('c.memberStates', 'ms')
        .where('m.userId = :uid', { uid })
        .andWhere('(ms.userId = :uid AND ms.deletedAt IS NULL) OR ms.userId != :uid', { uid });

      // ✅ Lấy tất cả conversations của user
      const allConvs = await query
        .orderBy('c.updatedAt', 'DESC')
        .getMany();

      // ✅ Lọc để chỉ giữ conversations mà user có quyền xem
      const filteredConvs = allConvs.filter(conv => {
        const userState = conv.memberStates?.find(ms => ms.userId === uid);
        return userState && !userState.deletedAt;
      });

      // ✅ Nếu có search
      let searchedConvs = filteredConvs;
      
      if (searchTerm) {
        const searchNormalized = this.removeVietnameseAccents(searchTerm.toLowerCase());
        
        // Lấy tất cả userId từ conversations (loại trừ user hiện tại)
        const allUserIds = new Set<string>();
        filteredConvs.forEach(conv => {
          if (String(conv.type) === '0') { // type = direct
            conv.members?.forEach(m => {
              if (m.userId !== uid) {
                allUserIds.add(m.userId);
              }
            });
          }
        });

        // Load thông tin tất cả users một lần
        const users = await Promise.all(
          Array.from(allUserIds).map(id => this.usersService.findById2(id))
        );
        
        // Tạo map userId -> userName
        const userNameMap = new Map<string, string>();
        users.forEach(user => {
          if (user) {
            userNameMap.set(user.id, user.name || '');
          }
        });

        // Filter conversations
        searchedConvs = filteredConvs.filter(conv => {
          // ⭐ Nếu type = direct → tìm theo tên members (không bao gồm user hiện tại)
          if (String(conv.type) === '0') {
            const otherMemberNames = conv.members
              ?.filter(m => m.userId !== uid)
              .map(m => userNameMap.get(m.userId) || '') || [];
            
            return otherMemberNames.some(name => {
              const nameNormalized = this.removeVietnameseAccents(name.toLowerCase());
              const nameOriginal = name.toLowerCase();
              
              return nameOriginal.includes(searchTerm.toLowerCase()) || 
                    nameNormalized.includes(searchNormalized);
            });
          }
          
          // ⭐ Nếu type = group → tìm theo title
          if (String(conv.type) === '1') {
            const title = conv.title || '';
            const titleNormalized = this.removeVietnameseAccents(title.toLowerCase());
            const titleOriginal = title.toLowerCase();
            
            return titleOriginal.includes(searchTerm.toLowerCase()) || 
                  titleNormalized.includes(searchNormalized);
          }
          
          return false;
        });
      }

      // ✅ Tính tổng số sau khi search
      const totalCount = searchedConvs.length;

      // ✅ Áp dụng phân trang ở memory
      const paginatedConvs = searchedConvs.slice(pageSkip, pageSkip + pageLimit);

      // ✅ Populate user data cho conversations sau phân trang
      const populatedConvs = await Promise.all(
        paginatedConvs.map(async (conv) => {
          try {
            return await this.populateConversationUsers(conv);
          } catch (error) {
            console.warn(`Failed to populate conversation ${conv.id}:`, error.message);
            return null;
          }
        })
      );

      // ✅ Lọc bỏ các conversations null (failed to populate)
      const validConvs = populatedConvs.filter(conv => conv !== null);

      // ✅ Trả về với metadata phân trang
      return {
        status: 1,
        message: 'Danh sách cuộc hội thoại',
        count: validConvs.length,
        total: totalCount,
        limit: pageLimit,
        skip: pageSkip,
        hasMore: pageSkip + pageLimit < totalCount,
        data: validConvs,
      };
    }

  // Chi tiết conversation  
  async detail(userId: string, id: string) {
    const uid = this.validateId(userId);
    const cid = this.validateId(id);
    const conv = await this.convRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.members', 'm')
      .leftJoinAndSelect('c.memberStates', 'ms')
      .where('c.id = :cid', { cid })
      .andWhere('ms.userId = :uid AND ms.deletedAt IS NULL', { uid })
      .getOne();

    if (!conv) throw new NotFoundException('Không tìm thấy cuộc hội thoại');
    
    // ✅ Populate user data và wrap với res()
    const populated = await this.populateConversationUsers(conv);
    return res(populated, 'Chi tiết cuộc hội thoại');
  }

  async updateConversation(userId: string, id: string, dto: UpdateConversationDto) {
    const uid = this.validateId(userId);
    const cid = this.validateId(id);
    const conv = await this.convRepo.findOneBy({ id: cid });
    if (!conv || conv.createdBy !== uid) {
      throw new ForbiddenException('Không phải chủ conversation');
    }
    await this.convRepo.update(cid, dto);
    const updated = await this.convRepo.findOneBy({ id: cid });
    return res(updated, 'Cập nhật thành công');
  }

  async pin(userId: string, convId: string, pinnedOrder?: number) {
    const uid = this.validateId(userId);
    const cid = this.validateId(convId);

    const maxRes = await this.pool.request().query(`
      SELECT MAX(JSON_VALUE(value, '$.pinnedOrder')) AS maxOrder
      FROM conversations
      CROSS APPLY OPENJSON(memberStates)
      WHERE id = '${cid}' AND JSON_VALUE(value, '$.userId') = '${uid}'
    `);
    const order = pinnedOrder ?? (Number(maxRes.recordset[0]?.maxOrder || 0) + 1);

    await this.pool.request().query(`
      UPDATE conversations
      SET memberStates = JSON_MODIFY(memberStates, '$[?(@.userId == "${uid}")].pinnedOrder', ${order})
      WHERE id = '${cid}'
    `);

    return { status: 1, message: 'Đã ghim cuộc hội thoại', count: 1, data: { pinnedOrder: order } };
  }

  async unpin(userId: string, convId: string) {
    const uid = this.validateId(userId);
    const cid = this.validateId(convId);

    await this.pool.request().query(`
      UPDATE conversations
      SET memberStates = JSON_MODIFY(memberStates, '$[?(@.userId == "${uid}")].pinnedOrder', NULL)
      WHERE id = '${cid}'
    `);

    return res({}, 'Đã bỏ ghim');
  }

  async deleteSoft(userId: string, convId: string) {
    try {
      const uid = this.validateId(userId);
      const cid = this.validateId(convId);

      const result = await this.pool.request()
        .input('userId', uid)
        .input('convId', cid)
        .query(`
          UPDATE conversation_member_states
          SET deletedAt = GETDATE(), hidden = 1
          WHERE conversationId = @convId 
            AND userId = @userId
        `);

      if (result.rowsAffected[0] === 0) {
        throw new NotFoundException('Không tìm thấy cuộc hội thoại');
      }

      return { message: 'Đã xoá cuộc hội thoại phía bạn' };
    } catch (error) {
      console.error('deleteSoft error:', error);
      throw error;
    }
  }

  async deleteHard(userId: string, convId: string) {
    const uid = this.validateId(userId);
    const cid = this.validateId(convId);
    const conv = await this.convRepo.findOneBy({ id: cid });
    if (!conv || conv.createdBy !== uid) {
      throw new ForbiddenException('Chỉ người tạo mới được xoá vĩnh viễn');
    }
    await this.convRepo.delete(cid);
    return res({}, 'Đã xoá vĩnh viễn cuộc hội thoại');
  }

  async updateLastMessage(params: {
    conversationId: string;
    messageId: string;
    lastMessagePreview: string;
  }) {
    const { conversationId, messageId, lastMessagePreview } = params;

    await this.pool.request().query(`
      UPDATE ${this.dbname}.conversations
      SET
        lastMessageId = '${messageId}',
        lastMessagePreview = N'${lastMessagePreview}',
        lastMessageAt = GETDATE(),
        updatedAt = GETDATE()
      WHERE id = '${conversationId}'
    `);


    return {
      conversationId,
      lastMessageId: messageId,
      lastMessagePreview,
      lastMessageAt: new Date().toISOString(),
    };
  }

  async markRead(conversationId: string, userId: string) {
    const uid = this.validateId(userId);
    const cid = this.validateId(conversationId);

    await this.pool.request().query(`
      UPDATE conversations
      SET memberStates = JSON_MODIFY(memberStates, '$[?(@.userId == "${uid}")].lastReadAt', GETDATE())
      WHERE id = '${cid}'
    `);

    return res({}, 'Đã đánh dấu đã đọc');
  }
}