import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import * as dayjs from 'dayjs';

export const INCOMING_LIST_TYPE_MAP: Record<string, string[]> = {
  '/incoming/list/main-process': ['urgent', 'deadline', 'other', 'processed', 'incompleted', 'completed', 'notComplete', 'waitSign', 'notDone'],
  '/incoming/list/receive': ['waiting', 'submited', 'all'],
  '/incoming/list/implementation-coordination': ['waiting', 'processed', 'incompleted', 'completed', 'notComplete', 'notDone'],
  '/incoming/list/recipient-to-know': ['waiting', 'submited'],
};

export const OUTGOING_LIST_TYPE_MAP: Record<string, string[]> = {
  '/outgoing-documents/list/recipient-to-know': ['waiting', 'processed'],
  '/outgoing-documents/list/promulgate': ['waiting', 'processed'],
  '/outgoing-documents/list/process': ['waiting', 'processed', 'published', 'stampedDoc'],
  '/outgoing-documents/list/signer-process': ['draft', 'signed', 'pending_publication', 'published', 'processing', 'dang_xu_ly', 'completed', 'hoan_thanh', 'replaced', 'thay_the', 'bi_thay_the', 'cho_phat_hanh', 'cho_ban_hanh'],
};

export const ALLOWED_FILTER_KEYS: string[] = [
  "document_id", "document_code", "documentCode", "status_code", "created_at", "updated_at", "book_document_id", "status", "bpmn_version",
  "abstract_note", "to_book", "sender_unit", "receiver_unit", "document_date", "receive_date", "to_book_date",
  "deadline", "second_book", "receive_method", "private_level", "urgency_level", "document_type", "document_field",
  "signer", "to_book_code", "fileids", "parent_doc", "type_process_doc", "drafter", "report_signer", "report_document_symbol",
  "to_book_text_symbols", "viewers", "deadline_reply", "recipient_ids", "internal_receiving_unit", "reply_incomming_doc",
  "draft_signer", "code_commanders", "commanders", "current_note", "release_no", "release_date", "text_symbols",
  "doc_work_files", "doc_proposal", "doc_draft", "doc_attachments", "doc_recall", "doc_replacement", "doc_answer",
  "external_receiving_unit", "internal_receiving_dept", "processor", "files", "type_doc", "vieweds", "id", "author",
  "authorized", "stage", "start_date", "end_date", "original_end_date", "filter", "isStar", "isDeleted", "is_deleted", "name", "location", "capacity",
  "status", "available_from", "user_deadline", "directive_comment", "note", "stage_status", "amenities",
  "resolution_deadline", "signType",
  "title", "host_user_id", "created_by", "note", "participants", "start_time", "end_time", "attendance_state", "org_unit_id", "not_check",
  "total_seating", "meeting_date", "meeting_time",
  "leader", "schedule_type", "calendar_format", "work_date", "from_date",
  "to_date", "content", "morning_location", "morning_content",
  "afternoon_location", "afternoon_content",
  "assignee_user", "deadline_from", "deadline_to",
  "date_from", "date_to", "directive_leader", "directive_comment",
  "month", "year", "role", "total", "officialLetter", "decision", "announcement", "report", "other",
  "avgDays", "onTime", "late", "processing", "onTimeRate",
  "signerType", "equipment", "signerId",
  "type_of_process", "know_receivers", "replaced_documents",
  "over_date", "created_date",
  "license_plate", "car_type", "brand", "seat_count", "manager", "status_car", "total_trips", "booking_available", "maintenance",
  "driver_id", "full_name", "phone_number", "id_card", "email", "address", "license_number", "license_class", "license_issued_date", "experience_years",
  "excerpt", "tongVBKy",
  "completed_at", "day_overdue", "receiver_units", "tong_vb_ky", "cong_van",
  "quyet_dinh", "thong_bao", "bao_cao", "khac",
  "receiver", "interoperability_status", "total_received", "unprocessed", "late_rate", "notification",
  "processDeadline", "process_deadline"
];

