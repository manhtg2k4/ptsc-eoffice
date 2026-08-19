import React, { useCallback, useMemo } from "react";
import {
  Box,
  Checkbox,
  Collapse,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
} from "@mui/material";
import { Controller } from "react-hook-form";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import CustomInput from "@components/CustomInput/CustomInput";
import { permissions } from "@pages/Users/constantsDistrict";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { StyledDiv, StyledExpand } from "@styles/ManagementUnit.styles";
import PropTypes from "prop-types";
import CustomInputTree from "@components/CustomInput/CustomInputTree";
import CustomAutoCompleteSearch from "@components/CustomAutoCompleteSearch";
import withFormWrapper from "@components/common/FormWrapper";

const EditDialog = ({
	open,
	onClose,
	onSave,
	control,
	handleSubmit,
	onSubmit,
	errors,
	isLoading,
	handleClick,
	handleToggle,
	selectedPermissions,
	openPermistion,
}) => {
	const WapperCustomAutoCompleteSearch = useMemo(() => {
		const Wrapped = withFormWrapper(CustomAutoCompleteSearch, "asyncSelect");
		const Component = (props) => <Wrapped {...props} />;
		Component.displayName = "WapperCustomAutoCompleteSearch";
		return Component;
	}, []);

  const createToggleHandler = useCallback(
    (permission) => () => {
      handleToggle(permission);
    },
    [handleToggle]
  );

  const stackedLabelProps = { labelLayout: "stacked" };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <CustomDialog
        title="Cập nhật đơn vị"
        open={open}
        onClose={onClose}
        onSave={onSave}
        type="edit"
        isLoading={isLoading}
      >
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="parent"
                control={control}
                render={({ field }) => {
                  return (
                    <CustomInputTree
											{...stackedLabelProps}
											select
											customLabel={"name"}
											customValue={"_id"}
											api="api/organization-units"
											apiExpand="api/organization-units/children"
											required
											treeView
											multiple={false}
											error={!!errors.parent}
											helperText={errors.parent?.message}
											label="Đơn vị cha"
											placeholder="Nhập dữ liệu..."
											{...field}
										/>
                  );
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <CustomInput
                    {...stackedLabelProps}
                    label="Tên đơn vị"
                    placeholder="Nhập dữ liệu..."
                    {...field}
                    error={!!errors.name}
                    helperText={errors.name?.message}
                    required
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="code"
                control={control}
                render={({ field }) => (
                  <CustomInput
                    {...stackedLabelProps}
                    label="Mã đơn vị"
                    placeholder="Nhập dữ liệu..."
                    {...field}
                    error={!!errors.code}
                    helperText={errors.code?.message}
                    required
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <WapperCustomAutoCompleteSearch
										select
										label="Loại đơn vị"
										code="unitType"
										placeholder="Nhập dữ liệu..."
										customLabel="title"
										customValue="value"
										{...field}
										onChange={field.onChange}
										unsetFontWeight
									/>
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="phoneNumber"
                control={control}
                render={({ field }) => (
                  <CustomInput
                    {...stackedLabelProps}
                    label="Số điện thoại"
                    placeholder="Nhập dữ liệu..."
                    type="tel"
                    inputProps={{ pattern: "[0-9]*", inputMode: "numeric" }}
                    error={!!errors.phoneNumber}
                    helperText={errors.phoneNumber?.message}
                    {...field}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <CustomInput
                    {...stackedLabelProps}
                    label="Email"
                    placeholder="Nhập dữ liệu..."
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    type="email"
                    {...field}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="leader"
                control={control}
                render={({ field }) => (
                  <CustomInput
                    {...stackedLabelProps}
                    label="Lãnh đạo"
                    placeholder="Nhập dữ liệu..."
                    {...field}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="position"
                control={control}
                render={({ field }) => (
                  <WapperCustomAutoCompleteSearch
										select
										label="Chức vụ"
										code="positionCate"
										placeholder="Nhập dữ liệu..."
										customLabel="title"
										customValue="value"
										{...field}
										onChange={field.onChange}
										unsetFontWeight
									/>
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="order"
                control={control}
                render={({ field }) => (
                  <CustomInput
                    {...stackedLabelProps}
                    label="Thứ tự"
                    placeholder="Nhập dữ liệu..."
                    type="number"
                    inputProps={{ min: 0 }}
                    error={!!errors.order}
                    helperText={errors.order?.message}
                    {...field}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="address"
                control={control}
                render={({ field }) => (
                  <CustomInput
                    {...stackedLabelProps}
                    label="Địa chỉ"
                    placeholder="Nhập dữ liệu..."
                    {...field}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={12}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <CustomInput
                    {...stackedLabelProps}
                    label="Mô tả"
                    placeholder="Nhập dữ liệu..."
                    multiline={5}
                    {...field}
                  />
                )}
              />
            </Grid>
            <StyledDiv>
              <StyledExpand onClick={handleClick}>
                Phân quyền báo cáo {openPermistion ? <ExpandLess /> : <ExpandMore />}
              </StyledExpand>

              <Collapse in={openPermistion}>
                <TableContainer component={Paper}>
                  <Table>
                    <TableBody>
                      {permissions.map((permission) => {
                        const toggleHandler = createToggleHandler(permission);
                        return (
                          <TableRow key={permission} hover onClick={toggleHandler}>
                            <TableCell>{permission}</TableCell>
                            <TableCell align="right">
                              <Checkbox
                                checked={selectedPermissions.includes(permission)}
                                onChange={toggleHandler}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Collapse>
            </StyledDiv>
          </Grid>
        </Box>
      </CustomDialog>
    </LocalizationProvider>
  );
};

EditDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  control: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  errors: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  handleClick: PropTypes.func.isRequired,
  handleToggle: PropTypes.func.isRequired,
  selectedPermissions: PropTypes.array.isRequired,
  openPermistion: PropTypes.bool.isRequired,
  listTypeUnit: PropTypes.array.isRequired,
  listPosition: PropTypes.array.isRequired,
  listUnit: PropTypes.array,
};

export default EditDialog;
