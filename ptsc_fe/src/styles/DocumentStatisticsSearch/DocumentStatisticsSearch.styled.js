import { 
  Box, 
  DialogContent, 
  IconButton, 
  styled,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Typography,
} from "@mui/material";

// Wrapper bao bọc các controls tìm kiếm trong Dialog - nhóm input với các buttons
// Sử dụng flexbox để căn chỉnh các phần tử theo chiều ngang
export const StyledDialogSearchWrapper = styled(Box)(({ theme }) => ({
  display: "flex", // Hiển thị dạng flex để các phần tử xếp ngang
  alignItems: "center", // Căn giữa các phần tử theo chiều dọc
  gap: 0, // Không có khoảng cách giữa các phần tử (để buttons liền với input)
  overflow: "visible", // Cho phép dropdown filter hiển thị ra ngoài
  // Tablet (sm đến lg) - mở rộng để lấp đầy không gian còn lại
  [theme.breakpoints.between("sm", "lg")]: {
    flex: 1, // Chiếm toàn bộ không gian còn lại
    minWidth: 0, // Cho phép thu nhỏ khi cần thiết
  },
  // Mobile (nhỏ hơn sm) - chiều rộng 100%
  [theme.breakpoints.down("sm")]: {
    width: "100%", // Chiếm toàn bộ chiều rộng
  },
}));

// Wrapper cho ô input tìm kiếm trong dialog - responsive theo kích thước màn hình
// Input này sẽ có bo góc trái, không bo góc phải (để nối với buttons)
export const StyledSearchInputWrapper = styled(Box)(({ theme }) => ({
  display: "flex", // Sử dụng flexbox
  alignItems: "stretch", // Kéo dãn chiều cao bằng nhau
  "& .MuiInputBase-root": {
    borderTopRightRadius: 0, // Bỏ bo góc trên bên phải
    borderBottomRightRadius: 0, // Bỏ bo góc dưới bên phải
    width: 300, // Chiều rộng cố định 300px
    height: 40, // Chiều cao cố định 40px
  },
  // Desktop (lg trở lên) - chiều rộng cố định
  [theme.breakpoints.up("lg")]: {
    "& .MuiInputBase-root": {
      width: 300, // Giữ chiều rộng 300px
    },
  },
  // Tablet (sm đến lg) - mở rộng để lấp đầy không gian
  [theme.breakpoints.between("sm", "lg")]: {
    flex: 1, // Chiếm không gian còn lại
    minWidth: 0, // Cho phép thu nhỏ
    "& .MuiInputBase-root": {
      width: "100%", // Chiều rộng 100%
    },
  },
  // Mobile (nhỏ hơn sm) - chiều rộng 100%
  [theme.breakpoints.down("sm")]: {
    flex: 1, // Chiếm không gian còn lại
    "& .MuiInputBase-root": {
      width: "100%", // Chiều rộng 100%
    },
  },
}));

// Wrapper cho DatePicker trong dialog - kích thước gọn và responsive
// Giới hạn chiều rộng để DatePicker không quá lớn
export const StyledDatePickerWrapper = styled(Box)(({ theme }) => ({
  "& .MuiFormControl-root": {
    minWidth: 130, // Chiều rộng tối thiểu
    maxWidth: 200, // Chiều rộng tối đa
  },
  "& .MuiInputBase-root": {
    minWidth: 130, // Chiều rộng tối thiểu cho input
    maxWidth: 200, // Chiều rộng tối đa cho input
  },
  // Tablet (sm đến lg) - kích thước gọn hơn nhưng vẫn linh hoạt
  [theme.breakpoints.between("sm", "lg")]: {
    "& .MuiFormControl-root": {
      minWidth: 120, // Thu nhỏ chiều rộng tối thiểu
      maxWidth: 160, // Thu nhỏ chiều rộng tối đa
    },
    "& .MuiInputBase-root": {
      minWidth: 120,
      maxWidth: 160,
    },
  },
  // Mobile (nhỏ hơn sm) - nhỏ hơn một chút
  [theme.breakpoints.down("sm")]: {
    "& .MuiFormControl-root": {
      minWidth: 100, // Chiều rộng tối thiểu cho mobile
      maxWidth: 150, // Chiều rộng tối đa cho mobile
    },
    "& .MuiInputBase-root": {
      minWidth: 100,
      maxWidth: 150,
    },
  },
}));

