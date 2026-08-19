import * as yup from "yup";
export const defaultFormValuesDistrict = {
  name: "",
  code: "",
  phoneNumber: "",
	email: "",
	settingIcon: "",
  roleGroupIds: [],
  collapsed: false
};

export const columnsDistrict = [
  { name: "Chức năng", row: "function", width: "200px", mobileWidth: "300px", accessor: (row) => row?.function?.code },
  { name: "Thứ tự", row: "order", width: "100px", mobileWidth: "100px", align: "right" },
];
export const filtersDistrict = [
  { name: "Tên ", code: "name" },
  { name: "Chức năng", code: "function" }, // ✅ đúng field thực tế trong API
];

export const columnsUsers = [
  { name: "Tên đăng nhập", row: "username", width: "100px" },
  { name: "Họ và tên", row: "name", width: "300px" },
  { name: "Mã cán bộ", row: "codeND", width: "100px" },
  { name: "Ngày sinh", row: "birthday", width: "200px" },
  { name: "Giới tính", row: "gender", width: "100px" },
  // { name: "Đơn vị cha", row: "parent" ,width: "400px"},
  { name: "Đơn vị cha", row: "parent", width: "400px" },
  { name: "Đơn vị", row: "unit", width: "400px" },
  { name: "Chức vụ", row: "position", width: "200px" },
  { name: "Nhóm người dùng", row: "groupUser", width: "200px" },
  { name: "Trạng thái", row: "status", width: "200px" },
];

export const filtersUsers = [
  { name: "Tên đăng nhập", code: "username" },
  { name: "Họ và tên", code: "name" },
  { name: "Mã cán bộ", code: "codeND" },
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

export const optionsUnit = [
  "Báo cáo hồ sơ lưu trữ",
  "Báo cáo hồ sơ hủy hiệu lực",
  "Báo cáo giấy tờ tài sử dụng của công dân",
  "Báo cáo giấy tờ tài sử dụng của tổ chức/doanh nghiệp",
  "Báo cáo giấy tờ có chữ ký số không hợp lệ",
  "Báo cáo dữ liệu khai thác, chia sẻ kết quả giải quyết TTHC",
  "Báo cáo dữ liệu khai thác, chia sẻ giấy tờ tài sử dụng của công dân",
  "Báo cáo dữ liệu khai thác, chia sẻ giấy tờ tài sử dụng của tổ chức/doanh nghiệp",
];

// export const documentSchema = yup.object({
//   code: yup
//     .string()
//     .transform((value) => value.trim())
//     .required("Mã đơn vị không được để trống")
//     .max(20, "Mã đơn vị không được vượt quá 20 ký tự")
//     .matches(
//       /^[a-zA-Z0-9ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯưẠ-ỹ\s]*$/,
//       "Mã đơn vị chỉ được chứa chữ cái, số và tiếng Việt có dấu"
//     ),
//   name: yup
//     .string()
//     .transform((value) => value.trim())
//     .required("Tên đơn vị không được để trống")
//     .max(100, "Tên đơn vị không được vượt quá 200 ký tự")
//     .matches(
//       /^[a-zA-Z0-9ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯưẠ-ỹ\s]*$/,
//       "Tên đơn vị chỉ được chứa chữ cái, số và tiếng Việt có dấu"
//     ),
//   phoneNumber: yup
//     .string()
//     .nullable()
//     .transform((value) => (value === null ? "" : value.trim()))
//     .matches(/^[0-9]*$/, "Số điện thoại chỉ được chứa chữ số")
//     .test(
//       "length-if-exists",
//       "Số điện thoại phải có từ 10 đến 11 số",
//       (value) => {
//         if (!value) return true; // cho phép rỗng
//         return value.length >= 10 && value.length <= 11;
//       }
//     ),
//   email: yup
//     .string()
//     .trim()
//     .email('Email không hợp lệ'),
//   leader: yup
//     .string()
//     .trim()
//     .notRequired()
//     .test(
//       'no-special-chars',
//       'Tên leader không được chứa ký tự đặc biệt',
//       (value) => {
//         if (!value) return true; // Bỏ qua nếu không nhập
//         return /^[a-zA-Z0-9\s]+$/.test(value); // Chỉ cho chữ, số, và khoảng trắng
//       }
//     ),
//   order: yup
//     .number()
//     .transform((value, originalValue) => originalValue === "" ? null : Number(originalValue))
//     .nullable()
//     .typeError("Thứ tự phải là số")
//     .integer("Thứ tự phải là số nguyên")
//     .min(0, "Thứ tự phải lớn hơn hoặc bằng 0")

// });

export const documentSchema = yup.object({
  // code: yup
  //   .string()
  //   .transform((value) => value.trim())
  //   .required("Mã đơn vị không được để trống")
  //   .max(20, "Mã đơn vị không được vượt quá 20 ký tự")
  //   .matches(
  //     /^[a-zA-Z0-9ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯưẠ-ỹ\s]*$/,
  //     "Mã đơn vị chỉ được chứa chữ cái, số và tiếng Việt có dấu"
  //   ),

  // name: yup
  //   .string()
  //   .transform((value) => value?.trim())
  //   .required("Trường này là trường bắt buộc!")
  //   .max(200, "Tên đơn vị không được vượt quá 200 ký tự")
  //   .test(
  //     "no-special-chars",
  //     "Tên đơn vị không được chứa các ký tự đặc biệt",
  //     (value) => !/[`~!@#$%^*]/.test(value || "")
  //   ),

  // phoneNumber: yup
  //   .string()
  //   .nullable()
  //   .transform((value) => (value === null ? "" : value.trim()))
  //   .matches(/^[0-9]*$/, "Số điện thoại chỉ được chứa chữ số")
  //   .test(
  //     "length-if-exists",
  //     "Số điện thoại phải có từ 10 đến 11 số",
  //     (value) => {
  //       if (!value) return true;
  //       return value.length >= 10 && value.length <= 11;
  //     }
  //   ),

  // email: yup
  //   .string()
  //   .nullable()
  //   .notRequired()
  //   .test('is-valid-email', 'Email không hợp lệ', (value) => {
  //     if (!value) return true; // Cho phép null/undefined/empty
  //     return /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
  //   }),
  // leader: yup
  //   .string()
  //   .trim()
  //   .notRequired()
  //   .test(
  //     'no-special-chars',
  //     'Tên lãnh đạo không được chứa ký tự đặc biệt',
  //     (value) => !/[`~!@#$%^*]/.test(value || "")
  //   ),

  // order: yup
  //   .number()
  //   .transform((value, originalValue) => originalValue === "" ? null : Number(originalValue))
  //   .nullable()
  //   .typeError("Thứ tự phải là số")
  //   .integer("Thứ tự phải là số nguyên")
  //   .min(0, "Thứ tự phải lớn hơn hoặc bằng 0").notRequired(),

  // parent: yup.string().notRequired(),
  // position: yup.string().notRequired(),
  // address: yup.string().notRequired().trim(),
  // description: yup.string().notRequired().trim(),
  name: yup
    .string()
    .transform((value) => value?.trim())
    .required("Tên menu là bắt buộc")
    .max(200, "Tên menu không được vượt quá 200 ký tự"),
  roleGroupIds: yup.array().nullable(),
});

