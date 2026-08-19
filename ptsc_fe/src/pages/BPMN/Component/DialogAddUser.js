import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  styled,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import PropTypes from "prop-types";
import { APP_BASE } from "@EnvironmentFile/constants/urlConfig";
import CustomAsyncAutoComplete from "@components/CustomAsyncAutoComplete";

const StyledDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiDialog-paper": {
    width: "100%",
    maxWidth: theme.breakpoints.values.xl, // ✅ Sửa lỗi: Tăng độ rộng dialog
  },
}));

const ContentGrid = styled(Grid)(({ theme }) => ({
  marginTop: theme.spacing(1),
}));

const FullWidthGridItem = styled(Grid)({
  width: "100%",
});

const SaveButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
}));

const CancelButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.error.main,
  color: theme.palette.error.contrastText,
  "&:hover": {
    backgroundColor: theme.palette.error.dark,
  },
}));

function DialogAddUser(props) {
  const { data, handleClose, open, onAddUsers } = props;
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      user: [],
    },
  });

  const [, setInitialUsers] = useState([]);
  // const [setInitialUsers] = useState([]);

  useEffect(() => {
    // Khi dialog được mở, kiểm tra xem có dữ liệu người dùng được truyền vào không
    if (open && data?.users) {
      const usersToPreload = data.users;

      // Cung cấp các lựa chọn ban đầu cho AsyncAutocomplete
      setInitialUsers(usersToPreload);
      // Cập nhật giá trị cho form
      reset({ user: usersToPreload });
    } else if (open) {
      // Nếu dialog mở nhưng không có dữ liệu, reset form về trạng thái rỗng
      setInitialUsers([]);
      reset({ user: [] });
    }
    // Phụ thuộc vào `open` và `data` để chạy lại khi chúng thay đổi
  }, [open, data, reset]);

  const onSubmit = (formData) => {
    const userArr = Array.isArray(formData.user)
      ? formData.user.map((u) => u)
      : formData.user
        ? [formData.user]
        : [];
    if (onAddUsers) onAddUsers(userArr);
    handleClose();
  };

  return (
    <StyledDialog open={open} onClose={handleClose}>
      <DialogTitle>Thêm người vào vai trò</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <ContentGrid container spacing={2}>
            <FullWidthGridItem item>
              <Controller
                name="user"
                control={control}
                rules={{ required: "Vui lòng chọn một người dùng" }}
                render={({ field }) => (
                  <CustomAsyncAutoComplete
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    label="Tìm kiếm người dùng"
                    url={`${APP_BASE}/api/users`}
                    isMulti
                    optionLabel="name"
                    queryParam="name"
                    optionValue="id"
                    error={Boolean(errors.user)}
                    helperText={errors.user?.message}
                    returnObject
                  />
                )}
              />
            </FullWidthGridItem>
          </ContentGrid>
        </DialogContent>
        <DialogActions>
          <SaveButton type="submit">Lưu</SaveButton>
          <CancelButton onClick={handleClose}>Hủy</CancelButton>
        </DialogActions>
      </form>
    </StyledDialog>
  );
}

DialogAddUser.propTypes = {
  data: PropTypes.shape({
    users: PropTypes.arrayOf(PropTypes.object),
  }),
  handleClose: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired,
  onAddUsers: PropTypes.func,
};

export default DialogAddUser;
