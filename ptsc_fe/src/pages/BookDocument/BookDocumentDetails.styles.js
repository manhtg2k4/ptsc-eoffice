
import { styled } from '@mui/material/styles';
import { FormControlLabel } from '@mui/material';
import { 
  SkyBox, 
  SkyGrid, 
  SkyTypography 
} from '@styles/SkyStyles';

// Container chính cho toàn bộ nội dung
export const DetailsContainer = styled(SkyBox)(() => ({
  // padding: theme.spacing(2),
}));

// Container cho màn hình loading
export const LoadingContainer = styled(SkyBox)({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '200px',
});

// Grid cho hàng chứa các trường thông tin ở dưới
export const BottomFieldsGrid = styled(SkyGrid)(({ theme }) => ({
  marginTop: theme.spacing(0),
}));

// Grid item chứa checkbox "Hoạt động"
export const CheckboxGridItem = styled(SkyGrid)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
});

// FormControlLabel đã được style cho checkbox "Hoạt động"
export const StyledCheckboxLabel = styled(FormControlLabel)(() => ({
//   marginTop: theme.spacing(2.25), // ~18px
//   whiteSpace: 'nowrap',
//   // Responsive cho màn hình nhỏ hơn
//   [theme.breakpoints.down('md')]: {
//     marginTop: 0,
//   },
}));

// Tiêu đề cho bảng "Danh sách văn bản"
export const TableTitle = styled(SkyTypography)({
  variant: 'h6',
});

// Ghi đè style của TableContainer bên trong CustomTable để bật scrollbar ngang
export const TableWrapper = styled(SkyBox)(({ isSmallScreen }) => ({
  // Nhắm vào container của bảng và bật overflow
  width: '100%',
  height: isSmallScreen ?'72vh' : null,
  overflow: 'auto',
  '& .MuiTableContainer-root': {
    overflow: 'auto', // Bật cả cuộn ngang và dọc
    maxHeight: isSmallScreen ? 'calc(100vh - 320px)' : 'calc(100vh - 450px)', // Giới hạn chiều cao của bảng, bạn có thể điều chỉnh giá trị này
    // Đảm bảo scrollbar hiển thị đẹp hơn trên các hệ điều hành khác nhau
    '&::-webkit-scrollbar': { height: '8px' },
    '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '4px' },
  },
}));

export const ContainerBoxInput = styled(SkyBox)(({ theme, isSmallScreen }) => ({
  display: isSmallScreen ? "flex" : "none",
  justifyContent: "flex-end",
  marginBottom: theme.spacing(1),
}));

export const SectionBox = styled(SkyBox)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper, // Nền trắng (hoặc tối tùy theme)
  borderRadius: 7,
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  border: `1px solid ${theme.palette.divider}`, // Thêm viền
}));