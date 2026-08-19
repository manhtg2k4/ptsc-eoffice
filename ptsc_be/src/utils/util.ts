import mongoose, { Model, Types, FilterQuery } from 'mongoose';
import { STATUS } from '../variables/CONST_STATUS';
import { BadRequestException, HttpStatus } from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { ValidationResult } from 'src/interfaces';
import { addDays, startOfWeek, endOfWeek, format } from 'date-fns';
import { toDate } from 'date-fns-tz';
import { startOfMonth, endOfMonth } from 'date-fns';
import { log } from 'console';
import { EntityMetadata } from 'typeorm';
// type Filters = Record<string, any>;
interface Filters {
  [key: string]: any;
}

type ValidationType =
  | 'numberOnly'
  | 'textWithVietnamese'
  | 'textWithoutVietnamese'
  | 'boolean'
  | 'file'
  | 'objectId';

// kiểm tra id mongo hợp lệ
function isValidMongoId(id: string): boolean {
  return Types.ObjectId.isValid(id);
}

// Không cho phép nhập ký tự đặc biệt: ` ~ ! @ # $ % ^ *.
function isValidName(name: string): boolean {
  if (name.trim() === '' || name === null || name === undefined) return true;
  const regex = /^[^`~!#$%^*]+$/u;
  return regex.test(name);
}

function isValidNameNoEmail(name: string): boolean {
  if (name.trim() === '' || name === null || name === undefined) return true;
  const regex = /^[^`~!#$%^*]+$/u;
  return regex.test(name);
}

// định nghĩa interfac

interface DeleteOptions {
  id: string; // id bản ghi muốn xóa
  keyParent: string; // tên key của parentId
  model: Model<any>; // hoặc model kiểu cụ thể nếu có
  statusDelete: string | number; // trạng thái xóa
}
// deleted parent for list

async function deleteParentAndListChild(options: DeleteOptions) {
  const { id, keyParent, model, statusDelete } = options;

  try {
    const parent = await model.findOne({ _id: id });

    if (parent.status.toString() !== statusDelete.toString()) {
      const children = await model.find({ [keyParent]: parent._id.toString() });

      if (children.length > 0) {
        // Lọc những child chưa bị xóa
        const childIds = children
          .filter(
            (child) => child.status.toString() !== statusDelete.toString(),
          ) // Chỉ giữ những child chưa bị xóa
          .map((child) => child._id); // Lấy _id của các child chưa bị xóa

        // Nếu có child chưa xóa, thực hiện update
        if (childIds.length > 0) {
          await model.updateMany(
            { _id: { $in: [parent._id, ...childIds] } },
            { $set: { status: statusDelete } },
          );
        }
      } else {
        // Nếu không có children, chỉ cần update parent
        await model.updateOne(
          { _id: parent._id },
          { $set: { status: statusDelete } },
        );
      }
    }
    return {
      success: true,
      message: 'Xóa thành công',
    };
  } catch (err) {
    return {
      success: false,
      message: `Lỗi khi xóa: ${err}`,
    };
  }
}

// trả lỗi catch nếu lỗi từ schema
function ReturnError(error) {
  if (error && error.message && typeof error.message === 'string') {
    let isDbError = false;
    if (error.message.includes('Violation of UNIQUE KEY constraint')) {
      isDbError = true;
      const match = error.message.match(/The duplicate key value is \((.*?)\)/);
      const val = match ? match[1] : '';
      if (error.message.includes('UQ_group_users_code')) {
        error.message = val ? `Mã nhóm người dùng "${val}" đã tồn tại.` : 'Mã nhóm người dùng đã tồn tại.';
      } else {
        error.message = val ? `Dữ liệu bị trùng lặp: ${val}` : 'Dữ liệu đã tồn tại và không được trùng lặp.';
      }
    } else if (error.message.includes('Validation failed for parameter')) {
      isDbError = true;
      error.message = 'Dữ liệu đầu vào không hợp lệ (ví dụ: trường bắt buộc bị để trống hoặc nhập sai định dạng số).';
    }

    if (isDbError && !error.status) {
      error.status = HttpStatus.BAD_REQUEST;
    }
  }

  if (
    error.response &&
    error.response.errors &&
    Array.isArray(error.response.errors)
  ) {
    const errorsArray = error.response.errors;
    // Ví dụ, chuyển đổi mảng lỗi thành object sử dụng code làm key
    const errors = errorsArray.reduce((acc, err) => {
      acc[err.code] = err;
      return acc;
    }, {});

    return {
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      body: {
        success: false,
        // message: 'Dữ liệu không hợp lệ',
        message: error.response.message,
        errors,
      },
    };
  }
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map((err: any) => ({
      field: err.path,
      message: err.message,
    }));

    return {
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      body: {
        success: false,
        message: error.message,
        errors,
      },
    };
  }
  if (error.status && error.status >= 400 && error.status < 500) {
    let extraFields = {};
    if (typeof error.getResponse === 'function') {
      const response = error.getResponse();
      if (typeof response === 'object' && response !== null) {
        const { message, statusCode, error: errName, ...rest } = response;
        extraFields = rest;
      }
    }

    return {
      status: error.status,
      body: {
        success: false,
        message: error.message,
        errors: [error?.message ?? error],
        ...extraFields,
      },
    };
  }

  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    body: {
      success: false,
      message: error.message,
      errors: error.message,
    },
  };
}

/**
 * Xây dựng truy vấn MongoDB động dựa trên các bộ lọc tìm kiếm và điều kiện bắt buộc.
 *
 * @param {Filters} filters - Đối tượng chứa các điều kiện tìm kiếm.
 *                            - Nếu giá trị là chuỗi, sẽ tìm theo `$regex` (không phân biệt hoa thường).
 *                            - Nếu là số hoặc kiểu dữ liệu khác, tìm kiếm theo giá trị chính xác.
 * @param {Record<string, any>} and - Điều kiện bắt buộc (mặc định `{ status: STATUS.ACTIVED }`).
 *                                    - Các điều kiện này sẽ luôn có trong truy vấn `$and`.
 * @returns {any} - Đối tượng truy vấn MongoDB theo cấu trúc `$and` và `$or`.
 *
 * @example
 * // Tìm kiếm với điều kiện `name` chứa "Hồ sơ", `code` chứa "FND-2025-005" và `status = 1`
 * const query = buildMongoQuery({ name: 'Hồ sơ', code: 'FND-2025-005' });
 * console.log(query);
 * // Kết quả:
 * // {
 * //   "$and": [
 * //     { "status": 1 },
 * //     { "$or": [
 * //         { "name": { "$regex": "Hồ sơ", "$options": "i" } },
 * //         { "code": { "$regex": "FND-2025-005", "$options": "i" } }
 * //       ]
 * //     }
 * //   ]
 * // }
 *
 * @example
 * // Tìm kiếm với điều kiện bắt buộc `totalPaperDocs = 10`
 * const query = buildMongoQuery(
 *   { name: 'Hồ sơ', code: 'FND-2025-005' },
 *   { status: STATUS.ACTIVED, totalPaperDocs: 10 }
 * );
 * console.log(query);
 * // Kết quả:
 * // {
 * //   "$and": [
 * //     { "status": 1 },
 * //     { "totalPaperDocs": 10 },
 * //     { "$or": [
 * //         { "name": { "$regex": "Hồ sơ", "$options": "i" } },
 * //         { "code": { "$regex": "FND-2025-005", "$options": "i" } }
 * //       ]
 * //     }
 * //   ]
 * // }
 */
