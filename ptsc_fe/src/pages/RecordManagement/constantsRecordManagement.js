import * as yup from "yup";
import dayjs from "dayjs";

export const defaultValueRecordManagement = {
  archivesNumber: "", // Số và ký hiệu hồ sơ
  archivesName: "", // Tiêu đề hồ sơ
  archivesType: "", // Loại hồ sơ
  archivesDeadline: "", // Thời hạn bảo quản
  archivesMode: "", // Chế độ sử dụng
  archivesYear: "", // Năm hình thành hồ sơ
  // archivesStatus: "", // Trạng thái hồ sơ
  archivesOrganizationUnit: [], // Phòng ban/đơn vị chịu trách nhiệm
  archivesLanguage: "", // Ngôn ngữ
  archivesNote: "", // Ghi chú
  archivesStartDate: "", // Ngày bắt đầu
  archivesEndDate: "", // Ngày kết thúc
  archivesTotalDocuments: "", // Tổng số tài liệu
  archivesTotalPages: "", // Tổng số trang
  listDocIndex: [],
  category: "", // Danh mục
};

export const recordManagementSchema = yup.object().shape({
	archivesName: yup.string().required("Vui lòng chọn tiêu đề hồ sơ"),
	archivesNumber: yup.string().required("Vui lòng nhập số và ký hiệu hồ sơ"),
	// archivesType: yup.string().required("Vui lòng chọn loại hồ sơ"),
	archivesDeadline: yup.string().required("Vui lòng chọn thời hạn bản quản"),
	archivesOrganizationUnit: yup.array().min(1, "Vui lòng chọn phòng ban/đơn vị chịu trách nhiệm").required("Vui lòng chọn phòng ban/đơn vị chịu trách nhiệm"),
	archivesMode: yup.string().required("Vui lòng chọn chế độ sử dụng"),
	archivesYear: yup.string().required("Vui lòng chọn năm hình thành"),
	// archivesLanguage: yup.string().required("Vui lòng chọn ngôn ngữ"),
	archivesStartDate: yup.string()
		.required("Vui lòng nhập ngày bắt đầu")
		.test("is-future", "Ngày bắt đầu phải lớn hơn hoặc bằng ngày hiện tại", function (value) {
			if (!value) return true;
			return dayjs(value).startOf('day').isSameOrAfter(dayjs().startOf('day'));
		}),
	archivesEndDate: yup.string()
		.required("Vui lòng nhập ngày kết thúc")
		.test("is-after-start", "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu", function (value) {
			const { archivesStartDate } = this.parent;
			if (!value || !archivesStartDate) return true;
			return dayjs(value).startOf('day').isSameOrAfter(dayjs(archivesStartDate).startOf('day'));
		}),
});
