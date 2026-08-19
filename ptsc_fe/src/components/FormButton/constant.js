export const typeFlagMap = {
  transfer: "canProcess",
  transferMultiple:"canProcess",
  return: "canReturn",
  recallInternalReceiveUnit: "recallInternalReceiveUnit",
  complete: "canComplete",
  completeDoc: "canCompleteDoc",
  completeSupport: "canCompleteSupport",
  viewed: "canViewed",
  transferSupport: "canProcessSupport",
  saveBook: "canSaveBook",
  signingSubmission: "canSigningSubmission",
  feedback: "canGiveFeedback",
  transferFeedback: "canTransferFeedback",
  issueProposal: "canIssueProposal",
  suggestPromulgate: "canSuggestPromulgate",
  documentFlowTransfer: "canDocumentFlowTransfer",
  viewMark:'canMarkViewed',
  edit: "canEdit",
  approve: "canApprove",
  reject: "canReject",
  approvetaskformdoc: ["canApproveFromDoc", "canApproveFormMeeting",'canApprove'],
  taskformdoc:["canSendAdjustFromDoc","canSendAdjustFormMeeting",'canSendAdjust'],
  approvetask: "canApprove",
  rejecttask:"canApprove", 
  "agree_meeting":"canAgreeMeeting",
  "reject_meeting":"canRejectMeeting",
  "transfer_meeting":"canTransferMeeting",
  "confirm_join_meeting": "canConfirmJoinMeeting",
  "confirm_join": "canConfirmJoin",
  "reject_join": "canRejectJoin",
  "delegate_join": "canDelegateJoin",
  updatetaskformdoc:['canConfirmAdjustFromDoc','canConfirmAdjustFormMeeting',],
  approvenews:"canApproveNews",
  recall: "canRecallNews",
  "process_meeting": "canProcessMeeting",
  createDocDraft: "canCreateDraft",
  "edit_meeting": "canEditMeeting",
  "delete_meeting": "canDeleteMeeting",
  "recall_meeting": "canRecallMeeting",
  "cancel_meeting": "canCancelMeeting",
  "update_meeting_unit_process": "canUpdateMeetingUnitProcess",
  attendanceLocked: "canLockAttendance",
  "seat_assigment":"canSeatAssigment",
  'update_seat_assignment' :'canUpdateSeatAssigment',
  'update_seat_asignment' :'canUpdateSeatAsigment',
  "updatetask":'canConfirmAdjust',
  "create_meeting_seat": "canCreateMeetingSeat",
  "auto_announced_meeting": "canAutoAnnouncedMeeting",
  "create_meeting": "canCreateMeeting",
  "auto_submit_meeting": "canAutoSubmitMeeting",
  "process_meeting_user": "canProcessMeetingUser",
  "announce_calendar": "canAnnounceCalendar",
  "save_mining_records":"canSaveMiningRecords",
  "auto_submit_mining_records":"canAutoSubmitMiningRecords",
  "leaders_approve_mining_records":"canLeadersApproveMiningRecords",
  "leaders_reject_mining_records":"canLeadersRejectMiningRecords",
  "director_approve_mining_records": "canDirectorApproveMiningRecords",
  "director_reject_mining_records": "canDirectorRejectMiningRecords",
  "confirming_mining_records": "canConfirmingMiningRecords",
  "request_leaders_mining_records": "canSubmitMiningRecords",
  "edit_mining_records": "canEditMiningRecords",
  "complete_mining_records": "canConfirmingMiningRecords",
  "approve_comander_mining_records": "canDirectorApproveMiningRecords",
  "cancel_recurring_meeting": "canCancelRecurringMeeting",
  "submit_vehicle_registrant": "canSubmitVehicleRegistrant",
  "agree_vehicle_registrant": "canAgreeVehicleRegistrant",
  "reject_vehicle_registrant": "canRejectVehicleRegistrant",
  "edit_vehicle_registrant": "canEditVehicleRegistrant",
  "cancel_vehicle_registrant": "canCancelVehicleRegistrant",
  "noti_vehicle_registrant" : "canNotiVehicleRegistrant",
  "agree_vehicle_registrant_again" : "canAgreeVehicleRegistrantAgain",
  "finish_vehicle_registrant" : "canFinishVehicleRegistrant",
  "comfirm_vehicle_registrant" : "canConfirmVehicleRegistrant",
	"update_meeting_person": "canUpdateMeetingPerson",
	"confirmPropose": "canConfirmPropose",
	"recallProcessing": "canRecallOutgoing",
	"tasksucessfull": 'canSucessfull', // Hoành thành cv cần phê duyệt
	"HOAN_THANH_LUAN_CHUYEN": "canCompleteAndTransition", // Hoàn thành luân chuyển
	"approvePassport": "canApprovePassport", // Phê đuyệt hộ chiếu
	"transferPassport": "canTransferPassport", // Chuyển xử lý hộ chiếu
	"receptionPassport": "canReceptionPassport", // Tiếp nhận hộ chiếu
	"refusePassport": ["canRefusePassportDV", "canRefusePassportVP", "canRefusePassportBPCT"], // Từ chối xử lý hộ chiếu
	// "paperDocInboundHandle": "canAcknowledgeDocument",
  "submit_destroy_records": "canApprove",
  "commander_approve_destroy_records": "canCommanderApproveDestroyRecords",
  "commander_reject_destroy_records": "canCommanderRejectDestroyRecords",
  "directors_return_destroy_records": "DirectorsReturnDestroyRecords",
  "director_approve_destroy_records": "DirectorApproveDestroyRecords",
  "clerical_destroy_records": "ClericalDestroyRecords",
  "recallIncomingDoc": "canRecallIncoming",
}


