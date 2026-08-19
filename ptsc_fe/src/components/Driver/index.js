import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import dayjs from 'dayjs';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import {
  Box,
  Button,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Tooltip,
  Menu,
  MenuItem,
  Breadcrumbs,
  CircularProgress,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  ListItemIcon,
  ListItemText,
  TextField,
  Popover,
  Checkbox,
  FormControlLabel,
  Backdrop,
} from '@mui/material';
import {
  FilterPopoverContent,
  PopoverTitle,
  FilterActions,
  InputClearIcon,
} from '@pages/MeetingCalendar/componentStyle/MeetingManagement.styles';
import AddIcon from '@mui/icons-material/Add';
// import { apiUploadFile } from "@services/FileUpload/fileUpload";
import { useToast } from "@components/common/ToastProvider";
import axiosInstance from '@utils/axiosInstance';
import api from "@services/api";
import { API_MANAGEMENT_FODER, API_CHECK_PERMISSION_FOLDER, API_ARCHIVE_FOLDER, APP_BASE, API_CHANGE_FOLDER_POSITION, API_VIEW_FILE, API_XLSX_TO_PDF, API_MARK_IMPORTANT_DOCUMENT, API_DOWNLOAD_FILE, API_DOWNLOAD_FILE_ALL_ZIP } from '@EnvironmentFile/constants/urlConfig';
import Addfoder from './Addfoder';
import AddSubFolder from './AddSubFolder';
import FilePreviewDialog from "@components/UploadFile/components/FilePreviewDialog";
// import FolderIcon from '@mui/icons-material/Folder';
import GridViewIcon from '@mui/icons-material/GridView';
import ListIcon from '@mui/icons-material/List';
// import FilterAltIcon from '@mui/icons-material/FilterAlt';
import TuneIcon from "@builder-table/components/TuneIcon";
import FilterListIcon from "@mui/icons-material/FilterList";
// import UploadFileIcon from '@mui/icons-material/UploadFile';
// import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
// import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
// import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
// import PanToolIcon from '@mui/icons-material/PanTool';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
// import StarBorderIcon from '@mui/icons-material/StarBorder';
import { Search } from '@mui/icons-material';
import OtherDocumentPanel from './OtherDocumentPanel';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import MenuIcon from '@mui/icons-material/Menu';
import LockIcon from '@mui/icons-material/Lock';
import ShareIcon from '@mui/icons-material/Share';
import CustomDialog from '@components/CustomDialog/CustomDialog';
import { useInView } from 'react-intersection-observer';
import { RenameFolderDialog, UpdatePermissionsDialog } from './UpdateFolderDialog';

const Container = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const Header = styled(Box)`
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-top: 26px;
  margin-bottom: 12px;
`;

const LeftGroup = styled(Box)`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const GridWrap = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  flex-grow: 1;
  overflow-y: auto;
  padding: 16px;
  align-content: start;
  position: relative;
  user-select: none;
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const GridItem = styled.div`
  background: #fff;
  border-radius: 8px;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  border: 1px solid #f0f0f0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
  cursor: ${props => (props.$isReordering && props.$isFolder) ? 'grab' : 'pointer'};
  user-select: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  width: 100%;
  box-sizing: border-box;

  ${props => props.$isSelected && `
    border-color: #1976d2;
    background: #f0f7ff !important;
    box-shadow: 0 0 0 1px #1976d2;
  `}

  ${props => props.$isDragTarget && `
    border: 2px dashed #1976d2 !important;
    background: #e3f2fd !important;
    transform: scale(1.03);
  `}

  &:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    border-color: #1976d2;
    transform: translateY(-2px);
    background: #fff;
  }
`;

const BreadcrumbBar = styled(Box)`
  padding: 8px 12px;
  margin-bottom: 12px;
`;

const RightBox = styled(Box)`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StyledUploadBackdrop = styled(Backdrop)`
  && {
    color: #fff;
    z-index: 3000; /* theme.zIndex.drawer + 2000 */
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
`;

const StyledUploadProgress = styled(CircularProgress)`
  color: inherit;
`;

const StyledDownloadProgress = styled(CircularProgress)`
  margin-left: 8px;
`;

const StyledUploadText = styled(Typography)`
  && {
    color: white;
  }
`;



// --- Custom Styles for Search/Filter Row ---
const SearchBarWrapper = styled(Box)`
  display: flex;
  align-items: center;
  height: 40px;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  background-color: #fff;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
`;

const FilterLabel = styled(Box)`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  height: 100%;
  border-right: 1px solid #e0e0e0;
  color: #151618ff;
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
  transition: background 0.15s;
  &:hover {
    background: #f5f8ff;
  }
`;

const SearchInput = styled.input`
  flex: 1;
  border: none;
  outline: none;
  padding: 0 12px;
  font-size: 0.9375rem;
  font-family: inherit;
  color: #333;
  background: transparent;
  min-width: 0;
  &::placeholder {
    color: #aaa;
  }
`;

const SearchBarDivider = styled.div`
  width: 1px;
  height: 22px;
  background: #e0e0e0;
  flex-shrink: 0;
`;

const SearchBarIconButton = styled(IconButton)`
  && {
    border-radius: 0;
    height: 40px;
    width: 38px;
    padding: 8px;
    color: rgb(99, 115, 129);
    flex-shrink: 0;
    &:hover {
      background-color: rgba(0, 0, 0, 0.04);
    }
  }
`;

const CustomSearchButton = styled(Button)`
  && {
    min-width: 44px;
    height: 40px;
    border-radius: 12px;
    background-color: #1976d2;
    color: #fff;
    padding: 0;
    box-shadow: none;
    border: 1px solid #1976d2;
    & :hover {
      background-color: #1565c0;
      border-color: #1565c0;
      box-shadow: none;
    }
  }
`;

const SearchBox = styled(Box)`
  display: flex;
  align-items: center;
  height: 40px;
  gap: 8px;
`;

// const CustomSearchOptionIconButton = styled(IconButton)`
//   && {
//     border-radius: 0;
//     height: 38px;
//     width: 40px;
//     border-left: 1px solid #e0e0e0;
//     padding: 8px;
//     color: rgb(99, 115, 129);
//     &:hover {
//       background-color: rgba(0, 0, 0, 0.04);
//     }
//   }
// `;
// -------------------------------------------

const NameText = styled(Typography)`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const GridNameText = styled(Typography)`
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.4;
  height: 2.8em;
  font-size: 1rem !important;
  font-weight: 500;
  color: #333;
`;

// Custom SVG Folder Icons
const FolderSvgNormal = ({ className }) => (
  <svg className={className} viewBox="0 0 88 82" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M6.28175 0C4.61573 0 3.01794 0.661825 1.83988 1.83988C0.661825 3.01794 0 4.61573 0 6.28175V31.4087C0 29.7427 0.661825 28.1449 1.83988 26.9669C3.01794 25.7888 4.61573 25.127 6.28175 25.127V23.5566C6.28175 21.8905 6.94358 20.2928 8.12163 19.1147C9.29969 17.9366 10.8975 17.2748 12.5635 17.2748H75.381C77.047 17.2748 78.6448 17.9366 79.8229 19.1147C81.0009 20.2928 81.6628 21.8905 81.6628 23.5566V25.127C83.3288 25.127 84.9266 25.7888 86.1046 26.9669C87.2827 28.1449 87.9445 29.7427 87.9445 31.4087V16.1127C87.9445 14.4467 87.2827 12.8489 86.1046 11.6708C84.9266 10.4928 83.3288 9.83094 81.6628 9.83094H36.621C36.1185 9.83094 35.6364 9.6205 35.2972 9.24988L34.7632 8.66567L34.1727 8.02022L33.5807 7.37477L28.7029 2.04157C28.1144 1.3983 27.3984 0.884575 26.6005 0.533091C25.8027 0.181607 24.9404 5.90511e-05 24.0685 0H6.28175Z" fill="#F2994A"/>
    <path d="M0 31.3989C0 29.7329 0.661825 28.1351 1.83988 26.9571C3.01794 25.779 4.61573 25.1172 6.28175 25.1172H81.6628C83.3288 25.1172 84.9266 25.779 86.1046 26.9571C87.2827 28.1351 87.9445 29.7329 87.9445 31.3989V75.3712C87.9445 77.0372 87.2827 78.635 86.1046 79.8131C84.9266 80.9911 83.3288 81.6529 81.6628 81.6529H6.28175C4.61573 81.6529 3.01794 80.9911 1.83988 79.8131C0.661825 78.635 0 77.0372 0 75.3712V31.3989Z" fill="#F2C94C"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M12.561 17.2734C10.895 17.2734 9.29724 17.9353 8.11918 19.1133C6.94112 20.2914 6.2793 21.8892 6.2793 23.5552V25.1256H81.6603V23.5552C81.6603 21.8892 80.9985 20.2914 79.8204 19.1133C78.6424 17.9353 77.0446 17.2734 75.3785 17.2734H12.561Z" fill="#F2F2F2"/>
  </svg>
);

const FolderSvgLocked = ({ className  }) => (
  <svg className={className} viewBox="0 0 88 82" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M6.28175 0C4.61573 0 3.01794 0.661825 1.83988 1.83988C0.661825 3.01794 0 4.61573 0 6.28175V31.4087C0 29.7427 0.661825 28.1449 1.83988 26.9669C3.01794 25.7888 4.61573 25.127 6.28175 25.127V23.5566C6.28175 21.8905 6.94358 20.2928 8.12163 19.1147C9.29969 17.9366 10.8975 17.2748 12.5635 17.2748H75.381C77.047 17.2748 78.6448 17.9366 79.8229 19.1147C81.0009 20.2928 81.6628 21.8905 81.6628 23.5566V25.127C83.3288 25.127 84.9266 25.7888 86.1046 26.9669C87.2827 28.1449 87.9445 29.7427 87.9445 31.4087V16.1127C87.9445 14.4467 87.2827 12.8489 86.1046 11.6708C84.9266 10.4928 83.3288 9.83094 81.6628 9.83094H36.621C36.1185 9.83094 35.6364 9.6205 35.2972 9.24988L34.7632 8.66567L34.1727 8.02022L33.5807 7.37477L28.7029 2.04157C28.1144 1.3983 27.3984 0.884575 26.6005 0.533091C25.8027 0.181607 24.9404 5.90511e-05 24.0685 0H6.28175Z" fill="#F2994A"/>
    <path d="M0 31.3989C0 29.7329 0.661825 28.1351 1.83988 26.9571C3.01794 25.779 4.61573 25.1172 6.28175 25.1172H81.6628C83.3288 25.1172 84.9266 25.779 86.1046 26.9571C87.2827 28.1351 87.9445 29.7329 87.9445 31.3989V75.3712C87.9445 77.0372 87.2827 78.635 86.1046 79.8131C84.9266 80.9911 83.3288 81.6529 81.6628 81.6529H6.28175C4.61573 81.6529 3.01794 80.9911 1.83988 79.8131C0.661825 78.635 0 77.0372 0 75.3712V31.3989Z" fill="#F2C94C"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M12.565 17.2734C10.8989 17.2734 9.30114 17.9353 8.12309 19.1133C6.94503 20.2914 6.2832 21.8892 6.2832 23.5552V25.1256H81.6642V23.5552C81.6642 21.8892 81.0024 20.2914 79.8243 19.1133C78.6463 17.9353 77.0485 17.2734 75.3825 17.2734H12.565Z" fill="#F2F2F2"/>
    <path d="M33.5055 69.792C32.5458 69.792 31.7245 69.4506 31.0416 68.7677C30.3588 68.0849 30.0168 67.263 30.0156 66.3021V48.8528C30.0156 47.8931 30.3576 47.0718 31.0416 46.389C31.7257 45.7061 32.5469 45.3641 33.5055 45.363H35.2504V41.8731C35.2504 39.4593 36.1014 37.402 37.8032 35.7013C39.5051 34.0005 41.5624 33.1496 43.9751 33.1484C46.3877 33.1473 48.4456 33.9982 50.1486 35.7013C51.8517 37.4043 52.702 39.4616 52.6997 41.8731V45.363H54.4447C55.4044 45.363 56.2262 45.705 56.9102 46.389C57.5942 47.073 57.9357 47.8943 57.9345 48.8528V66.3021C57.9345 67.2618 57.5931 68.0837 56.9102 68.7677C56.2274 69.4517 55.4055 69.7931 54.4447 69.792H33.5055ZM43.9751 61.0673C44.9348 61.0673 45.7566 60.7259 46.4407 60.0431C47.1247 59.3602 47.4661 58.5383 47.4649 57.5775C47.4638 56.6166 47.1223 55.7953 46.4407 55.1136C45.759 54.4319 44.9371 54.0899 43.9751 54.0876C43.013 54.0853 42.1917 54.4273 41.5112 55.1136C40.8307 55.8 40.4887 56.6212 40.4852 57.5775C40.4817 58.5337 40.8237 59.3556 41.5112 60.0431C42.1987 60.7306 43.02 61.072 43.9751 61.0673ZM38.7403 45.363H49.2099V41.8731C49.2099 40.419 48.7009 39.183 47.683 38.1651C46.6652 37.1472 45.4292 36.6383 43.9751 36.6383C42.521 36.6383 41.285 37.1472 40.2671 38.1651C39.2492 39.183 38.7403 40.419 38.7403 41.8731V45.363Z" fill="white"/>
  </svg>
);

// Custom File Type Icon Components - Large Size
const FileIconLarge = styled.div`
  width: 110px;
  height: 110px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 800;
  color: white;
  background-color: ${props => props.$bgColors || '#1976d2'};
  box-shadow: 0 4px 8px rgba(0,0,0,0.12);
  text-transform: uppercase;
