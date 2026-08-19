import { BadRequestException } from '@nestjs/common';
import { getMetadataStorage } from 'class-validator';
import { getMetadataArgsStorage } from 'typeorm';
import { parseSortParam as parseRawSort } from './util';

/**
 * Lấy danh sách các thuộc tính được decorate trong DTO.
 * Dùng metadata của class-validator để tránh fix cứng whitelist.
 */
export function getDtoKeys(dtoClass: any): string[] {
  if (!dtoClass) return [];
  try {
    const storage = getMetadataStorage();
    const metadatas = storage.getTargetValidationMetadatas(dtoClass, '', false, false);
    return [...new Set(metadatas.map((m) => m.propertyName as string))];
  } catch (error) {
    console.error('Lỗi khi lấy metadata từ DTO:', error);
    return [];
  }
}

/**
 * Lấy danh sách các thuộc tính được decorate là @Column trong Entity.
 * Trả về cả propertyName và database name (nếu có).
 */
export function getEntityKeys(entityClass: any): string[] {
  if (!entityClass) return [];
  try {
    const keys = new Set<string>();
    const typeormMetadata = getMetadataArgsStorage();

    // Lọc các cột thuộc về class này hoặc các class cha (kế thừa)
    const columns = typeormMetadata.columns.filter((c) => {
      return (
        c.target === entityClass ||
        (typeof entityClass === 'function' &&
          entityClass.prototype instanceof (c.target as any))
      );
    });

    columns.forEach((c) => {
      if (c.propertyName) keys.add(c.propertyName);
      // Hỗ trợ cả tên cột thực tế trong DB (ví dụ: signature_type)
      if (c.options.name) keys.add(c.options.name);
    });

    return [...keys];
  } catch (error) {
    console.error('Lỗi khi lấy metadata từ Entity:', error);
    return [];
  }
}

/**
 * Validate tham số sort dựa trên whitelist hoặc DTO.
 *
 * @param sort         Giá trị tham số sort từ query
 * @param whitelistOrDto Danh sách field hợp lệ (string[]) HOẶC class DTO
 * @returns Record<string, 'ASC' | 'DESC'>
 */
export function validateAndParseSortParam(
  sort: any,
  whitelistOrDto?: string[] | any,
): Record<string, 'ASC' | 'DESC'> {
  // Fallback: nếu sort không được truyền hoặc rỗng → trả về {} để caller tự dùng giá trị mặc định
  if (
    sort === undefined ||
    sort === null ||
    sort === '' ||
    (typeof sort === 'string' && sort.trim() === '') ||
    (typeof sort === 'object' && Object.keys(sort).length === 0)
  ) {
    return {};
  }

  // Xác định whitelist thực tế
  let allowedFields: string[] = [];
  if (Array.isArray(whitelistOrDto)) {
    allowedFields = whitelistOrDto;
  } else if (whitelistOrDto) {
    // Nếu là class DTO, lấy keys + common fields
    allowedFields = [
      ...getDtoKeys(whitelistOrDto),
      'createdAt',
      'updatedAt',
    ];
  }

  // Dùng lại parseSortParam gốc để parse các định dạng sort
  const rawObj: Record<string, 1 | -1> = parseRawSort(sort);

  const result: Record<string, 'ASC' | 'DESC'> = {};

  for (const key of Object.keys(rawObj)) {
    // Sàn lọc ký tự đặc biệt
    if (/[^a-zA-Z0-9_]/.test(key)) {
      throw new BadRequestException(
        `Trường sắp xếp '${key}' chứa ký tự không hợp lệ`,
      );
    }
    // Kiểm tra whitelist (nếu có)
    if (allowedFields.length > 0 && !allowedFields.includes(key)) {
      throw new BadRequestException(
        `Trường sắp xếp '${key}' không hợp lệ. Các trường được phép: ${allowedFields.join(', ')}`,
      );
    }
    result[key] = rawObj[key] === -1 ? 'DESC' : 'ASC';
  }

  return result;
}
