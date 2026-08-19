import * as yup from "yup";

export const columns = [
  { name: "Mã danh mục chung", row: "categoryCode", width: "140px" },
  { name: "Tên danh mục chung", row: "categoryName", width: "300px" },
];

export const filters = [
  { name: "Mã danh mục chung", code: "categoryCode" },
  { name: "Tên danh mục chung", code: "categoryName" },
];

export const templateSchema = yup.object({
  categoryCode: yup
    .string()
    .trim()
    .required("Mã danh mục chung không được để trống")
    .max(20, "Mã danh mục chung không được vượt quá 20 ký tự")
    .matches(/^[a-zA-Z0-9_-]+$/, "Mã danh mục chung không được chứa ký tự đặc biệt"),
  categoryName: yup
    .string()
    .trim()
    .required("Tên danh mục chung không được để trống")
    .max(150, "Tên danh mục chung không được vượt quá 150 ký tự")
    .matches(
      /^[\p{L}0-9\s]+$/u,
      "Tên danh mục chung chỉ được chứa chữ cái, số và khoảng trắng, không chứa ký tự đặc biệt"
    ),
  description: yup
    .string()
    .notRequired()
    .max(2000, "Tên danh mục chung không được vượt quá 2000 ký tự")
    .matches(
      /^[\p{L}\p{N}\s.,'-]*$/u,
      "Mô tả không được chứa ký tự đặc biệt"
    ),
  isRequired: yup.boolean()
  ,
  valueList: yup
  .array()
  .of(
    yup.object().shape({
      code: yup
        .string()
        .trim()
        .required("Mã không được để trống")
        .matches(
          /^[a-zA-Z0-9\s'-]+$/,
          "Mã không được chứa ký tự đặc biệt"
        ),
      name: yup
        .string()
        .trim()
        .required("Tên không được để trống")
        .matches(
          /^[a-zA-ZÀ-ỹ0-9\s'-]+$/,
          "Tên không được chứa ký tự đặc biệt"
        ),
    })
  )
  .min(1, "Cần ít nhất một giá trị trong danh sách")


});

export const defaultValue = {
  categoryCode: "",
  categoryName: "",
  description: "",
  valueList: [],
  isRequired: false
};