export const ACTION_MAP = {
  transferMultiple: "TransferProcess",
	approvePassport: "ApprovePassport", // Phê đuyệt hộ chiếu
	transferPassport: "TransferPassport", // Chuyển xử lý hộ chiếu
	receptionPassport: "ReceptionPassport", // Tiếp nhận hộ chiếu
	refusePassport: "RefusePassport", // Từ chối xử lý hộ chiếu
  transfer: "TransferProcess", // chuyển xl 
  transferView: "TransferProcess",
  return: "ReturnModel", // tra lại 
  complete: "Complete",// hoàn thành vb dêdsn
  completeDoc: "CompleteDoc", // hoàn thành
  completeSupport: "CompleteSupport", // hoàn thành phổi hợp
  viewed: "Viewed",   // đã xem
  transferSupport: "TransferSupport", // chuyển xử lý phổi hợp
  saveBook: "SaveBookModel", // lưu  sở
  signingSubmission: "SigningSubmission", // trình ký
  documentFlowTransfer: "SigningSubmission", // trình ký
  feedback: "FeedbackModel",     // xin ý kiến
  transferFeedback: "TranferFeedback",  // chuyển xin ý kiến
  issueProposal: "IssueProposal", // trình đề xuất
  recallInternalReceiveUnit: "RecallTextModel", 
  recallUserReceive: "RecallTextModel",
  recallCommentUser: "RecallTextModel",
  suggestPromulgate: "SuggestPromulgate", // đề xuất
  viewMark:'MarkView', // đã xem
  edit: "EditModel",
  approve: "ApproveModel",
  reject: "RejectModel",
  "agree_meeting":'ApproveMeeting',
  "reject_meeting":'RejectMeeting',
  "transfer_meeting":'ProposeMeeting',
  "confirm_join_meeting": "JoinMeeting",
  "confirm_join": "JoinMeeting",
  "reject_join": "RejectJoin",
  "delegate_join": "DelegateJoin",
  approvetaskformdoc:['ApproveTaskFormDoc', 'ApproveTaskFormMeeting'],// 
  taskformdoc:['TaskFormDoc', 'TaskFormMeeting'],// gửi điều chỉnh
  approvetask:'Approvetask', // đồng ý điều chỉnh
  rejecttask:'Rejecttask', // từ chối điều chỉnh
  updatetaskformdoc:['UpdateTaskFormDoc','UpdateTaskFormMeeting'], // xác nhận điều chỉnh
  approvenews: 'ApproveNewsDialogBulk',
  recall: "RecallNewsDialogBulk",
  "process_meeting": "processMeeting",
  createDocDraft: "CreateDocDraft", // tạo vb dự thảo
  "edit_meeting": "EditMeeting",
  "delete_meeting": "DeleteMeeting",
  "recall_meeting": "RecallMeeting",
  "cancel_meeting": "CancelMeeting",
  "cancel_recurring_meeting": "CancelRecurrenceMeeting",
  attendanceLocked: "LockAttendance",
  "seat_assigment":"SeatAssigment",
  'update_seat_assignment' :'UpdateSeatAssigment',
  "update_seat_asignment": 'UpdateSeatAsigment',
  "updatetask":'UpdateTask',
  "create_meeting_seat": "CreateMeetingSeat",
  "auto_announced_meeting": "AutoAnnouncedMeeting",
  "create_meeting": "CreateMeeting",
  "auto_submit_meeting": "AutoSubmitMeeting",
  "process_meeting_user" : "ProcessMeetingUser",
  "announce_calendar" : "AnnounceCalendar",
  "save_mining_records":"SaveMiningRecords",
  "auto_submit_mining_records":"AutoSubmitMiningRecords",
  "leaders_approve_mining_records": "LeadersApproveMiningRecords",
  "leaders_reject_mining_records": "LeadersRejectMiningRecords",
  "director_approve_mining_records": "DirectorApproveMiningRecords",
  "director_reject_mining_records": "DirectorRejectMiningRecords",
  "confirming_mining_records": "ConfirmingMiningRecords",
  "request_leaders_mining_records": "SubmitMiningRecords",
  "complete_mining_records": "ConfirmingMiningRecords",
  "approve_comander_mining_records": "DirectorApproveMiningRecords",
  "submit_vehicle_registrant": "SubmitVehicleRegistrant", 
  "agree_vehicle_registrant": "AgreeVehicleRegistrant",
  "reject_vehicle_registrant": "RejectVehicleRegistrant",
  "edit_vehicle_registrant": "EditVehicleRegistrant",
  "cancel_vehicle_registrant": "CancelVehicleRegistrant",
  "noti_vehicle_registrant": "NotiVehicleRegistrant",
  "agree_vehicle_registrant_again": "AgreeVehicleRegistrantAgain",
  "update_meeting_unit_process": "UpdateMeetingUnitProcess",
  "finish_vehicle_registrant" : "FinishVehicleRegistrant",
  "comfirm_vehicle_registrant" : "ConfirmVehicleRegistrant",
  "update_meeting_person": "UpdateMeetingPerson",
  "confirmPropose" : "ConfirmPropose",
  "recallProcessing": "RecallProcessing",
  "tasksucessfull":'TaskSucessFull', // Hoàn thành cv cần phê duyệt
  "HOAN_THANH_LUAN_CHUYEN": "CompleteAndTransition", // Hoàn thành luân chuyển
  "submit_destroy_records": "SubmitDestroyRecords",
  "commander_approve_destroy_records": "SubmitDestroyRecords",
  "commander_reject_destroy_records": "ReturnReasonDestroyRecords",
  "directors_return_destroy_records": "ReturnReasonDestroyRecords",
  "director_approve_destroy_records": "ApproveConfirmDestroyRecords",
  "clerical_destroy_records": "ConfirmDestroyRecords",
  "recallIncomingDoc": "RecallIncomingTextDialog",
};