function buildMongoQuery(
  filters: Filters,
  and: Record<string, any> = { status: STATUS.ACTIVED },
): any {
  const orConditions: any[] = [];
  const andConditions: any[] = [and];

  for (const key in filters) {
    if (!filters[key]) continue;

    if (typeof filters[key] === 'number') {
      orConditions.push({ [key]: filters[key] });
    } else if (typeof filters[key] === 'string' && filters[key].trim() !== '') {
      try {
        const searchValue = filters[key].trim();
        const searchValueNoTone = removeVietnameseTones(searchValue);

        // Tạo biểu thức chính quy có thể tìm kiếm cả có dấu và không dấu
        // Ví dụ: nếu tìm kiếm "tung lam", tạo regex có thể match "tùng lâm"
        const regexPattern = searchValueNoTone
          .split('')
          .map((char) => {
            if (char === 'a') return '[aàáạảãâầấậẩẫăằắặẳẵ]';
            if (char === 'e') return '[eèéẹẻẽêềếệểễ]';
            if (char === 'i') return '[iìíịỉĩ]';
            if (char === 'o') return '[oòóọỏõôồốộổỗơờớợởỡ]';
            if (char === 'u') return '[uùúụủũưừứựửữ]';
            if (char === 'y') return '[yỳýỵỷỹ]';
            if (char === 'd') return '[dđ]';
            return char;
          })
          .join('');

        orConditions.push({ [key]: { $regex: regexPattern, $options: 'i' } });
      } catch (error) {
        console.error(`Lỗi tạo RegExp cho ${key}:`, error);
      }
    } else {
      andConditions.push({ [key]: filters[key] });
    }
  }

  if (orConditions.length > 0) {
    andConditions.push({ $or: orConditions });
  }

  return { $and: andConditions };
}
function buildMongoQueryString(
  filters: Filters,
  and: Record<string, any> = { status: STATUS.ACTIVED },
): any {
  const orConditions: any[] = [];
  const andConditions: any[] = [and];

  for (const key in filters) {
    if (!filters[key]) continue;

    if (typeof filters[key] === 'string' && filters[key].trim() !== '') {
      try {
        const searchValue = filters[key].trim();
        const searchValueNoTone = removeVietnameseTones(searchValue);

        const regexPattern = searchValueNoTone
          .split('')
          .map((char) => {
            if (char === 'a') return '[aàáạảãâầấậẩẫăằắặẳẵ]';
            if (char === 'e') return '[eèéẹẻẽêềếệểễ]';
            if (char === 'i') return '[iìíịỉĩ]';
            if (char === 'o') return '[oòóọỏõôồốộổỗơờớợởỡ]';
            if (char === 'u') return '[uùúụủũưừứựửữ]';
            if (char === 'y') return '[yỳýỵỷỹ]';
            if (char === 'd') return '[dđ]';
            return char;
          })
          .join('');

        orConditions.push({ [key]: { $regex: regexPattern, $options: 'i' } });
      } catch (error) {
        console.error(`Lỗi tạo RegExp cho ${key}:`, error);
      }
    } else if (typeof filters[key] === 'number') {
      andConditions.push({ [key]: filters[key] });
    } else {
      andConditions.push({ [key]: filters[key] });
    }
  }

  if (orConditions.length > 0) {
    andConditions.push({ $or: orConditions });
  }

  return { $and: andConditions };
}
function buildMongoQueryAndMatch(
  filters: Filters,
  and: Record<string, any> = { status: STATUS.ACTIVED },
): any {
  const orConditions: any[] = [];
  const andConditions: any[] = [and];

  for (const key in filters) {
    if (!filters[key]) continue;

    if (typeof filters[key] === 'number') {
      orConditions.push({ [key]: filters[key] });
    } else if (typeof filters[key] === 'string' && filters[key].trim() !== '') {
      try {
        const searchValue = filters[key].trim();
        const searchValueNoTone = removeVietnameseTones(searchValue);

        // Tạo biểu thức chính quy có thể tìm kiếm cả có dấu và không dấu
        // Đảm bảo khớp chính xác bằng ^ và $
        const regexPattern = searchValueNoTone
          .split('')
          .map((char) => {
            if (char === 'a') return '[aàáạảãâầấậẩẫăằắặẳẵ]';
            if (char === 'e') return '[eèéẹẻẽêềếệểễ]';
            if (char === 'i') return '[iìíịỉĩ]';
            if (char === 'o') return '[oòóọỏõôồốộổỗơờớợởỡ]';
            if (char === 'u') return '[uùúụủũưừứựửữ]';
            if (char === 'y') return '[yỳýỵỷỹ]';
            if (char === 'd') return '[dđ]';
            return char;
          })
          .join('');

        // Thêm ^ và $ để khớp chính xác, bỏ 'i' để phân biệt hoa thường
        orConditions.push({ [key]: { $regex: `^${regexPattern}$` } });
      } catch (error) {
        console.error(`Lỗi tạo RegExp cho ${key}:`, error);
      }
    } else {
      andConditions.push({ [key]: filters[key] });
    }
  }

  if (orConditions.length > 0) {
    andConditions.push({ $and: orConditions });
  }

  return { $and: andConditions };
}

function buildMongoQueryAnd(
  filters: Filters,
  and: Record<string, any> = { status: STATUS.ACTIVED },
): any {
  const orConditions: any[] = [];
  const andConditions: any[] = [and];

  for (const key in filters) {
    if (!filters[key]) continue;

    if (typeof filters[key] === 'number') {
      orConditions.push({ [key]: filters[key] });
    } else if (typeof filters[key] === 'string' && filters[key].trim() !== '') {
      try {
        const searchValue = filters[key].trim();
        const searchValueNoTone = removeVietnameseTones(searchValue);

        // Tạo biểu thức chính quy có thể tìm kiếm cả có dấu và không dấu
        // Ví dụ: nếu tìm kiếm "tung lam", tạo regex có thể match "tùng lâm"
        const regexPattern = searchValueNoTone
          .split('')
          .map((char) => {
            if (char === 'a') return '[aàáạảãâầấậẩẫăằắặẳẵ]';
            if (char === 'e') return '[eèéẹẻẽêềếệểễ]';
            if (char === 'i') return '[iìíịỉĩ]';
            if (char === 'o') return '[oòóọỏõôồốộổỗơờớợởỡ]';
            if (char === 'u') return '[uùúụủũưừứựửữ]';
            if (char === 'y') return '[yỳýỵỷỹ]';
            if (char === 'd') return '[dđ]';
            return char;
          })
          .join('');

        orConditions.push({ [key]: { $regex: regexPattern, $options: 'i' } });
      } catch (error) {
        console.error(`Lỗi tạo RegExp cho ${key}:`, error);
      }
    } else {
      andConditions.push({ [key]: filters[key] });
    }
  }

  if (orConditions.length > 0) {
    andConditions.push({ $and: orConditions });
  }

  return { $and: andConditions };
}

