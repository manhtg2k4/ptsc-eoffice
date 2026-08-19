import * as yup from "yup";

// export const FILE_TYPES = [
//   { value: "invoice", label: "Hóa đơn" },
//   { value: "contract", label: "Hợp đồng" },
//   { value: "report", label: "Báo cáo" },
//   { value: "agreement", label: "Thỏa thuận" },
//   { value: "form", label: "Mẫu đơn" },
//   { value: "certificate", label: "Chứng chỉ" },
//   { value: "template", label: "Mẫu khác" },
// ];

export const UPLOAD_CONSTRAINTS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_EXTENSIONS: [
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
    "txt",
    "rtf",
  ],
};

export const createFileUploadSchema = yup.object().shape({
  file: yup.mixed().required("Vui lòng chọn file"),
  // eslint-disable-next-line camelcase
  example_key: yup
    .string()
    .required("Vui lòng nhập key file mẫu")
    // .matches(
    //   /^[a-z0-9_]+$/,
    //   "Chỉ dùng chữ cái thường, số và dấu gạch dưới"
    // )
    .min(3, "Tối thiểu 3 ký tự")
    .max(100, "Tối đa 100 ký tự"),
  // eslint-disable-next-line camelcase
  example_type: yup.string().required("Vui lòng chọn loại file"),
  description: yup.string().max(500, "Mô tả tối đa 500 ký tự"),
});

export const updateFileSchema = yup.object().shape({
  // eslint-disable-next-line camelcase
  example_type: yup.string(),
  description: yup.string().max(500, "Mô tả tối đa 500 ký tự"),
});
