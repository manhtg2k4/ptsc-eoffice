import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';
import { SkyBox } from '@styles/SkyStyles';

export const DropZoneBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isSmall' && prop !== 'mode',
})(({ theme, mode, isSmall }) => ({
  display: mode === 'builder' ? 'flex' : 'none', // ✅ Ẩn hoàn toàn khi không ở builder mode
  alignItems: 'center',
  minHeight: isSmall ? 32 : 70,
  justifyContent: 'center',
  border: `2px dashed ${theme.palette.primary.main}`,
  borderRadius: theme.spacing(1),
  bgcolor: theme.palette.action.hover,
  ...(isSmall && {
    padding: '0 8px',
    fontSize: '11px',
    margin: '4px 0',
    cursor: 'pointer',
    width: 'auto',
  }),
  [theme.breakpoints.down('md')]: {
    marginRight: -11,
  },
   [theme.breakpoints.down('lg')]: {
    marginRight: -11,
  },
  [theme.breakpoints.down(1300)]: {
    marginRight: -11,
  },
}));

export const DraggableItemBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isDraggingOver' && prop !== 'mode',
})(({ theme, mode, isDraggingOver }) => ({
  display: 'flex',
  alignItems: 'center',
  minHeight: 32,
  marginTop: 'auto',
  position: 'relative',
  cursor: mode === 'builder' ? 'grab' : 'default',
  border: isDraggingOver ? `2px dashed ${theme.palette.primary.main}` : "none",
}));

export const SubtabRowWrapper = styled(Box)({
  display: 'flex',
  width: "100%",
  marginBottom: '8px',
});

export const SubtabChildrenBox = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== 'subtabChildrenLength' && prop !== 'mode',
})(({ theme, subtabChildrenLength, mode }) => ({
  display: subtabChildrenLength || mode === "builder" ? "flex" : "none",
  width: "100%",
  alignItems: "flex-end",
  justifyContent: "space-between",
  flexShrink: 0,
  flexWrap: 'wrap',
  gap: theme.spacing(1), 
  overflowX: 'auto',
  overflowY: 'hidden',
  // padding: theme.spacing(1, 0),
  // marginBottom: theme.spacing(1),
  '&::-webkit-scrollbar': {
    height: '4px',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: '10px',
  },
  '&:hover::-webkit-scrollbar-thumb': {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
}));

export const TableContentCard = styled(Box, {
  shouldForwardProp: (prop) =>
    prop !== 'hasLeftTabs' &&
    prop !== 'hasRightTabs' &&
    prop !== 'isCustomFeature',
})(({ theme, hasLeftTabs, hasRightTabs}) => ({
    backgroundColor: theme.palette.mode === 'light' ? '#fff' : theme.palette.background.paper,

  borderBottomLeftRadius: "16px",
  borderBottomRightRadius: "16px",
  borderTopLeftRadius: hasLeftTabs ? 0 : "16px",
  borderTopRightRadius: hasRightTabs ? 0 : "16px",
  // margin: theme.spacing(0, 2, 2, 2),
  padding: theme.spacing(2.5),
  boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  overflow: 'hidden',
}));

export const TabLayoutStyle = styled(Box, {
  shouldForwardProp: (prop) => prop !== "isFullscreen" && prop !== "isTitleHidden",
})(({ theme, isFullscreen, isTitleHidden }) => ({
  width: "100%",
  display: 'flex',
  flexDirection: 'column',
  height: isFullscreen ? '100vh' : (isTitleHidden ? 'calc(100vh - 90px)' : 'calc(100vh - 120px)'),
  minHeight: isFullscreen ? '100vh' : '600px',
  overflow: 'hidden',
  ...(isFullscreen
    ? {
        position: "fixed",
        inset: 0,
        zIndex: theme.zIndex.modal + 1,
        backgroundColor: theme.palette.background.paper,
        padding: theme.spacing(2),
      }
    : null),
}));

export const SearchChildrenBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'searchChildrenLength' && prop !== 'mode' && prop !== 'isDialogKey',
})(({ theme, searchChildrenLength, mode, isDialogKey }) => ({
  display: searchChildrenLength || mode === "builder" || isDialogKey ? "flex" : "none",
  width: "100%",
  justifyContent: isDialogKey ? "flex-end" : "space-between",
  flexWrap: "wrap",
  gap: theme.spacing(2),
  flexShrink: 0, // ✅ Không cho co lại
  // marginTop: theme.spacing(1), // ✅ Khoảng cách với table
  [theme.breakpoints.down('md')]: {
    flexDirection: 'column',
  },
}));

export const FlexBox = styled(Box)(({ theme }) => ({
  flex: "1 1 auto",
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: theme.spacing(2),
}));


export const FlexGrowBox = styled(Box)({
  flexGrow: 1,
});

export const SpaceBetweenBox = styled(Box)({
  display: "flex",
  width: "100%",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: 1,
});

export const IconBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isFullscreen',
})(({ isFullscreen }) => ({
  ml: 1,
  display: "flex",
  alignItems: "end",
  gap: 1,
  ...(isFullscreen && {
    marginLeft: 'auto',
  }),
}));

export const IconBoxButton = styled(Box)({
  marginTop: 'auto'
});
export const TableDropZoneBox = styled(Box)(({theme}) => ({
  minHeight: 120,
  width: "100%",
  display: 'flex',
  flexDirection: 'column',
  flex: '1 1 auto',
  overflow: 'auto', // Default: cho phép scroll cả 2 chiều
  marginTop: theme.spacing(1), 
  // Mobile: chỉ scroll ngang, ẩn scroll dọc
  [theme.breakpoints.down("sm")]: {
    overflowX: 'auto',
    overflowY: 'hidden',
  },
}));

export const PaginationWrapper = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isNoPadding',
})(({ theme, isNoPadding }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
  padding: isNoPadding ? 0 : theme.spacing(1.5, 2),
  flexShrink: 0, // ✅ QUAN TRỌNG: Không cho pagination bị co lại
  // minHeight: '60px', // ✅ Chiều cao tối thiểu để luôn hiển thị
  marginTop: theme.spacing(2), // ✅ Thêm khoảng cách trên pagination
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.spacing(1),
  // boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
  // border: `1px solid ${theme.palette.divider}`,
  zIndex: 10,
  position: 'sticky',
  bottom: 0,
  "& > div": {
    width: "100%",
  },
}));

export const ColumnActionsV4 = styled(Box, {
  shouldForwardProp: (prop) => ![
    'isminHeight', 
    'isminWidth',
    'iswidth',
    'isposition',
    'iscursor', 
    'istransition', 
    'isborder',
    'isoutline',
    'isFlex'
  ].includes(prop),
})(({ 
  isminHeight, 
  isminWidth,
  iswidth,
  isposition,
  iscursor, 
  istransition, 
  isborder,
  isoutline,
  isFlex
}) => ({
  minHeight: isminHeight,
  minWidth: isminWidth,
  width: iswidth,
  position: isposition,
  cursor: iscursor,
  transition: istransition,
  border: isborder,
  outline: isoutline,
  flex: isFlex,
}));

export const EmptyColumnBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isborder',
})(({ theme, isborder }) => ({
  textAlign: "center",
  color: "#aaa",
  width: "100%",
  minHeight: 120,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: isborder,
  bgcolor: theme.palette.action.hover,
}));
