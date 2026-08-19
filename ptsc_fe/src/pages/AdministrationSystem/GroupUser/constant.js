import * as yup from "yup";

export const columns = [
  { name: "Mã nhóm", row: "code", width: "100px" },
  { name: "Tên nhóm", row: "name", width: "300px" },
  { name: "Mô tả", row: "description", width: "400px" },
];

export const filters = [
  { name: "Mã nhóm", code: "code" },
  { name: "Tên nhóm", code: "name" },
];
export const columnsStatic = [
  { name: "Mã vai trò", row: "code", width: "100px" },
  { name: "Tên vai trò", row: "name", width: "300px" },
   {
    name: "Tên chức năng",
    row: "roles.functionName",
    accessor: (row) => row?.roles?.[0]?.functionName?.name || "", // ✅ Lấy tên chức năng từ roles[0]
    width: "300px",
  },

];

export const filtersStatic = [
  { name: "Mã vai trò", code: "code" },
  { name: "Tên vai trò", code: "name" },
  // { name: "Tên chức năng", code: "functionName" }, // ✅ Cho phép tìm theo tên chức năng

];
export const columnsDynamic = [
  { name: "Mã Quy trình", row: "processKey" },
  { name: "Tên Quy trình", row: "processKeyName" },
  {
    name: "Tên vai trò",
    row: "roles.name", // ✅ Gửi 'roles.name' khi sắp xếp
    accessor: (row) => row.name, // ✅ Vẫn hiển thị dữ liệu từ trường 'name' của data đã được làm phẳng
   },
];

export const filtersDynamic = [
  { name: "Mã Quy trình", code: "processKey" },
  { name: "Tên Quy trình", code: "processKeyName" },
  // { name: "Tên vai trò", code: "name" },
];

export const templateSchema = yup.object({
  code: yup
    .string()
    .transform((value) => value.trim())
    .required("Mã nhóm không được để trống")
    .min(3, "Mã nhóm phải có ít nhất 3 ký tự")
    .max(50, "Mã nhóm không được vượt quá 50 ký tự")
    .matches(
      /^[a-zA-Z0-9]+$/,
      "Mã nhóm chỉ được chứa chữ cái (không dấu) và chữ số, không chứa ký tự đặc biệt hoặc dấu tiếng Việt"
    ),

  name: yup
    .string()
    .transform((value) => value.trim())
    .required("Tên nhóm không được để trống")
    .max(150, "Tên nhóm không được vượt quá 150 ký tự"),

  organizationUnits: yup
    .array()
    .notRequired(),

  description: yup
    .string()
    .trim()
    .max(2000, "Độ dài không được vượt quá 2000 ký tự!")   // ✅ thêm validate độ dài
    .notRequired(),

  order: yup
    .number()
    .typeError("Cấp phải là số")
    .required("Cấp không được để trống"),
});


export const defaultValue = {
  order: "",
};
