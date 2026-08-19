import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import * as Yup from "yup";

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

export const defaultValueRequestListPage = {
	typeRequest: "", // Loại yêu cầu
	namePassportRequest: "", //Người mượn/Đoàn ra
	leader: "", //Lãnh đạo
	passportNumber: "", //Số hộ chiếu
	passportType: "", //Loại hộ chiếu
	borrowDate: "", //Ngày dự kiến mượn
	returnDate: "", //Ngày dự kiến trả
	reason: "", //Lý do mượn
	delegationLeader: "", //Trưởng đoàn
	position: "", //Chức vụ
	destination: "", //Điểm đến
	destinationOther: "", //Nơi đến khác
	isSpecificDepartureDate: true, //Ngày khởi hành cụ thể
	departureDate: "", //Ngày đi
	arrivalDate: "", //Ngày về
	partner: "", //Đối tác
	typeOfFunding: "", //Nguồn kinh phí
	partnerGifts: "", // Quà tặng TCT
	receivedGifts: "", // Quả tặng từ đối tác
	tripContent: "", //Nội dung chuyến đi
	decision: "", //Quyết định
	note: "", //Ghi chú
	passportFile: [], //Tệp đính kèm hộ chiếu
	ppResultTripFile: [], //Tệp đính kèm kết quả chuyến đi
	listOfOrganizations: [], //Danh sách tổ chức
};

export const passportMyRequestSchema = Yup.object({
	namePassportRequest: Yup.mixed()
		.nullable()
		.test("is-object-or-id", "Người mượn không được để trống", (value) => {
			if (value === null || value === undefined || value === "") return false;
			if (typeof value === "object") return !!value?.id || !!value?.value;
			return typeof value === "number" || typeof value === "string";
		}),
	leader: Yup.mixed()
		.nullable()
		.test("is-object-or-id", "Lãnh đạo không được để trống", (value) => {
			if (value === null || value === undefined || value === "") return false;
			if (typeof value === "object") return !!value?.id || !!value?.value;
			return typeof value === "number" || typeof value === "string";
		}),
	passportNumber: Yup.mixed()
		.nullable()
		.test("is-object-or-id", "Số hộ chiếu không được để trống", (value) => {
			if (value === null || value === undefined || value === "") return false;
			if (typeof value === "object") return !!value?.id || !!value?.value;
			return typeof value === "number" || typeof value === "string";
		}),

	borrowDate: Yup.string()
		.transform((value) => (value ? value.trim() : ""))
		.required("Ngày dự kiến mượn không được để trống")
		.test("is-valid-date", "Ngày dự kiến mượn không hợp lệ!", (value) =>
			dayjs(value).isValid()
		),
	// .test(
	// 	"not-in-future",
	// 	"Ngày dự kiến mượn không được lớn hơn ngày hiện tại!",
	// 	(value) => {
	// 		const date = dayjs(value);
	// 		return date.isSameOrBefore(dayjs(), "day");
	// 	}
	// ),

	returnDate: Yup.string()
		.transform((value) => (value ? value.trim() : ""))
		.required("Ngày dự kiến trả không được để trống")
		.test("is-valid-date", "Ngày dự kiến trả không hợp lệ!", (value) =>
			dayjs(value).isValid()
		)
		.test(
			"expiry-after-issue",
			"Ngày dự kiến trả phải lớn hơn ngày dự kiến mượn!",
			function (value) {
				const expiryDate = dayjs(value);
				const issueDateValue = this.parent.borrowDate;

				if (!dayjs(issueDateValue).isValid()) return true;

				return expiryDate.isAfter(dayjs(issueDateValue), "day");
			}
		),
});

