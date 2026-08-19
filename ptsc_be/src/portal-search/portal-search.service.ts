import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { News } from 'src/news/entities/news.entity';
import { AlbumImageEntity } from 'src/album-images/entities/album-image.entity';
import { VideoEntity } from 'src/videos/entities/video.entity';
import { TopicEntity } from 'src/topic/entities/topic.entity';

@Injectable()
export class PortalSearchService {
    constructor(
        @InjectRepository(News, 'mssqlConnection')
        private readonly newsRepository: Repository<News>,
        @InjectRepository(AlbumImageEntity, 'mssqlConnection')
        private readonly albumRepository: Repository<AlbumImageEntity>,
        @InjectRepository(VideoEntity, 'mssqlConnection')
        private readonly videoRepository: Repository<VideoEntity>,
        @InjectRepository(TopicEntity, 'mssqlConnection')
        private readonly topicRepository: Repository<TopicEntity>,
    ) { }

    private normalizeFilterParams(query: any) {
        const filter = query.filter || {};
        const getFilterValue = (key: string) => {
            if (filter[key] !== undefined) return filter[key];
            const flatKey = `filter[${key}]`;
            if (query[flatKey] !== undefined) return query[flatKey];
            return undefined;
        };

        return {
            page: query.page || 1,
            limit: query.limit || 10,
            sortBy: query.sortBy || 'createdAt',
            sortOrder: (query.sortOrder || 'DESC').toUpperCase(),
            q: getFilterValue('title') || getFilterValue('q') || query.q || query.title || '',
            tags: getFilterValue('tags'),
            content: getFilterValue('content'),
            // type toggles (expected boolean-like) and type-specific text searches
            news: getFilterValue('news'),
            video: getFilterValue('video'),
            album: getFilterValue('album'),
            newsSearch: getFilterValue('newsSearch'),
            videoSearch: getFilterValue('videoSearch'),
            albumSearch: getFilterValue('albumSearch'),
            authorDepartment: getFilterValue('authorDepartment') || query.authorDepartment,
            publishedAt: getFilterValue('publishedAt') || query.publishedAt,
        };
    }

