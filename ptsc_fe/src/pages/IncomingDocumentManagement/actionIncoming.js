// import { lazy } from "react";
// const AddDialog = lazy(() => import("@pages/TextAway/Tab/SigningSubmissionTab/AddDialog"));
// const EditDialog = lazy(() => import("@pages/TextAway/Tab/SigningSubmissionTab/EditDialog"));

export const rawActionsIncomming = [
  {
    key: "canTransferRoom", // Key này dùng để check trong row.flags.canTransferRoom
    label: "THÊM XỬ LÝ",
    icon: "Transfer",
    componentKey: "TRANSFER_PROCESS",
    type: "transfer",
    actionType: "transfer"
  }
];
