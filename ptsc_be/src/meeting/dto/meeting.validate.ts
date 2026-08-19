import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import * as dayjs from 'dayjs';

export const ALLOWED_FILTER_KEYS: string[] = [
  // MeetingParticipantEntity
  "user_id", "seat_number", "meeting_unit_id", "room_id", "participant_role", 
  "participant_state", "attendance_state", "assignment_type", "delegated_to_user_id", 
  "delegated_from_user_id", "delegated_at", "attendance_at", "not_check", "accept_join", 
  "prepare_documents",

  // MeetingRecurrenceEntity
  "type", "form", "days_of_week", "days_of_month", "month_in_quarter", "end_month", 
  "end_year", "meeting_id",

  // MeetingTaskEntity
  "content", "document_name", "attachable_type", "attachable_role", "attachable_id", 
  "meeting_id", "created_at",

  // MeetingUnitEntity
  "unit_id", "meeting_id", "seat_number", "room_id", "unit_state", "accept_join", 
  "assign_participants", "prepare_documents", "meeting_unit_id","is_room_selected",

  // MeetingEntity
  "id", "title", "meeting_type", "priority", "meeting_date", "meeting_time", "meeting_mode", 
  "room_ids", "status", "status_code", "bpmn_version", "is_company", "content", "chairman_id", 
  "secretary_id", "direct_command", "attendance_locked", "online_meeting_id", "meeting_state", 
  "created_by", "started_at", "ended_at", "timezone","organization_unit","is_company","organizational_unit",

  // OnlineMeetingEntity
  "platform", "meeting_link", "passcode", "meeting_id",

  // MeetingGuestEntity
  "guest_name", "guest_title", "seat_number", "room_id", "created_at", "updated_at",

  // Trường hợp đặc biệt
  "currentDate", "currentMonth", "currentWeek.startDate", "currentWeek.endDate", "currentWeek", 
  "documentPrepared", "participatingComponents", "participationRole", "leaderState", "seatAssignment"
];

/**
 * Validate định dạng meetingTime: HH:mm-HH:mm và end > start
 */
@ValidatorConstraint({ name: 'isValidMeetingTime', async: false })
export class IsValidMeetingTimeConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    if (!value || typeof value !== 'string') return true;

    const match = /^(\d{2}:\d{2})-(\d{2}:\d{2})$/.exec(value);
    if (!match) return false;

    const [, start, end] = match;
    const startTime = dayjs(`2000-01-01 ${start}`);
    const endTime = dayjs(`2000-01-01 ${end}`);

    return endTime.isAfter(startTime);
  }

  defaultMessage(args: ValidationArguments): string {
    const value = args.value;
    if (!value) return 'meetingTime không được để trống';

    const match = /^(\d{2}:\d{2})-(\d{2}:\d{2})$/.exec(value as string);
    if (!match) {
      return 'meetingTime phải có định dạng đúng HH:mm-HH:mm (ví dụ: 08:30-11:30)';
    }

    return 'Thời gian kết thúc phải sau thời gian bắt đầu trong meetingTime';
  }
}

export function IsValidMeetingTime(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsValidMeetingTimeConstraint,
    });
  };
}

/**
 * Validate meetingMode: OFFLINE / ONLINE / HYBRID với các quy tắc liên quan roomId & onlineMeeting
 */
@ValidatorConstraint({ name: 'isValidMeetingMode', async: false })
export class IsValidMeetingModeConstraint implements ValidatorConstraintInterface {
  /**
   * Kiểm tra có phòng họp vật lý không (hỗ trợ nhiều phòng)
   */
  private hasRooms(object: any): boolean {
    if (!object.roomIds) return false;

    if (!Array.isArray(object.roomIds)) return false;

    return object.roomIds.some(
      (id: any) => typeof id === 'string' && id.trim() !== '',
    );
  }

  /**
   * Kiểm tra có thông tin họp online hợp lệ không
   */
  private hasOnlineMeeting(object: any): boolean {
    if (!object.onlineMeeting || typeof object.onlineMeeting !== 'object') {
      return false;
    }

    const link = object.onlineMeeting?.meetingLink;
    return typeof link === 'string' && link.trim() !== '';
  }

