import * as yup from "yup";

export const defaultDocCategoryMgmtValue = {
  code: "",
	title: "",
	moduleCategory: ["documentModule"],
  data: [],
  canDragDrop: true,
  canDelete: true,
};

export const docCategoryMgmtSchema = yup.object().shape({
	code: yup
		.string()
		.trim()
		.required("Mã danh mục là bắt buộc."),
	
	title: yup.string().trim().required("Tên danh mục là bắt buộc.").matches(
		/^[a-zA-Z0-9À-ỹ\s_-]*$/,
		"Tên danh mục không được chứa ký tự đặc biệt."
	),
});