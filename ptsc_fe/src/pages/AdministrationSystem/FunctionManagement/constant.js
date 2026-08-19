import * as yup from "yup";

export const columns = [
  { name: "Mã chức năng", row: "code", width: "100px" },
  { name: "Tên chức năng", row: "name", width: "300px" },
  {
    name: "URL",
    row: "url",
    width: "400px",
  },
  { name: "Mô tả", row: "description", width: "400px" },
];

export const filters = [
  { name: "Mã chức năng", code: "code" },
  { name: "Tên chức năng", code: "name" },
];

export const templateSchema = yup.object({
  code: yup
    .string()
    .transform((value) => value.trim())
    .required("Mã chức năng không được để trống")
    .max(20, "Mã chức năng không được vượt quá 20 ký tự")
    .trim()
    // .matches(
    //   // /^[a-zA-Z0-9àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]+$/,
    //   /^[a-zA-Z0-9 ]+$/,
    //   "Mã chức năng chỉ được chứa chữ cái, số, không chứa ký tự đặc biệt"
    // ),
    .matches(
      /^[a-zA-Z0-9àáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬĐÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ ]+$/,
      "Mã chức năng chỉ được chứa chữ cái (kể cả có dấu), số và khoảng trắng, không chứa ký tự đặc biệt"
    )
  ,
  name: yup
    .string()
    .transform((value) => value.trim())
    .required("Tên chức năng không được để trống")
    .max(200, "Tên chức năng không được vượt quá 200 ký tự")
    .matches(
      /^[a-zA-Z0-9À-ỹ\s]+$/,
      "Tên chức năng chỉ được chứa chữ cái, số và Tiếng Việt có dấu, không chứa ký tự đặc biệt"
    ),
  // type: yup
  //   .string()
  //   .transform((value) => value.trim())
  //   .required("Loại không được để trống")
  //   .max(100, "Loại không được vượt quá 100 ký tự"),
  statusFeature: yup
    .string()
    .required("Vui lòng chọn trạng thái"),

  featureType: yup
    .string()
    .required("Vui lòng chọn loại chức năng"),

  order: yup
    .number()
    .nullable()
    .optional()
    .typeError("Giá trị phải là một số hợp lệ")
    .transform((value, originalValue) => {
      return originalValue === "" ? undefined : value;
    })
  ,
  url: yup
    .string()
    .transform((value) => value.trim())
    .when('featureType', {
      is: 'custom',
      then: (schema) => schema.required("URL không được để trống"),
      otherwise: (schema) => schema.notRequired()
    }),
  // .required("Tên URL không được để trống")
  // .nullable()
  // .optional()
  // .test("is-valid-url", "URL không hợp lệ", (value) => {
  //   return !value || /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:[0-9]{1,5})?(\/.*)?$/.test(value);
  // }),

  apiUrl: yup
    .string()
    .transform((value) => value?.trim())
    .when('featureType', {
      is: 'automatic',
      then: (schema) => schema.required("URL API không được để trống"),
      otherwise: (schema) => schema.notRequired()
    }),
});

export const defaultValue = {
  code: "",
  name: "",
  url: "",
  icon: "",
  type: "",
  statusFeature: "1",
  description: "",
  target: "",
  featureType: "",
  parentId: "",
  order: 0,
};
