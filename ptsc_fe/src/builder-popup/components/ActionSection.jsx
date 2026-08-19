import React, { useEffect, useState } from 'react';
import { Tooltip, Select, MenuItem, IconButton } from '@mui/material';
import { StyledButton } from "@styles/CustomTable.styles";

import AddIcon from '@mui/icons-material/Add';
import SettingsIcon from '@mui/icons-material/Settings';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import SaveIcon from '@mui/icons-material/Save';
import DownloadIcon from '@mui/icons-material/Download';
import PropTypes from 'prop-types';
import {
    ActionContainer,
    ActionWrapper,
    ButtonWrapper,
    ConfigIconButton,
    ConfigPopover,
    PopoverContent,
    PopoverSection,
    StyledActionSettingsIcon,
    StyledTypography,
} from './ActionSection.styles';

import { useNavigate } from 'react-router-dom';

const iconOptions = [
    { name: 'Add', icon: <AddIcon /> },
    { name: 'Edit', icon: <EditIcon /> },
    { name: 'Delete', icon: <DeleteIcon /> },
    { name: 'Search', icon: <SearchIcon /> },
    { name: 'Save', icon: <SaveIcon /> },
    { name: 'Download', icon: <DownloadIcon /> },
    { name: 'Settings', icon: <SettingsIcon /> },
];

const colorOptions = ['primary', 'secondary', 'success', 'error', 'warning', 'info'];
const sizeOptions = ['xs', 'sm', 'md', 'lg', 'xl'];
const displayTypeOptions = ['popup', 'swiper'];

