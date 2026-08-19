import { Injectable } from "@nestjs/common";
import { PassportIncomingDelegationItemEntity } from "./entities/passport-incoming-delegation-item.entity";
import { Brackets, In, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { PassportIncomingDelegationsEntity } from "./entities/passport-incoming-delegations.entity";
import { CreateIncomingDelegationDto } from "./dto/create-incoming-delegation.dto";
import { v4 as uuidv4 } from 'uuid';
import { UpdateIncomingDelegationDto } from "./dto/update-incoming-delegation.dto";
import { CrmSourceDataEntity } from "src/crmsource/entities/crmsource-data.entity";
import { UserEntity } from "src/users/entities/user.entity";
import { validateAndParseSortParam, getDtoKeys } from 'src/utils/sort-validator.util';
import * as ExcelJS from 'exceljs';
import * as moment from 'moment';

function parseToRegularString(input: any): string | null {
	if (input === undefined || input === null || input === '') {
		return null;
	}

	if (Array.isArray(input)) {
		const values = input.map((n: any) => typeof n === 'object' && n !== null ? (n.value || n.id) : n);
		return values.filter(v => v !== undefined && v !== null && v !== '').join(',');
	}

	if (typeof input === 'string' && input.trim().startsWith('[') && input.trim().endsWith(']')) {
		try {
			const parsed = JSON.parse(input);
			if (Array.isArray(parsed)) {
				const values = parsed.map((n: any) => typeof n === 'object' && n !== null ? (n.value || n.id) : n);
				return values.filter(v => v !== undefined && v !== null && v !== '').join(',');
			}
		} catch {}
	}

	if (typeof input === 'object' && input !== null) {
		return input.value || input.id || null;
	}

	if (typeof input === 'string') {
		return input.trim();
	}

	return String(input);
}

@Injectable()
export class PassportIncomingDelegationService {
	constructor(
		@InjectRepository(PassportIncomingDelegationsEntity, 'mssqlConnection')
		private readonly passportIncomingDelegationsRepo: Repository<PassportIncomingDelegationsEntity>,
		@InjectRepository(PassportIncomingDelegationItemEntity, 'mssqlConnection')
		private readonly passportIncomingDelegationItemRepo: Repository<PassportIncomingDelegationItemEntity>,
		@InjectRepository(CrmSourceDataEntity, 'mssqlConnection')
		private readonly crmSourceDataRepo: Repository<CrmSourceDataEntity>,
		@InjectRepository(UserEntity, 'mssqlConnection')
		private readonly userRepo: Repository<UserEntity>,
	) { }

	async findAll(query: any): Promise<{ data: any[], total: number, page: number, limit: number, totalPages: number, success: boolean, message: string }> {
		try {
			const isExport = query.isExport === 'true' || query.isExport === '1' || query.isExport === true;
			const page = Number(query.page) || 1;
			const limit = isExport ? 99999 : (Number(query.limit) || 20);
			const { search, incomingDateFrom, incomingDateTo, sort, originType, nationality, nationalities } = query;
			const skip = isExport ? 0 : (page - 1) * limit;

			const qb = this.passportIncomingDelegationsRepo.createQueryBuilder('delegation')
				.leftJoinAndSelect('delegation.listOfReceptionMembers', 'members');

			// Extract filter object (nếu client truyền filter dạng object hoặc JSON string)
			let filterObj: any = query.filter;
			if (typeof filterObj === 'string') {
				try {
					filterObj = JSON.parse(filterObj);
				} catch {
					filterObj = {};
				}
			}
			filterObj = filterObj || {};

			const targetSearch = search || filterObj.search;
			const targetOriginType = originType || filterObj.originType;
			const rawNationality = nationality || nationalities || filterObj.nationality || filterObj.nationalities;

			// Helper trích xuất range ngày (startDate, endDate) từ object phẳng hoặc lồng nhau
			const extractDateRange = (src: any, keys: string[]) => {
				let start: string | undefined;
				let end: string | undefined;
				if (!src) return { start, end };

				for (const k of keys) {
					// 1. Dạng object lồng: src.incomingDate = { startDate: '...', endDate: '...' }
					if (typeof src[k] === 'object' && src[k] !== null) {
						if (src[k].startDate) start = start || String(src[k].startDate).trim();
						if (src[k].fromDate) start = start || String(src[k].fromDate).trim();
						if (src[k].endDate) end = end || String(src[k].endDate).trim();
						if (src[k].toDate) end = end || String(src[k].toDate).trim();
					}
					// 2. Dạng query key có ngoặc: src['filter[incomingDate][startDate]'] hoặc src['incomingDate[startDate]']
					if (src[`filter[${k}][startDate]`]) start = start || String(src[`filter[${k}][startDate]`]).trim();
					if (src[`filter[${k}][fromDate]`]) start = start || String(src[`filter[${k}][fromDate]`]).trim();
					if (src[`filter[${k}][endDate]`]) end = end || String(src[`filter[${k}][endDate]`]).trim();
					if (src[`filter[${k}][toDate]`]) end = end || String(src[`filter[${k}][toDate]`]).trim();

					if (src[`${k}[startDate]`]) start = start || String(src[`${k}[startDate]`]).trim();
					if (src[`${k}[fromDate]`]) start = start || String(src[`${k}[fromDate]`]).trim();
					if (src[`${k}[endDate]`]) end = end || String(src[`${k}[endDate]`]).trim();
					if (src[`${k}[toDate]`]) end = end || String(src[`${k}[toDate]`]).trim();
				}
				return { start, end };
			};

			const incQueryRange = extractDateRange(query, ['incomingDate', 'incoming_date']);
			const incFilterRange = extractDateRange(filterObj, ['incomingDate', 'incoming_date']);

			const incDateFrom = query.incomingDateFrom || query.incomingStartDate || filterObj.incomingDateFrom || filterObj.fromDate || incQueryRange.start || incFilterRange.start;
			const incDateTo = query.incomingDateTo || query.incomingEndDate || filterObj.incomingDateTo || filterObj.toDate || incQueryRange.end || incFilterRange.end;

			const outQueryRange = extractDateRange(query, ['outgoingDate', 'outgoing_date']);
			const outFilterRange = extractDateRange(filterObj, ['outgoingDate', 'outgoing_date']);

			const outDateFrom = query.outgoingDateFrom || query.outgoingStartDate || filterObj.outgoingDateFrom || filterObj.outgoingStartDate || outQueryRange.start || outFilterRange.start;
			const outDateTo = query.outgoingDateTo || query.outgoingEndDate || filterObj.outgoingDateTo || filterObj.outgoingEndDate || outQueryRange.end || outFilterRange.end;

			// Prepare OriginType terms
			let originTermsArray: string[] = [];
			if (targetOriginType) {
				let originList: string[] = [];
				if (Array.isArray(targetOriginType)) {
					originList = targetOriginType.map(o => String(o).trim()).filter(Boolean);
				} else if (typeof targetOriginType === 'string' && targetOriginType.trim() !== '') {
					originList = targetOriginType.split(',').map(o => o.trim()).filter(Boolean);
				}

				if (originList.length > 0) {
					const crmOrigins = await this.crmSourceDataRepo.find({
						where: [
							{ id: In(originList) },
							{ value: In(originList) },
							{ title: In(originList) },
						]
					});

					const originTerms = new Set<string>();
					originList.forEach(o => originTerms.add(o));
					crmOrigins.forEach(item => {
						if (item.id) originTerms.add(item.id);
						if (item.value) originTerms.add(item.value);
						if (item.title) originTerms.add(item.title);
					});

					originTermsArray = Array.from(originTerms).filter(Boolean);
				}
			}

			// Prepare Nationality terms
			let natTermsArray: string[] = [];
			if (rawNationality) {
				let natList: string[] = [];
				if (Array.isArray(rawNationality)) {
					natList = rawNationality.map(n => String(n).trim()).filter(Boolean);
				} else if (typeof rawNationality === 'string' && rawNationality.trim() !== '') {
					natList = rawNationality.split(',').map(n => n.trim()).filter(Boolean);
				}

				if (natList.length > 0) {
					// Tra cứu thông tin ID, value, title tương ứng trong danh mục crm_source_data
					const crmItems = await this.crmSourceDataRepo.find({
						where: [
							{ id: In(natList) },
							{ value: In(natList) },
							{ title: In(natList) },
						]
					});

					const allSearchTerms = new Set<string>();
					natList.forEach(nat => allSearchTerms.add(nat));
					crmItems.forEach(item => {
						if (item.id) allSearchTerms.add(item.id);
						if (item.value) allSearchTerms.add(item.value);
						if (item.title) allSearchTerms.add(item.title);
					});

					natTermsArray = Array.from(allSearchTerms).filter(Boolean);
				}
			}

			// Kết hợp điều kiện originType và nationality theo OR (thay vì AND) nếu cả 2 cùng được truyền
			const hasOrigin = originTermsArray.length > 0;
			const hasNat = natTermsArray.length > 0;

			if (hasOrigin && hasNat) {
				qb.andWhere(new Brackets(sqb => {
					sqb.where('delegation.originType IN (:...originTermsArray)', { originTermsArray });
					natTermsArray.forEach((term, index) => {
						const paramName = `nat_${index}`;
						sqb.orWhere(`delegation.nationalities LIKE :${paramName}`, { [paramName]: `%${term}%` });
					});
				}));
			} else if (hasOrigin) {
				qb.andWhere('delegation.originType IN (:...originTermsArray)', { originTermsArray });
			} else if (hasNat) {
				qb.andWhere(new Brackets(sqb => {
					natTermsArray.forEach((term, index) => {
						const paramName = `nat_${index}`;
						if (index === 0) {
							sqb.where(`delegation.nationalities LIKE :${paramName}`, { [paramName]: `%${term}%` });
						} else {
							sqb.orWhere(`delegation.nationalities LIKE :${paramName}`, { [paramName]: `%${term}%` });
						}
					});
				}));
			}

			if (targetSearch) {
				qb.andWhere(new Brackets(sqb => {
					sqb.where('delegation.nameDelegation LIKE :search', { search: `%${targetSearch}%` })
					   .orWhere('delegation.delegationLeader LIKE :search', { search: `%${targetSearch}%` })
					   .orWhere('delegation.meetingContent LIKE :search', { search: `%${targetSearch}%` });
				}));
			}

			const excludeFields = [
				'page', 'limit', 'search', 'sort', 'sortOrder',
				'incomingDateFrom', 'incomingDateTo', 'fromDate', 'toDate',
				'outgoingDateFrom', 'outgoingDateTo', 'outgoingStartDate', 'outgoingEndDate',
				'incomingDate', 'outgoingDate', 'incoming_date', 'outgoing_date',
				'status', 'processFn', 'isExport', 'userId', 'countOnly', 'filter', 'userFilters',
				'originType', 'nationality', 'nationalities'
			];

			const dynamicParams = { ...filterObj, ...query };
			Object.keys(dynamicParams).forEach(key => {
				if (key.includes('[') || key.includes(']')) return;
				if (typeof dynamicParams[key] === 'object' && dynamicParams[key] !== null) return;

				if (!excludeFields.includes(key) && dynamicParams[key] !== undefined && dynamicParams[key] !== null && dynamicParams[key] !== '') {
					const val = dynamicParams[key];
					if (typeof val === 'string' || typeof val === 'number') {
						qb.andWhere(`delegation.${key} LIKE :param_${key}`, { [`param_${key}`]: `%${val}%` });
					}
				}
			});

			qb.andWhere('delegation.status = :activeStatus', { activeStatus: 1 });

			if (incDateFrom) qb.andWhere('delegation.incomingDate >= :incDateFrom', { incDateFrom });
			if (incDateTo) qb.andWhere('delegation.incomingDate <= :incDateTo', { incDateTo });

			if (outDateFrom) qb.andWhere('delegation.outgoingDate >= :outDateFrom', { outDateFrom });
			if (outDateTo) qb.andWhere('delegation.outgoingDate <= :outDateTo', { outDateTo });

			// Sort (dùng shared utility)
			const allowedSortFields = [
				...getDtoKeys(CreateIncomingDelegationDto),
				'createdAt', 'updatedAt'
			];

			const sortResult = validateAndParseSortParam(sort, allowedSortFields);
			if (Object.keys(sortResult).length > 0) {
				(Object.entries(sortResult) as [string, 'ASC' | 'DESC'][]).forEach(([key, order]) => {
					qb.addOrderBy(`delegation.${key}`, order);
				});
			} else {
				qb.orderBy('delegation.updatedAt', 'DESC');
			}

			if (!isExport) {
				qb.skip(skip).take(limit);
			}

			const [entities, total] = await qb.getManyAndCount();
			const rolesData = await this.crmSourceDataRepo.find();

			// Tra cứu danh sách người dùng cho delegationLeader
			const leaderIds = [...new Set(entities.map(item => item.delegationLeader).filter(Boolean))] as string[];
			const usersMap = new Map<string, string>();
			if (leaderIds.length > 0) {
				const users = await this.userRepo.find({
					where: [
						{ id: In(leaderIds) },
						{ username: In(leaderIds) }
					]
				});
				users.forEach(u => {
					const name = u.fullName || u.name || u.username || '';
					if (u.id) usersMap.set(u.id, name);
					if (u.username) usersMap.set(u.username, name);
				});
			}

			const data = entities.map(item => {
				const bossNames = (item.listOfReceptionMembers || [])
					.filter(m => m.role?.toLowerCase() === 'boss')
					.map(m => m.fullName)
					.join(', ');

				// Map originType thành title tiếng Việt
				let originTypeTitle: string | null = null;
				if (item.originType) {
					const originInfo = rolesData.find(
						r => r.value === item.originType || r.id === item.originType || r.title === item.originType
					);
					if (originInfo?.title) {
						originTypeTitle = originInfo.title;
					} else if (item.originType === 'NUOC_NGOAI') {
						originTypeTitle = 'Nước ngoài';
					} else if (item.originType === 'TRONG_NUOC') {
						originTypeTitle = 'Trong nước';
					} else {
						originTypeTitle = item.originType;
					}
				}

				let nationalitiesTitles: string[] = [];
				if (item.nationalities) {
					let parsed: any = [];
					if (typeof item.nationalities === 'string') {
						try {
							parsed = JSON.parse(item.nationalities);
						} catch {
							if (item.nationalities.includes(',')) {
								parsed = item.nationalities.split(',').map((s: string) => s.trim());
							} else {
								parsed = [item.nationalities];
							}
						}
					} else if (Array.isArray(item.nationalities)) {
						parsed = item.nationalities;
					} else {
						parsed = [item.nationalities];
					}

					if (Array.isArray(parsed)) {
						nationalitiesTitles = parsed.map(nat => {
							const natInfo = rolesData.find(
								r => r.value === nat || r.id === nat || r.title === nat
							);
							return natInfo?.title || nat;
						}).filter(Boolean);
					}
				}

				const nationalitiesString = nationalitiesTitles.length > 0 ? nationalitiesTitles.join(', ') : (item.nationalities || null);
				const leaderName = item.delegationLeader ? (usersMap.get(item.delegationLeader) || item.delegationLeader) : null;

				return {
					...item,
					delegationLeader: leaderName,
					originType: originTypeTitle,
					originTypeRaw: item.originType,
					nationalities: nationalitiesString,
					nationality: nationalitiesString,
					nationalitiesList: nationalitiesTitles,
					listOfReceptionMembers: bossNames,
				};
			});

			const totalPages = Math.ceil(total / limit) || 0;

			return {
				data,
				total,
				page,
				limit,
				totalPages,
				success: true,
				message: 'Lấy danh sách đoàn vào thành công',
			};
		} catch (error) {
			console.error('Lỗi khi lấy danh sách đoàn vào:', error);
			throw error;
		}
	}

	async findOne(id: string): Promise<{ data: any | null, message: string }> {
		try {
			const delegation = await this.passportIncomingDelegationsRepo.findOne({
				where: { id },
				relations: ['listOfReceptionMembers'],
			});

			if (!delegation) return { data: null, message: 'Không tìm thấy đoàn vào' };

			// Lấy danh sách crm_source_data để map originType và role tên hiển thị
			const rolesData = await this.crmSourceDataRepo.find();

			// 1. Map delegationLeader thành user object từ bảng người dùng
			let delegationLeaderMapped: any = null;
			if (delegation.delegationLeader) {
				const leaderUser = await this.userRepo.findOne({
					where: [
						{ id: delegation.delegationLeader },
						{ username: delegation.delegationLeader }
					],
				});

				if (leaderUser) {
					delegationLeaderMapped = {
						id: leaderUser.id,
						name: leaderUser.fullName || leaderUser.name || leaderUser.username,
						fullName: leaderUser.fullName || leaderUser.name,
						nameVn: leaderUser.name || leaderUser.fullName || leaderUser.username,
						username: leaderUser.username,
					};
				} else {
					delegationLeaderMapped = {
						id: delegation.delegationLeader,
						name: delegation.delegationLeader,
						nameVn: delegation.delegationLeader,
					};
				}
			}

			// 2. Map originType từ crmSourceDataRepo
			let originTypeMapped: any = null;
			if (delegation.originType) {
				const originInfo = rolesData.find(
					r => r.value === delegation.originType || r.id === delegation.originType || r.title === delegation.originType
				);
				if (originInfo) {
					originTypeMapped = {
						id: originInfo.id,
						title: originInfo.title,
						value: originInfo.value,
					};
				} else {
					originTypeMapped = {
						id: delegation.originType,
						title: delegation.originType,
						value: delegation.originType,
					};
				}
			}

			// 3. Map nationalities từ chính bảng đoàn vào
			let nationalitiesMapped: any = [];
			if (delegation.nationalities) {
				let parsed: any = [];
				if (typeof delegation.nationalities === 'string') {
					try {
						parsed = JSON.parse(delegation.nationalities);
					} catch {
						if (delegation.nationalities.includes(',')) {
							parsed = delegation.nationalities.split(',').map((s: string) => s.trim());
						} else {
							parsed = [delegation.nationalities];
						}
					}
				} else if (Array.isArray(delegation.nationalities)) {
					parsed = delegation.nationalities;
				} else {
					parsed = [delegation.nationalities];
				}

				if (Array.isArray(parsed)) {
					nationalitiesMapped = parsed.map(nat => {
						const natInfo = rolesData.find(
							r => r.value === nat || r.id === nat || r.title === nat
						);
						return natInfo ? {
							id: natInfo.id,
							title: natInfo.title,
							value: natInfo.value
						} : {
							id: nat,
							title: nat,
							value: nat
						};
					});
				}
			}

			// 4. Map lại listOfReceptionMembers
			const mappedMembers = (delegation.listOfReceptionMembers || []).map(member => {
				const roleInfo = rolesData.find(r => r.value === member.role || r.id === member.role);
				let mappedNationality: any = null;
				if (member.nationality) {
					const natInfo = rolesData.find(
						r => r.value === member.nationality || r.id === member.nationality || r.title === member.nationality
					);
					mappedNationality = natInfo ? {
						id: natInfo.id,
						title: natInfo.title,
						value: natInfo.value,
					} : {
						id: member.nationality,
						title: member.nationality,
						value: member.nationality,
					};
				}

				return {
					...member,
					role: {
						title: roleInfo?.title || member.role || '',
						value: member.role || ''
					},
					nationality: mappedNationality,
				};
			});

			const mappedData = {
				...delegation,
				delegationLeader: delegationLeaderMapped,
				originType: originTypeMapped,
				nationalities: nationalitiesMapped,
				nationality: nationalitiesMapped[0] || null,
				listOfReceptionMembers: mappedMembers,
			};

			return {
				data: mappedData,
				message: 'Lấy chi tiết đoàn vào thành công',
			};
		} catch (error) {
			console.error('Lỗi khi lấy chi tiết đoàn vào:', error);
			throw error;
		}
	}

	async create(createDto: CreateIncomingDelegationDto): Promise<{ data: PassportIncomingDelegationsEntity | null, message: string }> {
		try {
			let nationalitiesStr = createDto.nationalities;
			if (nationalitiesStr === undefined || nationalitiesStr === null || nationalitiesStr === '') {
				nationalitiesStr = createDto.nationality;
			}
			const parsedNationality = parseToRegularString(nationalitiesStr);

			const { nationality, ...restDto } = createDto;
			const delegation = this.passportIncomingDelegationsRepo.create({
				...restDto,
				nationalities: parsedNationality,
				id: uuidv4(),
			});

			if (delegation.listOfReceptionMembers && delegation.listOfReceptionMembers.length > 0) {
				delegation.listOfReceptionMembers = delegation.listOfReceptionMembers.map(item => {
					const roleValue = typeof item.role === 'object' ? (item as any).role?.value : item.role;
					const nationalityValue = typeof item.nationality === 'object' ? (item as any).nationality?.value || (item as any).nationality?.id : item.nationality;
					return {
						...item,
						role: roleValue,
						nationality: nationalityValue,
						id: uuidv4(),
					};
				});
			}

			const savedDelegation = await this.passportIncomingDelegationsRepo.save(delegation);
			const mappedResult = await this.findOne(savedDelegation.id);
			return { data: mappedResult.data, message: 'Tạo đoàn vào thành công' };
		} catch (error) {
			console.error('Lỗi khi tạo đoàn vào:', error);
			throw error;
		}
	}

	async update(id: string, updateDto: UpdateIncomingDelegationDto): Promise<{ data: PassportIncomingDelegationsEntity | null, message: string }> {
		try {
			const { listOfReceptionMembers, nationality, ...mainData } = updateDto;
			let nationalitiesStr = mainData.nationalities;
			if (nationalitiesStr === undefined || nationalitiesStr === null || nationalitiesStr === '') {
				nationalitiesStr = nationality;
			}

			if (nationalitiesStr !== undefined) {
				(mainData as any).nationalities = parseToRegularString(nationalitiesStr);
			}

			const existingDelegation = await this.passportIncomingDelegationsRepo.findOne({
				where: { id },
				relations: ['listOfReceptionMembers'],
			});

			if (!existingDelegation) return { data: null, message: 'Không tìm thấy đoàn vào' };

			this.passportIncomingDelegationsRepo.merge(existingDelegation, mainData);

			if (listOfReceptionMembers) {
				const itemsToSave: PassportIncomingDelegationItemEntity[] = [];
				const updatedDelegationItemIds: string[] = [];

				for (const item of listOfReceptionMembers) {
					// Xử lý nếu role/nationality gửi lên là object
					const roleValue = typeof item.role === 'object' ? (item as any).role?.value : item.role;
					const nationalityValue = typeof item.nationality === 'object' ? (item as any).nationality?.value || (item as any).nationality?.id : item.nationality;
					const itemToProcess = { ...item, role: roleValue, nationality: nationalityValue };

					if (item.id) {
						const existingItem = await this.passportIncomingDelegationItemRepo.findOneBy({ id: item.id });
						if (existingItem) {
							this.passportIncomingDelegationItemRepo.merge(existingItem, itemToProcess);
							existingItem.requestId = id;
							itemsToSave.push(existingItem);
							updatedDelegationItemIds.push(item.id);
						} else {
							const newItem = this.passportIncomingDelegationItemRepo.create({ ...itemToProcess, id: uuidv4(), requestId: id });
							itemsToSave.push(newItem);
						}
					} else {
						const newItem = this.passportIncomingDelegationItemRepo.create({ ...itemToProcess, id: uuidv4(), requestId: id });
						itemsToSave.push(newItem);
					}
				}

				if (existingDelegation.listOfReceptionMembers && existingDelegation.listOfReceptionMembers.length > 0) {
					const oldIds = existingDelegation.listOfReceptionMembers.map(item => item.id);
					const idsToDelete = oldIds.filter(oldId => !updatedDelegationItemIds.includes(oldId));
					if (idsToDelete.length > 0) await this.passportIncomingDelegationItemRepo.delete({ id: In(idsToDelete) });
				}
				if (itemsToSave.length > 0) await this.passportIncomingDelegationItemRepo.save(itemsToSave);
			} else if (existingDelegation.listOfReceptionMembers && existingDelegation.listOfReceptionMembers.length > 0) {
				await this.passportIncomingDelegationItemRepo.delete({ requestId: id });
			}

			await this.passportIncomingDelegationsRepo.update(id, mainData);
			const mappedResult = await this.findOne(id);

			return { data: mappedResult.data, message: 'Cập nhật đoàn vào thành công' };
		} catch (error) {
			console.error('Lỗi khi cập nhật đoàn vào:', error);
			throw error;
		}
	}

	async softDeleteMany(ids: string[]): Promise<{ success: boolean, message: string }> {
		try {
			if (!ids || ids.length === 0) return { success: false, message: 'Danh sách ID không được để trống' };
			await this.passportIncomingDelegationsRepo.update({ id: In(ids) }, { status: 3 });
			return { success: true, message: `Xóa thành công ${ids.length} bản ghi` };
		} catch (error) {
			console.error('Lỗi khi xóa mềm đoàn vào:', error);
			throw error;
		}
	}
}