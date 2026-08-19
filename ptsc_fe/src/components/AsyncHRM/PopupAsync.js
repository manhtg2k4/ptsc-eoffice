import React from 'react';
import { CustomDialog } from '@components/CustomDialog';
import {
  SyncPopupContent,
  SyncIconWrapper,
  SyncStatusTitle,
  SyncStatusSub,
  SyncProgressBarContainer,
  SyncProgressBarFill,
  SyncResultStats,
  SyncResultItem,
  SyncResultValue,
  SyncResultLabel,
} from '@styles/AsyncHRM/AsyncHrm.styles';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import CheckIcon from '@mui/icons-material/Check';

const PopupAsync = ({ open, onClose, loading, status, progress, result }) => {
logger.log('result',result)

  const renderContent = () => {
    if (status === 'syncing' || loading) {
      return (
        <SyncPopupContent>
          <SyncIconWrapper>
            <span className="rotating-icon" style={{ display: 'flex' }}>
              <AutorenewIcon />
            </span>
          </SyncIconWrapper>
          <SyncStatusTitle>Đang đồng bộ dữ liệu...</SyncStatusTitle>
          <SyncStatusSub>Vui lòng chờ trong giây lát</SyncStatusSub>
          <SyncProgressBarContainer>
            <SyncProgressBarFill progress={progress} />
          </SyncProgressBarContainer>
        </SyncPopupContent>
      );
    }

    return (
      <SyncPopupContent>
        <SyncIconWrapper success={1}>
          <CheckIcon />
        </SyncIconWrapper>
        <SyncStatusTitle>Đồng bộ thành công!</SyncStatusTitle>
        <SyncStatusSub>Dữ liệu đã được cập nhật từ hệ thống HRM</SyncStatusSub>
        <SyncProgressBarContainer>
          <SyncProgressBarFill progress={100}  />
        </SyncProgressBarContainer>
        <SyncResultStats>
          <SyncResultItem>
            <SyncResultValue>{result?.added||0}</SyncResultValue>
            <SyncResultLabel>Thêm mới</SyncResultLabel>
          </SyncResultItem>
          <SyncResultItem>
            <SyncResultValue>{result?.updated||0}</SyncResultValue>
            <SyncResultLabel>Cập nhật</SyncResultLabel>
          </SyncResultItem>
          <SyncResultItem>
            <SyncResultValue>{result?.unchanged||0}</SyncResultValue>
            <SyncResultLabel>Không đổi</SyncResultLabel>
          </SyncResultItem>
        </SyncResultStats>
      </SyncPopupContent>
    );
  };

  return (
    <CustomDialog
      isLoading={loading}
      open={open}
      onClose={onClose}
      title="Đồng bộ dữ liệu từ HRM"
      size="sm"
      disableSave={status === 'syncing'}
      disabledClose 
      titleButton="Hoàn tất"
      onSave={onClose}
 
    >
      <div>
        <style>
          {`
            @keyframes rotate {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            .rotating-icon {
              animation: rotate 2s linear infinite;
            }
          `}
        </style>
        {renderContent()}
      </div>
    </CustomDialog>
  );
};

export default PopupAsync;