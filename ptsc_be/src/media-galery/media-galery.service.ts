import { Injectable, InternalServerErrorException, BadRequestException, HttpException } from '@nestjs/common';
import { CreateMediaGaleryDto } from './dto/create-media-galery.dto';
import { UpdateMediaGaleryDto } from './dto/update-media-galery.dto';
import { AlbumImageEntity } from 'src/album-images/entities/album-image.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { VideoEntity } from 'src/videos/entities/video.entity';
import { VideosService } from 'src/videos/videos.service';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { In } from 'typeorm';
import { AlbumLike } from 'src/album-images/entities/album-like.entity';
import { VideoLike } from 'src/videos/entities/video-like.entity';
import { MediaView } from './entities/media-view.entity';

@Injectable()
export class MediaGaleryService {
  constructor(
    @InjectRepository(AlbumImageEntity, 'mssqlConnection')
    private readonly albumRepository: Repository<AlbumImageEntity>,
    @InjectRepository(VideoEntity, 'mssqlConnection')
    private readonly videoRepository: Repository<VideoEntity>,
    @InjectRepository(OrganizationUnitEntity, 'mssqlConnection')
    private readonly orgRepository: Repository<OrganizationUnitEntity>,
    @InjectRepository(AlbumLike, 'mssqlConnection')
    private readonly albumLikeRepository: Repository<AlbumLike>,
    @InjectRepository(VideoLike, 'mssqlConnection')
    private readonly videoLikeRepository: Repository<VideoLike>,
    @InjectRepository(MediaView, 'mssqlConnection')
    private readonly mediaViewRepository: Repository<MediaView>,
    private readonly videosService: VideosService,
  ) { }

  /**
   * Kiểm tra xem string có phải là GUID/UUID hợp lệ không
   */
  private isValidGuid(str: string): boolean {
    const guidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return guidRegex.test(str);
  }

  create(createMediaGaleryDto: CreateMediaGaleryDto) {
    return 'This action adds a new mediaGalery';
  }


  private normalizeFilterParams(query: any) {
    const { filter, topic, page, limit, status, type, organizationUnitId, isComment, startDate, endDate, sortBy, sortOrder, sort, ...rest } = query;

    let parsedSort = {};
    if (sort) {
      try {
        parsedSort = typeof sort === 'string' ? JSON.parse(sort) : sort;
      } catch (e) {
        console.error('Error parsing sort param:', e);
      }
    } else if (filter?.sort) {
      try {
        parsedSort = typeof filter.sort === 'string' ? JSON.parse(filter.sort) : filter.sort;
      } catch (e) {
        console.error('Error parsing filter.sort param:', e);
      }
    }

    if (Object.keys(parsedSort).length === 0) {
      const sBy = filter?.sortBy || sortBy || 'createdAt';
      const sOrder = (filter?.sortOrder || sortOrder || 'DESC').toUpperCase();
      parsedSort[sBy] = sOrder === 'DESC' ? -1 : 1;
    }

    return {
      ...rest,
      page: page,
      limit: limit,
      sort: parsedSort,
      orFields: filter?.orFields,
      topic: filter?.topic || topic,
      status: filter?.status || status,
      type: filter?.type || type,
      organizationUnitId: filter?.organizationUnitId || organizationUnitId,
      isComment: filter?.isComment !== undefined ? filter.isComment : isComment,
      title: filter?.title || query.title || filter?.q || query.q,
      tags: filter?.tags,
      department: filter?.department,
      startDate: filter?.startDate || startDate,
      endDate: filter?.endDate || endDate,
      sortBy: filter?.sortBy || sortBy || 'createdAt',
      sortOrder: filter?.sortOrder || sortOrder || 'DESC'
    };
  }

