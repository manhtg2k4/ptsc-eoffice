import * as yup from "yup";

const rowSchema = yup.object({
  name: yup
  .string()
  .trim()
  .required("Tên là bắt buộc")
  .matches(/^[a-zA-Z0-9\s\u00C0-\u1EF9]*$/, "Tên không được chứa ký tự đặc biệt"),
code: yup
  .string()
  .trim()
  .required("Mã là bắt buộc")
  .matches(/^[a-zA-Z0-9\s\u00C0-\u1EF9]*$/, "Mã không được chứa ký tự đặc biệt"),
  type: yup.string().required("Kiểu nhập là bắt buộc"),
  format: yup.string().when("type", {
    is: (type) => ["date", "dynamic"].includes(type),
    then: (schema) => schema.optional(),
    otherwise: (schema) => schema.notRequired(),
  }),
  required: yup.boolean(),
  searchable: yup.boolean(),
 
});

export const validationSchema = yup.object({
  rows: yup.array().of(rowSchema).min(1, "Phải có ít nhất 1 hàng"),
});