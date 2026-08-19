import * as yup from "yup";
import dayjs from "dayjs";

export const columnsExtendProcessingTime = [
  { name: "Cán bộ", row: "name", width: "150px" },
  { name: "Thời gian hiện tại", row: "currentDeadline", width: "120px" },
	{
		name: "Ngày gia hạn",
		row: "newDeadline",
		width: "120px"
	},
];

export const defaultFormValues = {
  auditId: [],
  newDeadline: null,
};

export const extendProcessingTimeSchema = yup.object({
	auditId: yup.array().min(1, "Vui lòng chọn ít nhất một cán bộ").required("Vui lòng chọn cán bộ"),
  newDeadline: yup
    .date()
    .required("Vui lòng chọn ngày gia hạn")
    .typeError("Vui lòng chọn ngày gia hạn"),
});

export const formatDataDate = (value) =>
  value ? dayjs(value).format("DD/MM/YYYY") : "";

export const mappedColumns = (
  columns = [],
  dateFields = [],
  formatDateFn = formatDataDate // hoặc truyền từ ngoài
) => {
  if (!Array.isArray(columns)) return [];

  return columns.map((col) => {
    if (dateFields.includes(col.row)) {
      return {
        ...col,
        accessor: (row) => formatDateFn(row?.[col.row]),
      };
    }
    return col;
  });
};