// --- Hỗ trợ camelCase <-> snake_case
function toSnakeCase(str: string) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}
function toCamelCase(str: string) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// --- Validator filter object
export function IsValidDateRangeFilter(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsValidDateRangeFilter',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(filter: any) {
          if (!filter || typeof filter !== 'object') return true;
          const errors: { field: string; message: string }[] = [];

          function validateRecursively(obj: any, path = '') {
            for (const key of Object.keys(obj)) {
              const value = obj[key];
              const fullPath = path ? `${path}.${key}` : key;

              // check key hợp lệ (camelCase hoặc snake_case)
              const allowed = ALLOWED_FILTER_KEYS.some(
                k => k === key || k === toSnakeCase(key) || k === toCamelCase(key)
              );
              if (!allowed) {
                errors.push({ field: fullPath, message: `Filter không hỗ trợ field: ${key}` });
              }

              // check isStar
              if (key === 'isStar') {
                if (value !== true && value !== false && value !== 'true' && value !== 'false') {
                  errors.push({ field: fullPath, message: 'filter[isStar] chỉ nhận true hoặc false' });
                }
              }

              // nested object
              if (value && typeof value === 'object' && !Array.isArray(value)) {
                if ('startDate' in value && value.startDate && !(
                  dayjs(value.startDate, 'YYYY-MM-DD', true).isValid() ||
                  dayjs(value.startDate).isValid()
                )) {
                  errors.push({ field: `${fullPath}.startDate`, message: 'startDate phải đúng định dạng YYYY-MM-DD' });
                }
                if ('endDate' in value && value.endDate && !(
                  dayjs(value.endDate, 'YYYY-MM-DD', true).isValid() ||
                  dayjs(value.endDate).isValid()
                )) {
                  errors.push({ field: `${fullPath}.endDate`, message: 'endDate phải đúng định dạng YYYY-MM-DD' });
                }
                validateRecursively(value, fullPath);
              }
            }
          }

          validateRecursively(filter);
          (this as any).validationErrors = errors;
          return errors.length === 0;
        },
        defaultMessage(args: ValidationArguments) {
          const errors = (this as any).validationErrors || [];
          return JSON.stringify(errors);
        },
      },
    });
  };
}

// --- Validator type
export function IsValidType(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsValidType',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(type: string) {
          if (!type) return true;
          const allAllowedTypes = Object.values(INCOMING_LIST_TYPE_MAP)
            .concat(Object.values(OUTGOING_LIST_TYPE_MAP))
            .flat();
          return allAllowedTypes.includes(type);
        },
        defaultMessage(args: ValidationArguments) {
          return 'Loại tài liệu (type) không hợp lệ hoặc không được hỗ trợ.';
        },
      },
    });
  };
}

// --- Validator số nguyên dương string với giới hạn tối đa
export function IsPositiveIntString(
  minValue = 1,
  maxValueOrOptions?: number | ValidationOptions,
  validationOptions?: ValidationOptions,
) {
  let maxValue: number | undefined = undefined;
  let options = validationOptions;

  if (typeof maxValueOrOptions === 'number') {
    maxValue = maxValueOrOptions;
  } else if (maxValueOrOptions && typeof maxValueOrOptions === 'object') {
    options = maxValueOrOptions as ValidationOptions;
  }

  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPositiveIntString',
      target: object.constructor,
      propertyName,
      options: options,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;
          const num = Number(value);
          if (isNaN(num) || !Number.isInteger(num) || num < minValue) return false;
          if (maxValue !== undefined && num > maxValue) return false;
          return true;
        },
        defaultMessage(args: ValidationArguments) {
          if (maxValue !== undefined) {
            return `${args.property} phải là số nguyên trong khoảng [${minValue}, ${maxValue}].`;
          }
          return `${args.property} phải là số nguyên >= ${minValue}.`;
        },
      },
    });
  };
}

