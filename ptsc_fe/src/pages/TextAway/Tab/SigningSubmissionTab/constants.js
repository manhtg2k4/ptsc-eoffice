import { Delete, Download, Edit } from "@mui/icons-material";
import * as yup from "yup";
import { StyledViewIcon } from "./componentStyle/AddDialog.style";
import { AccessorDiv } from "@styles/OutGoing.styles";

export const columnsSigningSubmission = [
  { name: "Hạn xử lý", row: "deadlineReply", width: "120px" },
  { name: "Số, ký hiệu văn bản", row: "draftDocumentSymbol", width: "180px" },
  { name: "Trích yếu", row: "abstractNote", width: "250px" },
  { name: "Trạng thái", row: "documentStatus", width: "150px" },
  { name: "Độ khẩn", row: "urgencyLevel", width: "120px" },
  {
    name: "Số, ký hiệu văn bản đã ban hành",
    row: "reportDocumentSymbol",
    width: "200px",
  },
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
      if (
        row.createdBy &&
        Array.isArray(row.createdBy) &&
        row.createdBy.length > 0
      ) {
        return row.createdBy[0]?.name || "";
      }
      return "";
    },
  },
  { name: "Người soạn thảo", row: "drafter", width: "180px" },
  {
    name: "Đơn vị nhận ngoại ngành",
    row: "listRecipientsOutSystem",
    width: "200px",
  },
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
  // draftingUnit: yup.string().required("Vui lòng chọn đơn vị soạn thảo"),
  // drafter: yup.string().required("Vui lòng chọn người soạn thảo"),
  // documentType: yup.string().required("Vui lòng chọn loại văn bản"),
  // urgency: yup.string().required("Vui lòng chọn độ khẩn"),
  // // securityLevel: yup.string().required("Vui lòng chọn độ mật"),
  // documentField: yup.string().nullable(),
  // reportSigner: yup.string().required("Vui lòng chọn Người ký phát hành!"),
  // approver: yup.string().nullable(),
  // approverSymbol: yup.string().nullable(),
  // signer: yup.string().required("Vui lòng chọn người ký dự thảo"),
  // draftSymbol: yup.string().required("Vui lòng nhập ký hiệu văn bản dự thảo"),
  documentType: yup.string().required("Vui lòng chọn loại văn bản"),
  // notifyUnit: yup.array().of(yup.string()).nullable(),
  // replyDeadline: yup.string().nullable(),
  extract: yup.string().required("Vui lòng nhập trích yếu"),
  // draftFiles: yup.array().min(1, "Vui lòng đính kèm file Văn bản dự thảo").required("Vui lòng đính kèm file Văn bản dự thảo"),
  docDraft: yup.array()
    .min(1, "Vui lòng đính kèm file Văn bản dự thảo ")
    .required("Vui lòng đính kèm file Văn bản dự thảo "),
  bookDocumentId: yup.string().nullable(),
  toBook: yup.string().nullable(),
  documentDate: yup.string().nullable(),
});
export const editDigningSubmissionSchema = yup.object().shape({
  // draftingUnit: yup.string().required("Vui lòng chọn đơn vị soạn thảo"),
  // drafter: yup.string().required("Vui lòng chọn người soạn thảo"),
  documentType: yup.string().required("Vui lòng chọn loại văn bản"),
  // urgency: yup.string().required("Vui lòng chọn độ khẩn"),
  // // securityLevel: yup.string().required("Vui lòng chọn độ mật"),
  // documentField: yup.string().nullable(),
  // reportSigner: yup.string().required("Vui lòng chọn Người ký phát hành!"),
  // approver: yup.string().nullable(),
  // approverSymbol: yup.string().nullable(),
  // signer: yup.string().required("Vui lòng chọn người ký dự thảo"),
  // draftSymbol: yup.string().required("Vui lòng nhập ký hiệu văn bản dự thảo"),
  // notifyUnit: yup.array().of(yup.string()).nullable(),
  // replyDeadline: yup.string().nullable(),
  extract: yup.string().required("Vui lòng nhập trích yếu"),
  // draftFiles: yup.array().min(1, "Vui lòng đính kèm file Văn bản dự thảo").required("Vui lòng đính kèm file Văn bản dự thảo"),
  draftFiles: yup.array()
    .min(1, "Vui lòng đính kèm file Văn bản dự thảo")
    .required("Vui lòng đính kèm file Văn bản dự thảo"),
});
// Hàm tạo payload cho việc thêm/sửa
// export const createSigningSubmissionPayload = (
//   data,
//   repliedDocuments = [],
//   recalledDocuments = [],
//   replacedDocuments = [],
//   statusCode = "4",
//   jobProfiles = []
// ) => (
// 	{
//   senderUnit: data.draftingUnit,
//   drafter: data.drafter,
//   documentType: data.documentType,
//   urgencyLevel: data.urgency,
//   privateLevel: data.securityLevel,
//   documentField: data.documentField,
//   reportSigner: data.reportSigner,
//   reportDocumentSymbol: data.approverSymbol,
//   draftSigner: data.signer,
//   toBookTextSymbols: data.draftSymbol,
//   viewers: data.notifyUnit,
//   deadlineReply: data.replyDeadline,
//   abstractNote: data.extract,
//   internalReceivingUnit: data.internalDepartment,   //Ds dv nhận Nội nghành
//   externalReceivingUnit: data.externalDepartment, // Đơn vị nhận ngoại nghành
//   internalReceivingDept: data.internalReceivingDept, //  Đơn vị nhận nội bộ
// 	processor: data.processor, // DS người nhận xử lý
// 	knowReceivers: data.knowReceivers, // Ds người nhận để biết
// 	// internalUnit: data.internalUnit,
//   // Thêm văn bản phúc đáp vào payload
//   // Truyền toàn bộ đối tượng văn bản phúc đáp đã chọn
//   docAnswer: repliedDocuments, // Phúc đáp
//   docRecall: recalledDocuments, // Thu hồi
//   docReplacement: replacedDocuments, // Thay thế
//   statusCode: data.statusCode || statusCode, // Ưu tiên statusCode từ data, nếu không có thì mới dùng giá trị mặc định
// 	docWorkFiles: jobProfiles, // Thêm hồ sơ công việc
// });