// Button icon filter - ở giữa nhóm (giữa input và button search)
// Không bo góc, có viền nhưng bỏ viền trái để nối liền với input
export const StyledFilterIconButton = styled(IconButton)(({ theme }) => ({
  display: "flex", // Sử dụng flex để căn giữa icon
  alignItems: "center", // Căn giữa theo chiều dọc
  justifyContent: "center", // Căn giữa theo chiều ngang
  width: 40, // Chiều rộng 40px
  height: 40, // Chiều cao 40px (khớp với input)
  minHeight: 40, // Chiều cao tối thiểu
  border: `1px solid ${theme.palette.divider}`, // Viền 1px
  borderLeft: "none", // Bỏ viền trái (để nối liền với input)
  borderRadius: 0, // Không bo góc
  color: theme.palette.text.primary, // Màu text chính
 
  cursor: "pointer", // Con trỏ dạng pointer
 
}));

export const StyledTuneIconButton = styled(IconButton)(({ theme }) => ({
  display: "flex", // Sử dụng flex để căn giữa icon
  alignItems: "center", // Căn giữa theo chiều dọc
  justifyContent: "center", // Căn giữa theo chiều ngang
  width: 40, // Chiều rộng 40px
  height: 40, // Chiều cao 40px (khớp với input)
  minHeight: 40, // Chiều cao tối thiểu
  borderLeft: `1px solid ${theme.palette.divider}`, // Viền trái để tách với input
  borderRadius: 0, // Không bo góc
  color: theme.palette.text.primary, // Màu text chính
  padding: 0, // Loại bỏ padding mặc định
  cursor: "pointer", // Con trỏ dạng pointer
  "&:hover": {
    backgroundColor: theme.palette.action.hover, // Màu nền khi hover
  },
}));


// Button icon search - ở cuối nhóm (phía phải cùng)
// Bo góc phải, có nền màu primary
export const StyledSearchIconButton = styled(IconButton)(({ theme, borded }) => ({
  display: "flex", // Sử dụng flex để căn giữa icon
  alignItems: "center", // Căn giữa theo chiều dọc
  justifyContent: "center", // Căn giữa theo chiều ngang
  width: 40, // Chiều rộng 40px
  height: 40, // Chiều cao 40px (khớp với input)
  minHeight: 40, // Chiều cao tối thiểu
  borderTop:  `${borded ? "1px solid" : "none"} ${theme.palette.divider}`, // Viền trên (tùy thuộc vào prop)
  borderBottom: `${borded ? "1px solid" : "none"} ${theme.palette.divider}`, // Viền dưới
  borderRight: `${borded ? "1px solid" : "none"} ${theme.palette.divider}`, // Viền phải
  borderLeft: "none", // Bỏ viền trái
  borderTopLeftRadius: 0, // Không bo góc trên trái
  borderBottomLeftRadius: 0, // Không bo góc dưới trái
  borderTopRightRadius: 4, // Bo góc trên phải 4px
  borderBottomRightRadius: 4, // Bo góc dưới phải 4px
  backgroundColor: theme.palette.primary.main, // Nền màu primary
  color: "white", // Màu icon trắng
  cursor: "pointer", // Con trỏ dạng pointer
  "&:hover": {
    backgroundColor: theme.palette.primary.dark, // Màu nền tối hơn khi hover
  },
}));

// Box dropdown filter - hiển thị danh sách các cột có thể tìm kiếm
// Hiển thị dạng absolute, xuất hiện bên dưới button filter
export const SearchFilterBox = styled(Box)(({ theme }) => ({
  position: "absolute", // Định vị tuyệt đối
  top: "100%", // Đặt ngay dưới button
  right: 0, // Căn bên phải
  zIndex: 1001, // Layer cao để hiển thị trên các phần tử khác
  minWidth: 340, // Chiều rộng tối thiểu
  maxWidth: 380, // Chiều rộng tối đa
  padding: theme.spacing(1.75), // Padding bên trong
  display: "flex", // Sử dụng flexbox
  flexDirection: "column", // Sắp xếp theo chiều dọc
  gap: theme.spacing(1), // Khoảng cách giữa các phần tử
  boxShadow: theme.shadows[3], // Đổ bóng
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#fff", // Màu nền tùy theo theme
  border: `1px solid ${theme.palette.divider}`, // Viền
  borderRadius: 8, // Bo góc 8px
  marginTop: 4, // Khoảng cách với button
}));

