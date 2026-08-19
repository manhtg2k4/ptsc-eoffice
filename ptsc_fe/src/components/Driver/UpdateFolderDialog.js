import React, { useState, useEffect, useCallback, useRef } from "react";
import { Grid, Box, Typography, IconButton, Popover, Chip, FormHelperText } from "@mui/material";
import { styled } from "@mui/material/styles";
import { HelpOutline as HelpOutlineIcon, Clear as ClearIcon } from "@mui/icons-material";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import CustomInput from "@components/CustomInput/CustomInput";
import SelectUnitsDialog from "./SelectUnitsDialog";
import SelectIndividualsDialog from "./SelectIndividualsDialog";
import { useToast } from "@components/common/ToastProvider";
import axiosInstance from "@utils/axiosInstance";
import { API_GET_LIST_UNIT, API_MANAGEMENT_FODER } from "@EnvironmentFile/constants/urlConfig";
import PropTypes from "prop-types";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { FlexGrowBox} from "@styles/BaseSwiper/BaseSwiper.style";
import { 
  IconRequied,  
} from "@styles/UploadFile/UploadFile.style";
// --- Styled Components ---
import CustomAsyncAutoComplete from "@components/CustomAsyncAutoComplete";
const ChipContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  gap: theme.spacing(0.5),
  flex: 1,
}));
const FormLabel = styled(Typography)(({ theme }) => ({
	fontSize: "14px",
	fontWeight: 600,
	 color: theme.palette.text.primary,
	marginBottom: theme.spacing(0.5),
	display: "flex",
	alignItems: "center",
  textTransform: "uppercase",
}));

const StyledList = styled('ul')({
  margin: 0,
  paddingLeft: '20px',
  listStyleType: 'disc',
});

const ChipInputContainer = styled("div", {
  shouldForwardProp: (prop) => prop !== "error",
})(({ theme, error }) => ({
  position: "relative",
  padding: "8px 14px",
  borderRadius: "4px",
  border: `1px solid ${error ? theme.palette.error.main : theme.palette.divider}`,
  minHeight: "40px",
  display: "flex",
  alignItems: "center",
  width: "100%",
  boxSizing: "border-box",
  cursor: "pointer",
  backgroundColor: theme.palette.background.paper,
  "&:hover": {
    borderColor: error ? theme.palette.error.main : theme.palette.text.primary,
  },
}));

// const PermissionLabel = styled(Typography)(({ theme }) => ({
//   position: "absolute",
//   top: "-0.7em",
//   left: "10px",
//   backgroundColor: theme.palette.background.paper,
//   padding: "0 4px",
//   fontSize: "0.75rem",
//   color: theme.palette.text.secondary,
//   zIndex: 1,
// }));

const PlaceholderTypography = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: "14px",
}));

const CustomChip = styled(Chip)(({ theme }) => ({
  height: "24px",
  backgroundColor: theme.palette.action.hover,
  color: theme.palette.text.primary,
  border: `1px solid ${theme.palette.divider}`,
  fontSize: "12px",
}));

const ClearAllButton = styled(IconButton)(({ theme }) => ({
  padding: theme.spacing(0.5),
  color: theme.palette.text.secondary,
  "&:hover": {
    color: theme.palette.text.primary,
  },
}));

const HelpIconButton = styled(IconButton)(({ theme }) => ({
  padding: theme.spacing(0.2),
  marginLeft: theme.spacing(0.5),
}));

const PopoverContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  maxWidth: 300,
}));

const PopoverTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  marginBottom: theme.spacing(1),
}));

const RequiredAsterisk = styled('span')(({ theme }) => ({
  color: theme.palette.error.main,
}));

const StyledBoxContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(3),
  position: 'relative',
}));

const StyledFormHelperText = styled(FormHelperText)(({ theme }) => ({
  marginLeft: theme.spacing(1.5),
}));

const StyledGridContainer = styled(Grid)(({ theme }) => ({
  marginTop: theme.spacing(1),
}));

const StyledHelpIcon = styled(HelpOutlineIcon)({
  fontSize: '1rem',
});

const renameSchema = yup.object().shape({
  name: yup.string().required("Vui lòng nhập tên").max(260, "Tên không được vượt quá 260 ký tự"),
});