// function buildMongoQueryAnd(
//   filters: Record<string, any>,
//   and: Record<string, any> = { status: STATUS.ACTIVED },
// ): any {
//   const orConditions: any[] = [];
//   const andConditions: any[] = [and];

//   for (const key in filters) {
//     if (!filters[key]) continue;

//     const value = filters[key];

//     // Nếu là số -> push vào OR
//     if (typeof value === 'number') {
//       orConditions.push({ [key]: value });
//       continue;
//     }

//     // Nếu là chuỗi
//     if (typeof value === 'string') {
//       const raw = value.trim();
//       if (raw === '') continue;

//       // Nếu key có hậu tố __like => regex search
//       if (key.endsWith('__like')) {
//         const field = key.replace('__like', '');
//         try {
//           const searchValueNoTone = removeVietnameseTones(raw);

//           const regexPattern = searchValueNoTone
//             .split('')
//             .map((char) => {
//               if (char === 'a') return '[aàáạảãâầấậẩẫăằắặẳẵ]';
//               if (char === 'e') return '[eèéẹẻẽêềếệểễ]';
//               if (char === 'i') return '[iìíịỉĩ]';
//               if (char === 'o') return '[oòóọỏõôồốộổỗơờớợởỡ]';
//               if (char === 'u') return '[uùúụủũưừứựửữ]';
//               if (char === 'y') return '[yỳýỵỷỹ]';
//               if (char === 'd') return '[dđ]';
//               return char;
//             })
//             .join('');

//           orConditions.push({ [field]: { $regex: regexPattern, $options: 'i' } });
//         } catch (error) {
//           console.error(`Lỗi tạo RegExp cho ${key}:`, error);
//         }
//         continue;
//       }

//       // Mặc định: exact match
//       andConditions.push({ [key]: raw });
//       continue;
//     }

//     // Các kiểu khác (object, boolean, ...) -> thêm vào AND
//     andConditions.push({ [key]: value });
//   }

//   if (orConditions.length > 0) {
//     andConditions.push({ $and: orConditions });
//   }

//   return { $and: andConditions };
// }

function buildMongoQuery2(
  filters: Filters,
  and: Record<string, any> = { status: STATUS.ACTIVED },
): any {
  const andConditions: any[] = [and];
  const orConditions: any[] = [];

  // Các trường cần gom lại theo or
  const orFields = ['procedureResult.name', 'procedureResult.code', 'name'];

  for (const key in filters) {
    if (!filters[key]) continue;

    if (typeof filters[key] === 'number') {
      andConditions.push({ [key]: filters[key] });
    } else if (typeof filters[key] === 'string' && filters[key].trim() !== '') {
      try {
        const searchValue = filters[key].trim();
        const searchValueNoTone = removeVietnameseTones(searchValue);

        const regexPattern = searchValueNoTone
          .split('')
          .map((char) => {
            if (char === 'a') return '[aàáạảãâầấậẩẫăằắặẳẵ]';
            if (char === 'e') return '[eèéẹẻẽêềếệểễ]';
            if (char === 'i') return '[iìíịỉĩ]';
            if (char === 'o') return '[oòóọỏõôồốộổỗơờớợởỡ]';
            if (char === 'u') return '[uùúụủũưừứựửữ]';
            if (char === 'y') return '[yỳýỵỷỹ]';
            if (char === 'd') return '[dđ]';
            return char;
          })
          .join('');

        const condition = { [key]: { $regex: regexPattern, $options: 'i' } };

        if (orFields.includes(key)) {
          orConditions.push(condition);
        } else {
          andConditions.push(condition);
        }
      } catch (error) {
        console.error(`Lỗi tạo RegExp cho ${key}:`, error);
      }
    } else {
      andConditions.push({ [key]: filters[key] });
    }
  }

  // Nếu có điều kiện OR thì gộp lại
  if (orConditions.length > 0) {
    andConditions.push({ $or: orConditions });
  }

  return { $and: andConditions };
}

//sửa nếu là trường type thì ko regex
// function buildMongoQueryV3(
//   filters: Filters,
//   and: Record<string, any> = { status: STATUS.ACTIVED },
// ): any {
//   const orConditions: any[] = [];
//   const andConditions: any[] = [and];

//   for (const key in filters) {
//     if (!filters[key]) continue;

//     // Nếu là số -> push vào or
//     if (typeof filters[key] === 'number') {
//       orConditions.push({ [key]: filters[key] });
//       continue;
//     }

//     // Nếu là chuỗi rỗng sau trim -> bỏ qua
//     if (typeof filters[key] === 'string') {
//       const raw = filters[key].trim();
//       if (raw === '') continue;

//       // Nếu là trường "type" -> không tạo regex, so sánh chính xác
//       if (key === 'type') {
//         andConditions.push({ [key]: raw });
//         continue;
//       }

//       // Các chuỗi khác -> tạo regex (cả có dấu và không dấu)
//       try {
//         const searchValueNoTone = removeVietnameseTones(raw);

//         const regexPattern = searchValueNoTone
//           .split('')
//           .map((char) => {
//             if (char === 'a') return '[aàáạảãâầấậẩẫăằắặẳẵ]';
//             if (char === 'e') return '[eèéẹẻẽêềếệểễ]';
//             if (char === 'i') return '[iìíịỉĩ]';
//             if (char === 'o') return '[oòóọỏõôồốộổỗơờớợởỡ]';
//             if (char === 'u') return '[uùúụủũưừứựửữ]';
//             if (char === 'y') return '[yỳýỵỷỹ]';
//             if (char === 'd') return '[dđ]';
//             return char;
//           })
//           .join('');

//         orConditions.push({ [key]: { $regex: regexPattern, $options: 'i' } });
//       } catch (error) {
//         console.error(`Lỗi tạo RegExp cho ${key}:`, error);
//       }

//       continue;
//     }

//     // Các kiểu khác (object, boolean, ...) -> thêm vào AND
//     andConditions.push({ [key]: filters[key] });
//   }

//   if (orConditions.length > 0) {
//     andConditions.push({ $or: orConditions });
//   }

//   return { $and: andConditions };
// }