// --- Validator cho trường limit (sử dụng MAX_PAGE_LIMIT từ env)
export function IsPagedLimit(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPagedLimit',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string' && typeof value !== 'number') return false;
          const num = Number(value);
          const maxLimit = getMaxPageLimit();
          return !isNaN(num) && Number.isInteger(num) && num >= 1 && num <= maxLimit;
        },
        defaultMessage(args: ValidationArguments) {
          const maxLimit = getMaxPageLimit();
          return `${args.property} phải là số nguyên trong khoảng [1, ${maxLimit}]. Giá trị mặc định: ${getDefaultPageLimit()}.`;
        },
      },
    });
  };
}

// --- Helper: Lấy max page limit từ environment variable
export function getMaxPageLimit(): number {
  const envValue = parseInt(process.env.MAX_PAGE_LIMIT || '', 10);
  return isNaN(envValue) || envValue <= 0 ? 100 : envValue;
}

// --- Helper: Lấy default page limit từ environment variable
export function getDefaultPageLimit(): number {
  const envValue = parseInt(process.env.DEFAULT_PAGE_LIMIT || '', 10);
  const maxLimit = getMaxPageLimit();
  if (isNaN(envValue) || envValue <= 0) return 20;
  return Math.min(envValue, maxLimit);
}

// --- Utility: Clamp giá trị limit về khoảng cho phép (server-side fallback)
export function clampLimit(value: string | number, min = 1, max?: number): number {
  const maxLimit = max ?? getMaxPageLimit();
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  if (isNaN(num) || !Number.isInteger(num)) return min;
  return Math.max(min, Math.min(num, maxLimit));
}
// Validate Sort
export function IsValidSort(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsValidSort',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(sort: any) {
          if (sort == null) return true;

          // Nếu sort là string (từ query string), thử parse JSON
          let sortObj = sort;
          if (typeof sort === 'string') {
            try {
              sortObj = JSON.parse(sort);
            } catch (e) {
              (this as any).validationErrors = [{ field: 'sort', message: 'Sort phải là JSON object hợp lệ' }];
              return false;
            }
          }

          if (typeof sortObj !== 'object' || Array.isArray(sortObj)) {
            (this as any).validationErrors = [{ field: 'sort', message: 'Sort phải là object, không phải array hoặc primitive' }];
            return false;
          }

          const errors: { field: string; message: string }[] = [];

          for (const [key, value] of Object.entries(sortObj)) {
            // 1. Chặn SQL injection qua key
            if (/[;'"`]|--|\b(select|drop|insert|update|delete)\b/i.test(key)) {
              errors.push({
                field: key,
                message: 'Sort key chứa ký tự không hợp lệ',
              });
              continue;
            }

            // 2. Check field hợp lệ (camel / snake)
            const allowed = ALLOWED_FILTER_KEYS.some(
              k => k === key || k === toSnakeCase(key) || k === toCamelCase(key),
            );

            if (!allowed) {
              errors.push({
                field: key,
                message: `Sort không hỗ trợ field: ${key}`,
              });
            }

            // 3. Check value hợp lệ
            const validValues = [1, -1, '1', '-1', 'asc', 'desc', 'ASC', 'DESC'];
            if (!validValues.includes(value as any)) {
              errors.push({
                field: key,
                message: 'Sort value chỉ nhận 1 | -1 | asc | desc',
              });
            }
          }

          (this as any).validationErrors = errors;
          return errors.length === 0;
        },

        defaultMessage() {
          return JSON.stringify((this as any).validationErrors || []);
        },
      },
    });
  };
}

// Validate authority + room
export function IsBooleanString(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsBooleanString',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (value === undefined || value === null) return true;
          return value === 'true' || value === 'false';
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} chỉ nhận 'true' hoặc 'false'`;
        },
      },
    });
  };
}