`;

const FileIconSmall = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  color: white;
  background-color: ${props => props.$bgColors || '#1976d2'};
`;

const IconContainer = styled(Box)`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const GridIconContainer = styled(Box)`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 160px;
  flex-shrink: 0;
`;

const StyledLockIconInline = styled(LockIcon)`
  font-size: 0.9rem;
  color: #637381;
`;

const NameTextWrapper = styled(Box)`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const MarqueeOverlay = styled.div`
  position: absolute;
  left: ${props => props.$mLeft}px;
  top: ${props => props.$mTop}px;
  width: ${props => props.$mWidth}px;
  height: ${props => props.$mHeight}px;
  border: 2px solid #1976d2;
  background-color: rgba(25, 118, 210, 0.15);
  pointer-events: none;
  z-index: 1000;
  box-sizing: border-box;
`;

// const DangerButton = styled(Button)`
//   && {
//     color: #d32f2f;
//     border-color: rgba(211,47,47,0.2);
//     &:hover { border-color: rgba(211,47,47,0.4); background: rgba(211,47,47,0.04); }
//   }
// `;
const FolderIconLarge = styled(FolderSvgNormal)`
  width: 130px;
  height: 120px;
`;

const FolderLockedIconLarge = styled(FolderSvgLocked)`
  width: 130px;
  height: 120px;
`;

const FolderIconSmall = styled(FolderSvgNormal)`
  width: 28px;
  height: 26px;
`;

const FolderLockedIconSmall = styled(FolderSvgLocked)`
  width: 28px;
  height: 26px;
`;
const LoadMoreSentinel = ({ canLoadMore, onLoadMore, isLoading }) => {
 const { ref, inView } = useInView({
  threshold: 0,           // Chỉ trigger khi thực sự có phần tử giao với viewport
  rootMargin: '100px 0px', // Tăng lên để tránh trigger quá sớm (hoặc thử 1000px)
  triggerOnce: false,
});

  useEffect(() => {
    if (inView && canLoadMore && !isLoading) {
      onLoadMore();
    }
  }, [inView, canLoadMore, onLoadMore, isLoading]);

  // The sentinel is a div that spans the full width of the grid
  return <div ref={ref} style={{ height: 1, gridColumn: '1 / -1' }} />;
};


// const FileTypeCaption = styled(Typography)`
//   color: rgba(0,0,0,0.6);
// `;

const StyledDeselectButton = styled(Button)`
  && {
    white-space: nowrap;
    background-color: #1976d2;
    padding: 8px 16px;
    height: 40px;
    border-radius: 12px;
    box-shadow: none;
    text-transform: none;
    font-weight: 400;
    &:hover {
      background-color: #1565c0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    &.Mui-disabled {
      background-color: rgba(25, 118, 210, 0.12);
      color: rgba(0, 0, 0, 0.26);
    }
  }
`;

const StyledSelectAllButton = styled(Button)`
  && {
    white-space: nowrap;
    background-color: #1976d2;
    color: white;
    padding: 8px 16px;
    height: 40px;
    border-radius: 12px;
    box-shadow: none;
    text-transform: none;
    font-weight: 400;
    &:hover {
      background-color: #1565c0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
  }
`;

const StyledSelectButton = styled(Button)`
  && {
    white-space: nowrap;
    background-color: #1976d2;
    color: white;
    padding: 8px 16px;
    height: 40px;
    border-radius: 12px;
    box-shadow: none;
    text-transform: none;
    font-weight: 400;
    &:hover {
      background-color: #1565c0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
  }
`;

const StyledSortButton = styled(Button)`
  && {
    white-space: nowrap;
    background-color: #1976d2;
    color: white;
    padding: 8px 16px;
    height: 40px;
    border-radius: 12px;
    box-shadow: none;
    text-transform: none;
    font-weight: 400;
    &:hover {
      background-color: #1565c0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
  }
`;

const StyledShareButton = styled(Button)`
  && {
    white-space: nowrap;
    background-color: ${props => props.active ? '#1565c0' : 'transparent'};
    color: ${props => props.active ? 'white' : '#1976d2'};
    border: ${props => props.active ? '1px solid #1565c0' : '1px solid #1976d2'};
    padding: 8px 16px;
    height: 40px;
    border-radius: 12px;
    box-shadow: ${props => props.active ? 'inset 0 2px 4px rgba(0,0,0,0.2)' : 'none'};
    text-transform: none;
    font-weight: 400;
    &:hover {
      background-color: ${props => props.active ? '#1565c0' : 'rgba(25, 118, 210, 0.04)'};
      border: ${props => props.active ? '1px solid #1565c0' : '1px solid #1976d2'};
      box-shadow: ${props => props.active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};
    }
  }
`;

const LoadMoreBox = styled(Box)`
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  padding: 16px 0;
  width: 100%;
`;

const ContentContainer = styled(Box)`
  display: flex;
  gap: 16px;
  flex: 1;
  min-height: 0; /* Fix for flexbox scrolling */
`;

const MainPanel = styled(Box)`
  flex: 1;
  display: flex; /* Chuyển thành flex container */
  flex-direction: column; /* Sắp xếp các mục con theo chiều dọc */
`;

const StyledBreadcrumbLink = styled(Link)`
  cursor: pointer;
`;

const StyledActiveBreadcrumb = styled(Typography)`
  color: rgba(0, 0, 0, 0.87);
`;

const StyledRenamingTextField = styled(TextField)`
  width: 100%;
  & .MuiInputBase-input {
    text-align: center;
  }
`;

const RenamingInput = ({ value, onChange, onCommit, onCancel, itemId }) => {
  const handleChange = useCallback((e) => {
    onChange(e.target.value);
  }, [onChange]);

  const handleBlur = useCallback(() => {
    onCommit(itemId);
  }, [onCommit, itemId]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      onCommit(itemId);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  }, [onCommit, onCancel, itemId]);

  const handleFocus = useCallback((e) => e.target.select(), []);
  const handleStopPropagation = useCallback((e) => e.stopPropagation(), []);

  return (
    <StyledRenamingTextField
      size="small"
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      autoFocus
      onFocus={handleFocus}
      onClick={handleStopPropagation}
      onMouseDown={handleStopPropagation}
    />
  );
};

const StyledTableRow = styled(TableRow)`
  &.Mui-selected {
    background-color: #e3f2fd !important;
  }
  &:hover {
    background-color: #f5faff !important;
  }
`;

const NameCellContent = styled(Box)`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TableLoadMore = styled(Box)`
  display: flex;
  justify-content: center;
  padding: 16px;
`;

const SidePanelWrapper = styled(Box)`
  width: 400px;
  flex-shrink: 0;
`;

const StyledTableContainer = styled(TableContainer)`
  flex-grow: 1; /* Cho phép co giãn để lấp đầy không gian */
  overflow-y: auto; /* Đảm bảo container của bảng có thể cuộn */
`;

const HeaderCellName = styled(TableCell)`
  width: 40%;
`;

const HeaderCellDate = styled(TableCell)`
  width: 20%;
`;

const HeaderCellOwner = styled(TableCell)`
  width: 20%;
`;

const HeaderCellAction = styled(TableCell)`
  width: 20%;
  text-align: center;
`;

const StyledActionMenuIcon = styled(MenuIcon)`
  font-size: 1.25rem;
  color: #1976d2;
`;

const StyledTuneIcon = styled(TuneIcon)`
  font-size: 1.5rem;
`;

const StyledSearchIcon = styled(Search)`
  font-size: 1.5rem;
`;

// const StyledFilterAltIcon = styled(FilterAltIcon)`
//   font-size: 1.4rem;
// `;

const StyledFilterListIcon = styled(FilterListIcon)`
  && {
    font-size: 1.2rem;
    margin-left: 4px;
    color: #1976d2;
  }
`;

const StyledInputClearIcon = styled(InputClearIcon)`
  font-size: 1.2rem;
`;

// const SearchBoxActions = styled(Box)`
//   display: flex;
//   align-items: center;
// `;

const FilterPopoverWrapper = styled(Box)`
  display: flex;
  flex-direction: column;
`;

const FilterPopoverWrapperWithMargin = styled(Box)`
  display: flex;
  flex-direction: column;
  margin-top: 8px;
`;

const FilterActionsGroup = styled(Box)`
  display: flex;
  gap: 8px;
`;

const StyledConfirmReorderButton = styled(Button)`
  && {
    height: 40px;
    white-space: nowrap;
    margin-right: 8px;
    background-color: #1976d2;
    color: white;
    text-transform: none;
    font-weight: 400;
    &:hover {
      background-color: #1565c0;
    }
  }
`;

// const StyledSearchIconButton = styled(IconButton)`
//   && {
//     color: #919EAB;
//   }
// `;

// const StyledDownloadMenuItemIcon = styled(DownloadIcon)`
//   font-size: 1.25rem;
//   margin-right: 8px;
// `;

// const StyledStarMenuItemIcon = styled(StarBorderIcon)`
//   font-size: 1.25rem;
//   margin-right: 8px;
// `;

const StyledArrowUpwardIcon = styled(ArrowUpwardIcon)`
  font-size: 1.25rem;
`;

const StyledArrowDownwardIcon = styled(ArrowDownwardIcon)`
  font-size: 1.25rem;
`;

const StyledToggleButtonGroup = styled(ToggleButtonGroup)`
  .MuiToggleButton-root.Mui-selected {
    background-color: #1976d2;
    color: white;
    &:hover {
      background-color: #1565c0;
    }
  }
`;
export const ExportActionButton = styled(Button)(() => ({
  minWidth: "40px",
  height: "40px",
  padding: "0 14px",
  borderRadius: "12px",
  backgroundColor: "#ffffff",
  color: "#5A6573",
  border: `1px solid #d0d5dd`,
  boxShadow: "0px 1px 2px rgba(16, 24, 40, 0.05)",
  textTransform: "none",
  fontWeight: 400,
  whiteSpace: "nowrap",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  "&:hover": {
    backgroundColor: "#f5f7fa",
    color: "#3a4450",
    border: `1px solid #b0b8c4`,
    boxShadow: "0px 1px 3px rgba(16, 24, 40, 0.1)",
  },
  "& svg": {
    color: "#5A6573",
    fill: "#5A6573",
  },
}));

const StyledActionIconButton = styled(Button)`
  && {
    white-space: nowrap;
    background-color: #1976d2;
    color: white;
    padding: 8px 16px;
    height: 40px;
    border-radius: 12px;
    box-shadow: none;
    text-transform: none;
    font-weight: 400;
    &:hover {
      background-color: #1565c0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
  }
`;