const updatePermissionsSchema = yup.object().shape({
  viewPermissions: yup.array().min(1, "Vui lòng chọn phòng ban xem"),
  editPermissions: yup.array().min(1, "Vui lòng chọn người có quyền chỉnh sửa"),
  editOrganizationUnit: yup.object().nullable().required("Vui lòng chọn phòng ban"),
});

// --- Helper Components ---

const PermissionChip = ({ unit, onRemove }) => {
  const handleRemoveClick = useCallback((e) => {
    onRemove(e, unit.id || unit._id);
  }, [onRemove, unit]);

  return (
    <CustomChip
      label={unit.name || unit.title}
      onDelete={handleRemoveClick}
      size="small"
    />
  );
};

PermissionChip.propTypes = {
  unit: PropTypes.object.isRequired,
  onRemove: PropTypes.func.isRequired,
};

const StyledClearIcon = styled(ClearIcon)({
  fontSize: '1.15rem',
});

StyledClearIcon.defaultProps = {
  fontSize: 'small',
};

// --- Main Components ---

export const RenameFolderDialog = ({ open, onClose, item, onRename }) => {
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const isFile = item?.type === 'file';

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(renameSchema),
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (open && item) {
      reset({
        name: item.name || "",
      });
    } else if (!open) {
      reset({
        name: "",
      });
    }
  }, [open, item, reset]);

  const onSave = async (data) => {
    setLoading(true);
    try {
      await axiosInstance.patch(`${API_MANAGEMENT_FODER}/${item.id}`, { name: data.name.trim() });
      toast(isFile ? "Cập nhật thông tin tập tin thành công" : "Cập nhật thông tin thư mục thành công", "success");
      onRename(item.id, data.name.trim());
      onClose();
    } catch (error) {
      toast(error.response?.data?.message || (isFile ? "Lỗi khi cập nhật thông tin tập tin" : "Lỗi khi cập nhật thông tin thư mục"), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      title={isFile ? "Đổi tên tập tin" : "Đổi tên thư mục"}
      onSave={handleSubmit(onSave)}
      isLoading={loading}
      titleButton="XÁC NHẬN"
      cancelButtonText="HỦY"
      size="sm"
    >
      <StyledBoxContainer>
        <FormLabel>
          {isFile ? "Tên tập tin" : "Tên thư mục"} <IconRequied component="span">*</IconRequied>
        </FormLabel>
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <CustomInput
              {...field}
              required
              fullWidth
              placeholder={isFile ? "Nhập tên tập tin..." : "Nhập tên thư mục..."}
              error={!!errors.name}
              helperText={errors.name?.message}
            />
          )}
        />
      </StyledBoxContainer>
    </CustomDialog>
  );
};

