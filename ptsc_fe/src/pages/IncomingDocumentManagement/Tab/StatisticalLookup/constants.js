import * as yup from "yup";

export const columnsSigningSubmission = [
  { name: "Hạn xử lý", row: "deadline", width: "120px" },
  { name: "Số, ký hiệu văn bản", row: "documentNumber", width: "180px" },
  { name: "Trích yếu", row: "extract", width: "250px" },
  { name: "Trạng thái", row: "status", width: "150px" },
  { name: "Độ khẩn", row: "urgency", width: "120px" },
  { name: "Cấp độ", row: "level", width: "100px" },
];

export const filtersSigningSubmission = [
  { name: "Trích yếu", code: "abstractNote" },
  { name: "Người xử lý", code: "signer" },
  { name: "Số đến", code: "toBook" },
  { name: "Đơn vị xử lý", code: "receiverUnit" },
];

// Schema validation nếu cần
export const signingSubmissionSchema = yup.object().shape({
  documentNumber: yup.string().required("Vui lòng nhập số, ký hiệu văn bản"),
  extract: yup.string().required("Vui lòng nhập trích yếu"),
  urgency: yup.string().required("Vui lòng chọn độ khẩn"),
});