const StyledDeleteButton = styled(Button)`
  && {
    white-space: nowrap;
    background-color: #d32f2f;
    color: white;
    padding: 8px 16px;
    height: 40px;
    border-radius: 12px;
    box-shadow: none;
    text-transform: none;
    font-weight: 400;
    &:hover {
      background-color: #c62828;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    &.Mui-disabled {
      background-color: rgba(211, 47, 47, 0.12);
      color: rgba(255, 255, 255, 0.3);
    }
  }
`;

const PAGE_SIZE = 50;

// Helper function to get the appropriate icon component based on file category
const getFileIcon = (item, size = 'large') => {
  if (item.type === 'folder') {
    const isLocked = !item.canView && !item.canEdit;
    if (size === 'large') {
      return isLocked  ? <FolderLockedIconLarge />
    : <FolderIconLarge />;
    }
    return isLocked  ? <FolderLockedIconSmall />
  : <FolderIconSmall />;
  }
  
  const category = item.fileCategory || 'FILE';
  
  if (size === 'large') {
    switch (category) {
      case 'PDF':
        return <FileIconLarge $bgColors="#d32f2f">PDF</FileIconLarge>;
      case 'WORD':
        return <FileIconLarge $bgColors="#2196f3">W</FileIconLarge>;
      case 'EXCEL':
        return <FileIconLarge $bgColors="#4caf50">E</FileIconLarge>;
      case 'POWERPOINT':
        return <FileIconLarge $bgColors="#ff9800">P</FileIconLarge>;
      case 'IMAGE':
        return <FileIconLarge $bgColors="#9c27b0">IMG</FileIconLarge>;
      default:
        return <FileIconLarge $bgColors="#1976d2">F</FileIconLarge>;
    }
  } else {
    switch (category) {
      case 'PDF':
        return <FileIconSmall $bgColors="#d32f2f">PDF</FileIconSmall>;
      case 'WORD':
        return <FileIconSmall $bgColors="#2196f3">W</FileIconSmall>;
      case 'EXCEL':
        return <FileIconSmall $bgColors="#4caf50">E</FileIconSmall>;
      case 'POWERPOINT':
        return <FileIconSmall $bgColors="#ff9800">P</FileIconSmall>;
      case 'IMAGE':
        return <FileIconSmall $bgColors="#9c27b0">IMG</FileIconSmall>;
      default:
        return <FileIconSmall $bgColors="#1976d2">F</FileIconSmall>;
    }
  }
};

const SortIconSvg = () => (
  <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5.66797 9.20833V3.1875C5.66797 2.90571 5.77991 2.63546 5.97917 2.4362C6.17843 2.23694 6.44868 2.125 6.73047 2.125C7.01226 2.125 7.28251 2.23694 7.48177 2.4362C7.68103 2.63546 7.79297 2.90571 7.79297 3.1875V8.5M7.79297 8.14583V6.72917C7.79297 6.44737 7.90491 6.17712 8.10417 5.97787C8.30342 5.77861 8.57368 5.66667 8.85547 5.66667C9.13726 5.66667 9.40751 5.77861 9.60677 5.97787C9.80603 6.17712 9.91797 6.44737 9.91797 6.72917V8.5M9.91797 7.4375C9.91797 7.15571 10.0299 6.88546 10.2292 6.6862C10.4284 6.48694 10.6987 6.375 10.9805 6.375C11.2623 6.375 11.5325 6.48694 11.7318 6.6862C11.931 6.88546 12.043 7.15571 12.043 7.4375V8.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12.0426 8.14954C12.0426 7.86775 12.1545 7.5975 12.3538 7.39824C12.553 7.19898 12.8233 7.08704 13.1051 7.08704C13.3869 7.08704 13.6571 7.19898 13.8564 7.39824C14.0556 7.5975 14.1676 7.86775 14.1676 8.14954V11.337C14.1676 12.4642 13.7198 13.5452 12.9228 14.3422C12.1257 15.1393 11.0447 15.587 9.91757 15.587H8.50091H8.64824C7.94439 15.5872 7.25154 15.4125 6.63189 15.0787C6.01223 14.7449 5.48519 14.2624 5.09807 13.6745L4.95924 13.462C4.73824 13.123 3.96238 11.7705 2.63166 9.40471C2.49597 9.16354 2.45973 8.87896 2.53064 8.61148C2.60154 8.34401 2.77399 8.11475 3.01132 7.97246C3.26422 7.82115 3.56036 7.75849 3.85287 7.79441C4.14538 7.83034 4.41755 7.96278 4.62632 8.17079L5.66757 9.21204M1.80078 3.96613C2.34441 3.56878 2.92848 3.22997 3.54328 2.95533M9.91757 2.45312C10.8401 2.70024 11.7201 3.08519 12.5278 3.59496" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const FilterIconSvg = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 3H2L10 12.46V19L14 21V12.46L22 3Z" stroke="#151618ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const DownloadIconSvg = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1.2998 12.6703L1.2998 9.99031C1.2998 9.62027 1.59978 9.32031 1.9698 9.32031C2.33983 9.32031 2.6398 9.62027 2.6398 9.99031L2.6398 12.6703L2.64307 12.7364C2.65828 12.8898 2.72612 13.0341 2.83609 13.144C2.96175 13.2697 3.13211 13.3403 3.3098 13.3403L12.6898 13.3403C12.8675 13.3403 13.0379 13.2697 13.1635 13.144C13.2892 13.0184 13.3598 12.848 13.3598 12.6703L13.3598 9.99031C13.3598 9.62027 13.6598 9.32027 14.0298 9.32031C14.3998 9.32031 14.6998 9.62027 14.6998 9.99031L14.6998 12.6703C14.6998 13.2034 14.4879 13.7145 14.1109 14.0914C13.734 14.4684 13.2229 14.6803 12.6898 14.6803L3.3098 14.6803C2.77672 14.6803 2.26562 14.4684 1.88867 14.0914C1.5589 13.7617 1.35535 13.3293 1.30962 12.8692L1.2998 12.6703Z" fill="currentColor"/>
    <path d="M10.9266 6.13471C11.1898 5.92007 11.5777 5.93521 11.823 6.18051C12.0683 6.4258 12.0835 6.81374 11.8689 7.07691L11.823 7.1279L8.47303 10.4779C8.21139 10.7396 7.78728 10.7396 7.52565 10.4779L4.17563 7.1279L4.12982 7.07691C3.91519 6.81374 3.93032 6.4258 4.17563 6.18051C4.42093 5.93521 4.80886 5.92007 5.07201 6.13471L5.12305 6.18051L7.99934 9.05676L10.8756 6.18051L10.9266 6.13471Z" fill="currentColor"/>
  </svg>
);

const getFileCategoryFromFileName = (fileName) => {
  const lower = (fileName || '').toLowerCase();
  if (lower.endsWith('.pdf')) return 'PDF';
  if (lower.endsWith('.doc') || lower.endsWith('.docx')) return 'WORD';
  if (lower.endsWith('.xls') || lower.endsWith('.xlsx') || lower.endsWith('.csv')) return 'EXCEL';
  if (lower.endsWith('.ppt') || lower.endsWith('.pptx')) return 'POWERPOINT';
  if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'].some(ext => lower.endsWith(ext))) return 'IMAGE';
  return 'FILE';
};

