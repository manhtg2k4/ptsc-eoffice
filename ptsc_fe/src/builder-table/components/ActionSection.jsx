import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Tooltip, IconButton, Select, MenuItem, useMediaQuery, useTheme, DialogTitle, DialogContent, DialogActions, Button, Menu, ToggleButton, TextField } from '@mui/material';
import { styled } from '@mui/material/styles';
// import { StyledButton } from "@styles/CustomTable.styles";

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
// import MoveToInboxOutlinedIcon from '@mui/icons-material/MoveToInboxOutlined';
import UploadOutlinedIcon from '@mui/icons-material/UploadOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined';
import SyncOutlinedIcon from '@mui/icons-material/SyncOutlined';
import BookmarkBorderOutlinedIcon from '@mui/icons-material/BookmarkBorderOutlined';

import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import {
    ActionContainer,
    ActionWrapper,
    ButtonWrapper,
    ConfigIconButton,
    ConfigPopover,
    PopoverContent,
    PopoverSection,
    StyledTypography,
    ActionSettingsIcon,
    StyledActionDialog,
    StyledToggleButtonGroup,
    StyledTextButton,
    ModernActionButton,
} from './ActionSection.styles';

import { globalComponentRegistry } from "./componentRegistry";
import { tableComponents } from "./tableComponentRegistry";
import axiosInstance from "@utils/axiosInstance";
import { API_SYNC_GG_CALENDAR } from "@EnvironmentFile/constants/urlConfig";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import ImportExportIcon from '@mui/icons-material/ImportExport';

// Define locally to avoid TDZ
// const componentRegistryOptions = ...

