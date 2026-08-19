import React, { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Typography,
  styled,
} from "@mui/material";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { Controller, useFieldArray } from "react-hook-form";
import CustomInput from "@components/CustomInput/CustomInput";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { getSideBarMenu } from "@redux/slices/ManagerMenu/managementMenuSlice";

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

const RoleNameTypography = styled(Typography)(({ theme }) => ({
  fontWeight: theme.typography.fontWeightBold,
}));

const PermissionGridItem = styled(Grid)(({ theme }) => ({
  marginTop: theme.spacing(2),
  width: '100%',
}));

const ViewTemplateDialog = ({
  open,
  onClose,
  control,
}) => {
  const dispatch = useDispatch();
  const sideBarMenu = useSelector((state) => state.menu.sideBarMenu || []);
  const sideBarMenuLoading = useSelector((state) => state.menu.sideBarMenuLoading);
  const sideBarMenuFetched = useSelector((state) => state.menu.sideBarMenuFetched);
  const [menuList, setMenuList] = useState([]);

  const { fields } = useFieldArray({
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
      if (!sideBarMenuFetched && !sideBarMenuLoading) {
        dispatch(getSideBarMenu());
      }
      const filteredList = (sideBarMenu || []).filter(
        (item) =>
          item.function?.type === "list" ||
          (item.function?.type === "automatic" && item.hidden === true)
      );
      setMenuList(filteredList);
    }
  }, [open, sideBarMenu, sideBarMenuFetched, sideBarMenuLoading, dispatch]);

  const getMenuName = (func) => {
    if (!func) return "Không rõ";
    // Xử lý trường hợp func là object ({_id, name}) hoặc chỉ là string (id)
    const lookupId = typeof func === 'object' && func !== null ? func._id : func;
    return menuList.find((m) => m._id === lookupId)?.name || "Không rõ";
  };

  return (
    <CustomDialog
      title="Xem chi tiết vai trò"
      open={open}
      onClose={onClose}
      type="view"
      size="md"
      disableSave
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
                  disabled
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
                  disabled
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
                  disabled
                />
              )}
            />
          </FullWidthGridItem>

          {/* Chọn phân hệ */}
          <FullWidthGridItem item>
            <CustomInput
              select
              multiple
              disabled
              options={menuList}
              loading={sideBarMenuLoading}
              customLabel="name"
              customValue="_id"
              label="Chọn phân hệ (chức năng)"
              value={fields.map((field) => {
                const func = field.functionName;
                // Đảm bảo giá trị truyền vào CustomInput luôn là một chuỗi ID
                return typeof func === 'object' && func !== null ? func._id : func;
              })}
              // onChange={() => {}} // No-op
            />
          </FullWidthGridItem>

          {/* Render danh sách các phân hệ đã chọn và quyền */}
          {fields.map((item, index) => (
            <FullWidthGridItem item key={item.id}>
              <RoleBox>
                <RoleNameTypography>
                  {getMenuName(item.functionName)}
                </RoleNameTypography>

                <PermissionGridItem item>
                  <Controller
                    name={`roles.${index}.permissions`}
                    control={control}
                    render={({ field }) => (
                      <CustomInput
                      autoHeight 
                        select
                        multiple
                        disabled
                        options={actions}
                        customLabel="label"
                        customValue="id"
                        label="Chức năng được cấp quyền"
                        {...field}
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

ViewTemplateDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  control: PropTypes.object.isRequired,
};

export default ViewTemplateDialog;