  validate(meetingMode: string, args: ValidationArguments): boolean {
    const object = args.object as any;

    // Kiểm tra meetingMode hợp lệ
    if (!['OFFLINE', 'ONLINE', 'HYBRID', 'OUTSIDETHECOMPANY'].includes(meetingMode)) {
      return false;
    }

    const hasRooms = this.hasRooms(object);
    const hasOnlineMeeting = this.hasOnlineMeeting(object);

    // Quy tắc theo từng mode
    if (meetingMode === 'OFFLINE') {
      return hasRooms && !hasOnlineMeeting;
    }

    if (meetingMode === 'ONLINE') {
      return !hasRooms;
    }

    if (meetingMode === 'HYBRID') {
      return hasRooms;
    }

    // Họp ngoài công ty: roomIds dùng làm địa điểm, không bắt buộc onlineMeeting
    if (meetingMode === 'OUTSIDETHECOMPANY') {
      return true;
    }

    return false;
  }

  defaultMessage(args: ValidationArguments): string {
    const object = args.object as any;
    const mode = object.meetingMode;

    const hasRooms = this.hasRooms(object);
    const hasOnlineMeeting = this.hasOnlineMeeting(object);

    const errors: string[] = [];

    if (!['OFFLINE', 'ONLINE', 'HYBRID', 'OUTSIDETHECOMPANY'].includes(mode)) {
      errors.push('meetingMode phải là một trong các giá trị: "OFFLINE", "ONLINE", "HYBRID", "OUTSIDETHECOMPANY"');
    } else {
      if (mode === 'OFFLINE') {
        if (!hasRooms) errors.push('Họp OFFLINE bắt buộc phải chọn ít nhất một phòng họp (roomIds)');
        if (hasOnlineMeeting) errors.push('Họp OFFLINE không được có thông tin họp online');
      }

      // if (mode === 'ONLINE') {
      //   if (hasRooms) errors.push('Họp ONLINE không được chọn phòng họp (roomIds)');
      //   if (!hasOnlineMeeting) errors.push('Họp ONLINE bắt buộc phải có thông tin onlineMeeting (có meetingLink)');
      // }

      if (mode === 'HYBRID') {
        if (!hasRooms) errors.push('Họp HYBRID bắt buộc phải chọn ít nhất một phòng họp (roomIds)');
        if (!hasOnlineMeeting) errors.push('Họp HYBRID bắt buộc phải có thông tin onlineMeeting (có meetingLink)');
      }
    }

    return errors.join('; ');
  }
}

export function IsValidMeetingMode(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsValidMeetingModeConstraint,
    });
  };
}

/**
 * Validate recurrence: endDate >= startDate (nếu có)
 */
@ValidatorConstraint({ name: 'isValidRecurrence', async: false })
export class IsValidRecurrenceConstraint implements ValidatorConstraintInterface {
  validate(recurrence: any): boolean {
    if (!recurrence) return true;

    if (recurrence.endDate && recurrence.startDate) {
      const start = dayjs(recurrence.startDate);
      const end = dayjs(recurrence.endDate);

      if (!start.isValid() || !end.isValid()) return true; // để các validator khác bắt lỗi format ngày

      if (end.isBefore(start)) return false;
    }

    return true;
  }

  defaultMessage(): string {
    return 'Trong recurrence, endDate phải lớn hơn hoặc bằng startDate';
  }
}

export function IsValidRecurrence(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsValidRecurrenceConstraint,
    });
  };
}

/**
 * Validate task.deadline ≤ cuối ngày họp (meetingDate)
 */
