import { rawActionsIncomming } from "@pages/IncomingDocumentManagement/actionIncoming";

const rawActions = [
  ...rawActionsIncomming,
];

const formatAction = (handlers, item) => ({
  key: item.key,
  label: item.label,
  icon: item.icon,
  onClick: (row) => {
    if (handlers && typeof handlers.onAction === 'function') {
      const config = {
        component: item.component,
        componentKey: item.componentKey,
        displayType: item.type || "swiper",
        icon: item.icon,
        actionType: item.actionType || (item.componentKey?.includes("VIEW") ? "view" : "update"),
        popupName: item.label,
        size: item.size || "md"
      };

      // Xử lý logic đặc biệt cho chuyển xử lý (TransferProcess) tương tự FormButton
      if (item.type === "transfer" && row?.availableActions) {
        // Tìm hành động chuyển xử lý chính hoặc bất kỳ hành động chuyển xử lý nào có sẵn
        const transferAction = (row.availableActions || []).find(
          (act) => act.type === "transfer" || act.code?.includes("CHUYEN_XU_LY")
        );
        
        if (transferAction) {
          Object.assign(config, {
            actionCode: transferAction.code,
            codeAvailableActions: transferAction.code, // Quan trọng: TransferProcess dùng codeAvailableActions trong logic body submit
            targetRole: transferAction.targetRole,
            actionsBySub: transferAction.actions,
            actionsCodeSubTab: Array.isArray(transferAction.actions) ? transferAction.actions.map(a => a.code).join(',') : null,
            canSetProcessor: transferAction.canSetProcessor,
            canSetSupporter: transferAction.canSetSupporter,
            canSetViewer: transferAction.canSetViewer,
            canTransferRooms: transferAction.canTransferRoom || transferAction.canTransferRooms,
            canTransferRoom: transferAction.canTransferRoom,
            canTransferRoomProcessor: transferAction.canTransferRoomProcessor,
            canTransferRoomSupporter: transferAction.canTransferRoomSupporter,
            canTransferRoomViewer: transferAction.canTransferRoomViewer,
            canChuyenVanThu: transferAction.canChuyenVanThu,
            canChuyenDonVi: transferAction.canChuyenDonVi,
            isMultiTransfer: transferAction.isMultiTransfer,
          });
        }
      }

      handlers.onAction({ config }, row);
    }
  }
});

export const manualActions = (handlers) => rawActions.map(item => formatAction(handlers, item));