function buildMongoQueryV3(
  filters: Record<string, any>,
  and: Record<string, any> = { status: STATUS.ACTIVED },
): any {
  const orConditions: any[] = [];
  const andConditions: any[] = [and];

  for (const key in filters) {
    if (!filters[key]) continue;

    // Nếu là số -> push vào or
    if (typeof filters[key] === 'number') {
      orConditions.push({ [key]: filters[key] });
      continue;
    }

    // Nếu là chuỗi
    if (typeof filters[key] === 'string') {
      const raw = filters[key].trim();
      if (raw === '') continue;

      // Nếu giá trị chứa dấu phẩy, coi đó là một danh sách cho $in
      if (raw.includes(',')) {
        andConditions.push({ [key]: { $in: raw.split(',').map(item => item.trim()) } });
        continue;
      }

      // Nếu key có hậu tố __like => regex search
      if (key.endsWith('__like')) {
        const field = key.replace('__like', '');

        try {
          const searchValueNoTone = removeVietnameseTones(raw);

          const regexPattern = searchValueNoTone
            .split('')
            .map((char) => {
              if (char === 'a') return '[aàáạảãâầấậẩẫăằắặẳẵ]';
              if (char === 'e') return '[eèéẹẻẽêềếệểễ]';
              if (char === 'i') return '[iìíịỉĩ]';
              if (char === 'o') return '[oòóọỏõôồốộổỗơờớợởỡ]';
              if (char === 'u') return '[uùúụủũưừứựửữ]';
              if (char === 'y') return '[yỳýỵỷỹ]';
              if (char === 'd') return '[dđ]';
              return char;
            })
            .join('');

          orConditions.push({ [field]: { $regex: regexPattern, $options: 'i' } });
        } catch (error) {
          console.error(`Lỗi tạo RegExp cho ${key}:`, error);
        }

        continue;
      }

      // Mặc định: exact match
      andConditions.push({ [key]: raw });
      continue;
    }

    // Các kiểu khác (object, boolean, ...) -> thêm vào AND
    andConditions.push({ [key]: filters[key] });
  }

  if (orConditions.length > 0) {
    andConditions.push({ $or: orConditions });
  }

  return { $and: andConditions };
}



function removeVietnameseTones(str: string | undefined | null): string {
  if (!str || typeof str !== 'string') return '';
  str = str.toLowerCase();
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  str = str.replace(/đ/g, 'd');
  str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, ''); // ̀ ́ ̃ ̉ ̣  huyền, sắc, ngã, hỏi, nặng
  str = str.replace(/\u02C6|\u0306|\u031B/g, ''); // ˆ ̆ ̛  Â, Ê, Ă, Ơ, Ư
  str = str.replace(/ + /g, ' ');
  return str.trim();
}

/**
 * Kiểm tra xem tất cả các trường trong filters có hợp lệ không.
 * @param {Record<string, any>} filters - Đối tượng chứa các trường cần kiểm tra.
 * @returns {boolean} - Trả về `true` nếu tất cả hợp lệ, `false` nếu có giá trị không hợp lệ.
 *  @example
 * { name: "Hồ sơ", code: "FND-2025-005" } => true
 * { name: "Hồ sơ", code: "FND-2025-005!" } => false
 */
function areFiltersValid(filters: Record<string, any>): boolean {
  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === 'string' && !isValidName(value)) {
      return false;
    }
  }
  return true;
}

function areFiltersValidNoEmail(filters: Record<string, any>): boolean {
  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === 'string' && !isValidNameNoEmail(value)) {
      return false;
    }
  }
  return true;
}

function isValidInteger(value: any): boolean {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    Number.isInteger(value)
  );
}

function convertStringToNumber(obj: Record<string, any>): Record<string, any> {
  const convertedObj: Record<string, any> = {};

  for (const key in obj) {
    if (!isNaN(obj[key]) && obj[key].trim() !== '') {
      convertedObj[key] = Number(obj[key]);
    } else {
      convertedObj[key] = obj[key];
    }
  }

  return convertedObj;
}
// function parseSortParam(sort: string): Record<string, 1 | -1> {
//   try {
//     const parsedSort = JSON.parse(sort);
//     if (typeof parsedSort === 'object' && parsedSort !== null) {
//       return parsedSort;
//     }
//   } catch (e) {
//     return sort.split(',').reduce(
//       (acc, field) => {
//         field = field.trim();
//         if (field.startsWith('-')) {
//           acc[field.substring(1)] = -1;
//         } else {
//           acc[field] = 1;
//         }
//         return acc;
//       },
//       {} as Record<string, 1 | -1>,
//     );
//   }
//   return {};
// }

function parseSortParam(sort: any): Record<string, 1 | -1> {
  if (typeof sort === 'object' && sort !== null) {
    const result: Record<string, 1 | -1> = {};
    for (const key of Object.keys(sort)) {
      result[key] = Number(sort[key]) === -1 ? -1 : 1;
    }
    return result;
  }
  try {
    const parsedSort = JSON.parse(sort);
    if (typeof parsedSort === 'object' && parsedSort !== null) {
      return parsedSort;
    }
  } catch (e) {
    return sort.split(',').reduce(
      (acc, field) => {
        field = field.trim();
        if (field.startsWith('-')) {
          acc[field.substring(1)] = -1;
        } else {
          acc[field] = 1;
        }
        return acc;
      },
      {} as Record<string, 1 | -1>,
    );
  }
  return {};
}



function convertFiltersBySchema(
  filters: Record<string, any>,
  modelSchema: any,
): { convertedFilters: Record<string, any>; errors: string[] } {
  const convertedFilters: Record<string, any> = {};
  const errors: string[] = [];

  for (const key in filters) {
    const schemaType = modelSchema.path(key)?.instance;
    const value = filters[key];

    if (!schemaType) {
      errors.push(`Trường '${key}' không tồn tại trong schema.`);
      continue;
    }

    if (schemaType === 'Number') {
      if (!isNaN(value) && value.trim() !== '') {
        convertedFilters[key] = Number(value);
      } else {
        errors.push(
          `Trường '${key}' yêu cầu kiểu Number, nhưng nhận giá trị không hợp lệ.`,
        );
      }
    } else if (schemaType === 'String') {
      convertedFilters[key] = String(value);
    } else {
      convertedFilters[key] = value;
    }
  }

  return { convertedFilters, errors };
}

/**
 * Kiểm tra các trường có giá trị unique trong database
 * @param doc - Document đang được tạo/cập nhật
 * @param model - Model tương ứng
 * @param fields - Danh sách các trường cần kiểm tra unique
 * @returns mongoose.Error.ValidationError nếu trùng lặp
 */
async function validateUniqueFields<T extends Record<string, any>>(
  doc: Partial<T>,
  model: Model<T>,
  fields: string[],
  customMessage: string | null = null, // ✅ default = null
): Promise<void> {
  const conditions = fields.map((field) => ({ [field]: (doc as any)[field] }));

  const query = {
    $or: conditions,
    status: { $ne: STATUS.DELETED },
  } as unknown as mongoose.FilterQuery<T>;

  const existingDoc = await model.findOne(query);

  if (existingDoc) {
    const validationError = new mongoose.Error.ValidationError(undefined);

    fields.forEach((field) => {
      if ((doc as any)[field] === (existingDoc as any)[field]) {
        const fieldValue = field === 'code' ? 'Mã' : field;
        validationError.addError(
          field,
          new mongoose.Error.ValidatorError({
            message:
              customMessage ??
              `${fieldValue} đã tồn tại và không được trùng lặp`,
            path: field,
            value: (doc as any)[field],
          }),
        );
      }
    });

    throw validationError;
  }
}

