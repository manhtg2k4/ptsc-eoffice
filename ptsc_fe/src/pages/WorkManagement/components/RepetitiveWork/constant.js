import * as yup from "yup";
 
export const schema = yup.object().shape({
    name: yup.string()
        .required("Vui lòng nhập tên công việc")
        .max(500, "Tên công việc không được vượt quá 500 ký tự"),
    // .matches(/^[\p{L}0-9\s]+$/u, "Tên công việc không được chứa ký tự đặc biệt"),
    note: yup.string()
        .max(3000, "Mô tả không được vượt quá 3000 ký tự"),
    // .matches(/^[\p{L}0-9\s.,!?:;()-]*$/u, "Mô tả không được chứa ký tự đặc biệt"),

    // Thêm các trường khác cần thiết từ index.js
    startTime: yup.mixed().required("Vui lòng chọn giờ lặp"),
    durationDays: yup.number().when('repetitiveTask', {
        is: (repetitiveTask) => repetitiveTask !== 'ngay',
        then: (schema) => schema
            .required("Vui lòng nhập số ngày")
            .test("is-positive", "Số ngày thực hiện phải lớn hơn 0", (value) => {
                if (!value) return true;
                return Number(value) > 0;
            }),
        otherwise: (schema) => schema.notRequired(),
    }),
    repetitiveTask: yup.string().required("Vui lòng chọn loại lặp"),
    reminderTime: yup.string().required("Vui lòng chọn thời gian nhắc hạn"),
    assigners: yup.mixed().nullable().notRequired(),
    // Validate theo loại lặp
    daysOfWeek: yup.string().when('repetitiveTask', {
        is: 'tuan',
        then: (schema) => schema.required("Vui lòng chọn thứ để lặp"),
        otherwise: (schema) => schema.notRequired(),
    }),
    monthPattern: yup.string().when('repetitiveTask', {
        is: 'thang',
        then: (schema) => schema.required("Vui lòng chọn kiểu lặp theo tháng"),
        otherwise: (schema) => schema.notRequired(),
    }),
    monthDay: yup.number().when(['repetitiveTask', 'monthPattern'], {
        is: (repetitiveTask, monthPattern) => repetitiveTask === 'thang' && monthPattern === 'dayOfMonth',
        then: (schema) => schema
            .typeError("Vui lòng chọn ngày lặp trong tháng")
            .required("Vui lòng chọn ngày lặp trong tháng")
            .min(1, "Ngày lặp phải từ 1 đến 28")
            .max(28, "Ngày lặp phải từ 1 đến 28"),
        otherwise: (schema) => schema.notRequired(),
    }),
    monthWeekday: yup.string().when(['repetitiveTask', 'monthPattern'], {
        is: (repetitiveTask, monthPattern) => repetitiveTask === 'thang' && monthPattern === 'weekday',
        then: (schema) => schema.required("Vui lòng chọn thứ trong tháng"),
        otherwise: (schema) => schema.notRequired(),
    }),
    monthWeekPosition: yup.string().when(['repetitiveTask', 'monthPattern'], {
        is: (repetitiveTask, monthPattern) => repetitiveTask === 'thang' && monthPattern === 'weekday',
        then: (schema) => schema.required("Vui lòng chọn tuần trong tháng"),
        otherwise: (schema) => schema.notRequired(),
    }),
    monthInQuarter: yup.string().when('repetitiveTask', {
        is: 'quy',
        then: (schema) => schema.required("Vui lòng chọn tháng lặp trong quý"),
        otherwise: (schema) => schema.notRequired(),
    }),
    quarterPattern: yup.string().when('repetitiveTask', {
        is: 'quy',
        then: (schema) => schema.required("Vui lòng chọn kiểu lặp theo quý"),
        otherwise: (schema) => schema.notRequired(),
    }),
    quarterDay: yup.number().when(['repetitiveTask', 'quarterPattern'], {
        is: (repetitiveTask, quarterPattern) => repetitiveTask === 'quy' && quarterPattern === 'dayOfMonth',
        then: (schema) => schema
            .typeError("Vui lòng chọn ngày lặp trong tháng của quý")
            .required("Vui lòng chọn ngày lặp trong tháng của quý")
            .min(1, "Ngày lặp phải từ 1 đến 28")
            .max(28, "Ngày lặp phải từ 1 đến 28"),
        otherwise: (schema) => schema.notRequired(),
    }),
});


export const defaultValues = {
    name: '',
    note: '',
    daysOfWeek: '2',
    durationDays: 1,
    templateId: null,
    reminderTime: "1_day",
    topic: null,
    priority: null,
    startTime: null,
    assigners: null,
    directors: null,
    supporters: [],
    viewers: [],
    // Mặc định khi mở màn tạo CV lặp: chọn lặp theo tuần
    repetitiveTask: 'ngay',
    monthPattern: 'weekday',
    monthDay: 1,
    monthWeekday: '2',
    monthWeekPosition: 1,
    quarterPattern: 'dayOfMonth',
    quarterDay: 1,
    quarterWeekday: '2',
    quarterWeekPosition: 1,
    monthInQuarter: '1',
    files: [],
    code: '',
    isApprovalRequired: false,
}


export const weekDays = [
    { label: 'Thứ 2', value: '2' },
    { label: 'Thứ 3', value: '3' },
    { label: 'Thứ 4', value: '4' },
    { label: 'Thứ 5', value: '5' },
    { label: 'Thứ 6', value: '6' },
    { label: 'Thứ 7', value: '7' },
    { label: 'Chủ nhật', value: '8' },
];

// Options cho "Vào thứ mấy của tháng"
export const weekdayOptions = [
    { label: 'Thứ 2', value: '2' },
    { label: 'Thứ 3', value: '3' },
    { label: 'Thứ 4', value: '4' },
    { label: 'Thứ 5', value: '5' }, 
    { label: 'Thứ 6', value: '6' },
    { label: 'Thứ 7', value: '7' },
    { label: 'Chủ nhật', value: '8' },
];

// Options cho "Đầu tiên, thứ 2,... của tháng"
export const weekOfMonthOptions = [
    { label: 'Đầu tiên của tháng', value: 1},
    { label: 'Cuối cùng của tháng', value: 2 },
];

// Options cho tháng trong quý
export const monthInQuarterOptions = [
    { label: 'Tháng đầu', value: 1 },
    { label: 'Tháng giữa', value: 2 },
    { label: 'Tháng cuối', value: 3 },
];
