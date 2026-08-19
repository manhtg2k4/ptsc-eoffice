import React from 'react';
import {  styled } from '@mui/material';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import CustomInput from '@components/CustomInput/CustomInputBase';
import { SkyBox, SkyGrid } from '@styles/SkyStyles';

const UserProfile = () => {
  // Lấy thông tin người dùng từ AuthContext
  const { dataUser } = useSelector((state) => state.auth);
 
  const userData = dataUser
  const BoxST = styled(SkyBox)({
    padding: '16px',
  });

  return (
    <BoxST >
      <SkyBox component="form" noValidate autoComplete="off">
        <SkyGrid container spacing={2}>
          <SkyGrid item xs={12} sm={6}>
            <CustomInput
              fullWidth
              label="Tên người dùng"
              disabled
              value={userData?.name || ''}
              InputProps={{
                readOnly: true,
              }}
              variant="outlined"
            />
          </SkyGrid>
          <SkyGrid item xs={12} sm={6}>
            <CustomInput
              fullWidth
              label="Tên đăng nhập"
              disabled
              value={userData?.username || ''}
              InputProps={{
                readOnly: true,
              }}
              variant="outlined"
            />
          </SkyGrid>
          <SkyGrid item xs={12} sm={6}>
            <CustomInput
              fullWidth
              disabled
              label="Email"
              value={userData?.emailUser || ''}
              InputProps={{
                readOnly: true,
              }}
              variant="outlined"
            />
          </SkyGrid>
          <SkyGrid item xs={12} sm={6}>
            <CustomInput
              fullWidth
              disabled
              label="Số điện thoại"
              value={userData?.phone_number_user || ''}
              InputProps={{
                readOnly: true,
              }}
              variant="outlined"
            />
          </SkyGrid>
          <SkyGrid item xs={12} sm={6}>
            <CustomInput
              fullWidth
              disabled
              label="Ngày sinh"
              value={userData?.birthday ? dayjs(userData.birthday).format('DD/MM/YYYY') : ''}
              InputProps={{
                readOnly: true,
              }}
              variant="outlined"
            />
          </SkyGrid>
          <SkyGrid item xs={12} sm={6}>
            <CustomInput
              fullWidth
              disabled
              label="Giới tính"
              value={userData?.gender || ''}
              InputProps={{
                readOnly: true,
              }}
              variant="outlined"
            />
          </SkyGrid>
          <SkyGrid item xs={12}>
            <CustomInput
              fullWidth
              label="Địa chỉ"
              disabled
              value={userData?.address_user || ''}
              InputProps={{
                readOnly: true,
              }}
              variant="outlined"
            />
          </SkyGrid>
          <SkyGrid item xs={12} sm={6}>
            <CustomInput
              fullWidth
              label="Mã đơn vị"
              disabled
              value={userData?.organizationCode || ''}
              InputProps={{
                readOnly: true,
              }}
              variant="outlined"
            />
          </SkyGrid>
          <SkyGrid item xs={12} sm={6}>
            <CustomInput
              fullWidth
              label="Tên đơn vị"
              
              disabled
              value={userData?.organizationName || ''}
              InputProps={{
                readOnly: true,
              }}
              variant="outlined"
            />
          </SkyGrid>
        </SkyGrid>
      </SkyBox>
    </BoxST>
  );
};

export default UserProfile;