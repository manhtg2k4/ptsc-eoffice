import { Button } from "@mui/material";
import { styled } from "@mui/material/styles";

export const StyleButton = styled(Button, {
  shouldForwardProp: (prop) => !["variantColor"].includes(prop),
})(({ theme, variantColor, variant, color }) => {
  const isError =
    variantColor === "close" ||
    variantColor === "red" ||
    variant === "error" ||
    color === "error";
  const borderColor = isError ? theme.palette.error.main : "#2364B0";
  const textColor = isError ? theme.palette.error.main : "#303940";
  
  // Nếu là outlined thì áp dụng style mới, hoặc áp dụng cho tất cả nếu user muốn đổi toàn bộ
  // Ở đây tôi sẽ áp dụng style mới cho tất cả các nút StyleButton để đồng bộ
  return {
    backgroundColor: "#ffffff",
    fontSize: 14,
    color: textColor,
    border: `1px solid ${borderColor}`,
    borderRadius: "10px",
    textTransform: "none",
    fontWeight: 600,
    padding: "0 20px",
    height: "38px",
    whiteSpace: "nowrap",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    lineHeight: 1,
    "&:hover": {
      backgroundColor: isError ? "rgba(211, 47, 47, 0.05)" : "rgba(26, 86, 219, 0.05)",
      borderColor: isError ? theme.palette.error.dark : borderColor,
    },
    ...(theme.palette.mode === "dark" && {
      backgroundColor: isError ? "rgba(211, 47, 47, 0.7)" : "rgba(123, 165, 198, 0.7)",
      color: "#ffffff",
      border: "none",
      "&:hover": {
        backgroundColor: isError ? "rgba(211, 47, 47, 0.9)" : "rgba(123, 165, 198, 0.9)",
      },
    }),
    "&.Mui-disabled": {
      backgroundColor: theme.palette.action.disabledBackground,
      color: theme.palette.action.disabled,
      borderColor: theme.palette.action.disabledBackground,
    },
    // Hỗ trợ trường hợp nếu vẫn muốn dùng contained (filled)
    // ...(variant === "contained" && {
    //   backgroundColor: mainColor,
    //   color: "#ffffff",
    //   "&:hover": {
    //     backgroundColor: isError ? theme.palette.error.dark : theme.palette.primary.dark,
    //   }
    // })
  };
});