function buildMongoQueryNotOr(
  filters: Filters,
  and: Record<string, any> = { status: STATUS.ACTIVED },
): any {
  if (!filters.parent) {
    throw new Error('Trường "parent" là bắt buộc.');
  }

  const orConditions: any[] = [];
  const andConditions: any[] = [and, { parent: filters.parent }]; // Luôn có parent trong and

  for (const key in filters) {
    if (!filters[key] || key === 'parent') continue; // Bỏ qua vì parent đã xử lý

    if (typeof filters[key] === 'number') {
      orConditions.push({ [key]: filters[key] });
    } else if (typeof filters[key] === 'string' && filters[key].trim() !== '') {
      try {
        const searchValue = filters[key].trim();
        const searchValueNoTone = removeVietnameseTones(searchValue);

        const regexPattern = searchValueNoTone
          .split('')
          .map((char) => {
            if (char === 'a') return '[aàáạảãâầấậẩẫăằắặẳẵ]';
            if (char === 'e') return '[eèéẹẻẽêềếệểễ]';
            if (char === 'i') return '[iìíịỉĩ]';
            if (char === 'o') return '[oòóọỏõôồốộổỗơờớợởỡ]';
            if (char === 'u') return '[uùúụủũưừứựửữ]';
            if (char === 'y') return '[yỳýỵỷỹ]';
            if (char === 'd') return '[dđ]';
            return char;
          })
          .join('');

        orConditions.push({ [key]: { $regex: regexPattern, $options: 'i' } });
      } catch (error) {
        console.error(`Lỗi tạo RegExp cho ${key}:`, error);
      }
    } else {
      andConditions.push({ [key]: filters[key] });
    }
  }

  if (orConditions.length > 0) {
    andConditions.push({ $or: orConditions });
  }

  return { $and: andConditions };
}

async function validateUniqueBeforeUpdate<T extends Record<string, any>>(
  model: Model<T>,
  query: FilterQuery<T>,
  update: Partial<T>,
  fields: string[],
  next: (err?: any) => void,
  typeMessageDVKT: boolean | null = null, // ✅ default = nul
) {
  try {
    const existingDoc = await model.findOne(query);
    if (!existingDoc) return next();

    const fieldsToCheck = fields.filter(
      (field) =>
        update[field] !== undefined && update[field] !== existingDoc[field],
    );

    if (fieldsToCheck.length === 0) return next();

    if (typeMessageDVKT) {
      await validateUniqueFields<T>(update, model, fieldsToCheck, 'Mã đơn vị đã tồn tại');
    } else {
      await validateUniqueFields<T>(update, model, fieldsToCheck);
    }

    next();
  } catch (error) {
    next(error);
  }
}

function removeEmptyFields<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.keys(obj).reduce((acc, key) => {
    if (obj[key] !== '') {
      acc[key as keyof T] = obj[key];
    }
    return acc;
  }, {} as Partial<T>);
}

function generateApiKey(length: number = 32): string {
  return randomBytes(length).toString('hex');
}
function isValidQuantity(value: string): boolean {
  // Kiểm tra có phải số nguyên dương không
  return /^[1-9]\d*$/.test(value);
}
const hasVietnameseDiacritics = (str: string): boolean => {
  const vietnamesePattern =
    /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i;
  return !vietnamesePattern.test(str);
};

/**
 *Kiểm tra đầu vào hợp lệ cho các trường khác nhau như text, số, file, v.v.
 *Trả về một đối tượng với thuộc tính valid và error nếu không hợp lệ.
 * @param{value} - Giá trị cần kiểm tra.
 * @param{type} - Kiểu kiểm tra (textWithVietnamese, numberOnly, file, objectId).
 * @returns {object} - Đối tượng với thuộc tính valid và error.
 */
