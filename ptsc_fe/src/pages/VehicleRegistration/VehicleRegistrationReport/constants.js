import { API_VEHICLE_REQUEST } from "@EnvironmentFile/constants/urlConfig";

 

export const listTableSelectOptions = [
    { label: 'Thống kê yêu cầu đăng ký xe', value: 'StatisticsVehicleRegistrationRequests', api: `${API_VEHICLE_REQUEST}/statistics-vehicle-registration-requests`, processFn: 'TKYCDKX'},
    { label: 'Báo cáo thống kê sử dụng xe theo phương tiện', value: 'reportVehicleUsageByVehicle', api: `${API_VEHICLE_REQUEST}/vehicle-statistics-report`, processFn: 'TKSDTPT'},
    { label: 'Báo cáo thống kê đăng ký xe theo phòng ban', value: 'reportVehicleRegistrationByDepartment', api: `${API_VEHICLE_REQUEST}/vehicle-registration-statistics-department`, processFn: 'TKDKXTPB'},
    { label: 'Báo cáo thống kê xe được điều phối nhiều nhất', value: 'reportMostDispatchedVehicles', api: `${API_VEHICLE_REQUEST}/vehicle-most-dispatched-report`, processFn: 'TKXDDPNN'},
    { label: 'Báo cáo thống kê lịch sử mượn trả xe', value: 'reportVehicleBorrowReturnHistory', api: `${API_VEHICLE_REQUEST}/vehicle-borrow-return-history-report`, processFn: 'TKLSMTS'},
];

    