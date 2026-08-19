import * as yup from "yup";
export const defaultValue = {
  name: "",
  code: "",
};
export const formListSchema = yup.object().shape({
  code: yup
    .string()
    .trim()
    .required("Mã thuộc tính là bắt buộc")
    .matches(/^[a-zA-Z0-9_]+$/, "Mã thuộc tính không được chứa ký tự đặc biệt"),
  name: yup
    .string()
    .trim()
    .required("Tên thuộc tính là bắt buộc")
    .matches(
      /^[a-zA-Z0-9\s\u00C0-\u1EF9]*$/,
      "Tên không được chứa ký tự đặc biệt"
    ),
});

export const filters = [
  { name: "Mã thuộc tính", code: "code" },
  { name: "Tên thuộc tính", code: "name" },
];

export const columnTable = [
  { name: "Mã thuộc tính", row: "code", width: "100px" },
  { name: "Tên thuộc tính", row: "name", width: "300px" },
];
