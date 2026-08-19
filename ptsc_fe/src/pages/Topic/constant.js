
import * as yup from 'yup';

export const STATUS_OPTIONS = [
    { value: 1, label: 'Hoạt động' },
    { value: 2, label: 'Không hoạt động' },
];

// Default values
export const defaultValue = {
    name: '',
    href: '',
    displayOrder: '',
    status: 1,
    requiresApproval: true,
    description: ''
};

// Schema validation với yup
export const schema = yup.object().shape({
    name: yup.string().required('Vui lòng nhập tên chủ đề'),
    href: yup.string().required('Vui lòng nhập mã chủ đề'),
    status: yup
        .number()
        .transform((value, originalValue) => {
            // Transform empty string to undefined to avoid NaN
            return originalValue === '' ? undefined : value;
        })
        .required('Vui lòng chọn trạng thái'),
    requiresApproval: yup.boolean().typeError('Vui lòng chọn trạng thái phê duyệt'),
});

export const schemaEdit = yup.object().shape({
    displayOrder: yup.number().required('Vui lòng nhập thứ tự hiển thị'),
    status: yup
        .number()
        .transform((value, originalValue) => {
            // Transform empty string to undefined to avoid NaN
            return originalValue === '' ? undefined : value;
        })
        .required('Vui lòng chọn trạng thái'),
    requiresApproval: yup.boolean().typeError('Vui lòng chọn trạng thái phê duyệt'),
});
