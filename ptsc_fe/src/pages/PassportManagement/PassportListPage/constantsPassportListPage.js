import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import * as Yup from "yup";

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

export const defaultValuePassportListPage = {
  eofficeAccount: "",
  fullName: "",
  email: "",
  positionTitle: "", //Chức danh
  birthday: "",
  gender: "",
  identificationCard: "",
  phoneNumber: "",
  rank: "", //Cấp bậc
  unitName: "", //Đơn vị
  departmentName: "", //Phòng
  divisionName: "", //Ban
  address: "",
  nationality: "Việt Nam", //Quốc tịch
  passportNumber: "", //Số hộ chiếu
  passportType: "", //Loại hộ chiếu
  issueDate: "", //Ngày cấp
  expiryDate: "", //Ngày hết hạn
  issuePlace: "", //Nơi cấp
  placeOfBirth: "", //Nơi sinh
  countriesVisited: "", //Các quốc gia đã thăm
  scanFile: "", //File scan hộ chiếu
  note: "", //Ghi chú
};

export const defaultValueReturnPassportSlip = {
  eofficeAccount: "",
  fullName: "",
  email: "",
  positionTitle: "", //Chức danh
  birthday: "",
  gender: "",
  identificationCard: "",
  phoneNumber: "",
  rank: "", //Cấp bậc
  unitName: "", //Đơn vị
  departmentName: "", //Phòng
  address: "", //Địa chỉ
  nationality: "Việt Nam", //Quốc tịch
  countriesVisited: "", //Các quốc gia đã thăm
	passportListReturn: [] //Danh sách hộ chiếu trả lại
};

export const passportListPageSchema = Yup.object({
  eofficeAccount: Yup.mixed()
    .nullable()
    .test(
      "is-object-or-id",
      "Tài khoản eOffice không được để trống",
      (value) => {
        if (value === null || value === undefined || value === "") return false;
        if (typeof value === "object") return !!value?.id || !!value?.value;
        return typeof value === "number" || typeof value === "string";
      }
    ),
  passportNumber: Yup.string()
    .trim()
    .required("Số hộ chiếu không được để trống")
    .max(20, "Số hộ chiếu không được vượt quá 20 ký tự!")
    .matches(
      /^\S+(\s\S+)*$/,
      "Số hộ chiếu không được có khoảng trắng ở đầu, cuối hoặc nhiều hơn một khoảng trắng giữa các từ."
    ),
  passportType: Yup.string()
    .nullable()
    .transform((value, originalValue) => {
      if (typeof originalValue === "object") {
        return originalValue?.value;
      }
      return value;
    })
    .required("Loại hộ chiếu không được để trống"),

  issueDate: Yup.string()
    .transform((value) => (value ? value.trim() : ""))
    .required("Ngày cấp không được để trống")
    .test("is-valid-date", "Ngày cấp không hợp lệ!", (value) =>
      dayjs(value).isValid()
    )
    .test(
      "not-in-future",
      "Ngày cấp không được lớn hơn ngày hiện tại!",
      (value) => {
        const date = dayjs(value);
        return date.isSameOrBefore(dayjs(), "day");
      }
    ),

  expiryDate: Yup.string()
    .transform((value) => (value ? value.trim() : ""))
    .required("Ngày hết hạn không được để trống")
    .test("is-valid-date", "Ngày hết hạn không hợp lệ!", (value) =>
      dayjs(value).isValid()
    )
    .test(
      "expiry-after-issue",
      "Ngày hết hạn phải lớn hơn ngày cấp!",
      function (value) {
        const expiryDate = dayjs(value);
        const issueDateValue = this.parent.issueDate;

        if (!dayjs(issueDateValue).isValid()) return true;

        return expiryDate.isAfter(dayjs(issueDateValue), "day");
      }
    ),
  issuePlace: Yup.string()
    .nullable()
    .notRequired()
    .max(255, "Nơi cấp không được vượt quá 255 ký tự!")
    .test(
      "no-more-than-2-spaces",
      "Nơi cấp không được có quá 2 khoảng trắng liên tiếp!",
      (value) => {
        if (!value) return true; // 👈 cho phép để trống
        return !/\s{3,}/.test(value); // ❌ 3 space trở lên
      }
    ),

  placeOfBirth: Yup.string()
    .nullable()
    .notRequired()
    .max(255, "Nơi sinh không được vượt quá 255 ký tự!")
    .test(
      "no-more-than-2-spaces",
      "Nơi sinh không được có quá 2 khoảng trắng liên tiếp!",
      (value) => {
        if (!value) return true; // 👈 cho phép để trống
        return !/\s{3,}/.test(value); // ❌ 3 space trở lên
      }
    ),

  countriesVisited: Yup.string()
    .nullable()
    .notRequired()
    .max(255, "Các nước đã đi không được vượt quá 255 ký tự!")
    .test(
      "no-more-than-2-spaces",
      "Các nước đã đi không được có quá 2 khoảng trắng liên tiếp!",
      (value) => {
        if (!value) return true; // 👈 cho phép để trống
        return !/\s{3,}/.test(value);
      }
    ),
});
