import * as yup from "yup";
import dayjs from "dayjs";

// Cấu hình cột mặc định, tương tự cấu trúc trong viewConfig
const initialColumnConfig = [
  { name: "deadline", title: "Hạn xử lý", width: "120px", checked: true },
  { name: "documentNumber", title: "Số, ký hiệu văn bản", width: "180px", checked: true },
  { name: "extract", title: "Trích yếu", width: "250px", checked: true },
  { name: "status", title: "Trạng thái", width: "150px", checked: true },
  { name: "urgency", title: "Độ khẩn", width: "120px", checked: true },
  { name: "level", title: "Cấp độ", width: "100px", checked: true },
  // Bạn có thể thêm các cột khác với checked: false ở đây nếu cần
];
export const columns = [
  {
    title: "Tên hồ sơ",
    render: (row) => row.name || "–",
  },
  {
    title: "Hạn được giao",
    render: (row) =>
      row.userDeadline ? dayjs(row.userDeadline).format("DD/MM/YYYY") : "–",
  },
  {
    title: "Số văn bản",
    render: (row) => row.toBook || "–",
  },
  {
    title: "Ngày VB",
    render: (row) => row.documentDate || "–",
  },
  {
    title: "Trích yếu",
    render: (row) => row.abstractNote || "–",
  },
  {
    title: "Người xử lý",
    render: (row) => {
      if (Array.isArray(row.processors) && row.processors.length > 0) {
        return row.processors.map((p) => p.name).join(", ");
      }
      if (typeof row.processors === "string" && row.processors) return row.processors;
      return "–";
    },
  },
  {
    title: "Sổ VB đến",
    render: (row) => row.bookDocumentId?.[0]?.name || "–",
  },
  {
    title: "Ngày vào sổ",
    render: (row) =>
      row.toBookDate ? dayjs(row.toBookDate).format("DD/MM/YYYY") : "–",
  },
  {
    title: "Trạng thái",
    render: (row) => row.kanbanStatus || "–",
  },
  {
    title: "Độ khẩn",
    render: (row) => row.urgencyLevel || "–",
  },
  {
    title: "Số đến",
    render: (row) => row.toBookCode || "–",
  },
  {
    title: "Đơn vị gửi",
    render: (row) => row.senderUnit || "–",
  },
  {
    title: "File đính kèm",
    render: (row) =>
      Array.isArray(row.files)
        ? row.files.map((f) => f.name).join(", ")
        : "–",
  },
  {
    title: "Số phụ",
    render: (row) => row.secondBook || "–",
  },
  {
    title: "Đơn vị nhận",
    render: (row) => row.receiverUnit || "–",
  },
  {
    title: "Loại văn bản",
    render: (row) => row.documentType || "–",
  },
  {
    title: "Ngày nhận văn bản",
    render: (row) =>
      row.receiveDate ? dayjs(row.receiveDate).format("DD/MM/YYYY HH:mm") : "–",
  },
  {
    title: "Lĩnh vực",
    render: (row) => row.documentField || "–",
  },
  {
    title: "Phương thức nhận",
    render: (row) => row.receiveMethod || "–",
  },
  {
    title: "Độ mật",
    render: (row) => row.privateLevel || "–",
  },
];

// Tự động tạo defaultColumns từ cấu hình trên
// Chỉ những cột có checked: true mới được hiển thị
export const defaultColumns = initialColumnConfig
  .filter(col => col.checked === true)
  .map(col => ({
    name: col.title, // Tên cột hiển thị
    row: col.name,   // Key để lấy dữ liệu
    width: col.width,
  }));

export const filtersSigningSubmission = [
  { name: "Số, ký hiệu văn bản", code: "documentNumber" },
  { name: "Trích yếu", code: "extract" },
  { name: "Độ khẩn", code: "urgency" },
];

// Schema validation nếu cần
export const signingSubmissionSchema = yup.object().shape({
  documentNumber: yup.string().required("Vui lòng nhập số, ký hiệu văn bản"),
  extract: yup.string().required("Vui lòng nhập trích yếu"),
  urgency: yup.string().required("Vui lòng chọn độ khẩn"),
});