import { styled } from "@mui/material/styles";
import {
  Box,
  Paper,
  Divider,
  TextField,
  Select,
  Grid,
  Typography,
  Button,
  InputLabel,
  FormControlLabel,
  Dialog,
} from "@mui/material";
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';

export const StyledColorInput = styled("input")(({ theme }) => ({
  width: "100px",
  height: "40px",
  border: "none",
  cursor: "pointer",
  borderRadius: "4px",
  backgroundColor: "transparent",
  [theme.breakpoints.down("sm")]: {
    width: "80px", // Thu nhỏ chiều rộng
    height: "32px", // Thu nhỏ chiều cao
  },
}));

export const PageContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  display: "flex",
  justifyContent: "center",
}));

export const StyledPaper = styled(Paper)(({ theme }) => ({
  width: "100%",
  padding: theme.spacing(2),
  boxShadow: theme.shadows[8],
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
}));

export const HeaderBox = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap", // Cho phép xuống hàng
  [theme.breakpoints.down("md")]: {
    flexDirection: "column",
    justifyContent: "center",
    gap: theme.spacing(2),
  },
}));

export const HeaderButtonContainer = styled(Box)({
  display: "flex",
  flexWrap: "wrap", // Cho phép nút xuống hàng
  justifyContent: "center",
  gap: "8px", // Sử dụng gap để tạo khoảng cách đồng đều
  alignItems: "center",
  // ✅ Thêm style cho các nút con để chúng có cùng chiều rộng
  "& .MuiButton-root": {
    minWidth: "180px",
    height: "36.5px", // ✅ Đặt chiều cao cố định cho các nút
  },
});

export const StyledDivider = styled(Divider)(({ theme }) => ({
  margin: theme.spacing(2, 0),
}));

export const ConfigTextField = styled(TextField)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));

export const GlobalTransformSelect = styled(Select)(({ theme }) => ({
  marginLeft: theme.spacing(2),
  minWidth: 150,
}));

export const InputConfigGrid = styled(Grid)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

export const ConfigSectionSubheader = styled(Typography)({
  fontWeight: "bold",
});

export const ResetButton = styled(Button)(({ theme }) => ({
  // Tương đương variant="outlined" color="primary"
  borderColor: theme.palette.primary.main,
  color: theme.palette.primary.main,
  borderWidth: "1px",
  borderStyle: "solid",
  borderRadius: theme.shape.borderRadius,
  "&:hover": {
    backgroundColor: theme.palette.action.hover, // Sử dụng màu hover chung cho nhất quán
    borderColor: theme.palette.primary.dark,
  },
}));

export const ColumnGrid = styled(Grid)(({ theme }) => ({
  // Tương đương item xs={12} md={6}
  padding: theme.spacing(2), // spacing={4} -> padding 16px
  [theme.breakpoints.up("xs")]: { flexBasis: "100%", maxWidth: "100%" },
  [theme.breakpoints.up("md")]: { flexBasis: "50%", maxWidth: "50%" },
}));

export const ColorPickerGrid = styled(Grid)(({ theme }) => ({
  alignItems: "center",
  flexBasis: "50%", // Luôn chiếm 50%
  maxWidth: "50%", // Luôn chiếm 50%
  padding: theme.spacing(1.5), // Padding mặc định
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(0.5, 0), // Giảm mạnh padding trên màn hình nhỏ
  },
}));

export const ColorPickerWrapper = styled(Box)(({ theme }) => ({
  display: "flex", // Sử dụng flex để căn chỉnh
  justifyContent: "flex-start", // Căn trái mặc định
  [theme.breakpoints.up("sm")]: {
    justifyContent: "flex-start", // Vẫn căn trái trên màn hình lớn
  },
  [theme.breakpoints.down("sm")]: {
    justifyContent: "flex-end", // Đẩy ô màu về cuối (bên phải)
  },
}));

export const CenteredGridContainer = styled(Grid)(() => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between", // Luôn giữ space-between
  width: "100%",
  margin: 0,
}));

export const FullWidthGridItem = styled(Grid)({
  flexBasis: "100%",
  maxWidth: "100%",
});

export const HalfWidthGridItem = styled(Grid)(({ theme }) => ({
  [theme.breakpoints.down("sm")]: {
    flexBasis: "100%",
    maxWidth: "100%",
    display: "flex",
    justifyContent: "center",
  },
  [theme.breakpoints.up("sm")]: {
    flexBasis: "50%",
    maxWidth: "50%",
  },
}));

export const MarginControlBox = styled(Box)({
  width: "100%",
});