export const createSigningSubmissionPayload = (
  data,
  repliedDocuments = [],
  recalledDocuments = [],
  replacedDocuments = [],
  statusCode = "4",
  jobProfiles = [],
  dataDetail,
  transformedUsersByStep = {},
  incomingCreate
) => {
  const normalizeReportSigner = (input) => {
    if (!input) return [];
    if (Array.isArray(input)) {
      return input
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object") return item.userId || item._id || item.id || item.value;
          return null;
        })
        .filter(Boolean);
    }
    if (typeof input === "string") return [input];
    if (typeof input === "object") return [(input.userId || input._id || input.id || input.value)].filter(Boolean);
    return [];
  };

  const reportSignerFromStep =
    transformedUsersByStep && Array.isArray(transformedUsersByStep.reportSigner)
      ? transformedUsersByStep.reportSigner
      : [];
  const reportSignerFromData = normalizeReportSigner(data.reportSigner);
  const reportSignerFromDetail = normalizeReportSigner(dataDetail?.reportSigner);
  const finalReportSigner =
    reportSignerFromStep.length > 0
      ? reportSignerFromStep
      : reportSignerFromData.length > 0
      ? reportSignerFromData
      : reportSignerFromDetail;

  const payload = {
    senderUnit: data.draftingUnit,
    drafter: data.drafter,
    documentType: data.documentType,
    urgencyLevel: data.urgency,
    privateLevel: data.securityLevel,
    documentField: data.documentField,
    reportSigner: finalReportSigner,
    reportDocumentSymbol: data.approverSymbol,
    draftSigner: data.signer,
    toBookTextSymbols: data.draftSymbol,
    viewers: data.notifyUnit,
    deadlineReply: data.replyDeadline,
    abstractNote: data.extract,

    internalReceivingUnit: data.internalDepartment, // Nội ngành
    externalReceivingUnit: data.externalDepartment, // Ngoại ngành
    internalReceivingDept: Array.isArray(data.internalReceivingDept)
      ? data.internalReceivingDept.map((p) => (typeof p === "object" ? getUnitId(p) : p))
      : data.internalReceivingDept
        ? [typeof data.internalReceivingDept === "object" ? getUnitId(data.internalReceivingDept) : data.internalReceivingDept]
        : [],
    internalReceivingDeptOld: Array.isArray(data.internalReceivingDeptOld)
      ? data.internalReceivingDeptOld.map((p) => (typeof p === "object" ? getUnitId(p) : p))
      : data.internalReceivingDeptOld
        ? [typeof data.internalReceivingDeptOld === "object" ? getUnitId(data.internalReceivingDeptOld) : data.internalReceivingDeptOld]
        : [],

    processor: Array.isArray(data.processor)
      ? data.processor.map((p) => (typeof p === "object" ? getUnitId(p) : p))
      : data.processor
        ? [typeof data.processor === "object" ? getUnitId(data.processor) : data.processor]
        : [],
    knowReceivers: Array.isArray(data.knowReceivers)
      ? data.knowReceivers.map((p) => (typeof p === "object" ? getUnitId(p) : p))
      : data.knowReceivers
        ? [typeof data.knowReceivers === "object" ? getUnitId(data.knowReceivers) : data.knowReceivers]
        : [],

    docAnswer: (() => {
      const base = dataDetail
        ? dataDetail.document
          ? [dataDetail.document]
          : [dataDetail]
        : [];

      // Lọc bỏ các đối tượng trống và tài liệu không có ID hợp lệ.
      const validBase = base.filter(
        (d) => d && (d.documentId || d._id || d.id)
      );

      // Lọc các tài liệu bổ sung: phải có ID hợp lệ và không trùng với base
      const additional = repliedDocuments.filter((d) => {
        // Bỏ qua nếu tài liệu trống hoặc không có ID hợp lệ
        if (!d || !(d.documentId || d._id || d.id)) return false;

        // Bỏ qua nếu đã có trong base
        return !validBase.some(
          (b) =>
            (b.documentId || b._id || b.id) === (d.documentId || d._id || d.id)
        );
      });

      return [...validBase, ...additional];
    })(),
    docRecall: recalledDocuments, // Thu hồi
    docReplacement: replacedDocuments, // Thay thế

    statusCode: String(data.statusCode || statusCode),
    docWorkFiles: jobProfiles,
    typeOfProcess: (data.typeOfProcess && typeof data.typeOfProcess === "object")
      ? (data.typeOfProcess.processKey || data.typeOfProcess.id || data.typeOfProcess._id)
      : (typeof data.typeOfProcess === "string" && data.typeOfProcess !== "-" ? data.typeOfProcess : null),
    fromCreateDraf: incomingCreate ? true : false,
    signatureType: data.signatureType || null,
    documentViewerGroups: Array.isArray(data.documentViewerGroups)
      ? data.documentViewerGroups.map((p) => (typeof p === "object" ? (p.id ?? p._id ?? p.value) : p)).filter(Boolean)
      : [],

    // Thêm các trường từ selectedUsersByStep (đã được transform thành arrays of IDs)
    // Loại bỏ reportSigner vì đã xử lý riêng ở trên
    ...Object.fromEntries(
      Object.entries(transformedUsersByStep).filter(
        ([key]) => key !== "reportSigner"
      )
    ),
    bookDocumentId: data.bookDocumentId || null,
    toBook: data.toBook || null,
    documentDate: data.documentDate || null,
    textSymbols: data.draftSymbol || data.textSymbols || null,
    toBookCode: data.toBookCode || null,
    releaseNo: (data.toBook) ? `${data.toBook}` : (data.releaseNo || null),
  };
  return payload;
};

