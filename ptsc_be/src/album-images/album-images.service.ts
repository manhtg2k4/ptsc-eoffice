import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAlbumImageDto } from './dto/create-album-image.dto';
import { UpdateAlbumImageDto } from './dto/update-album-image.dto';
import { FilterAlbumImageDto } from './dto/filter-album-image.dto';
import { PaginatedResponseDto } from './dto/paginated-response.dto';
import { AlbumImageEntity, AlbumStatus, AlbumType } from './entities/album-image.entity';
import { TopicEntity } from '../topic/entities/topic.entity';
import {
  checkSameValueFilters,
  applyOrFilterConditions,
  applyAndFilterConditions,
  AlbumFilterParams,
} from './helpers/album-filter.helper';
import { FilesManagementService } from 'src/files-managerment/files-management-mssql.service';
import { AlbumLike } from './entities/album-like.entity';
import { AlbumGateway } from './album.gateway';
import { LikeAlbumImageDto } from './dto/like-album-image.dto';
import { UserEntity } from 'src/users/entities/user.entity';

@Injectable()
export class AlbumImagesService {
  constructor(
    @InjectRepository(AlbumImageEntity, 'mssqlConnection')
    private readonly albumImageRepository: Repository<AlbumImageEntity>,
    @InjectRepository(TopicEntity, 'mssqlConnection')
    private readonly topicRepository: Repository<TopicEntity>,
    @InjectRepository(AlbumLike, 'mssqlConnection')
    private readonly albumLikeRepository: Repository<AlbumLike>,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepository: Repository<UserEntity>,
    private readonly filesManagementService: FilesManagementService,
    private readonly albumGateway: AlbumGateway,
  ) { }

  /**
   * Kiểm tra xem string có phải là GUID hợp lệ không
   */
  private isValidGuid(str: string): boolean {
    const guidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return guidRegex.test(str);
  }

  /**
   * Tìm topic theo ID và trả về ID
   * Nếu không tìm thấy sẽ throw error
   */
  async resolveTopicId(topicInput: string): Promise<string | null> {
    if (!topicInput) return null;

    // Kiểm tra format GUID trước
    if (!this.isValidGuid(topicInput)) {
      throw new BadRequestException({
        success: false,
        message: 'ID chủ đề không hợp lệ!',
        errors: [{ field: 'topic', message: `ID chủ đề phải là GUID hợp lệ. Vui lòng chọn chủ đề từ danh sách.` }],
      });
    }

    // Tìm theo ID
    const topic = await this.topicRepository.findOne({
      where: { id: topicInput },
      select: ['id', 'name'],
    });

    // Nếu không tìm thấy, báo lỗi
    if (!topic) {
      throw new BadRequestException({
        success: false,
        message: 'Chủ đề không tồn tại!',
        errors: [{ field: 'topic', message: `Không tìm thấy chủ đề với ID: ${topicInput}. Vui lòng chọn chủ đề từ danh sách.` }],
      });
    }

    return topic.id;
  }

  /**
   * Lấy thông tin topic theo ID để trả về response
   */
  async getTopicInfo(topicId: string): Promise<{ id: string; name: string } | null> {
    if (!topicId) return null;

    // Kiểm tra xem topicId có phải là GUID hợp lệ không
    if (this.isValidGuid(topicId)) {
      // Nếu là GUID, tìm theo ID
      const topic = await this.topicRepository.findOne({
        where: { id: topicId },
        select: ['id', 'name'],
      });

      if (topic) {
        return { id: topic.id, name: topic.name };
      }
    } else {
      // Nếu không phải GUID (dữ liệu cũ là tên), tìm theo tên
      const topic = await this.topicRepository.findOne({
        where: { name: topicId },
        select: ['id', 'name'],
      });

      if (topic) {
        return { id: topic.id, name: topic.name };
      }

      // Nếu không tìm thấy, trả về tên cũ để hiển thị
      return { id: '', name: topicId };
    }

    return null;
  }