// Tiêu đề của filter dropdown với icon
// Hiển thị text "Lọc tìm kiếm" cùng icon search
export const FilterTitle = styled(Box)(({ theme }) => ({
  display: "flex", // Sử dụng flexbox
  alignItems: "center", // Căn giữa theo chiều dọc
  gap: theme.spacing(0.5), // Khoảng cách giữa text và icon
  fontWeight: 600, // Font đậm
  fontSize: "0.9375rem", // Kích thước font 15px
  paddingBottom: theme.spacing(1.5), // Padding dưới
  marginBottom: theme.spacing(1.5), // Margin dưới
  color: theme.palette.text.primary, // Màu text chính
  borderBottom: `1px solid ${theme.palette.divider}`, // Đường viền dưới
  "& .MuiSvgIcon-root": {
    fontSize: "1.125rem", // Kích thước icon
    color: theme.palette.primary.main, // Màu icon primary
  },
}));

// Wrapper cho checkbox "Tất cả" - checkbox đầu tiên để chọn/bỏ chọn tất cả
// Có margin và padding riêng để tách biệt với các checkbox khác
export const FilterCheckboxAll = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(1.5), // Margin dưới
  paddingBottom: theme.spacing(0.5), // Padding dưới
  "& .MuiFormControlLabel-root": {
    margin: 0, // Bỏ margin mặc định
    "& .MuiCheckbox-root": {
      padding: theme.spacing(0.5), // Padding cho checkbox
    },
    "& .MuiTypography-root": {
      fontSize: "0.8125rem", // Kích thước font label
      fontWeight: 500, // Font hơi đậm
    },
  },
}));

// Grid layout cho các checkbox còn lại - hiển thị 2 cột
// Sử dụng CSS Grid để sắp xếp các checkbox thành 2 cột
export const FilterCheckboxGrid = styled(Box)(({ theme }) => ({
  display: "grid", // Sử dụng CSS Grid
  gridTemplateColumns: "repeat(2, 1fr)", // 2 cột bằng nhau
  gap: theme.spacing(0.75), // Khoảng cách giữa các ô
  marginBottom: theme.spacing(1.5), // Margin dưới
  "& .MuiFormControlLabel-root": {
    margin: 0, // Bỏ margin mặc định
    "& .MuiCheckbox-root": {
      padding: theme.spacing(0.5), // Padding cho checkbox
    },
    "& .MuiTypography-root": {
      fontSize: "0.8125rem", // Kích thước font label
    },
  },
}));

// Box chứa các nút hành động (Hủy, Áp dụng) ở cuối filter dropdown
// Căn bên phải, có khoảng cách giữa các button
export const FilterActionsBox = styled(Box)(({ theme }) => ({
  display: "flex", // Sử dụng flexbox
  justifyContent: "flex-end", // Căn về phía phải
  gap: theme.spacing(1), // Khoảng cách giữa các button
  paddingTop: theme.spacing(1.5), // Padding trên
  marginTop: theme.spacing(0.5), // Margin trên
}));

// Button "Hủy" - để đóng filter dropdown mà không áp dụng thay đổi
// Style dạng outlined, nền trắng, viền xám
export const FilterCancelButton = styled("button")(({ theme }) => ({
  textTransform: "none", // Không chuyển chữ hoa
  color: theme.palette.text.primary, // Màu text chính
  backgroundColor: theme.palette.mode === 'light' ? '#fff' : theme.palette.background.paper, // Nền trắng (light mode) hoặc nền paper (dark mode)
  border: `1px solid ${theme.palette.mode === 'light' ? '#e0e0e0' : theme.palette.divider}`, // Viền xám nhạt
  borderRadius: '5px', // Bo góc 5px
  padding: '8px 24px', // Padding trong button
  fontWeight: 400, // Font weight thường
  fontSize: '14px', // Kích thước font
  minWidth: '60px', // Chiều rộng tối thiểu
  cursor: "pointer", // Con trỏ dạng pointer
  "&:hover": {
    backgroundColor: theme.palette.action.hover, // Màu nền khi hover
    borderColor: theme.palette.mode === 'light' ? '#d0d0d0' : theme.palette.divider, // Màu viền khi hover
  },
}));

