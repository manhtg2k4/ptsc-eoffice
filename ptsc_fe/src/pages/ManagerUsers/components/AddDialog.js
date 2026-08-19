import React, { useCallback } from "react";
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
  styled,
} from "@mui/material";
import { Controller } from "react-hook-form";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import CustomInput from "@components/CustomInput/CustomInput";
import { permissions } from "@pages/ManagerUsers/constantsDistrict";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { StyledDiv, StyledExpand } from "@styles/ManagementUnit.styles";
import PropTypes from "prop-types";
import CustomTreeView from "@components/CustomInput/CustomTreeInput";

const FormContainer = styled(Box)(({ theme }) => ({
  paddingTop: theme.spacing(2),
}));

const HalfWidthGridItem = styled(Grid)({
  width: "100%",
  "@media (min-width: 600px)": {
    width: "50%",
  },
});

const FullWidthGridItem = styled(Grid)({
  width: "100%",
});

const StyledTableCell = styled(TableCell)({
  // Wrapper to satisfy ESLint
});

const RightAlignedTableCell = styled(TableCell)({
  textAlign: "right",
});

const PrimaryCheckbox = styled(Checkbox)(({ theme }) => ({
  "&.Mui-checked": {
    color: theme.palette.primary.main,
  },
  // Default color when not checked
  color: theme.palette.action.active,
}));

const StyledTableRow = styled(TableRow)({
  cursor: "pointer",
});

const AddDialog = ({
  open,
  onClose,
  onSave,
  control,
  handleSubmit,
  onSubmit,
  errors,
  isLoading, // Nhận prop isLoading
  handleClick,
  handleToggle,
  selectedPermissions,
  openPermistion,
  listTypeUnit,
  listPosition,
  listUnit,
}) => {
  const createToggleHandler = useCallback(
    (permission) => () => {
      handleToggle(permission);
    },
    [handleToggle]
  );
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <CustomDialog
        title="Thêm mới đơn vị"
        open={open}
        onClose={onClose}
        onSave={onSave}
        type="add"
        isLoading={isLoading}
      >
        <FormContainer component="form" onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={2}>
            <HalfWidthGridItem item>
              <Controller
                name="parent"
                control={control}
                render={({ field }) => (
                  <CustomTreeView
                    select
                    customLabel={"name"}
                    customValue={"_id"}
                    options={listUnit}
                    label="Đơn vị cha"
                    placeholder="Nhập dữ liệu..."
                    {...field}
                  />
                )}
              />
            </HalfWidthGridItem>
            <HalfWidthGridItem item>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <CustomInput
                    label="Tên đơn vị"
                    placeholder="Nhập dữ liệu..."
                    {...field}
                    inputProps={{ maxLength: 150 }}
                    error={!!errors.name}
                    helperText={errors.name?.message}
                    required
                  />
                )}
              />
            </HalfWidthGridItem>
            <HalfWidthGridItem item>
              <Controller
                name="code"
                control={control}
                render={({ field }) => (
                  <CustomInput
                    label="Mã đơn vị"
                    placeholder="Nhập dữ liệu..."
                    {...field}
                    error={!!errors.code}
                    helperText={errors.code?.message}
                    required
                  />
                )}
              />
            </HalfWidthGridItem>
            <HalfWidthGridItem item>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <CustomInput
                    select
                    options={listTypeUnit}
                    label="Loại đơn vị"
                    placeholder="Nhập dữ liệu..."
                    {...field}
                  />
                )}
              />
            </HalfWidthGridItem>
            <HalfWidthGridItem item>
              <Controller
                name="phoneNumber"
                control={control}
                render={({ field }) => (
                  <CustomInput
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
            </HalfWidthGridItem>
            <HalfWidthGridItem item>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <CustomInput
                    label="Email"
                    placeholder="Nhập dữ liệu..."
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    type="email"
                    {...field}
                  />
                )}
              />
            </HalfWidthGridItem>
            <HalfWidthGridItem item>
              <Controller
                name="leader"
                control={control}
                render={({ field }) => (
                  <CustomInput
                    label="Lãnh đạo"
                    placeholder="Nhập dữ liệu..."
                    {...field}
                  />
                )}
              />
            </HalfWidthGridItem>
            <HalfWidthGridItem item>
              <Controller
                name="position"
                control={control}
                render={({ field }) => (
                  <CustomInput
                    select
                    options={listPosition}
                    label="Chức vụ"
                    placeholder="Nhập dữ liệu..."
                    {...field}
                  />
                )}
              />
            </HalfWidthGridItem>
            <HalfWidthGridItem item>
              <Controller
                name="order"
                control={control}
                render={({ field }) => (
                  <CustomInput
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
            </HalfWidthGridItem>
            <HalfWidthGridItem item>
              <Controller
                name="address"
                control={control}
                render={({ field }) => (
                  <CustomInput
                    label="Địa chỉ"
                    placeholder="Nhập dữ liệu..."
                    {...field}
                  />
                )}
              />
            </HalfWidthGridItem>
            <FullWidthGridItem item>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <CustomInput
                    label="Mô tả"
                    placeholder="Nhập dữ liệu..."
                    multiline={5}
                    {...field}
                  />
                )}
              />
            </FullWidthGridItem>
            <StyledDiv>
              <StyledExpand onClick={handleClick}>
                Phân quyền báo cáo{" "}
                {openPermistion ? <ExpandLess /> : <ExpandMore />}
              </StyledExpand>

              {/* Danh sách phân quyền */}
              <Collapse in={openPermistion}>
                <TableContainer component={Paper}>
                  <Table>
                    <TableBody>
                      {/* {permissions.map((permission, index) => { */}
                      {permissions.map((permission) => {
                        const toggleHandler = createToggleHandler(permission);
                        return (
                          <StyledTableRow
                            key={permission}
                            hover
                            onClick={toggleHandler}
                          >
                            <StyledTableCell>{permission}</StyledTableCell>
                            <RightAlignedTableCell>
                              <PrimaryCheckbox
                                checked={selectedPermissions.includes(
                                  permission
                                )}
                                // onChange={() => handleToggle(permission)}
                                onChange={toggleHandler}
                              />
                            </RightAlignedTableCell>
                          </StyledTableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Collapse>
            </StyledDiv>
          </Grid>
        </FormContainer>
      </CustomDialog>
    </LocalizationProvider>
  );
};
AddDialog.propTypes = {
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

export default AddDialog;
