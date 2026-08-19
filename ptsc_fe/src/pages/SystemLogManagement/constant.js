import { format } from "date-fns";
import * as yup from "yup";

export const defaultValuePopupSetting = {
	timeSave: "",
	autoClean: true,
	updater: "",
	type: "SystemLog"
};

export const validatePopupSettingSchema = yup.object().shape({
  timeSave: yup
    .number()
    .typeError("Thời gian lưu trữ phải là số")
    .required("Vui lòng nhập thời gian lưu trữ")
    .positive("Thời gian lưu trữ phải lớn hơn 0")
    .min(1, "Thời gian lưu trữ tối thiểu là 1 ngày")
    .max(365, "Thời gian lưu trữ tối đa là 365 ngày"),

});


export const columns = [
  { name: "Họ và tên", row: "fullName", width: "200px", accessor: (row) => row.fullName },
  { name: "Tài khoản", row: "userName", width: "150px", accessor: (row) => row.userName },
  { name: "Đơn vị", row: "organization", width: "250px", accessor: (row) => row.organization },
  { name: "Mô tả", row: "details", width: "300px", accessor: (row) => row.details },
  { name: "Thao tác", row: "method", width: "100px", accessor: (row) => row.method },
  { name: "Trạng thái", row: "status", width: "120px", accessor: (row) => row.status === 'SUCCESS' ? 'Thành công' : 'Thất bại' },
  { name: "Địa chỉ IP", row: "ipAddress", width: "120px", accessor: (row) => row.ipAddress },
  {
    name: "Thời gian",
    row: "timestamp",
    width: "200px",
    // Việc format thời gian đã được xử lý trong file index.js, nên ở đây không cần accessor
        accessor: (row) => row.timestamp ? format(new Date(row.timestamp), "dd/MM/yyyy HH:mm") : "",
  },
];

export const filters = [
  { name: "Họ và tên", code: "fullName" },
  // { name: "Tài khoản", code: "userInfo.userName" },
  // { name: "Đơn vị", code: "userInfo.organization" },
  { name: "Mô tả", code: "details" },
  { name: "Thao tác", code: "method" },
  { name: "Địa chỉ IP", code: "ipAddress" },
];

// Không cần schema và giá trị mặc định vì đây là màn hình chỉ hiển thị
export const templateSchema = null;
