import * as yup from "yup";
// import React from "react";
// import { IconButton, Tooltip } from "@mui/material";
// import { RemoveRedEyeOutlined } from "@mui/icons-material";

export const defaultFormValuesDistrict = {
  name: "",
  codeND: "",
  emailUser: "",
  username: "",
  password: "",
  phoneNumberUser: "",
  repassword: "",
  parent: "",
};

export const TABS = [
	{ key: "thongTionNhomNguoiDung", label: "Thông tin nhóm người dùng" },
	{ key: "vaiTro", label: "Vai trò" },
	{ key: "danhSachNguoiDung", label: "Danh sách người dùng" },
	// { key: "chiTietPhanQuyen", label: "Chi tiết phân quyền" },
	{ key: "phanQuyenTheoHanhDong", label: "Phân quyền theo hành động"},
];

export const columns = [
  { name: "Mã đơn vị", row: "code", width: "150px" },
  { name: "Tên đơn vị", row: "name", width: "250px" },
  { name: "Loại đơn vị", row: "unitType", width: "200px" },
  { name: "Đơn vị cha", row: "parentName", width: "250px" },
  { name: "Mô tả", row: "description", width: "300px" },
];

export const filters = [
  { name: "Mã đơn vị", code: "code" },
  { name: "Tên đơn vị", code: "name" },
];

export const columnsUser = [
  { name: "Tên đăng nhập", row: "username", width: "150px" },
  { name: "Họ và tên", row: "name", width: "200px" },
  { name: "Mã cán bộ", row: "codeND", width: "120px" },
  { name: "Ngày sinh", row: "birthday", width: "120px" },
  { name: "Giới tính", row: "gender", width: "100px" },
  { name: "Đơn vị cha", row: "grandParentName", width: "200px" },
  { name: "Đơn vị", row: "parentName", width: "200px" },
  { name: "Chức vụ", row: "position", width: "200px" },
  { name: "Nhóm người dùng", row: "userGroup", width: "200px" },
  { name: "Trạng thái", row: "status", width: "120px" },
];
const permissionLabels = {
  add: "Thêm mới",
  edit: "Chỉnh sửa",
  view: "Xem",
  delete: "Xoá",
};

export const filtersUser = [
  { name: "Tên đăng nhập", code: "username" },
  { name: "Họ và tên", code: "name" },
];

export const columnsRoleView = [
  { name: "Mã vai trò", row: "code", width: "150px" },
  { name: "Tên vai trò", row: "name", width: "300px" },
  {
    name: "Tên chức năng",
    row: "functionNameDisplay",
    width: "300px",
    accessor: (row) =>
      Array.isArray(row.roles)
        ? row.roles
            .map((r) => r.functionName?.name)
            .filter(Boolean)
            .join(", ")
        : "",
  },
  {
    name: "Quyền",
    row: "permissionsDisplay",
    width: "300px",
    accessor: (row) =>
      Array.isArray(row.roles) &&
      row.roles.length > 0 &&
      Array.isArray(row.roles[0].permissions)
        ? row.roles[0].permissions
            .map((p) => permissionLabels[p] || p)
            .join(", ")
        : "",
  },
];

export const columnsDynamicView = [
  { name: "Quy trình", row: "processKey", width: "100px" },
  { name: "Tên vai trò", row: "name", width: "300px" },
  {
    name: "Tên chức năng",
    row: "processKey",
    width: "300px"
  },
  {
    name: "Quyền",
    row: "roles",
    width: "400px",
    accessor: (row) =>
      Array.isArray(row.permissions)
        ? row.permissions.map((p) => permissionLabels[p] || p).join(", ")
        : "N/A",
  },
];

