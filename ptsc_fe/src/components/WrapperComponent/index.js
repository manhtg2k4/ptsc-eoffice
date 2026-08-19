import React from "react";
import InputComponent from "@components/CustomInput/CustomInputBase";
import InputComponents from "@components/CustomInput/CustomInput";
import CustomAutocomplete from "@components/AutocompletepPro";
import CustomDatePicker from "@components/CustomDatePicker";
import CustomButton from "@components/CustomButton";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import CustomTableNotification from "@components/CustomTable/CustomTableNotification";
import CustomDialogStyle from "@components/CustomDialog/CustomDialogStyle";
import CustomTable from "@components/CustomTable/CustomTable";
import Swipper from "@components/Swipper";
import BaseSwipper from "@components/Swipper/BaseSwiper";
import CustomIconButton from "@components/CustomIconButton";

import { useToast } from "@components/common/ToastProvider";
import CustomTabsWithBadge from "@components/CustomTabs";
import CustomAsyncAutoComplete from "@components/CustomAsyncAutoComplete";
import LoadingDialog from "@components/LoadingDialog";
import CustomAsyncAutoCompletes from "@components/CustomAsyncAutoCompletes";
import CustomAsyncAutoCompleted from "@components/CustomAsyncAutoCompleted";
import CustomInputTag from "@components/CustomInput/CustomInputTag";
import CustomAutoCompleteSearch from "@components/CustomAutoCompleteSearch";


// Dùng lazy để tránh circular dependency

/**
 * Nếu muốn thêm một component vào sharedComponents, kiểm tra xem component đó có được bọc HOC hoặc import chéo không.
 * Nếu có nguy cơ circular dependency, sử dụng lazy import.
 * Luôn test render component để chắc chắn fallback và lazy hoạt động đúng.
 * Ghi chú rõ ràng trong sharedComponents để các developer khác hiểu lý do dùng lazy.
 * 
 */

const TransferProcess = React.lazy(() => import("@components/TransferProcess/indexCXLV2"));  // Form Chuyển Xử lý,
const SubmitProposal = React.lazy(() => import("@components/SubmitProposal/indexSubmitV2")); // Form Trình lãnh đạo / Chuyển đề xuất
const ProposedSolution = React.lazy(() => import("@components/ProposedSolution")); // Form Đề xuất xử lý

const FeedbackModel = React.lazy(() => import("@components/FeedbackModel")); // Form xin ý kiến
const ReturnModel = React.lazy(() => import("@components/ReturnModel")); // Form xin ý kiến

const UploadFile = React.lazy(() => import("@components/UploadFile")); // Form xin ý kiến
const CustomChildTab = React.lazy(() => import("@components/CustomTabs/CustomChildTab")); // Form xin ý kiến