// Meeting Toggle Component
const MeetingToggleIcon = ({ onViewChange }) => {
    const [view, setView] = useState('calendar');
    // Dùng ref để giữ reference ổn định, tránh useEffect re-trigger
    const onViewChangeRef = useRef(onViewChange);
    useEffect(() => {
        onViewChangeRef.current = onViewChange;
    });

    // Chỉ gọi 1 lần khi mount để set trạng thái mặc định là 'calendar'
    useEffect(() => {
        if (onViewChangeRef.current) {
            onViewChangeRef.current('calendar');
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleChange = (event, newView) => {
        if (newView !== null) {
            setView(newView);
            if (onViewChange) {
                onViewChange(newView);
            }
        }
    };

    return (
        <StyledToggleButtonGroup value={view} exclusive onChange={handleChange} size="small">
            <ToggleButton value="calendar">
                <Tooltip title="Lịch họp">
                    <CalendarTodayOutlinedIcon />
                </Tooltip>
            </ToggleButton>
            <ToggleButton value="list">
                <Tooltip title="Danh sách họp">
                    <ListAltOutlinedIcon />
                </Tooltip>
            </ToggleButton>
        </StyledToggleButtonGroup>
    );
};

const iconOptions = [
    { name: 'Add', icon: <AddRoundedIcon />, displayName: 'Thêm mới' },
    { name: 'Edit', icon: <EditOutlinedIcon />, displayName: 'Chỉnh sửa' },
    { name: 'Delete', icon: <DeleteOutlinedIcon />, displayName: 'Xóa' },
    { name: 'Search', icon: <SearchOutlinedIcon />, displayName: 'Tìm kiếm' },
    { name: 'Save', icon: <SaveOutlinedIcon />, displayName: 'Lưu' },
    { name: 'Download', icon: <FileDownloadOutlinedIcon />, displayName: 'Xuất file' },
    { 
        name: 'Export', 
        icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1.2998 12.6703L1.2998 9.99031C1.2998 9.62027 1.59978 9.32031 1.9698 9.32031C2.33983 9.32031 2.6398 9.62027 2.6398 9.99031L2.6398 12.6703L2.64307 12.7364C2.65828 12.8898 2.72612 13.0341 2.83609 13.144C2.96175 13.2697 3.13211 13.3403 3.3098 13.3403L12.6898 13.3403C12.8675 13.3403 13.0379 13.2697 13.1635 13.144C13.2892 13.0184 13.3598 12.848 13.3598 12.6703L13.3598 9.99031C13.3598 9.62027 13.6598 9.32031 14.0298 9.32031C14.3998 9.32031 14.6998 9.62027 14.6998 9.99031L14.6998 12.6703C14.6998 13.2034 14.4879 13.7145 14.1109 14.0914C13.734 14.4684 13.2229 14.6803 12.6898 14.6803L3.3098 14.6803C2.77672 14.6803 2.26562 14.4684 1.88867 14.0914C1.5589 13.7617 1.35535 13.3293 1.30962 12.8692L1.2998 12.6703Z" fill="currentColor"/>
                <path d="M10.9266 6.13471C11.1898 5.92007 11.5777 5.93521 11.823 6.18051C12.0683 6.4258 12.0835 6.81374 11.8689 7.07691L11.823 7.1279L8.47303 10.4779C8.21139 10.7396 7.78728 10.7396 7.52565 10.4779L4.17563 7.1279L4.12982 7.07691C3.91519 6.81374 3.93032 6.4258 4.17563 6.18051C4.42093 5.93521 4.80886 5.92007 5.07201 6.13471L5.12305 6.18051L7.99934 9.05676L10.8756 6.18051L10.9266 6.13471Z" fill="currentColor"/>
                <path d="M7.33008 10.0186L7.33008 1.97859C7.33008 1.60857 7.63004 1.30859 8.00008 1.30859C8.37012 1.30859 8.67008 1.60857 8.67008 1.97859L8.67008 10.0186C8.67008 10.3886 8.37012 10.6886 8.00008 10.6886C7.63004 10.6886 7.33008 10.3886 7.33008 10.0186Z" fill="currentColor"/>
            </svg>
        ), 
        displayName: 'Xuất file' 
    },
    { name: 'Settings', icon: <SettingsOutlinedIcon />, displayName: 'Cài đặt' },
    { name: 'Upload', icon: <UploadOutlinedIcon />, displayName: 'Tải lên' },
    { name: 'History', icon: <HistoryOutlinedIcon />, displayName: 'Lịch sử' },
    { name: 'Sync', icon: <SyncOutlinedIcon />, displayName: 'Đồng bộ Google Calendar' },
    { name: 'MeetingToggle', icon: <MeetingToggleIcon />, displayName: 'Lịch họp' },
    { name: 'Import', icon: <ImportExportIcon />, displayName: 'Nhập file' },
    { name: 'Reserve', icon: <BookmarkBorderOutlinedIcon />, displayName: 'Giữ số' },
];

// const colorOptions = ['primary', 'secondary', 'success', 'error', 'warning', 'info'];
const sizeOptions = ['xs', 'sm', 'md', 'lg', 'xl'];
const displayTypeOptions = ['popup', 'swiper', 'table'];
const styleOptions = ['default', 'export', 'link-form', 'text'];
const exportTypeOptions = ['excel', 'pdf'];

const styleConfigs = {
    export: {
        defaultIcon: 'Export',
        displayName: 'Tải xuống',
        showFields: ['style', 'color', 'displayName', 'exportApi'],
    },
    'link-form': {
        defaultIcon: 'Add',
        displayName: 'Thêm mới',
        showFields: ['style', 'icon', 'color', 'mode', 'function', 'size', 'displayType', 'displayName'],
    },
    default: {
        defaultIcon: 'Add',
        displayName: 'Thêm mới',

        showFields: ['style', 'icon', 'color', 'mode', 'function', 'size', 'displayType', 'displayName'],
    },
    text: {
        defaultIcon: 'Add',
        displayName: 'Thêm mới',
        showFields: ['style', 'icon', 'color', 'mode', 'function', 'size', 'displayType', 'displayName'],
    },
};

const ThemedIconButton = styled(IconButton)(({ theme }) => ({
    color: theme.palette.text.primary,
}));

const IconSelector = ({ onChange, handleClose }) => {
    const handleIconClick = (opt) => {
        onChange('icon', opt.name);
        onChange('displayName', opt.displayName);
        handleClose();
    };

    const createIconClickHandler = (opt) => () => {
        handleIconClick(opt);
    };

    return (
        <>
            <StyledTypography variant="subtitle1">Chọn Icon</StyledTypography>
            <PopoverSection>
                {iconOptions.map((opt) => (
                    <ThemedIconButton
                        key={opt.name}
                        onClick={createIconClickHandler(opt)}
                    >
                        {opt.icon}
                    </ThemedIconButton>
                ))}
            </PopoverSection>
        </>
    );
};

// const ColorSelector = ({ onChange, handleClose }) => {
// 	const handleColorClick = (colorOpt) => {
// 		onChange('color', colorOpt);
// 		handleClose();
// 	};
//     const createColorOptionClickHandler = (color) => () => {
//         handleColorClick(color);
//     };

// 	return (
// 		<>
// 			<StyledTypography variant="subtitle1" mt={1}>Chọn màu</StyledTypography>
// 			<PopoverSection>
// 				{colorOptions.map((colorOpt) => (
// 					<StyledActionButton
// 						key={colorOpt}
//                          styleColor={colorOpt}
// 						variant="contained"
// 						iscolor={colorOpt}
// 						onClick={createColorOptionClickHandler(colorOpt)}
// 					/>
// 				))}
// 			</PopoverSection>
// 		</>
// 	);
// };

const ModeSelector = ({ isRedirect, onChange }) => {
    const handleModeChange = (e) => {
        const newIsRedirect = e.target.value === 'redirect';
        onChange('isRedirect', newIsRedirect);
        if (!newIsRedirect) {
            onChange('url', '');
        }
    };

    return (
        <>
            <StyledTypography variant="subtitle1" mt={1}>Chọn chế độ</StyledTypography>
            <Select fullWidth value={isRedirect ? 'redirect' : 'no-redirect'} onChange={handleModeChange}>
                <MenuItem value="redirect">Chuyển hướng</MenuItem>
                <MenuItem value="no-redirect">Không chuyển hướng</MenuItem>
            </Select>
        </>
    );
};


const FunctionSelector = ({ url, onChange, selectOptions }) => {
    const handleUrlChange = (e) => {
        const url = e.target.value;
        const selectedOpt = selectOptions.find(opt => opt.url === url);
        onChange('url', url);
        onChange('fnCode', selectedOpt?.code);
        onChange('popupName', selectedOpt?.name);
    };
    return (
        <>
            <StyledTypography variant="subtitle1" mt={1}>Chọn chức năng</StyledTypography>
            <Select
                fullWidth
                value={url || ''}
                onChange={handleUrlChange}
            >
                {selectOptions.map((opt) => (
                    <MenuItem key={opt._id} value={opt.url}>
                        {opt.name}
                    </MenuItem>
                ))}
            </Select>
        </>
    );
}

const SizeSelector = ({ size, onChange }) => {
    const handleSizeChange = (e) => {
        onChange('size', e.target.value);
    };

    return (
        <>
            <StyledTypography variant="subtitle1" mt={1}>Chọn kích thước</StyledTypography>
            <Select fullWidth value={size || 'md'} onChange={handleSizeChange}
            >
                {sizeOptions.map((size) => (
                    <MenuItem key={size} value={size}>
                        {size.toUpperCase()}
                    </MenuItem>
                ))}
            </Select>
        </>
    );
};


const DisplayTypeSelector = ({ displayType, onChange }) => {
    const handleDisplayTypeChange = (e) => {
        onChange('displayType', e.target.value);
    };
    return (
        <>
            <StyledTypography variant="subtitle1" mt={1}>Chọn kiểu hiển thị</StyledTypography>
            <Select
                fullWidth
                value={displayType || 'popup'}
                onChange={handleDisplayTypeChange}
            >
                {displayTypeOptions.map((type) => (
                    <MenuItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                    </MenuItem>
                ))}
            </Select>
        </>
    );
};

const ExportTypeSelector = ({ exportType, onChange }) => {
    const handleExportTypeChange = (e) => {
        onChange('exportType', e.target.value);
    };
    return (
        <>
            <StyledTypography variant="subtitle1" mt={1}>Chọn kiểu xuất file</StyledTypography>
            <Select
                fullWidth
                value={exportType || 'excel'}
                onChange={handleExportTypeChange}
            >
                {exportTypeOptions.map((type) => (
                    <MenuItem key={type} value={type}>
                        {type.toUpperCase()}
                    </MenuItem>
                ))}
            </Select>
        </>
    );
};

const ExportApiInput = ({ exportApi, onChange }) => {
    const handleExportApiChange = (e) => {
        onChange('exportApi', e.target.value);
    };
    return (
        <>
            <StyledTypography variant="subtitle1" mt={1}>API xuất file riêng</StyledTypography>
            <TextField
                fullWidth
                size="small"
                value={exportApi || ''}
                onChange={handleExportApiChange}
                placeholder="Nhập API xuất file (VD: /api/v1/custom-export)"
            />
        </>
    );
};

ExportApiInput.propTypes = {
    exportApi: PropTypes.string,
    onChange: PropTypes.func.isRequired,
};


const DisplayNameSelector = ({ displayName, onChange }) => {
    const handleDisplayNameChange = (e) => {
        onChange('displayName', e.target.value);
    };
    return (
        <>
            <StyledTypography variant="subtitle1" mt={1}>Tên hiển thị</StyledTypography>
            <TextField
                fullWidth
                size="small"
                value={displayName || ''}
                onChange={handleDisplayNameChange}
            />
        </>
    );
};

// const ComponentSelector = ({ componentKey, onChange }) => (
//     <>
//         <StyledTypography variant="subtitle1" mt={1}>Chọn Component hiển thị</StyledTypography>
//         <Select
//             fullWidth
//             value={componentKey || ''}
//             onChange={(e) => {
//                 const selectedKey = e.target.value;
//                 const selectedComponent = componentRegistryOptions.find(c => c.key === selectedKey);
//                 onChange('componentKey', selectedKey);
//                 if (selectedComponent) {
//                     onChange('popupName', selectedComponent.title);
//                 }
//             }}
//         >
//             {componentRegistryOptions.map((opt) => (
//                 <MenuItem key={opt.key} value={opt.key}>
//                     {opt.title}
//                 </MenuItem>
//             ))}
//         </Select>
//     </>
// );

const ComponentSelector = ({ componentKey, onChange, displayType }) => {
    // const handleComponentChange = (e) => {
    //     const selectedKey = e.target.value;
    //     const selectedComponent = componentRegistryOptions.find(c => c.key === selectedKey);
    //     onChange('componentKey', selectedKey);
    //     if (selectedComponent) {
    //         onChange('popupName', selectedComponent.title);
    //     }
    // };
    const componentRegistryOptions = Object.keys(globalComponentRegistry).map(key => ({ key, ...globalComponentRegistry[key] }));
    const tableComponentOptions = Object.keys(tableComponents).map(key => ({ key, ...tableComponents[key] }));
    const options = displayType === 'table' ? tableComponentOptions : componentRegistryOptions;

    const handleComponentChange = (e) => {
        const selectedKey = e.target.value;
        const selectedComponent = options.find(c => c.key === selectedKey);
        onChange('componentKey', selectedKey);
        if (selectedComponent) {
            onChange('popupName', selectedComponent.title);
        }
    };

    // Lọc components dựa trên displayType
    const filteredComponents = options.filter(opt => {
        if (displayType === 'table') {
            // Khi chọn table, hiển thị tất cả các component dành cho table
            return true;
        } else if (displayType === 'popup') {
            // Khi chọn popup, chỉ hiển thị các component có type:'popup'
            return opt.type === 'popup';
        } else {
            // Khi chọn swiper, hiển thị các component không có type:'popup' hoặc không có type
            return !opt.type || opt.type !== 'popup';
        }
    });

    return (
        <>
            <StyledTypography variant="subtitle1" mt={1}>Chọn Component hiển thị</StyledTypography>
            <Select
                fullWidth
                value={componentKey || ''}
                onChange={handleComponentChange}
            >
                {filteredComponents.map((opt) => (
                    <MenuItem key={opt.key} value={opt.key}>{opt.title}</MenuItem>
                ))}
            </Select>
        </>
    );
};

const ActionSection = ({ item, onPropChange, onActionPopup, onExport, mode = 'builder', data }) => {
    const { dataUser: authUser } = useSelector((state) => state.auth || {});
    const selectOptions = data?.funcDataForm ?? [];
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState(null);
    const [exportMenuAnchorEl, setExportMenuAnchorEl] = useState(null);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isLaptopOrSmaller = useMediaQuery(theme.breakpoints.down('lg'));
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

    const handleSyncGoogle = () => {
        setIsConfirmDialogOpen(true);
    };

    const handleCloseConfirmDialog = () => {
        setIsConfirmDialogOpen(false);
    };

    const confirmSync = async () => {
        setIsConfirmDialogOpen(false);
        setIsSyncing(true);
        try {
            const response = await axiosInstance.get(API_SYNC_GG_CALENDAR);
            if (response && response.url) {
                window.location.href = response.url;
            }
        } catch (error) {
            logger.error("Sync error:", error);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleOpenConfig = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseConfig = () => {
        setAnchorEl(null);
    };

    const handleOpenConfigResponsive = (event) => {
        if (isMobile) {
            setIsConfigOpen(true);
        } else {
            handleOpenConfig(event);
        }
    };

    const getIcon = (nameFind) => {
        return iconOptions.find(({ name }) => name === nameFind)?.icon;
    };

    const hanldeChangeProp = useCallback((key, val) => {
        onPropChange(item.id, key, val);
        if (key === 'style') {
            const defaultIcon = styleConfigs[val]?.defaultIcon || 'Add';
            onPropChange(item.id, 'icon', defaultIcon);
            onPropChange(item.id, 'displayName', styleConfigs[val]?.displayName || 'Thêm mới');
        }
    }, [item.id, onPropChange]);

    const handleExportClose = () => {
        setExportMenuAnchorEl(null);
    };

    const handleExportSelect = (type) => {
        onExport && onExport({
            exportType: type,
            exportApi: item?.props?.exportApi
        });
        handleExportClose();
    };

    const handleExportExcel = () => handleExportSelect('excel');
    const handleExportPdf = () => handleExportSelect('pdf');

    const handleNavigate = useCallback((event) => {
        // console.log("Nút 'Thêm mới' được click. Cấu hình (item.props):", item.props);

        if (item?.props?.icon === 'Sync') {
            handleSyncGoogle();
            return;
        }

        if (item?.props?.style === 'export') {
            setExportMenuAnchorEl(event?.currentTarget);
        } else if (item?.props?.isRedirect && item?.props?.url) {
            navigate(`/${item?.props?.url}`);
        } else if (!item?.props?.isRedirect && item.props.fnCode) {
            handleCloseConfig();
            requestAnimationFrame(() => {
                onActionPopup && onActionPopup({
                    code: item.props.fnCode,
                    size: item.props.size,
                    displayType: item.props.displayType,
                    name: item.props.popupName,
                });
            });
        } else if (!item?.props?.isRedirect && item.props.componentKey) {
            const componentRegistryOptions = Object.keys(globalComponentRegistry).map(key => ({ key, ...globalComponentRegistry[key] }));
            const tableComponentOptions = Object.keys(tableComponents).map(key => ({ key, ...tableComponents[key] }));
            const options = item.props.displayType === 'table' ? tableComponentOptions : componentRegistryOptions;
            const componentInfo = options.find(c => c.key === item.props.componentKey);
            if (componentInfo) {
                handleCloseConfig();
                requestAnimationFrame(() => {
                    onActionPopup && onActionPopup({
                        componentKey: item.props.componentKey,
                        size: item.props.size,
                        displayType: item.props.displayType,
                        name: item.props.popupName || componentInfo.title,
                        dialogKey: componentInfo.dialogKey,
                    });
                });
            } else {
                // Component không tồn tại trong registry
            }
        }
    }, [item, navigate, onActionPopup]);

    const handleMeetingViewChange = useCallback((newView) => {
        if (newView === 'calendar') {
            handleNavigate();
        } else if (newView === 'list' && onActionPopup) {
            onActionPopup({ action: 'reset_view' });
        }
    }, [handleNavigate, onActionPopup]);

    //    const handleNavigate = () => {
    //     // ĐÓNG POPOVER NGAY TRƯỚC KHI MỞ COMPONENT MỚI
    //     handleCloseConfig();  // Thêm dòng này là fix 99% trường hợp
    // document.querySelectorAll('[data-swipper="true"]').forEach(el => el.remove());
    //     // Dùng setTimeout 0 để đảm bảo backdrop đã bị unmount hoàn toàn
    //     setTimeout(() => {
    //         if (item?.props?.style === 'export') {
    //             onExport && onExport(item);
    //         } else if (item?.props?.isRedirect && item?.props?.url) {
    //             navigate(`/${item?.props?.url}`);
    //         } else if (!item?.props?.isRedirect && item.props.fnCode) {
    //             onActionPopup && onActionPopup({
    //                 code: item.props.fnCode,
    //                 size: item.props.size,
    //                 displayType: item.props.displayType,
    //                 name: item.props.popupName,
    //             });
    //         } else if (!item?.props?.isRedirect && item.props.componentKey) {
    //             const componentInfo = componentRegistryOptions.find(c => c.key === item.props.componentKey);
    //             if (componentInfo) {
    //                 onActionPopup && onActionPopup({
    //                     componentKey: item.props.componentKey,
    //                     size: item.props.size,
    //                     displayType: item.props.displayType,
    //                     name: item.props.popupName || componentInfo.title,
    //                 });
    //             }
    //         }
    //     }, 0);
    // };
    useEffect(() => {
        if (mode === "builder") {
            if (item?.props?.isRedirect === undefined) {
                hanldeChangeProp("isRedirect", false);
            }
            if (!item?.props?.size) {
                hanldeChangeProp("size", "md");
            }
            if (!item?.props?.displayType) {
                hanldeChangeProp("displayType", "swiper");
            }
            if (!item?.props?.style) {
                hanldeChangeProp("style", "default");
            }
        }
    }, [item, mode, hanldeChangeProp]);

    const currentStyle = item?.props?.style || 'default';
    const visibleFields = styleConfigs[currentStyle]?.showFields || [];

    const handleCloseConfigResponsive = () => {
        setIsConfigOpen(false);
        handleCloseConfig();
    };
    const handleStyleChange = (e) => {
        hanldeChangeProp('style', e.target.value);
    };
    return (
        <ActionContainer>
            <ActionWrapper>
                <ButtonWrapper>
                    {item?.props?.icon === 'Sync' && authUser?.isGoogleCalendarVerified && mode !== 'builder' ? null : (
                        item?.props?.icon === 'MeetingToggle' ? (
                            <>
                                {React.cloneElement(getIcon(item?.props?.icon), {
                                    onViewChange: handleMeetingViewChange
                                })}
                                {mode === 'builder' && (
                                    <ConfigIconButton
                                        size="small"
                                        onClick={handleOpenConfigResponsive}
                                        title="Cấu hình"
                                        isopen={Boolean(anchorEl)}
                                    >
                                        <ActionSettingsIcon />
                                    </ConfigIconButton>
                                )}
                            </>
                        ) : (
                            <>
                                {item?.props?.style === 'text' && !isLaptopOrSmaller ? (
                                    <StyledTextButton
                                        variant="contained"
                                        iscolor={item?.props?.color}
                                        onClick={handleNavigate}
                                        size={item?.props?.size || 'medium'}
                                        startIcon={getIcon(item?.props?.icon)}
                                    >
                                        {item?.props?.displayName || (iconOptions.find(i => i.name === item?.props?.icon)?.displayName) || 'Hành động'}
                                    </StyledTextButton>
                                ) : (
                                    <ModernActionButton
                                        onClick={handleNavigate}
                                    >
                                        <Tooltip title={item?.props?.displayName || (iconOptions.find(i => i.name === item?.props?.icon)?.displayName) || 'Hành động'}>
                                            {getIcon(item?.props?.icon)}
                                        </Tooltip>
                                    </ModernActionButton>
                                )}

                                {mode === 'builder' && (
                                    <ConfigIconButton
                                        size="small"
                                        onClick={handleOpenConfigResponsive}
                                        title="Cấu hình"
                                        isopen={Boolean(anchorEl)}
                                    >
                                        <ActionSettingsIcon />
                                    </ConfigIconButton>
                                )}
                            </>
                        ))}
                </ButtonWrapper>

                <Menu
                    anchorEl={exportMenuAnchorEl}
                    open={Boolean(exportMenuAnchorEl)}
                    onClose={handleExportClose}
                >
                    <MenuItem onClick={handleExportExcel}>Xuất Excel</MenuItem>
                    <MenuItem onClick={handleExportPdf}>Xuất PDF</MenuItem>
                </Menu>

                {mode === 'builder' && (
                    isMobile ? (
                        <StyledActionDialog open={isConfigOpen} onClose={handleCloseConfigResponsive} fullWidth>
                            <DialogTitle>Cấu hình nút</DialogTitle>
                            <DialogContent>
                                <PopoverContent>
                                    {/* Nội dung cấu hình giống hệt Popover */}
                                    <StyledTypography variant="subtitle1">Chọn kiểu</StyledTypography>
                                    <Select fullWidth value={currentStyle} onChange={handleStyleChange}>
                                        {styleOptions.map((style) => (<MenuItem key={style} value={style}>{style.charAt(0).toUpperCase() + style.slice(1)}</MenuItem>))}
                                    </Select>
                                    {visibleFields.includes('exportType') && <ExportTypeSelector exportType={item?.props?.exportType} onChange={hanldeChangeProp} />}
                                    {visibleFields.includes('exportApi') && <ExportApiInput exportApi={item?.props?.exportApi} onChange={hanldeChangeProp} />}
                                    {/* {visibleFields.includes('color') && <ColorSelector iscolor={item?.props?.color} onChange={hanldeChangeProp} handleClose={handleCloseConfigResponsive} />} */}
                                    {visibleFields.includes('icon') && <IconSelector icon={item?.props?.icon} onChange={hanldeChangeProp} handleClose={handleCloseConfigResponsive} />}
                                    {visibleFields.includes('displayName') && <DisplayNameSelector displayName={item?.props?.displayName} onChange={hanldeChangeProp} />}
                                    {visibleFields.includes('mode') && <ModeSelector isRedirect={item?.props?.isRedirect} onChange={hanldeChangeProp} />}
                                    {visibleFields.includes('function') && <FunctionSelector url={item?.props?.url} onChange={hanldeChangeProp} selectOptions={selectOptions} />}
                                    {!item?.props?.isRedirect && (
                                        <>
                                            {visibleFields.includes('displayType') && <DisplayTypeSelector displayType={item?.props?.displayType} onChange={hanldeChangeProp} />}
                                            {(item.props.displayType === 'swiper' || item.props.displayType === 'popup' || item.props.displayType === 'table') && currentStyle !== 'export' && <ComponentSelector componentKey={item?.props?.componentKey} onChange={hanldeChangeProp} displayType={item?.props?.displayType} />}


                                            <SizeSelector size={item?.props?.size} onChange={hanldeChangeProp} />
                                        </>
                                    )}
                                </PopoverContent>
                            </DialogContent>
                            <DialogActions>
                                <Button onClick={handleCloseConfigResponsive}>Đóng</Button>
                            </DialogActions>
                        </StyledActionDialog>
                    ) : (
                        <ConfigPopover
                            open={Boolean(anchorEl)}
                            anchorEl={anchorEl}
                            onClose={handleCloseConfig}
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        >
                            <PopoverContent>
                                <StyledTypography variant="subtitle1">Chọn kiểu</StyledTypography>
                                <Select fullWidth value={currentStyle} onChange={handleStyleChange}>
                                    {styleOptions.map((style) => (<MenuItem key={style} value={style}>{style.charAt(0).toUpperCase() + style.slice(1)}</MenuItem>))}
                                </Select>
                                {visibleFields.includes('exportType') && <ExportTypeSelector exportType={item?.props?.exportType} onChange={hanldeChangeProp} />}
                                {visibleFields.includes('exportApi') && <ExportApiInput exportApi={item?.props?.exportApi} onChange={hanldeChangeProp} />}
                                {/* {visibleFields.includes('color') && <ColorSelector iscolor={item?.props?.color} onChange={hanldeChangeProp} handleClose={handleCloseConfig} />} */}
                                {visibleFields.includes('icon') && <IconSelector icon={item?.props?.icon} onChange={hanldeChangeProp} handleClose={handleCloseConfig} />}
                                {visibleFields.includes('displayName') && <DisplayNameSelector displayName={item?.props?.displayName} onChange={hanldeChangeProp} />}
                                {visibleFields.includes('mode') && <ModeSelector isRedirect={item?.props?.isRedirect} onChange={hanldeChangeProp} />}
                                {visibleFields.includes('function') && <FunctionSelector url={item?.props?.url} onChange={hanldeChangeProp} selectOptions={selectOptions} />}
                                {!item?.props?.isRedirect && (
                                    <>
                                        {visibleFields.includes('displayType') && <DisplayTypeSelector displayType={item?.props?.displayType} onChange={hanldeChangeProp} />}
                                        {(item.props.displayType === 'swiper' || item.props.displayType === 'popup' || item.props.displayType === 'table') && currentStyle !== 'export' && <ComponentSelector componentKey={item?.props?.componentKey} onChange={hanldeChangeProp} displayType={item?.props?.displayType} />}
                                        <SizeSelector size={item?.props?.size} onChange={hanldeChangeProp} />
                                    </>
                                )}
                            </PopoverContent>
                        </ConfigPopover>
                    )
                )}
            </ActionWrapper>

            <CustomDialog
                open={isConfirmDialogOpen}
                onClose={handleCloseConfirmDialog}
                title="Xác nhận đồng bộ"
                onSave={confirmSync}
                isLoading={isSyncing}
                titleButton="Xác nhận"
            >
                Bạn có chắc chắn muốn đồng bộ lịch cá nhân của mình lên Google Calendar không?
            </CustomDialog>
        </ActionContainer>
    );
};

ActionSection.displayName = 'ActionSection';
ActionSection.propTypes = {
    item: PropTypes.object.isRequired,
    onPropChange: PropTypes.func.isRequired,
    mode: PropTypes.oneOf(['builder', 'preview']),
    onActionPopup: PropTypes.func,
    onExport: PropTypes.func,
    data: PropTypes.object,
    exportType: PropTypes.string,
    onChange: PropTypes.func,
};

export default ActionSection;