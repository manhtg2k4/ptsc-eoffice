import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { CreateProcessTemplateDto } from './dto/create-process-template.dto';
import { UpdateProcessTemplateDto } from './dto/update-process-template.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Brackets, Like } from 'typeorm';
import { ProcessTemplateEntity } from './entities/process-template.entity';
import { ProcessTemplateTaskEntity } from './entities/process-template-task.entity';
import { ListProcessTemplateDto } from './dto/list-process-template.dto';
import { UserEntity } from '../users/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';
import { CreateProcessTemplateTaskDto } from './dto/create-process-template-task.dto';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';

@Injectable()
export class ProcessTemplateService {
    constructor(
        @InjectRepository(ProcessTemplateEntity, 'mssqlConnection')
        private readonly processTemplateRepo: Repository<ProcessTemplateEntity>,
        @InjectRepository(ProcessTemplateTaskEntity, 'mssqlConnection')
        private readonly taskRepo: Repository<ProcessTemplateTaskEntity>,
        @InjectRepository(UserEntity, 'mssqlConnection')
        private readonly userRepo: Repository<UserEntity>,
        @Inject(forwardRef(() => SystemLogServiceSql))
        private readonly systemLogService: SystemLogServiceSql,
    ) { }

    private async getUserName(userId: string): Promise<string | null> {
        if (!userId) return null;
        try {
            const user = await this.userRepo.findOne({ where: { id: userId }, select: ['name'] });
            return user ? user.name : null;
        } catch (e) {
            console.error('Error fetching user name:', e);
            return null;
        }
    }

    private isUuid(id: string): boolean {
        if (!id) return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
    }

    /**
     * Phẳng hóa và chuẩn bị dữ liệu task để lưu trực tiếp
     * Đảm bảo mọi bản ghi đều có processTemplateId và parentId chính xác
     */
    private prepareTasksFlat(tasks: any[], templateId: string, parentId: string | null = null, parentPath: string | null = null): any[] {
        let flatList: any[] = [];
        if (!tasks) return flatList;

        tasks.forEach((task, index) => {
            // Tạo ID nếu chưa có (để dùng gán cho con cháu)
            const currentTaskId = (task.id && this.isUuid(task.id)) ? task.id : uuidv4();

            const currentPath = parentPath ? `${parentPath}/${currentTaskId}` : currentTaskId;

            // Robust unit mapping for saving
            let unit = task.unit;
            if (unit) {
                const u = String(unit).toLowerCase().trim();
                if (u.includes('ngay')) unit = 'Ngày';
                else if (u.includes('gio')) unit = 'Giờ';
                else if (u.includes('phut')) unit = 'Phút';
            }

            // Tạo bản sao task sạch để lưu, gán cứng các khóa ngoại
            const taskToSave = {
                ...task,
                unit,
                id: currentTaskId,
                processTemplateId: templateId,
                parentId: parentId,
                path: currentPath,
                displayOrder: task.displayOrder !== undefined ? task.displayOrder : index
            };

            // Tách children ra để xử lý riêng
            const children = task.children || [];
            delete taskToSave.children;

            flatList.push(taskToSave);

            // Đệ quy cho con cháu
            if (children.length > 0) {
                flatList = [...flatList, ...this.prepareTasksFlat(children, templateId, currentTaskId, currentPath)];
            }
        });

        return flatList;
    }

    private flattenTaskIds(nodes: any[]): string[] {
        let ids: string[] = [];
        if (!nodes) return ids;
        nodes.forEach(node => {
            if (node.id && this.isUuid(node.id)) ids.push(node.id);
            if (node.children?.length) {
                ids = [...ids, ...this.flattenTaskIds(node.children)];
            }
        });
        return ids;
    }

    private buildTaskTree(allTasks: ProcessTemplateTaskEntity[]): ProcessTemplateTaskEntity[] {
        const map = new Map<string, ProcessTemplateTaskEntity>();
        const roots: ProcessTemplateTaskEntity[] = [];

        allTasks.forEach(task => {
            // Robust unit mapping for response
            if (task.unit) {
                const unitLower = String(task.unit).toLowerCase().trim();
                if (unitLower.includes('ngay')) task.unit = 'Ngày';
                else if (unitLower.includes('gio')) task.unit = 'Giờ';
            }

            task.children = [];
            map.set(task.id, task);
        });

        allTasks.forEach(task => {
            if (task.parentId && map.has(task.parentId)) {
                const parent = map.get(task.parentId);
                if (parent) parent.children.push(task);
            } else {
                roots.push(task);
            }
        });

        const sortTree = (nodes: ProcessTemplateTaskEntity[]) => {
            nodes.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
            nodes.forEach(node => {
                if (node.children?.length) sortTree(node.children);
            });
        };
        sortTree(roots);
        return roots;
    }

