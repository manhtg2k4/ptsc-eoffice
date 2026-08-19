import * as yup from "yup";
const rowSchema = yup.object({
    label: yup
    .string()
    .trim()
    .required("Tên không được để trống")
    // .matches(/^[a-zA-Z0-9\s\u00C0-\u1EF9]*$/, "Tên chứa ký tự không hợp lệ")
    .min(2, "Tên phải có ít nhất 2 ký tự")
    .max(156, "Tên không được vượt 156 ký tự"),

  name: yup
    .string()
    .when("type", ([type], schema) => {
      switch (type) {
        case "number":
          return (
            schema
              .required("Mã không được để trống")
              // .matches(/^[0-9]+$/, "Nhập Mã là số")
              .min(2, "Mã phải có ít nhất 2 ký tự")
              .max(50, "Mã không được vượt 50 ký tự")
          );
        default:
          return schema
            .strict(true)
            .trim()
            .required("Mã không được để trống")
            .matches(
              /^[a-zA-Z0-9_$]+$/,
              "Mã chỉ gồm chữ không dấu, số, gạch dưới (_) và viết liền"
            )
            .min(2, "Mã phải có ít nhất 2 ký tự")
            .max(50, "Mã không được vượt 50 ký tự");
      }
    }),
  

  type: yup.string().required("Kiểu nhập bắt buộc"),
  ref: yup.string(),

  format: yup.string().when("type", {
    is: (type) => ["date", "dynamic"].includes(type),
    then: (schema) => schema.optional(),
    otherwise: (schema) => schema.notRequired(),
  }),

  required: yup.boolean(),
  searchable: yup.boolean(),
  advancedSearch: yup.boolean(),
  timeDeafultValue: yup.boolean(),
  isSingleDateSearch: yup.boolean(),
  defaultTimePreset: yup.string().when(["type", "timeDeafultValue"], {
    is: (type, timeDeafultValue) => type === "date" && !!timeDeafultValue,
    then: (schema) => schema.required("Vui lòng chọn mốc thời gian mặc định"),
    otherwise: (schema) => schema.notRequired(),
  }),
  advancedSearchOrder: yup.number()
    .transform((value, originalValue) => {
      if (originalValue === "" || originalValue === null || originalValue === undefined) {
        return undefined;
      }
      return value;
    })
    .nullable()
    .notRequired(),
  apiSource: yup.string().nullable().notRequired(),
	// apiSource: yup.string().when("type", {
  //   is: "autocomplete",
  //   then: (schema) => schema.required("Nguồn API không được để trống"),
  //   otherwise: (schema) => schema.notRequired(),
  // }),
  minLength: yup.number().when("type", {
    is: "text",
    then: (schema) =>
      schema
        .transform((value, originalValue) => {
          // Nếu là chuỗi rỗng hoặc undefined, return undefined thay vì NaN
          if (
            originalValue === "" ||
            originalValue === null ||
            originalValue === undefined
          ) {
            return undefined;
          }
          return value;
        })
        .nullable()
        .positive("Ký tự tối thiểu phải lớn hơn 0"),
    otherwise: (schema) =>
      schema
        .transform((value, originalValue) => {
          if (
            originalValue === "" ||
            originalValue === null ||
            originalValue === undefined
          ) {
            return undefined;
          }
          return value;
        })
        .nullable()
        .notRequired(),
  }),

  maxLength: yup.number().when("type", {
    is: "text",
    then: (schema) =>
      schema
        .transform((value, originalValue) => {
          if (
            originalValue === "" ||
            originalValue === null ||
            originalValue === undefined
          ) {
            return undefined;
          }
          return value;
        })
        .nullable()
        .positive("Ký tự tối đa phải lớn hơn 0")
        .when("minLength", ([minLength], schema) => {
          return minLength
            ? schema.min(minLength, "Ký tự tối đa phải lớn hơn ký tự tối thiểu")
            : schema;
        }),
    otherwise: (schema) =>
      schema
        .transform((value, originalValue) => {
          if (
            originalValue === "" ||
            originalValue === null ||
            originalValue === undefined
          ) {
            return undefined;
          }
          return value;
        })
        .nullable()
        .notRequired(),
  }),

  valueInput: yup.array().when("type", {
    is: (type) => ["enum", "multiSelect"].includes(type),
    then: (schema) =>
      schema
        .of(
          yup.object().shape({
            value: yup
              .string()
              .required("Giá trị không được để trống")
              .max(50, "Giá trị không được vượt quá 50 ký tự"),
              // .matches(
              //   /^[a-zA-Z0-9_]+$/,
              //   "Giá trị chỉ gồm chữ không dấu, số và gạch dưới"
              // ),
            label: yup
              .string()
              // .required("Tên hiển thị không được để trống")
              .max(156, "Tên hiển thị không được vượt quá 156 ký tự"),
          })
        )
        .test(
          "unique-values",
          "Có giá trị bị trùng lặp",
          function (valueInput) {
            if (!valueInput) return true;
            const values = valueInput.map((item) => item.value).filter(Boolean);
            return values.length === new Set(values).size;
          }
        ),
    otherwise: (schema) => schema.notRequired(),
  }),
});

export const validationSchema = yup.object({
  rows: yup.array().of(rowSchema).min(1, "Phải có ít nhất 1 hàng"),
});
