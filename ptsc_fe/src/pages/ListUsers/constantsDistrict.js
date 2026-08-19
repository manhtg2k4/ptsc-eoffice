import * as yup from "yup";

/**
 * Tạo Yup schema động từ password policy lấy từ server (GET /api/auth-config/password-policy)
 * - requireOldPassword: true nếu user thường (không phải admin reset)
 */
export const dynamicPasswordSchema = (policy = {}, requireOldPassword = true) => {
  const {
    minLength = 8,
    maxLength = 0,
    requireUpperCase = false,
    requireLowerCase = false,
    requireNumbers = false,
    requireSpecialChars = false,
  } = policy;

  let newPasswordRule = yup.string().min(minLength, `Mật khẩu ít nhất ${minLength} ký tự`);
  if (maxLength && maxLength > 0) newPasswordRule = newPasswordRule.max(maxLength, `Mật khẩu tối đa ${maxLength} ký tự`);
  if (requireUpperCase) newPasswordRule = newPasswordRule.matches(/[A-Z]/, "Mật khẩu cần có ít nhất một chữ hoa (A-Z)");
  if (requireLowerCase) newPasswordRule = newPasswordRule.matches(/[a-z]/, "Mật khẩu cần có ít nhất một chữ thường (a-z)");
  if (requireNumbers) newPasswordRule = newPasswordRule.matches(/[0-9]/, "Mật khẩu cần có ít nhất một chữ số (0-9)");
  if (requireSpecialChars) newPasswordRule = newPasswordRule.matches(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, "Mật khẩu cần có ít nhất một ký tự đặc biệt");
  newPasswordRule = newPasswordRule.required("Vui lòng nhập mật khẩu mới");

  return yup.object().shape({
    oldPassword: requireOldPassword
      ? yup.string().required("Vui lòng nhập mật khẩu hiện tại")
      : yup.string().nullable(),
    newPassword: newPasswordRule,
    confirmPassword: yup
      .string()
      .oneOf([yup.ref("newPassword"), null], "Mật khẩu nhập lại không khớp")
      .required("Vui lòng nhập lại mật khẩu"),
  });
};

export const columnsUsers = [
  { name: "Tên đăng nhập", row: "username", width: "100px" },
  { name: "Họ và tên", row: "name", width: "300px" },
  { name: "Mã cán bộ", row: "codeND", width: "100px" },
  { name: "Ngày sinh", row: "birthday", width: "200px" },
  { name: "Giới tính", row: "gender", width: "100px" },
  { name: "Đơn vị cha", row: "grandParentName", width: "400px" },
  { name: "Đơn vị", row: "parentName", width: "200px" },
  { name: "Chức vụ", row: "position", width: "100px" },
  {
    name: "Nhóm người dùng",
    row: "GroupUser",
    width: "200px",
    accessor: (row) => {
      if (
        row.GroupUser &&
        Array.isArray(row.GroupUser) &&
        row.GroupUser.length > 0
      ) {
        const firstGroup = row.GroupUser[0]?.name || "";
        return row.GroupUser.length > 1 ? `${firstGroup}, ...` : firstGroup;
      }
      return "";
    },
  },
  {
    name: "Trạng thái",
    row: "status",
    width: "200px",
    accessor: (row) => {
      return (Number(row.status) === 1 ? "Hoạt động" : "Ngừng hoạt động");
    },
  },
];

export const filtersUsers = [
  { name: "Tên đăng nhập", code: "username" },
  { name: "Họ và tên", code: "name" },
  { name: "Mã cán bộ", code: "codeND" },
];

export const syncDialogStyles = (theme) => ({
  logPre: {
    whiteSpace: "pre-wrap",
    wordWrap: "break-word",
    maxHeight: "300px",
    overflowY: "auto",
    background: theme.palette.mode === "dark" ? "#2d2d2d" : "#f5f5f5",
    padding: "10px",
    borderRadius: "4px",
    color: theme.palette.text.primary,
  },
});

export const adminPasswordSchema = (isAdmin = false) =>
  yup.object().shape({
    oldPassword: isAdmin
      ? yup.string().nullable()
      : yup.string().required("Vui lòng nhập mật khẩu hiện tại"),
    newPassword: yup
    .string()
    .min(8, "Mật khẩu ít nhất 8 ký tự")
    .max(20, "Mật khẩu tối đa 20 ký tự")
    .matches(/[A-Z]/, "Mật khẩu cần có ít nhất một chữ cái viết hoa")
    .matches(/[a-z]/, "Mật khẩu cần có ít nhất một chữ cái viết thường")
    .matches(/[0-9]/, "Mật khẩu cần có ít nhất một số")
    .matches(/[!@#$%^&*]/, "Mật khẩu cần có ít nhất một ký tự đặc biệt")
    .required("Vui lòng nhập mật khẩu mới"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("newPassword"), null], "Mật khẩu nhập lại không khớp")
    .required("Vui lòng nhập lại mật khẩu mới"),
});

export const passwordSchema = yup.object().shape({
  oldPassword: yup.string().required("Vui lòng nhập mật khẩu hiện tại"),
  newPassword: yup
    .string()
    .min(8, "Mật khẩu ít nhất 8 ký tự")
    .max(20, "Mật khẩu tối đa 20 ký tự")
    .matches(/[A-Z]/, "Mật khẩu cần có ít nhất một chữ cái viết hoa")
    .matches(/[a-z]/, "Mật khẩu cần có ít nhất một chữ cái viết thường")
    .matches(/[0-9]/, "Mật khẩu cần có ít nhất một số")
    .matches(/[!@#$%^&*]/, "Mật khẩu cần có ít nhất một ký tự đặc biệt")
    .required("Vui lòng nhập mật khẩu mới"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("newPassword"), null], "Mật khẩu nhập lại không khớp")
    .required("Vui lòng nhập lại mật khẩu mới"),
});