const validateInputValue = (
  value: any,
  type: ValidationType = 'textWithVietnamese',
) => {
  const specialCharRegex = /[`~!@#$%^*]/;
  const hasVietnamese =
    /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i;

  // Nếu là text input
  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (specialCharRegex.test(trimmed)) {
      return { valid: false, error: 'Không được chứa ký tự đặc biệt' };
    }

    switch (type) {
      case 'numberOnly':
        if (/[^\d]/.test(trimmed)) {
          return { valid: false, error: 'Chỉ được nhập chữ số' };
        }
        break;

      case 'textWithoutVietnamese':
        if (hasVietnamese.test(trimmed)) {
          return { valid: false, error: 'Không được nhập tiếng Việt có dấu' };
        }
        break;

      case 'textWithVietnamese':
        // Cho phép tiếng Việt có dấu => không cần gì thêm
        break;

      case 'objectId':
        if (!isValidMongoId(trimmed)) {
          return { valid: false, error: 'ID không hợp lệ' };
        }
        break;

      case 'boolean':
        if (trimmed !== 'true' && trimmed !== 'false') {
          return { valid: false, error: 'Giá trị không hợp lệ' };
        }

        break;
      default:
        return { valid: false, error: 'Kiểu kiểm tra không hợp lệ' };
    }

    return { valid: true };
  }

  // Nếu là file upload
  if (type === 'file') {
    if (!value) return { valid: true };

    if (value.mimetype === undefined) {
      return { valid: false, error: 'File không hợp lệ' };
    }

    const file = value as Express.Multer.File;
    const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf'];
    const maxSize = 20 * 1024 * 1024; // 20MB

    if (!allowedTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: 'Định dạng không hợp lệ. Chỉ chấp nhận PNG, JPG, PDF',
      };
    }

    if (file.size > maxSize) {
      return { valid: false, error: 'Dung lượng tối đa là 20MB' };
    }

    return { valid: true };
  }

  return {
    valid: false,
    error: 'Kiểu kiểm tra không hợp lệ hoặc chưa được hỗ trợ',
  };
};

/**
 * Đăng ký thêm @IsValidInput thêm vào class-validator để custom sử dụng
 * @param type
 * @param validationOptions
 * @returns
 */
const IsValidInput = (
  type: ValidationType,
  validationOptions?: ValidationOptions,
) => {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidInput',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [type],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [type] = args.constraints;
          return validateInputValue(value, type).valid;
        },
        defaultMessage(args: ValidationArguments) {
          const [type] = args.constraints;
          const result = validateInputValue(args.value, type);
          return result.error || 'Giá trị không hợp lệ';
        },
      },
    });
  };
};

/**
 * Kiểm tra xem một bản ghi có tồn tại trong cơ sở dữ liệu không
 * @param model - Model mongoose để truy vấn
 * @param id - ID của bản ghi cần tìm
 * @param name - Tên của thực thể để hiển thị trong thông báo lỗi
 * @param res - Đối tượng Response của Express
 * @returns Promise<boolean> - True nếu bản ghi tồn tại, false nếu không tồn tại
 */
async function validateExistence(
  model: Model<any>,
  id: string,
  name: string,
): Promise<ValidationResult | null> {
  const record = await model.findOne({ _id: id, status: STATUS.ACTIVED });
  if (!record) {
    return {
      success: false,
      message: `Không tìm thấy ${name} hoặc đã bị xóa`,
    };
  }
  return null;
}


// Calculate week range for the entire year
const getWeekRangeInYear = (year: number, week: number) => {
  const timeZone = 'Asia/Ho_Chi_Minh'; // Múi giờ Việt Nam
  const firstDayOfYear = new Date(Date.UTC(year, 0, 1));
  const firstWeekDay = firstDayOfYear.getUTCDay() || 7; // Sunday as 7

  // Tính ngày bắt đầu của tuần
  const startOfWeekUTC = addDays(
    firstDayOfYear,
    (week - 1) * 7 - (firstWeekDay - 1),
  );
  const endOfWeekUTC = addDays(startOfWeekUTC, 6);

  // Chuyển đổi sang múi giờ Việt Nam
  const startInVietnam = toDate(startOfWeekUTC, { timeZone });
  const endInVietnam = toDate(endOfWeekUTC, { timeZone });

  return { start: startInVietnam, end: endInVietnam };
};

// Calculate week range for a specific month
const getWeekRangeInMonth = (year: number, month: number, week: number) => {
  const timeZone = 'Asia/Ho_Chi_Minh'; // Múi giờ Việt Nam
  const firstDayOfYear = new Date(Date.UTC(year, 0, 1));
  const firstWeekDay = firstDayOfYear.getUTCDay() || 7; // Sunday as 7
  const firstDayOfMonth = startOfMonth(new Date(Date.UTC(year, month - 1, 1)));
  const lastDayOfMonth = endOfMonth(new Date(Date.UTC(year, month - 1, 1)));

  const weekOfFirstDayOfMonth = Math.ceil(
    (firstDayOfMonth.getTime() - firstDayOfYear.getTime() + (firstWeekDay - 1) * 24 * 60 * 60 * 1000) /
    (7 * 24 * 60 * 60 * 1000),
  );

  const weekOfLastDayOfMonth = Math.ceil(
    (lastDayOfMonth.getTime() - firstDayOfYear.getTime() + (firstWeekDay - 1) * 24 * 60 * 60 * 1000) /
    (7 * 24 * 60 * 60 * 1000),
  );

  // Kiểm tra nếu tuần không nằm trong tháng
  if (week < weekOfFirstDayOfMonth || week > weekOfLastDayOfMonth) {
    const fullWeekRange = getWeekRangeInYear(year, week);
    if (
      fullWeekRange.start > lastDayOfMonth || // Tuần bắt đầu sau tháng
      fullWeekRange.end < firstDayOfMonth // Tuần kết thúc trước tháng
    ) {
      return null; // Tuần không hợp lệ
    }
  }

  // Lấy phạm vi tuần đầy đủ
  const fullWeekRange = getWeekRangeInYear(year, week);

  // Giới hạn phạm vi tuần trong tháng
  const start = fullWeekRange.start < firstDayOfMonth ? firstDayOfMonth : fullWeekRange.start;
  const end = fullWeekRange.end > lastDayOfMonth ? lastDayOfMonth : fullWeekRange.end;

  // Chuyển đổi sang múi giờ Việt Nam
  const startInVietnam = toDate(start, { timeZone });
  const endInVietnam = toDate(end, { timeZone });

  return { start: startInVietnam, end: endInVietnam };
};

/**
 * Lấy khoảng thời gian dựa trên loại (năm, quý, tháng, tuần)
 * @param type - Loại khoảng thời gian ('year', 'quarter', 'month', 'week')
 * @param value - Giá trị tương ứng (năm, số quý, số tháng, số tuần)
 * @param year - Năm (nếu không cung cấp, sẽ sử dụng năm hiện tại)
 * @param month - Tháng (nếu không cung cấp, sẽ sử dụng tháng hiện tại, chỉ áp dụng cho tuần)
 * @param week - Tuần ( tuần là 52 hoặc 53 tuần tùy vào các năm, nếu không cung cấp, sẽ sử dụng tuần hiện tại, chỉ áp dụng cho tuần)
 * @returns Đối tượng chứa ngày bắt đầu, ngày kết thúc và thông báo lỗi (nếu có)
 */
const getDateRange = (
  quarter?: number,
  year?: number,
  month?: number,
  week?: number,
): { startDate: Date; endDate: Date; errorMessage?: string } => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Nếu không có năm được cung cấp, sử dụng năm hiện tại
  const selectedYear = year ?? (week || month || quarter ? currentYear : undefined);
  if (!selectedYear) {
    return {
      startDate: new Date(0),
      endDate: new Date(0),
      errorMessage: 'Không thể xác định năm',
    };
  }

  // Nếu chỉ có tuần và tháng được cung cấp
  if (week && month) {
    const weekRange = getWeekRangeInMonth(selectedYear, month, week);
    if (!weekRange) {
      return {
        startDate: new Date(0),
        endDate: new Date(0),
        errorMessage: `Tháng ${month} năm ${selectedYear} không có tuần thứ ${week}`,
      };
    }
    return { startDate: weekRange.start, endDate: weekRange.end };
  }

  // Nếu chỉ có tuần được cung cấp
  if (week) {
    const weekRange = getWeekRangeInYear(selectedYear, week);
    if (!weekRange) {
      return {
        startDate: new Date(0),
        endDate: new Date(0),
        errorMessage: `Năm ${selectedYear} không có tuần thứ ${week}`,
      };
    }
    return { startDate: weekRange.start, endDate: weekRange.end };
  }

  // Nếu chỉ có tháng được cung cấp
  if (month) {
    const startDate = new Date(selectedYear, month - 1, 1); // Ngày đầu tiên của tháng
    const endDate = new Date(selectedYear, month, 0, 23, 59, 59, 999); // Ngày cuối cùng của tháng
    return { startDate, endDate };
  }

  // Nếu chỉ có quý được cung cấp
  if (quarter) {
    const startMonth = (quarter - 1) * 3; // Tháng bắt đầu của quý
    const startDate = new Date(selectedYear, startMonth, 1); // Ngày đầu tiên của quý
    const endDate = new Date(selectedYear, startMonth + 3, 0, 23, 59, 59, 999); // Ngày cuối cùng của quý
    return { startDate, endDate };
  }

  // Nếu chỉ có năm được cung cấp
  if (year || selectedYear) {
    const startDate = new Date(selectedYear, 0, 1); // Ngày đầu tiên của năm
    const endDate = new Date(selectedYear, 11, 31, 23, 59, 59, 999); // Ngày cuối cùng của năm
    return { startDate, endDate };
  }

  // Return a default value if no conditions are met
  return {
    startDate: new Date(0),
    endDate: new Date(0),
    errorMessage: 'Không thể xác định khoảng thời gian',
  };
};

function isValidSortField(field: string, metadata: EntityMetadata): boolean {
  return metadata.columns.some((col) => col.propertyName === field);
};

function normalizeDateValueDDMMYYYY(val?: string | number | Date | null): string | null {
  if (!val) return null;

  const toDDMMYYYY = (d: Date): string => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  if (val instanceof Date && !isNaN(val.getTime())) {
    return toDDMMYYYY(val);
  }

  if (typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : toDDMMYYYY(d);
  }

  if (typeof val === 'string') {
    const s = val.trim();

    // ISO dạng 2024-06-25T...
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : toDDMMYYYY(d);
    }

    // Dạng dd/mm/yyyy hoặc dd-mm-yyyy
    const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
    if (m) {
      let [_, dd, mm, yyyy] = m;

      // Xử lý năm 2 chữ số
      if (yyyy.length === 2) {
        yyyy = (+yyyy < 70 ? '20' : '19') + yyyy;
      }

      const d = new Date(+yyyy, +mm - 1, +dd);
      return isNaN(d.getTime()) ? null : toDDMMYYYY(d);
    }
  }

  return null;
}
function mapUserKeys(user: any): any {
  const dateKeys = new Set([
    'birthday',
    'created_at',
    'updated_at',
  ]);
  const result: any = {};
  for (const [key, value] of Object.entries(user)) {
    const jsKey = key;
    let finalValue = value;
    if (dateKeys.has(key)) {
      finalValue = normalizeDateValueDDMMYYYY(value as string | number | Date | null | undefined);
    }
    if (jsKey === "status") {
      finalValue =
        value === STATUS.ACTIVED ? "Hoạt động" :
          value === STATUS.NOT_ACTIVED ? "Không hoạt động" :
            "Đã khóa";
    }
    if (jsKey === "position") {
      const map: Record<string, string> = {
        Admin: "Quản trị hệ thống",
        Vanthu: "Văn thư",
        Giamdoc: "Giám đốc",
        Phogiamdoc: "Phó giám đốc",
        Truongphong: "Trưởng phòng",
        Photruongphong: "Phó trưởng phòng",
        Canbo: "Cán bộ",
      };

      finalValue = map[String(value)] || "-";
    }
    if (jsKey === "gender") {
      const val = String(value).toLowerCase();
      finalValue = ["male", "nam", "1", "true"].includes(val) ? "Nam" :
        ["female", "nữ", "0", "false"].includes(val) ? "Nữ" :
          "-";
    }
    result[jsKey] = finalValue;
  }
  return result;
}
function filterUsersByName(users: any[], nameTerm: string): any[] {
  if (!nameTerm || !nameTerm.trim()) {
    return users;
  }

  const normalizedSearch = removeVietnameseTones(nameTerm.trim());

  return users.filter((user) => {
    // Tìm trong các trường: name, fullName, displayName, username
    const searchFields = [
      user.name,
      user.fullName,
      user.displayName,
      user.username,
      user.firstName,
      user.lastName,
    ];

    return searchFields.some((field) => {
      if (field === null || field === undefined) return false;
      const normalizedField = removeVietnameseTones(String(field));
      return normalizedField.includes(normalizedSearch);
    });
  });
}

/**
 * Filter danh sách organization units theo tên
 * Hỗ trợ tìm kiếm tiếng Việt có dấu/không dấu, hoa/thường
 */
function filterOrgUnitsByName(orgUnits: any[], nameTerm: string): any[] {
  if (!nameTerm || !nameTerm.trim()) {
    return orgUnits;
  }

  const normalizedSearch = removeVietnameseTones(nameTerm.trim());

  return orgUnits.filter((org) => {
    // Tìm trong các trường: name, fullName, displayName, code
    const searchFields = [
      org.name,
      org.fullName,
      org.displayName,
      org.code,
      org.shortName,
    ];

    return searchFields.some((field) => {
      if (!field) return false;
      const normalizedField = removeVietnameseTones(field);
      return normalizedField.includes(normalizedSearch);
    });
  });
}
function buildSearchRegex(nameTerm: string): RegExp {
  const normalized = removeVietnameseTones(nameTerm.trim());

  const pattern = normalized
    .split('')
    .map((char) => {
      if (char === 'a') return '[aàáạảãâầấậẩẫăằắặẳẵ]';
      if (char === 'e') return '[eèéẹẻẽêềếệểễ]';
      if (char === 'i') return '[iìíịỉĩ]';
      if (char === 'o') return '[oòóọỏõôồốộổỗơờớợởỡ]';
      if (char === 'u') return '[uùúụủũưừứựửữ]';
      if (char === 'y') return '[yỳýỵỷỹ]';
      if (char === 'd') return '[dđ]';
      return char;
    })
    .join('');

  return new RegExp(pattern, 'i');
}
export function getAllNodeExtensionPropertiesV2(
  element: any,
): Record<string, any> {
  if (!element?.extensionElements?.values?.length) {
    return {};
  }

  const result: Record<string, any> = {};

  for (const ext of element.extensionElements.values) {
    // Camunda / BPMN properties
    if (
      ext.$type === 'camunda:Properties' ||
      ext.$type === 'bpmn:Properties'
    ) {
      const props = ext.values ?? ext.$children ?? [];
      for (const p of props) {
        if (p?.name) {
          result[p.name] = p.value;
        }
      }
    }
  }

  return result;
}


function getAllNodeExtensionProperties(
  node: any,
): Record<string, any> {
  if (!node?.extensionElements?.values?.length) return {};

  const result: Record<string, any> = {};

  for (const extension of node.extensionElements.values) {
    const sources = [
      ...(Array.isArray(extension?.$children) ? extension.$children : []),
      ...(Array.isArray(extension?.values) ? extension.values : []),
    ];

    for (const item of sources) {
      if (!item?.name) continue;
      result[item.name] = item.value;
    }
  }

  return result;
}
function getExtensionProperty(
  node: any,
  propName: string,
): string | undefined {
  const values = node?.extensionElements?.values;
  if (!Array.isArray(values)) return undefined;

  for (const v of values) {
    const children = v?.$children;
    if (!Array.isArray(children)) continue;

    const prop = children.find((c: any) => c.name === propName);
    if (prop) return prop.value;
  }
  return undefined;
}
/**
 * Parse chuỗi flags dạng: "key1:true,key2:false,key3"
 * -> { key1: "true", key2: "false", key3: true }
 */
function parseFlagsButton(
  flags?: string,
): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {};

  if (!flags) return result;

  const entries = flags
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

  for (const entry of entries) {
    const [key, value] = entry.split(':').map(s => s.trim());

    if (key) {
      let finalValue: any = value;

      if (value === 'true') {
        finalValue = true;
      } else if (value === 'false') {
        finalValue = false;
      }

      result[key] = finalValue ?? true;
    }
  }

  return result;
}

/**
 * Lấy extension properties từ camunda:field
 * Hỗ trợ cấu trúc:
 * <camunda:field name="rolePermission">
 *   <camunda:string>everyone</camunda:string>
 * </camunda:field>
 */
export function getCamundaFieldProperties(
  node: any,
): Record<string, any> {
  if (!node?.extensionElements?.values?.length) return {};

  const result: Record<string, any> = {};

  for (const extension of node.extensionElements.values) {
    // Xử lý camunda:Field trực tiếp trong values
    if (extension.$type === 'camunda:Field') {
      const fieldName = extension.name;
      // Lấy giá trị từ camunda:string hoặc camunda:expression
      const stringValue = extension.string ?? extension.$children?.find((c: any) => c.$type === 'camunda:String')?.body;
      const expressionValue = extension.expression ?? extension.$children?.find((c: any) => c.$type === 'camunda:Expression')?.body;

      if (fieldName) {
        result[fieldName] = stringValue ?? expressionValue ?? extension.value;
      }
    }
  }

  // Fallback: Duyệt qua $children của từng extension
  for (const extension of node.extensionElements.values) {
    if (!extension?.$children) continue;

    for (const child of extension.$children) {
      if (child.$type === 'camunda:Field') {
        const fieldName = child.name;
        const stringValue = child.string ?? child.$children?.find((c: any) => c.$type === 'camunda:String')?.body;
        const expressionValue = child.expression ?? child.$children?.find((c: any) => c.$type === 'camunda:Expression')?.body;

        if (fieldName && !result[fieldName]) {
          result[fieldName] = stringValue ?? expressionValue ?? child.value;
        }
      }
    }
  }

  return result;
}
async function checkReceiverAlreadyProcessor({
  documentId,
  receiverUserId,
  curNode,
  myssqlRepo,
}: {
  documentId: string;
  receiverUserId: string;
  curNode: string;
  myssqlRepo: any;
}) {
  const audits = await myssqlRepo.getAudit(documentId);
  // const a2 = audits.filter((a: any) =>
  //   (a.receiver === receiverUserId &&
  //     a.stageStatus !== "Trả lại" &&
  //     a.stageStatus !== 'Thu hồi' &&
  //     a.actionCode !== 'TRA_LAI' &&
  //     a.actionCode !== 'THU_HOI')
  //   // (a.toNodeId === curNode)
  // );
  // console.log('a2', a2);
  return audits.some((a: any) =>
    a.receiver === receiverUserId &&
    a.stageStatus !== "Trả lại" &&
    a.stageStatus !== 'Thu hồi' &&
    a.actionCode !== 'TRA_LAI' &&
    a.actionCode !== 'THU_HOI' &&
    a.stageStatus === 'Chưa xử lý'
  );
}
function isInRoleList(
  role: string | undefined,
  envKey: string
): boolean {
  if (!role) return false;
  const rolesv2 = process.env[envKey];
  const roles =
    process.env[envKey]
      ?.split(',')
      .map(r => r.trim().toUpperCase())
      .filter(Boolean) || [];

  return roles.includes(role.toUpperCase());
}
/**
 * Lấy cấu hình luồng cho người dùng dựa trên parent unit và loại tài liệu
 * @param sqlsvRepo - Repository để truy vấn database
 * @param userId - ID của người dùng
 * @param docType - Loại tài liệu ('IncommingDocument' | 'OutGoingDocument' | 'TaskManyUnit')
 * @returns Cấu hình luồng của người dùng
 * @throws BadRequestException nếu người dùng không có parent hoặc không tìm thấy luồng
 */
async function getUserFlowConfig(
  sqlsvRepo: any,
  userId: string,
  docType: string,
) {
  const user: any = await sqlsvRepo.getUserById(userId);

  if (!user?.parent?.id) {
    throw new BadRequestException('Người dùng không có parent');
  }

  const flowConfig = await sqlsvRepo.getFlowByUnit(
    String(user.parent.id),
    docType
  );

  if (!flowConfig) {
    throw new BadRequestException(`Không tìm thấy luồng ${docType} cho người dùng`);
  }

  return { user, flowConfig };
}
function mapStringToBoolean(value) {
  if (!value) return null;
  const v = value.toLowerCase();
  if (v === 'true') return true;
  if (v === 'false') return false;
  return null; // hoặc throw error tùy nhu cầu
}
function tryParseJson(input: any): any | null {
  if (typeof input !== 'string') return null;

  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function checkIsAdmin(staticPermissions: any[]): boolean {
  if (!staticPermissions || !Array.isArray(staticPermissions)) {
    return false;
  }
  return staticPermissions.some((permission) => permission.code === 'ADMIN' || permission.code === 'VT1');
}
export {
  isValidSortField,
  isValidMongoId,
  isValidName,
  ReturnError,
  buildMongoQuery,
  areFiltersValid,
  isValidInteger,
  convertStringToNumber,
  parseSortParam,
  convertFiltersBySchema,
  removeVietnameseTones,
  buildMongoQueryNotOr,
  validateUniqueFields,
  validateUniqueBeforeUpdate,
  removeEmptyFields,
  generateApiKey,
  isValidQuantity,
  hasVietnameseDiacritics,
  validateInputValue,
  IsValidInput,
  deleteParentAndListChild,
  areFiltersValidNoEmail,
  validateExistence,
  buildMongoQuery2,
  buildMongoQueryV3,
  getDateRange,
  buildMongoQueryAnd,
  buildMongoQueryAndMatch,
  buildMongoQueryString,
  mapUserKeys,
  filterUsersByName,
  filterOrgUnitsByName,
  buildSearchRegex,
  getAllNodeExtensionProperties,
  getExtensionProperty,
  checkReceiverAlreadyProcessor,
  isInRoleList,
  getUserFlowConfig,
  parseFlagsButton,
  mapStringToBoolean,
  tryParseJson,
  checkIsAdmin,
  defaultFilterStartDateToThisYear
};

function defaultFilterStartDateToThisYear(query: any, isIncoming = false) {
  const currentYear = new Date().getFullYear();
  let defaultStart = `${currentYear}-01-01`;
  let defaultEnd = `${currentYear}-12-31`;

  if (isIncoming) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const formatDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const r = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${r}`;
    };

    defaultStart = formatDate(start);
    defaultEnd = formatDate(end);
  }

  if (!query) {
    return;
  }

  // Ensure filter object exists
  if (!query.filter) {
    query.filter = {};
  }

  // Parse query.filter if it is a JSON string
  if (typeof query.filter === 'string') {
    try {
      query.filter = JSON.parse(query.filter);
    } catch (e) {
      query.filter = {};
    }
  }

  if (isIncoming) {
    const hasFlatDocDate = query['filter[documentDate][startDate]'] || query['filter[documentDate][endDate]'] || query['filter[documentDate]'];
    const hasFlatRecDate = query['filter[receiveDate][startDate]'] || query['filter[receiveDate][endDate]'] || query['filter[receiveDate]'];
    const hasFlatStartDate = query['filter[startDate][startDate]'] || query['filter[startDate][endDate]'] || query['filter[startDate]'];

    const hasNestedDocDate = query.filter.documentDate && (query.filter.documentDate.startDate || query.filter.documentDate.endDate);
    const hasNestedRecDate = query.filter.receiveDate && (query.filter.receiveDate.startDate || query.filter.receiveDate.endDate);
    const hasNestedStartDate = query.filter.startDate && (query.filter.startDate.startDate || query.filter.startDate.endDate);

    if (!hasFlatDocDate && !hasFlatRecDate && !hasFlatStartDate && !hasNestedDocDate && !hasNestedRecDate && !hasNestedStartDate) {
      query.filter.receiveDate = {
        startDate: defaultStart,
        endDate: defaultEnd
      };
    }
  } else {
    const hasFlatStartDateFrom = query['filter[start_date_from][startDate]'] || query['filter[start_date_from][endDate]'] || query['filter[start_date_from]'];
    const hasFlatStartDate = query['filter[startDate][startDate]'] || query['filter[startDate][endDate]'] || query['filter[startDate]'];

    const hasNestedStartDateFrom = query.filter.start_date_from && (query.filter.start_date_from.startDate || query.filter.start_date_from.endDate);
    const hasNestedStartDate = query.filter.startDate && (query.filter.startDate.startDate || query.filter.startDate.endDate);

    if (!hasFlatStartDateFrom && !hasFlatStartDate && !hasNestedStartDateFrom && !hasNestedStartDate) {
      query.filter.start_date_from = {
        startDate: defaultStart,
        endDate: defaultEnd
      };
      query.filter.startDate = {
        startDate: defaultStart,
        endDate: defaultEnd
      };
    }
  }
}