const ActionSection = ({
    item,
    onPropChange,
    onActionPopup,
    mode = 'builder',
    data }) => {

    const selectOptions = data?.funcDataForm ?? [];
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState(null);

    const handleOpenConfig = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseConfig = () => {
        setAnchorEl(null);
    };

    const getIcon = (nameFind) => {
        return iconOptions.find(({ name }) => name === nameFind)?.icon
    }

    const hanldeChangeProp = (key, val) => {
        onPropChange(item.id, key, val)
    }

    const handleNavigate = () => {
        if (item?.props?.isRedirect && item?.props?.url) {
            navigate(`/${item?.props?.url}`)
        } else if (!item?.props?.isRedirect && item.props.fnCode) {
            onActionPopup && onActionPopup({
                code: item.props.fnCode,
                size: item.props.size,
                displayType: item.props.displayType,
                name: item.props.popupName,
            })
        }
    }

    useEffect(() => {
        if (mode === "builder") {
            if (item?.props?.isRedirect === undefined) {
                hanldeChangeProp("isRedirect", false);
            }
            if (!item?.props?.size) {
                hanldeChangeProp("size", "md");
            }
            if (!item?.props?.displayType) {
                hanldeChangeProp("displayType", "popup");
            }
        }
    }, [item, mode]);
    const createIconSelectHandler = (iconName) => () => {
        hanldeChangeProp('icon', iconName);
        handleCloseConfig();
    };

    const createColorSelectHandler = (color) => () => {
        hanldeChangeProp('color', color);
        handleCloseConfig();
    };
    const handleRedirectChange = (e) => {
        const isRedirect = e.target.value === 'redirect';
        hanldeChangeProp('isRedirect', isRedirect);

        if (!isRedirect) {
            hanldeChangeProp('url', '');
        }
    };
    const handleUrlChange = (e) => {
        const url = e.target.value;
        const selectedOpt = selectOptions.find(opt => opt.url === url);

        // Nếu cần dispatch thêm
        // dispatch(setCode(selectedOpt?.code));

        hanldeChangeProp("url", url);
        hanldeChangeProp("fnCode", selectedOpt?.code);
        hanldeChangeProp("popupName", selectedOpt?.name);
    };
    const handleSizeChange = (e) => {
        hanldeChangeProp('size', e.target.value);
    };
    const handleDisplayTypeChange = (e) => {
        hanldeChangeProp('displayType', e.target.value);
    };


    return (
        <ActionContainer>
            <ActionWrapper>
                <ButtonWrapper>
                    <StyledButton
                        variant="contained"
                        iscolor={item?.props?.color}
                        onClick={handleNavigate}
                        size={item?.props?.size || 'medium'}
                    >
                        <Tooltip>
                            {getIcon(item?.props?.icon)}
                        </Tooltip>
                    </StyledButton>

                    {mode === 'builder' && (
                        <ConfigIconButton
                            size="small"
                            onClick={handleOpenConfig}
                            title="Cấu hình"
                            isopen={Boolean(anchorEl)}
                        >
                            <StyledActionSettingsIcon/>
                        </ConfigIconButton>
                    )}
                </ButtonWrapper>

                {mode === 'builder' && (
                    <ConfigPopover
                        open={Boolean(anchorEl)}
                        anchorEl={anchorEl}
                        onClose={handleCloseConfig}
                        anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'right',
                        }}
                    >
                        <PopoverContent>
                            <StyledTypography variant="subtitle1">Chọn Icon</StyledTypography>
                            <PopoverSection>
                                {iconOptions.map((opt) => (
                                    <IconButton
                                        key={opt.name}
                                        onClick={createIconSelectHandler(opt.name)}
                                    >
                                        {opt.icon}
                                    </IconButton>
                                ))}
                            </PopoverSection>

                            <StyledTypography variant="subtitle1" mt={1}>Chọn màu</StyledTypography>
                            <PopoverSection>
                                {colorOptions.map((color) => (
                                    <StyledButton
                                        key={color}
                                        variant="contained"
                                        iscolor={color}
                                        onClick={createColorSelectHandler(color)}
                                    />
                                ))}
                            </PopoverSection>

                            <StyledTypography variant="subtitle1" mt={1}>Chọn chế độ</StyledTypography>
                            <Select
                                fullWidth
                                value={item?.props?.isRedirect ? 'redirect' : 'no-redirect'}
                                onChange={handleRedirectChange}
                            >
                                <MenuItem value="redirect">Chuyển hướng</MenuItem>
                                <MenuItem value="no-redirect">Không chuyển hướng</MenuItem>
                            </Select>

                            <StyledTypography variant="subtitle1" mt={1}>Chọn chức năng</StyledTypography>
                            <Select
                                fullWidth
                                value={item?.props?.url || ''}
                                onChange={handleUrlChange}
                            >
                                {selectOptions.map((opt) => (
                                    <MenuItem key={opt._id} value={opt.url}>
                                        {opt.name}
                                    </MenuItem>
                                ))}
                            </Select>

                            {/* Nếu không chuyển hướng thì hiện thêm size + displayType */}
                            {!item?.props?.isRedirect && (
                                <React.Fragment>
                                    <StyledTypography variant="subtitle1" mt={1}>Chọn kích thước</StyledTypography>
                                    <Select
                                        fullWidth
                                        value={item?.props?.size || 'md'}
                                        onChange={handleSizeChange}
                                    >
                                        {sizeOptions.map((size) => (
                                            <MenuItem key={size} value={size}>
                                                {size.toUpperCase()}
                                            </MenuItem>
                                        ))}
                                    </Select>

                                    <StyledTypography variant="subtitle1" mt={1}>Chọn kiểu hiển thị</StyledTypography>
                                    <Select
                                        fullWidth
                                        value={item?.props?.displayType || 'popup'}
                                        onChange={handleDisplayTypeChange}
                                    >
                                        {displayTypeOptions.map((type) => (
                                            <MenuItem key={type} value={type}>
                                                {type.charAt(0).toUpperCase() + type.slice(1)}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </React.Fragment>
                            )}
                        </PopoverContent>
                    </ConfigPopover>
                )}
            </ActionWrapper>
        </ActionContainer>
    );
};

ActionSection.displayName = 'ActionSection';
ActionSection.propTypes = {
    item: PropTypes.object.isRequired,
    onPropChange: PropTypes.func.isRequired,
    mode: PropTypes.oneOf(['builder', 'preview']),
    onActionPopup: PropTypes.func,
    data: PropTypes.object,
};
export default ActionSection;