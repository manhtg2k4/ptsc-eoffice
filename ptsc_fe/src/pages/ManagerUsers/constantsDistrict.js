import * as Yup from "yup";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore"; // ⬅️ Thêm dòng này

dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore); // ⬅️ Kích hoạt plugin này

export const defaultFormValuesDistrict = {
  name: "",
  codeND: "",
  emailUser: "",
  username: "",
  password: "",
  phoneNumberUser: "",
  repassword: "",
  parent: "",
  identificationCard: "",
  addressUser: "",
  personalSecretary: "",
  birthday: null,
	contactTime: null,
	paraphSignImage: null,
	contentSignImage: null,
};

export const documentSchema = (view, passwordSchema) => {
  const baseSchema = {
    codeND: Yup.string()
      .nullable()
      .notRequired()
      .transform((value) => value?.trim() || "")
      .when({
        is: (value) => value && value.length > 0,
        then: (schema) =>
          schema
            .min(4, "Mã cán bộ phải có ít nhất 4 ký tự")
            .max(12, "Mã cán bộ không được vượt quá 12 ký tự")
            .matches(
              /^[a-zA-Z0-9\s]+$/,
              "Mã cán bộ chỉ được chứa chữ cái không dấu và số, không chứa ký tự đặc biệt hoặc dấu tiếng Việt"
            ),
      }),

    name: Yup.string()
      .trim()
      .required("Họ và tên không được để trống")
      .max(150, "Họ và tên không được vượt quá 150 ký tự!")
      .matches(
        /^\S+(\s\S+)*$/,
        "Họ và tên không được có khoảng trắng ở đầu, cuối hoặc nhiều hơn một khoảng trắng giữa các từ."
      ),

    parent: Yup.string().required("Đơn vị không được để trống"),

    // emailUser: Yup.string()
    //   .trim()
    //   .required("Email không được để trống")
    //   .matches(
    //     /^[A-Za-z0-9._%+-]+@(gmail\.com|yahoo\.com|outlook\.com|hotmail\.com|lifetex\.vn)$/,
    //     "Email không hợp lệ"
    //   ),
		emailUser: Yup.string()
  		.trim()
  		.required("Email không được để trống")
  		.email("Email không hợp lệ"),

    identificationCard: Yup.string()
      .nullable()
      .notRequired()
      .transform((value) => (value === null ? "" : value))
      .matches(/^[0-9]*$/, "Căn cước chỉ được chứa chữ số")
      .when({
        is: (value) => value && value.length > 0,
        then: (schema) => schema.max(12, "Căn cước không được vượt quá 12 số"),
      }),

    username: Yup.string()
      .required("Tên đăng nhập không được để trống")
      .max(20, "Tên đăng nhập không được vượt quá 20 ký tự"),

    repassword:
      view === "add"
        ? Yup.string()
            .oneOf([Yup.ref("password"), null], "Mật khẩu nhập lại không khớp")
            .required("Vui lòng nhập lại mật khẩu")
        : Yup.string().notRequired(),

    phoneNumberUser: Yup.string()
      .nullable()
      .notRequired()
      .transform((value) => (value === null ? "" : value))
      .matches(/^[0-9]*$/, "Số điện thoại chỉ được chứa chữ số")
      .when({
        is: (value) => value && value.length > 0,
        then: (schema) =>
          schema
            .min(10, "Số điện thoại phải có ít nhất 10 số")
            .max(10, "Số điện thoại không được vượt quá 10 số"),
      }),

    addressUser: Yup.string()
      .nullable()
      .notRequired()
      .transform((value) => (value ? value.trim() : value))
      .max(150, "Độ dài không vượt quá 150 ký tự!"),

    // ✅ ĐÃ SỬA LẠI PHẦN NGÀY SINH
    birthday: Yup.string()
      .nullable()
      .transform((value) => (value ? value.trim() : null))
      .test("is-valid-date", "Ngày sinh không hợp lệ! ", (value) => {
        if (!value) return true;
        const date = dayjs(value, "DD/MM/YYYY", true);
        return date.isValid();
      })
      .test(
        "not-in-future",
        "Ngày sinh không được lớn hơn ngày hiện tại!",
        (value) => {
          if (!value) return true;
          const date = dayjs(value, "DD/MM/YYYY", true);
          if (!date.isValid()) return false;
          const today = dayjs();
          return date.isSameOrBefore(today, "day"); // 👈 Đúng cú pháp
        }
      ),

    contactTime: Yup.string()
      // contactTime: Yup.date()
      .nullable()
      // .transform((value, originalValue) => {
      //   if (!originalValue) return null;
      //   const date = dayjs(originalValue, 'DD/MM/YYYY', true);
      //   return date.isValid() ? date.toDate() : new Date('invalid date');
      // })
      // .typeError('Nhập ngày hợp lệ!'),
      .transform((value) => (value ? value.trim() : null))

      .test("is-valid-date", "Ngày bắt đầu công tác không hợp lệ!", (value) => {
        if (!value) return true; // Cho phép rỗng
        return dayjs(value, "DD/MM/YYYY", true).isValid();
      }),
  };

  if (view === "add") {
    baseSchema.password = passwordSchema;
  }

  return Yup.object(baseSchema);
};