export const passportOrganizationalRequestSchema = Yup.object({
	namePassportRequest: Yup.string()
		.transform((value) => (value ? value.trim() : ""))
		.required("Tên đoàn không được để trống")
		.max(200, "Tên đoàn tối đa 200 ký tự"),

	delegationLeader: Yup.mixed()
		.nullable()
		.required("Trưởng đoàn không được để trống")
		.test("is-object-or-id", "Trưởng đoàn không được để trống", (value) => {
			if (value === null || value === undefined || value === "") return false;
			if (typeof value === "object") return !!value?.id || !!value?.value;
			return typeof value === "number" || typeof value === "string";
		}),

	destination: Yup.mixed()
		.nullable()
		.required("Nơi đến không được để trống")
		.test("is-valid-destination", "Nơi đến không được để trống", (value) => {
			if (value === null || value === undefined || value === "") return false;
			if (Array.isArray(value)) return value.length > 0;
			if (typeof value === "object")
				return !!value?.ivalued || !!value?.value || !!value?.id || !!value?.title;
			return typeof value === "number" || typeof value === "string";
		}),

	destinationOther: Yup.string()
		.nullable()
		.when("destination", {
			is: (destination) => {
				if (!destination) return false;
				const checkIsOther = (item) => {
					if (!item) return false;
					if (
						item === "OTHER" ||
						item?.ivalued === "OTHER" ||
						item?.id === "OTHER" ||
						item?.value === "OTHER" ||
						item?.title === "Khác"
					) {
						return true;
					}
					return false;
				};
				if (Array.isArray(destination)) {
					return destination.some(checkIsOther);
				}
				return checkIsOther(destination);
			},
			then: (schema) =>
				schema
					.transform((val) => (val ? val.trim() : ""))
					.required("Vui lòng nhập Nơi đến (khác)"),
			otherwise: (schema) => schema.notRequired().nullable(),
		}),

	isSpecificDepartureDate: Yup.boolean(),

	departureDate: Yup.string().when("isSpecificDepartureDate", {
		is: true,
		then: (schema) =>
			schema
				.required("Ngày đi không được để trống")
				.test("is-valid-date", "Ngày đi không hợp lệ!", (value) =>
					dayjs(value).isValid()
				)
				.test(
					"departure-not-past",
					"Ngày đi phải lớn hơn hoặc bằng ngày hiện tại!",
					(value) => {
						if (!dayjs(value).isValid()) return true;
						return dayjs(value).isSameOrAfter(dayjs(), "day");
					}
				)
				.test(
					"departure-before-arrival",
					"Ngày đi phải nhỏ hơn hoặc bằng ngày về!",
					function (value) {
						const { arrivalDate } = this.parent;
						if (!value || !arrivalDate || !dayjs(value).isValid()) return true;
						if (!dayjs(arrivalDate).isValid()) return true;
						return dayjs(value).isSameOrBefore(dayjs(arrivalDate), "day");
					}
				),
		otherwise: (schema) => schema.notRequired(),
	}),

	arrivalDate: Yup.string().when("isSpecificDepartureDate", {
		is: true,
		then: (schema) =>
			schema
				.required("Ngày về không được để trống")
				.test("is-valid-date", "Ngày về không hợp lệ!", (value) =>
					dayjs(value).isValid()
				)
				.test(
					"arrival-after-departure",
					"Ngày về phải lớn hơn hoặc bằng ngày đi!",
					function (value) {
						const { departureDate } = this.parent;
						if (!value || !departureDate || !dayjs(value).isValid())
							return true;
						if (!dayjs(departureDate).isValid()) return true;
						return dayjs(value).isSameOrAfter(dayjs(departureDate), "day");
					}
				),
		otherwise: (schema) => schema.notRequired(),
	}),
});

export const defaultValueRequestApprovalDialog = {
	approvalReason: "",
	handleUserId: null,
	actionType: null,
};

export const requestApprovalDialogSchema = Yup.object({
	approvalReason: Yup.string()
		.transform((value) => (value ? value.trim() : ""))
		.when("$actionType", {
			is: (value) =>
				value === "reject" ||
				value === "rejectOfficeCommanderRequest" ||
				value === "rejectSpecialDeptReq",
			then: (schema) => schema.required("Ý kiến từ chối không được để trống"),
			otherwise: (schema) => schema.notRequired(),
		}),

	handleUserId: Yup.mixed()
		.nullable()
		.when("$actionType", {
			is: "transferProcessing",
			then: (schema) =>
				schema
					.required("Người xử lý không được để trống")
					.test(
						"is-object-or-id",
						"Người xử lý không được để trống",
						(value) => {
							if (!value) return false;
							if (typeof value === "object")
								return !!value?.id || !!value?.value;
							return typeof value === "number" || typeof value === "string";
						}
					),
			otherwise: (schema) => schema.notRequired().nullable(),
		}),
});

export const rejectTypes = [
	"reject",
	"rejectOfficeCommanderRequest",
	"rejectSpecialDeptReq",
];

export const formatDatePassportModule = (isoDate) => {
	const date = new Date(isoDate);

	const day = String(date.getDate()).padStart(2, "0");
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const year = date.getFullYear();

	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	const seconds = String(date.getSeconds()).padStart(2, "0");

	return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

export const formatDateVNPassportModule = (isoDate) => {
	const date = new Date(isoDate);

	const day = String(date.getDate()).padStart(2, "0");
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const year = date.getFullYear();

	return `ngày ${day} tháng ${month} năm ${year}`;
};

export const refuseValidationSchema = Yup.object().shape({
	rejectReason: Yup.string().required("Vui lòng nhập ý kiến từ chối"),
});

export const formatDateDDMMYYYY = (dateString) => {
	if (!dateString) return "";

	const date = new Date(dateString);

	const day = String(date.getDate()).padStart(2, "0");
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const year = date.getFullYear();

	return `${day}/${month}/${year}`;
}