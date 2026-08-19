import * as yup from "yup";

export const columns = [
  { name: "Mã vai trò", row: "code", width: "100px" },
  { name: "Tên vai trò", row: "name", width: "300px" },
  { name: "Tên chức năng", row: "functionNameDisplay", width: "400px" },
  { name: "Mô tả", row: "describe", width: "400px" },
];

export const filters = [
  { name: "Mã vai trò", code: "code" },
  { name: "Tên vai trò", code: "name" },
  // { name: "Tên chức năng", code: "functionName" },
];
export const columnsStatic = [
  { name: "Mã vai trò", row: "code", width: "100px" },
  { name: "Tên vai trò", row: "name", width: "300px" },
  { name: "Tên chức năng", row: "roles.functionName", width: "400px" },
];

export const filtersStatic = [
  { name: "Mã vai trò", code: "code" },
  { name: "Tên vai trò", code: "name" },
];
export const columnsDynamic = [
  { name: "Quy trình", row: "code", width: "100px" },
  { name: "Tên vai trò", row: "name", width: "300px" },
];

export const filtersDynamic = [
  { name: "Quy trình", code: "code" },
  { name: "Tên vai trò", code: "name" },
];

export const permissions = [
    "Báo cáo hồ sơ lưu trữ",
    "Báo cáo hồ sơ hủy hiệu lực",
    "Báo cáo giấy tờ tài sử dụng của công dân",
    "Báo cáo giấy tờ tài sử dụng của tổ chức/doanh nghiệp",
    "Báo cáo giấy tờ có chữ ký số không hợp lệ",
    "Báo cáo dữ liệu khai thác, chia sẻ kết quả giải quyết TTHC",
    "Báo cáo dữ liệu khai thác, chia sẻ giấy tờ tài sử dụng của công dân",
    "Báo cáo dữ liệu khai thác, chia sẻ giấy tờ tài sử dụng của tổ chức/doanh nghiệp",
  ];

export const templateSchema = yup.object({
  code: yup
    .string()
    .transform((value) => value.trim())
    .required("Mã nhóm không được để trống")
    .min(3, "Mã vai trò phải có ít nhất 3 ký tự")
    .max(50, "Mã vai trò không được vượt quá 50 ký tự"),

  name: yup
    .string()
    .transform((value) => value.trim())
    .required("Tên vai trò không được để trống")
    .max(100, "Tên vai trò không được vượt quá 100 ký tự"),

  describe: yup.string().optional()
  .transform((value) => value.trim())
  .max(2000, "Mô tả không được vượt quá 2000 ký tự"),

  // Thay đổi cấu trúc để quản lý nhiều vai trò
  roles: yup
    .array()
    .of(
      yup.object().shape({
        functionName: yup.string().required("Phân hệ không được để trống"),
        permissions: yup
          .array()
          .min(1, "Vui lòng chọn ít nhất một quyền")
          .required("Quyền là bắt buộc"),
      })
    )
    .min(1, "Vui lòng chọn ít nhất một phân hệ và cấp quyền."),

});

export const defaultValue = {
};
