import * as yup from "yup";
import dayjs from "dayjs";

// Cấu hình cột mặc định, tương tự cấu trúc trong viewConfig
const initialColumnConfig = [
  { name: "deadline", title: "Hạn xử lý", width: "120px", checked: true },
  {
    name: "documentNumber",
    title: "Số, ký hiệu văn bản",
    width: "180px",
    checked: true,
  },
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
      if (typeof row.processors === "string" && row.processors)
        return row.processors;
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
      Array.isArray(row.files) ? row.files.map((f) => f.name).join(", ") : "–",
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
  .filter((col) => col.checked === true)
  .map((col) => ({
    name: col.title, // Tên cột hiển thị
    row: col.name, // Key để lấy dữ liệu
    width: col.width,
  }));

export const filtersSigningSubmission = [
  { name: "Trích yếu", code: "abstractNote" },
  { name: "Người xử lý", code: "signer" },
  { name: "Số đến", code: "toBook" },
  { name: "Đơn vị xử lý", code: "receiverUnit" },
];
// Schema validation cho form thêm mới/chỉnh sửa văn bản đến
const noSpecialCharsRegex =
  /^[a-zA-Z0-9\sàáâãèéêìíòóôõùúăđĩũơưăạảấầẩẫậắằẳẵặẹẻẽềềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳýỵỷỹÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲÝỴỶỸ.,\-/]*$/;

export const incomingDocumentSchema = yup.object().shape({
  bookDocumentId: yup.string().required("Vui lòng chọn sổ văn bản đến."),
  toBook: yup
    .string()
    .required("Vui lòng nhập số văn bản."),
    // .matches(noSpecialCharsRegex, "Số văn bản không được chứa ký tự đặc biệt."),
  documentDate: yup
    .mixed()
    .nullable()
    .required("Vui lòng chọn ngày trên văn bản.")
    .test(
      "is-not-after-receive-date",
      "Ngày trên văn bản không được lớn hơn ngày đến.",
      function (value) {
        const { receiveDate } = this.parent;
        if (!value || !receiveDate) {
          return true;
        }
        return !dayjs(value).isAfter(dayjs(receiveDate), "day");
      }
    ),

  senderUnit: yup.string().required("Vui lòng chọn đơn vị gửi."),
  receiveDate: yup
    .mixed() // Dùng mixed vì giá trị có thể là null, string, hoặc dayjs object
    .nullable()
    .required("Vui lòng chọn ngày đến."),
  toBookDate: yup
    .mixed()
    .required("Vui lòng chọn ngày vào sổ.")
    .nullable()
    .test(
      "is-greater-than-document-date",
      "Ngày vào sổ không được nhỏ hơn ngày văn bản và ngày nhận văn bản",
      function (value) {
        const { documentDate } = this.parent;
        if (!value || !documentDate) return true;
        return dayjs(value).isAfter(dayjs(documentDate).subtract(1, "day"));
      }
    )
    .test(
      "is-greater-than-receive-date",
      "Ngày vào sổ không được nhỏ hơn ngày nhận văn bản.",
      function (value) {
        const { receiveDate } = this.parent;
        if (!value || !receiveDate) return true;
        return dayjs(value).isAfter(dayjs(receiveDate).subtract(1, "day"));
      }
    ),
  deadline: yup
    .mixed()
    .nullable()
    .test(
      "is-not-past-date",
      "Hạn trả lời không được là ngày trong quá khứ.",
      function (value) {
        if (!value) return true; // Bỏ qua nếu không có giá trị
        // isSameOrAfter không có trong dayjs, dùng isAfter hoặc isSame
        return dayjs(value).isAfter(dayjs().subtract(1, "day"));
      }
    ),
  abstractNote: yup.string().required("Vui lòng nhập trích yếu."),
  secondBook: yup
    .string()
    .nullable()
    .matches(noSpecialCharsRegex, "Số phụ không được chứa ký tự đặc biệt."),
  signer: yup
    .string()
    .nullable()
    .matches(noSpecialCharsRegex, "Người ký không được chứa ký tự đặc biệt."),
  viewGroup: yup.mixed().required("Vui lòng chọn nhóm xem văn bản."),
  toBookCode: yup
    .string()
    .required("Vui lòng nhập số đến.")
    .matches(noSpecialCharsRegex, "Số đến không được chứa ký tự đặc biệt."),
});
