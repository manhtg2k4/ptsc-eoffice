import * as yup from "yup";

export const processSchema = yup.object({
  name: yup
    .string()
    .transform((value) => value.trim())
    .required("Tên quy trình là bắt buộc")
    .max(150, "Tên quy trình không được vượt quá 150 ký tự"),
  id: yup
    .string()
    .transform((value) => value.trim())
    .required("Mã quy trình là bắt buộc")
    .max(50, "Mã quy trình không được vượt quá 50 ký tự")
    .matches(
      /^[a-zA-Z0-9_-]+$/,
      "Mã quy trình chỉ được chứa chữ cái không dấu, số, dấu gạch dưới '_' và gạch ngang '-'"
    ),
  description: yup
    .string()
    .transform((value) => value.trim())
    .max(2000, "Mô tả không được vượt quá 2000 ký tự"),
  unit: yup.array().of(yup.mixed()),
  relatedProcesses: yup.array().of(yup.string()),
});