  /**
   * Lấy danh sách tất cả chủ đề
   */
  async getAllTopics(): Promise<{ id: string; name: string }[]> {
    const topics = await this.topicRepository.find({
      select: ['id', 'name'],
      order: { name: 'ASC' },
    });
    return topics.map(t => ({ id: t.id, name: t.name }));
  }

  /**
   * Lấy chi tiết chủ đề theo ID
   */
  async getTopicById(id: string): Promise<{ id: string; name: string } | null> {
    const topic = await this.topicRepository.findOne({
      where: { id },
      select: ['id', 'name'],
    });
    return topic ? { id: topic.id, name: topic.name } : null;
  }

  /**
   * Đếm số album nổi bật đang active
   */
  async countFeaturedAlbums(): Promise<number> {
    return await this.albumImageRepository.count({
      where: { albumType: AlbumType.FEATURED, status: AlbumStatus.ACTIVE },
    });
  }

  /**
   * Kiểm tra giới hạn album nổi bật (tối đa 10)
   */
  private async checkFeaturedLimit(currentAlbumId?: string): Promise<void> {
    const count = await this.countFeaturedAlbums();

    // Nếu đang update album đã là featured thì không cần check
    if (currentAlbumId) {
      const currentAlbum = await this.albumImageRepository.findOne({ where: { id: currentAlbumId } });
      if (currentAlbum?.albumType === AlbumType.FEATURED) {
        return; // Album này đã là featured, không tăng số lượng
      }
    }
  }

  /**
   * Làm giàu dữ liệu album với thông tin file và topic
   */
  private async enrichAlbumDetails(album: AlbumImageEntity, userId?: string): Promise<any> {
    try {
      const result: any = { ...album };

      // 1. Get topic info
      const topicInfo = await this.getTopicInfo(album.topic);
      result.topicName = topicInfo?.name || null;
      // result.topic = topicInfo?.name || null; // DONT DO THIS - breaks updates

      // 2. Get file info
      const files = await this.filesManagementService.getLatestFilesByObject(
        'album_images',
        album.id.toString(),
        { page: 1, limit: 10 },
      );

      if (files.data && files.data.length > 0) {
        // Map size fields based on typeSize
        files.data.forEach((file) => {
          const fileInfo = {
            id: file.id,
            url: `/files/view/${file.id}`,
            filename: file.file_name,
            mimetype: file.mime_type,
            storage_path: file.storage_path,
            typeSize: file.typeSize,
          };

          if (
            String(file.id) === String(album.sizeSmall) ||
            (!album.sizeSmall && file.typeSize === 'sizeSmall')
          ) {
            result.sizeSmall = fileInfo;
          } else if (
            String(file.id) === String(album.sizeMedium) ||
            (!album.sizeMedium && file.typeSize === 'sizeMedium')
          ) {
            result.sizeMedium = fileInfo;
          } else if (
            String(file.id) === String(album.sizeBig) ||
            (!album.sizeBig && file.typeSize === 'sizeBig')
          ) {
            result.sizeBig = fileInfo;
          }
        });
      }

      // 3. Enrich album with like counts and meLike status
      const likeCount = await this.albumLikeRepository.count({
        where: { albumId: album.id, isLike: true },
      });
      result.totalLikes = likeCount || 0;
      result.meLike = false;
      if (userId) {
        const userLike = await this.albumLikeRepository.findOne({
          where: { albumId: album.id, userId: userId, isLike: true },
        });
        result.meLike = !!userLike;
      }

      return result;
    } catch (error) {
      console.error(`Error enriching album ${album.id}:`, error);
      return album;
    }
  }

