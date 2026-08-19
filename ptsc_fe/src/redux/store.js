// import React from "react";
import { configureStore } from "@reduxjs/toolkit";
import managementMenuSlice from "./slices/ManagerMenu/managementMenuSlice";
import businessInfoSlice from "./slices/CitizenBusinessInfo/businessInfoSlice";
import citizenInfoSlice from "./slices/CitizenBusinessInfo/citizenInfoSlice";
import apiConfiguration from "./slices/AdministrationSystem/apiConfiguration";
import generalCategories from "./slices/AdministrationSystem/generalCategories";
import groupUserSlice from "./slices/AdministrationSystem/groupUserSlice";
import rolesSlice from "./slices/AdministrationSystem/rolesSlice";

import parametersSystemParamater from "./slices/AdministrationSystem/parametersSystemParamater";
import managementUnitSlice from "./slices/SharedCategory/managementUnitSlice";
import functionManagement from "./slices/AdministrationSystem/functionManagement";
import managementUsersSlice from "./slices/managementUsersSlice";
import ManageResolutionResultsSlice from "./slices/ProfileMiningTTHC/ManageResolutionResultsSlice";
import bpmnSlice from "./slices/BPMN/BpmnSlice";
import dynamicFormSlice from "./slices/DynamicForm/DynamicFormSlice";
import formDesignSlice from "./slices/FormDesign/formDesignSlice";
import userReducer from "./slices/Directive/Directive";
import layoutReducer from "./slices/layoutSlice";
import configReducer from "./slices/configSlice";
import permissionSlice from "./slices/PermissionSlice/PermissionSlice";
import authoritySlice from "./slices/Authority/authoritySlice";
import urgentDocumentSlice from "./slices/IncomingDocument/UrgentDocumentSlice";
import receptionReducerSlice from "./slices/IncomingDocument/ReceptionSlice";
import viewConfigSlice from "./slices/ViewConfig/ViewConfigSlice";
import CommentSlice from "./slices/Comment/CommentSlice";
import GiveNumberSlice from "./slices/GiveNumber/GiveNumberSlice";
import CustomTableSlice from "./slices/CustomTable/CustomTableSlice";
import StorageServiceSlice from "./slices/StorageService/StorageServiceSlice";
import RecallTextSlice from "./slices/RecallText/RecallTextSlice";
import TransferFeedbackSlice from "./slices/TransferFeedback/TransferFeedbackSlice";
import SettingClearLogSlice from "./slices/SettingClearLog/SettingClearLogSlice";
import OutGoingDocSlice from "./slices/OutGoingDoc/OutGoingDocSlice";
import RecordManagementSlice from "./slices/RecordManagement/RecordManagementSlice";
import TaskManagementSlice from "./slices/TaskManagement/TaskManagementSlice";
import DigitalSignatureFileSlice from "./slices/DigitalSignatureFileSlice/DigitalSignatureFileSlice";
import JobProfileSlice from "./slices/IncomingDocument/JobProfileSlice";
import ExtendProcessingTimeSlice from "./slices/IncomingDocument/ExtendProcessingTimeSlice";
import IncommingDocSlice from "./slices/IncomingDocument/IncommingDocSlice";
import LeadershipDutyRosterSlice from "./slices/LeadershipDutyRoster/LeadershipDutyRosterSlice";
import TravelWorkSlice from "./slices/TravelWork/TravelWorkSlice";
import newsStatisticsSlice from "./slices/NewsStatistics/NewsStatisticsSlice";
import IncomingDocumentReportSlice from "./slices/IncomingDocument/IncomingDocumentReportSlice";
import leadershipScheduleSlice from "./slices/LeadershipSchedule/LeadershipScheduleSlice";
import leadershipScheduleV2Slice from "./slices/LeadershipSchedule/LeadershipScheduleV2Slice";
import meetingScheduleStatisticsSlice from "./slices/MeetingScheduleStatistics/MeetingScheduleStatisticsSlice";
import TableConfigSlice from "./slices/CustomTable/TableConfigSlice";
import AuthUserSlice from "./slices/User/UserSlice";
import recordExploitationSlice from "./slices/RecordExploitation/RecordExploitationSlice";
import UploadFileSlice from "./slices/UploadFile/UploadFileSlice";
import notificationSlice from "./slices/Notification/NotificationSlice";
import PassportManagementSlice from "./slices/PassportManagement/PassportManagementSlice";
import DashboardPageSlice from "./slices/DashboardPage/DashboardPageSlice";
import DocUserGroupMgmtSlice from "./slices/DocUserGroupMgmt/DocUserGroupMgmtSlice";
import DocCategoryMgmtSlice from "./slices/DocCategoryMgmt/DocCategoryMgmtSlice";
import DocSendingUnitMgmtSlice from "./slices/DocSendingUnitMgmt/DocSendingUnitMgmtSlice";
 
const store = configureStore({
  reducer: {
    dynamic: dynamicFormSlice,
    businessInfoSlice: businessInfoSlice,
    citizenInfoSlice: citizenInfoSlice,
    apiConfiguration: apiConfiguration,
    parametersSystemParamater: parametersSystemParamater,
    unit: managementUnitSlice,
    menu: managementMenuSlice,
    functionManagement: functionManagement,
    users: managementUsersSlice,
    config: configReducer,
    groupUsers: groupUserSlice,
    roles: rolesSlice,
    generalCategories: generalCategories,
    formDesign: formDesignSlice,
    ManageResolutionResultsSlice: ManageResolutionResultsSlice,
    // staticalReportSlice:staticalReportSlice
    // login: loginCallback
    bpmn: bpmnSlice,
    formDesignSlice,
    user: userReducer, // Giữ nguyên cho Directive (được sử dụng bởi nhiều components)
    auth: AuthUserSlice, // Key mới cho UserSlice (authentication)
    layout: layoutReducer,
    permissions: permissionSlice,
    authority: authoritySlice,
    urgentDocuments: urgentDocumentSlice,
    receptionDocuments: receptionReducerSlice,
    viewConfig: viewConfigSlice,
    comment: CommentSlice,
		giveNumber: GiveNumberSlice,
		customTable: CustomTableSlice,
		storage: StorageServiceSlice,
		recallText: RecallTextSlice,
		transferFeedback: TransferFeedbackSlice,
		settingClearLog: SettingClearLogSlice,
		outGoingDoc: OutGoingDocSlice,
		recordManagement: RecordManagementSlice,
		taskManagement: TaskManagementSlice,
		digitalSignatureFile: DigitalSignatureFileSlice,
		jobProfile: JobProfileSlice,
		extendProcessingTime: ExtendProcessingTimeSlice,
		incommingDoc: IncommingDocSlice,
		leadershipDutyRoster: LeadershipDutyRosterSlice,
		travelWork: TravelWorkSlice,
		newsStatistics: newsStatisticsSlice,
    meetingScheduleStatistics: meetingScheduleStatisticsSlice,
    recordExploitation: recordExploitationSlice,
		incomingDocumentReport: IncomingDocumentReportSlice,
    leadershipSchedule: leadershipScheduleSlice,
    leadershipScheduleV2: leadershipScheduleV2Slice,
		tableConfig: TableConfigSlice,
		uploadFile: UploadFileSlice,
		notification: notificationSlice,
		passportManagement: PassportManagementSlice,
		dashboardPage: DashboardPageSlice,
		docUserGroupMgmt: DocUserGroupMgmtSlice,
		docCategoryMgmt: DocCategoryMgmtSlice,
		docSendingUnitMgmt: DocSendingUnitMgmtSlice,
   },
});

export default store;