// Button "Áp dụng" - để áp dụng filter đã chọn
// Style dạng contained, nền màu primary
export const FilterApplyButton = styled("button")(({ theme }) => ({
  textTransform: "none", // Không chuyển chữ hoa
  backgroundColor: theme.palette.primary.main, // Nền màu primary
  color: '#fff', // Màu chữ trắng
  borderRadius: '5px', // Bo góc 5px
  padding: '8px 24px', // Padding trong button
  fontWeight: 400, // Font weight thường
  fontSize: '14px', // Kích thước font
  minWidth: '80px', // Chiều rộng tối thiểu
  boxShadow: 'none', // Không có shadow
  border: "none", // Không có viền
  cursor: "pointer", // Con trỏ dạng pointer
  "&:hover": {
    backgroundColor: theme.palette.primary.dark, // Màu nền tối hơn khi hover
    boxShadow: 'none', // Vẫn không có shadow khi hover
  },
}));

// Wrapper bao bọc button filter với định vị relative
// Cần thiết để dropdown filter (absolute) hiển thị đúng vị trí
export const FilterButtonWrapper = styled(Box)(() => ({
  position: "relative", // Định vị relative để làm anchor cho dropdown (absolute)
}));

// Dialog content với scrollbar ẩn - ẩn thanh cuộn nhưng vẫn giữ chức năng scroll
// Áp dụng cho các trình duyệt khác nhau: Firefox, IE/Edge, Chrome/Safari/Opera
export const StyledDialogContentNoScrollbar = styled(DialogContent)(() => ({
  height: "var(--dialog-content-height, auto)", // Chiều cao động từ CSS variable
  overflowY: "hidden", // Ẩn overflow theo chiều dọc
  paddingTop: "20px !important", // Padding trên cố định
  // Ẩn scrollbar nhưng vẫn giữ chức năng scroll cho các trình duyệt khác nhau
  scrollbarWidth: "none", // Firefox - ẩn scrollbar
  msOverflowStyle: "none", // IE và Edge - ẩn scrollbar
  "&::-webkit-scrollbar": {
    display: "none", // Chrome, Safari, Opera - ẩn scrollbar
  },
}));

// Container chính cho form tìm kiếm thống kê
// Có border màu đỏ, padding và bo góc
export const SearchContainer = styled(Box)(({ theme }) => ({
  padding: '24px', // Padding 24px
  border: `1px solid ${theme.palette.divider}`, // Border màu đỏ
  borderRadius: '4px', // Bo góc 4px
}));

export const TableContainer = styled(Box)(({ theme }) => ({ 
 marginTop: theme.spacing(2),
  padding: '24px', // Padding 24px
  border: `1px solid ${theme.palette.divider}`, // Border màu đỏ
  borderRadius: '4px', // Bo góc 4px
}));

// Tiêu đề "TRA CỨU THỐNG KÊ"
// Font đậm, margin bottom, có position relative để đặt nút bên phải
export const SearchTitle = styled(Box)(({ isCollapsed }) => ({
  marginBottom: isCollapsed ? '0px' : '16px', // Margin dưới 0px khi collapsed, 16px khi expanded
  fontWeight: 600, // Font đậm
  fontSize: '1.25rem', // Kích thước font h6
  lineHeight: 1.6, // Line height
  position: 'relative', // Position relative để SearchTitleActions absolute hoạt động đúng
  display: 'flex', // Flexbox để căn chỉnh
  alignItems: 'center', // Căn giữa theo chiều dọc
}));

// Row chứa tiêu đề và các action buttons
// Display flex để đặt title và buttons vào 2 đầu
export const SearchTitleRow = styled(Box)(() => ({
  display: 'flex', // Flexbox
  alignItems: 'center', // Căn giữa theo chiều dọc
  justifyContent: 'space-between', // Title bên trái, buttons bên phải
  marginBottom: '16px', // Margin dưới 16px
}));

// Text tiêu đề
export const SearchTitleText = styled(Box)(() => ({
  fontWeight: 600, // Font đậm
  fontSize: '1.25rem', // Kích thước font h6
  lineHeight: 1.6, // Line height
}));

