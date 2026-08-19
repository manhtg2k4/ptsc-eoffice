import * as yup from "yup";

export const columnsSigningSubmission = [
  { name: "Hạn xử lý", row: "deadlineReply", width: "120px" },
  { name: "Số, ký hiệu văn bản", row: "draftDocumentSymbol", width: "180px" },
  { name: "Trích yếu", row: "abstractNote", width: "250px" },
  { name: "Trạng thái", row: "documentStatus", width: "150px" },
  { name: "Độ khẩn", row: "urgencyLevel", width: "120px" },
  { name: "Số, ký hiệu văn bản đã ban hành", row: "reportDocumentSymbol", width: "200px" },
  { name: "Đơn vị soạn thảo", row: "docSenderUnit", width: "200px" },
  { name: "Loại văn bản", row: "documentType", width: "150px" },
  { name: "Người ký dự thảo", row: "signer", width: "180px" },
  { name: "Ngày tạo", row: "createdAt", width: "120px" },
  { name: "Số văn bản đi", row: "toBookTextSymbols", width: "150px" },
  { name: "Lĩnh vực", row: "documentField", width: "180px" },
  { name: "Độ mật", row: "privateLevel", width: "120px" },
  { name: "Nơi nhận để biết", row: "internalReceivingUnit", width: "200px" },
  { name: "Phúc đáp văn bản", row: "incommingDocument", width: "180px" },
  { name: "Công việc liên quan", row: "tasks", width: "180px" },
  { name: "Tự động ban hành", row: "autoReleaseCheck", width: "150px" },
  { name: "Ký CA", row: "caSignCheck", width: "100px" },
  { name: "Trạng thái xử lý", row: "completeStatus", width: "150px" },
  { 
    name: "Người tạo", 
    row: "createdBy", 
    width: "180px",
    accessor: (row) => {
      if (row.createdBy && Array.isArray(row.createdBy) && row.createdBy.length > 0) {
        return row.createdBy[0]?.name || "";
      }
      return "";
    }
  },
  { name: "Người soạn thảo", row: "drafter", width: "180px" },
  { name: "Đơn vị nhận ngoại ngành", row: "listRecipientsOutSystem", width: "200px" },
  { name: "Hạn trả lời", row: "deadlineReply", width: "120px" },
];

export const filtersSigningSubmission = [
  { name: "Số, ký hiệu văn bản", code: "draftDocumentSymbol" },
  { name: "Trích yếu", code: "abstractNote" },
  { name: "Độ khẩn", code: "urgencyLevel" },
  { name: "Loại văn bản", code: "documentType" },
  { name: "Trạng thái", code: "documentStatus" },
  { name: "Người soạn thảo", code: "drafter" },
  { name: "Độ mật", code: "privateLevel" },
];

// Schema validation
export const signingSubmissionSchema = yup.object().shape({
  draftDocumentSymbol: yup.string().required("Vui lòng nhập số, ký hiệu văn bản"),
  abstractNote: yup.string().required("Vui lòng nhập trích yếu"),
  urgencyLevel: yup.string().required("Vui lòng chọn độ khẩn"),
  documentType: yup.string().required("Vui lòng chọn loại văn bản"),
  signer: yup.string().required("Vui lòng chọn người ký"),
  documentField: yup.string().required("Vui lòng chọn lĩnh vực"),
});