export const documentSchema = (view) =>
  yup.object({
    codeND: yup
      .string()
      .transform((value) => value?.trim())
      .required("Mã đơn vị không được để trống")
      .max(20, "Mã tài liệu không được vượt quá 20 ký tự")
      .matches(
        /^[a-zA-Z0-9ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯưẠ-ỹ\s]*$/,
        "Mã tài liệu chỉ được chứa chữ cái, số và tiếng Việt có dấu"
      ),

    name: yup
      .string()
      .required("Họ và tên không được để trống")
      .max(100, "Họ và tên không được vượt quá 100 ký tự"),
    parent: yup.string().required("Đơn vị không được để trống"),
    emailUser: yup
      .string()
      .trim()
      .email("Email không hợp lệ")
      .required("Email không được để trống"),

    username: yup
      .string()
      .required("Tên đăng nhập không được để trống")
      .min(4, "Tên đăng nhập phải có ít nhất 4 ký tự")
      .max(20, "Tên đăng nhập không được vượt quá 20 ký tự"),

    password:
      view === "add"
        ? yup
            .string()
            .required("Mật khẩu không được để trống")
            .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
            .max(20, "Mật khẩu không được vượt quá 20 ký tự")
            .matches(/[A-Z]/, "Mật khẩu phải có ít nhất một chữ cái viết hoa")
            .matches(
              /[a-z]/,
              "Mật khẩu phải có ít nhất một chữ cái viết thường"
            )
            .matches(/\d/, "Mật khẩu phải có ít nhất một số")
            .matches(/[@$!%*?&]/, "Mật khẩu phải có ít nhất một ký tự đặc biệt")
        : yup.string().notRequired(),

    repassword:
      view === "add"
        ? yup
            .string()
            .oneOf([yup.ref("password"), null], "Mật khẩu nhập lại không khớp")
            .required("Vui lòng nhập lại mật khẩu")
        : yup.string().notRequired(),

    phoneNumberUser: yup
      .string()
      .nullable()
      .notRequired()
      .matches(/^[0-9]+$/, "Số điện thoại chỉ được chứa chữ số")
      .min(10, "Số điện thoại phải có ít nhất 10 số")
      .max(11, "Số điện thoại không được vượt quá 11 số"),
  });