export default function Driver({ onOpen , onDownload,  }) {
  const [items, setItems] = useState([]);
  const toast = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [downloadingIds, setDownloadingIds] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [view, setView] = useState('grid');

  const [query, setQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  
  // Sort
  const [sortConfig, setSortConfig] = useState({ key: 'name', order: 'asc' });
  const [sortMenuAnchorEl, setSortMenuAnchorEl] = useState(null);

  // Selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const lastSelectedIndex = useRef(null);

  // Marquee selection (kéo khung chọn)
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState({ x: 0, y: 0 });
  const [marqueeCurrent, setMarqueeCurrent] = useState({ x: 0, y: 0 });
  const gridContainerRef = useRef(null);

  // Context menu
  const [contextMenu, setContextMenu] = useState(null);

  // Filter & Search Popovers
  const [searchAnchorEl, setSearchAnchorEl] = useState(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [searchCriteria, setSearchCriteria] = useState({ all: true, name: true });
  const [filterCriteria, setFilterCriteria] = useState({ all: true, personal: false, sharedWithMe: false });

  // Rename
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, targetIds: [] });

  // Action menu
  const [anchorElAction, setAnchorElAction] = useState(null);
  const [actionItem, setActionItem] = useState(null);

  // File viewing
  const [viewingFile, setViewingFile] = useState({
    open: false,
    url: null,
    name: "",
    type: null,
  });

  // File input
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  // Add folder dialog state
  const [isAddFolderOpen, setIsAddFolderOpen] = useState(false);
  const [anchorElAdd, setAnchorElAdd] = useState(null);

  // Update dialogs state
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);

  // Current folder
  const [currentFolderId, setCurrentFolderId] = useState(null); // null for root

  // Permission state
  const [hasPermission, setHasPermission] = useState(false);

  // Reordering state
  const [isReordering, setIsReordering] = useState(false);
  const [openLockConfirm, setOpenLockConfirm] = useState(false);
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  // Move file to folder state
  const [moveFileConfirm, setMoveFileConfirm] = useState({ open: false, file: null, targetFolder: null });
  const [isMovingFile, setIsMovingFile] = useState(false);
  const [dragOverFolderId, setDragOverFolderId] = useState(null);

  // Breadcrumbs
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'Thư viện tài liệu dùng chung', canEdit: false }]);

  const currentFolderCanEdit = useMemo(() => {
    if (breadcrumbs.length > 0) {
      return breadcrumbs[breadcrumbs.length - 1].canEdit;
    }
    return false;
  }, [breadcrumbs]);

  const canManageCurrentFolder = hasPermission || currentFolderCanEdit;

  const canModifyItem = useCallback((item) => {
    if (!item) return false;
    if (hasPermission) return true; // Cán bộ CNTT có full quyền

    const isParentFolder = item.type === 'folder' && !item.parentId;
    if (isParentFolder) return false; // Không được sửa/xóa thư mục cha (Root)

    // Nếu họ là Owner của item này, họ có quyền
    if (item.isOwner) {
      return true;
    }

    // Nếu họ có quyền Edit kế thừa từ một thư mục cha (ancestor)
    // (Được backend tính toán thông qua thuộc tính inheritedEditAccess)
    if (item.inheritedEditAccess) {
      return true;
    }

    // Fallback: Nếu backend chưa có thuộc tính inheritedEditAccess (đang fetch),
    // kiểm tra tạm thời thông qua breadcrumbs
    if (breadcrumbs && breadcrumbs.length > 0) {
      const currentCrumb = breadcrumbs[breadcrumbs.length - 1];
      if (currentCrumb.canEdit) {
        return true;
      }
    }

    return false; // Thư mục/File được chia sẻ trực tiếp -> không có quyền xóa/sửa chính nó
  }, [hasPermission, breadcrumbs]);

  const canManagePermissionsItem = useCallback((item) => {
    if (!item) return false;
    if (hasPermission) return true; // Cán bộ CNTT có full quyền

    if (item.canShare !== undefined) {
      return item.canShare;
    }

    if (item.isOwner || item.inheritedEditAccess) {
      return true;
    }

    return false;
  }, [hasPermission]);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleCloseActionMenu = useCallback(() => setAnchorElAction(null), []);

  const handleRenameDialogClose = useCallback(() => {
    setIsRenameDialogOpen(false);
    setActionItem(null);
  }, []);

  const handlePermissionsDialogClose = useCallback(() => {
    setIsPermissionsDialogOpen(false);
    setActionItem(null);
  }, []);

  // Tìm root ID của thư mục hiện tại để loại trừ khỏi danh sách "Bộ tài liệu khác"
  const currentRootId = useMemo(() => {
    return breadcrumbs.length > 1 ? breadcrumbs[1].id : currentFolderId;
  }, [breadcrumbs, currentFolderId]);

  const fetchPermission = useCallback(async () => {
    try {
      const response = await axiosInstance.get(API_CHECK_PERMISSION_FOLDER);
      // Kiểm tra nếu response chính là dữ liệu mong muốn (do axiosInstance interceptor)
      const result = response?.data?.data ? response.data : response;
      const permissionValue = result?.hasPermission ?? result?.data?.hasPermission ?? false;
      setHasPermission(permissionValue);
    } catch (error) {
      logger.error("Check permission error:", error);
      setHasPermission(false);
    }
  }, []);

  const fetchItems = useCallback(async (fetchPage, reset = false) => {
    setIsLoading(true);
    try {
      const params = {
        page: fetchPage,
        limit: PAGE_SIZE,
        'sort[key]': sortConfig.key,
        'sort[order]': sortConfig.order,
      };
      
      let foldersUrl = API_MANAGEMENT_FODER;
      if (currentFolderId) {
        if (query) {
          params.parentId = currentFolderId;
        } else {
          foldersUrl = `${API_MANAGEMENT_FODER}/${currentFolderId}`;
        }
      } else {
        if (filterCriteria.personal) {
          params['filter[isPersonal]'] = true;
        }
        if (filterCriteria.sharedWithMe) {
          params['filter[sharedWithMe]'] = true;
        }
      }
      
      if (query) {
        if (searchCriteria.all || searchCriteria.name) {
          params['filter[name]'] = query;
        }
        // Add other filters here if needed
      }

      // 1) Fetch Folders (from document-library API)
      const foldersResponse = await axiosInstance.get(foldersUrl, { params });
      
      let newFolders = [];
      if (Array.isArray(foldersResponse)) {
        newFolders = foldersResponse;
      } else {
        const result = foldersResponse?.data?.data ? foldersResponse.data : foldersResponse;
        newFolders = result?.children || result?.data || (Array.isArray(result) ? result : []);
      }
      
      // Mark as folder/file based on type column
      newFolders = newFolders.map(f => {
        const type = f.type || 'folder';
        if (type === 'file') {
          const fileName = f.name || '';
          return {
            ...f,
            type: 'file',
            fileType: f.fileType || fileName.split('.').pop() || 'file',
            fileCategory: getFileCategoryFromFileName(fileName),
            createdAt: f.createdAt || '--',
            owner: f.owner || '--',
          };
        }
        return {
          ...f,
          type: 'folder'
        };
      });
      
      // Client-side sort by sortOrder if we are using the default sort (name) or if implied
      // The user wants 'sortOrder' to take precedence for display
      if (sortConfig.key === 'name' && sortConfig.order === 'asc') {
        newFolders.sort((a, b) => {
          // Treat undefined/null sortOrder as large number so they go to bottom?
          // Or if user says "2222ttt" should be 2nd, and it has 2. Presumably something else has 1.
          const orderA = (a.sortOrder !== null && a.sortOrder !== undefined) ? a.sortOrder : 9999999;
          const orderB = (b.sortOrder !== null && b.sortOrder !== undefined) ? b.sortOrder : 9999999;
          
          if (orderA !== orderB) {
            return orderA - orderB;
          }
          return (a.name || "").localeCompare(b.name || "");
        });
      }

      // 2) Fetch Files (matching the pattern in ViewJob, but for document-library)
      let newFiles = [];
      const folderId = currentFolderId || 'root';
      const filesParams = {
        'object_type': 'document-library',
        "object_id": folderId
      };
      if (query) {
        filesParams['file_name'] = query;
      }
      const filesResponse = await axiosInstance.get(`${APP_BASE}/api/files/by-object`, {
        params: filesParams
      });
      
      const allFiles = Array.isArray(filesResponse) ? filesResponse : [];
      newFiles = allFiles.map(f => {
        const fileName = f.file_name || f.name || '';
        
        return {
          ...f,
          id: f.id || f._id,
          name: f.file_name || f.name,
          type: 'file',
          fileType: fileName.split('.').pop(),
          fileCategory: f.fileTypeCategory || 'FILE', // Sử dụng fileTypeCategory từ API
          createdAt: f.created_at ? dayjs(f.created_at).format('DD/MM/YYYY HH:mm') : '--',
          owner: f.created_by_name || '--',
          canView: true, // Mặc định có quyền xem nếu ở trong folder cha
          canEdit: true, // Mặc định có quyền hành động
        };
      });

      // Filter out files that are already retrieved through the document-library API to prevent duplicates
      const newFoldersFileIds = new Set(newFolders.filter(f => f.type === 'file').map(f => String(f.fileId || f.file_id)));
      const filteredNewFiles = newFiles.filter(f => !newFoldersFileIds.has(String(f.id || f._id)));

      const combinedItems = [...newFolders, ...filteredNewFiles];

      setItems(prev => (reset ? combinedItems : [...prev, ...combinedItems]));
      setHasMore(newFolders.length >= PAGE_SIZE);

    } catch (error) {
      logger.error("fetchItems error:", error);
      toast("Không thể tải dữ liệu thư viện.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [sortConfig, currentFolderId, query, searchCriteria, filterCriteria, toast]);
  
  useEffect(() => {
    fetchPermission();
  }, [fetchPermission, currentFolderId]);

  useEffect(() => {
    setPage(1);
    setItems([]); // Clear items immediately for better UX
    fetchItems(1, true);
  }, [currentFolderId, sortConfig, query, filterCriteria, fetchItems]);

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchItems(nextPage, false);
    }
  }, [isLoading, hasMore, page, fetchItems]);

  const displayedItems = items;
  const canLoadMore = hasMore;

  // === MARQUEE SELECTION LOGIC ===
  const updateMarqueeSelection = useCallback(() => {
    if (!gridContainerRef.current || !isMarqueeSelecting) return;

    const containerRect = gridContainerRef.current.getBoundingClientRect();
    const marqueeRect = {
      left: Math.min(marqueeStart.x, marqueeCurrent.x),
      top: Math.min(marqueeStart.y, marqueeCurrent.y),
      right: Math.max(marqueeStart.x, marqueeCurrent.x),
      bottom: Math.max(marqueeStart.y, marqueeCurrent.y),
    };

    const selected = [];
    displayedItems.forEach((item, idx) => {
      const el = gridContainerRef.current.querySelector(`[data-idx="${idx}"]`);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const rel = {
        left: rect.left - containerRect.left,
        top: rect.top - containerRect.top,
        right: rect.right - containerRect.left,
        bottom: rect.bottom - containerRect.top,
      };

      if (
        rel.right > marqueeRect.left &&
        rel.left < marqueeRect.right &&
        rel.bottom > marqueeRect.top &&
        rel.top < marqueeRect.bottom
      ) {
        selected.push(item.id);
      }
    });

    setSelectedIds(selected);
  }, [displayedItems, isMarqueeSelecting, marqueeStart, marqueeCurrent]);

  const handleGridMouseDown = useCallback((e) => {
    if (e.target !== gridContainerRef.current) return; // chỉ khi click vào nền

    setSelectedIds([]); // clear selection trước khi kéo

    const rect = gridContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMarqueeStart({ x, y });
    setMarqueeCurrent({ x, y });
    setIsMarqueeSelecting(true);
  }, []);

  const handleGridMouseMove = useCallback((e) => {
    if (!isMarqueeSelecting || !gridContainerRef.current) return;

    const rect = gridContainerRef.current.getBoundingClientRect();
    setMarqueeCurrent({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    updateMarqueeSelection();
  }, [isMarqueeSelecting, updateMarqueeSelection]);

  const handleGridMouseUp = useCallback(() => {
    setIsMarqueeSelecting(false);
    setMarqueeStart({ x: 0, y: 0 });
    setMarqueeCurrent({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (isMarqueeSelecting) {
      document.addEventListener('mousemove', handleGridMouseMove);
      document.addEventListener('mouseup', handleGridMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleGridMouseMove);
        document.removeEventListener('mouseup', handleGridMouseUp);
      };
    }
  }, [isMarqueeSelecting, handleGridMouseMove, handleGridMouseUp]);

  // === END MARQUEE ===

  const handleItemClick = useCallback((e, item, idx) => {
    const id = item.id;
    if (isSelectMode) {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
      lastSelectedIndex.current = idx;
    } else if (e.shiftKey && lastSelectedIndex.current != null) {
      const start = Math.min(lastSelectedIndex.current, idx);
      const end = Math.max(lastSelectedIndex.current, idx);
      const rangeIds = displayedItems.slice(start, end + 1).map(i => i.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...rangeIds])));
    } else if (e.ctrlKey || e.metaKey) {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
      lastSelectedIndex.current = idx;
    } else {
      setSelectedIds([id]);
      lastSelectedIndex.current = idx;
    }
  }, [displayedItems, isSelectMode]);

  const handleContextMenu = useCallback((e, item) => {
    e.preventDefault();
    if (item && item.canView === false && item.canEdit === false) return; // Block context menu only if explicitly forbidden for view and edit
    if (!selectedIds.includes(item.id)) setSelectedIds([item.id]);
    setContextMenu({ mouseX: e.clientX - 2, mouseY: e.clientY - 4, item });
  }, [selectedIds]);

  const handleCloseFileViewer = useCallback(() => {
    if (viewingFile.url) URL.revokeObjectURL(viewingFile.url);
    setViewingFile({ open: false, url: null, name: "", type: null });
  }, [viewingFile.url]);

  const handleViewFile = useCallback(async (item) => {
    if (!item) return;
    const fileId = item.fileId || item.file_id || item.id;
    if (!fileId) {
      toast("File không hợp lệ.", "warning");
      return;
    }
    setIsLoading(true);
    try {
      const fileName = item.name;
      const lower = fileName.toLowerCase();

      const isDoc = /\.(doc|docx)$/i.test(lower);
      const isExcel = /\.(xls|xlsx)$/i.test(lower);
      const isBrowserFile = /\.(pdf|jpeg|jpg|png|gif|webp|txt)$/i.test(lower);

      let blob;
      let previewName = fileName;

      if (isDoc) {
        const conversionApi = `${APP_BASE}/api/doc-url-to-pdf?id=${fileId}`;
        const res = await api.get(conversionApi, {
          responseType: "blob",
        });
        blob = new Blob([res.data], { type: "application/pdf" });
      } else if (isExcel) {
        const downloadUrl = `${APP_BASE}/api/files/download/${fileId}`;
        const fileRes = await api.get(downloadUrl, {
          responseType: "blob",
        });

        const formData = new FormData();
        formData.append("file", new File([fileRes.data], fileName));

        const res = await api.post(API_XLSX_TO_PDF, formData, {
          responseType: "blob",
        });

        blob = new Blob([res.data], { type: "application/pdf" });
      } else if (isBrowserFile) {
        const viewUrl = `${API_VIEW_FILE}/${fileId}`;
        const res = await api.get(viewUrl, {
          responseType: "blob",
        });
        blob = new Blob([res.data], {
          type: res.headers["content-type"] || res.data.type,
        });
      } else {
        toast("Định dạng file không được hỗ trợ xem trước.", "warning");
        setIsLoading(false);
        return;
      }
      if (blob) {
        const url = URL.createObjectURL(blob);
        setViewingFile({
          open: true,
          url: url,
          name: previewName,
        });
      }
    } catch (error) {
      logger.error("Error viewing file:", error);
      toast("Không thể tải file để xem trước.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
   const navigateTo = useCallback((id, name, canEdit = false) => {
    // Chuyển cả hai về chuỗi để so sánh chính xác (trường hợp ID là number/string)
    const breadcrumbIndex = breadcrumbs.findIndex(bc => String(bc.id) === String(id));
    
    if (breadcrumbIndex > -1) {
      // Nếu đã có trong danh sách, cắt đến vị trí đó
      setBreadcrumbs(prev => prev.slice(0, breadcrumbIndex + 1));
    } else if (id) {
      // Thêm mới vào danh sách nếu chưa có
      setBreadcrumbs(prev => [...prev, { id, name, canEdit }]);
    } else {
      // Reset về root nếu id là null
      setBreadcrumbs([{ id: null, name: 'Thư viện tài liệu dùng chung', canEdit: false }]);
    }
    setCurrentFolderId(id);
    setSelectedIds([]);
  }, [breadcrumbs]);

  const openFolder = useCallback((item) => {
    const isForbidden = item.type === 'folder' && item.canView === false && item.canEdit === false;
    if (isForbidden) {
      toast("Bạn không có quyền truy cập thư mục này", "error");
      return;
    }
    if (item.type === 'folder') {
      navigateTo(item.id, item.name, item.canEdit);
    } else {
      handleViewFile(item);
      onOpen && onOpen(item);
    }
    closeContextMenu();
  }, [toast, navigateTo, handleViewFile, onOpen, closeContextMenu]);

  const handleOtherFolderClick = useCallback((folder) => {
    setCurrentFolderId(folder.id);
    setSelectedIds([]);
    setBreadcrumbs([
      { id: null, name: 'Thư viện tài liệu dùng chung', canEdit: false }, 
      { id: folder.id, name: folder.name, canEdit: folder.canEdit }
    ]);
  }, []);

 

    // Handle Shared with me toggle
  const handleSharedWithMeToggle = useCallback(() => {
    setFilterCriteria(prev => ({ ...prev, personal: false, sharedWithMe: !prev.sharedWithMe }));
    setCurrentFolderId(null);
    setBreadcrumbs([{ id: null, name: 'Thư viện tài liệu dùng chung', canEdit: false }]);
    setPage(1);
    setItems([]);
  }, []);

  const handleBreadcrumbClick = useCallback((e) => {
    e.preventDefault();
    const id = e.currentTarget.dataset.id;
    navigateTo(id === 'null' ? null : id);
  }, [navigateTo]);

  const handleOpenAddFolder = useCallback((e) => {
    if (!currentFolderId) {
      setIsAddFolderOpen(true);
    } else {
      setAnchorElAdd(e.currentTarget);
    }
  }, [currentFolderId]);

  const handleCloseAddMenu = useCallback(() => {
    setAnchorElAdd(null);
  }, []);

  const handleAddFolderFromMenu = useCallback(() => {
    setIsAddFolderOpen(true);
    handleCloseAddMenu();
  }, [handleCloseAddMenu]);

  // const handleUploadFromMenu = useCallback((e) => {
  //   setAnchorElUpload(e.currentTarget);
  //   handleCloseAddMenu();
  // }, [handleCloseAddMenu]);

  const handleSelectFileUpload = useCallback(() => {
    fileInputRef.current?.click();
    handleCloseAddMenu();
  }, [handleCloseAddMenu]);

  const handleSelectFolderUpload = useCallback(() => {
    folderInputRef.current?.click();
    handleCloseAddMenu();
  }, [handleCloseAddMenu]);

  const handleCloseAddFolder = useCallback(() => {
    setIsAddFolderOpen(false);
  }, []);
  // const handleRenameDialogOpen = useCallback(() => {
  //   setIsRenameDialogOpen(true);
  // }, []);



  // const handlePermissionsDialogOpen = useCallback(() => {
  //   setIsPermissionsDialogOpen(true);
  // }, []);



  const handleAddFolderSuccess = useCallback((newFolderData) => {
    handleCloseAddFolder();
    toast(`Tạo thư mục '${newFolderData.name}' thành công`, 'success');
    setPage(1);
    fetchItems(1, true);
  }, [fetchItems, handleCloseAddFolder, toast]);

  const handleFileUpload = useCallback(async (filesList) => {
    const files = Array.from(filesList);
    if (!files.length) return;

    const objectType = 'document-library';
    const bookId = currentRootId || 'root';     // Sổ văn bản làm Owner (parent_id)

    setIsUploading(true);
    try {
      for (const file of files) {
        // Bước 1: Tạo bản ghi file trong document_library để có thể phân quyền riêng biệt
        const docPayload = {
          name: file.name,
          type: 'file',
          parentId: currentFolderId ? Number(currentFolderId) : null,
          viewPermissions: [],
          editPermissions: [],
          editOrganizationUnit: null,
        };

        // Lấy quyền từ folder cha để thừa kế (nếu ở trong folder con)
        if (currentFolderId) {
          try {
            const parentRes = await axiosInstance.get(`${API_MANAGEMENT_FODER}/${currentFolderId}`);
            const parentData = parentRes?.data?.data ? parentRes.data.data : (parentRes?.data || parentRes);
            if (parentData) {
              if (parentData.editOrganizationUnit) {
                docPayload.editOrganizationUnit = parentData.editOrganizationUnit?.id || parentData.editOrganizationUnit?._id || parentData.editOrganizationUnit;
              }
              if (Array.isArray(parentData.viewPermissions)) {
                docPayload.viewPermissions = parentData.viewPermissions.map(u => u.id || u._id || u);
              }
              if (Array.isArray(parentData.viewUserPermissions)) {
                docPayload.viewUserPermissions = parentData.viewUserPermissions.map(u => u.id || u._id || u);
              }
              if (Array.isArray(parentData.editPermissions)) {
                docPayload.editPermissions = parentData.editPermissions.map(u => u.id || u._id || u);
              }
            }
          } catch (e) {
            logger.error("Get parent permissions error:", e);
          }
        }

        const docResponse = await axiosInstance.post(API_ARCHIVE_FOLDER, docPayload);
        const resData = docResponse?.data || docResponse;
        const newFileDocId = resData?.id || resData?.data?.id;

        if (!newFileDocId) {
          throw new Error(`Không thể khởi tạo bản ghi cho tệp ${file.name}`);
        }

        // Bước 2: Tải lên file vật lý liên kết với bản ghi vừa tạo
        const formData = new FormData();
        formData.append("file", file);
        formData.append("object_type", objectType);
        formData.append("object_id", String(newFileDocId)); // Gắn với record file trong document_library
        if (bookId) {
          formData.append("parent_id", bookId);
        }

        await axiosInstance.post(`${APP_BASE}/api/files/upload`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      toast(`Tải lên ${files.length} tệp thành công!`, 'success');
      setPage(1);
      fetchItems(1, true);
    } catch (error) {
      logger.error("File upload error:", error);
      toast(error.response?.data?.message || error.message || "Tải lên tệp thất bại!", "error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [currentFolderId, currentRootId, fetchItems, toast]);

  const handleFolderUpload = useCallback(async (filesList) => {
    const files = Array.from(filesList);
    if (!files.length) return;

    const objectType = 'document-library';
    const rootParentId = currentFolderId;
    const bookId = currentRootId || 'root';

    setIsUploading(true);
    try {
      const createdFolders = {}; // Map từ path string sang ID thực từ server

      for (const file of files) {
        const relativePath = file.webkitRelativePath; // vd: "FolderA/SubB/image.png"
        const pathParts = relativePath.split("/");
        const folderParts = pathParts.slice(0, -1); // ["FolderA", "SubB"]

        let currentParentId = rootParentId;
        let currentPath = "";

        // Duyệt qua từng cấp thư mục trong đường dẫn
        for (const folderName of folderParts) {
          currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

          if (createdFolders[currentPath]) {
            currentParentId = createdFolders[currentPath];
          } else {
            // Tạo thư mục mới trên server
            const payload = {
              name: folderName,
              type: "folder",
              parentId: currentParentId ? Number(currentParentId) : null,
            };
            const response = await axiosInstance.post(API_ARCHIVE_FOLDER, payload);
            const newFolderId = response?.id || response?._id || response?.data?.id || response?.data?._id;

            if (!newFolderId) throw new Error("Không thể tạo thư mục " + folderName);

            createdFolders[currentPath] = newFolderId;
            currentParentId = newFolderId;
          }
        }

        // Bước 1: Tạo bản ghi file trong document_library thuộc thư mục currentParentId
        const docPayload = {
          name: file.name,
          type: 'file',
          parentId: currentParentId ? Number(currentParentId) : null,
          viewPermissions: [],
          editPermissions: [],
          editOrganizationUnit: null,
        };

        // Lấy quyền từ folder cha (currentParentId) để thừa kế
        if (currentParentId) {
          try {
            const parentRes = await axiosInstance.get(`${API_MANAGEMENT_FODER}/${currentParentId}`);
            const parentData = parentRes?.data?.data ? parentRes.data.data : (parentRes?.data || parentRes);
            if (parentData) {
              if (parentData.editOrganizationUnit) {
                docPayload.editOrganizationUnit = parentData.editOrganizationUnit?.id || parentData.editOrganizationUnit?._id || parentData.editOrganizationUnit;
              }
              if (Array.isArray(parentData.viewPermissions)) {
                docPayload.viewPermissions = parentData.viewPermissions.map(u => u.id || u._id || u);
              }
              if (Array.isArray(parentData.viewUserPermissions)) {
                docPayload.viewUserPermissions = parentData.viewUserPermissions.map(u => u.id || u._id || u);
              }
              if (Array.isArray(parentData.editPermissions)) {
                docPayload.editPermissions = parentData.editPermissions.map(u => u.id || u._id || u);
              }
            }
          } catch (e) {
            logger.error("Get parent permissions error:", e);
          }
        }

        const docResponse = await axiosInstance.post(API_ARCHIVE_FOLDER, docPayload);
        const resData = docResponse?.data || docResponse;
        const newFileDocId = resData?.id || resData?.data?.id;

        if (!newFileDocId) {
          throw new Error(`Không thể khởi tạo bản ghi cho tệp ${file.name}`);
        }

        // Bước 2: Upload file vào thư mục cuối cùng (newFileDocId)
        const formData = new FormData();
        formData.append("file", file);
        formData.append("object_type", objectType);
        formData.append("object_id", String(newFileDocId));
        if (bookId) {
          formData.append("parent_id", bookId);
        }

        await axiosInstance.post(`${APP_BASE}/api/files/upload`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      toast(`Tải lên thư mục thành công!`, 'success');
      setPage(1);
      fetchItems(1, true);
    } catch (error) {
      logger.error("Folder upload error:", error);
      toast(error.response?.data?.message || "Tải lên thư mục thất bại!", "error");
    } finally {
      setIsUploading(false);
      if (folderInputRef.current) folderInputRef.current.value = "";
    }
  }, [currentFolderId, currentRootId, fetchItems, toast]);

  // Drag & Drop (giữ nguyên logic cũ)
  // const dragData = useRef(null);
  // const [ setDragOverId] = useState(null);

  // const onDragStart = useCallback((e, idx) => {
  //   const id = displayedItems[idx].id;
  //   const selected = selectedIds.includes(id) ? selectedIds.slice() : [id];
  //   dragData.current = { selected };
  //   e.dataTransfer.setData('text/plain', String(id));
  //   e.dataTransfer.effectAllowed = 'move';
  // }, [displayedItems, selectedIds]); // displayedItems is now `items`

  // const onDragOver = useCallback((e, targetItem) => {
  //   e.preventDefault();
  //   setDragOverId(targetItem.id);
  // }, []);

  // const onDrop = useCallback(async (e, targetItem) => {
  //   e.preventDefault();
  //   const selected = dragData.current?.selected || [];
  //   if (!selected.length) return;

  //   if (targetItem?.type !== 'folder' || selected.includes(targetItem.id)) {
  //     setDragOverId(null);
  //     dragData.current = null;
  //     return;
  //   }

  //   try {
  //     await axiosInstance.patch(API_MANAGEMENT_FODER, {
  //       ids: selected,
  //       newParentId: targetItem.id
  //     });
  //     toast(`Đã chuyển ${selected.length} mục vào '${targetItem.name}'`, 'success');
  //     setPage(1);
  //     fetchItems(1, true); // Refetch
  //   } catch (error) {
  //     toast(error.response?.data?.message || "Di chuyển thất bại!", "error");
  //   }
  //   setDragOverId(null);
  //   dragData.current = null;
  // }, [fetchItems, toast]);

  const handleDownload = useCallback(async (targets) => {
    if (!targets || targets.length === 0) return;

    const files = targets.filter(item => item.type === 'file');
    const targetIds = targets.map(t => t.id);

    setDownloadingIds(prev => [...prev, ...targetIds]);
    try {
      if (targets.length === 1 && files.length === 1) {
        // Single file download
        const file = files[0];
        const fileId = file.fileId || file.file_id || file.id || file._id;
        const downloadUrl = `${API_DOWNLOAD_FILE}/${fileId}`;
        const res = await api.get(downloadUrl, { responseType: 'blob' });
        const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Multi-file download (zip)
        const allIds = targets.map(t => t.fileId || t.file_id || t.id || t._id);
        const res = await api.post(API_DOWNLOAD_FILE_ALL_ZIP, { 
          ids: allIds,
          objectType: 'document-library' 
        }, { responseType: 'blob' });
        const blob = new Blob([res.data], { type: 'application/zip' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        let filename = "tai_ve.zip";
        const disposition = res.headers && res.headers['content-disposition'];
        if (disposition && disposition.includes('filename=')) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          const matches = filenameRegex.exec(disposition);
          if (matches != null && matches[1]) {
            filename = matches[1].replace(/['"]/g, '');
          }
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
      toast(`Đã tải xuống thành công`, 'success');
    } catch (error) {
      logger.error("Download error:", error);
      toast("Tải xuống thất bại!", "error");
    } finally {
      setDownloadingIds(prev => prev.filter(id => !targetIds.includes(id)));
    }

    onDownload && onDownload(targets);
    closeContextMenu();
    if (typeof handleCloseActionMenu === 'function') handleCloseActionMenu();
  }, [onDownload, closeContextMenu, handleCloseActionMenu, toast]);

  const handleDeleteConfirm = useCallback(async () => {
    const idsToDelete = deleteConfirm.targetIds;
    if (!idsToDelete.length) {
      setDeleteConfirm({ open: false, targetIds: [] });
      return;
    }

    try {
      const folderIds = [];
      const fileIds = [];

      idsToDelete.forEach(id => {
        const item = items.find(i => String(i.id) === String(id));
        if (item) {
          if (item.type === 'folder' || (item.type === 'file' && (item.fileId || item.file_id))) {
            folderIds.push(id);
          } else {
            fileIds.push(id);
          }
        }
      });

      // 1) Xóa folder (bulk)
      if (folderIds.length > 0) {
        await axiosInstance.delete(API_MANAGEMENT_FODER, {
          data: { ids: folderIds },
        });
      }

      // 2) Xóa file (từng file theo endpoint mới)
      if (fileIds.length > 0) {
        for (const fileId of fileIds) {
          await axiosInstance.delete(`${API_MARK_IMPORTANT_DOCUMENT}/${fileId}`);
        }
      }

      toast(`Xóa thành công.`, 'success');
      setPage(1);
      fetchItems(1, true);
    } catch (error) {
      logger.error("Delete error:", error);
      toast(error.response?.data?.message || "Xóa thất bại!", 'error');
    } finally {
      setDeleteConfirm({ open: false, targetIds: [] });
      setSelectedIds([]);
    }
  }, [deleteConfirm.targetIds, items, fetchItems, toast]);

  const handleRenameCommit = useCallback(async (id) => {
    const name = renameValue.trim();
    if (!name) return toast('Tên không được để trống', 'warning');
    try {
      await axiosInstance.patch(`${API_MANAGEMENT_FODER}/${id}`, { name });
      toast(`Đổi tên thành '${name}'`, 'success');
      setRenamingId(null);
      setPage(1);
      fetchItems(1, true);
    } catch (error) {
      toast("Đổi tên thất bại!", "error");
      setRenamingId(null);
    }
  }, [renameValue, fetchItems, toast]);

  const handleCancelRename = useCallback(() => {
    setRenamingId(null);
  }, []);

  const handleActionIconClick = useCallback((e) => {
    e.stopPropagation();
    const id = e.currentTarget.dataset.id;
    const item = items.find(i => String(i.id) === String(id));
    setActionItem(item);
    setAnchorElAction(e.currentTarget);
  }, [items]);

  const handleContextMenuOpen = useCallback(() => {
    const target = contextMenu?.item || actionItem;
    if (target) openFolder(target);
    closeContextMenu();
    handleCloseActionMenu();
  }, [contextMenu, actionItem, openFolder, handleCloseActionMenu, closeContextMenu]);

  const handleContextMenuDownload = useCallback(() => {
    const target = contextMenu?.item || actionItem;
    if (target) handleDownload([target]);
    closeContextMenu();
    handleCloseActionMenu();
  }, [contextMenu, actionItem, handleDownload, closeContextMenu, handleCloseActionMenu]);

  const fetchItemDetails = useCallback(async (item) => {
    if (!item?.id) return item;
    try {
      setIsLoading(true);
      const res = await axiosInstance.get(`${API_MANAGEMENT_FODER}/${item.id}`);
      return res; // axiosInstance automatically unwraps response.data
    } catch (error) {
      logger.error("Fetch item details error:", error);
      return item; // fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleContextMenuRename = useCallback(async () => {
    const target = contextMenu?.item || actionItem;
    if (target) {
      const details = await fetchItemDetails(target);
      setActionItem(details);
      setIsRenameDialogOpen(true);
      closeContextMenu();
      handleCloseActionMenu();
    }
  }, [contextMenu, actionItem, fetchItemDetails, closeContextMenu, handleCloseActionMenu]);

  const handleContextMenuPermissions = useCallback(async () => {
    const target = contextMenu?.item || actionItem;
    if (target) {
      const details = await fetchItemDetails(target);
      setActionItem(details);
      setIsPermissionsDialogOpen(true);
      closeContextMenu();
      handleCloseActionMenu();
    }
  }, [contextMenu, actionItem, fetchItemDetails, closeContextMenu, handleCloseActionMenu]);

  const handleUpdateItemSuccess = useCallback((id, updatedData) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updatedData } : item));
    handleRenameDialogClose();
    handlePermissionsDialogClose();
    fetchItems(1, true); // Refresh to be safe
  }, [handleRenameDialogClose, handlePermissionsDialogClose, fetchItems]);

  const handleContextMenuDelete = useCallback(() => {
    const target = contextMenu?.item || actionItem;
    if (target) {
      if (!canModifyItem(target)) {
        toast("Không thể xóa thư mục này. Vui lòng kiểm tra lại thư mục trước khi thực hiện thao tác.", "warning");
        return;
      }
      setDeleteConfirm({ open: true, targetIds: [target.id] });
      closeContextMenu();
      handleCloseActionMenu();
    }
  }, [contextMenu, actionItem, closeContextMenu, handleCloseActionMenu, toast, canModifyItem]);



  // const handleActionMenuDownload = useCallback(() => {
  //   if (actionItem) handleDownload([actionItem]);
  //   handleCloseActionMenu();
  // }, [actionItem, handleDownload, handleCloseActionMenu]);

  // const handleActionMenuFavorite = useCallback(() => {
  //   if (actionItem) toast(`Đã thêm '${actionItem.name}' vào yêu thích`, 'success');
  //   handleCloseActionMenu();
  // }, [actionItem, toast, handleCloseActionMenu]);

  // const handleActionMenuRename = useCallback(async () => {
  //   if (actionItem) {
  //     const details = await fetchItemDetails(actionItem);
  //     setActionItem(details);
  //     setIsRenameDialogOpen(true);
  //   }
  //   handleCloseActionMenu();
  // }, [actionItem, fetchItemDetails, handleCloseActionMenu]);

  // const handleActionMenuPermissions = useCallback(async () => {
  //   if (actionItem) {
  //     const details = await fetchItemDetails(actionItem);
  //     setActionItem(details);
  //     setIsPermissionsDialogOpen(true);
  //   }
  //   handleCloseActionMenu();
  // }, [actionItem, fetchItemDetails, handleCloseActionMenu]);

  const handleCloseDeleteConfirm = useCallback(() => {
    setDeleteConfirm({ open: false, targetIds: [] });
  }, []);

  // Search/Filter Handlers
  const handleSearchOptionClick = (event) => setSearchAnchorEl(event.currentTarget);
  const handleSearchOptionClose = () => setSearchAnchorEl(null);
  const handleFilterClick = (event) => setFilterAnchorEl(event.currentTarget);
  const handleFilterClose = () => setFilterAnchorEl(null);

  const handleSearchCriteriaChange = (field) => (event) => {
    if (field === 'all') {
      const isChecked = event.target.checked;
      setSearchCriteria({ all: isChecked, name: isChecked });
    } else {
      setSearchCriteria(prev => {
        const newState = { ...prev, [field]: event.target.checked };
        newState.all = newState.name; // Simplistic for now since only 'name' exists
        return newState;
      });
    }
  };

  const handleFilterCriteriaChange = (field) => (event) => {
    if (field === 'all') {
      const isChecked = event.target.checked;
      setFilterCriteria({ all: isChecked, personal: !isChecked ? false : filterCriteria.personal });
    } else {
      setFilterCriteria(prev => {
        const isChecked = event.target.checked;
        return {
          ...prev,
          [field]: isChecked,
          all: field === 'personal' && isChecked ? false : prev.all
        };
      });
    }
  };

  const handleApplyFilter = () => {
    setQuery(inputValue.trim());
    setPage(1);
    setItems([]); 
    fetchItems(1, true);
    handleFilterClose();
  };

  const handleResetFilter = () => {
    setFilterCriteria({ all: true, personal: false });
    setInputValue('');
    setQuery('');
    setPage(1);
    setItems([]);
    fetchItems(1, true);
    handleFilterClose();
  };

  // Handlers
  const handleDownloadSelected = useCallback(() => {
    const targets = selectedIds.map(id => items.find(i => i.id === id)).filter(Boolean);
    handleDownload(targets);
  }, [selectedIds, items, handleDownload]);

  const handleDeleteSelected = useCallback(() => {
    const restrictedItems = items.filter(item => selectedIds.includes(item.id) && !canModifyItem(item));
    
    if (restrictedItems.length > 0) {
      toast("Không thể xóa thư mục này. Vui lòng kiểm tra lại thư mục trước khi thực hiện thao tác.", "warning");
      return;
    }
    
    setDeleteConfirm({ open: true, targetIds: selectedIds });
  }, [selectedIds, items, toast, canModifyItem]);

  // const handleUploadClick = useCallback(() => fileInputRef.current?.click(), []);
  const handleFileChange = useCallback((e) => handleFileUpload(e.target.files), [handleFileUpload]);
  const handleFolderChange = useCallback((e) => handleFolderUpload(e.target.files), [handleFolderUpload]);
  const handleViewChange = useCallback((_, value) => value && setView(value), []);

  const handleInputChange = useCallback((e) => {
    setInputValue(e.target.value);
  }, []);

  const handleSearchClick = useCallback(() => {
    setQuery(inputValue.trim());
  }, [inputValue]);

  const handleClearSearch = useCallback(() => {
    setInputValue('');
    setQuery('');
  }, []);

  const handleSortMenuOpen = useCallback(() => {
    // Toggle reordering mode
    if (isReordering) {
        // Cancel reordering - revert changes
        setIsReordering(false);
        setPage(1);
        fetchItems(1, true); // Revert to server state
    } else {
        // Start reordering
        setIsReordering(true);
    }
  }, [isReordering, fetchItems]);

  const handleConfirmReorderClick = useCallback(() => {
    setOpenLockConfirm(true);
  }, []);

  const handleKeyDownSearch = useCallback((e) => {
    if (e.key === 'Enter') {
      handleSearchClick();
    }
  }, [handleSearchClick]);

  const handleCloseLockConfirm = useCallback(() => {
    setOpenLockConfirm(false);
  }, []);

  const dragItemId = useRef(null);

  const handleDragStartEvent = useCallback((e) => {
    e.stopPropagation();
    const idx = Number(e.currentTarget.dataset.idx);
    const id = e.currentTarget.dataset.id;
    const item = displayedItems[idx];
    dragItem.current = idx;
    dragItemId.current = id;
    // Set data hợp lệ để tránh JSON.parse crash ở các handler khác (useDragAndDrop)
    e.dataTransfer.setData('item', JSON.stringify({ id, type: item?.type || 'unknown', _source: 'driver' }));
    e.dataTransfer.effectAllowed = "move";
  }, [displayedItems]);

  const handleDragEndEvent = useCallback(() => {
    // Clear highlight khi kết thúc drag (kể cả khi không drop vào đâu)
    setDragOverFolderId(null);
    dragItemId.current = null;
  }, []);

  const handleDragEnterEvent = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const idx = Number(e.currentTarget.dataset.idx);
    const id = e.currentTarget.dataset.id;
    const overItem = displayedItems[idx];

    // Không highlight chính item đang bị kéo
    if (String(id) === String(dragItemId.current)) {
      return;
    }

    // Chỉ highlight nếu item đang hover là folder
    if (overItem && overItem.type === 'folder') {
      setDragOverFolderId(id);
    } else {
      setDragOverFolderId(null);
    }

    dragOverItem.current = idx;
  }, [displayedItems]);

  const handleDragLeaveEvent = useCallback((e) => {
    e.stopPropagation();
    // Chỉ clear khi rời hẳn khỏi element (không phải sang child)
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverFolderId(null);
    }
  }, []);

  const handleSaveOrder = useCallback(async () => {
    try {
      const payload = items.map((item, index) => ({
        id: item.id,
        sortOrder: index + 1
      }));

      await axiosInstance.patch(API_CHANGE_FOLDER_POSITION, payload);
      toast("Cập nhật vị trí thành công", "success");
      fetchItems(1, true);
      setOpenLockConfirm(false);
      setIsReordering(false);
    } catch (error) {
      logger.error("Update order error:", error);
      toast("Cập nhật vị trí thất bại", "error");
    }
  }, [items, toast]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation(); // Chặn event bubble lên TableLayout (useDragAndDrop)
    setDragOverFolderId(null);
    const _dragItem = dragItem.current;
    const _dragOverItem = dragOverItem.current;

    if (_dragItem === null || _dragOverItem === null || _dragItem === _dragOverItem) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }

    const draggedItemData = displayedItems[_dragItem];
    const targetItemData = displayedItems[_dragOverItem];

    // Nếu kéo file vào thư mục → hiện dialog xác nhận chuyển file
    if (draggedItemData && draggedItemData.type === 'file' && targetItemData && targetItemData.type === 'folder') {
      setMoveFileConfirm({ open: true, file: draggedItemData, targetFolder: targetItemData });
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }

    // Nếu kéo folder sang folder hoặc item khác → reorder như cũ
    if (draggedItemData && draggedItemData.type === 'folder') {
      const copyListItems = [...items];
      const dragItemContent = copyListItems[_dragItem];
      copyListItems.splice(_dragItem, 1);
      copyListItems.splice(_dragOverItem, 0, dragItemContent);
      setItems(copyListItems);
    }

    dragItem.current = null;
    dragOverItem.current = null;
  };

  // Xác nhận chuyển file vào thư mục
  const handleConfirmMoveFile = useCallback(async () => {
    const { file, targetFolder } = moveFileConfirm;
    if (!file || !targetFolder) return;

    setIsMovingFile(true);
    try {
      await axiosInstance.patch(`${APP_BASE}/api/files/${file.id}/location`, {
        "object_type": "document-library",
        "object_id": String(targetFolder.id),
        "parent_id": targetFolder.id,
      });

      toast(`Đã chuyển "${file.name}" vào thư mục "${targetFolder.name}"`, "success");
      setMoveFileConfirm({ open: false, file: null, targetFolder: null });
      setPage(1);
      fetchItems(1, true);
    } catch (error) {
      logger.error("Move file error:", error);
      toast(error.response?.data?.message || "Chuyển file thất bại!", "error");
    } finally {
      setIsMovingFile(false);
    }
  }, [moveFileConfirm, fetchItems, toast]);

  const handleCloseMoveFileConfirm = useCallback(() => {
    setMoveFileConfirm({ open: false, file: null, targetFolder: null });
  }, []);

  const handleSortMenuClose = useCallback(() => {
    setSortMenuAnchorEl(null);
  }, []);

  const handleSortChange = useCallback((key) => {
    setSortConfig(prev => 
      prev.key === key ? { ...prev, order: prev.order === 'asc' ? 'desc' : 'asc' } : { key, order: 'asc' }
    );
    handleSortMenuClose();
  }, [handleSortMenuClose]);

  const handleSortByName = useCallback(() => handleSortChange('name'), [handleSortChange]);
  const handleSortByDate = useCallback(() => handleSortChange('createdAt'), [handleSortChange]);

  const handleItemClickEvent = useCallback((e) => {
    const id = e.currentTarget.dataset.id;
    const idx = Number(e.currentTarget.dataset.idx);
    const item = displayedItems.find(i => String(i.id) === String(id));
    if (item) handleItemClick(e, item, idx);
  }, [displayedItems, handleItemClick]);

  const handleItemContextMenuEvent = useCallback((e) => {
    const id = e.currentTarget.dataset.id;
    const item = displayedItems.find(i => String(i.id) === String(id));
    if (item) handleContextMenu(e, item);
  }, [displayedItems, handleContextMenu]);

  const handleItemDoubleClickEvent = useCallback((e) => {
    const id = e.currentTarget.dataset.id;
    const item = displayedItems.find(i => String(i.id) === String(id));
    if (item) openFolder(item);
  }, [displayedItems, openFolder]);

  // const handleItemDragStartEvent = useCallback((e) => {
  //   const idx = Number(e.currentTarget.dataset.idx);
  //   onDragStart(e, idx);
  // }, [onDragStart]);

  // const handleItemDragOverEvent = useCallback((e) => {
  //   const id = e.currentTarget.dataset.id;
  //   const item = displayedItems.find(i => String(i.id) === String(id));
  //   if (item) onDragOver(e, item);
  // }, [displayedItems, onDragOver]);

  // const handleItemDropEvent = useCallback((e) => {
  //   const id = e.currentTarget.dataset.id;
  //   const item = items.find(i => String(i.id) === String(id));
  //   onDrop(e, item);
  // }, [displayedItems, onDrop]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelectedIds(displayedItems.map(i => i.id));
      }
      if (e.key === 'Delete' && selectedIds.length) {
        handleDeleteSelected();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [displayedItems, selectedIds, handleDeleteSelected]);

  const handleEnableSelectMode = useCallback(() => {
    setIsSelectMode(true);
  }, []);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds([]);
    setIsSelectMode(false);
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(displayedItems.map(i => i.id));
  }, [displayedItems]);

  const isAnySelectedDownloading = selectedIds.some(id => downloadingIds.includes(id));

  return (
    <Container>
      <Header>
        <RightBox>
          <SearchBox>
            <SearchBarWrapper>
              {!currentFolderId && (
                <FilterLabel onClick={handleFilterClick}>
                  <FilterIconSvg />
                  Bộ lọc
                </FilterLabel>
              )}
              <SearchInput
                placeholder="Tìm kiếm..."
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDownSearch}
              />
              {inputValue && (
                <SearchBarIconButton size="small" onClick={handleClearSearch}>
                  <StyledInputClearIcon />
                </SearchBarIconButton>
              )}
              <SearchBarDivider />
              <SearchBarIconButton onClick={handleSearchOptionClick}>
                <StyledTuneIcon />
              </SearchBarIconButton>
             
            </SearchBarWrapper>
             <CustomSearchButton variant="contained" onClick={handleSearchClick}>
                <StyledSearchIcon />
              </CustomSearchButton>
          </SearchBox>
          
          <Popover
            open={Boolean(searchAnchorEl)}
            anchorEl={searchAnchorEl}
            onClose={handleSearchOptionClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          >
            <FilterPopoverContent>
              <PopoverTitle>Tùy chọn tìm kiếm</PopoverTitle>
              <FilterPopoverWrapper>
                <FormControlLabel
                  control={<Checkbox checked={searchCriteria.all} onChange={handleSearchCriteriaChange('all')} size="small" />}
                  label="Tất cả"
                />
                <FormControlLabel
                  control={<Checkbox checked={searchCriteria.name} onChange={handleSearchCriteriaChange('name')} size="small" />}
                  label="Tên thư mục/tập tin"
                />
              </FilterPopoverWrapper>
            </FilterPopoverContent>
          </Popover>

          <Popover
            open={Boolean(filterAnchorEl)}
            anchorEl={filterAnchorEl}
            onClose={handleFilterClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          >
            <FilterPopoverContent>
              <PopoverTitle>Bộ lọc <StyledFilterListIcon /></PopoverTitle>
              <FilterPopoverWrapperWithMargin>
                <FormControlLabel
                  control={<Checkbox checked={filterCriteria.all} onChange={handleFilterCriteriaChange('all')} size="small" />}
                  label="Tất cả"
                />
                <FormControlLabel
                  control={<Checkbox checked={filterCriteria.personal} onChange={handleFilterCriteriaChange('personal')} size="small" />}
                  label="Quyền xem cá nhân"
                />
              </FilterPopoverWrapperWithMargin>
              <FilterActions>
                <Button size="small" variant="outlined" onClick={handleResetFilter}>Đặt lại</Button>
                <FilterActionsGroup>
                    <Button size="small" variant="outlined" onClick={handleFilterClose}>Hủy</Button>
                    <Button size="small" variant="contained" onClick={handleApplyFilter}>Áp dụng lọc</Button>
                </FilterActionsGroup>
              </FilterActions>
            </FilterPopoverContent>
          </Popover>
          <StyledSortButton
            variant="contained"
            onClick={handleSortMenuOpen}
            startIcon={<SortIconSvg />}
          >
            {isReordering ? "Hủy" : "Sắp xếp"}
          </StyledSortButton>
          <StyledShareButton
            active={filterCriteria.sharedWithMe ? 1 : 0}
            variant="contained"
            onClick={handleSharedWithMeToggle}
            startIcon={<ShareIcon />}
          >
            Được chia sẻ với tôi
          </StyledShareButton>
          {canManageCurrentFolder && (
            <>
              {!isSelectMode ? (
                <StyledSelectButton
                  variant="contained"
                  onClick={handleEnableSelectMode}
                  startIcon={<CheckBoxOutlineBlankIcon />}
                >
                  Chọn
                </StyledSelectButton>
              ) : (
                <>
                  <StyledSelectAllButton
                    onClick={handleSelectAll}
                    startIcon={<CheckBoxOutlineBlankIcon />}
                  >
                    Chọn tất cả
                  </StyledSelectAllButton>
                  <StyledDeselectButton
                    variant="contained"
                    onClick={handleDeselectAll}
                    startIcon={<CheckBoxIcon />}
                  >
                    Bỏ chọn
                  </StyledDeselectButton>
                </>
              )}
            </>
          )}
        </RightBox>
        <LeftGroup>
          {canManageCurrentFolder && (
            <>
              {selectedIds.length > 0 && (
                <StyledDeleteButton
                  variant="contained"
                  onClick={handleDeleteSelected}
                  startIcon={<DeleteIcon />}
                >
                  Xóa
                </StyledDeleteButton>
              )}

              {isReordering && (
                  <StyledConfirmReorderButton 
                      variant="contained" 
                      onClick={handleConfirmReorderClick}
                  >
                      Xác nhận
                  </StyledConfirmReorderButton>
              )}
              
              <HiddenFileInput ref={fileInputRef} type="file" multiple onChange={handleFileChange} />
              <input ref={folderInputRef} type="file" webkitdirectory=""  multiple onChange={handleFolderChange} style={{ display: 'none' }} />
              
              {selectedIds.length > 0 && (
                <Tooltip title="Tải xuống">
                  <span>
                    <ExportActionButton variant="contained" onClick={handleDownloadSelected} disabled={isAnySelectedDownloading}>
                      {isAnySelectedDownloading ? <CircularProgress size={20} /> : <DownloadIconSvg />}
                    </ExportActionButton>
                  </span>
                </Tooltip>
              )}

              <StyledActionIconButton
                onClick={handleOpenAddFolder}
                startIcon={<AddIcon />}
              >
                Thêm thư mục
              </StyledActionIconButton>
            </>
          )}
          
          <StyledToggleButtonGroup value={view} exclusive onChange={handleViewChange} size="small">
            <ToggleButton value="grid"><GridViewIcon /></ToggleButton>
            <ToggleButton value="list"><ListIcon /></ToggleButton>
          </StyledToggleButtonGroup>
        </LeftGroup>
      </Header>
      
      <CustomDialog
        open={openLockConfirm}
        onClose={handleCloseLockConfirm}
        onSave={handleSaveOrder}
        title="Xác nhận thay đổi vị trí"
      >
        <Typography>Bạn có chắc chắn muốn thay đổi vị trí tài liệu không?</Typography>
      </CustomDialog>

      {/* Dialog xác nhận chuyển file vào thư mục */}
      <CustomDialog
        open={moveFileConfirm.open}
        onClose={handleCloseMoveFileConfirm}
        onSave={handleConfirmMoveFile}
        title="Xác nhận chuyển file"
        disabled={isMovingFile}
      >
        <Typography>
          Bạn có chắc chắn muốn chuyển file{' '}
          <strong>{'"'}{moveFileConfirm.file?.name}{'"'}</strong>{' '}
          vào thư mục{' '}
          <strong>{'"'}{moveFileConfirm.targetFolder?.name}{'"'}</strong>{' '}
          không?
        </Typography>
      </CustomDialog>

      {breadcrumbs.length > 0 && (
        <BreadcrumbBar>
          <Breadcrumbs>
            {breadcrumbs.map((bc, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              const displayName = (idx === 0 && filterCriteria.sharedWithMe) ? 'Được chia sẻ với tôi' : bc.name;
              return isLast ? (
                <StyledActiveBreadcrumb key={bc.id ?? 'root'}>{displayName}</StyledActiveBreadcrumb>
              ) : (
                <StyledBreadcrumbLink 
                  key={bc.id ?? 'root'} 
                  underline="hover" 
                  data-id={bc.id ?? 'null'} 
                  onClick={handleBreadcrumbClick}
                >
                  {displayName}
                </StyledBreadcrumbLink>

              );
            })}
          </Breadcrumbs>
        </BreadcrumbBar>
      )}

     <ContentContainer>
        <MainPanel>
          {view === 'grid' ? (
            <GridWrap
              ref={gridContainerRef}
              onMouseDown={handleGridMouseDown}
            >
              {displayedItems.map((item, idx) => (
                <GridItem
                  key={item.id}
                  data-idx={idx}
                  data-id={item.id}
                  $isSelected={selectedIds.includes(item.id)}
                  $isReordering={isReordering}
                  $isFolder={item.type === 'folder'}
                  $isDragTarget={
                    isReordering
                    && item.type === 'folder'
                    && String(item.id) === String(dragOverFolderId)
                    && String(item.id) !== String(dragItemId.current)
                  }
                  onClick={handleItemClickEvent}
                  onDoubleClick={handleItemDoubleClickEvent}
                  onContextMenu={handleItemContextMenuEvent}
                  draggable={isReordering}
                  onDragStart={handleDragStartEvent}
                  onDragEnd={handleDragEndEvent}
                  onDragEnter={handleDragEnterEvent}
                  onDragLeave={handleDragLeaveEvent}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                
                  <GridIconContainer>
                    {getFileIcon(item, 'large')}
                  </GridIconContainer>
                {renamingId === item.id ? (
                  <RenamingInput
                    value={renameValue}
                    onChange={setRenameValue}
                    onCommit={handleRenameCommit}
                    onCancel={handleCancelRename}
                    itemId={item.id}
                  />
) : (
  <Tooltip title={item.name} arrow>
    <GridNameText variant="body2">{item.name}</GridNameText>
  </Tooltip>
)}
                </GridItem>
              ))}

              {/* Marquee overlay */}
              {isMarqueeSelecting && (
                <MarqueeOverlay
                    $mLeft={Math.min(marqueeStart.x, marqueeCurrent.x)}
                    $mTop={Math.min(marqueeStart.y, marqueeCurrent.y)}
                    $mWidth={Math.abs(marqueeCurrent.x - marqueeStart.x)}
                    $mHeight={Math.abs(marqueeCurrent.y - marqueeStart.y)}
                />
              )}
             {items.length > 0 && canLoadMore && ( 
                <LoadMoreSentinel
                  canLoadMore={hasMore}
                  onLoadMore={handleLoadMore}
                  isLoading={isLoading}
                />
              )}
              {isLoading && page > 1 && (
                <LoadMoreBox><CircularProgress size={32} /></LoadMoreBox>
              )}
            </GridWrap>
          ) : (
            <StyledTableContainer component={Paper}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <HeaderCellName><strong>Tên thư mục</strong></HeaderCellName>
                    <HeaderCellDate><strong>Ngày khởi tạo</strong></HeaderCellDate>
                    <HeaderCellOwner><strong>Quyền sở hữu</strong></HeaderCellOwner>
                    <HeaderCellAction><strong>Hành động</strong></HeaderCellAction>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedItems.map((item, idx) => (
                    <StyledTableRow
                      key={item.id}
                      hover
                      selected={selectedIds.includes(item.id)}
                      data-id={String(item.id)}
                      data-idx={String(idx)}
                      onClick={handleItemClickEvent}
                      onContextMenu={handleItemContextMenuEvent}
                      onDoubleClick={handleItemDoubleClickEvent}
                    >
                      <TableCell>
                        <NameCellContent>
                          {item.type === 'folder' ? (
                            <IconContainer>
                              {getFileIcon(item, 'small')}
                            </IconContainer>
                          ) : getFileIcon(item, 'small')}
                      {renamingId === item.id ? (
                        <RenamingInput
                          value={renameValue}
                          onChange={setRenameValue}
                          onCommit={handleRenameCommit}
                          onCancel={handleCancelRename}
                          itemId={item.id}
                        />
) : (
  <Tooltip title={item.name} arrow>
    <NameTextWrapper>
      <NameText variant="body2" noWrap>{item.name}</NameText>
      {!item.canView && !item.canEdit && <StyledLockIconInline />}
    </NameTextWrapper>
  </Tooltip>
)}
                        </NameCellContent>
                      </TableCell>
                      <TableCell>{item.createdAt || '--'}</TableCell>
                      <TableCell>{item.owner || '--'}</TableCell>
                      <TableCell align="center">
                        {item.canEdit && (
                          <IconButton size="small" data-id={item.id} onClick={handleActionIconClick}>
                            <StyledActionMenuIcon />
                          </IconButton>
                        )}
                      </TableCell>
                    </StyledTableRow>
                  ))}
                </TableBody>
              </Table>
              {items.length > 0 && canLoadMore && (
                <LoadMoreSentinel
                  canLoadMore={hasMore}
                  onLoadMore={handleLoadMore}
                  isLoading={isLoading}
                />
              )}
              {isLoading && page > 1 && (
                <TableLoadMore><CircularProgress size={24} /></TableLoadMore>
              )}
            </StyledTableContainer>
          )}
        </MainPanel>

        {currentFolderId && (
          <SidePanelWrapper>
            <OtherDocumentPanel 
              excludeId={currentRootId}
              onFolderClick={handleOtherFolderClick}
            />
          </SidePanelWrapper>
        )}
      </ContentContainer>

      <Menu
        open={Boolean(contextMenu)}
        onClose={closeContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
      >
        {canModifyItem(contextMenu?.item) && (
          <MenuItem onClick={handleContextMenuRename}>Đổi tên</MenuItem>
        )}
        {canManagePermissionsItem(contextMenu?.item) && (contextMenu?.item?.type === 'folder' || (contextMenu?.item?.type === 'file' && (contextMenu?.item?.fileId || contextMenu?.item?.file_id))) && (
          <MenuItem onClick={handleContextMenuPermissions}>Phân quyền</MenuItem>
        )}
        <MenuItem onClick={handleContextMenuOpen}>Xem chi tiết</MenuItem>
        <MenuItem 
          onClick={handleContextMenuDownload}
          disabled={contextMenu?.item?.id ? downloadingIds.includes(contextMenu.item.id) : false}
        >
          Tải xuống
          {contextMenu?.item?.id && downloadingIds.includes(contextMenu.item.id) && (
            <StyledDownloadProgress size={16} />
          )}
        </MenuItem>
        {canModifyItem(contextMenu?.item) && (
          <MenuItem onClick={handleContextMenuDelete}>Xóa</MenuItem>
        )}
      </Menu>

      {/* Action Menu (ba chấm trong list view) */}
      <Menu anchorEl={anchorElAction} open={Boolean(anchorElAction)} onClose={handleCloseActionMenu}>
        {canManagePermissionsItem(actionItem) && (actionItem?.type === 'folder' || (actionItem?.type === 'file' && (actionItem?.fileId || actionItem?.file_id))) && (
          <MenuItem onClick={handleContextMenuPermissions}>Phân quyền</MenuItem>
        )}
        <MenuItem 
          onClick={handleContextMenuDownload}
          disabled={actionItem?.id ? downloadingIds.includes(actionItem.id) : false}
        >
          Tải xuống
          {actionItem?.id && downloadingIds.includes(actionItem.id) && (
            <StyledDownloadProgress size={16} />
          )}
        </MenuItem>
        <MenuItem onClick={handleContextMenuOpen}>Xem chi tiết</MenuItem>
      </Menu>

      {/* Delete Confirm Dialog */}
      <CustomDialog
        open={deleteConfirm.open}
        onClose={handleCloseDeleteConfirm}
        onSave={handleDeleteConfirm}
        title="Xác nhận xóa"
        type="delete"
      >
        <Typography>Bạn có chắc chắn muốn xóa thư mục/ tài liệu đã chọn không?</Typography>
      </CustomDialog>

      {/* Add Folder Dialog */}
      {!currentFolderId ? (
        <Addfoder
          open={isAddFolderOpen}
          onClose={handleCloseAddFolder}
          onSuccess={handleAddFolderSuccess}
          dialogKey="addDocumentBook"
        />
      ) : (
        <AddSubFolder
          open={isAddFolderOpen}
          onClose={handleCloseAddFolder}
          onSuccess={handleAddFolderSuccess}
          parentId={currentFolderId}
        />
      )}

      {/* Rename Dialog */}
      <RenameFolderDialog
        open={isRenameDialogOpen}
        onClose={handleRenameDialogClose}
        onRename={handleUpdateItemSuccess}
        item={actionItem}
      />

      {/* Permissions Dialog */}
      <UpdatePermissionsDialog
        open={isPermissionsDialogOpen}
        onClose={handlePermissionsDialogClose}
        item={actionItem}
        onSuccess={handleUpdateItemSuccess}
      />

      {/* Sort Menu */}
      <Menu
        anchorEl={sortMenuAnchorEl}
        open={Boolean(sortMenuAnchorEl)}
        onClose={handleSortMenuClose}
      >
        <MenuItem onClick={handleSortByName}>
          <ListItemText>Theo tên</ListItemText>
          {sortConfig.key === 'name' && (
            <ListItemIcon>
              {sortConfig.order === 'asc' ? <StyledArrowUpwardIcon /> : <StyledArrowDownwardIcon />}
            </ListItemIcon>
          )}
        </MenuItem>
        <MenuItem onClick={handleSortByDate}>
          <ListItemText>Theo ngày tạo</ListItemText>
          {sortConfig.key === 'createdAt' && (
            <ListItemIcon>
              {sortConfig.order === 'asc' ? <StyledArrowUpwardIcon /> : <StyledArrowDownwardIcon />}
            </ListItemIcon>
          )}
        </MenuItem>
      </Menu>

      <Menu
        anchorEl={anchorElAdd}
        open={Boolean(anchorElAdd)}
        onClose={handleCloseAddMenu}
      >
        <MenuItem onClick={handleAddFolderFromMenu}>
          {/* <ListItemIcon>
            <CreateNewFolderIcon fontSize="small" />
          </ListItemIcon> */}
          <ListItemText>Tạo thư mục mới</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleSelectFileUpload}>
          <ListItemText>Tải tệp lên</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleSelectFolderUpload}>
          <ListItemText>Tải thư mục lên</ListItemText>
        </MenuItem>
      </Menu>

      {/* <Menu
        anchorEl={anchorElUpload}
        open={Boolean(anchorElUpload)}
        onClose={handleCloseUploadMenu}
      >
        <MenuItem onClick={handleSelectFileUpload}>
          <ListItemText>Tải tệp lên</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleSelectFolderUpload}>
          <ListItemText>Tải thư mục lên</ListItemText>
        </MenuItem>
      </Menu> */}
      <FilePreviewDialog
        open={viewingFile.open}
        onClose={handleCloseFileViewer}
        url={viewingFile.url}
        fileName={viewingFile.name}
      />
      <StyledUploadBackdrop
        open={isUploading}
      >
        <StyledUploadProgress />
        <StyledUploadText variant="h6">Đang tải lên, vui lòng đợi...</StyledUploadText>
      </StyledUploadBackdrop>
    </Container>
  );
}

Driver.propTypes = {
  onOpen: PropTypes.func,
  onUpload: PropTypes.func,
  onCreateFolder: PropTypes.func,
  onDownload: PropTypes.func,
  onDelete: PropTypes.func,
  onRename: PropTypes.func,
  onMove: PropTypes.func,
};

Driver.defaultProps = {
  // items: [], // No longer needed
};