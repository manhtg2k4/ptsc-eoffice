import { styled } from "@mui/material/styles";
import { Box, Grid } from "@mui/material";

export const BoxLayout = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gridAutoRows: "auto",
  gap: theme.spacing(2.5),
  padding: theme.spacing(4),
  // paddingBottom: theme.spacing(0), // chừa chỗ cho footer
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
}));


// Cột chiếm nhiều dòng (ví dụ Trích yếu)
export const FullWidthGrid = styled("div")(() => ({
  gridColumn: "1 / 4", // chiếm 3 cột
}));

// Nếu cần định nghĩa riêng 2 cột (ví dụ cho 2 nút button hoặc bảng)
export const HalfWidthGrid = styled("div")(() => ({
  gridColumn: "span 2",
}));

export const FooterLayout = styled(Box)(() => ({
  position: "fixed",
  bottom: 0,
  left: 0,
  width: "100%",
  background: "#fff",
  boxShadow: "0 -2px 5px rgba(0,0,0,0.1)",
  padding: "10px 20px",
  display: "flex",
  justifyContent: "center",
  gap: '10px',
  zIndex: 99,
}));

export const ButtonForm = styled(Grid)(() => ({  

}))

export const WarningText = styled('span')(({ theme }) => ({
	color: theme.palette.warning.main,
	fontWeight: 600,
	fontSize: "12px"
}))