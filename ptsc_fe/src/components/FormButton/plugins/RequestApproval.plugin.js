import React from 'react';

const RequestApprovalDialog = React.lazy(() =>
  import('@pages/PassportManagement/RequestListPage/components/RequestApprovalDialog')
);

const OPEN_KEYS = [
  'ApprovePassport',
  'TransferPassport',
  'ReceptionPassport',
  'RefusePassport',
];

const getRejectActionType = (openDialog, dataDetail) => {
  const targetRole = `${openDialog?.targetRole || ''}`.toLowerCase();

  if (targetRole.includes('van_phong') || targetRole.includes('vp')) {
    return 'rejectOfficeCommanderRequest';
  }

  if (
    targetRole.includes('chuyen_trach') ||
    targetRole.includes('bpct') ||
    targetRole.includes('special')
  ) {
    return 'rejectSpecialDeptReq';
  }

  if (dataDetail?.flags?.canRefusePassportVP) return 'rejectOfficeCommanderRequest';
  if (dataDetail?.flags?.canRefusePassportBPCT) return 'rejectSpecialDeptReq';

  return 'reject';
};

const mapActionsKeyType = (openDialog, dataDetail) => {
  const actionType = openDialog?.actionType;

  if (actionType === 'approvePassport') return 'approve';
  if (actionType === 'transferPassport') return 'transferProcessing';
  if (actionType === 'receptionPassport') return 'receiveRequest';
  if (actionType === 'refusePassport') return getRejectActionType(openDialog, dataDetail);

  if (openDialog?.ApprovePassport) return 'approve';
  if (openDialog?.TransferPassport) return 'transferProcessing';
  if (openDialog?.ReceptionPassport) return 'receiveRequest';
  if (openDialog?.RefusePassport) return getRejectActionType(openDialog, dataDetail);

  return undefined;
};

const getTitleByActionType = (actionsKeyType) => {
  const titleByAction = {
    approve: 'Phê duyệt yêu cầu',
    reject: 'Từ chối yêu cầu',
    rejectOfficeCommanderRequest: 'Từ chối yêu cầu',
    rejectSpecialDeptReq: 'Từ chối yêu cầu',
    transferProcessing: 'Chuyển xử lý yêu cầu',
    receiveRequest: 'Tiếp nhận yêu cầu',
  };

  return titleByAction[actionsKeyType] || 'Xử lý yêu cầu';
};

export default {
  name: 'ConfirmPropose',
  component: RequestApprovalDialog,

  mapProps: (openDialog, allProps) => {
    const { dataDetail, setReloadData, documentId, handleCloseDialog, onAction } = allProps;

    const openKey = OPEN_KEYS.find((key) => !!openDialog?.[key]);
    const open = Boolean(openKey);
    const actionsKeyType = mapActionsKeyType(openDialog, dataDetail);

    const handleClose = () => {
      if (openKey) {
        handleCloseDialog?.(openKey);
      }
    };

    const handleRequestApprovalActionSuccess = (actionType) => {
      if (typeof onAction === 'function') {
        onAction(actionType, { actionType, action: openDialog, dataDetail });
      }
    };

    const handleOpenOfficialHandoverDoc = (openHandoverDoc) => {
      if (openHandoverDoc && typeof onAction === 'function') {
        onAction('openOfficialHandoverDoc', {
          actionType: 'openOfficialHandoverDoc',
          action: openDialog,
          dataDetail,
        });
      }
    };

    const requestId =
      dataDetail?.id ||
      dataDetail?._id ||
      dataDetail?.documentId ||
      dataDetail?.recordId ||
      documentId;

    return {
      open,
      onClose: handleClose,
      title: getTitleByActionType(actionsKeyType),
      actionsKeyType,
      requestId,
      onActionSuccess: handleRequestApprovalActionSuccess,
      size: 'md',
      dataRequest: dataDetail,
      setOpenOfficialHandoverDoc: handleOpenOfficialHandoverDoc,
      setReloadData,
      typePassportRequest: dataDetail?.typeRequest?.value,
    };
  },
};
