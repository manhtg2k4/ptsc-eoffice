import * as yup from "yup";
export const defaultFormValuesDistrict = {
  name: "",
	code: "",
	type: "",
	phoneNumber: "",
	email: "",
	leader: "",
	position: "",
	order: "",
	address: "",
	description: "",
};

export const columnsDistrict = [
  { name: "Mã đơn vị", row: "code", width: "100px" },
  { name: "Tên đơn vị", row: "name", width: "300px" },
  { name: "Thứ tự", row: "order", width: "300px" },
];

export const filtersDistrict = [
  { name: "Mã đơn vị", code: "code" },
  { name: "Tên đơn vị", code: "name" },
];

export const columnsUsers = [
  { name: "Tên đăng nhập", row: "code", width: "100px" },
  { name: "Họ và tên", row: "name", width: "300px" },
  { name: "Mã cán bộ", code: "order", width: "100px" },
  { name: "Ngày sinh", code: "order", width: "200px" },
  { name: "Giới tính", code: "order", width: "100px" },
  { name: "Đơn vị cha", code: "order", width: "400px" },
];

export const filtersUsers = [
  { name: "Tên đăng nhập", code: "username" },
  { name: "Họ và tên", code: "name" },
	{ name: "Mã cán bộ", code: "codeND" },
]

export const permissions = [
  "Báo cáo hồ sơ lưu trữ",
  "Báo cáo hồ sơ hủy hiệu lực",
  "Báo cáo giấy tờ tài sử dụng của công dân",
  "Báo cáo giấy tờ tài sử dụng của tổ chức/doanh nghiệp",
  "Báo cáo giấy tờ có chữ ký số không hợp lệ",
  "Báo cáo dữ liệu khai thác, chia sẻ kết quả giải quyết TTHC",
  "Báo cáo dữ liệu khai thác, chia sẻ giấy tờ tài sử dụng của công dân",
  "Báo cáo dữ liệu khai thác, chia sẻ giấy tờ tài sử dụng của tổ chức/doanh nghiệp",
];

export const optionsUnit = [
  "Báo cáo hồ sơ lưu trữ",
  "Báo cáo hồ sơ hủy hiệu lực",
  "Báo cáo giấy tờ tài sử dụng của công dân",
  "Báo cáo giấy tờ tài sử dụng của tổ chức/doanh nghiệp",
  "Báo cáo giấy tờ có chữ ký số không hợp lệ",
  "Báo cáo dữ liệu khai thác, chia sẻ kết quả giải quyết TTHC",
  "Báo cáo dữ liệu khai thác, chia sẻ giấy tờ tài sử dụng của công dân",
  "Báo cáo dữ liệu khai thác, chia sẻ giấy tờ tài sử dụng của tổ chức/doanh nghiệp",
];

export const documentSchema = yup.object({
  code: yup
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
    .transform((value) => value.trim())
    .required("Tên đơn vị không được để trống")
    .max(100, "Tên tài liệu không được vượt quá 100 ký tự")
    .matches(
      /^[a-zA-Z0-9ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯưẠ-ỹ\s]*$/,
      "Tên tài liệu chỉ được chứa chữ cái, số và tiếng Việt có dấu"
    ),
 	phoneNumber: yup
  	.string()
  	.nullable()
  	.transform(value => (value === '' ? null : value))
  	.matches(/^[0-9]+$/, {
    	message: "Số điện thoại chỉ được chứa chữ số",
    	excludeEmptyString: true,
  	})
  	.min(10, "Số điện thoại phải có ít nhất 10 số")
  	.max(11, "Số điện thoại không được vượt quá 11 số"),
  email: yup .string()
  	.nullable()
  	.transform(value => (value === '' ? null : value))
  	.email("Email không hợp lệ"),
  order: yup .string()
  	.nullable()
  	.transform(value => (value === '' ? null : value))
  	.matches(/^\d+$/, {
    	message: "Thứ tự chỉ được chứa số",
    	excludeEmptyString: true,
  	}),
});