export const PageWrapper = styled(Box)(() => ({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  width: "100%", // Đảm bảo chiếm toàn bộ chiều rộng của phần tử cha
  maxWidth: "none", // Loại bỏ bất kỳ giới hạn chiều rộng tối đa nào
}));
export const StickyHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  position: "sticky",
  top: 0,
  zIndex: 1100,
  backgroundColor: theme.palette.background.paper,
  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
}));
export const PageTitle = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.primary,
}));
export const ContentWrapper = styled(Box)(({ theme }) => ({
  flex: 1,
  overflowY: "auto",
  padding: theme.spacing(0,2), // Giảm padding, chỉ giữ lại một chút ở hai bên
  paddingTop: 0,
}));
export const CenterInputLabel = styled(InputLabel)(() => ({
  "&:not(.Mui-focused):not(.MuiFormLabel-filled)": {
    transform: "translate(14px, 10px) scale(1)",
    textAlign: "center",
    width: "calc(100% - 28px)",
  },
}));
export const PreviewGridItem = styled(Grid)(({ theme }) => ({
  textAlign: "center",
  marginTop: theme.spacing(2),
  flexBasis: "30%", // Chiếm khoảng 1/3 không gian
}));
export const PreviewBox = styled(Box)(({ theme }) => ({
  borderRadius: "4px",
  overflow: "hidden",
  marginTop: theme.spacing(1),
  marginLeft: "auto",
  marginRight: "auto",
}));
export const FormControlLabelStyled = styled(FormControlLabel)(({ theme }) => ({
  padding: 12,
  marginTop: theme.spacing(2),
  // ✅ Thêm khoảng cách khi label được đặt ở bên trái (start)
  "& .MuiFormControlLabel-labelPlacementStart": {
    // Target phần control (Select, Switch,...) bên trong
    "& > .MuiSelect-root, & > .MuiSwitch-root": {
      marginLeft: theme.spacing(1), // Thêm margin-left 8px
    },
  },
}));
export const CropContainer = styled(Box)(() => ({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  maxHeight: "70vh",
  overflow: "auto",
}));
export const SaveConfigButton = styled(Button)(({ theme }) => ({
  [theme.breakpoints.down(670)]: {
    // Không cần margin nữa vì đã có gap
  },
}));
export const TopConfigGrid = styled(Grid)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(2), // spacing={2}
  [theme.breakpoints.down("md")]: {
    flexDirection: "column",
    alignItems: "stretch",
  },
}));
export const ActionButtonsGrid = styled(Grid)(({ theme }) => ({
  justifyContent: "center", // ✅ Căn giữa các nút hành động
  gap: theme.spacing(1),
  [theme.breakpoints.down("sm")]: {
    justifyContent: "center",
    flexWrap: "wrap",
  },
}));
export const CreateNewButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
}));
export const BorderColorContainer = styled(CenteredGridContainer)(
  ({ theme }) => ({
    marginTop: theme.spacing(1),
  })
);

export const BorderWidthBox = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  paddingLeft: "12px",
  paddingRight: "12px",
}));
export const MarginControlBoxStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== "mlValue",
})(({ mlValue }) => ({
  marginLeft: mlValue || 0,
}));

export const FlexGridItem = styled(Grid)(() => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center", // ✅ Căn giữa nội dung
}));

export const LogoGrid = styled(Grid)(({ theme }) => ({
  marginTop: theme.spacing(2),
  textAlign: "center",
}));

export const LogoImage = styled("img")(({ divider }) => ({
  maxWidth: "120px",
  maxHeight: "120px",
  border: `1px solid ${divider}`,
}));

export const DenseTextField = styled(TextField)(({ theme }) => ({
  marginTop: theme.spacing(1), // thay cho margin dense
  marginBottom: theme.spacing(1),
}));

export const ErrorButton = styled(Button)(({ theme }) => ({
  color: theme.palette.error.main,
  borderColor: theme.palette.error.main,
  "&:hover": {
    color: theme.palette.error.dark,
    borderColor: theme.palette.error.dark,
  },
}));
export const LargeDialog = styled(Dialog)(() => ({}));

// maxWidth sẽ được set trong styled hoặc wrapper, không dùng prop
export const FlexStartGrid = styled(Grid)(({ theme }) => ({
  display: "flex",
  justifyContent: "center", // ✅ Căn giữa các nút tải ảnh trên màn hình lớn
  flexWrap: "wrap", // Cho phép các item xuống hàng
  gap: theme.spacing(1), // spacing={1}
  // ✅ Thêm responsive cho các nút tải ảnh
  [theme.breakpoints.down(692)]: {
    flexDirection: "column",
    alignItems: "stretch", // Các nút sẽ có chiều rộng bằng nhau
  },
  // ✅ Căn giữa các button bên trong Grid item
  "> .MuiGrid-item": {
    textAlign: "center",
  },
}));

export const PreviewContainer = styled(Grid)(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: theme.spacing(2),
  width: "100%",
}));
export const PreviewImageWrapper = styled(Box, {
  shouldForwardProp: (prop) => prop !== "boxWidth" && prop !== "boxHeight",
})(({ theme, boxWidth, boxHeight }) => ({
  borderRadius: "4px",
  overflow: "hidden",
  marginTop: theme.spacing(1),
  marginLeft: "auto",
  marginRight: "auto",
  border: `1px solid ${theme.palette.divider}`,
  width: boxWidth,
  height: boxHeight,
}));

export const PreviewImg = styled("img")({
  width: "100%",
  height: "100%",
  objectFit: "contain",
  display: "block", // ✅ Loại bỏ khoảng trắng thừa dưới ảnh
});

export const CancelButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.error.main,
  color: theme.palette.error.contrastText,
  "&:hover": {
    backgroundColor: theme.palette.error.dark,
  },
}));

export const SectionHeader = styled(Box)(({ theme }) => ({
	display: 'flex',
	alignItems: 'center',
	gap: theme.spacing(1),
	paddingBottom: theme.spacing(1.5),
	marginBottom: theme.spacing(2),
	// borderBottom: `1px solid ${theme.palette.divider}`,
}));

export const SectionHeaderIcon = styled(DescriptionRoundedIcon)(({ theme }) => ({
	color: theme.palette.primary.main,
	fontSize: '22px',
}));

