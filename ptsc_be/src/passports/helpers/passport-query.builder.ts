import { Injectable } from '@nestjs/common';
import { buildDocumentCriteriaHelper, parseSort } from 'src/documents/helpers/build.filter';

/**
 * Helper build query cho danh sách hộ chiếu
 * Pattern giống AmenitiesQueryBuilder
 */
@Injectable()
export class PassportQueryBuilder {

    /**
     * Convert filter object → criteria array
     * Giống AmenitiesQueryBuilder.buildCriteriaFromFilter
     */
    buildCriteriaFromFilter(filter: any): Array<{ name: string; operator: string; value: string | string[] }> {
        const criteria: Array<{ name: string; operator: string; value: string | string[] }> = [];
        if (!filter || typeof filter !== 'object') return criteria;

        Object.entries(filter).forEach(([key, value]) => {
            if (!value) return;

            if (typeof value === 'object') {
                const val = value as { startDate?: string; endDate?: string; value?: string };
                if (val.startDate && val.endDate) {
                    criteria.push({ name: key, operator: 'between', value: [String(val.startDate), String(val.endDate)] });
                } else if (val.startDate) {
                    criteria.push({ name: key, operator: 'gte', value: String(val.startDate) });
                } else if (val.endDate) {
                    criteria.push({ name: key, operator: 'lte', value: String(val.endDate) });
                } else if (val.value !== undefined && val.value !== null) {
                    criteria.push({ name: key, operator: 'like', value: String(val.value) });
                }
            } else {
                const operator = typeof value === 'string' ? 'like' : 'eq';
                criteria.push({ name: key, operator, value: String(value) });
            }
        });

        return criteria;
    }

    /**
     * Convert q + searchFields → criteria array (OR search)
     * Pattern giống IncomingStatisticsByTimeDto
     */
    buildSearchCriteria(
        q: string | undefined,
        searchFields: string | undefined,
    ): Array<{ name: string; operator: string; value: string }> {
        const criteria: Array<{ name: string; operator: string; value: string }> = [];
        if (!q || !q.trim()) return criteria;

        const allFields = ['fullName', 'eofficeAccount', 'passportNumber', 'identificationCard', 'phoneNumber'];

        let fieldsToSearch: string[];
        if (!searchFields || searchFields === 'all') {
            fieldsToSearch = allFields;
        } else {
            fieldsToSearch = searchFields
                .split(',')
                .map((f) => f.trim())
                .filter((f) => allFields.includes(f));
            if (fieldsToSearch.length === 0) fieldsToSearch = allFields;
        }

        for (const field of fieldsToSearch) {
            criteria.push({ name: field, operator: 'like', value: q.trim() });
        }

        return criteria;
    }

    /**
     * Các trường text cho phép tìm kiếm (OR logic + Vietnamese collation)
     * Hỗ trợ cả camelCase (fullName) lẫn snake_case (full_name) từ FE
     */
    private readonly TEXT_SEARCH_FIELDS = new Set([
        'fullName', 'full_name',
        'eofficeAccount', 'eoffice_account',
        'passportNumber', 'passport_number',
        'identificationCard', 'identification_card',
        'phoneNumber', 'phone_number',
        'email',
    ]);

    /**
     * Helper: convert camelCase → snake_case
     */
    private toSnakeCase(str: string): string {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }

    /**
     * Helper: escape ký tự đặc biệt cho LIKE
     */
    private escapeLike(str: string): string {
        return str.replace(/'/g, "''").replace(/([%_\\[\]])/g, '\\$1');
    }

    /**
     * Build Vietnamese case-insensitive LIKE condition cho 1 field
     * Dùng COLLATE Vietnamese_CI_AI (không phân biệt hoa/thường, có/không dấu)
     */
    private buildVnLike(field: string, keyword: string): string {
        const clean = this.escapeLike(keyword.trim());
        if (!clean) return '';
        return `${field} COLLATE Vietnamese_CI_AI LIKE N'%${clean}%'`;
    }

    /**
     * Build WHERE clause từ criteria
     * - Text search fields (fullName, passportNumber, etc) → OR logic + Vietnamese COLLATE
     * - Non-text fields (date, status, etc) → AND logic qua buildDocumentCriteriaHelper
     */
    buildWhereClause(
        criteria: Array<{ name: string; operator: string; value: string | string[] }>,
        featureManagement?: any,
    ): { whereClause: string; joins: string } {

        // Tách text search criteria ra khỏi filter criteria
        const textCriteria: Array<{ name: string; value: string }> = [];
        const otherCriteria: Array<{ name: string; operator: string; value: string | string[] }> = [];

        for (const c of criteria) {
            if (this.TEXT_SEARCH_FIELDS.has(c.name) && c.operator === 'like' && typeof c.value === 'string') {
                textCriteria.push({ name: c.name, value: c.value });
            } else {
                otherCriteria.push(c);
            }
        }

        // --- Text search: nhóm theo keyword → OR logic ---
        // VD: filter[fullName]=Mai&filter[passportNumber]=Mai
        //   → (full_name LIKE '%Mai%' OR passport_number LIKE '%Mai%')
        const keywordGroups: Record<string, string[]> = {};
        for (const tc of textCriteria) {
            const key = tc.value;
            if (!keywordGroups[key]) keywordGroups[key] = [];
            keywordGroups[key].push(tc.name);
        }

        const textParts: string[] = [];
        for (const [keyword, fields] of Object.entries(keywordGroups)) {
            const orParts = fields.map(f => {
                const snakeField = this.toSnakeCase(f);
                return this.buildVnLike(`passports.${snakeField}`, keyword);
            }).filter(Boolean);

            if (orParts.length > 0) {
                textParts.push(`(${orParts.join(' OR ')})`);
            }
        }

        // --- Non-text filters: qua buildDocumentCriteriaHelper như cũ ---
        const { sql: filterSql, joins: filterJoins } = buildDocumentCriteriaHelper(
            otherCriteria,
            'passports',
            featureManagement,
        );

        // Gộp WHERE
        const where: string[] = [];
        if (filterSql) where.push(`(${filterSql})`);
        if (textParts.length) where.push(textParts.join(' AND '));

        const whereClause = where.length
            ? ' AND ' + where.join(' AND ')
            : '';

        return { whereClause, joins: filterJoins || '' };
    }

    /**
     * Build pagination (giống AmenitiesQueryBuilder.buildPagination)
     */
    buildPagination(page: number, limit: number): { page: number; limit: number; offset: number } {
        const limitNum = Math.min(Number(limit) || 20, 100);
        const pageNum = Math.max(Number(page) || 1, 1);
        const offsetNum = (pageNum - 1) * limitNum;

        return { page: pageNum, limit: limitNum, offset: offsetNum };
    }

    /**
     * Build ORDER BY (giống AmenitiesQueryBuilder.buildOrderBy)
     */
    buildOrderBy(sort: any, aliases: Record<string, string> = {}): string {
        return parseSort(sort, aliases, 'passports');
    }
}