    async create(createDto: CreateProcessTemplateDto, userId?: string) {
        try {
            let finalCode: string = "";
            let codeToTest: string | undefined = createDto.code;

            // Loop until a unique code is found
            while (true) {
                if (!codeToTest) {
                    codeToTest = await this.generateCode();
                }

                const existing = await this.processTemplateRepo.findOne({ where: { code: codeToTest } });
                if (!existing) {
                    finalCode = codeToTest as string;
                    break;
                } else {
                    codeToTest = undefined;
                }
            }

            const templateId = uuidv4();
            const template = this.processTemplateRepo.create({
                ...createDto,
                code: finalCode,
                id: templateId,
                tasks: [] // Không lưu task qua cascade nữa
            });

            if (userId) {
                const userName = await this.getUserName(userId);
                if (userName) template.updatedBy = userName;
            }

            // Lưu Template trước
            const savedTemplate = await this.processTemplateRepo.save(template);

            // Lưu toàn bộ task theo dạng phẳng
            if (createDto.tasks && createDto.tasks.length > 0) {
                const flatTasks = this.prepareTasksFlat(createDto.tasks, templateId);
                await this.taskRepo.save(this.taskRepo.create(flatTasks));
            }

            if (userId) {
                await this.systemLogService.createLogFromSystem({
                    action: 'CREATE',
                    details: `Tạo mới quy trình mẫu: ${savedTemplate.name} (${savedTemplate.code})`,
                    method: 'POST',
                    status: 'SUCCESS',
                    type: 'PROCESS_TEMPLATE',
                    subType: 'PROCESS_TEMPLATE',
                    userInfo: userId,
                    ipAddress: 'System',
                    timestamp: new Date().toISOString(),
                });
            }

            return this.findOne(savedTemplate.id);
        } catch (error) {
            throw new BadRequestException(error.message || 'Lỗi khi tạo quy trình mẫu');
        }
    }