const SaveForReference = React.lazy(() => import("@components/SaveForReference"));
const SaveBookModel = React.lazy(() => import("@components/SaveBookModel"));
const ButtonOutline = React.lazy(() => import("@components/CustomButtonOutline"));
const CustomDateRangePicker = React.lazy(() => import("@components/CustomDateRangePicker"));
const CustomDateTimePicker = React.lazy(() => import("@components/CustomDateTimePicker"));
const DateTimeRangePicker = React.lazy(() => import("@components/CustomDateTimePicker/DateTimeRangePicker"));
// const CustomTableNotification = React.lazy(() => 
//   import("@components/CustomTable/CustomTableNotification")
// );
/** 
 * Đối tượng chứa các component dùng chung trong toàn bộ ứng dụng.
 * Giúp dễ dàng inject các component phổ biến thông qua HOC `withSharedComponents`.
 *
 * @type {Object}

 * @property {Function} toast - Đối tượng điều khiển Toast (thông báo) từ ToastProvider.
 * @property {React.ComponentType} Input - Component input tuỳ chỉnh (CustomInput / CustomTextField).
 * @property {React.ComponentType} InputComponents - Component input nâng cao tuỳ chỉnh (CustomInput).
 * @property {React.ComponentType} Autocomplete - Component Autocomplete tuỳ chỉnh cho select hoặc search.
 * @property {React.ComponentType} DatePicker - Component chọn ngày tuỳ chỉnh (CustomDatePicker).
 * @property {React.ComponentType} Button - Component nút bấm tuỳ chỉnh (CustomButton).
 * @property {React.ComponentType} Dialog - Component hộp thoại tuỳ chỉnh (CustomDialog).
 * @property {React.ComponentType} Table - Component bảng hiển thị tĩnh (CustomTable).
 * @property {React.ComponentType} CustomSwipper - Component trình chiếu (slider) tuỳ chỉnh.
 * @property {React.ComponentType} IconButton - Nút icon tuỳ chỉnh (CustomIconButton).
 * @property {React.ComponentType} CustomTabsWithBadge - Component Tabs có Badge (số lượng) tuỳ chỉnh.
 * @property {React.ComponentType} AsyncAutoComplete - Component Autocomplete bất đồng bộ (AsyncAutocomplete).
 * @property {React.ComponentType} LoadingDialog - Component hiển thị loading (LoadingDialog).
 * @property {React.ComponentType} TransferProcess - Component hiển thị chuyển/ đề xuất xử lý.
 * @property {React.ComponentType} FeedbackModel - Component hiển thị xin ý kiến.
 * @property {React.ComponentType} ButtonOutline - Component hiển thị button có outline vào màn động. 
 * @property {React.ComponentType} DateRangePicker - Component hiển thị 2 ngày chọn khoảng ngày.
 * @property {React.ComponentType} DiaLogStyle - Component tự style cho dialog.
 * @property {React.ComponentType} TableNotification - Component bảng hiển thị thông báo (CustomTableNotification).
 * @property {React.ComponentType} CustomDateTimePicker - Component hiển thị đề xuất xử lý.
 * @property {React.ComponentType} BaseSwipper - Component trình chiếu (slider) tuỳ chỉnh.
*/

const withSharedComponents = (WrappedComponent) => {
  const ComponentWithShared = (props) => {
    const toast = useToast();

    const sharedComponents = {
      toast,
      Input: InputComponent,
			InputComponents: InputComponents,
			CustomInputTag: CustomInputTag,
      Autocomplete: CustomAutocomplete,
      DatePicker: CustomDatePicker,
      DateRangePicker: CustomDateRangePicker,
      DateTimePicker: CustomDateTimePicker,
      Button: CustomButton,
      ButtonOutline: ButtonOutline,
      Dialog: CustomDialog,
      DiaLogStyle: CustomDialogStyle,
      Table: CustomTable,
      TableNotification: CustomTableNotification,
      CustomSwipper: Swipper,
      IconButton: CustomIconButton,
      CustomTabsWithBadge: CustomTabsWithBadge,
      AsyncAutoComplete: CustomAsyncAutoComplete,
      AsyncAutoCompletes: CustomAsyncAutoCompletes,
			AsyncAutoCompleted: CustomAsyncAutoCompleted,
			CustomAutoCompleteSearch: CustomAutoCompleteSearch,
      LoadingDialog: LoadingDialog,
      TransferProcess,
      SubmitProposal,
      FeedbackModel,
      ProposedSolution,
      ReturnModel,
      UploadFile,
      CustomChildTab,
      SaveForReference, // Thêm NotificationsPage vào danh sách shared
      SaveBookModel,
      BaseSwipper,
			DateTimeRangePicker: DateTimeRangePicker
    };

    // ✅ Truyền sharedComponents xuống WrappedComponent
    return <WrappedComponent {...props} sharedComponents={sharedComponents} />;
  };

  const wrappedName =
    WrappedComponent.displayName || WrappedComponent.name || "Component";
  ComponentWithShared.displayName = `withSharedComponents(${wrappedName})`;

  return ComponentWithShared;
};

export default withSharedComponents;
