import * as Yup from "yup";

export const defaultValueAuthPassport = {
	code: "", // Mã quyền
	passportBorrowScope: "", // Phạm vi mượn hộ chiếu
	authPersonsPassport: "", // Người được cấp quyền
	officerList: [], //Danh sách cán bộ
};

export const authPassportSchema = Yup.object({
	code: Yup.string().required("Mã quyền không được để trống"),
	authPersonsPassport: Yup.mixed()
		.nullable()
		.test("is-object-or-id", "Người được cấp quyền không được để trống", (value) => {
			if (value === null || value === undefined || value === "") return false;
			if (typeof value === "object") return !!value?.id || !!value?.value;
			return typeof value === "number" || typeof value === "string";
		}),
	passportBorrowScope: Yup.mixed()
		.nullable()
		.test("is-object-or-id", "Phạm vi mượn hộ chiếu không được để trống", (value) => {
			if (value === null || value === undefined || value === "") return false;
			if (typeof value === "object") return !!value?.id || !!value?.value;
			return typeof value === "number" || typeof value === "string";
		}),
});