    async search(query: any) {
        const normalized = this.normalizeFilterParams(query);
        const { q, page, limit, sortBy, sortOrder, tags, content, news, video, album, newsSearch, videoSearch, albumSearch, authorDepartment, publishedAt } = normalized;

        // local mutable copies for type-specific searches
        let newsSearchVal = newsSearch;
        let videoSearchVal = videoSearch;
        let albumSearchVal = albumSearch;
        const pageNum = parseInt(String(page)) || 1;
        const limitNum = parseInt(String(limit)) || 10;
        const skip = (pageNum - 1) * limitNum;

        // Helper check toggle value
        const isTrue = (val: any) => val === 'true' || val === '1' || val === true;
        const isFalse = (val: any) => val === 'false' || val === '0' || val === false;
        const isTextSearch = (val: any) => val && !isTrue(val) && !isFalse(val);

        // Determine which types to search
        // Treat filter[news|video|album] as either boolean toggles or type-specific text search.
        // If the param is a non-boolean text, interpret it as a type-specific search and activate that type.
        const hasGlobalSearch = !!q || !!tags || !!content;

        const convertTypeParam = (param: any) => {
            if (isTrue(param)) return { toggle: true, text: undefined };
            if (isFalse(param)) return { toggle: false, text: undefined };
            if (param !== undefined && param !== null && String(param).trim() !== '') return { toggle: true, text: String(param) };
            return { toggle: false, text: undefined };
        };

        const newsParam = convertTypeParam(news);
        if (!hasGlobalSearch && newsParam.text && !newsSearchVal) newsSearchVal = newsParam.text;
        const videoParam = convertTypeParam(video);
        if (!hasGlobalSearch && videoParam.text && !videoSearchVal) videoSearchVal = videoParam.text;
        const albumParam = convertTypeParam(album);
        if (!hasGlobalSearch && albumParam.text && !albumSearchVal) albumSearchVal = albumParam.text;

        const newsToggle = newsParam.toggle;
        const videoToggle = videoParam.toggle;
        const albumToggle = albumParam.toggle;

        const hasActiveTypeFilter = newsToggle || videoToggle || albumToggle;

        const searchNews = !hasActiveTypeFilter || newsToggle;
        const searchAlbums = !hasActiveTypeFilter || albumToggle;
        const searchVideos = !hasActiveTypeFilter || videoToggle;
        const searchTopics = !hasActiveTypeFilter;

        const promises: Promise<any>[] = [];

        // 1. Search News
        if (searchNews) {
            const newsQB = this.newsRepository.createQueryBuilder('news')
                .where('news.status = :status', { status: 1 })
                .andWhere('news.publishedAt IS NOT NULL');

            const newsTextConditions: string[] = [];
            const newsTextParams: any = {};
            if (q) {
                newsTextConditions.push('news.title COLLATE Latin1_General_CI_AI LIKE :q');
                newsTextParams.q = `%${q}%`;
            }
            if (tags) {
                newsTextConditions.push('news.tags COLLATE Latin1_General_CI_AI LIKE :tags');
                newsTextParams.tags = `%${tags}%`;
            }
            if (content) {
                newsTextConditions.push('news.content COLLATE Latin1_General_CI_AI LIKE :content');
                newsTextParams.content = `%${content}%`;
            }
            // type-specific text search: use `newsSearch` param explicitly
            if (newsSearchVal) {
                newsTextConditions.push('(news.title COLLATE Latin1_General_CI_AI LIKE :newsSearch OR news.content COLLATE Latin1_General_CI_AI LIKE :newsSearch)');
                newsTextParams.newsSearch = `%${newsSearchVal}%`;
            }

            if (newsTextConditions.length > 0) {
                newsQB.andWhere(`(${newsTextConditions.join(' OR ')})`, newsTextParams);
            }

            if (publishedAt) {
                try {
                    const pDate = typeof publishedAt === 'string' ? JSON.parse(publishedAt) : publishedAt;
                    if (pDate.startDate) {
                        newsQB.andWhere('news.publishedAt >= :startDate', { startDate: new Date(pDate.startDate) });
                    }
                    if (pDate.endDate) {
                        const end = new Date(pDate.endDate);
                        end.setHours(23, 59, 59, 999);
                        newsQB.andWhere('news.publishedAt <= :endDate', { endDate: end });
                    }
                } catch (e) { /* ignore invalid publishedAt format */ }
            }

            if (authorDepartment) {
                let deptIds: string[] = [];
                if (Array.isArray(authorDepartment)) {
                    deptIds = authorDepartment;
                } else if (typeof authorDepartment === 'string') {
                    try {
                        const parsed = JSON.parse(authorDepartment);
                        deptIds = Array.isArray(parsed) ? parsed : [authorDepartment];
                    } catch {
                        deptIds = [authorDepartment];
                    }
                }
                if (deptIds.length > 0) {
                    newsQB.andWhere('news.authorDepartment IN (:...deptIds)', { deptIds });
                }
            }
            promises.push(newsQB.getMany());
        } else {
            promises.push(Promise.resolve([]));
        }

        // 2. Search Albums
        if (searchAlbums) {
            const albumQB = this.albumRepository.createQueryBuilder('album')
                .where('album.status = :status', { status: 1 });

            const albumTextConditions: string[] = [];
            const albumTextParams: any = {};
            if (q) {
                albumTextConditions.push('album.title COLLATE Latin1_General_CI_AI LIKE :q');
                albumTextParams.q = `%${q}%`;
            }
            if (content) {
                albumTextConditions.push('album.description COLLATE Latin1_General_CI_AI LIKE :content');
                albumTextParams.content = `%${content}%`;
            }
            if (albumSearchVal) {
                albumTextConditions.push('(album.title COLLATE Latin1_General_CI_AI LIKE :albumSearch OR album.description COLLATE Latin1_General_CI_AI LIKE :albumSearch)');
                albumTextParams.albumSearch = `%${albumSearchVal}%`;
            }

            if (albumTextConditions.length > 0) {
                albumQB.andWhere(`(${albumTextConditions.join(' OR ')})`, albumTextParams);
            }

            if (publishedAt) {
                try {
                    const pDate = typeof publishedAt === 'string' ? JSON.parse(publishedAt) : publishedAt;
                    if (pDate.startDate) {
                        albumQB.andWhere('album.createdAt >= :startDate', { startDate: new Date(pDate.startDate) });
                    }
                    if (pDate.endDate) {
                        const end = new Date(pDate.endDate);
                        end.setHours(23, 59, 59, 999);
                        albumQB.andWhere('album.createdAt <= :endDate', { endDate: end });
                    }
                } catch (e) { /* ignore */ }
            }

            if (authorDepartment) {
                let deptIds: string[] = [];
                if (Array.isArray(authorDepartment)) {
                    deptIds = authorDepartment;
                } else if (typeof authorDepartment === 'string') {
                    try {
                        const parsed = JSON.parse(authorDepartment);
                        deptIds = Array.isArray(parsed) ? parsed : [authorDepartment];
                    } catch {
                        deptIds = [authorDepartment];
                    }
                }
                if (deptIds.length > 0) {
                    albumQB.andWhere('album.department IN (:...deptIds)', { deptIds });
                }
            }
            promises.push(albumQB.getMany());
        } else {
            promises.push(Promise.resolve([]));
        }

        // 3. Search Videos
        if (searchVideos) {
            const videoQB = this.videoRepository.createQueryBuilder('video')
                .where('video.status = :status', { status: 1 });

            const videoTextConditions: string[] = [];
            const videoTextParams: any = {};
            if (q) {
                videoTextConditions.push('video.title COLLATE Latin1_General_CI_AI LIKE :q');
                videoTextParams.q = `%${q}%`;
            }
            if (content) {
                videoTextConditions.push('video.description COLLATE Latin1_General_CI_AI LIKE :content');
                videoTextParams.content = `%${content}%`;
            }
            if (videoSearchVal) {
                videoTextConditions.push('(video.title COLLATE Latin1_General_CI_AI LIKE :videoSearch OR video.description COLLATE Latin1_General_CI_AI LIKE :videoSearch)');
                videoTextParams.videoSearch = `%${videoSearchVal}%`;
            }

            if (videoTextConditions.length > 0) {
                videoQB.andWhere(`(${videoTextConditions.join(' OR ')})`, videoTextParams);
            }

            if (publishedAt) {
                try {
                    const pDate = typeof publishedAt === 'string' ? JSON.parse(publishedAt) : publishedAt;
                    if (pDate.startDate) {
                        videoQB.andWhere('video.createdAt >= :startDate', { startDate: new Date(pDate.startDate) });
                    }
                    if (pDate.endDate) {
                        const end = new Date(pDate.endDate);
                        end.setHours(23, 59, 59, 999);
                        videoQB.andWhere('video.createdAt <= :endDate', { endDate: end });
                    }
                } catch (e) { /* ignore */ }
            }

            if (authorDepartment) {
                let deptIds: string[] = [];
                if (Array.isArray(authorDepartment)) {
                    deptIds = authorDepartment;
                } else if (typeof authorDepartment === 'string') {
                    try {
                        const parsed = JSON.parse(authorDepartment);
                        deptIds = Array.isArray(parsed) ? parsed : [authorDepartment];
                    } catch {
                        deptIds = [authorDepartment];
                    }
                }
                if (deptIds.length > 0) {
                    videoQB.andWhere('video.department IN (:...deptIds)', { deptIds });
                }
            }
            promises.push(videoQB.getMany());
        } else {
            promises.push(Promise.resolve([]));
        }

        // 4. Search Topics
        if (searchTopics) {
            const topicQB = this.topicRepository.createQueryBuilder('topic')
                .where('topic.status = :status', { status: 1 });

            const topicTextConditions: string[] = [];
            const topicTextParams: any = {};
            if (q) {
                topicTextConditions.push('topic.name COLLATE Latin1_General_CI_AI LIKE :q');
                topicTextParams.q = `%${q}%`;
            }
            if (content) {
                topicTextConditions.push('topic.description COLLATE Latin1_General_CI_AI LIKE :content');
                topicTextParams.content = `%${content}%`;
            }
            if (topicTextConditions.length > 0) {
                topicQB.andWhere(`(${topicTextConditions.join(' OR ')})`, topicTextParams);
            }

            if (publishedAt) {
                try {
                    const pDate = typeof publishedAt === 'string' ? JSON.parse(publishedAt) : publishedAt;
                    if (pDate.startDate) {
                        topicQB.andWhere('topic.createdAt >= :startDate', { startDate: new Date(pDate.startDate) });
                    }
                    if (pDate.endDate) {
                        const end = new Date(pDate.endDate);
                        end.setHours(23, 59, 59, 999);
                        topicQB.andWhere('topic.createdAt <= :endDate', { endDate: end });
                    }
                } catch (e) { /* ignore */ }
            }
            promises.push(topicQB.getMany());
        } else {
            promises.push(Promise.resolve([]));
        }

        const [newsResults, albumsResults, videosResults, topicsResults] = (await Promise.all(promises)) as [News[], AlbumImageEntity[], VideoEntity[], TopicEntity[]];

        // Lấy tất cả topicId duy nhất để map tên
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const allTopicIds = [
            ...newsResults.map(n => n.topic),
            ...albumsResults.map(a => a.topic),
            ...videosResults.map(v => v.topic)
        ].filter(id => id && typeof id === 'string' && uuidRegex.test(id));

        const uniqueTopicIds = [...new Set(allTopicIds)];
        let topicMap = new Map<string, string>();

        if (uniqueTopicIds.length > 0) {
            const topics = await this.topicRepository.find({
                where: { id: In(uniqueTopicIds) },
                select: ['id', 'name']
            });
            topicMap = new Map(topics.map(t => [t.id, t.name]));
        }

        const combined = [
            ...newsResults.map(n => ({
                ...n,
                topicName: topicMap.get(n.topic) || "",
                createdAt: n.publishedAt || n.createdAt,
                type: 'news',
            })),
            ...albumsResults.map(a => ({
                ...a,
                topicName: 'Ảnh',
                imageCount: a.images ? a.images.length : 0,
                type: 'image',
            })),
            ...videosResults.map(v => ({
                ...v,
                topicName: 'Video',
                durationText: v.durationText,
                type: 'video',
            })),
            ...topicsResults.map(t => ({
                ...t,
                title: t.name,
                type: 'topic',
            })),
        ];

        // Sort combined results
        combined.sort((a, b) => {
            const fieldA = a[sortBy] || a.createdAt;
            const fieldB = b[sortBy] || b.createdAt;

            const valA = fieldA instanceof Date ? fieldA.getTime() : fieldA;
            const valB = fieldB instanceof Date ? fieldB.getTime() : fieldB;

            if (sortOrder === 'ASC') {
                return valA > valB ? 1 : -1;
            } else {
                return valA < valB ? 1 : -1;
            }
        });

        const total = combined.length;
        const data = combined.slice(skip, skip + limitNum);

        return {
            data,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
        };
    }
}
