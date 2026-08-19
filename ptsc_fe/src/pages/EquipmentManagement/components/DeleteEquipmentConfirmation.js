import React, { useState } from "react";
import { Box, Typography } from "@mui/material";
import { styled } from '@mui/material/styles';
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import withSharedComponents from "@components/WrapperComponent";
import { deleteAmenities } from "@services/amenitiesService";
import { useToast } from "@components/common/ToastProvider";

const logger = console;

const ContentContainer = styled(Box)(({ theme }) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    // textAlign: "center",
    gap: theme.spacing(2),
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
}));

const ConfirmationText = styled(Typography)(({ theme }) => ({
    fontWeight: 'bold',
    marginBottom: theme.spacing(1),
}));

const WarningText = styled(Typography)(({ theme }) => ({
    color: theme.palette.text.secondary,
}));

const ListWarningText = styled(WarningText)(({ theme }) => ({
    marginTop: theme.spacing(2),
}));

const TitleWrapper = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: theme.spacing(1),
}));

const StyledIcon = styled(WarningAmberIcon)(() => ({
  fontSize: "2rem",
  color: "#ffeb3b", 
}));

const StyledList = styled('ul')(({ theme }) => ({
  listStyle: 'none',
  padding: 0,
  margin: 0,
  marginTop: theme.spacing(1),
  textAlign: 'left',
  width: '100%',
  '& li': {
    marginBottom: theme.spacing(0.5),
    display: 'flex',
    alignItems: 'center',
    '&::before': {
      content: '"-"',
      marginRight: theme.spacing(1),
      fontWeight: 'bold',
    }
  }
}));

import CustomDialog from "@components/CustomDialog/CustomDialog";

const DeleteEquipmentConfirmation = ({
  open,
  onClose,
  setReloadData,
  data, 
}) => {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // --- LOGIC CHECK STATUS / DATA ---
  // 1. Check if data is array (Multiple delete)
  const isList = Array.isArray(data) && data.length > 0;
  
  // 2. Check if locked/busy (Simulate with status/isBusy prop)
  // Logic fake: If any item has status === 'BUSY' or isBusy === true
  const isBusy = isList 
    ? data.some(item => item.status === 'BUSY' || item.isBusy)
    : (data?.status === 'BUSY' || data?.isBusy);

  // --- PREPARE DISPLAY CONTENT ---
  const renderContent = () => {
    if (isBusy) {
      return (
        <Box>
           <ConfirmationText variant="body1">
              {isList 
                ? "Danh sách thiết bị chưa thể xóa vì hiện đang được sử dụng. Vui lòng kiểm tra lại trước khi xóa."
                : "Thiết bị chưa thể xóa vì hiện đang được sử dụng. Vui lòng kiểm tra lại trước khi xóa."
              }
           </ConfirmationText>
           {isList && (
             <StyledList>
               {data.map((item) => (
                 <li key={item.id || item._id} style={{ color: item.isBusy || item.status === 'BUSY' ? 'red' : 'inherit' }}>
                    {item.name}
                 </li>
               ))}
             </StyledList>
           )}
        </Box>
      );
    }
    
    if (isList) {
      return (
        <Box>
           <ConfirmationText variant="body1">
              Bạn có chắc chắn muốn xóa ({data.length}) thiết bị:
           </ConfirmationText>
           <StyledList>
              {data.map((item) => (
                <li key={item.id || item._id}>{item.name}</li>
              ))}
           </StyledList>
           <ListWarningText variant="body2">
             Tác vụ này sẽ không thể hoàn tác
           </ListWarningText>
        </Box>
      );
    }

    // Default: Single Item
    const equipmentName = data?.name || "thiết bị này";
    return (
      <Box>
        <ConfirmationText variant="body1">
          Bạn có chắc chắn muốn xóa thiết bị có tên “{equipmentName}” này?
        </ConfirmationText>
        <ListWarningText variant="body2">
          Tác vụ này sẽ không thể hoàn tác
        </ListWarningText>
      </Box>
    );
  };

  const onConfirm = async () => {
    // If busy, do nothing (or button should be hidden)
    if (isBusy) return;

    const ids = isList ? data.map(i => i.id) : (data?.id ? [data.id] : []);
    
    if (ids.length === 0) {
        toast("Không tìm thấy ID thiết bị cần xóa", "error");
        return;
    }

    try {
        setIsLoading(true);
        await deleteAmenities(ids);
        
        toast("Xóa thiết bị thành công", "success");
        onClose();
        if (typeof setReloadData === 'function') {
            setReloadData((prev) => !prev);
        }
    } catch (error) {
        logger.error("Error deleting amenity:", error);
        const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra";
        toast(errorMessage, "error");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      title={
        <TitleWrapper>
          <StyledIcon />
          THÔNG BÁO
        </TitleWrapper>
      }
      titleAlign="center"
      onSave={onConfirm}
      // logic: if busy, we basically want to hide "ĐỒNG Ý". 
      // CustomDialog hides button if titleButton is empty?
      // No, it renders SaveButton with "Lưu" default if empty.
      // But we can use disableSave to disable it. 
      // And we want "ĐỒNG Ý" when active.
      titleButton="Xác nhận"
      disableSave={isBusy} 
      cancelButtonText="Hủy"
      size="sm"
      isLoading={isLoading}
      // CustomDialog renders SaveButton if !disableSave. 
      // So if isBusy=true, disableSave=true, SaveButton is HIDDEN. (Correct)
      // CancelButton is always shown.
    >
      <ContentContainer>
        {renderContent()}
      </ContentContainer>
    </CustomDialog>
  );
};

export default withSharedComponents(DeleteEquipmentConfirmation);
