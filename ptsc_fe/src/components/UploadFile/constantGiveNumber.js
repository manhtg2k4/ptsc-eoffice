// import dayjs from "dayjs";
import * as yup from "yup";

export const defaultFormValues = {
  bookDocumentId: "", //Số vb đi
  bookDocumentNumber: "", //Ký hiệu vb đi
  docIds: [], //Danh sách id văn bản
  toBookCode: "",
  releaseDate: "",
  releaseNo: "",
  textSymbols: "", //Ký hiệu văn bản
  toBook: "",
  auto: {
    docNumber: false,
    day: false,
    month: false,
    year: false,
    tuDongNhap: true, // mở popup là tick sẵn
  },
  texts: {
    docNumber: { type: "Công văn giấy", x: "", y: "", fontSize: "" },
    day: { type: "Công văn giấy", x: "", y: "", fontSize: "" },
    month: { type: "Công văn giấy", x: "", y: "", fontSize: "" },
    year: { type: "Công văn giấy", x: "", y: "", fontSize: "" },
  },
};

export const defaultFormValuesOTP = {
  otp: "",
};

export const otpSchema = yup.object({
  otp: yup
    .string()
    .transform((value) => value?.trim() || "")
    .required("Mã không được để trống!")
    .min(6, "Mã phải có ít nhất 6 ký tự")
    .max(16, "Mã không được quá 16 ký tự"),
});
export const giveNumberSchema = yup.object({
  bookDocumentId: yup
    .string()
    .transform((value) => value.trim())
    .required("Trường này là trường bắt buộc!"),
  toBook: yup
    .string()
    .transform((value) => value.trim())
    .required("Trường này là trường bắt buộc!")
    .max(100, "Số văn bản không được vượt quá 100 ký tự")
    // .matches(
    //   /^[\p{L}0-9\s,._-]+$/u,
    //   "Số văn bản chỉ được chứa chữ cái, số và tiếng Việt có dấu"
    // ),
    .matches(/^[A-Za-z0-9]+$/, "Số văn bản chỉ được chứa chữ cái, số."),
  textSymbols: yup
    .string()
    .transform((value) => value.trim())
    .required("Trường này là trường bắt buộc!")
    .min(2, "Ký hiệu vb phải có ít nhất 2 ký tự")
    .max(100, "Ký hiệu văn bản không được vượt quá 100 ký tự"),
  // .matches(
  //   /^[\p{L}0-9\s,._-]+$/u,
  //   "Ký hiệu vb chỉ được chứa chữ cái, số và tiếng Việt có dấu"
  // ),
});

export const isDocumentFile = (file) => {
  const docExtensions = ["pdf", "doc", "docx", "txt", "xls", "xlsx"];
  const docMimetypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];
  // Kiểm tra đuôi file
  const fileExt = (file.fileName || file.file_name)
    .split(".")
    .pop()
    .toLowerCase();
  const extMatch = docExtensions.includes(fileExt);

  // Kiểm tra mimetype
  const mimeMatch = docMimetypes.includes(file.mimetype || file.mime_type);

  // Trả về true nếu 1 trong 2 match
  return extMatch || mimeMatch;
};

export const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    if (!blob) return resolve("");
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result); // base64 string
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

export const blobFileToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    if (!blob) return resolve("");

    const reader = new FileReader();

    reader.onloadend = () => {
      const base64 = reader.result.split(",")[1]; // lấy base64
      resolve(base64);
    };

    reader.onerror = reject;

    reader.readAsDataURL(blob);
  });