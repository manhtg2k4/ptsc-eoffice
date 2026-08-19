import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { IconButton, Tooltip, Menu, MenuItem, TextField, Button, Popover, Radio, FormControlLabel, Switch, Box } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { Settings, Add, Save, Delete } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import CustomInput from "@components/CustomInput/CustomInput";
import PropTypes from 'prop-types';
import { SkyBox, SkyTypography } from '@styles/SkyStyles';

const StyledMoreIcon = styled(MoreVertIcon)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontWeight: 'bold',
}));

const ConfigBox = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(2),
  width: 350,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}));

const ItemsConfigList = styled(SkyBox)(({ theme }) => ({
  maxHeight: 400,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  paddingRight: theme.spacing(0.5),
}));

const ConfigItemRow = styled(SkyBox)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(1.5),
  borderRadius: theme.shape.borderRadius,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  position: 'relative',
}));

const DeleteButtonWrapper = styled(SkyBox)({
  position: 'absolute',
  top: 4,
  right: 4,
});

const Container = styled(SkyBox)({
  display: 'flex',
  alignItems: 'center',
  position: 'relative',
});

const RadioLabel = styled(FormControlLabel)({
  width: '100%',
  margin: 0,
});

const GearButton = styled(IconButton)({
  marginLeft: 4,
});

const SaveButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(1),
}));

const StyledSettingsIcon = styled(Settings)(({ theme }) => ({
    fontSize: '1.25rem', // small equivalent
    color: theme.palette.primary.main,
}));

const StyledDeleteIcon = styled(Delete)(({ theme }) => ({
    fontSize: '1.25rem', // small equivalent
    color: theme.palette.error.main,
}));

const StyledIconButtonError = styled(IconButton)(({ theme }) => ({
    color: theme.palette.error.main,
}));

// Style mới cho hiển thị nằm ngang (Horizontal Bar)
const HorizontalBarContainer = styled(SkyBox)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(3),
    padding: theme.spacing(1, 3),
    backgroundColor: '#fff',
    borderRadius: '25px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1px solid #ebebeb',
    width: 'fit-content',
}));

const HorizontalItem = styled(SkyBox)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    cursor: 'pointer',
    userSelect: 'none',
}));

const HorizontalLabel = styled(SkyTypography)(({ isActive }) => ({
    fontWeight: 500,
    fontSize: '0.925rem',
    color: isActive ? '#1976d2' : '#000',
}));

const CountText = styled('span')(({ theme }) => ({
  marginLeft: theme.spacing(0.5),
  marginRight: theme.spacing(0.5),
  fontSize: '0.85rem',
  color: '#666',
  fontWeight: 'normal',
}));

const LabelBox = styled(Box)({
  display: 'flex', 
  alignItems: 'center',
});

const CustomRadioButton = styled(SkyBox)(({ isActive }) => ({
    width: 20,
    height: 20,
    borderRadius: '50%',
    border: `2px solid ${isActive ? '#1976d2' : '#bdbdbd'}`, // Màu xám khi chưa chọn
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    transition: 'all 0.2s',
    '&::after': {
        content: '""',
        width: 10,
        height: 10,
        borderRadius: '50%',
        backgroundColor: isActive ? '#1976d2' : 'transparent',
    }
}));


const ConfigItem = React.memo(({ item, onRemove, onUpdate, funcDataList }) => {
  const handleRemove = React.useCallback(() => {
    onRemove(item.id);
  }, [item.id, onRemove]);

  const handleLabelChange = React.useCallback((e) => {
    onUpdate(item.id, 'label', e.target.value);
  }, [item.id, onUpdate]);

  const handleFuncChange = React.useCallback((val) => {
    onUpdate(item.id, 'func', val);
  }, [item.id, onUpdate]);

  const handleTypeChange = React.useCallback(function(e) {
    onUpdate(item.id, 'type', e.target.value);
  }, [item.id, onUpdate]);

  return (
    <ConfigItemRow>
      <DeleteButtonWrapper>
        <StyledIconButtonError size="small" onClick={handleRemove}>
          <StyledDeleteIcon />
        </StyledIconButtonError>
      </DeleteButtonWrapper>

      <TextField
        size="small"
        label="Tên"
        value={item.label}
        onChange={handleLabelChange}
        fullWidth
      />

      <CustomInput
        label="Chức năng"
        fullWidth
        size="small"
        value={item.func}
        onChange={handleFuncChange}
        select
        options={funcDataList}
        customValue="code"
        customLabel="name"
      />

      <TextField
        size="small"
        label="Type"
        value={item.type || ""}
        onChange={handleTypeChange}
        fullWidth
      />
    </ConfigItemRow>
  );
});
ConfigItem.displayName = 'ConfigItem';

