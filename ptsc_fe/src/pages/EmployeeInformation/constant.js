import { API_GET_COMMON_SOURCE, API_GET_LIST_UNIT } from "@EnvironmentFile/constants/urlConfig";

 

export const filter = [
    {
        code: 'name',
        name: 'Họ tên',
    },
    {
        code: 'codeND',
        name: 'Mã NV',
    },
    {
        code: 'email',
        name: 'Email',
    },
    {
        code: 'phone',
        name: 'Số điện thoại',
    },
];

export const advancedFilterConfig = [
    {
        key: 'department',
        label: 'Đơn vị',
        type: 'asyncAutocomplete',
        gridSize: "half",
        apiUrl: `${API_GET_LIST_UNIT}`
    },
    {
        key: 'position',
        label: 'Chức vụ',
        type: 'asyncAutocomplete',
        gridSize: "half",
        apiUrl: `${API_GET_COMMON_SOURCE}/S002`,
        queryParam: null,       // static list → không cần search server-side
        optionLabel: 'title',   // field hiển thị trong data S002
        optionValue: 'value',   // field value trong data S002
    },
];