@ValidatorConstraint({ name: 'isValidTaskDeadline', async: false })
export class IsValidTaskDeadlineConstraint implements ValidatorConstraintInterface {
  validate(tasks: any[], args: ValidationArguments): boolean {
    if (!Array.isArray(tasks) || tasks.length === 0) return true;

    const object = args.object as any;
    if (!object.meetingDate) return true;

    const meetingEndOfDay = dayjs(object.meetingDate).endOf('day');

    for (const task of tasks) {
      if (!task.deadline) continue;

      const deadline = dayjs(task.deadline);
      if (!deadline.isValid()) return false;
      if (deadline.isAfter(meetingEndOfDay)) return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    const object = args.object as any;

    const errors: string[] = [];

    if (!object.meetingDate) {
      errors.push('Không tìm thấy meetingDate để kiểm tra deadline');
    } else {
      const meetingEndOfDay = dayjs(object.meetingDate).format('YYYY-MM-DD');

      // Kiểm tra từng task có deadline không hợp lệ
      const invalidTasks = (object.tasks || [])
        .filter((t: any) => t.deadline)
        .filter((t: any) => {
          const d = dayjs(t.deadline);
          return !d.isValid() || d.isAfter(dayjs(object.meetingDate).endOf('day'));
        });

      if (invalidTasks.length > 0) {
        errors.push(
          `Có ${invalidTasks.length} task có deadline không hợp lệ (phải trước hoặc trong ngày họp ${meetingEndOfDay})`
        );
      }
    }

    return errors.join('; ') || 'Deadline của task không hợp lệ';
  }
}

export function IsValidTaskDeadline(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsValidTaskDeadlineConstraint,
    });
  };
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

          if (typeof sort !== 'object' || Array.isArray(sort)) {
            return false;
          }

          const errors: { field: string; message: string }[] = [];

          for (const [key, value] of Object.entries(sort)) {
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

// --- Hỗ trợ camelCase <-> snake_case
function toSnakeCase(str: string) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}
function toCamelCase(str: string) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function IsValidDateRangeFilter(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsValidDateRangeFilter',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(filter: any) {
          if (!filter || typeof filter !== 'object' || Array.isArray(filter)) return true;

          const errors: { field: string; message: string }[] = [];

          // Hàm kiểm tra một full path (dot notation) có được phép không
          function isAllowedPath(path: string): boolean {
            // Kiểm tra chính xác path
            if (ALLOWED_FILTER_KEYS.includes(path)) return true;

            // Tạo các biến thể camel/snake cho từng phần của path
            const parts = path.split('.');
            const variants: string[] = [];

            // Với mỗi phần, tạo cả camel và snake version
            function generateVariants(index: number, current: string[]) {
              if (index === parts.length) {
                variants.push(current.join('.'));
                return;
              }
              const part = parts[index];
              generateVariants(index + 1, [...current, part]);
              generateVariants(index + 1, [...current, toSnakeCase(part)]);
              generateVariants(index + 1, [...current, toCamelCase(part)]);
            }

            generateVariants(0, []);

            return variants.some(v => ALLOWED_FILTER_KEYS.includes(v));
          }

          function validateRecursively(obj: any, path: string = '') {
            for (const key of Object.keys(obj)) {
              const value = obj[key];
              const fullPath = path ? `${path}.${key}` : key;

              // Kiểm tra fullPath có hợp lệ không
              if (!isAllowedPath(fullPath)) {
                errors.push({ field: fullPath, message: `Filter không hỗ trợ field: ${key}` });
              }

              // Đặc biệt kiểm tra định dạng ngày cho currentWeek.startDate và endDate
              if (fullPath === 'currentWeek.startDate' && value) {
                if (!dayjs(value as string, 'YYYY-MM-DD', true).isValid()) {
                  errors.push({ field: fullPath, message: 'startDate phải đúng định dạng YYYY-MM-DD' });
                }
              }
              if (fullPath === 'currentWeek.endDate' && value) {
                if (!dayjs(value as string, 'YYYY-MM-DD', true).isValid()) {
                  errors.push({ field: fullPath, message: 'endDate phải đúng định dạng YYYY-MM-DD' });
                }
              }

              // Đệ quy nếu là object
              if (value && typeof value === 'object' && !Array.isArray(value)) {
                validateRecursively(value, fullPath);
              }
            }
          }

          validateRecursively(filter);

          // Gán errors để dùng trong defaultMessage
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