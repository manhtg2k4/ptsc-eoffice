
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, In } from 'typeorm';
import { News } from '../news/entities/news.entity';
import { Audit } from '../database/schema-sql/audit.entity';
import { TopicEntity } from '../topic/entities/topic.entity';
import { NewsComment } from '../news/entities/news-comment.entity';
import { NewsLike } from '../news/entities/news-like.entity';
import { OrganizationUnitEntity } from '../organization-unit/organization-unit_sql/organization-unit.entity';
import { DataExportService } from '../data-export/data-export.service';
import { SystemLogServiceSql } from '../systemLogManagement/system-log-service-sql';
import { ExportType } from '../data-export/dtos/data-export.dto';
import * as dayjs from 'dayjs';
import { SQLSVRepository } from '../database/sqlsvRepo';

@Injectable()
export class NewsStatisticsService {
  constructor(
    @InjectRepository(News, 'mssqlConnection')
    private readonly newsRepository: Repository<News>,
    @InjectRepository(Audit, 'mssqlConnection')
    private readonly auditRepository: Repository<Audit>,
    @InjectRepository(TopicEntity, 'mssqlConnection')
    private readonly topicRepository: Repository<TopicEntity>,
    @InjectRepository(NewsLike, 'mssqlConnection')
    private readonly newsLikeRepository: Repository<NewsLike>,
    @InjectRepository(OrganizationUnitEntity, 'mssqlConnection')
    private readonly orgUnitRepository: Repository<OrganizationUnitEntity>,
    private readonly dataExportService: DataExportService,
    private readonly systemLogService: SystemLogServiceSql,
    private readonly sqlsvRepo: SQLSVRepository,
  ) { }

