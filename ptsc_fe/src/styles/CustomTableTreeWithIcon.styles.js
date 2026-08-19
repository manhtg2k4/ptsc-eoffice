import { Folder, InsertDriveFile } from "@mui/icons-material";
import { Box, IconButton, TableCell, Pagination, Select } from "@mui/material";
import { styled, alpha } from "@mui/material/styles";

export const TreeTableWithIconCell = styled(TableCell, {
	shouldForwardProp: (prop) => prop !== "$level",
})(({ theme, $level = 0 }) => ({
	// display: "flex",
	// alignItems: "center",
	backgroundColor: "inherit",
	// ✅ Sửa lỗi: Chỉ áp dụng border khi được bật trong theme, nếu không thì ẩn đi
	borderBottom: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
		theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
			? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
				theme.palette.divider
			: "transparent"
	}`,
	// ✅ Sửa lỗi: Hiển thị border-right đồng bộ với các ô khác trong bảng
	borderRight: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${
		theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
			? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor ||
				theme.palette.divider
			: "transparent"
	}`,
	// ✅ Thêm border-left cho ô đầu tiên để đồng bộ
	// "&:first-of-type": {
	// 	borderLeft: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor || theme.palette.divider : "transparent"}`,
	// },
	position: "relative",
	padding: "0px 16px", // ✅ Sử dụng padding chung
	paddingLeft: `${$level * 30 + 20}px`, // ✅ Ghi đè padding-left để giữ cấu trúc tree

	// Đồng bộ màu nền khi hàng được hover
	"tbody tr:hover > &": {
		backgroundColor: `${theme.palette.action.hover} !important`,
	},

	// Đồng bộ với trạng thái selected của row (nếu có)
	"tbody tr.Mui-selected > &": {
		backgroundColor: "inherit",
	},
}));

export const TreeTableWithIconVerticalLine = styled("div", {
	shouldForwardProp: (prop) => prop !== "level",
})(({ theme, level = 0 }) => ({
	position: "absolute",
	left: `${level * 30 + 10}px`,
	top: 0,
	bottom: 0,
	pointerEvents: "none",

	width:
		theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px",
	// ✅ Sửa lỗi: Dùng màu text.secondary để đường kẻ đậm và dễ nhìn hơn
	borderLeft: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${theme.palette.text.secondary}`,
}));

export const TreeTableWithIconHorizontalLine = styled(Box, {
	shouldForwardProp: (prop) => prop !== "level",
})(({ theme, level = 1 }) => ({
	position: "absolute",
	left: `${(level - 1) * 30 + 10}px`,
	top: "50%",
	transform: "translateY(-50%)",
	pointerEvents: "none",

	width: "20px",
	height:
		theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px",
	// ✅ Sửa lỗi: Dùng màu text.secondary để đường kẻ đậm và dễ nhìn hơn
	borderBottom: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${theme.palette.text.secondary}`,
}));

export const TreeTableWithIconToggleButton = styled(IconButton)(({ theme }) => ({
	marginLeft: "-10px",
	width: "18px",
	height: "18px",
	flexShrink: 0,
	borderRadius: "1px",
	// border: `${theme.components?.MuiTableCell?.styleOverrides?.root?.borderWidth || "1px"} solid ${theme.palette.divider}`,
	fontSize: "12px",
	// display: "flex",
	// alignItems: "center",
	justifyContent: "center",
	cursor: "pointer",
	padding: "2px",
	backgroundColor: "inherit", // ✅ Sửa: Kế thừa màu nền từ cha
	"& .MuiSvgIcon-root": {
		fontSize: "1rem",
		color: theme.palette.text.primary, // ✅ Sửa lỗi: Dùng màu text chính để icon đậm hơn
	},
	"&:hover": {
		backgroundColor: alpha(theme.palette.primary.main, 0.1), // Thêm hover effect riêng cho button
	},
}));

export const NodeName = styled("span")({
	marginLeft: "8px",
	// backgroundColor: "inherit", // ✅ Sửa: Kế thừa màu nền từ cha
	padding: "8px 4px",
	borderRadius: "4px",
	flexGrow: 1,
});

export const TreeTableWithIconPaginationContainer = styled(Box)(({ theme }) => ({
	display: "flex",
	justifyContent: "flex-start",
	alignItems: "center",
	gap: theme.spacing(2),
	padding: "20px",
}));

export const TreeTableWithIconPaginationInfo = styled(Box)(({ theme }) => ({
	// display: "flex",
	// alignItems: "center",
	gap: theme.spacing(1),
}));

export const TreeTableWithIconRowsPerPageContainer = styled(Box)(({ theme }) => ({
	// display: "flex",
	// alignItems: "center",
	gap: theme.spacing(1),
}));

export const TreeTableWithIconStyledPagination = styled(Pagination)(({ theme }) => ({
	"& .MuiPaginationItem-root": {
		border: "none",
		borderRadius: 0,
		padding: "4px 8px",
		minWidth: "24px",
		height: "24px",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
	"& .Mui-selected": {
		backgroundColor: "transparent",
		color: theme.palette.primary.main,
		fontWeight: "bold",
	},
}));

export const TreeTableWithIconRowsPerPageSelect = styled(Select)({
	height: "24px",
});
export const TreeTableWithIconCellContent = styled("div")({
	display: "flex",
	alignItems: "center",
});

export const TreeTableWithIconCellContentContainer = styled(Box)(({ level }) => ({
	display: "flex",
	alignItems: "center",
	// gap: theme.spacing(1),
	paddingLeft: level * 20
}));

export const StyleIconFolder = styled(Folder)(({ isExpanded }) => ({
	color: isExpanded ? '#f9a825' : '#ffb300',
}));

export const StyleIconInsertDriveFile = styled(InsertDriveFile)(() => ({
	color:"#4285f4",
}));

export const ContainerCellContent = styled(Box)({
	display: "flex",
	alignItems: "center",
	gap: 1
});