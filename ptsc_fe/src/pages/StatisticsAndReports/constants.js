import { APP_BASE, APP_DHVB_BASE } from "@EnvironmentFile/constants/urlConfig";

export const listTableSelectOptions = [
    { label: 'Danh sách công việc cá nhân theo trạng thái', value: 'columnListJobByStatus', api: `${APP_DHVB_BASE}/task-report/personal-tasks`, processFn: 'tkcvtheotrangthai' },
    { label: 'Thống kê hiệu suất công việc cá nhân', value: 'columnsPerformanceJobPerson', api: `${APP_DHVB_BASE}/task-report/performance`, processFn: 'tkhieusuatcanhan' },
    { label: 'Thống kê công việc của phòng', value: 'columnsDeptWorkStats', api: `${APP_DHVB_BASE}/task-report/dept-work-stats`, processFn: 'tkcvtheophong' },
    { label: 'Danh sách công việc quá hạn', value: 'columnsListJobLate', api: `${APP_DHVB_BASE}/task-report/overdue`, processFn: 'tkcvquahan' },
    { label: 'Công việc lặp theo chu kỳ', value: 'columnsListJobCycle', api: `${APP_DHVB_BASE}/task-report/recurring`, processFn: 'tkcvlaplai' },
    { label: 'Phân tích khối lượng công việc theo nguồn', value: 'columnsToSource', api: `${APP_DHVB_BASE}/task-report/workload-source`, processFn: 'tkcvtheonguon' },
    { label: "Công việc có thời gian xử lý lâu nhất", value: "columnsListJobLongest", api: `${APP_DHVB_BASE}/task-report/longest-processing-time`, processFn: "tkcvtheonguon" },
    { label: 'Tổng hợp tình trạng dự án', value: 'columnListJobStatus', api: `${APP_DHVB_BASE}/project-statistics/summary`, processFn: 'tkttduan' },
    { label: 'Tiến độ công việc theo dự án', value: 'columnListJobProgress', api: `${APP_DHVB_BASE}/project-statistics/tasks`, processFn: 'tktiendoduan' },
    { label: 'Thống kê hiệu suất thành viên dự án', value: 'columnListJobPerformance', api: `${APP_DHVB_BASE}/project-statistics/performance`, processFn: 'tkhieusuatduan' },
    { label: 'Danh sách công việc theo chủ đề', value: 'columnsTaskListByTopic', api: `${APP_DHVB_BASE}/task-report/topic-task-list`, processFn: 'tkhieusuatduan' },
];


export const filter = [{
    name: "Tên công việc",
    code: "tieuDe",
}
]
export const advancedFilterConfig = [
    {
        key: 'overdue',
        code: "overdue",
        label: "Công việc quá hạn",
        type: "checkBox",
        gridSize: ''
    },
    {
        key: "nguoiChuTri",
        code: 'nguoiChuTri',
        label: "Người thực hiện",
        type: 'asyncAutocomplete',
        apiUrl: `${APP_BASE}/api/users/by-task-role?typeTaskUser=director`,
        optionsProp: "",
        optionLabel: "name",
        optionValue: "id",
    },
    {
        key: "trangThai",
        name: 'Trạng thái',
        code: 'trangThai',
        type: 'multiSelect',

        placeholder: 'Chọn trạng thái',
        multiple: true,
        crmSourceCode: 'trangThaiCongViec'
    },
    {
        key: "nguonCongViec",
        name: 'Nguồn công việc',
        code: 'nguonCongViec',
        type: 'multiSelect',
        placeholder: 'Chọn nguồn công việc',
        multiple: true,
        crmSourceCode: 'nguonCongViec'
    }, {
        key: "ngayBatDau",
        label: "Ngày bắt đầu",
        type: "dateRange",
        fromKey: "ngayBatDau.startDate",
        toKey: "ngayBatDau.endDate",
    }, {
        key: "ngayHetHan",
        label: "Ngày hết hạn",
        type: "dateRange",
        fromKey: "ngayHetHan.startDate",
        toKey: "ngayHetHan.endDate",
    },
];