  private normalizeFilterParams(query: any) {
    const { filter, topic, page, limit, status, type, organizationUnitId, isComment, sortBy, sortOrder, sort, ...rest } = query;

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

    // Nếu không có sort JSON, fallback về sortBy/sortOrder cũ
    if (Object.keys(parsedSort).length === 0 && (sortBy || filter?.sortBy)) {
      const sBy = filter?.sortBy || sortBy;
      const sOrder = (filter?.sortOrder || sortOrder || 'DESC').toUpperCase();
      parsedSort[sBy] = sOrder === 'DESC' ? -1 : 1;
    }

    // Động hóa bóc tách DateRange: Tìm cụm object bất kỳ có [{startDate}] hoặc [{endDate}] để đẩy lên root
    let rootStartDate = filter?.startDate || query.startDate;
    let rootEndDate = filter?.endDate || query.endDate;

    if (!rootStartDate && !rootEndDate && filter) {
      const dateKey = Object.keys(filter).find(k => {
        const v = filter[k];
        return v && typeof v === 'object' && (v.startDate || v.endDate);
      });
      if (dateKey) {
        rootStartDate = filter[dateKey].startDate;
        rootEndDate = filter[dateKey].endDate;
      }
    }

    const extractDateRange = (fieldName: string) => {
      const nested = filter?.[fieldName] || {};
      return {
        startDate: nested.startDate || filter?.startDate || query.startDate,
        endDate: nested.endDate || filter?.endDate || query.endDate
      };
    };

    const startDate = rootStartDate;
    const endDate = rootEndDate;

    // Ưu tiên filter object, fallback về các fields riêng lẻ
    return {
      ...rest,
      startDate,
      endDate,
      page: page || query.page,
      limit: limit || query.limit,
      sort: parsedSort,
      q: filter?.q,  // Tìm kiếm tổng quát
      orFields: filter?.orFields,  // Tìm OR theo nhiều fields
      topic: filter?.topic || topic,
      topicId: filter?.topicId,
      departmentId: filter?.departmentId,
      status: filter?.status || status,
      type: filter?.type || type,
      organizationUnitId: filter?.organizationUnitId || organizationUnitId,
      isComment: filter?.isComment !== undefined ? filter.isComment : isComment,  // Hỗ trợ cả filter[isComment] và isComment
      title: filter?.title,
      content: filter?.content,  // Tìm kiếm trong content
      tags: filter?.tags,
      rejectorName: filter?.rejectorName,
      submitterName: filter?.submitterName,
      authorName: filter?.authorName,
      authorDepartment: filter?.authorDepartment,  // Tìm kiếm theo phòng ban của tác giả
      reviewerName: filter?.reviewerName,
      recallReason: filter?.recallReason,  // Lý do thu hồi
      recalledByName: filter?.recalledByName,  // Người thu hồi
      submittedAt: extractDateRange('submittedAt'),
      cancellerName: filter?.cancellerName,
      deadline: extractDateRange('deadline'),
      createdAt: extractDateRange('createdAt'),
      recalledAt: filter?.recalledAt,
      publishedAt: extractDateRange('publishedAt'),
      approvedAt: extractDateRange('approvedAt'),
      top: filter?.top ? Number(filter?.top) : undefined,
      newsStatus: filter?.newsStatus !== undefined ? filter.newsStatus : query.newsStatus,
      time: query.time || filter?.time
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

  async findAll(query: any, userId: string, ipAddress: string) {
    try {
      const {
        page = 1,
        limit = 10,
        q,
        topic,
        department,
        status, // Filter by Audit status (actionCode or curStatusCode)
        top,
        submittedAt,
        deadline,
        createdAt,
        recalledAt,
        publishedAt,
        authorDepartment,
        title,
        newsStatus,
        sort,
      } = this.normalizeFilterParams(query);

      const queryBuilder = this.newsRepository.createQueryBuilder('news')
        .leftJoinAndSelect('news.topicEntity', 'topic')
        .leftJoinAndMapOne('news.authorDepartmentName', OrganizationUnitEntity, 'org', 'LTRIM(RTRIM(news.authorDepartment)) = LTRIM(RTRIM(org.id))')
        .leftJoinAndMapOne(
          'news.latestAudit',
          Audit,
          'audit',
          `audit.documentId = CAST(news.id AS NVARCHAR(MAX)) AND audit.id = (
                SELECT TOP 1 a2.id
                FROM audit a2
                WHERE a2.document_id = CAST("news"."id" AS NVARCHAR(MAX))
                AND a2.type_document = 'NEWS'
                ORDER BY a2.created_at DESC
        )`
        );

      // Thêm subqueries để lấy Like và Comment counts phục vụ sorting
      queryBuilder.addSelect(subQuery => {
        return subQuery.select('COUNT(nl.id)', 'count')
          .from(NewsLike, 'nl')
          .where('nl.objectId = CAST(news.id AS NVARCHAR(MAX))')
          .andWhere('nl.type = :newsType', { newsType: 'NEWS' })
          .andWhere('nl.isLike = :isLikeTrue', { isLikeTrue: true });
      }, 'totalLikes');

      queryBuilder.addSelect(subQuery => {
        return subQuery.select('COUNT(nc.id)', 'count')
          .from(NewsComment, 'nc')
          .where('nc.newsId = news.id');
      }, 'totalComments');

      // Filter by general search (q)
      if (q) {
        queryBuilder.andWhere(new Brackets(qb => {
          qb.where('news.title COLLATE Latin1_General_CI_AI LIKE :q', { q: `%${q}%` })
            .orWhere('news.authorName COLLATE Latin1_General_CI_AI LIKE :q', { q: `%${q}%` })
            .orWhere('news.submitterName COLLATE Latin1_General_CI_AI LIKE :q', { q: `%${q}%` });
        }));
      }

      // Filter by title
      if (title) {
        queryBuilder.andWhere('news.title COLLATE Latin1_General_CI_AI LIKE :title', { title: `%${title}%` });
      }

      // Filter by topic
      if (topic) {
        queryBuilder.andWhere('news.topic = :topic', { topic });
      }

      // Filter by department
      if (department) {
        queryBuilder.andWhere('news.department = :department', { department });
      }

      // Filter by authorDepartment
      if (authorDepartment) {
        queryBuilder.andWhere('news.authorDepartment = :authorDepartment', { authorDepartment });
      }

      // Phân quyền theo cấp bậc: nếu không lọc theo tác giả cụ thể,
      // chỉ hiển thị tin tức của người dùng hiện tại và cấp dưới (bỏ qua nếu thuộc nhóm allStatistic)
      const isAllStatistic = await this.sqlsvRepo.isUserInGroup(userId, 'allStatistic');
      const hasAuthorFilter = q || authorDepartment || department || title;
      if (!hasAuthorFilter && !isAllStatistic) {
        this.applyAuthorFilter(queryBuilder, isAllStatistic, userId, 'news', 'fa');
      }

      // Advanced Date Filters
      const dateFilters = [
        { field: 'news.submittedAt', value: submittedAt },
        { field: 'news.deadline', value: deadline },
        { field: 'news.createdAt', value: createdAt },
        { field: 'news.recalledAt', value: recalledAt },
        { field: 'news.publishedAt', value: publishedAt },
      ];

      dateFilters.forEach(({ field, value }) => {
        if (!value) return;

        const paramBase = field.replace('.', '_');

        if (value.startDate) {
          queryBuilder.andWhere(
            `${field} >= :${paramBase}_start`,
            { [`${paramBase}_start`]: new Date(value.startDate) }
          );
        }

        if (value.endDate) {
          const endDateObj = new Date(value.endDate);
          endDateObj.setDate(endDateObj.getDate() + 1);

          queryBuilder.andWhere(
            `${field} < :${paramBase}_end`,
            { [`${paramBase}_end`]: endDateObj }
          );
        }
      });

      // Filter by Audit Status
      // Since we are filtering by the JOINED table 'audit', this effectively filters news based on their LATEST audit status
      // Filter by Audit Status (Workflow Status)
      if (status) {
        queryBuilder.andWhere(new Brackets(qb => {
          const statusUpper = String(status).toUpperCase();
          if (statusUpper === 'DA_DUYET' || status === 'Đã duyệt') {
            qb.where('audit.actionCode = :s1', { s1: 'DUYET' })
              .orWhere('audit.curStatusCode = :s2', { s2: 'PUBLISHED' })
              .orWhere('audit.curStatusCode = :s3', { s3: 'APPROVED' });
          } else if (statusUpper === 'CHO_DUYET' || status === 'Chờ duyệt') {
            qb.where('audit.actionCode = :s1', { s1: 'SUBMIT' });
          } else if (statusUpper === 'TRA_LAI' || status === 'Trả lại') {
            qb.where('audit.actionCode = :s1', { s1: 'TRA_LAI' })
              .orWhere('audit.curStatusCode = :s2', { s2: 'REJECTED' });
          } else if (statusUpper === 'HUY_TIN' || status === 'Hủy tin' || statusUpper === 'CANCEL') {
            qb.where('audit.actionCode = :s1', { s1: 'CANCEL' })
              .orWhere('audit.actionCode = :s2', { s2: 'HUY_TIN' })
              .orWhere('news.status = :s3_deleted', { s3_deleted: 3 });
          } else if (statusUpper === 'THU_HOI' || status === 'Thu hồi' || statusUpper === 'RECALL') {
            qb.where('audit.actionCode = :s1', { s1: 'RECALL' })
              .orWhere('audit.actionCode = :s2', { s2: 'THU_HOI' });
          } else {
            // Logic cũ: tìm khớp trực tiếp
            qb.where('audit.actionCode = :status', { status })
              .orWhere('audit.curStatusCode = :status', { status })
              .orWhere('audit.stageStatus = :status', { status });
          }
        }));
      }

      // Filter by news.status (0: draft, 1: published, 2: scheduled, 3: deleted)
      if (newsStatus !== undefined && newsStatus !== null && newsStatus !== '') {
        queryBuilder.andWhere('news.status = :newsStatus', { newsStatus });
      } else {
        // Nếu lọc trạng thái là "Hủy tin" thì cho phép lấy cả tin có status = 3
        const statusUpper = status ? String(status).toUpperCase() : '';
        const isCancellationFilter = statusUpper === 'HUY_TIN' || status === 'Hủy tin' || statusUpper === 'CANCEL';

        if (!isCancellationFilter) {
          // Mặc định loại bỏ tin đã xóa (status = 3) trừ khi đang lọc tin Hủy
          queryBuilder.andWhere('news.status != 3');
        }
      }

      // Sorting
      // Mapping displayStatus sang biểu thức SQL CASE
      const displayStatusSql = `(CASE 
                WHEN audit.actionCode = 'DUYET' OR audit.curStatusCode = 'PUBLISHED' OR audit.curStatusCode = 'APPROVED' THEN N'Đã duyệt'
                WHEN audit.actionCode = 'SUBMIT' THEN N'Chờ duyệt'
                WHEN audit.actionCode = 'CANCEL' OR audit.actionCode = 'HUY_TIN' OR news.status = 3 THEN N'Hủy tin'
                WHEN audit.actionCode = 'RECALL' OR audit.actionCode = 'THU_HOI' THEN N'Thu hồi'
                WHEN audit.actionCode = 'TRA_LAI' OR audit.curStatusCode = 'REJECTED' THEN N'Trả lại'
                ELSE N'Nháp'
            END)`;

      queryBuilder.addSelect(displayStatusSql, 'displayStatusAlias');

      const validSortFields = {
        title: 'news.title',
        authorName: 'news.authorName',
        department: 'news.department',
        authorDepartment: 'news.authorDepartment',
        topicName: 'topic.name',
        topicEntity: 'topic.name', // Alias cho relation
        displayStatus: 'displayStatusAlias',
        viewCount: 'news.viewCount',
        createdAt: 'news.createdAt',
        publishedAt: 'news.publishedAt',
        submittedAt: 'news.submittedAt',
        likeCount: 'totalLikes',
        commentCount: 'totalComments',
        engagementRate: '(CAST(totalLikes + totalComments AS FLOAT) / NULLIF(news.viewCount, 0))'
      };

      const sortKeys = Object.keys(sort || {});
      if (sortKeys.length > 0) {
        sortKeys.forEach((key, index) => {
          const field = validSortFields[key] || key;
          const order = sort[key] === -1 ? 'DESC' : 'ASC';
          if (index === 0) {
            queryBuilder.orderBy(field, order);
          } else {
            queryBuilder.addOrderBy(field, order);
          }
        });
      } else {
        const defaultSortField = top ? 'news.viewCount' : 'news.createdAt';
        queryBuilder.orderBy(defaultSortField, 'DESC');
      }

      // Pagination
      let skip = (page - 1) * limit;
      let take = limit;

      if (top) {
        skip = 0;
        take = top;
      }

      queryBuilder.skip(skip).take(take);

      const { entities, raw } = await queryBuilder.getRawAndEntities();
      const total = await queryBuilder.getCount();

      const items = entities;

      const mappedItems = items.map((item, index) => {
        const latestAudit = (item as any).latestAudit;
        // Ưu tiên lấy displayStatus từ SQL alias nếu tồn tại (do sorting hoặc addSelect)
        let displayStatus = (raw[index] as any)?.displayStatusAlias || 'Nháp';

        if (!raw[index]?.displayStatusAlias && latestAudit) {
          const action = latestAudit.actionCode;
          const status = latestAudit.curStatusCode;

          if (action === 'DUYET' || status === 'PUBLISHED' || status === 'APPROVED') {
            displayStatus = 'Đã duyệt';
          } else if (action === 'SUBMIT') {
            displayStatus = 'Chờ duyệt';
          } else if (action === 'CANCEL') {
            displayStatus = 'Hủy tin';
          } else if (action === 'RECALL') {
            displayStatus = 'Thu hồi';
          } else if (action === 'TRA_LAI' || status === 'REJECTED') {
            displayStatus = 'Trả lại';
          }
        }

        const likeCount = Number(raw[index].totalLikes || 0);
        const commentCount = Number(raw[index].totalComments || 0);
        const viewCount = item.viewCount || 0;
        const engagementRate = viewCount > 0 ? (likeCount + commentCount) / viewCount * 100 : 0;

        return {
          ...item,
          authorDepartment: (item as any).authorDepartmentName?.name || item.authorDepartment,
          displayStatus,
          likeCount: likeCount,
          commentCount: commentCount,
          viewCount: viewCount,
          engagementRate: engagementRate.toFixed(2),
          // Format dates
          createdAt: this.formatDate(item.createdAt),
          updatedAt: this.formatDate(item.updatedAt),
          publishedAt: this.formatDate(item.publishedAt),
          scheduledPublishAt: this.formatDate(item.scheduledPublishAt),
          submittedAt: this.formatDate(item.submittedAt),
          approvedAt: this.formatDate(item.approvedAt),
          recalledAt: this.formatDate(item.recalledAt),
          rejectedAt: this.formatDate(item.rejectedAt),
          cancelledAt: this.formatDate(item.cancelledAt),
          deadline: this.formatDate(item.deadline),
        };
      });

      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: 'Báo cáo: Xem thống kê danh sách tin tức',
        method: 'GET',
        status: 'SUCCESS',
        type: 'NEWS_STATISTICS',
        subType: 'NEWS_STATISTICS_FINDALL',
        userInfo: userId,
        ipAddress: ipAddress,
        timestamp: new Date().toISOString()
      });

      return {
        data: mappedItems,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Báo cáo Lỗi: Xem thống kê danh sách tin tức - ${error.message}`,
        method: 'GET',
        status: 'FAILURE',
        type: 'NEWS_STATISTICS',
        subType: 'NEWS_STATISTICS_FINDALL',
        userInfo: userId,
        ipAddress: ipAddress,
        timestamp: new Date().toISOString()
      });
      console.error('Error in NewsStatisticsService.findAll:', error);
      throw new InternalServerErrorException('Lỗi khi lấy danh sách thống kê tin tức');
    }
  }

  async getSummaryByTopic(query: any, userId: string, ipAddress: string) {
    try {
      const { publishedAt, topic } = this.normalizeFilterParams(query);

      const queryBuilder = this.newsRepository.createQueryBuilder('news')
        .leftJoin('news.topicEntity', 'topic')
        .leftJoin(NewsComment, 'comment', 'news.id = comment.newsId')
        .leftJoin(NewsLike, 'newsLike', 'news.id = newsLike.objectId AND newsLike.type = \'NEWS\'')
        .select([
          'topic.name as topicName',
          'COUNT(DISTINCT news.id) as totalNews',
          'SUM(news.viewCount) as totalViews',
          'COUNT(DISTINCT comment.id) as totalComments',
          'COUNT(DISTINCT newsLike.id) as totalLikes'
        ])
        .where('news.status != 3') // Không lấy các tin đã xóa
        .groupBy('topic.id')
        .addGroupBy('topic.name');

      // Apply Topic Name filter
      if (topic) {
        queryBuilder.andWhere('topic.name COLLATE Latin1_General_CI_AI LIKE :topicName', { topicName: `%${topic}%` });
      }

      // Apply publishedAt filter
      if (publishedAt) {
        if (publishedAt.startDate) {
          queryBuilder.andWhere('news.publishedAt >= :publishedAt_start', {
            publishedAt_start: new Date(publishedAt.startDate)
          });
        }
        if (publishedAt.endDate) {
          const endDateObj = new Date(publishedAt.endDate);
          endDateObj.setDate(endDateObj.getDate() + 1);
          queryBuilder.andWhere('news.publishedAt < :publishedAt_end', {
            publishedAt_end: endDateObj
          });
        }
      }

      // Apply Sorting
      const { sort } = this.normalizeFilterParams(query);
      const validSortFields = ['topicName', 'totalNews', 'totalViews', 'totalComments', 'totalLikes'];
      const sortKeys = Object.keys(sort || {});

      if (sortKeys.length > 0) {
        sortKeys.forEach((key, index) => {
          if (validSortFields.includes(key)) {
            const order = sort[key] === -1 ? 'DESC' : 'ASC';
            if (index === 0) {
              queryBuilder.orderBy(key, order);
            } else {
              queryBuilder.addOrderBy(key, order);
            }
          }
        });
      } else {
        queryBuilder.orderBy('totalNews', 'DESC');
      }

      const rawResults = await queryBuilder.getRawMany();

      const result = rawResults.map(res => ({
        topicId: res.topicName || 'Không có chủ đề',
        totalNews: Number(res.totalNews || 0),
        totalViews: Number(res.totalViews || 0),
        totalComments: Number(res.totalComments || 0),
        totalLikes: Number(res.totalLikes || 0)
      }));

      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: 'Báo cáo: Xem thống kê theo chủ đề tin tức',
        method: 'GET',
        status: 'SUCCESS',
        type: 'NEWS_STATISTICS',
        subType: 'NEWS_STATISTICS_TOPIC',
        userInfo: userId,
        ipAddress: ipAddress,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Báo cáo Lỗi: Xem thống kê theo chủ đề tin tức - ${error.message}`,
        method: 'GET',
        status: 'FAILURE',
        type: 'NEWS_STATISTICS',
        subType: 'NEWS_STATISTICS_TOPIC',
        userInfo: userId,
        ipAddress: ipAddress,
        timestamp: new Date().toISOString()
      });
      console.error('Error in NewsStatisticsService.getSummaryByTopic:', error);
      throw new InternalServerErrorException('Lỗi khi lấy thống kê theo chủ đề');
    }
  }

  async getSummaryByDepartment(query: any, userId: string, ipAddress: string) {
    try {
      const normalizedQuery = this.normalizeFilterParams(query);
      let { publishedAt, authorDepartment, time } = normalizedQuery;

      // Xử lý tham số time (month hoặc year)
      if (time) {
        const now = new Date();
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);

        if (time === 'month') {
          startDate.setDate(1); // Đầu tháng hiện tại
        } else if (time === 'year') {
          startDate.setMonth(0, 1); // Đầu năm hiện tại
        }

        publishedAt = {
          startDate: startDate.toISOString(),
          endDate: now.toISOString()
        };
      }

      const queryBuilder = this.newsRepository.createQueryBuilder('news')
        .leftJoin(OrganizationUnitEntity, 'org', 'LTRIM(RTRIM(news.authorDepartment)) = LTRIM(RTRIM(org.id))')
        .leftJoin(Audit, 'audit', `audit.documentId = CAST(news.id AS NVARCHAR(MAX)) AND audit.id = (
                    SELECT TOP 1 a2.id
                    FROM audit a2
                    WHERE a2.document_id = CAST(news.id AS NVARCHAR(MAX))
                    AND a2.type_document = 'NEWS'
                    ORDER BY a2.created_at DESC
                )`)
        .select([
          'ISNULL(org.name, (CASE WHEN news.authorDepartment IS NOT NULL AND news.authorDepartment != \'\' THEN news.authorDepartment ELSE \'Chưa xác định\' END)) as departmentName',
          'COUNT(news.id) as totalNews',
          'SUM(CASE WHEN audit.actionCode = \'DUYET\' THEN 1 ELSE 0 END) as approvedCount',
          'SUM(CASE WHEN audit.actionCode = \'SUBMIT\' THEN 1 ELSE 0 END) as waitingCount',
          'SUM(CASE WHEN audit.actionCode = \'TRA_LAI\' THEN 1 ELSE 0 END) as rejectedCount',
          'SUM(news.viewCount) as totalViews'
        ])
        .where('news.status != 3')
        .groupBy('org.name')
        .addGroupBy('news.authorDepartment');

      const isAllStatistic = await this.sqlsvRepo.isUserInGroup(userId, 'allStatistic');
      if (authorDepartment) {
        queryBuilder.andWhere('news.authorDepartment = :authorDepartment', { authorDepartment });
      } else if (!isAllStatistic) {
        // Phân quyền theo cấp bậc: lọc theo phòng ban của người dùng và cấp dưới
        this.applyAuthorFilter(queryBuilder, isAllStatistic, userId, 'news', 'sumTopic');
      }

      if (publishedAt) {
        if (publishedAt.startDate) {
          queryBuilder.andWhere('news.publishedAt >= :publishedAt_start', {
            publishedAt_start: new Date(publishedAt.startDate)
          });
        }
        if (publishedAt.endDate) {
          const endDateObj = new Date(publishedAt.endDate);
          endDateObj.setDate(endDateObj.getDate() + 1);
          queryBuilder.andWhere('news.publishedAt < :publishedAt_end', {
            publishedAt_end: endDateObj
          });
        }
      }

      // Apply Sorting
      const { sort } = normalizedQuery;
      const sortMapping = {
        departmentName: 'departmentName',
        totalNews: 'totalNews',
        approvedCount: 'approvedCount',
        waitingCount: 'waitingCount',
        rejectedCount: 'rejectedCount',
        totalViews: 'totalViews',
        approvalRate: '(CAST(SUM(CASE WHEN audit.actionCode = \'DUYET\' THEN 1 ELSE 0 END) AS FLOAT) / NULLIF(COUNT(news.id), 0))'
      };
      const sortKeys = Object.keys(sort || {});

      if (sortKeys.length > 0) {
        sortKeys.forEach((key, index) => {
          if (sortMapping[key]) {
            const field = sortMapping[key];
            const order = sort[key] === -1 ? 'DESC' : 'ASC';
            if (index === 0) {
              queryBuilder.orderBy(field, order);
            } else {
              queryBuilder.addOrderBy(field, order);
            }
          }
        });
      } else {
        queryBuilder.orderBy('totalNews', 'DESC');
      }

      const rawResults = await queryBuilder.getRawMany();

      const result = rawResults.map(res => {
        const totalNews = Number(res.totalNews || 0);
        const approvedCount = Number(res.approvedCount || 0);

        return {
          departmentName: res.departmentName,
          totalNews,
          approvedCount,
          waitingCount: Number(res.waitingCount || 0),
          rejectedCount: Number(res.rejectedCount || 0),
          totalViews: Number(res.totalViews || 0),
          approvalRate: totalNews > 0 ? ((approvedCount / totalNews) * 100).toFixed(2) + '%' : '0%'
        };
      });

      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: 'Báo cáo: Xem thống kê theo phòng ban tin tức',
        method: 'GET',
        status: 'SUCCESS',
        type: 'NEWS_STATISTICS',
        subType: 'NEWS_STATISTICS_DEPT',
        userInfo: userId,
        ipAddress: ipAddress,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Báo cáo Lỗi: Xem thống kê theo phòng ban tin tức - ${error.message}`,
        method: 'GET',
        status: 'FAILURE',
        type: 'NEWS_STATISTICS',
        subType: 'NEWS_STATISTICS_DEPT',
        userInfo: userId,
        ipAddress: ipAddress,
        timestamp: new Date().toISOString()
      });
      console.error('Error in NewsStatisticsService.getSummaryByDepartment:', error);
      throw new InternalServerErrorException('Lỗi khi lấy thống kê theo phòng ban');
    }
  }

  async exportAll(query: any, userId: string, ipAddress: string, exportType: string = 'excel', fileName?: string) {
    const result = await this.findAll({ ...query, page: 1, limit: 10000 }, userId, ipAddress);

    await this.systemLogService.createLogFromSystem({
      action: 'GET',
      details: 'Báo cáo: Xuất file thống kê tất cả tin tức',
      method: 'GET',
      status: 'SUCCESS',
      type: 'NEWS_STATISTICS',
      subType: 'NEWS_STATISTICS_EXPORT_ALL',
      userInfo: userId,
      ipAddress: ipAddress,
      timestamp: new Date().toISOString()
    });

    const columns = [
      { header: 'Tiêu đề', key: 'title', width: 40 },
      { header: 'Tác giả', key: 'authorName', width: 20 },
      { header: 'Phòng ban', key: 'authorDepartment', width: 25 },
      { header: 'Ngày tạo', key: 'createdAt', width: 20, type: 'date', format: 'dd/MM/yyyy HH:mm' },
      { header: 'Lượt xem', key: 'viewCount', width: 12 },
      { header: 'Lượt Like', key: 'likeCount', width: 12 },
      { header: 'Bình luận', key: 'commentCount', width: 12 },
      { header: 'Trạng thái', key: 'displayStatus', width: 15 },
    ];

    const type = exportType.toLowerCase() === 'pdf' ? ExportType.PDF : ExportType.EXCEL;
    return this.dataExportService.export(result.data, columns, fileName || 'Thống kê tin tức', type, 'SYSTEM');
  }

  async exportSummaryByTopic(query: any, userId: string, ipAddress: string, exportType: string = 'excel') {
    const data = await this.getSummaryByTopic(query, userId, ipAddress);

    await this.systemLogService.createLogFromSystem({
      action: 'GET',
      details: 'Báo cáo: Xuất file thống kê theo chủ đề tin tức',
      method: 'GET',
      status: 'SUCCESS',
      type: 'NEWS_STATISTICS',
      subType: 'NEWS_STATISTICS_EXPORT_TOPIC',
      userInfo: userId,
      ipAddress: ipAddress,
      timestamp: new Date().toISOString()
    });

    const columns = [
      { header: 'Chủ đề', key: 'topicName', width: 35 },
      { header: 'Tổng số tin', key: 'totalNews', width: 15 },
      { header: 'Tổng lượt xem', key: 'totalViews', width: 15 },
      { header: 'Tổng bình luận', key: 'totalComments', width: 15 },
      { header: 'Tổng lượt Like', key: 'totalLikes', width: 15 },
    ];

    const type = exportType.toLowerCase() === 'pdf' ? ExportType.PDF : ExportType.EXCEL;
    return this.dataExportService.export(data, columns, 'Thống kê theo chủ đề', type, 'SYSTEM');
  }

  async exportSummaryByDepartment(query: any, userId: string, ipAddress: string, exportType: string = 'excel') {
    const data = await this.getSummaryByDepartment(query, userId, ipAddress);

    await this.systemLogService.createLogFromSystem({
      action: 'GET',
      details: 'Báo cáo: Xuất file thống kê theo phòng ban tin tức',
      method: 'GET',
      status: 'SUCCESS',
      type: 'NEWS_STATISTICS',
      subType: 'NEWS_STATISTICS_EXPORT_DEPT',
      userInfo: userId,
      ipAddress: ipAddress,
      timestamp: new Date().toISOString()
    });

    const columns = [
      { header: 'Phòng ban', key: 'departmentName', width: 35 },
      { header: 'Tổng số tin', key: 'totalNews', width: 15 },
      { header: 'Đã duyệt', key: 'approvedCount', width: 12 },
      { header: 'Chờ duyệt', key: 'waitingCount', width: 12 },
      { header: 'Bị từ chối', key: 'rejectedCount', width: 12 },
      { header: 'Tổng lượt xem', key: 'totalViews', width: 15 },
      { header: 'Tỉ lệ duyệt (%)', key: 'approvalRate', width: 15 },
    ];

    const type = exportType.toLowerCase() === 'pdf' ? ExportType.PDF : ExportType.EXCEL;
    return this.dataExportService.export(data, columns, 'Thống kê theo phòng ban', type, 'SYSTEM');
  }

  // --- CÁC HÀM XỬ LÝ MỚI (7.1 ĐẾN 7.5) ---

  // Helper function format date
  private formatDateVn(date: Date): string {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // Báo cáo 7.1: Thống kê tin tức theo thời gian
  async getStatsByTime(query: any, userId: string, ipAddress: string): Promise<any> {
    try {
      const filterParams = this.normalizeFilterParams(query);
      const { startDate, endDate, topicId, departmentId, status, page = 1, limit = 10 } = filterParams;

      const queryBuilder = this.newsRepository.createQueryBuilder('news')
        .leftJoinAndSelect('news.topicEntity', 'topic')
        .leftJoinAndMapOne(
          'news.latestAudit',
          Audit,
          'audit',
          `audit.documentId = CAST(news.id AS NVARCHAR(MAX)) AND audit.id = (
                SELECT TOP 1 a2.id
                FROM audit a2
                WHERE a2.document_id = CAST("news"."id" AS NVARCHAR(MAX))
                AND a2.type_document = 'NEWS'
                ORDER BY a2.created_at DESC
        )`
        )
        .select([
          'news.id AS id',
          'news.title AS title',
          'topic.name AS topicName',
          'news.authorName AS authorName',
          'ISNULL(NULLIF(news.department, \'\'), news.authorDepartment) AS departmentId',
          'news.createdAt AS createdAt',
          'news.publishedAt AS publishedAt',
          'news.viewCount AS viewCount',
          'news.status AS status'
        ])
        .addSelect((subQuery) => {
          return subQuery
            .select('COUNT(NL.id)', 'likeCount')
            .from('news_like', 'NL')
            .where('NL.objectId = news.id')
            .andWhere('NL.type = :type', { type: 'NEWS' })
            .andWhere('NL.isLike = 1');
        }, 'likeCount')
        .addSelect((subQuery) => {
          return subQuery
            .select('COUNT(NC.id)', 'commentCount')
            .from('news_comment', 'NC')
            .where('NC.newsId = news.id');
        }, 'commentCount');

      const displayStatusSql = `(CASE 
                WHEN audit.actionCode = 'DUYET' OR audit.curStatusCode = 'PUBLISHED' OR audit.curStatusCode = 'APPROVED' THEN N'Đã duyệt'
                WHEN audit.actionCode = 'SUBMIT' THEN N'Chờ duyệt'
                WHEN audit.actionCode = 'CANCEL' OR audit.actionCode = 'HUY_TIN' OR news.status = 3 THEN N'Hủy tin'
                WHEN audit.actionCode = 'RECALL' OR audit.actionCode = 'THU_HOI' THEN N'Thu hồi'
                WHEN audit.actionCode = 'TRA_LAI' OR audit.curStatusCode = 'REJECTED' THEN N'Trả lại'
                ELSE N'Nháp'
            END)`;

      queryBuilder.addSelect(displayStatusSql, 'displayStatusAlias');

      if (startDate) {
        queryBuilder.andWhere('news.publishedAt >= :startDate', { startDate: new Date(startDate) });
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        queryBuilder.andWhere('news.publishedAt <= :endDate', { endDate: end });
      }
      if (topicId) {
        queryBuilder.andWhere('news.topic = :topicId', { topicId });
      }
      const isAllStatistic = await this.sqlsvRepo.isUserInGroup(userId, 'allStatistic');
      if (departmentId) {
        queryBuilder.andWhere('(news.authorDepartment = :departmentId OR news.department = :departmentId)', { departmentId });
      } else if (!isAllStatistic) {
        this.applyAuthorFilter(queryBuilder, isAllStatistic, userId, 'news', 'sumDept');
      }

      if (status !== undefined && status !== null && status !== '') {
        queryBuilder.andWhere(new Brackets(qb => {
          const statusUpper = String(status).toUpperCase();
          if (statusUpper === 'DA_DUYET' || status === 'Đã duyệt') {
            qb.where('audit.actionCode = :s1', { s1: 'DUYET' })
              .orWhere('audit.curStatusCode = :s2', { s2: 'PUBLISHED' })
              .orWhere('audit.curStatusCode = :s3', { s3: 'APPROVED' });
          } else if (statusUpper === 'CHO_DUYET' || status === 'Chờ duyệt') {
            qb.where('audit.actionCode = :s1', { s1: 'SUBMIT' });
          } else if (statusUpper === 'TRA_LAI' || status === 'Trả lại') {
            qb.where('audit.actionCode = :s1', { s1: 'TRA_LAI' })
              .orWhere('audit.curStatusCode = :s2', { s2: 'REJECTED' });
          } else if (statusUpper === 'HUY_TIN' || status === 'Hủy tin' || statusUpper === 'CANCEL') {
            qb.where('audit.actionCode = :s1', { s1: 'CANCEL' })
              .orWhere('audit.actionCode = :s2', { s2: 'HUY_TIN' })
              .orWhere('news.status = :s3_deleted', { s3_deleted: 3 });
          } else if (statusUpper === 'THU_HOI' || status === 'Thu hồi' || statusUpper === 'RECALL') {
            qb.where('audit.actionCode = :s1', { s1: 'RECALL' })
              .orWhere('audit.actionCode = :s2', { s2: 'THU_HOI' });
          } else if (statusUpper === '0' || statusUpper === 'NHAP' || statusUpper === 'DRAFT' || status === 'Nháp') {
            qb.where('news.status = 0')
              .andWhere(new Brackets(subQb => {
                subQb.where('audit.actionCode IS NULL')
                  .orWhere('audit.actionCode NOT IN (:...excludeCodes0)', { excludeCodes0: ['DUYET', 'SUBMIT', 'CANCEL', 'HUY_TIN', 'RECALL', 'THU_HOI', 'TRA_LAI'] });
              }))
              .andWhere(new Brackets(subQb => {
                subQb.where('audit.curStatusCode IS NULL')
                  .orWhere('audit.curStatusCode NOT IN (:...excludeStatus0)', { excludeStatus0: ['PUBLISHED', 'APPROVED', 'REJECTED'] });
              }));
          } else {
            qb.where('news.status = :status', { status });
          }
        }));
      }

      queryBuilder.orderBy('news.publishedAt', 'DESC');

      // === LOG QUERY ĐỂ DEBUG ===
      // ==========================

      const total = await queryBuilder.getCount();

      const skip = (Number(page) - 1) * Number(limit);
      queryBuilder.skip(skip).take(Number(limit));

      const rawData = await queryBuilder.getRawMany();

      const departmentIds = [...new Set(rawData.map(item => item.departmentId).filter(Boolean))];
      let departmentMap = new Map<string, string>();

      if (departmentIds.length > 0) {
        const departments = await this.orgUnitRepository.findByIds(departmentIds);
        departmentMap = new Map(departments.map(d => [d.id, d.name]));
      }

      const finalData = rawData.map((item, index) => ({
        stt: index + 1,
        id: item.id,
        title: item.title,
        topicId: item.topicName || '',
        authorName: item.authorName || '',
        departmentId: item.departmentId ? (departmentMap.get(item.departmentId) || item.departmentId) : '',
        publishedAt: this.formatDateVn(item.publishedAt || item.createdAt),
        viewCount: item.viewCount || 0,
        likeCount: item.likeCount || 0,
        commentCount: Number(item.commentCount || 0),
        statusName: this.mapNewsDisplayStatus(item.displayStatusAlias || 'Nháp')
      }));

      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: 'Báo cáo: Xem thống kê tin tức theo thời gian',
        method: 'GET',
        status: 'SUCCESS',
        type: 'NEWS_STATISTICS',
        subType: 'NEWS_STATISTICS_TIME',
        userInfo: userId,
        ipAddress: ipAddress,
        timestamp: new Date().toISOString()
      });

      return {
        statusCode: 200,
        data: finalData,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      };
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Báo cáo Lỗi: Xem thống kê tin tức theo thời gian - ${error.message}`,
        method: 'GET',
        status: 'FAILURE',
        type: 'NEWS_STATISTICS',
        subType: 'NEWS_STATISTICS_TIME',
        userInfo: userId,
        ipAddress: ipAddress,
        timestamp: new Date().toISOString()
      });
      console.error('Error in NewsStatisticsService.getStatsByTime:', error);
      throw new InternalServerErrorException('Lỗi khi lấy thống kê tin tức theo thời gian');
    }
  }

  // Báo cáo 7.2: Top tin tức được xem nhiều nhất
  async getTopViewedNews(query: any, userId: string, ipAddress: string): Promise<any> {
    try {
      const filterParams = this.normalizeFilterParams(query);
      const { startDate, endDate, topicId, top, limit = 10, page = 1 } = filterParams;

      const queryBuilder = this.newsRepository.createQueryBuilder('news')
        .leftJoinAndSelect('news.topicEntity', 'topic')
        .select([
          'news.id AS id',
          'news.title AS title',
          'topic.name AS topicName',
          'news.authorName AS authorName',
          'news.createdAt AS createdAt',
          'news.publishedAt AS publishedAt',
          'news.viewCount AS viewCount',
          'news.status AS status'
        ])
        .addSelect((subQuery) => {
          return subQuery
            .select('COUNT(NL.id)', 'likeCount')
            .from('news_like', 'NL')
            .where('NL.objectId = news.id')
            .andWhere('NL.type = :type', { type: 'NEWS' })
            .andWhere('NL.isLike = 1');
        }, 'likeCount')
        .addSelect((subQuery) => {
          return subQuery
            .select('COUNT(NC.id)', 'commentCount')
            .from('news_comment', 'NC')
            .where('NC.newsId = news.id');
        }, 'commentCount');

      queryBuilder.where('news.status = 1');

      if (startDate) {
        queryBuilder.andWhere('news.publishedAt >= :startDate', { startDate: new Date(startDate) });
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        queryBuilder.andWhere('news.publishedAt <= :endDate', { endDate: end });
      }
      if (topicId) {
        queryBuilder.andWhere('news.topic = :topicId', { topicId });
      }

      // Phân quyền theo cấp bậc (bỏ qua nếu thuộc nhóm allStatistic)
      const isAllStatistic = await this.sqlsvRepo.isUserInGroup(userId, 'allStatistic');
      if (!isAllStatistic) {
        this.applyAuthorFilter(queryBuilder, isAllStatistic, userId, 'news', 'sTime');
      }

      const topVal = Number(top);
      if (topVal === 5) {
        queryBuilder.andWhere('news.viewCount > 2000');
      } else if (topVal === 10) {
        queryBuilder.andWhere('news.viewCount > 1500');
      } else if (topVal === 20) {
        queryBuilder.andWhere('news.viewCount > 1000');
      } else if (topVal === 50) {
        queryBuilder.andWhere('news.viewCount > 500');
      } else if (topVal === 100) {
        queryBuilder.andWhere('news.viewCount < 500');
      }

      queryBuilder.orderBy('news.viewCount', 'DESC')
        .addOrderBy('likeCount', 'DESC')
        .addOrderBy('commentCount', 'DESC');

      const total = await queryBuilder.getCount();

      const skip = (Number(page) - 1) * Number(limit);
      queryBuilder.skip(skip).take(Number(limit));

      const rawData = await queryBuilder.getRawMany();

      const finalData = rawData.map((item, index) => {
        const viewCount = item.viewCount || 0;
        const likeCount = item.likeCount || 0;
        const commentCount = item.commentCount || 0;

        const engagementRate = viewCount > 0
          ? ((likeCount + commentCount) / viewCount) * 100
          : 0;

        return {
          stt: index + 1,
          id: item.id,
          title: item.title,
          topicId: item.topicName || '',
          authorName: item.authorName || '',
          publishedAt: this.formatDateVn(item.publishedAt || item.createdAt),
          viewCount,
          likeCount,
          commentCount,
          engagementRate: engagementRate.toFixed(1) + '%'
        };
      });

      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: 'Báo cáo: Xem top tin tức được xem nhiều nhất',
        method: 'GET',
        status: 'SUCCESS',
        type: 'NEWS_STATISTICS',
        subType: 'NEWS_STATISTICS_TOP_VIEWED',
        userInfo: userId,
        ipAddress: ipAddress,
        timestamp: new Date().toISOString()
      });

      return {
        statusCode: 200,
        data: finalData,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      };
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Báo cáo Lỗi: Xem top tin tức được xem nhiều nhất - ${error.message}`,
        method: 'GET',
        status: 'FAILURE',
        type: 'NEWS_STATISTICS',
        subType: 'NEWS_STATISTICS_TOP_VIEWED',
        userInfo: userId,
        ipAddress: ipAddress,
        timestamp: new Date().toISOString()
      });
      console.error('Error in NewsStatisticsService.getTopViewedNews:', error);
      throw new InternalServerErrorException('Lỗi khi lấy top tin tức xem nhiều nhất');
    }
  }

  // Báo cáo 7.3: Thống kê tin tức theo chủ đề
  async getStatsByTopic(query: any, userId: string, ipAddress: string): Promise<any> {
    try {
      const filterParams = this.normalizeFilterParams(query);
      const { startDate, endDate, topicId, page = 1, limit = 10 } = filterParams;

      const isAllStatistic = await this.sqlsvRepo.isUserInGroup(userId, 'allStatistic');

      const queryBuilder = this.newsRepository.createQueryBuilder('news')
        .leftJoin('news.topicEntity', 'topic')
        .select([
          'news.topic AS topicId',
          'MAX(topic.name) AS topicName',
          'COUNT(news.id) AS totalNews',
          'SUM(news.viewCount) AS totalView',
          'MAX(news.publishedAt) AS publishedAt'
        ])
        .addSelect((subQuery) => {
          const sq = subQuery
            .select('COUNT(NL.id)', 'totalLike')
            .from('news_like', 'NL')
            .innerJoin('news', 'n2', 'NL.objectId = n2.id')
            .where('n2.topic = news.topic')
            .andWhere('n2.status = 1')
            .andWhere('NL.type = :type', { type: 'NEWS' })
            .andWhere('NL.isLike = 1');
          if (startDate) {
            sq.andWhere('n2.publishedAt >= :startDate', { startDate: new Date(startDate) });
          }
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            sq.andWhere('n2.publishedAt <= :endDate', { endDate: end });
          }
          this.applyAuthorFilter(sq, isAllStatistic, userId, 'n2', 'likeTopic');
          return sq;
        }, 'totalLike')
        .addSelect((subQuery) => {
          const sq = subQuery
            .select('COUNT(NC.id)', 'totalComment')
            .from('news_comment', 'NC')
            .innerJoin('news', 'n2', 'NC.newsId = n2.id')
            .where('n2.topic = news.topic')
            .andWhere('n2.status = 1');
          if (startDate) {
            sq.andWhere('n2.publishedAt >= :startDate', { startDate: new Date(startDate) });
          }
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            sq.andWhere('n2.publishedAt <= :endDate', { endDate: end });
          }
          this.applyAuthorFilter(sq, isAllStatistic, userId, 'n2', 'commentTopic');
          return sq;
        }, 'totalComment');

      queryBuilder.where('news.status = 1');
      this.applyAuthorFilter(queryBuilder, isAllStatistic, userId, 'news', 'mainTopic');

      if (startDate) {
        queryBuilder.andWhere('news.publishedAt >= :startDate', { startDate: new Date(startDate) });
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        queryBuilder.andWhere('news.publishedAt <= :endDate', { endDate: end });
      }

      if (topicId) {
        queryBuilder.andWhere('news.topic = :topicId', { topicId });
      }

      queryBuilder.groupBy('news.topic');
      queryBuilder.orderBy('totalNews', 'DESC');

      const rawData = await queryBuilder.getRawMany();
      const total = rawData.length;

      const skip = (Number(page) - 1) * Number(limit);
      const slicedRawData = rawData.slice(skip, skip + Number(limit));

      const finalData = slicedRawData.map((item, index) => ({
        stt: skip + index + 1,
        topicId: item.topicName || 'Chủ đề khác',
        totalNews: parseInt(item.totalNews) || 0,
        totalView: parseInt(item.totalView) || 0,
        totalLike: parseInt(item.totalLike) || 0,
        totalComment: parseInt(item.totalComment) || 0,
        publishedAt: item.publishedAt ? dayjs(item.publishedAt).format('DD/MM/YYYY') : ''
      }));

      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: 'Báo cáo: Xem thống kê theo chủ đề tin tức',
        method: 'GET',
        status: 'SUCCESS',
        type: 'NEWS_STATISTICS',
        subType: 'NEWS_STATISTICS_TOPIC_STATS',
        userInfo: userId,
        ipAddress: ipAddress,
        timestamp: new Date().toISOString()
      });

      return {
        statusCode: 200,
        data: finalData,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      };
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Báo cáo Lỗi: Xem thống kê theo chủ đề tin tức - ${error.message}`,
        method: 'GET',
        status: 'FAILURE',
        type: 'NEWS_STATISTICS',
        subType: 'NEWS_STATISTICS_TOPIC_STATS',
        userInfo: userId,
        ipAddress: ipAddress,
        timestamp: new Date().toISOString()
      });
      console.error('Error in NewsStatisticsService.getStatsByTopic:', error);
      throw new InternalServerErrorException('Lỗi khi lập báo cáo thống kê theo chủ đề');
    }
  }

  // Báo cáo 7.4: Theo dõi quy trình duyệt tin
  async getWorkflowStats(query: any, userId: string, ipAddress: string): Promise<any> {
    try {
      const filterParams = this.normalizeFilterParams(query);
      const { submittedAt, approvedAt, departmentId, page = 1, limit = 10 } = filterParams;

      const queryBuilder = this.newsRepository.createQueryBuilder('news')
        .select([
          'news.id AS id',
          'news.title AS title',
          'news.authorName AS authorName',
          'news.department AS departmentId',
          'news.submittedAt AS submittedAt',
          'news.approvedAt AS approvedAt',
          'news.reviewerName AS reviewerName',
          'news.status AS status'
        ]);

      queryBuilder.where('news.submittedAt IS NOT NULL');

      // 🟢 Tìm theo Ngày Submit
      if (submittedAt?.startDate) {
        queryBuilder.andWhere('news.submittedAt >= :subStart', { subStart: new Date(submittedAt.startDate) });
      }
      if (submittedAt?.endDate) {
        const end = new Date(submittedAt.endDate);
        end.setHours(23, 59, 59, 999);
        queryBuilder.andWhere('news.submittedAt <= :subEnd', { subEnd: end });
      }

      // 🟢 Tìm theo Ngày Approved
      if (approvedAt?.startDate) {
        queryBuilder.andWhere('news.approvedAt >= :appStart', { appStart: new Date(approvedAt.startDate) });
      }
      if (approvedAt?.endDate) {
        const end = new Date(approvedAt.endDate);
        end.setHours(23, 59, 59, 999);
        queryBuilder.andWhere('news.approvedAt <= :appEnd', { appEnd: end });
      }
      const isAllStatistic = await this.sqlsvRepo.isUserInGroup(userId, 'allStatistic');
      if (departmentId) {
        queryBuilder.andWhere('(news.authorDepartment = :departmentId OR news.department = :departmentId)', { departmentId });
      } else if (!isAllStatistic) {
        this.applyAuthorFilter(queryBuilder, isAllStatistic, userId, 'news', 'wf');
      }

      queryBuilder.orderBy('news.submittedAt', 'DESC');

      const total = await queryBuilder.getCount();

      const skip = (Number(page) - 1) * Number(limit);
      queryBuilder.skip(skip).take(Number(limit));

      const rawData = await queryBuilder.getRawMany();

      const departmentIds = [...new Set(rawData.map(item => item.departmentId).filter(Boolean))];
      let departmentMap = new Map<string, string>();

      if (departmentIds.length > 0) {
        const departments = await this.orgUnitRepository.findByIds(departmentIds);
        departmentMap = new Map(departments.map(d => [d.id, d.name]));
      }

      const finalData = rawData.map((item, index) => {
        let approvalTimeHours: number | null = null;
        let approvalTimeText = 'Chưa duyệt';

        if (item.approvedAt && item.submittedAt) {
          const diffMs = new Date(item.approvedAt).getTime() - new Date(item.submittedAt).getTime();
          approvalTimeHours = diffMs / (1000 * 60 * 60);

          if (approvalTimeHours < 1) {
            approvalTimeText = '< 1 giờ';
          } else if (approvalTimeHours < 24) {
            approvalTimeText = `${Math.floor(approvalTimeHours)} giờ`;
          } else {
            const days = Math.floor(approvalTimeHours / 24);
            const remainHours = Math.floor(approvalTimeHours % 24);
            approvalTimeText = remainHours > 0 ? `${days} ngày ${remainHours} giờ` : `${days} ngày`;
          }
        }

        return {
          stt: index + 1,
          id: item.id,
          title: item.title,
          authorName: item.authorName || '',
          departmentId: item.departmentId ? (departmentMap.get(item.departmentId) || '') : '',
          submittedAt: this.formatDateVn(item.submittedAt),
          approvedAt: item.approvedAt ? this.formatDateVn(item.approvedAt) : '',
          reviewerName: item.reviewerName || '',
          approvalTimeText,
          status: item.status
        };
      });

      const newsIds = finalData.map(item => String(item.id));
      let auditLogs: Audit[] = [];

      if (newsIds.length > 0) {
        auditLogs = await this.auditRepository.find({
          where: {
            documentId: In(newsIds),
            typeDocument: 'NEWS'
          },
          order: { createdAt: 'ASC' }
        });
      }

      // Nhóm log theo từng newsId
      const auditsByNewsId = new Map<string, Audit[]>();
      auditLogs.forEach(log => {
        const docId = log.documentId;
        if (docId) {
          if (!auditsByNewsId.has(docId)) {
            auditsByNewsId.set(docId, []);
          }
          auditsByNewsId.get(docId)!.push(log);
        }
      });

      const responseData = finalData.map(item => {
        const itemAudits = auditsByNewsId.get(String(item.id)) || [];
        const latestAudit = itemAudits.length > 0 ? itemAudits[itemAudits.length - 1] : null;

        const rejectionAudit = [...itemAudits].reverse().find(a => a.actionCode === 'TRA_LAI' || a.curStatusCode === 'REJECTED');
        let rejectReason = '';
        if (rejectionAudit && rejectionAudit.details) {
          const parsed = this.safeParseDetails(rejectionAudit.details);
          rejectReason = typeof parsed === 'object' ? (parsed.comment || parsed.reason || rejectionAudit.details) : rejectionAudit.details;
        }

        const { status, ...rest } = item;

        return {
          ...rest,
          newsStatus: latestAudit ? this.translateStatusCode(latestAudit.curStatusCode) : 'Không xác định',
          rejectReason: rejectReason || ''
        };
      });

      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: 'Báo cáo: Xem theo dõi quy trình duyệt tin',
        method: 'GET',
        status: 'SUCCESS',
        type: 'NEWS_STATISTICS',
        subType: 'NEWS_STATISTICS_WORKFLOW',
        userInfo: userId,
        ipAddress: ipAddress,
        timestamp: new Date().toISOString()
      });

      return {
        statusCode: 200,
        data: responseData,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      };
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Báo cáo Lỗi: Xem theo dõi quy trình duyệt tin - ${error.message}`,
        method: 'GET',
        status: 'FAILURE',
        type: 'NEWS_STATISTICS',
        subType: 'NEWS_STATISTICS_WORKFLOW',
        userInfo: userId,
        ipAddress: ipAddress,
        timestamp: new Date().toISOString()
      });
      console.error('Error in NewsStatisticsService.getWorkflowStats:', error);
      throw new InternalServerErrorException('Lỗi khi lấy báo cáo quy trình duyệt tin');
    }
  }

  // Báo cáo 7.5: Thống kê hoạt động đăng tin theo phòng ban
  async getStatsByDepartment(query: any, userId: string, ipAddress: string): Promise<any> {
    try {
      const filter = query.filter || query || {};
      let { month, year } = filter;
      const { departmentId, page = 1, limit = 10 } = filter;

      if (month) month = Number(month);
      if (year) year = Number(year);

      if (month && !year) {
        year = new Date().getFullYear();
      }

      const queryBuilder = this.newsRepository.createQueryBuilder('news')
        .select([
          'ISNULL(NULLIF(news.department, \'\'), news.authorDepartment) AS departmentId',
          'COUNT(news.id) AS totalNews',
          'SUM(CASE WHEN news.status = 1 THEN 1 ELSE 0 END) AS approvedNews',
          'SUM(CASE WHEN news.status = 2 THEN 1 ELSE 0 END) AS pendingNews',
          'SUM(CASE WHEN (news.status = 0 AND news.rejectorId IS NOT NULL) THEN 1 ELSE 0 END) AS rejectedNews',
          'SUM(news.viewCount) AS totalViews',
          'MAX(news.publishedAt) AS publishedAt'
        ]);

      queryBuilder.where('(news.status != 0 OR news.rejectorId IS NOT NULL)');

      if (month && year) {
        queryBuilder.andWhere('MONTH(ISNULL(news.publishedAt, news.createdAt)) = :month', { month });
        queryBuilder.andWhere('YEAR(ISNULL(news.publishedAt, news.createdAt)) = :year', { year });
      } else if (year) {
        queryBuilder.andWhere('YEAR(ISNULL(news.publishedAt, news.createdAt)) = :year', { year });
      }

      const isAllStatistic = await this.sqlsvRepo.isUserInGroup(userId, 'allStatistic');
      if (departmentId) {
        queryBuilder.andWhere('(news.department = :departmentId OR news.authorDepartment = :departmentId)', { departmentId });
      } else if (!isAllStatistic) {
        this.applyAuthorFilter(queryBuilder, isAllStatistic, userId, 'news', 'byDept');
      }

      queryBuilder.groupBy('ISNULL(NULLIF(news.department, \'\'), news.authorDepartment)');
      queryBuilder.orderBy('totalNews', 'DESC');

      const rawData = await queryBuilder.getRawMany();
      const total = rawData.length;

      const skip = (Number(page) - 1) * Number(limit);
      const slicedRawData = rawData.slice(skip, skip + Number(limit));

      const departmentIds = [...new Set(slicedRawData.map(item => item.departmentId).filter(Boolean))];
      let departmentMap = new Map<string, string>();

      if (departmentIds.length > 0) {
        const departments = await this.orgUnitRepository.findByIds(departmentIds);
        departmentMap = new Map(departments.map(d => [d.id, d.name]));
      }

      const finalData = slicedRawData.map((item, index) => {
        const totalNews = parseInt(item.totalNews) || 0;
        const approved = parseInt(item.approvedNews) || 0;

        const approvalRate = totalNews > 0 ? (approved / totalNews) * 100 : 0;

        return {
          stt: skip + index + 1,
          departmentId: item.departmentId ? (departmentMap.get(item.departmentId) || item.departmentId) : '',
          totalNews,
          approvedNews: approved,
          pendingNews: parseInt(item.pendingNews) || 0,
          rejectedNews: parseInt(item.rejectedNews) || 0,
          totalViews: parseInt(item.totalViews) || 0,
          approvalRate: approvalRate.toFixed(1) + '%',
          publishedAt: this.formatDate(item.publishedAt)
        };
      });

      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: 'Báo cáo: Xem thống kê hoạt động đăng tin theo phòng ban',
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: 'NEWS_STATISTICS_DEPT_STATS',
        userInfo: userId,
        ipAddress: ipAddress,
        timestamp: new Date().toISOString()
      });

      return {
        statusCode: 200,
        data: finalData,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      };
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Báo cáo Lỗi: Xem thống kê hoạt động đăng tin theo phòng ban - ${error.message}`,
        method: 'GET',
        status: 'FAILURE',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: 'NEWS_STATISTICS_DEPT_STATS',
        userInfo: userId,
        ipAddress: ipAddress,
        timestamp: new Date().toISOString()
      });
      console.error('Error in NewsStatisticsService.getStatsByDepartment:', error);
      throw new InternalServerErrorException('Lỗi khi lấy báo cáo thống kê hoạt động đăng tin theo phòng ban');
    }
  }

  private translateActionCode(code: string | null): string {
    if (!code) return 'Không xác định';
    const map: Record<string, string> = {
      'CREATE': 'Tạo mới',
      'SUBMIT': 'Trình duyệt',
      'DUYET': 'Phê duyệt',
      'APPROVE': 'Phê duyệt',
      'REJECT': 'Từ chối',
      'CANCEL': 'Hủy',
      'RECALL': 'Thu hồi',
      'UPDATE': 'Cập nhật'
    };
    return map[code.toUpperCase()] || code;
  }

  private safeParseDetails(details: string): any {
    try {
      return JSON.parse(details);
    } catch (e) {
      return details;
    }
  }

  private translateStatusCode(code: string | null): string {
    if (!code) return '<span style="background-color: #E9ECEF; color: #495057; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500; display: inline-block;">Bản nháp</span>';

    const map: Record<string, { text: string; bg: string; color: string, border?: string }> = {
      'DRAFT': { text: 'Bản nháp', bg: '#b297f0', color: '#5600ea', border: '1px solid #a17ae6' }, // Màu tím nháp
      'SUBMITTED': { text: 'Chờ duyệt', bg: '#fef9c2', color: '#ffa600', border: '1px solid #ffe2ab' }, // Màu vàng chờ duyệt
      'PENDING_APPROVAL': { text: 'Chờ phê duyệt', bg: '#fef9c2', color: '#ffa600', border: '1px solid #ffe2ab' },
      'APPROVED': { text: 'Đã duyệt', bg: '#d0ffde', color: '#007222', border: '1px solid #adecc0' }, // Màu xanh đã duyệt
      'PUBLISHED': { text: 'Đã xuất bản', bg: '#d0ffde', color: '#007222', border: '1px solid #adecc0' },
      'REJECTED': { text: 'Từ chối', bg: '#a3a4a5', color: '#FFFFFF', border: '1px solid #777778' }, // Màu xám từ chối
      'CANCELLED': { text: 'Hủy tin', bg: '#ffdcd9', color: '#f44336', border: '1px solid #ffc6c8' }, // Màu hồng hủy tin
      'RECALLED': { text: 'Thu hồi', bg: '#fd5558', color: '#FFFFFF', border: '1px solid #ffa7aa' }, // Màu đỏ thu hồi
      'SCHEDULED': { text: 'Chớ xuất bản', bg: '#D1ECF1', color: '#0C5460' },
      'PENDING': { text: 'Chờ xử lý', bg: '#FFF3CD', color: '#856404' }
    };

    const statusUpper = code.toUpperCase();
    const config = map[statusUpper] || { text: code, bg: '#E9ECEF', color: '#495057' };
    const borderStyle = config.border ? `border: ${config.border};` : '';
    return `<div style="display:flex;overflow: hidden;text-overflow: ellipsis;white-space: nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background: ${config.bg};color:${config.color};font-weight:700;font-size:14px;border-radius:15px;${borderStyle}">${config.text}</div>`;
  }

  private mapNewsDisplayStatus(statusText: string): string {
    const map: Record<string, { text: string; bg: string; color: string; border?: string }> = {
      'Đã duyệt': { text: 'Đã duyệt', bg: '#d0ffde', color: '#007222', border: '1px solid #adecc0' }, // Xanh lá nhạt
      'Chờ duyệt': { text: 'Chờ duyệt', bg: '#fef9c2', color: '#ffa600', border: '1px solid #ffe2ab' }, // Vàng/cam nhạt
      'Trả lại': { text: 'Trả lại', bg: '#a3a4a5', color: '#FFFFFF', border: '1px solid #777778' }, // Xám đậm, chữ trắng
      'Hủy tin': { text: 'Hủy tin', bg: '#ffdcd9', color: '#f44336', border: '1px solid #ffcfcf' }, // Đỏ/hồng nhạt
      'Thu hồi': { text: 'Thu hồi', bg: '#fd5558', color: '#FFFFFF', border: '1px solid #fe8c8f' }, // Đỏ rực, chữ trắng
      'Nháp': { text: 'Đang tạo', bg: '#b297f0', color: '#5600ea', border: '1px solid #a17ae6' }, // Tím đậm, chữ trắng
      'Đang tạo': { text: 'Đang tạo', bg: '#b297f0', color: '#5600ea', border: '1px solid #a17ae6' }
    };

    const config = map[statusText] || { text: statusText, bg: '#F4F5F7', color: '#6A7985' };
    const borderStyle = config.border ? `border: ${config.border};` : '';
    return `<div style="display:flex;overflow: hidden;text-overflow: ellipsis;white-space: nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background: ${config.bg};color:${config.color};font-weight:700;font-size:14px;border-radius:15px;${borderStyle}">${config.text}</div>`;
  }

  /**
   * Helper áp dụng bộ lọc authorId an toàn chống lỗi 2100 parameters của SQL Server.
   * Sử dụng SQL subquery thay vì truyền mảng IDs làm tham số — chỉ dùng 1 parameter (userId).
   */
  private applyAuthorFilter(
    qb: any,
    isAllStatistic: boolean,
    userId: string,
    alias: string = 'news',
    paramPrefix: string = 'sub'
  ) {
    if (isAllStatistic) return;
    if (!userId) {
      qb.andWhere('1 = 0');
      return;
    }

    // Dùng subquery trực tiếp trên DB để lấy danh sách userId cấp dưới
    // Chỉ tốn 1 parameter (userId), tránh hoàn toàn lỗi 2100
    const uidParam = `${paramPrefix}_uid`;
    const subquery = `(
      ${alias}.authorId IN (
        SELECT u_sub.id FROM users u_sub
        INNER JOIN organization_units dept_sub ON u_sub.[parent] = dept_sub.id
        WHERE u_sub.status = 1
        AND dept_sub.id IN (
          SELECT org_sub.id FROM organization_units org_sub
          WHERE org_sub.status = 1
          AND (
            org_sub.id = (SELECT TOP 1 u_cur.[parent] FROM users u_cur WHERE u_cur.id = :${uidParam} AND u_cur.status = 1)
            OR org_sub.mpath LIKE '%' + CAST((SELECT TOP 1 u_cur.[parent] FROM users u_cur WHERE u_cur.id = :${uidParam} AND u_cur.status = 1) AS NVARCHAR(100)) + '%'
          )
        )
      )
      OR ${alias}.authorId = :${uidParam}
    )`;
    qb.andWhere(subquery, { [uidParam]: userId });
  }
}
