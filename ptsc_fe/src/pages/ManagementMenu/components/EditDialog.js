import React, { useCallback, useState, useEffect } from "react";
import { Box, Checkbox, FormControlLabel, Grid, styled, RadioGroup, Radio, FormControl, Autocomplete, TextField } from "@mui/material";
import { Controller } from "react-hook-form";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import CustomInput from "@components/CustomInput/CustomInput";
import PropTypes from "prop-types";
import SelectTree from "@components/CustomInput/SelectTree";
import AutocompletepPro from "@components/AutocompletepPro";
import { ICON_OPTIONS } from "@pages/ManagementMenu/iconOptions";
import withSharedComponents from "@components/WrapperComponent";
import { withFormWrapper, StyledFormLabel } from "@components/common/FormWrapper";
import { API_GET_GROUP_USERS } from "@EnvironmentFile/constants/urlConfig";

// Styled components cho Icon Option
const IconOptionWrapper = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
});

const IconPreview = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  borderRadius: 4,
  backgroundColor: theme.palette.action.hover,
  color: theme.palette.text.primary,
}));

const IconPreviewInput = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  borderRadius: 4,
  backgroundColor: theme.palette.action.hover,
  color: theme.palette.text.primary,
  marginRight: 8,
  marginLeft: 4,
}));

const FormContainer = styled(Box)(({ theme }) => ({
  paddingTop: theme.spacing(2),
}));

const StyledGridContainer = styled(Grid)({
  // Wrapper to satisfy ESLint, spacing is a layout prop
});

const FullWidthGridItem = styled(Grid)({
  width: "100%",
});

