import * as yup from "yup";

export const docSendingUnitSchema = yup.object().shape({
	name: yup.string().required("Tên đơn vị không được để trống"),
	code: yup.string().required("Mã đơn vị không được để trống"),
	parentId: yup.string().nullable(),
});

export const defaultValueDocSendingUnit = {
	name: "",
	code: "",
	parentId: null,
};
