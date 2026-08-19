import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Grid,
  Typography,
  IconButton,
  styled,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import CustomInput from "@components/CustomInput/CustomInput";
import AsyncAutoComplete from "@components/CustomAsyncAutoComplete";
import { API_ROLE_FUNCTIONS } from "@EnvironmentFile/constants/urlConfig";
import { Controller, useFieldArray } from "react-hook-form";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { getListRoleFunctions } from "@redux/slices/AdministrationSystem/rolesSlice";

const FormContainer = styled(Box)(({ theme }) => ({
  paddingTop: theme.spacing(2),
}));

const HalfWidthGridItem = styled(Grid)({
  width: '100%',
  '@media (min-width: 600px)': {
    width: '50%',
  },
});

const FullWidthGridItem = styled(Grid)({
  width: '100%',
});

const RoleBox = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(2),
  position: 'relative',
}));

const DeleteRoleButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  right: theme.spacing(1),
}));

const RoleNameTypography = styled(Typography)(({ theme }) => ({
  fontWeight: theme.typography.fontWeightBold,
}));

const PermissionGridItem = styled(Grid)(({ theme }) => ({
  marginTop: theme.spacing(2),
  width: '100%',
}));


const AddTemplateDialog = ({
  open,
  onClose,
  onSave,
  control,
  errors,
  isLoading,
}) => {
  const dispatch = useDispatch();
  const { listRoleFunctions } = useSelector((state) => state.roles);
  const [menuList, setMenuList] = useState([]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "roles",
  });
  const actions = [
    { id: "add", label: "Thêm mới" },
    { id: "edit", label: "Chỉnh sửa" },
    { id: "view", label: "Xem" },
    { id: "delete", label: "Xoá" },
  ];

  useEffect(() => {
    if (open) {
      dispatch(getListRoleFunctions());
    }
  }, [open, dispatch]);

  useEffect(() => {
    if (listRoleFunctions) {
      setMenuList(listRoleFunctions);
    }
  }, [listRoleFunctions]);

  const handleSelectionChange = useCallback((selectedItem) => {
    // Xóa tất cả thẻ hiện tại
    const length = fields.length;
    for (let i = length - 1; i >= 0; i--) {
      remove(i);
    }
    
    // Nếu có chọn thẻ mới thì thêm vào
    if (selectedItem) {
      append({ functionName: selectedItem._id, name: selectedItem.name, permissions: [] });
    }
  }, [fields, append, remove]);
  // Lấy tên của menu từ ID
  const getMenuName = (id) => menuList.find((m) => m._id === id)?.name || "Không rõ";

  const handleRemoveRole = useCallback((index) => () => {
    remove(index);
  }, [remove]);
 return (
  <CustomDialog
    title="Thêm mới vai trò"
    open={open}
    onClose={onClose}
    onSave={onSave}
    type="add"
    size="md"
    isLoading={isLoading}
    inputLabelLayout="stacked"
  >
    <FormContainer component="form">
      <Grid container spacing={2}>
        {/* Mã vai trò */}
        <HalfWidthGridItem item>
          <Controller
            name="code"
            control={control}
            render={({ field }) => (
              <CustomInput
                label="Mã vai trò"
                {...field}
                error={!!errors.code}
                helperText={errors.code?.message}
                required
              />
            )}
          />
        </HalfWidthGridItem>

        {/* Tên vai trò */}
        <HalfWidthGridItem item>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <CustomInput
                label="Tên vai trò"
                {...field}
                error={!!errors.name}
                helperText={errors.name?.message}
                required
              />
            )}
          />
        </HalfWidthGridItem>

        {/* Mô tả vai trò */}
        <FullWidthGridItem item>
          <Controller
            name="describe"
            control={control}
            render={({ field }) => (
              <CustomInput
                label="Mô tả vai trò"
                {...field}
                multiline
                rows={3}
              />
            )}
          />
        </FullWidthGridItem>

        <FullWidthGridItem item>
          <AsyncAutoComplete
            // isMulti
            url={API_ROLE_FUNCTIONS}
            queryParam="name"
            returnObject
            optionLabel="name"
            optionValue="_id"
            label="Chọn phân hệ (chức năng)"
            placeholder="Chọn để thêm phân hệ..."
            value={
              fields.length > 0
                ? {
                    _id: fields[0].functionName,
                    name: fields[0].name || getMenuName(fields[0].functionName),
                  }
                : null
            }
            onChange={handleSelectionChange}
            error={!!errors.roles}
            helperText={errors.roles?.message}
            required
          />
        </FullWidthGridItem>

        {/* Render danh sách các phân hệ đã chọn và input quyền tương ứng */}
        {fields.map((item, index) => (
            <FullWidthGridItem item key={item.id}>
              <RoleBox>
                <DeleteRoleButton
                  aria-label="delete"
                  // onClick={() => remove(index)}
                  onClick={handleRemoveRole(index)}
                >
                  <CloseIcon />
                </DeleteRoleButton>
                <RoleNameTypography>
                  {item.name || getMenuName(item.functionName)}
                </RoleNameTypography>

                <PermissionGridItem item>
                  <Controller
                    name={`roles.${index}.permissions`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <CustomInput
                        autoHeight
                        select
                        multiple
                        options={actions}
                        // keepMenuOpen
                        customLabel="label"
                        customValue="id"
                        label="Chức năng được cấp quyền"
                        placeholder="Chọn chức năng..."
                        {...field}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                </PermissionGridItem>
              </RoleBox>
            </FullWidthGridItem>
          ))}
      </Grid>
    </FormContainer>
  </CustomDialog>
);

};

AddTemplateDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  control: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  isLoading: PropTypes.bool,
};

AddTemplateDialog.defaultProps = {
  isLoading: false,
};

export default AddTemplateDialog;
