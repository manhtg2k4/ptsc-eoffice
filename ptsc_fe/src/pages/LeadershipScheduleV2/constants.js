
export const LEADERSHIP_SCHEDULE_FILTER_CONFIG = [
    {
        key: 'year',
        label: 'Năm',
        type: 'select',
        gridSize: 'full',
        placeholder: 'Năm cần tìm',
        options: Array.from({ length: 10 }, (_, i) => {
            const y = new Date().getFullYear() - 5 + i;
            return { label: String(y), value: String(y) };
        })
    },
    {
        key: 'month',
        label: 'Tháng',
        type: 'select',
        gridSize: 'half',
        placeholder: 'Tháng cần tìm',
        options: Array.from({ length: 12 }, (_, i) => ({
            label: `Tháng ${i + 1}`,
            value: String(i + 1).padStart(2, '0')
        }))
    },
    {
        key: 'week',
        label: 'Tuần',
        type: 'select',
        gridSize: 'half',
        placeholder: 'Tuần cần tìm',
        options: Array.from({ length: 53 }, (_, i) => ({
            label: `Tuần ${i + 1}`,
            value: `${i + 1}`
        }))
    }
];

export const LEADERSHIP_SCHEDULE_FILTERS = [
    { name: 'Tiêu đề lịch', code: 'title' },
    { name: 'Người tạo', code: 'createdBy' },
];