const EditDialog = ({
  open,
  onClose,
  onSave,
  control,
  handleSubmit,
  onSubmit,
  errors,
  isLoading,
  listFunction,
  listMenu,
  setValue, // Thêm prop setValue từ useForm
  sharedComponents,
}) => {
  const { AsyncAutoComplete } = sharedComponents;
  const menuId = control._defaultValues?._id;
  const defaultSettingIcon = control._defaultValues?.settingIcon;

  const AsyncAutoCompleteWrapper = React.useMemo(() => {
    const Wrapped = withFormWrapper(AsyncAutoComplete, "asyncSelect");
    const Component = (props) => <Wrapped {...props} />;
    Component.displayName = "AsyncAutoCompleteWrapper";
    return Component;
  }, [AsyncAutoComplete]);
  
  // Xác định kiểu nhập icon dựa trên giá trị hiện tại
  const isIconFromList = ICON_OPTIONS.some(opt => opt.value === defaultSettingIcon);
  const [iconInputType, setIconInputType] = useState(isIconFromList ? 'select' : 'text');

  // Cập nhật iconInputType khi dialog mở với dữ liệu mới
  useEffect(() => {
    if (open) {
      const isFromList = ICON_OPTIONS.some(opt => opt.value === defaultSettingIcon);
      setIconInputType(isFromList ? 'select' : 'text');
    }
  }, [open, defaultSettingIcon]);

  const handleIconInputTypeChange = useCallback((event) => {
    setIconInputType(event.target.value);
    // Reset giá trị settingIcon khi chuyển đổi kiểu nhập
    if (setValue) {
      setValue('settingIcon', '');
    }
  }, [setValue]);

  // ✅ Cho phép xóa menu cha bằng cách thêm option "Không có menu cha"
  const filteredMenus = [
    { _id: "", name: "Không có menu cha" },
    ...(listMenu?.filter((menu) => menu?._id !== menuId) || []),
  ];

  const handleCheckboxChange = useCallback(
    (onChange) => (event) => {
      onChange(event.target.checked);
    },
    []
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <CustomDialog
        title="Cập nhật menu"
        open={open}
        onClose={onClose}
        onSave={onSave}
        type="add"
        isLoading={isLoading}
      >
        <FormContainer component="form" onSubmit={handleSubmit(onSubmit)}>
          <StyledGridContainer container spacing={2}>
            <FullWidthGridItem item>
              <Controller
                name="parent"
                control={control}
                render={({ field }) => (
                  <>
                    <StyledFormLabel>Menu cha</StyledFormLabel>
                    <SelectTree
                      select
                      treeView
                      customLabel="name"
                      customValue="_id"
                      options={filteredMenus}
                      {...field}
                    />
                  </>
                )}
              />
            </FullWidthGridItem>
            <FullWidthGridItem item>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <>
                    <StyledFormLabel>Tên menu <span style={{ color: "red", marginLeft: "2px" }}>*</span></StyledFormLabel>
                    <CustomInput
                      {...field}
                      error={!!errors.name}
                      helperText={errors.name?.message}
                    />
                  </>
                )}
              />
            </FullWidthGridItem>
            <FullWidthGridItem item>
              <Controller
                name="codeRouter"
                control={control}
                render={({ field }) => (
                  <>
                    <StyledFormLabel>Mã code</StyledFormLabel>
                    <CustomInput
                      placeholder=""
                      {...field}
                      error={!!errors.codeRouter}
                      helperText={errors.codeRouter?.message}
                    />
                  </>
                )}
              />
            </FullWidthGridItem>
            <FullWidthGridItem item>
              <Controller
                name="function"
                control={control}
                render={({ field }) => (
                  <>
                    <StyledFormLabel>Chức năng</StyledFormLabel>
                    <AutocompletepPro
                      {...field}
                      valueKey="code"
                      options={listFunction}
                      value={field.value || null}
                      onChange={field.onChange}
                    />
                  </>
                )}
              />
            </FullWidthGridItem>
            <FullWidthGridItem item>
              <Controller
                name="order"
                control={control}
                render={({ field }) => (
                  <>
                    <StyledFormLabel>Thứ tự</StyledFormLabel>
                    <CustomInput
                      placeholder="Nhập dữ liệu..."
                      error={!!errors.order}
                      helperText={errors.order?.message}
                      {...field}
                    />
                  </>
                )}
              />
            </FullWidthGridItem>
            <FullWidthGridItem item>
              <Controller
                name="roleGroupIds"
                control={control}
                render={({ field }) => (
                  <AsyncAutoCompleteWrapper
                    {...field}
                    label="Nhóm vai trò ẩn"
                    url={API_GET_GROUP_USERS}
                    optionLabel="name"
                    optionValue="id"
										queryParam="name"
										value={field.value || null} 
										onChange={field.onChange}
                    isMulti
                    limitTags={3}
                  />
                )}
              />
            </FullWidthGridItem>

            {/* Radio chọn kiểu nhập Icon */}
            <FullWidthGridItem item>
              <FormControl component="fieldset">
                <RadioGroup
                  row
                  value={iconInputType}
                  onChange={handleIconInputTypeChange}
                >
                  <FormControlLabel value="text" control={<Radio />} label="Nhập text" />
                  <FormControlLabel value="select" control={<Radio />} label="Chọn từ danh sách" />
                </RadioGroup>
              </FormControl>
            </FullWidthGridItem>

            {/* Hiển thị CustomInput nếu chọn 'text' */}
            {iconInputType === 'text' && (
              <FullWidthGridItem item>
                <Controller
                  name="settingIcon"
                  control={control}
                  render={({ field }) => (
                    <>
                      <StyledFormLabel>Icon hiển thị</StyledFormLabel>
                      <CustomInput
                        placeholder="Nhập dữ liệu..."
                        error={!!errors.settingIcon}
                        helperText={errors.settingIcon?.message}
                        {...field}
                      />
                    </>
                  )}
                />
              </FullWidthGridItem>
            )}

            {/* Hiển thị Autocomplete với Icon nếu chọn 'select' */}
            {iconInputType === 'select' && (
              <FullWidthGridItem item>
                <Controller
                  name="settingIcon"
                  control={control}
                  render={({ field }) => {
                    const selectedIcon = ICON_OPTIONS.find(opt => opt.value === field.value);
                    const handleIconChange = (_, newValue) => {
                      field.onChange(newValue ? newValue.value : '');
                    };
                    return (
                      <>
                        <StyledFormLabel>Icon hiển thị</StyledFormLabel>
                        <Autocomplete
                          options={ICON_OPTIONS}
                          getOptionLabel={(option) => option.label || ''}
                          value={selectedIcon || null}
                          onChange={handleIconChange}
                          renderOption={(props, option) => (
                            <li {...props} key={option.value}>
                              <IconOptionWrapper>
                                <IconPreview>{option.icon}</IconPreview>
                                <span>{option.label}</span>
                              </IconOptionWrapper>
                            </li>
                          )}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              size="small"
                              InputProps={{
                                ...params.InputProps,
                                startAdornment: selectedIcon ? (
                                  <IconPreviewInput>
                                    {selectedIcon.icon}
                                  </IconPreviewInput>
                                ) : null,
                              }}
                            />
                          )}
                        />
                      </>
                    );
                  }}
                />
              </FullWidthGridItem>
            )}

            <FullWidthGridItem item>
              <Controller
                name="hidden"
                control={control}
                defaultValue={false}
                render={({ field: { value, onChange, ...rest } }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={value}
                        onChange={handleCheckboxChange(onChange)}
                        {...rest}
                      />
                    }
                    label="Trạng thái hiển thị"
                  />
                )}
              />
            </FullWidthGridItem>

            <FullWidthGridItem item>
              <Controller
                name="collapsed"
                control={control}
                defaultValue={false}
                render={({ field: { value, onChange, ...rest } }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={value}
                        onChange={handleCheckboxChange(onChange)}
                        {...rest}
                      />
                    }
                    label="Thu gọn menu"
                  />
                )}
              />
            </FullWidthGridItem>

            <FullWidthGridItem item>
              <Controller
                name="dynamicMenu"
                control={control}
                defaultValue={false}
                render={({ field: { value, onChange, ...rest } }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={value}
                        onChange={handleCheckboxChange(onChange)}
                        {...rest}
                      />
                    }
                    label="Menu động (Dynamic menu)"
                  />
                )}
              />
            </FullWidthGridItem>
          </StyledGridContainer>
        </FormContainer>
      </CustomDialog>
    </LocalizationProvider>
  );
};

EditDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  control: PropTypes.object.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  errors: PropTypes.object.isRequired,
  isLoading: PropTypes.bool,
  listFunction: PropTypes.array,
  listMenu: PropTypes.array,
  setValue: PropTypes.func,
  sharedComponents: PropTypes.object,
};

EditDialog.defaultProps = {
  isLoading: false,
  listFunction: [],
  listMenu: [],
  setValue: null,
  sharedComponents: {},
};

export default withSharedComponents(EditDialog);