const configTable = {
  detailBusiness: [
    {
      label: "Mã",
      key: "code",
      align: "left",
    },
    {
      label: "Tên",
      key: "name",
      align: "left",
    },
  ],
  detailCitizen: [
    {
      label: "Họ và tên",
      key: "fullName",
      align: "left",
    },
    {
      label: "Ngày sinh",
      key: "birthDate",
      align: "left",
    },
    {
      label: "Mối quan hệ",
      key: "relationship",
      align: "left",
    },
    {
      label: "Địa chỉ",
      key: "address",
      align: "left",
    },
  ],
  tableProviderManagement: [
    {
      label: "Thời gian",
    },
    {
      label: "Hệ thống",
    },
    {
      label: "Nội dung",
    },
  ],

  tableMiningHistory: [
    {
      label: "STT",
      key: "stt",
    },
    {
      label: "Mã hồ sơ",
      key: "mhs",
    },
    {
      label: "Tiêu đề hồ sơ",
      key: "tdhs",
    },
    {
      label: "Thời gian khai thác",
      key: "tgkt",
    },
    {
      label: "Số lượt khai thác",
      key: "slkt",
    },
  ],
  IntegratedSystemManagement: [
    {
      label: "Tên API",
      key: "name",
      width: "340px",
    },
    {
      label: "URL",
      key: "url",
    },
    {
      label: "Phương thức",
      key: "method",
    },
  ],

  recordTransferRequestForm: [
    {
      label: "Số và ký hiệu hồ sơ",
      key: "code",
      width: "340px",
    },
    {
      label: "Tiêu đề hồ sơ",
      key: "name",
    },
  ],
  miningUnit: [
    {
      label: "Tên API",
      key: "name",
      width: "340px",
    },
    {
      label: "URL",
      key: "url",
    },
    {
      label: "Phương thức",
      key: "method",
    },
  ],
  docmanagement: [
    {
      label: "Số tài liệu",
      key: "Documentnumber",
      width: "340px",
    },
    {
      label: "Ngày tháng năm văn bản",
      key: "Dateofdocument",
    },
    {
      label: "Trích yếu",
      key: "Abstract",
    },
    {
      label: "TT",
      key: "tt",
    },
  ],
  SearchCancelAdminResult: [
    {
      label: "Mã KQGQ TTHC",
      key: "documentNumber",
      width: "150px",
    },
    {
      label: "Mã hồ sơ",
      key: "code",
      width: "120px",
    },
       {
      label: "Tiêu đề hồ sơ",
      key: "name",
      width: "300px",
    },
  ],
  listProfiles: [
    {
      label: "Mã hồ sơ",
      key: "code",
      align: "left",
    },
    {
      label: "Tiêu đề hồ sơ",
      key: "name",
      align: "left",
    },
  ],
  listFileInBoxIsNull: [
    {
      label: "Mã",
      key: "code",
      align: "center",
    },
    {
      label: "Tên",
      key: "name",
      align: "center",
    },
  ],
  user: [
    { label: "Họ tên", key: "name", align: "left", width: 200 },
    { label: "Email", key: "email", align: "left", width: 250 },
    { label: "Quyền", key: "role", align: "center", width: 120 },
  ],
};
export default configTable;