  private formatDate(date: Date | null | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  async findAll(query: any, user?: any) {
    const userId = user?.userId || null;
    const normalizedQuery = this.normalizeFilterParams(query);
    const page = parseInt(normalizedQuery.page) || 1;
    const limit = parseInt(normalizedQuery.limit) || 10;
    const { topic, department, type, startDate, endDate, sortBy, sortOrder, title } = normalizedQuery;

    let mappedAlbums: any[] = [];
    let mappedVideos: any[] = [];
    try {
      // 1. Lấy dữ liệu từ AlbumImage
      if (!type || type === 'image') {
        const albumQB = this.albumRepository.createQueryBuilder('album')
          .where('album.status = :status', { status: 1 });

        if (title) {
          albumQB.andWhere('album.title LIKE :title', { title: `%${title}%` });
        }
        if (topic) albumQB.andWhere('album.topic = :topic', { topic });
        if (department) albumQB.andWhere('album.department = :department', { department });
        if (startDate) albumQB.andWhere('album.createdAt >= :startDate', { startDate: new Date(startDate) });
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          albumQB.andWhere('album.createdAt <= :endDate', { endDate: end });
        }

        // Thêm subquery để lấy tổng Like và Comment
        albumQB.addSelect(subQuery => {
          return subQuery.select('COUNT(al.id)', 'count')
            .from('album_like', 'al')
            .where('al.album_id = CAST(album.id AS NVARCHAR(MAX)) AND al.is_like = 1');
        }, 'totalLikes');

        albumQB.addSelect(subQuery => {
          return subQuery.select('COUNT(dc.id)', 'count')
            .from('document_comments', 'dc')
            .where('dc.document_id = CAST(album.id AS NVARCHAR(MAX))');
        }, 'totalComments');

        const { entities, raw } = await albumQB.getRawAndEntities();

        mappedAlbums = entities.map((item, index) => ({
          id: item.id,
          title: item.title,
          thumbnail: item.thumbnail,
          thumbnailFileId: item.thumbnailFileId,
          imageCount: item.images ? item.images.length : 0,
          createdAt: item.createdAt,
          type: 'image',
          topic: item.topic,
          department: item.department,
          views: item.views || 0,
          totalLikes: Number(raw[index].totalLikes || 0),
          totalComments: Number(raw[index].totalComments || 0)
        }));
      }

      // 2. Lấy dữ liệu từ Video
      if (!type || type === 'video') {
        const videoQB = this.videoRepository.createQueryBuilder('video')
          .where('video.status = :status', { status: 1 });

        if (title) {
          videoQB.andWhere('video.title LIKE :title', { title: `%${title}%` });
        }
        if (topic) videoQB.andWhere('video.topic = :topic', { topic });
        if (department) videoQB.andWhere('video.department = :department', { department });
        if (startDate) videoQB.andWhere('video.createdAt >= :startDate', { startDate: new Date(startDate) });
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          videoQB.andWhere('video.createdAt <= :endDate', { endDate: end });
        }

        // Thêm subquery để lấy tổng Like và Comment
        videoQB.addSelect(subQuery => {
          return subQuery.select('COUNT(vl.id)', 'count')
            .from('video_like', 'vl')
            .where('vl.video_id = CAST(video.id AS NVARCHAR(MAX)) AND vl.is_like = 1');
        }, 'totalLikes');

        videoQB.addSelect(subQuery => {
          return subQuery.select('COUNT(dc.id)', 'count')
            .from('document_comments', 'dc')
            .where('dc.document_id = CAST(video.id AS NVARCHAR(MAX))');
        }, 'totalComments');

        const { entities, raw } = await videoQB.getRawAndEntities();

        mappedVideos = entities.map((item, index) => ({
          id: item.id,
          title: item.title,
          thumbnail: item.thumbnail,
          thumbnailFileId: item.thumbnailFileId,
          createdAt: item.createdAt,
          type: 'video',
          topic: item.topic,
          department: item.department,
          duration: item.duration,
          durationText: item.durationText,
          views: item.views || 0,
          totalLikes: Number(raw[index].totalLikes || 0),
          totalComments: Number(raw[index].totalComments || 0)
        }));
      }

      // 3. Kết hợp và sắp xếp linh hoạt
      const { sort } = normalizedQuery;
      const combined = [...mappedAlbums, ...mappedVideos].sort((a, b) => {
        const sortKeys = Object.keys(sort);
        if (sortKeys.length === 0) {
          // Mặc định sort theo createdAt DESC
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }

        for (const key of sortKeys) {
          const order = sort[key];
          const valA = a[key];
          const valB = b[key];

          const fieldA = valA instanceof Date ? valA.getTime() : valA;
          const fieldB = valB instanceof Date ? valB.getTime() : valB;

          if (fieldA !== fieldB) {
            if (order === 1) { // ASC
              return fieldA > fieldB ? 1 : -1;
            } else { // DESC
              return fieldA < fieldB ? 1 : -1;
            }
          }
        }
        return 0;
      });

      // 4. Phân trang thủ công
      const total = combined.length;
      const startIndex = (page - 1) * limit;
      const rawItems = combined.slice(startIndex, startIndex + limit);

      // 5. Định dạng ngày tháng và Map tên phòng ban
      const deptIds = [...new Set(rawItems.map(i => i.department).filter(id => !!id))];
      const depts = deptIds.length > 0
        ? await this.orgRepository.find({ where: { id: In(deptIds) }, select: ['id', 'name'] })
        : [];
      const deptMap = new Map(depts.map(d => [d.id, d.name]));

      // Lấy danh sách likes của user hiện tạil
      let userAlbumLikes: string[] = [];
      let userVideoLikes: string[] = [];

      if (userId) {
        const albumIds = rawItems.filter(i => i.type === 'image').map(i => i.id);
        const videoIds = rawItems.filter(i => i.type === 'video').map(i => i.id);

        if (albumIds.length > 0) {
          const aLikes = await this.albumLikeRepository.find({
            where: { albumId: In(albumIds), userId: userId, isLike: true },
            select: ['albumId']
          });
          userAlbumLikes = aLikes.map(l => l.albumId);
        }

        if (videoIds.length > 0) {
          const vLikes = await this.videoLikeRepository.find({
            where: { videoId: In(videoIds), userId: userId, isLike: true },
            select: ['videoId']
          });
          userVideoLikes = vLikes.map(l => l.videoId);
        }
      }

      const items = rawItems.map(item => ({
        ...item,
        department: deptMap.get(item.department) || null,
        meLike: item.type === 'image'
          ? userAlbumLikes.includes(item.id)
          : userVideoLikes.includes(item.id),
        createdAt: this.formatDate(item.createdAt)
      }));

      return {
        data: items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (e) {
      if (e instanceof HttpException) throw e;
      console.error('MediaGaleryService.findAll Error:', e);
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy danh sách media.');
    }
  }

  async findOne(id: string, type: string, user?: any) {
    try {
      if (!this.isValidGuid(id)) {
        throw new BadRequestException('ID không hợp lệ.');
      }

      const userId = user?.userId || null;
      let result: any;
      if (type === 'image') {
        result = await this.albumRepository.findOne({ where: { id } });
      } else {
        result = await this.videosService.findOne(id, userId);
      }

      if (result) {
        // Tăng view khi người dùng đã đăng nhập và chưa xem
        if (userId) {
          const hasViewed = await this.mediaViewRepository.findOne({
            where: { mediaId: id, userId: String(userId), type } as any
          });

          if (!hasViewed) {
            await this.mediaViewRepository.save({
              mediaId: id,
              userId: String(userId),
              type
            });

            if (type === 'image') {
              await this.albumRepository.increment({ id }, 'views', 1);
            } else {
              await this.videoRepository.increment({ id }, 'views', 1);
            }
            result.views = (result.views || 0) + 1;
          }
        }
        // Tên phòng ban
        if (result.department) {
          const dept = await this.orgRepository.findOne({
            where: { id: result.department },
            select: ['id', 'name']
          });
          result.department = dept?.name || null;
        }

        // meLike
        result.meLike = false;
        if (userId) {
          if (type === 'image') {
            const like = await this.albumLikeRepository.findOne({
              where: { albumId: id, userId: userId, isLike: true }
            });
            result.meLike = !!like;
          } else {
            const like = await this.videoLikeRepository.findOne({
              where: { videoId: id, userId: userId, isLike: true }
            });
            result.meLike = !!like;
          }
        }

        // Bổ sung totalLikes và totalComments cho Album (Video đã có từ videosService)
        if (type === 'image') {
          const likeCount = await this.albumLikeRepository.count({
            where: { albumId: id, isLike: true }
          });
          result.totalLikes = likeCount || 0;

          const commentCountResult = await this.albumRepository.query(
            'SELECT COUNT(*) as count FROM document_comments WHERE document_id = @0',
            [id]
          );
          result.totalComments = commentCountResult[0]?.count || 0;
        }
      }

      return result;
    } catch (e) {
      if (e instanceof HttpException) throw e;
      console.error('MediaGaleryService.findOne Error:', e);
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy thông tin chi tiết media.');
    }
  }

}