  async create(
    createAlbumImageDto: CreateAlbumImageDto,
    userId?: string,
    userName?: string,
  ): Promise<AlbumImageEntity> {
    // Check giới hạn album nổi bật
    if (createAlbumImageDto.albumType === 'featured') {
      await this.checkFeaturedLimit();
    }

    // Resolve topic ID từ input (có thể là tên hoặc ID)
    const topicId = createAlbumImageDto.topic
      ? await this.resolveTopicId(createAlbumImageDto.topic)
      : undefined;

    // Lấy thông tin phòng ban của người dùng
    let department: string | undefined = undefined;
    if (userId) {
      const user = await this.userRepository.findOne({
        where: { id: userId } as any,
        relations: ['parent']
      });
      department = user?.parent?.id;
    }

    const album = this.albumImageRepository.create({
      ...createAlbumImageDto,
      topic: topicId || undefined, // Lưu ID của topic
      images: createAlbumImageDto.images || [],
      status: AlbumStatus.ACTIVE,
      createdBy: userId || createAlbumImageDto.createdBy,
      createdByName: userName || createAlbumImageDto.createdByName,
      department: department || (createAlbumImageDto as any).department,
    });
    const savedAlbum = await this.albumImageRepository.save(album);

    const result = await this.albumImageRepository.findOne({ where: { id: savedAlbum.id } });
    return result!;
  }