export const moreActionsMap = {
  download: {
    id: "download",
    label: "Tải xuống",
    icon: <Download />,
  },
  edit: {
    id: "edit",
    label: "Chỉnh sửa",
    icon: <Edit />,
  },
  view: {
    id: "view",
    label: "Xem chi tiết",
    icon: <StyledViewIcon />,
  },
  delete: {
    id: "delete",
    label: "Xóa",
    icon: <Delete />,
    color: "error",
  },
};

export const pickMoreActions = (keys) =>
  keys.map((key) => moreActionsMap[key]).filter(Boolean);

export const getUnitId = (unit) => unit?._id ?? unit?.id;

// Mapping từ documentStatus sang step index
export const getStepFromStatus = (status) => {
  const statusToStepMap = {
    draft: 0, // Dự thảo
    "checking-format": 1, // Kiểm tra thể thức
    "content-review": 2, // Ký đảm bảo nội dung
    "format-review": 3, // Ký đảm bảo thể thức
    "release-sign": 4, // Ký phát hành
    released: 5, // Phát hành
  };
  return statusToStepMap[status] ?? 0; // Mặc định trả về 0 nếu không tìm thấy
};

export const getJobProfileColumns = (onRowClick) => [
  {
    name: "Tên công việc",
    row: "name",
    width: "150px",
    accessor: (row) => (
      <AccessorDiv onClick={onRowClick(row)}>{row.name}</AccessorDiv>
    ),
  },
  {
    name: "Loại hồ sơ",
    row: "typeTaskText",
    width: "120px",
    accessor: (row) => (
      <AccessorDiv onClick={onRowClick(row)}>{row.typeTaskText}</AccessorDiv>
    ),
  },
  {
    name: "Nội dung công việc",
    row: "note",
    width: "200px",
    accessor: (row) => (
      <AccessorDiv onClick={onRowClick(row)}>{row.note}</AccessorDiv>
    ),
  },
];

export const SIGN_TYPE_OPTIONS = [
	{ label: "Ký số", value: "digitalSignature" },
	{ label: "Ký mạng QS", value: "qsNetworkSignature" },
	{ label: "Ký tay", value: "physicalSignature" },
];