export const PERMISSION_LABELS = {
	ADMIN: "Quản trị viên",
	ADMIN_NEWS: "Quản trị viên tin tức",
	Administrator: "Quản trị hệ thống",
	ALL: "Tất cả",
	ALLHC: "Tất cả hành chính",
	ALLTK: "Tất cả thống kê",
	"B ? ph ? n nghi ? p v ? pcc": "Bộ phận nghiệp vụ PCC",
	BAN_LANH_DAO: "Ban lãnh đạo",
	BAN_QUAN_LY_PHONG_HOP: "Ban quản lý phòng họp",
	"BAN_TGĐ": "Ban Tổng giám đốc",
	"BAN_TGÐ": "Ban Tổng giám đốc",
	BANLANHDAO: "Ban lãnh đạo",
	BO_PHAN_CHUYEN_TRACH: "Bộ phận chuyên trách",
	BPPDTT: "Bộ phận phê duyệt thông tin",
	BPTDKTCTTC: "Bộ phận thi đua khen thưởng CTTC",
	CAN_BO: "Cán bộ",
	CANBO: "Cán bộ",
	CANBOCQDV1: "Cán bộ cơ quan đơn vị",
	canboct: "Cán bộ công ty",
	canbokhaithac: "Cán bộ khai thác",
	canbothuthapzzzzzzxxx: "Cán bộ thu thập",
	CB: "Cán bộ",
	CHANH_VAN_PHONG: "Chánh văn phòng",
	CHI_HUY_DON_VI: "Chỉ huy đơn vị",
	CHI_HUY_PHONG: "Chỉ huy phòng",
	CHI_HUY_PHONG_KHAI_THAC: "Chỉ huy phòng khai thác",
	CHI_HUY_VP: "Chỉ huy văn phòng",
	DON_VI_THAM_GIA: "Đơn vị tham gia",
	DON_VI_XU_LY: "Đơn vị xử lý",
	everyone: "Tất cả mọi người",
	GD: "Giám đốc",
	GIAM_DOC: "Giám đốc",
	HHLT_CANBO: "Hủy hồ sơ lưu trữ - Cán bộ",
	HHLT_TRUONGPHONG: "Hủy hồ sơ lưu trữ - Trưởng phòng",
	HSLT_VANTHU: "Hồ sơ lưu trữ - Văn thư",
	HSLT_VANTHU_TCT: "Hồ sơ lưu trữ - Văn thư TCT",
	LANH_DAO: "Lãnh đạo",
	LANH_DAO_DON_VI: "Lãnh đạo đơn vị",
	LANH_DAO_TCT: "Lãnh đạo TCT",
	LANHDAO: "Lãnh đạo",
	NGUOI_CHU_TRI: "Người chủ trì",
	NGUOI_DANG_KY_XE: "Người đăng ký xe",
	NGUOI_GIAO: "Người giao",
	NGUOI_KHAI_THAC: "Người khai thác",
	NGUOI_KY_BAN_HANH: "Người ký ban hành",
	NGUOI_KY_CHINH_THUC: "Người ký chính thức",
	NGUOI_KY_CHINH_THUC_2: "Người ký chính thức 2",
	NGUOI_KY_CHINH_THUC_3: "Người ký chính thức 3",
	NGUOI_KY_NHAY: "Người ký nháy",
	NGUOI_KY_NOI_DUNG: "Người ký nội dung",
	NGUOI_KY_PHE_DUYET: "Người ký phê duyệt",
	NGUOI_KY_THE_THUC: "Người ký thể thức",
	NGUOI_PHAN_ANH: "Người phản ánh",
	NGUOI_PHE_DUYET: "Người phê duyệt",
	NGUOI_PHOI_HOP: "Người phối hợp",
	NGUOI_SOAN_LICH: "Người soạn lịch",
	NGUOI_SOAN_THAO: "Người soạn thảo",
	NGUOI_TAO: "Người tạo",
	NGUOI_TAO_TIN: "Người tạo tin",
	NGUOI_THAM_DINH: "Người thẩm định",
	NGUOI_THAM_GIA: "Người tham gia",
	NGUOI_XAC_NHAN: "Người xác nhận",
	NGUOI_XU_LY: "Người xử lý",
	NHAN_VIEN: "Nhân viên",
	NHAN_VIEN_TCT: "Nhân viên TCT",
	PGD: "Phó giám đốc",
	PHAPCHE: "Pháp chế",
	PHO_DOI_TRUONG_PHONG_HAU_CAN_XE: "Phó đội trưởng phòng hậu cần xe",
	PHO_GIAM_DOC: "Phó giám đốc",
	PHO_TRUONG_PHONG: "Phó trưởng phòng",
	phogdtongcty: "Phó giám đốc Tổng công ty",
	PHONG_HAU_CAN_DOI_XE: "Phòng hậu cần đội xe",
	PHONG_NHAN_VIEN_TCT: "Phòng nhân viên TCT",
	PHOTRUONGPHONG: "Phó trưởng phòng",
	QLCV: "Quản lý công việc",
	QUANLY: "Quản lý",
	SOANTHAO: "Soạn thảo",
	TAI_XE_XE: "Tài xế xe",
	TK: "Thống kê",
	TP: "Trưởng phòng",
	TPSL: "Trưởng phòng Sổ lệnh",
	TRUONG_PHONG: "Trưởng phòng",
	TRUONG_PHONG_SL: "Trưởng phòng Sổ lệnh",
	TRUONGBANBCYCP: "Trưởng ban Ban Cơ yếu Chính phủ",
	truongphong: "Trưởng phòng",
	UNKNOWN: "Không xác định",
	"Van thu pcc": "Văn thư PCC",
	VAN_THU: "Văn thư",
	VAN_THU_CNTT: "Văn thư CNTT",
	VAN_THU_CUC: "Văn thư Cục",
	VAN_THU_KHAI_THAC: "Văn thư khai thác",
	VAN_THU_PHONG: "Văn thư Phòng",
	VAN_THU_TCT: "Văn thư TCT",
	VAN_THU_TCT_PHAT_HANH: "Văn thư TCT phát hành",
	vanthu: "Văn thư",
	VANTHUCQDV: "Văn thư cơ quan đơn vị",
	VANTHUCTTC: "Văn thư CTTC",
	VR: "Vai trò",
	VT: "Văn thư",
	VTC: "Văn thư Cục",
	VTP: "Văn thư Phòng",
	VTVT: "Văn thư Văn phòng",
	website: "Trang web",
	wwwwww: "Khác",
	XEM_LICH_LANH_DAO: "Xem lịch lãnh đạo",
	XEM_PHONG_HOP: "Xem phòng họp",
	XEMBAOCAO: "Xem báo cáo",
};

export const getPermissionLabel = (code) => {
	if (!code) return "";
	const strCode = String(code);
	return (
		PERMISSION_LABELS[strCode] ||
		PERMISSION_LABELS[strCode.toUpperCase()] ||
		PERMISSION_LABELS[strCode.toLowerCase()] ||
		code
	);
};