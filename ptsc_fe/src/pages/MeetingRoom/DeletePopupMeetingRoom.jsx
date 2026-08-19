import React, { useState, useEffect } from "react";
import { styled } from '@mui/material/styles';
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import withSharedComponents from "@components/WrapperComponent";
import { deleteMeetingRoom, getMeetingRoomById } from "@services/meetingRoomService";
import { useToast } from "@components/common/ToastProvider";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { SkyBox, SkyTypography } from "@styles/SkyStyles";
import { CircularProgress } from "@mui/material";

const logger = console;

const ContentContainer = styled(SkyBox)(({ theme }) => ({
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
}));

const ConfirmationText = styled(SkyTypography)(() => ({
    fontWeight: 'bold',
    textAlign: "left"
}));

const WarningText = styled(SkyTypography)(({ theme }) => ({
    color: theme.palette.text.secondary,
}));

const ListWarningText = styled(WarningText)(({ theme }) => ({
    marginTop: theme.spacing(2),
}));

const TitleWrapper = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: theme.spacing(1),
}));

const StyledIcon = styled(WarningAmberIcon)(() => ({
  fontSize: "2rem",
  color: "#ffeb3b", 
}));

const DeletePopupMeetingRoom = ({
  open,
  onClose,
  setReloadData,
  data, 
}) => {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true); // Default checking
  const [latestData, setLatestData] = useState(null);
  
  const id = data?.id;

  // --- FETCH LATEST DATA ---
  useEffect(() => {
      if (open && id) {
          setIsChecking(true);
          const fetchData = async () => {
              try {
                  const res = await getMeetingRoomById(id);
                  const room = res?.data?.data || res?.data || res;
                  setLatestData(room);
              } catch (error) {
                  logger.error("Error fetching room detail:", error);
              } finally {
                  setIsChecking(false);
              }
          };
          fetchData();
      } else {
          setLatestData(null);
          setIsChecking(false);
      }
  }, [open, id]);

  const effectiveData = latestData || data;

  // --- LOGIC CHECK STATUS / DATA ---
  // User Rule: Only stage === 1 (Available) can be deleted. Else blocked.
  const isBlocked = effectiveData && Number(effectiveData.stage) !== 1;

  // --- PREPARE DISPLAY CONTENT ---
  const renderContent = () => {
    // 0. CHECKING STATE
    if (isChecking) {
       return (
           <CircularProgress />
       );
    }
    
    // CASE 2: BLOCKED ({stage != 1})
    if (isBlocked) {
      return (
        <ContentContainer>
           <ConfirmationText variant="body1">
              Phòng họp chưa thể xóa vì hiện đang có cuộc họp đăng ký sử dụng. Vui lòng hủy hoặc chuyển cuộc họp sang phòng khác trước khi xóa.
           </ConfirmationText>
        </ContentContainer>
      );
    }
    
    // Default: Single Item Allowed (Stage == 1)
    const roomName = effectiveData?.name || effectiveData?.roomName || data?.name || data?.roomName || "phòng họp này";
    return (
      <ContentContainer>
        <ConfirmationText variant="body1">
          Bạn có chắc chắn muốn xóa phòng họp “{roomName}” này?
        </ConfirmationText>
        <ListWarningText variant="body2">
          Tác vụ này sẽ không thể hoàn tác
        </ListWarningText>
      </ContentContainer>
    );
  };

  const onConfirm = async () => {
    // If checking or blocked, do nothing
    if (isChecking || isBlocked) return;

    if (!id) {
        toast("Không tìm thấy ID phòng họp cần xóa", "error");
        return;
    }

    try {
        setIsLoading(true);
        await deleteMeetingRoom(id);
        
        toast("Xóa phòng họp thành công", "success");
        onClose();
        if (typeof setReloadData === 'function') {
            setReloadData((prev) => !prev); // Trigger reload
        }
    } catch (error) {
        logger.error("Error deleting meeting room:", error);
        const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra khi xóa phòng họp";
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
      titleButton={
          isChecking ? null : (isBlocked ? null : "Xác nhận")
      }
      disableSave={isChecking || isBlocked} 
      
      cancelButtonText="Hủy"
      size="sm"
      isLoading={isLoading}
    >
      <ContentContainer>
        {renderContent()}
      </ContentContainer>
    </CustomDialog>
  );
};

export default withSharedComponents(DeletePopupMeetingRoom);
