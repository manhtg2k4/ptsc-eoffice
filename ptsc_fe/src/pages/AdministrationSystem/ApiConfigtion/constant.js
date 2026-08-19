import * as yup from "yup";

export const columns = [
  { name: "Mã API", row: "code", width: "140px" },
  { name: "Tên API", row: "name", width: "300px" },
  {
    name: "URL",
    row: "url",
    width: "700px",
  },
  { name: "Phương thức HTTP", row: "method", width: "100px" },
];

export const filters = [
  { name: "Mã API", code: "code" },
  { name: "Tên API", code: "name" },
];

export const templateSchema = yup.object({
  code: yup
    .string()
    .transform((value) => value.trim())
    .required("Mã API không được để trống")
    .max(20, "Mã API không được vượt quá 20 ký tự")
    .matches(
      /^[a-zA-Z0-9]+$/,
      "Mã API chỉ được chứa chữ cái, số, không chứa ký tự đặc biệt"
    ),

  name: yup
    .string()
    .transform((value) => value.trim())
    .required("Tên API không được để trống")
    .max(200, "Tên API không được vượt quá 200 ký tự")
    .matches(
      /^[\p{L}0-9]+(?:\s[\p{L}0-9]+)*$/u,
      "Tên API chỉ được chứa chữ cái, số và Tiếng Việt có dấu, không chứa ký tự đặc biệt"
    ),
  method: yup
    .string()
    .transform((value) => value.trim())
    .required("Phương thức HTTP không được để trống"),
  url: yup
    .string()
    // .trim()
    .required("URL không được để trống")
    .max(200, "URL không được vượt quá 200 ký tự")
    .matches(
      /(https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z]{2,}(\.[a-zA-Z]{2,})(\.[a-zA-Z]{2,})?\/[a-zA-Z0-9]{2,}|((https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z]{2,}(\.[a-zA-Z]{2,})(\.[a-zA-Z]{2,})?)|(https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z0-9]{2,}\.[a-zA-Z0-9]{2,}\.[a-zA-Z0-9]{2,}(\.[a-zA-Z0-9]{2,})?/g,
      "URL không hợp lệ"
    ),
  type: yup
    .string()
    .transform((value) => value.trim())
    .required("Loại không được để trống")
    .max(200, "Loại không được vượt quá 200 ký tự")
});

export const defaultValue = {
  code: "",
  name: "",
  url: "",
  type: "",
  method: "GET",
  description:""
};


 export const method = [
    { value: "GET", title: "GET" },
    { value: "POST", title: "POST" },
    { value: "PUT", title: "PUT" },
    { value: "DELETE", title: "DELETE" },
    { value: "PATCH", title: "PATCH" },
  ];
 export const type = [
    { value: "DANH_MUC", title: "Danh mục" },
    { value: "THU_THAP", title: "Thu thập" },
    { value: "KHAI_THAC", title: "Khai thác" },
  ];