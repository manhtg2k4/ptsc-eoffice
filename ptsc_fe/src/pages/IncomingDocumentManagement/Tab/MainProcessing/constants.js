// constants.js
import * as yup from "yup";

export const defaultColumns = [
  { name: "Hạn xử lý", row: "deadline", width: "120px" },
  { name: "Số, ký hiệu văn bản", row: "documentNumber", width: "180px" }, 
  { name: "Trích yếu", row: "extract", width: "300px" }, 
  { name: "Trạng thái", row: "status", width: "140px" }, 
  { name: "Độ khẩn", row: "urgencyLevel", width: "120px" }, 
  { name: "Độ mật", row: "privateLevel", width: "120px" },
  { name: "Ngày tạo", row: "createdAt", width: "160px" }, 
  { name: "Ngày cập nhật", row: "updatedAt", width: "160px" }, 
  { name: "Sổ văn bản", row: "bookDocumentId", width: "160px" }, 
  { name: "Số đến", row: "toBook", width: "120px" }, 
  { name: "Đơn vị gửi", row: "senderUnit", width: "160px" }, 
  { name: "Đơn vị nhận", row: "receiverUnit", width: "160px" }, 
  { name: "Ngày ban hành", row: "documentDate", width: "160px" },
  { name: "Ngày nhận", row: "receiveDate", width: "160px" }, 
  { name: "Ngày vào sổ", row: "toBookDate", width: "160px" }, 
  { name: "Sổ phụ", row: "secondBook", width: "140px" },
  { name: "Hình thức nhận", row: "receiveMethod", width: "140px" }, 
  { name: "Loại văn bản", row: "documentType", width: "140px" },
  { name: "Lĩnh vực", row: "documentField", width: "200px" }, 
  { name: "Người ký", row: "signer", width: "150px" },
];

export const filtersSigningSubmission = [
  { name: "Trích yếu", code: "abstractNote" },
  { name: "Người xử lý", code: "signer" },
  { name: "Số đến", code: "toBook" },
  { name: "Đơn vị xử lý", code: "receiverUnit" },
];

export const signingSubmissionSchema = yup.object().shape({
  documentNumber: yup.string().required("Vui lòng nhập số, ký hiệu văn bản"),
  extract: yup.string().required("Vui lòng nhập trích yếu"),
  urgencyLevel: yup.string().required("Vui lòng chọn độ khẩn"),
  status: yup.string().nullable(),
});