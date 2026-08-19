import * as Yup from "yup";

export const defaultValueDocUserGroupMgmt = {
	code: "", //Mã nhóm
	name: "", //Tên nhóm
	userId: [], //Cá nhân trong nhóm
	isDefault: false, //Mặc định
	isDefaultIncoming: false, //Nhóm mặc định vb đến
	order: "", //STT
}

export const docUserGroupMgmtSchema = Yup.object().shape({
	order: Yup.number()
		.nullable()
		.transform((value, originalValue) => (originalValue === "" || originalValue === null ? null : value))
		.typeError("Thứ tự hiển thị phải là số")
		.min(0, "Thứ tự hiển thị không được là số âm")
		.required("Thứ tự hiển thị là bắt buộc"),
	code: Yup.string() //Mã nhóm
		.trim()
		.max(500, "Mã nhóm không được vượt quá 500 ký tự")
		.test("no-consecutive-spaces", "Mã nhóm không được có 2 khoảng trắng liên tiếp", (value) => !value || !/\s{2}/.test(value))
		.required("Mã nhóm là bắt buộc"),
	name: Yup.string() //Tên nhóm
		.trim()
		.max(500, "Tên nhóm không được vượt quá 500 ký tự")
		.test("no-consecutive-spaces", "Tên nhóm không được có 2 khoảng trắng liên tiếp", (value) => !value || !/\s{2}/.test(value))
		.matches(/^[a-zA-Z0-9\s\u00C0-\u024F\u1E00-\u1EFF]*$/, { message: "Tên nhóm không được chứa ký tự đặc biệt", excludeEmptyString: true })
		.required("Tên nhóm là bắt buộc"),
	userId: Yup.array()
		.transform((value, originalValue) =>
			originalValue === "" || originalValue == null ? [] : value
		)
		.min(1, "Cá nhân trong nhóm là bắt buộc")
		.required("Cá nhân trong nhóm là bắt buộc"), //Cá nhân trong nhóm
})

export const toUserIds = (users) => {
  if (!Array.isArray(users)) return [];

  return users
	.map((item) => {
	  if (!item) return null;
	  if (typeof item !== "object") return item;

	  return item.id ?? item._id ?? item.value ?? item.code ?? null;
	})
	.filter(Boolean);
};