import * as yup from "yup";

export const columns = [
  {
    name: "STT",
    row: "stt",
    width: "80px",
    align: "center",
    render: (data, index) => index + 1,
  },
  { name: "Mã danh mục", row: "code", width: "200px" },
  { name: "Tên danh mục", row: "title", width: "400px" },
  {
    name: "Số lượng giá trị",
    row: "data",
    width: "150px",
    align: "center",
    render: (data) => (Array.isArray(data) ? data.length : 0),
  },
];

export const filters = [
  { name: "Mã danh mục", code: "code" },
  { name: "Tên danh mục", code: "title" },
];

export const categorySchema = yup.object().shape({
  code: yup
    .string()
    .trim()
    .required("Mã danh mục là bắt buộc."),
    // .matches(
    //   /^[a-zA-Z0-9_.-]*$/,
    //   "Mã không được chứa ký tự đặc biệt hoặc khoảng trắng."
    // ),
  title: yup.string().trim().required("Tên danh mục là bắt buộc.").matches( // eslint-disable-next-line
    /^[a-zA-Z0-9À-ỹ\s_-]*$/,
    "Tên danh mục không được chứa ký tự đặc biệt."
  ),
  moduleCategory: yup
    .array()
    .min(1, "Module là bắt buộc.")
    .required("Module là bắt buộc."),
});

export const childDocument = yup.object().shape({
  value: yup
    .string()
    .trim()
    .required("Giá trị là bắt buộc."),
    // .matches(
    //   /^[a-zA-Z0-9_.-]*$/,
    //   "Mã không được chứa ký tự đặc biệt hoặc khoảng trắng."
    // ),
  title: yup.string().trim().required("Tên danh mục là bắt buộc.").matches(
    /^[a-zA-Z0-9À-ỹ\s_-]*$/,
    "Tên danh mục không được chứa ký tự đặc biệt."
  )
  ,
});

export const defaultChildDocumnetValue = yup.object().shape({
  code: "",
  title: "",
  data: [],
});

export const defaultCategoryValue = {
  code: "",
	title: "",
  moduleCategory: [],
  data: [],
};