    async findAll(params: ListProcessTemplateDto) {
        try {
            const { page = 1, pageSize, keyword, filter } = params;
            // Hỗ trợ cả limit từ query string nếu FE gửi limit thay vì pageSize
            const limit = params['limit'] || pageSize || 25;
            const pageNum = Number(page) || 1;
            const limitNum = Number(limit) || 25;
            const qb = this.processTemplateRepo.createQueryBuilder('template');


            if (keyword) {
                qb.where('(template.name COLLATE Latin1_General_CI_AI LIKE :keyword COLLATE Latin1_General_CI_AI OR template.code COLLATE Latin1_General_CI_AI LIKE :keyword COLLATE Latin1_General_CI_AI)', { keyword: `%${keyword}%` });
            }

            if (filter) {
                // Xử lý tìm kiếm OR cho name và code trong filter
                if (filter.name || filter.code) {
                    qb.andWhere(new Brackets(qbFilter => {
                        if (filter.name) {
                            qbFilter.orWhere('template.name COLLATE Latin1_General_CI_AI LIKE :filterName COLLATE Latin1_General_CI_AI', { filterName: `%${filter.name}%` });
                        }
                        if (filter.code) {
                            qbFilter.orWhere('template.code COLLATE Latin1_General_CI_AI LIKE :filterCode COLLATE Latin1_General_CI_AI', { filterCode: `%${filter.code}%` });
                        }
                    }));
                }

                if (filter.updatedBy) {
                    const userName = await this.getUserName(filter.updatedBy);
                    if (userName) qb.andWhere('template.updatedBy = :userName', { userName });
                    else qb.andWhere('1=0');
                }
                if (filter.totalExecutionTime) {
                    const { startDate, endDate } = filter.totalExecutionTime;
                    if (startDate) qb.andWhere('template.updatedAt >= :startDate', { startDate: new Date(startDate) });
                    if (endDate) {
                        const end = new Date(endDate);
                        end.setHours(23, 59, 59, 999);
                        qb.andWhere('template.updatedAt <= :endDate', { endDate: end });
                    }
                }
            }


            const [data, total] = await qb
                .orderBy('template.createdAt', 'DESC')
                .skip((pageNum - 1) * limitNum)
                .take(limitNum)
                .getManyAndCount();


            // Map totalExecutionTime for response list
            data.forEach(item => {
                if (item.totalExecutionTime) {
                    item.totalExecutionTime = item.totalExecutionTime
                        .replace(/ngay/gi, 'ngày')
                        .replace(/gio/gi, 'giờ')
                        .replace(/phut/gi, 'phút');
                }
            });

            return { data, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
        } catch (error) {
            throw new BadRequestException(error.message || 'Lỗi khi lấy danh sách quy trình mẫu');
        }
    }
    async findAllNoFilter(params: ListProcessTemplateDto) {
        try {
            const { page = 1, pageSize, keyword, name, code, filter } = params;
            // Hỗ trợ cả limit từ query string nếu FE gửi limit thay vì pageSize
            const limit = params['limit'] || pageSize || 25;
            const pageNum = Number(page) || 1;
            const limitNum = Number(limit) || 25;
            const qb = this.processTemplateRepo.createQueryBuilder('template');

            if (keyword) {
                qb.where('(template.name COLLATE Latin1_General_CI_AI LIKE :keyword COLLATE Latin1_General_CI_AI OR template.code COLLATE Latin1_General_CI_AI LIKE :keyword COLLATE Latin1_General_CI_AI)', { keyword: `%${keyword}%` });
            }
            if (name || code) {
                qb.andWhere(new Brackets(qbFilter => {
                    if (name) {
                        qbFilter.orWhere('template.name COLLATE Latin1_General_CI_AI LIKE :filterName COLLATE Latin1_General_CI_AI', { filterName: `%${name}%` });
                    }
                    if (code) {
                        qbFilter.orWhere('template.code COLLATE Latin1_General_CI_AI LIKE :filterCode COLLATE Latin1_General_CI_AI', { filterCode: `%${code}%` });
                    }
                }));
            }

            // if (filter) {
            //     // Xử lý tìm kiếm OR cho name và code trong filter
            //     if (filter.name || filter.code) {
            //         qb.andWhere(new Brackets(qbFilter => {
            //             if (filter.name) {
            //                 qbFilter.orWhere('template.name LIKE :filterName', { filterName: `%${filter.name}%` });
            //             }
            //             if (filter.code) {
            //                 qbFilter.orWhere('template.code LIKE :filterCode', { filterCode: `%${filter.code}%` });
            //             }
            //         }));
            //     }

            //     if (filter.updatedBy) {
            //         const userName = await this.getUserName(filter.updatedBy);
            //         if (userName) qb.andWhere('template.updatedBy = :userName', { userName });
            //         else qb.andWhere('1=0');
            //     }
            //     if (filter.totalExecutionTime) {
            //         const { startDate, endDate } = filter.totalExecutionTime;
            //         if (startDate) qb.andWhere('template.updatedAt >= :startDate', { startDate: new Date(startDate) });
            //         if (endDate) {
            //             const end = new Date(endDate);
            //             end.setHours(23, 59, 59, 999);
            //             qb.andWhere('template.updatedAt <= :endDate', { endDate: end });
            //         }
            //     }
            // }

            const [data, total] = await qb
                .orderBy('template.createdAt', 'DESC')
                .skip((pageNum - 1) * limitNum)
                .take(limitNum)
                .getManyAndCount();

            // Map totalExecutionTime for response list
            data.forEach(item => {
                if (item.totalExecutionTime) {
                    item.totalExecutionTime = item.totalExecutionTime
                        .replace(/ngay/gi, 'ngày')
                        .replace(/gio/gi, 'giờ')
                        .replace(/phut/gi, 'phút');
                }
            });

            return { data, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
        } catch (error) {
            throw new BadRequestException(error.message || 'Lỗi khi lấy danh sách quy trình mẫu');
        }
    }

    async findOne(id: string) {
        try {
            const entity = await this.processTemplateRepo.findOne({ where: { id } });
            if (!entity) throw new NotFoundException('Không tìm thấy quy trình mẫu');

            // Map totalExecutionTime for response
            if (entity.totalExecutionTime) {
                entity.totalExecutionTime = entity.totalExecutionTime
                    .replace(/ngay/gi, 'ngày')
                    .replace(/gio/gi, 'giờ')
                    .replace(/phut/gi, 'phút');
            }

            const allTasks = await this.taskRepo.find({ where: { processTemplateId: id } });
            entity.tasks = this.buildTaskTree(allTasks);

            return entity;
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            throw new BadRequestException(error.message || 'Lỗi khi lấy chi tiết quy trình mẫu');
        }
    }

    async update(id: string, updateDto: UpdateProcessTemplateDto, userId?: string) {
        try {
            const entity = await this.processTemplateRepo.findOne({ where: { id } });
            if (!entity) throw new NotFoundException('Không tìm thấy quy trình');

            if (updateDto.code && updateDto.code !== entity.code) {
                const existing = await this.processTemplateRepo.findOne({ where: { code: updateDto.code } });
                if (existing) throw new BadRequestException('Mã quy trình đã tồn tại');
            }

            // Xử lý Tasks
            if (updateDto.tasks) {
                // 1. Lấy tất cả IDs cũ để xóa những cái không còn dùng
                const allCurrentTasksInDb = await this.taskRepo.find({ where: { processTemplateId: id }, select: ['id'] });
                const existingIds = allCurrentTasksInDb.map(t => t.id);

                // 2. Phẳng hóa dữ liệu mới và ID mới
                const flatTasksToSave = this.prepareTasksFlat(updateDto.tasks, id);
                const incomingIds = flatTasksToSave.map(t => t.id);

                // 3. Xóa các ID cũ không có trong data mới
                const idsToDelete = existingIds.filter(exId => !incomingIds.includes(exId));
                if (idsToDelete.length > 0) {
                    await this.taskRepo.delete({ id: In(idsToDelete) });
                }

                // 4. Lưu trực tiếp danh sách phẳng (Update hoặc Insert mới)
                await this.taskRepo.save(this.taskRepo.create(flatTasksToSave));
            }

            // Cập nhật các trường thông tin chung
            const { tasks, ...otherData } = updateDto;
            Object.assign(entity, otherData);
            if (userId) {
                const userName = await this.getUserName(userId);
                if (userName) entity.updatedBy = userName;
            }

            await this.processTemplateRepo.save(entity);

            if (userId) {
                await this.systemLogService.createLogFromSystem({
                    action: 'UPDATE',
                    details: `Cập nhật quy trình mẫu: ${entity.name} (${entity.code})`,
                    method: 'PATCH',
                    status: 'SUCCESS',
                    type: 'PROCESS_TEMPLATE',
                    subType: 'PROCESS_TEMPLATE',
                    userInfo: userId,
                    ipAddress: 'System',
                    timestamp: new Date().toISOString(),
                });
            }

            return this.findOne(id);
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            throw new BadRequestException(error.message || 'Lỗi khi cập nhật quy trình mẫu');
        }
    }

    async remove(id: string, userId?: string) {
        try {
            const entity = await this.findOne(id);
            await this.processTemplateRepo.remove(entity);

            if (userId) {
                await this.systemLogService.createLogFromSystem({
                    action: 'DELETE',
                    details: `Xóa quy trình mẫu: ${entity.name} (${entity.code})`,
                    method: 'DELETE',
                    status: 'SUCCESS',
                    type: 'PROCESS_TEMPLATE',
                    subType: 'PROCESS_TEMPLATE',
                    userInfo: userId,
                    ipAddress: 'System',
                    timestamp: new Date().toISOString(),
                });
            }

            return { success: true };
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            throw new BadRequestException(error.message || 'Lỗi khi xóa quy trình mẫu');
        }
    }

    async removeMany(ids: string[], userId?: string) {
        try {
            if (!ids?.length) throw new BadRequestException('Danh sách IDs trống');
            const entities = await this.processTemplateRepo.find({ where: { id: In(ids) } });
            if (!entities.length) throw new NotFoundException('Không tìm thấy bản ghi nào');
            await this.processTemplateRepo.remove(entities);

            if (userId) {
                await this.systemLogService.createLogFromSystem({
                    action: 'DELETE_MANY',
                    details: `Xóa nhiều quy trình mẫu (Số lượng: ${entities.length})`,
                    method: 'DELETE',
                    status: 'SUCCESS',
                    type: 'PROCESS_TEMPLATE',
                    subType: 'PROCESS_TEMPLATE',
                    userInfo: userId,
                    ipAddress: 'System',
                    timestamp: new Date().toISOString(),
                });
            }

            return { success: true, count: entities.length };
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            throw new BadRequestException(error.message || 'Lỗi khi xóa nhiều quy trình mẫu');
        }
    }

    private generateRandomString(length: number): string {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

    /**
     * Sinh mã quy trình tự động: QT[Số thứ tự]-[5 Ký tự ngẫu nhiên]
     * Đảm bảo Số thứ tự luôn tăng dần từ mã lớn nhất trong DB
     */
    private async generateCode(): Promise<string> {
        const prefix = 'QT';

        // Lấy danh sách 20 bản ghi gần nhất để tìm số lớn nhất thực sự
        const templates = await this.processTemplateRepo.find({
            where: { code: Like(`${prefix}%`) },
            order: { code: 'DESC' },
            take: 20
        });

        let maxNumber = 0;
        templates.forEach(t => {
            // Chỉ lấy số ở ngay sau tiền tố QT và trước dấu gạch ngang (nếu có)
            const match = t.code.match(/^QT(\d+)/);
            if (match) {
                const num = parseInt(match[1], 10);
                // Giới hạn 8 chữ số để bỏ qua các mã dạng timestamp (thường là 13 chữ số)
                if (num < 100000000) {
                    if (num > maxNumber) maxNumber = num;
                }
            }
        });

        const nextNumber = maxNumber + 1;
        const suffix = nextNumber.toString().padStart(5, '0');
        const randomStr = this.generateRandomString(5);
        return `${prefix}${suffix}-${randomStr}`;
    }
}
