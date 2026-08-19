import React, { useCallback, useEffect, useState } from "react";
import {
  Tooltip,
  IconButton,
  Typography,
  Select,
  MenuItem,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import SettingsIcon from "@mui/icons-material/Settings";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import SaveIcon from "@mui/icons-material/Save";
import DownloadIcon from "@mui/icons-material/Download";
import UploadIcon from "@mui/icons-material/Upload";
import PropTypes from "prop-types";
import {
  ActionContainer,
  ActionWrapper,
  ButtonWrapper,
  ActionButton,
  ConfigIconButton,
  ConfigPopover,
  PopoverContent,
  PopoverSection,
  ConfigSettingsIcon,
} from "./ActionSection.styles";

import { useNavigate } from "react-router-dom";

const iconOptions = [
  { name: "Add", icon: <AddIcon /> },
  { name: "Edit", icon: <EditIcon /> },
  { name: "Delete", icon: <DeleteIcon /> },
  { name: "Search", icon: <SearchIcon /> },
  { name: "Save", icon: <SaveIcon /> },
  { name: "Download", icon: <DownloadIcon /> },
  { name: "Settings", icon: <SettingsIcon /> },
  { name: "Upload", icon: <UploadIcon /> },
];

const colorOptions = [
  "primary",
  "secondary",
  "success",
  "error",
  "warning",
  "info",
];
const sizeOptions = ["xs", "sm", "md", "lg", "xl"];
const displayTypeOptions = ["popup", "swiper"];

const ActionSection = ({
  item,
  onPropChange,
  onActionPopup,
  mode = "builder",
  data,
}) => {
  const selectOptions = data?.funcDataForm ?? [];
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleOpenConfig = (event) => {
    setAnchorEl(event.currentTarget);
  };
  //     const handleCloseConfig = () => {
  //     setAnchorEl(null);
  // };

  // const getIcon = (nameFind) => {
  //     return iconOptions.find(({ name }) => name === nameFind)?.icon
  // }

  // const hanldeChangeProp = (key, val) => {
  //     onPropChange(item.id, key, val)
  // }

  // const handleNavigate = () => {
  //     if (item?.props?.isRedirect && item?.props?.url) {
  //         navigate(`/${item?.props?.url}`)
  //     } else if (!item?.props?.isRedirect && item.props.fnCode) {
  //         onActionPopup && onActionPopup({
  //             code: item.props.fnCode,
  //             size: item.props.size,
  //             displayType: item.props.displayType,
  //             name: item.props.popupName,
  //         })
  //     }
  // }

  // useEffect(() => {
  //     if (mode === "builder") {
  //         if (item?.props?.isRedirect === undefined) {
  //             hanldeChangeProp("isRedirect", false);
  //         }
  //         if (!item?.props?.size) {
  //             hanldeChangeProp("size", "md");
  //         }
  //         if (!item?.props?.displayType) {
  //             hanldeChangeProp("displayType", "popup");
  //         }
  //     }
  // }, [item, mode]);

  const handleCloseConfig = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const getIcon = useCallback((nameFind) => {
    return iconOptions.find(({ name }) => name === nameFind)?.icon;
  }, []);

  const hanldeChangeProp = useCallback(
    (key, val) => {
      onPropChange(item.id, key, val);
    },
    [item.id, onPropChange]
  );

  const handleIconChange = useCallback(
    (iconName) => () => {
      hanldeChangeProp("icon", iconName);
      handleCloseConfig();
    },
    [hanldeChangeProp, handleCloseConfig]
  );

  const handleColorChange = useCallback(
    (color) => () => {
      hanldeChangeProp("color", color);
      handleCloseConfig();
    },
    [hanldeChangeProp, handleCloseConfig]
  );

  const handleRedirectModeChange = useCallback(
    (e) => {
      const isRedirect = e.target.value === "redirect";
      hanldeChangeProp("isRedirect", isRedirect);
      if (!isRedirect) {
        // Khi không chuyển hướng, xóa url để ẩn select chức năng
        hanldeChangeProp("url", "");
      }
    },
    [hanldeChangeProp]
  );

  const handleFunctionChange = useCallback(
    (e) => {
      const url = e.target.value;
      const selectedOpt = selectOptions.find((opt) => opt.url === url);
      // dispatch(setCode(selectedOpt?.code));
      hanldeChangeProp("url", url);
      hanldeChangeProp("fnCode", selectedOpt?.code);
      hanldeChangeProp("popupName", selectedOpt?.name);
    },
    [selectOptions, hanldeChangeProp]
  );

  const handleSizeChange = useCallback(
    (e) => {
      hanldeChangeProp("size", e.target.value);
    },
    [hanldeChangeProp]
  );

  const handleDisplayTypeChange = useCallback(
    (e) => {
      hanldeChangeProp("displayType", e.target.value);
    },
    [hanldeChangeProp]
  );

  const handleNavigate = useCallback(() => {
    if (item?.props?.isRedirect && item?.props?.url) {
      navigate(`/${item?.props?.url}`);
    } else if (!item?.props?.isRedirect && item.props.fnCode) {
      onActionPopup &&
        onActionPopup({
          code: item.props.fnCode,
          size: item.props.size,
          displayType: item.props.displayType,
          name: item.props.popupName,
        });
    }
  }, [item.props, navigate, onActionPopup]);

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
  }, [item, mode, hanldeChangeProp]);

  return (
    <ActionContainer>
      <ActionWrapper>
        <ButtonWrapper>
          <ActionButton
            variant="contained"
            // color={item?.props?.color}
            onClick={handleNavigate}
            size={item?.props?.size || "medium"}
          >
            <Tooltip>{getIcon(item?.props?.icon)}</Tooltip>
          </ActionButton>

          {mode === "builder" && (
            <ConfigIconButton
              size="small"
              onClick={handleOpenConfig}
              title="Cấu hình"
              isopen={Boolean(anchorEl)}
            >
              <ConfigSettingsIcon />
            </ConfigIconButton>
          )}
        </ButtonWrapper>

        {mode === "builder" && (
          <ConfigPopover
            open={Boolean(anchorEl)}
            anchorEl={anchorEl}
            onClose={handleCloseConfig}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "right",
            }}
          >
            <PopoverContent>
              <Typography variant="subtitle1">Chọn Icon</Typography>
              <PopoverSection>
                {iconOptions.map((opt) => (
                  <IconButton
                    key={opt.name}
                    onClick={handleIconChange(opt.name)}
                  >
                    {opt.icon}
                  </IconButton>
                ))}
              </PopoverSection>

              <Typography variant="subtitle1" mt={1}>
                Chọn màu
              </Typography>
              <PopoverSection>
                {colorOptions.map((color) => (
                  <ActionButton
                    key={color}
                    variant="contained"
                    // color={color}
                    // onClick={() => {
                    //     hanldeChangeProp('color', color)
                    //     handleCloseConfig();
                    // }}
                    onClick={handleColorChange(color)}
                  />
                ))}
              </PopoverSection>

              <Typography variant="subtitle1" mt={1}>
                Chọn chế độ
              </Typography>
              <Select
                fullWidth
                value={item?.props?.isRedirect ? "redirect" : "no-redirect"}
                // onChange={(e) => {
                //     const isRedirect = e.target.value === 'redirect';
                //     hanldeChangeProp('isRedirect', isRedirect);
                //     if (!isRedirect) {
                //         hanldeChangeProp('url', '');
                //     }
                // }}
                onChange={handleRedirectModeChange}
              >
                <MenuItem value="redirect">Chuyển hướng</MenuItem>
                <MenuItem value="no-redirect">Không chuyển hướng</MenuItem>
              </Select>

              <Typography variant="subtitle1" mt={1}>
                Chọn chức năng
              </Typography>
              <Select
                fullWidth
                value={item?.props?.url || ""}
                // onChange={(e) => {
                //     const url = e.target.value;
                //     const selectedOpt = selectOptions.find(opt => opt.url === url);
                //     // dispatch(setCode(selectedOpt?.code));
                //     hanldeChangeProp("url", url);
                //     hanldeChangeProp("fnCode", selectedOpt?.code);
                //     hanldeChangeProp("popupName", selectedOpt?.name);

                // }}
                onChange={handleFunctionChange}
              >
                {selectOptions.map((opt) => (
                  <MenuItem key={opt._id} value={opt.url}>
                    {opt.name}
                  </MenuItem>
                ))}
              </Select>

              {/* Nếu không chuyển hướng thì hiện thêm size + displayType */}
              {!item?.props?.isRedirect && (
                <>
                  <Typography variant="subtitle1" mt={1}>
                    Chọn kích thước
                  </Typography>
                  <Select
                    fullWidth
                    value={item?.props?.size || "md"}
                    // onChange={(e) => {
                    //     hanldeChangeProp('size', e.target.value);
                    // }}
                    onChange={handleSizeChange}
                  >
                    {sizeOptions.map((size) => (
                      <MenuItem key={size} value={size}>
                        {size.toUpperCase()}
                      </MenuItem>
                    ))}
                  </Select>

                  <Typography variant="subtitle1" mt={1}>
                    Chọn kiểu hiển thị
                  </Typography>
                  <Select
                    fullWidth
                    value={item?.props?.displayType || "popup"}
                    // onChange={(e) => {
                    //     hanldeChangeProp('displayType', e.target.value);
                    // }}
                    onChange={handleDisplayTypeChange}
                  >
                    {displayTypeOptions.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </>
              )}
            </PopoverContent>
          </ConfigPopover>
        )}
      </ActionWrapper>
    </ActionContainer>
  );
};

ActionSection.displayName = "ActionSection";
ActionSection.propTypes = {
  item: PropTypes.object.isRequired,
  onPropChange: PropTypes.func.isRequired,
  mode: PropTypes.oneOf(["builder", "preview"]),
  onActionPopup: PropTypes.func,
  data: PropTypes.object,
};
export default ActionSection;