// Wrapper cho các action buttons (collapse và dropdown)
// Khi inline với button - absolute position bên phải
export const SearchTitleActions = styled(Box)(() => ({
  display: 'flex', // Flexbox
  alignItems: 'center', // Căn giữa
  gap: '8px', // Khoảng cách giữa các buttons
  position: 'absolute', // Absolute positioning
  right: 0, // Căn bên phải
}));

// Action button (vuông, icon button)
export const SearchActionButton = styled('button')(({ theme }) => ({
  display: 'flex', // Flexbox
  alignItems: 'center', // Căn giữa icon
  justifyContent: 'center', // Căn giữa icon
  width: '32px', // Chiều rộng 32px
  height: '32px', // Chiều cao 32px
  padding: 0, // Không padding
  border: `1px solid ${theme.palette.divider}`, // Viền
  borderRadius: '4px', // Bo góc 4px
  backgroundColor: 'transparent', // Nền trong suốt
  color: theme.palette.text.primary, // Màu icon
  cursor: 'pointer', // Con trỏ pointer
  transition: 'background-color 0.2s', // Transition khi hover
  '&:hover': {
    backgroundColor: theme.palette.action.hover, // Màu nền khi hover
  },
  '& .MuiSvgIcon-root': {
    fontSize: '20px', // Kích thước icon
  },
}));

// Dropdown menu cho "Xuất Excel"
export const SearchDropdownMenu = styled(Box)(({ theme }) => ({
  position: 'absolute', // Định vị absolute
  top: 'calc(100% + 4px)', // Đặt ngay dưới button
  right: 0, // Căn bên phải
  zIndex: 1000, // Layer cao
  minWidth: '150px', // Chiều rộng tối thiểu
  padding: '8px 0', // Padding trên dưới
  backgroundColor: theme.palette.mode === 'dark' ? '#1e293b' : '#fff', // Màu nền
  border: `1px solid ${theme.palette.divider}`, // Viền
  borderRadius: '4px', // Bo góc
  boxShadow: theme.shadows[3], // Đổ bóng
}));

// Menu item trong dropdown
export const SearchDropdownMenuItem = styled('button')(({ theme }) => ({
  width: '100%', // Chiều rộng 100%
  padding: '8px 16px', // Padding
  border: 'none', // Không viền
  backgroundColor: 'transparent', // Nền trong suốt
  color: theme.palette.text.primary, // Màu text
  fontSize: '14px', // Font size
  textAlign: 'left', // Căn trái
  cursor: 'pointer', // Con trỏ pointer
  transition: 'background-color 0.2s', // Transition
  '&:hover': {
    backgroundColor: theme.palette.action.hover, // Màu nền khi hover
  },
}));

// Wrapper cho dropdown button (relative positioning)
export const SearchDropdownWrapper = styled(Box)(() => ({
  position: 'relative', // Định vị relative cho dropdown menu
}));

// Wrapper cho search bar
// Margin bottom để tách khỏi form fields
export const SearchBarWrapper = styled(Box)(() => ({
  marginBottom: '16px', // Margin dưới 16px
}));

// Wrapper cho button "Tra cứu" và action buttons
// Button Tra cứu ở giữa, action buttons ở bên phải cùng hàng
export const SearchButtonWrapper = styled(Box)(() => ({
  marginTop: '24px', // Margin trên 24px
  display: 'flex', // Flexbox row
  justifyContent: 'center', // Căn giữa nội dung
  alignItems: 'center', // Căn giữa theo chiều dọc
  position: 'relative', // Để action buttons absolute positioning
  gap: '16px', // Khoảng cách
}));

// Styled Button với min width
// Button "Tra cứu" có chiều rộng tối thiểu
export const SearchButton = styled('button')(({ theme }) => ({
  minWidth: '120px', // Chiều rộng tối thiểu
  padding: '8px 24px', // Padding
  backgroundColor: theme.palette.primary.main, // Màu nền primary
  color: '#fff', // Màu chữ trắng
  border: 'none', // Không viền
  borderRadius: '5px', // Bo góc
  fontSize: '14px', // Font size
  fontWeight: 500, // Font weight
  cursor: 'pointer', // Con trỏ pointer
  textTransform: 'none', // Không chuyển chữ hoa
  '&:hover': {
    backgroundColor: theme.palette.primary.dark, // Màu nền tối hơn khi hover
  },
}));