export default function MoreAction({ item, onPropChange, mode = "builder", data, onSearch }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [configAnchorEl, setConfigAnchorEl] = useState(null);
  const [items, setItems] = useState(item.props?.items || []);
  const [selectedValue, setSelectedValue] = useState("");
  // CHỈ lấy từ items vì trường bên ngoài không lưu được
  const [isHorizontal, setIsHorizontal] = useState(item.props?.items?.[0]?.isHorizontal || false);
  const subtabCounts = useSelector((state) => state.formDesign.subtabCounts || {});

  const funcDataList = data?.funcDataListFull || [];

  const isInitialMount = useRef(true);

  useEffect(function() {
    if (item.props?.items && item.props.items.length > 0) {
      const itemsList = item.props.items;
      setItems(itemsList);
      
      const found = itemsList.find(i => String(i.id) === String(selectedValue) || i.value === selectedValue);
      
      if (!found) {
        const first = itemsList[0];
        setSelectedValue(first.value);
        
        // Chỉ tự động gọi onSearch ở lần mount đầu tiên nếu chưa có giá trị
        if (onSearch && mode !== 'builder' && isInitialMount.current) {
           onSearch({ 
             type: first.type, 
             processFn: first.func 
           });
           isInitialMount.current = false;
        }
      } else {
        isInitialMount.current = false;
      }
      
      // Luôn đồng bộ isHorizontal từ item đầu tiên
      if (itemsList[0]?.isHorizontal !== undefined) {
         setIsHorizontal(itemsList[0].isHorizontal);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.props?.items, onSearch, mode, selectedValue]);


  const handleMenuOpen = useCallback(function(event) {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(function() {
    setAnchorEl(null);
  }, []);

  const handleConfigOpen = useCallback(function(event) {
    setConfigAnchorEl(event.currentTarget);
  }, []);

  const handleConfigClose = useCallback(function() {
    setConfigAnchorEl(null);
  }, []);

  const handleRadioChange = useCallback(function(val) {
    // Chỉ xử lý nếu giá trị thực sự thay đổi
    if (val !== selectedValue) {
      setSelectedValue(val);
      
      const selectedItem = items.find(i => i.value === val);
      if (selectedItem && onSearch) {
        onSearch({ 
          type: selectedItem.type,
          processFn: selectedItem.func 
        });
      }
    }
    handleMenuClose();
  }, [items, onSearch, handleMenuClose, selectedValue]);

  const addItem = useCallback(function() {
    setItems(function(prev) {
        const newItem = { 
            id: Date.now(), 
            label: `Lựa chọn ${prev.length + 1}`, 
            value: `val_${prev.length + 1}`,
            func: "",
            type: "",
            isHorizontal: isHorizontal // Gán luôn giá trị hiện tại
        };
        const updated = [...prev, newItem];
        if (updated.length === 1) {
            setSelectedValue(newItem.value);
        }
        return updated;
    });
  }, [isHorizontal]);

  const updateItem = useCallback(function(id, field, value) {
    setItems(function(prev) {
        return prev.map(function(i) {
            return i.id === id ? { ...i, [field]: value } : i;
        });
    });
  }, []);

  const removeItem = useCallback(function(id) {
    setItems(function(prev) {
        const updated = prev.filter(function(i) {
            return i.id !== id;
        });
        if (updated.length > 0 && !updated.some(i => i.value === selectedValue)) {
            setSelectedValue(updated[0].value);
        }
        return updated;
    });
  }, [selectedValue]);

  const handleSave = useCallback(function() {
    // Map isHorizontal vào từng item để đảm bảo nó được gửi lên payload thông qua trường 'items'
    const itemsToSave = items.map(function(i) {
        return { ...i, isHorizontal: isHorizontal };
    });

    onPropChange(item.id, 'items', itemsToSave);
    handleConfigClose();
  }, [item.id, items, isHorizontal, onPropChange, handleConfigClose]);


  const renderHorizontalMode = function() {
    return (
        <HorizontalBarContainer>
            {items.map(function(i) {
                const handleClick = function() {
                    handleRadioChange(i.value);
                };
                const count = i.func ? subtabCounts[i.func] : 0;
                
                return (
                    <HorizontalItem key={i.id} onClick={handleClick}>
                        <HorizontalLabel isActive={selectedValue === i.value}>
                            {i.label}
                        </HorizontalLabel>
                        {count > 0 && <CountText>({count})</CountText>}
                        <CustomRadioButton isActive={selectedValue === i.value} />
                    </HorizontalItem>
                );
            })}
        </HorizontalBarContainer>
    );
  };

  const renderVerticalMode = function() {
     return (
        <>
            <Tooltip title="Menu">
                <IconButton size="small" onClick={handleMenuOpen}>
                    <StyledMoreIcon />
                </IconButton>
            </Tooltip>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                style: { minWidth: 200 }
                }}
            >
                {items.length > 0 ? (
                items.map(function(i) {
                    const handleItemClick = function(e) {
                      e.stopPropagation(); // Chặn double click từ MenuItem + Radio/Label
                      handleRadioChange(i.value);
                    };
                    return (
                        <MenuItem key={i.id} onClick={handleItemClick}>
                        <RadioLabel
                            value={i.value}
                            control={
                                <Radio 
                                    size="small" 
                                    checked={selectedValue === i.value} 
                                    readOnly
                                />
                            }
                            label={
                                <LabelBox>
                                    {i.label}
                                    {i.func && subtabCounts[i.func] > 0 && (
                                        <CountText>({subtabCounts[i.func]})</CountText>
                                    )}
                                </LabelBox>
                            }
                        />
                        </MenuItem>
                    );
                })
                ) : (
                <MenuItem disabled>Chưa có lựa chọn nào</MenuItem>
                )}
            </Menu>
        </>
     );
  };

  const handleDisplayModeToggle = function(e) {
    setIsHorizontal(e.target.checked);
  };

  return (
    <Container>
      {isHorizontal ? renderHorizontalMode() : renderVerticalMode()}

      {mode === 'builder' && (
        <GearButton size="small" onClick={handleConfigOpen}>
          <StyledSettingsIcon />
        </GearButton>
      )}

      <Popover
        open={Boolean(configAnchorEl)}
        anchorEl={configAnchorEl}
        onClose={handleConfigClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        <ConfigBox>
          <SkyTypography variant="subtitle2">Cấu hình danh sách lựa chọn</SkyTypography>
          
          <FormControlLabel
            control={
                <Switch 
                    checked={isHorizontal} 
                    onChange={handleDisplayModeToggle}
                    size="small"
                />
            }
            label="Hiển thị dạng thanh ngang"
          />

          <ItemsConfigList>
            {items.map(function(i) {
              return (
                <ConfigItem 
                  key={i.id} 
                  item={i} 
                  onRemove={removeItem} 
                  onUpdate={updateItem} 
                  funcDataList={funcDataList} 
                />
              );
            })}
          </ItemsConfigList>

          <Button startIcon={<Add />} onClick={addItem} size="small" fullWidth>
            Thêm lựa chọn
          </Button>
          <SaveButton startIcon={<Save />} variant="contained" onClick={handleSave} size="small" fullWidth>
            Lưu cấu hình
          </SaveButton>
        </ConfigBox>
      </Popover>
    </Container>
  );



}

MoreAction.propTypes = {
    item: PropTypes.object.isRequired,
    onPropChange: PropTypes.func.isRequired,
    mode: PropTypes.string,
    data: PropTypes.object,
    onSearch: PropTypes.func,
};
