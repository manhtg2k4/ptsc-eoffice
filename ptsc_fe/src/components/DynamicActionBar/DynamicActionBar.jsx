import React, { useState, useCallback } from 'react';
import { Tooltip, ToggleButton, Menu, MenuItem } from '@mui/material';
import { styled } from '@mui/material/styles';
import * as MuiIcons from '@mui/icons-material';
import { StyledButton } from "@styles/CustomTable.styles";
import { StyledToggleButtonGroup } from './ActionSection.styles';
import { SkyBox } from '@styles/SkyStyles';

const ActionBarContainer = styled(SkyBox)(({ theme }) => ({
    display: 'flex',
    gap: theme.spacing(1),
    alignItems: 'center',
}));

// Mở rộng IconMap đầy đủ theo ActionSection của bạn
const IconMap = {
    Add: MuiIcons.Add,
    Edit: MuiIcons.Edit,
    Delete: MuiIcons.Delete,
    Search: MuiIcons.Search,
    Save: MuiIcons.Save,
    Download: MuiIcons.CloudDownload,
    Export: MuiIcons.MoveToInbox, 
    Settings: MuiIcons.Settings,
    Upload: MuiIcons.Upload,
    History: MuiIcons.History,
    MeetingToggle: MuiIcons.CalendarMonth,
};

// Sub-component to handle individual action items and avoid inline functions in loops
const ActionItem = React.memo(({ item, onActionClick, onExportOpen, currentView, actions }) => {
    // Memoize actionProps to ensure stability for useCallback dependencies
    const actionProps = React.useMemo(() => item?.props || {}, [item]);
    
    // Fix: Avoid destructuring 'style' and 'color' to comply with lint rule
    const { icon, displayName, size, id } = actionProps;
    const itemStyle = actionProps.style; 
    const itemColor = actionProps.color;

    // Memoize handlers
    const handleClick = useCallback((event) => {
        if (itemStyle === 'export') {
            onExportOpen(event, actionProps);
        } else {
            onActionClick(actionProps);
        }
    }, [itemStyle, onExportOpen, onActionClick, actionProps]);

    const handleToggleChange = useCallback((e, nextView) => {
        if (!nextView) return;

        if (nextView === 'list') {
            onActionClick({ action: 'reset_view' });
        } else {
            const toggleAction = actions.find(a => a.props?.icon === 'MeetingToggle');
            if (toggleAction?.props) {
                onActionClick(toggleAction.props);
            }
        }
    }, [actions, onActionClick]);

    const IconComponent = IconMap[icon] || MuiIcons.HelpOutline;

    if (icon === 'MeetingToggle') {
        return (
            <StyledToggleButtonGroup
                value={currentView}
                exclusive
                onChange={handleToggleChange}
            >
                <ToggleButton value="list"><MuiIcons.ListAlt /></ToggleButton>
                <ToggleButton value="calendar"><MuiIcons.CalendarToday /></ToggleButton>
            </StyledToggleButtonGroup>
        );
    }

    return (
        <StyledButton
            key={item.id || id}
            variant="contained"
            iscolor={itemColor || 'primary'}
            size={size || 'medium'}
            onClick={handleClick}
        >
            <Tooltip title={displayName || (itemStyle === 'export' ? "Xuất file" : "Hành động")}>
                <IconComponent />
            </Tooltip>
        </StyledButton>
    );
});

ActionItem.displayName = 'ActionItem';

const DynamicActionBar = ({ actions, onActionClick, isCustomView=true }) => {
    // Sử dụng state để lưu anchor và item đang được export (tránh lỗi nếu có nhiều nút export)
    const [exportMenu, setExportMenu] = useState({ anchorEl: null, activeItem: null });
    
    // Đồng bộ view dựa trên state từ cha truyền xuống
    const currentView = isCustomView  ? 'calendar' : 'list';

    const handleExportOpen = useCallback((event, itemProps) => {
        setExportMenu({ anchorEl: event.currentTarget, activeItem: itemProps });
    }, []);

    const handleExportClose = useCallback(() => {
        setExportMenu({ anchorEl: null, activeItem: null });
    }, []);

    const handleExportClick = useCallback((type) => {
        if (onActionClick && exportMenu.activeItem) {
            onActionClick({ 
                action: 'export', 
                type: type, 
                ...exportMenu.activeItem 
            });
        }
        handleExportClose();
    }, [onActionClick, exportMenu.activeItem, handleExportClose]);

    const handleExportExcel = useCallback(() => handleExportClick('excel'), [handleExportClick]);
    const handleExportPdf = useCallback(() => handleExportClick('pdf'), [handleExportClick]);

    if (!actions || actions.length === 0) return null;

    return (
        <ActionBarContainer>
            {actions.map((item) => (
                <ActionItem 
                    key={item.id} 
                    item={item} 
                    onActionClick={onActionClick} 
                    onExportOpen={handleExportOpen}
                    currentView={currentView}
                    actions={actions}
                />
            ))}

            {/* Menu Export dùng chung cho tất cả các nút có style='export' */}
            <Menu
                anchorEl={exportMenu.anchorEl}
                open={Boolean(exportMenu.anchorEl)}
                onClose={handleExportClose}
            >
                <MenuItem onClick={handleExportExcel}>Xuất Excel</MenuItem>
                <MenuItem onClick={handleExportPdf}>Xuất PDF</MenuItem>
            </Menu>
        </ActionBarContainer>
    );
};

export default DynamicActionBar;