// ====================
// Table Styled Components
// ====================

// Styled TableContainer với margin top và nền theo theme
export const StyledTableContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  borderRadius: '4px',
  overflow: 'auto',
}));

// Styled Table với size nhỏ
export const StyledTable = styled(Table)(({ theme }) => ({
  width: '100%',
  borderCollapse: 'collapse',
  backgroundColor: theme.palette.background.paper,
}));

// Styled TableHead với nền theo theme
export const StyledTableHead = styled(TableHead)(({
    theme
}) => ({
  position: "sticky",
  top: 0,
  zIndex: 1000,
 backgroundColor:
    theme.components?.MuiTableHead?.styleOverrides?.root?.backgroundColor ||
    theme.palette.background.paper,
}));

// Styled TableRow cho header với chiều cao cố định
export const StyledTableHeaderRow = styled(TableRow)(() => ({
  height: '58px',
  
}));

// Styled TableRow cho body với chiều cao cố định và màu nền xen kẽ
export const StyledTableBodyRow = styled(TableRow)(({ theme, index }) => ({
  color: theme.palette.text.primary,
  height: '65px',
  backgroundColor: "inherit",
  "tbody &": {
    backgroundColor:
      index % 2 !== 0
        ? theme.palette.table?.rowOdd ||
          (theme.palette.mode === "dark" ? "#2c3e50" : "#F9F9F9")
        : theme.palette.table?.rowEven || theme.palette.background.paper,
    "&:hover": {
      backgroundColor: `${theme.palette.action.hover} !important`,
    },
  },
}));

// Styled TableCell cho header với border và style đậm
export const StyledTableHeaderCell = styled(TableCell)(({ theme }) => ({
   backgroundColor:
    theme.components?.MuiTableHead?.styleOverrides?.root?.backgroundColor ||
    theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  // color: theme.palette.primary.main,
  fontSize: '16px',
  fontWeight: 'bold',
  textAlign: 'center',
  whiteSpace: 'nowrap',
  padding: theme.spacing(1),
}));

// Styled TableCell cho body với border
export const StyledTableBodyCell = styled(TableCell)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  fontWeight: 500,
  textAlign: 'center',
  padding: theme.spacing(1),
  color: theme.palette.text.primary,

}));

// Styled TableBody
export const StyledTableBody = styled(TableBody)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
}));

// Styled cell cho hàng "Không có dữ liệu"
export const StyledEmptyCell = styled(TableCell)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(4, 0),
  textAlign: 'center',
  color: theme.palette.text.secondary,
  minHeight: '116px',
}));

 
export const SecondaryText = styled(Typography)(({ theme }) => ({
  marginTop: theme.spacing(1),
  color: theme.palette.text.secondary,
}));

// Warning Container - Container cho thông báo không hỗ trợ màn hình nhỏ
export const WarningContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '60vh',
  padding: theme.spacing(4),
  textAlign: 'center',
  backgroundColor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#fafafa',
}));

// Warning Icon Box - Box chứa icon cảnh báo
export const WarningIconBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '80px',
  height: '80px',
  borderRadius: '50%',
  backgroundColor: theme.palette.mode === 'dark' ? '#332b00' : '#fff3cd',
  marginBottom: theme.spacing(3),
  '& .MuiSvgIcon-root': {
    fontSize: '48px',
    color: theme.palette.mode === 'dark' ? '#ffeb3b' : '#ff9800',
  },
}));

// Warning Title - Tiêu đề thông báo
export const WarningTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  fontSize: '1.5rem',
  marginBottom: theme.spacing(2),
  color: theme.palette.text.primary,
}));

// Warning Message - Nội dung thông báo chính
export const WarningMessage = styled(Typography)(({ theme }) => ({
  fontSize: '1rem',
  marginBottom: theme.spacing(1.5),
  color: theme.palette.text.primary,
  maxWidth: '500px',
}));

// Warning Secondary Message - Nội dung phụ của thông báo
export const WarningSecondaryMessage = styled(Typography)(({ theme }) => ({
  fontSize: '0.875rem',
  color: theme.palette.text.secondary,
  maxWidth: '500px',
}));