  async findAll(userId?: string): Promise<any[]> {
    const albums = await this.albumImageRepository.find({
      where: { status: AlbumStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
    return await Promise.all(albums.map(album => this.enrichAlbumDetails(album, userId)));
  }

  async findWithFilter(filterDto: FilterAlbumImageDto, userId?: string): Promise<PaginatedResponseDto<AlbumImageEntity>> {
    const {
      filter = {},
      page = 1,
      limit = 25,
      sort = {},
      isExport,
    } = filterDto;

    // Parse page và limit
    const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
    const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;

    // Extract filter values
    const keyword = filter.keyword;
    const topic = filter.topic;
    let albumType = filter.albumType || filter.album_type;
    // Map albumType numeric to string: 1 -> normal, 2 -> featured
    if (albumType === '1' || albumType === 1) albumType = 'normal';
    else if (albumType === '2' || albumType === 2) albumType = 'featured';
    // Theo yêu cầu: createdByName sẽ tìm theo Id người dùng (createdBy) chứ không gửi name
    const createdBy = filter.createdBy || filter.created_by || filter.createdByName || filter.created_by_name;
    const createdByName = undefined; // Không lọc theo trường name nữa (luôn tìm theo Id)
    const title = filter.title;
    const description = filter.description;

    // Date range filter (hỗ trợ nested object hoặc flat)
    const dateFilter = filter.createdAt || filter.created_at || filter.publishedDate || filter.published_date || filter.publishedAt || filter.published_at;
    const fromDate = dateFilter?.startDate || dateFilter?.start_date;
    const toDate = dateFilter?.endDate || dateFilter?.end_date;

    const queryBuilder = this.albumImageRepository.createQueryBuilder('album');

    // Chỉ lấy album đang hoạt động (không bị xóa mềm)
    queryBuilder.where('album.status = :status', { status: AlbumStatus.ACTIVE });

    // Keyword search (title + description) - hỗ trợ tìm kiếm không phân biệt dấu
    if (keyword) {
      queryBuilder.andWhere(
        '(album.title COLLATE Vietnamese_CI_AI LIKE :keyword COLLATE Vietnamese_CI_AI OR album.description COLLATE Vietnamese_CI_AI LIKE :keyword COLLATE Vietnamese_CI_AI)',
        { keyword: `%${keyword}%` }
      );
    }

    // Sử dụng helper để kiểm tra OR logic
    const filterParams: AlbumFilterParams = { title, description, topic, albumType, createdBy, createdByName };
    const { hasSameValue, searchValue } = checkSameValueFilters(filterParams);

    // Resolve topic IDs (hỗ trợ cả GUID và tên)
    let topicIds: string[] = [];
    if (topic) {
      if (this.isValidGuid(topic)) {
        topicIds = [topic];
      } else {
        // Tìm kiếm topic không phân biệt dấu
        const topicsByName = await this.topicRepository
          .createQueryBuilder('t')
          .where('t.name COLLATE Vietnamese_CI_AI LIKE :name COLLATE Vietnamese_CI_AI', { name: `%${topic}%` })
          .select(['t.id'])
          .getMany();
        topicIds = topicsByName.map(t => t.id);
      }
    }

    if (hasSameValue && searchValue) {
      // Tất cả filter có cùng giá trị -> dùng OR (sử dụng helper)
      applyOrFilterConditions(queryBuilder, filterParams, searchValue, topicIds);
    } else {
      // Các filter có giá trị khác nhau -> dùng AND (sử dụng helper)
      applyAndFilterConditions(queryBuilder, filterParams, topicIds);
    }

    // Date range filter
    if (fromDate) {
      queryBuilder.andWhere('album.createdAt >= :fromDate', { fromDate: new Date(fromDate) });
    }

    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('album.createdAt <= :toDate', { toDate: endDate });
    }

    // Sort handling
    const allowedSortFields = ['createdAt', 'views', 'shares', 'title', 'updatedAt', 'created_at', 'updated_at'];

    if (Object.keys(sort).length > 0) {
      for (const [field, direction] of Object.entries(sort)) {
        // Convert snake_case to camelCase for entity field
        const camelField = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        const validField = allowedSortFields.includes(field) || allowedSortFields.includes(camelField)
          ? camelField
          : 'createdAt';

        // Parse direction: 1, '1', 'asc', 'ASC' -> ASC; -1, '-1', 'desc', 'DESC' -> DESC
        let sortDirection: 'ASC' | 'DESC' = 'DESC';
        if (direction === 1 || direction === '1' || direction === 'asc' || direction === 'ASC') {
          sortDirection = 'ASC';
        }

        queryBuilder.orderBy(`album.${validField}`, sortDirection);
      }
    } else {
      queryBuilder.orderBy('album.createdAt', 'DESC');
    }

    const total = await queryBuilder.getCount();

    const skip = (pageNum - 1) * limitNum;
    queryBuilder.skip(skip).take(limitNum);

    const data = await queryBuilder.getMany();

    // Enrich data with file info and topic name
    const enrichedData = await Promise.all(
      data.map(album => this.enrichAlbumDetails(album, userId))
    );

    // Nếu isExport = 'true', format dữ liệu cho export
    if (isExport === 'true') {
      const formattedData = enrichedData.map((album) => {
        return {
          ...album,
          albumType: album.albumType === 'featured' ? 'Nổi bật' : 'Thường',
          status: album.status === 1 ? 'Hoạt động' : 'Không hoạt động',
        } as any;
      });
      return new PaginatedResponseDto(formattedData, total, pageNum, limitNum);
    }

    return new PaginatedResponseDto(enrichedData, total, pageNum, limitNum);
  }

  async findOne(id: string, userId?: string): Promise<AlbumImageEntity> {
    const album = await this.albumImageRepository.findOne({
      where: { id, status: AlbumStatus.ACTIVE }
    });
    if (!album) {
      throw new NotFoundException(`Album với id ${id} không tồn tại hoặc đã bị xóa`);
    }
    return await this.enrichAlbumDetails(album, userId);
  }

  async update(
    id: string,
    updateAlbumImageDto: UpdateAlbumImageDto,
    userId?: string,
    userName?: string,
  ): Promise<AlbumImageEntity> {
    const album = await this.albumImageRepository.findOne({ where: { id, status: AlbumStatus.ACTIVE } });
    if (!album) {
      throw new NotFoundException(`Album với id ${id} không tồn tại hoặc đã bị xóa`);
    }

    // Check giới hạn album nổi bật khi đổi sang featured
    if (updateAlbumImageDto.albumType === 'featured') {
      await this.checkFeaturedLimit(id);
    }

    const updateData: any = { ...updateAlbumImageDto };

    // Resolve topic ID nếu có cập nhật topic
    if (updateAlbumImageDto.topic) {
      const resolvedTopicId = await this.resolveTopicId(updateAlbumImageDto.topic);
      updateData.topic = resolvedTopicId || undefined;
    }

    if (!album.createdBy && userId) {
      updateData.createdBy = userId;
    }
    if (!album.createdByName && userName) {
      updateData.createdByName = userName;
    }

    Object.assign(album, updateData);
    return await this.albumImageRepository.save(album);
  }

  // Xóa mềm (soft delete)
  async softRemove(id: string): Promise<AlbumImageEntity> {
    const album = await this.albumImageRepository.findOne({
      where: { id: id as any, status: AlbumStatus.ACTIVE }
    });

    if (!album) {
      throw new NotFoundException(`Album với id ${id} không tồn tại hoặc đã bị xóa`);
    }

    album.status = AlbumStatus.DELETED;
    return await this.albumImageRepository.save(album);
  }

  // Xóa mềm nhiều album cùng lúc
  async softRemoveMany(ids: string[]): Promise<{ success: number; failed: number; errors: any[] }> {
    let success = 0;
    let failed = 0;
    const errors: any[] = [];

    for (const id of ids) {
      try {
        await this.softRemove(id);
        success++;
      } catch (error) {
        failed++;
        errors.push({ id, error: error.message });
      }
    }

    return { success, failed, errors };
  }

  // Khôi phục album đã xóa mềm
  async restore(id: string): Promise<AlbumImageEntity> {
    const album = await this.albumImageRepository.findOne({
      where: { id, status: AlbumStatus.DELETED }
    });

    if (!album) {
      throw new NotFoundException(`Album với id ${id} không tồn tại hoặc chưa bị xóa`);
    }

    album.status = AlbumStatus.ACTIVE;
    return await this.albumImageRepository.save(album);
  }

  // Lấy danh sách album đã xóa mềm
  async findDeleted(filterDto: FilterAlbumImageDto): Promise<PaginatedResponseDto<AlbumImageEntity>> {
    const {
      filter = {},
      page = 1,
      limit = 25,
      sort = {},
    } = filterDto;

    // Parse page và limit
    const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
    const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;

    const keyword = filter.keyword;

    const queryBuilder = this.albumImageRepository.createQueryBuilder('album');

    queryBuilder.where('album.status = :status', { status: AlbumStatus.DELETED });

    if (keyword) {
      // Tìm kiếm không phân biệt dấu
      queryBuilder.andWhere(
        '(album.title COLLATE Vietnamese_CI_AI LIKE :keyword COLLATE Vietnamese_CI_AI OR album.description COLLATE Vietnamese_CI_AI LIKE :keyword COLLATE Vietnamese_CI_AI)',
        { keyword: `%${keyword}%` }
      );
    }

    // Sort handling
    const allowedSortFields = ['createdAt', 'deletedAt', 'title', 'updatedAt'];

    if (Object.keys(sort).length > 0) {
      for (const [field, direction] of Object.entries(sort)) {
        const camelField = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        const validField = allowedSortFields.includes(field) || allowedSortFields.includes(camelField)
          ? camelField
          : 'deletedAt';

        let sortDirection: 'ASC' | 'DESC' = 'DESC';
        if (direction === 1 || direction === '1' || direction === 'asc' || direction === 'ASC') {
          sortDirection = 'ASC';
        }

        queryBuilder.orderBy(`album.${validField}`, sortDirection);
      }
    } else {
      queryBuilder.orderBy('album.createdAt', 'DESC');
    }

    const total = await queryBuilder.getCount();

    const skip = (pageNum - 1) * limitNum;
    queryBuilder.skip(skip).take(limitNum);

    const data = await queryBuilder.getMany();
    const enrichedData = await Promise.all(data.map(album => this.enrichAlbumDetails(album)));

    return new PaginatedResponseDto(enrichedData, total, pageNum, limitNum);
  }

  // Xóa vĩnh viễn (hard delete)
  async remove(id: string): Promise<void> {
    const album = await this.albumImageRepository.findOne({ where: { id } });
    if (!album) {
      throw new NotFoundException(`Album với id ${id} không tồn tại`);
    }
    await this.albumImageRepository.remove(album);
  }

  // Xóa vĩnh viễn nhiều album cùng lúc (hard delete)
  async hardRemoveMany(ids: string[]): Promise<{ success: number; failed: number; errors: any[] }> {
    let success = 0;
    let failed = 0;
    const errors: any[] = [];

    for (const id of ids) {
      try {
        await this.remove(id);
        success++;
      } catch (error) {
        failed++;
        errors.push({ id, error: error.message });
      }
    }

    return { success, failed, errors };
  }

  async incrementViews(id: string): Promise<AlbumImageEntity> {
    const album = await this.albumImageRepository.findOne({
      where: { id: id as any, status: AlbumStatus.ACTIVE }
    });
    if (!album) {
      throw new NotFoundException(`Album với id ${id} không tồn tại`);
    }
    album.views += 1;
    return await this.albumImageRepository.save(album);
  }

  async incrementShares(id: string): Promise<AlbumImageEntity> {
    const album = await this.albumImageRepository.findOne({
      where: { id: id as any, status: AlbumStatus.ACTIVE }
    });
    if (!album) {
      throw new NotFoundException(`Album với id ${id} không tồn tại`);
    }
    album.shares += 1;
    return await this.albumImageRepository.save(album);
  }

  async addImages(id: string, newImages: Record<string, any>[]): Promise<AlbumImageEntity> {
    const album = await this.albumImageRepository.findOne({
      where: { id: id as any, status: AlbumStatus.ACTIVE }
    });
    if (!album) {
      throw new NotFoundException(`Album với id ${id} không tồn tại`);
    }
    album.images = [...(album.images || []), ...newImages];
    return await this.albumImageRepository.save(album);
  }

  async likeImage(dto: LikeAlbumImageDto, userFromJwt: any) {
    try {
      // Lấy userId từ JWT
      const jwtUserId: string = userFromJwt?.user || userFromJwt?.sub || userFromJwt?.userId || userFromJwt?.id;
      if (!jwtUserId) {
        throw new BadRequestException('Không tìm thấy thông tin user từ token');
      }

      // Lấy thông tin user
      const user = await this.userRepository.findOne({
        where: { id: jwtUserId } as any,
      });
      const userName = user?.username || user?.name || 'Anonymous';

      const { albumId, isLike = true } = dto;

      // Kiểm tra xem hình ảnh có thuộc album không
      const album = await this.albumImageRepository.findOne({ where: { id: albumId } });
      if (!album) {
        throw new NotFoundException('Album không tồn tại');
      }

      // Kiểm tra đã có reaction chưa
      const existingReaction = await this.albumLikeRepository.findOne({
        where: { albumId, userId: jwtUserId },
      });

      if (existingReaction) {
        if (existingReaction.isLike === isLike) {
          // Bỏ reaction
          await this.albumLikeRepository.remove(existingReaction);

          // Lấy count mới
          const totalLikes = await this.albumLikeRepository.count({
            where: { albumId, isLike: true },
          });

          // Emit event
          this.albumGateway.emitAlbumLikeUpdate(albumId, {
            totalLikes,
            userId: jwtUserId,
            action: 'remove',
          });

          return {
            success: true,
            message: `Bỏ ${isLike ? 'like' : 'dislike'} thành công`,
            liked: null,
            totalLikes,
          };
        } else {
          // Đổi reaction
          existingReaction.isLike = isLike;
          await this.albumLikeRepository.save(existingReaction);

          const totalLikes = await this.albumLikeRepository.count({
            where: { albumId, isLike: true },
          });

          this.albumGateway.emitAlbumLikeUpdate(albumId, {
            totalLikes,
            userId: jwtUserId,
            action: 'switch',
          });

          return {
            success: true,
            message: `Đổi sang ${isLike ? 'like' : 'dislike'} thành công`,
            liked: isLike,
            totalLikes,
          };
        }
      }

      // Tạo mới
      const newReaction = this.albumLikeRepository.create({
        albumId,
        userId: jwtUserId,
        userName,
        isLike,
      });
      await this.albumLikeRepository.save(newReaction);

      const totalLikes = await this.albumLikeRepository.count({
        where: { albumId, isLike: true },
      });

      this.albumGateway.emitAlbumLikeUpdate(albumId, {
        totalLikes,
        userId: jwtUserId,
        action: 'add',
      });

      return {
        success: true,
        message: `${isLike ? 'Like' : 'Dislike'} thành công`,
        liked: isLike,
        totalLikes,
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Lỗi khi like album: ' + error.message);
    }
  }
}
