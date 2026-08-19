/* eslint-disable camelcase */
import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Button,
  FormControl,
  Radio,
  RadioGroup,
  TextField,
  Typography,
  CircularProgress,
  Paper,
  InputAdornment,
  IconButton,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Save as SaveIcon,
  Storage as StorageIcon,
  Cloud as CloudIcon,
  Visibility,
  VisibilityOff,
  Edit as EditIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { getStorageConfig, updateStorageConfig } from '@redux/slices/StorageService/StorageServiceSlice';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  width: '50%',
  maxWidth: 'none',
  maxHeight: 'calc(100vh - 100px)',
  margin: '40px auto',  
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : theme.palette.common.white,
  display: 'flex',
  flexDirection: 'column',
  borderRadius: 2,
  overflowY: 'auto',
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
  '&::-webkit-scrollbar': {
    display: 'none', 
  },
}));

const StorageOptionBox = styled(Box)(({ theme, selected }) => ({
  border: `2px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
  borderRadius: theme.spacing(1),
  padding: theme.spacing(2.5),
  marginBottom: theme.spacing(2),
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  backgroundColor: theme.palette.mode === 'dark'
    ? (selected ? theme.palette.action.selected : theme.palette.background.paper)
    : theme.palette.common.white,
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.mode === 'dark'
      ? (selected ? theme.palette.action.selected : theme.palette.action.hover)
      : theme.palette.common.white,
  },
}));

const OptionHeader = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
}));

const ConfigFieldsContainer = styled(Box)(({ theme }) => ({
  marginLeft: theme.spacing(5),
  marginTop: theme.spacing(2.5),
}));

const ActionButtons = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: theme.spacing(2),
  marginTop: 'auto',
  paddingTop: theme.spacing(3),
}));

const PageTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  fontSize: '28px',
  color: theme.palette.text.primary,
  marginBottom: '8px',
}));

const PageSubtitle = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: '14px',
  marginBottom: '24px',
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  fontSize: '15px',
  color: theme.palette.text.primary,
  marginBottom: '16px',
}));

const LoadingContainer = styled(Box)(() => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '400px',
}));

const FieldsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2.5),
}));

const OptionLabel = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  fontSize: '16px',
  color: theme.palette.text.primary,
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.default : theme.palette.common.white,
  },
}));

const RequiredLabel = styled('span')(({ theme }) => ({
  color: theme.palette.error.main,
  marginLeft: '4px',
}));

const StylesRadioLabel = styled(Radio)(() => ({
  padding: '4px'
}));

const StylesButton = styled(Button)(() => ({
  textTransform: 'none',
  padding: '8px 24px',
  fontSize: '14px',
  fontWeight: 600,
}));

const StylesCancelButton = styled(Button)(({ theme }) => ({
  textTransform: 'none',
  padding: '8px 24px',
  fontSize: '14px',
  fontWeight: 600,
  backgroundColor: theme.palette.error.main,
  color: theme.palette.error.contrastText,
  '&:hover': {
    backgroundColor: theme.palette.error.dark,
  },
}));

const StylesCircularProgress = styled(CircularProgress)(() => ({
  color: "inherit"
}));

const StylesInputAdornment = styled(InputAdornment)(() => ({
  position: "end"
}));

const StyledStorageIcon = styled(StorageIcon)(({ theme, selected }) => ({
  color: selected ? theme.palette.primary.main : theme.palette.text.secondary,
  fontSize: '24px',
}));

const StyledCloudIcon = styled(CloudIcon)(({ theme, selected }) => ({
  color: selected ? theme.palette.primary.main : theme.palette.text.secondary,
  fontSize: '24px',
}));

const StylesBoxStorage = styled(Box)(() => ({
  color: 'error.main',
  mb: 2,
  p: 2,
  bgcolor: 'error.light', 
  borderRadius: 1
}));

const StorageOptionBoxInteractive = styled(StorageOptionBox)(({ isEditing }) => ({
  pointerEvents: isEditing ? 'auto' : 'none',
  opacity: isEditing ? 1 : 0.7,
}));

const StyledAlert = styled(Alert)(() => ({
  width: '100%',
}));


const StorageConfig = () => {
  const dispatch = useDispatch();
  const { config, loading, updating, error } = useSelector(state => state.storage);

  const [storageType, setStorageType] = useState('filesystem');
  const [showPassword, setShowPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    filesystem: {
      rootPath: ''
    },
    minio: {
      endpoint: '',
      accessKey: '',
      secretKey: '',
      bucket: '',
      region: ''
    }
  });

  // 🧩 Load cấu hình hiện tại khi component mount
  useEffect(() => {
    dispatch(getStorageConfig());
  }, [dispatch]);

  // 🧩 Cập nhật form data khi config được load từ API
  useEffect(() => {
    if (config && !isEditing) {
      const activeType = config.active_type || 'filesystem';
      setStorageType(activeType);
      
      setFormData({
        filesystem: {
          rootPath: config.fs_base_path || ''
        },
        minio: {
          endpoint: config.minio_endpoint || '',
          accessKey: config.minio_access_key || '',
          secretKey: config.minio_secret_key || '',
          bucket: config.minio_bucket || '',
          region: config.minio_region || ''
        }
      });
      
      logger.log('✅ Storage config loaded:', config);
    }
  }, [config, isEditing]);

  const handleInputChange = useCallback((type, field, value) => {
    setFormData(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  }, []);

  const handleStorageTypeChange = useCallback((event) => {
    setStorageType(event.target.value);
  }, []);

  const handleTogglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  const getDisplayValue = useCallback((value) => {
    if (isEditing) return value || '';
    return value ? '••••••••' : '';
  }, [isEditing]);

  const handleFieldChange = useCallback((type, field) => (event) => {
    handleInputChange(type, field, event.target.value);
  }, [handleInputChange]);

  const handleStorageTypeBoxClick = useCallback((type) => () => {
    setStorageType(type);
  }, []);

  const isFormValid = useCallback(() => {
    if (storageType === 'filesystem') {
      return formData.filesystem.rootPath.trim() !== '';
    } else {
      const m = formData.minio;
      return m.endpoint && m.accessKey && m.secretKey && m.bucket;
    }
  }, [storageType, formData]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar({ ...snackbar, open: false });
  }, [snackbar]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    // Reset form data từ config hiện tại
    if (config) {
      const activeType = config.active_type || 'filesystem';
      setStorageType(activeType);
      setFormData({
        filesystem: {
          rootPath: config.fs_base_path || ''
        },
        minio: {
          endpoint: config.minio_endpoint || '',
          accessKey: config.minio_access_key || '',
          secretKey: config.minio_secret_key || '',
          bucket: config.minio_bucket || '',
          region: config.minio_region || ''
        }
      });
    }
  }, [config]);

  const handleSave = useCallback(async () => {
    if (!isFormValid()) {
      setSnackbar({
        open: true,
        message: 'Vui lòng điền đầy đủ thông tin bắt buộc',
        severity: 'warning'
      });
      return;
    }

    const payload = {
      active_type: storageType,
      fs_base_path: formData.filesystem.rootPath,
      minio_endpoint: formData.minio.endpoint,
      minio_access_key: formData.minio.accessKey,
      minio_secret_key: formData.minio.secretKey,
      minio_bucket: formData.minio.bucket,
      minio_region: formData.minio.region
    };

    try {
      await dispatch(updateStorageConfig(payload)).unwrap();
      setSnackbar({
        open: true,
        message: 'Lưu cấu hình thành công!',
        severity: 'success'
      });
      setIsEditing(false);
    } catch (err) {
      logger.error('❌ Lỗi khi lưu cấu hình:', err);
      setSnackbar({
        open: true,
        message: 'Không thể lưu cấu hình. Vui lòng thử lại.',
        severity: 'error'
      });
    }
  }, [isFormValid, storageType, formData, dispatch]);

  if (loading) {
    return (
      <LoadingContainer>
        <CircularProgress />
      </LoadingContainer>
    );
  }

  return (
    <StyledPaper elevation={0}>
      <PageTitle variant="h4">
        Cấu Hình Lưu Trữ
      </PageTitle>
      <PageSubtitle variant="body2">
        Chọn và cấu hình dịch vụ lưu trữ cho hệ thống
      </PageSubtitle>

      {error && (
        <StylesBoxStorage>
          <Typography variant="body2">❌ Lỗi: {typeof error === 'string' ? error : 'Có lỗi xảy ra'}</Typography>
        </StylesBoxStorage>
      )}

      <FormControl component="fieldset" fullWidth disabled={!isEditing}>
        <SectionTitle variant="subtitle1">
          Chọn loại dịch vụ lưu trữ
        </SectionTitle>
        
        <RadioGroup value={storageType} onChange={handleStorageTypeChange}>
          {/* FileSystem Option */}
          <StorageOptionBoxInteractive 
            selected={storageType === 'filesystem'}
            onClick={handleStorageTypeBoxClick('filesystem')}
            isEditing={isEditing}
          >
            <OptionHeader>
              <StylesRadioLabel 
                value="filesystem"
                checked={storageType === 'filesystem'}
              />
              <StyledStorageIcon selected={storageType === 'filesystem'} />
              <OptionLabel>FileSystem</OptionLabel>
            </OptionHeader>

            {storageType === 'filesystem' && (
              <ConfigFieldsContainer>
                <StyledTextField
                  fullWidth
                  label={
                    <>
                      Root Path
                      <RequiredLabel>*</RequiredLabel>
                    </>
                  }
                  value={formData.filesystem.rootPath}
                  onChange={handleFieldChange('filesystem', 'rootPath')}
                  placeholder="/var/data/files"
                  size="small"
                  disabled={!isEditing}
                />
              </ConfigFieldsContainer>
            )}
          </StorageOptionBoxInteractive>

          {/* MinIO Option */}
          <StorageOptionBoxInteractive 
            selected={storageType === 'minio'}
            onClick={handleStorageTypeBoxClick('minio')}
            isEditing={isEditing}
          >
            <OptionHeader>
              <StylesRadioLabel 
                value="minio"
                checked={storageType === 'minio'}
              />
              <StyledCloudIcon selected={storageType === 'minio'} />
              <OptionLabel>MinIO</OptionLabel>
            </OptionHeader>

            {storageType === 'minio' && (
              <ConfigFieldsContainer>
                <FieldsContainer>
                  <StyledTextField
                    fullWidth
                    label={
                      <>
                        Endpoint
                        <RequiredLabel>*</RequiredLabel>
                      </>
                    }
                    value={getDisplayValue(formData.minio.endpoint)}
                    onChange={handleFieldChange('minio', 'endpoint')}
                    placeholder="minio.example.com:9000"
                    size="small"
                    disabled
                  />

                  <StyledTextField
                    fullWidth
                    label={
                      <>
                        Access Key
                        <RequiredLabel>*</RequiredLabel>
                      </>
                    }
                    value={getDisplayValue(formData.minio.accessKey)}
                    onChange={handleFieldChange('minio', 'accessKey')}
                    placeholder="Nhập access key"
                    size="small"
                    disabled
                  />

                  <StyledTextField
                    fullWidth
                    label={
                      <>
                        Secret Key
                        <RequiredLabel>*</RequiredLabel>
                      </>
                    }
                    type={showPassword ? 'text' : 'password'}
                    value={getDisplayValue(formData.minio.secretKey)}
                    onChange={handleFieldChange('minio', 'secretKey')}
                    placeholder="Nhập secret key"
                    size="small"
                    disabled
                    InputProps={{
                      endAdornment: (
                        <StylesInputAdornment>
                          <IconButton
                            onClick={handleTogglePasswordVisibility}
                            edge="end"
                            size="small"
                            disabled
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </StylesInputAdornment>
                      ),
                    }}
                  />

                  <StyledTextField
                    fullWidth
                    label={
                      <>
                        Bucket
                        <RequiredLabel>*</RequiredLabel>
                      </>
                    }
                    value={getDisplayValue(formData.minio.bucket)}
                    onChange={handleFieldChange('minio', 'bucket')}
                    placeholder="my-bucket"
                    size="small"
                    disabled
                  />

                  <StyledTextField
                    fullWidth
                    label="Region"
                    value={getDisplayValue(formData.minio.region)}
                    onChange={handleFieldChange('minio', 'region')}
                    placeholder="us-east-1"
                    size="small"
                    disabled
                  />
                </FieldsContainer>
              </ConfigFieldsContainer>
            )}
          </StorageOptionBoxInteractive>
        </RadioGroup>
      </FormControl>

      <ActionButtons>
        {!isEditing ? (
          <StylesButton
            variant="contained"
            startIcon={<EditIcon />}
            onClick={handleEdit}
          >
            Chỉnh sửa dịch vụ
          </StylesButton>
        ) : (
          <>
            <StylesButton
              variant="contained"
              startIcon={updating ? <StylesCircularProgress size={16} /> : <SaveIcon />}
              onClick={handleSave}
              disabled={!isFormValid() || updating}
            >
              {updating ? 'Đang lưu...' : 'Lưu cấu hình'}
            </StylesButton>
             <StylesCancelButton
              variant="contained"
              onClick={handleCancel}
              disabled={updating}
            >
              Hủy
            </StylesCancelButton>
          </>
        )}
      </ActionButtons>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <StyledAlert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </StyledAlert>
      </Snackbar>
    </StyledPaper>
  );
};

export default StorageConfig;