export const UpdatePermissionsDialog = ({ open, onClose, item, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [isSelectViewOpen, setIsSelectViewOpen] = useState(false);
  const [isSelectEditOpen, setIsSelectEditOpen] = useState(false);
  const [helpAnchorEl, setHelpAnchorEl] = useState(null);

  const { control, setValue, watch, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(updatePermissionsSchema),
    defaultValues: {
      viewPermissions: [],
      editPermissions: [],
      editOrganizationUnit: null,
    },
  });

  const viewPermissions = watch("viewPermissions") || [];
  const editPermissions = watch("editPermissions") || [];
  const editOrganizationUnitValue = watch("editOrganizationUnit");
  const toast = useToast();

  const prevUnitIdRef = useRef(null);

  useEffect(() => {
    if (open && item) {
      const initialView = [
        ...(item.viewPermissions || []).map(u => {
          if (typeof u === 'string') return { id: u, name: u, types: "company" };
          return { ...u, types: u.types || "company" };
        }),
        ...(item.viewUserPermissions || []).map(u => {
          if (typeof u === 'string') return { id: u, name: u, types: "user" };
          return { ...u, types: "user" };
        })
      ];
      const unit = item.editOrganizationUnit || null;
      
      reset({
        viewPermissions: initialView,
        editPermissions: item.editPermissions || [],
        editOrganizationUnit: unit,
      });
      prevUnitIdRef.current = unit?.id || unit?._id || null;
    } else if (!open) {
      prevUnitIdRef.current = null;
      reset({
        viewPermissions: [],
        editPermissions: [],
        editOrganizationUnit: null,
      });
    }
  }, [open, item, reset]);

  useEffect(() => {
    if (open && editOrganizationUnitValue) {
      const currentId = editOrganizationUnitValue?.id || editOrganizationUnitValue?._id;
      if (prevUnitIdRef.current && currentId !== prevUnitIdRef.current) {
        setValue("editPermissions", [], { shouldValidate: true });
      }
      prevUnitIdRef.current = currentId;
    }
  }, [editOrganizationUnitValue, open, setValue]);

  const handleSave = handleSubmit(async (data) => {
    setLoading(true);
    try {
      const viewUnits = (data.viewPermissions || []).filter(u => u.types !== "user").map(u => u.id || u._id);
      const viewUsers = (data.viewPermissions || []).filter(u => u.types === "user").map(u => u.id || u._id);

      const payload = {
        viewPermissions: viewUnits,
        viewUserPermissions: viewUsers,
        editPermissions: (data.editPermissions || []).map(u => u.id || u._id),
        editOrganizationUnit: data.editOrganizationUnit?.id || data.editOrganizationUnit?._id || data.editOrganizationUnit,
      };
      await axiosInstance.patch(`${API_MANAGEMENT_FODER}/${item.id}`, payload);
      toast("Cập nhật thông tin thư mục thành công", "success");
      onSuccess(item.id, { viewPermissions: data.viewPermissions, editPermissions: data.editPermissions });
      onClose();
    } catch (error) {
      toast(error.response?.data?.message || "Lỗi khi cập nhật phân quyền", "error");
    } finally {
      setLoading(false);
    }
  });

  const handleRemoveViewUnit = useCallback((e, id) => {
    e.stopPropagation();
    const current = watch("viewPermissions") || [];
    setValue("viewPermissions", current.filter(u => (u.id || u._id) !== id), { shouldValidate: true });
  }, [setValue, watch]);

  const handleRemoveEditUnit = useCallback((e, id) => {
    e.stopPropagation();
    const current = watch("editPermissions") || [];
    setValue("editPermissions", current.filter(u => (u.id || u._id) !== id), { shouldValidate: true });
  }, [setValue, watch]);

  const handleClearViewPermissions = useCallback((e) => {
    e.stopPropagation();
    setValue("viewPermissions", [], { shouldValidate: true });
  }, [setValue]);

  const handleClearEditPermissions = useCallback((e) => {
    e.stopPropagation();
    setValue("editPermissions", [], { shouldValidate: true });
  }, [setValue]);

  const handleSelectViewOpen = useCallback(() => {
    setIsSelectViewOpen(true);
  }, []);

  const handleSelectViewClose = useCallback(() => {
    setIsSelectViewOpen(false);
  }, []);

  const handleSelectViewSave = useCallback((units) => {
    setValue("viewPermissions", units, { shouldValidate: true });
  }, [setValue]);

  const handleSelectEditOpen = useCallback(() => {
    setIsSelectEditOpen(true);
  }, []);

  const handleSelectEditClose = useCallback(() => {
    setIsSelectEditOpen(false);
  }, []);

  const handleSelectEditSave = useCallback((units) => {
    setValue("editPermissions", units, { shouldValidate: true });
  }, [setValue]);

  const handleHelpIconClick = useCallback((e) => {
    e.stopPropagation();
    setHelpAnchorEl(e.currentTarget);
  }, []);

  const handleHelpPopoverClose = useCallback(() => {
    setHelpAnchorEl(null);
  }, []);

  return (
    <>
      <CustomDialog
        open={open}
        onClose={onClose}
        title="Cập nhật phân quyền"
        onSave={handleSave}
        isLoading={loading}
        titleButton="XÁC NHẬN"
        cancelButtonText="HỦY"
        size="sm"
      >
        <StyledGridContainer container spacing={3}>
           <Grid item xs={12}>
                              <FormLabel>
                                Tên phòng ban <IconRequied component="span">*</IconRequied>
                              </FormLabel>
                                <Controller
                                  name="editOrganizationUnit"
                                  control={control}
                                  render={({ field }) => (
                                    <FlexGrowBox>
                                      <CustomAsyncAutoComplete
                                        fullWidth
                                        placeholder="Tìm kiếm đơn vị..."
                                        url={API_GET_LIST_UNIT}
                                        method="GET"
                                        queryParam="name"
                                        optionLabel="name"
                                        optionValue="id"
                                        {...field}
                                        returnObject
                                        error={!!errors.editOrganizationUnit}
                                        helperText={errors.editOrganizationUnit?.message}
                                        size="small"
                                        required
                                        limitTags={3}
                                      />
                                    </FlexGrowBox>
                                  )}
                                  
                                />
                            </Grid>
          <Grid item xs={12}>
            <FormLabel>
              Phân quyền xem <RequiredAsterisk>*</RequiredAsterisk>
            </FormLabel>
            <ChipInputContainer error={!!errors.viewPermissions} onClick={handleSelectViewOpen}>
              {viewPermissions.length > 0 ? (
                <>
                  <ChipContainer>
                    {viewPermissions.map((unit) => (
                      <PermissionChip
                        key={unit.id || unit._id}
                        unit={unit}
                        onRemove={handleRemoveViewUnit}
                      />
                    ))}
                  </ChipContainer>
                  <ClearAllButton onClick={handleClearViewPermissions}>
                    <StyledClearIcon />
                  </ClearAllButton>
                </>
              ) : (
                <PlaceholderTypography>Chọn phòng ban có quyền xem</PlaceholderTypography>
              )}
            </ChipInputContainer>
            {errors.viewPermissions && (
              <StyledFormHelperText error>
                {errors.viewPermissions.message}
              </StyledFormHelperText>
            )}
          </Grid>

          <Grid item xs={12}>
            <FormLabel>
              Phân quyền chỉnh sửa <RequiredAsterisk>*</RequiredAsterisk>
              <HelpIconButton onClick={handleHelpIconClick}>
                <StyledHelpIcon />
              </HelpIconButton>
            </FormLabel>
            <ChipInputContainer error={!!errors.editPermissions} onClick={handleSelectEditOpen}>
              {editPermissions.length > 0 ? (
                <>
                  <ChipContainer>
                    {editPermissions.map((unit) => (
                      <PermissionChip
                        key={unit.id || unit._id}
                        unit={unit}
                        onRemove={handleRemoveEditUnit}
                      />
                    ))}
                  </ChipContainer>
                  <ClearAllButton onClick={handleClearEditPermissions}>
                    <StyledClearIcon />
                  </ClearAllButton>
                </>
              ) : (
                <PlaceholderTypography>Chọn người có quyền chỉnh sửa</PlaceholderTypography>
              )}
            </ChipInputContainer>
            {errors.editPermissions && (
              <StyledFormHelperText error>
                {errors.editPermissions.message}
              </StyledFormHelperText>
            )}
          </Grid>
        </StyledGridContainer>
      </CustomDialog>

      {/* Select Dialogs */}
      <SelectUnitsDialog
        open={isSelectViewOpen}
        onClose={handleSelectViewClose}
        onSave={handleSelectViewSave}
        initialSelected={viewPermissions}
        title="CHỌN PHÒNG BAN CÓ QUYỀN XEM"
      />
      <SelectIndividualsDialog
        open={isSelectEditOpen}
        onClose={handleSelectEditClose}
        onSave={handleSelectEditSave}
        initialSelected={editPermissions}
        title="CHỌN NGƯỜI CÓ QUYỀN CHỈNH SỬA"
        filterUnitId={editOrganizationUnitValue?.id || editOrganizationUnitValue?._id}
      />

      <Popover
        open={Boolean(helpAnchorEl)}
        anchorEl={helpAnchorEl}
        onClose={handleHelpPopoverClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <PopoverContainer>
          <PopoverTitle variant="subtitle2">Quyền chỉnh sửa là gì?</PopoverTitle>
            <StyledList>
                       <li><Typography variant="body2">Tải tệp lên</Typography></li>
                       <li><Typography variant="body2">Đổi tên thư mục</Typography></li>
                       <li><Typography variant="body2">Xoá tệp trong thư mục</Typography></li>
                       <li><Typography variant="body2">Tạo thư mục con</Typography></li>
                       <li><Typography variant="body2">Sắp xếp thư mục/ tệp</Typography></li>
                     </StyledList>
        </PopoverContainer>
      </Popover>
    </>
  );
};
