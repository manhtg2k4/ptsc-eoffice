import React, { useCallback, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import withSharedComponents from "@components/WrapperComponent";
import { Controller, useForm } from "react-hook-form";
import { CircularProgress, Grid } from "@mui/material";
import { SpanRequired, TextOption } from "@styles/PassportManagement.styles";
import { API_PASSPORT_REQUEST } from "@EnvironmentFile/constants/urlConfig";
import { useDispatch, useSelector } from "react-redux";
import { useToast } from "@components/common/ToastProvider";
import {
  approvePassportRequest,
  getDataDetailPassportRequest,
  receivePassportRequest,
  rejectOfficeCommanderRequest,
  rejectPassportRequest,
  rejectSpecialistRequest,
  transferPassportRequest,
} from "@redux/slices/PassportManagement/PassportManagementSlice";
import { yupResolver } from "@hookform/resolvers/yup";
// eslint-disable-next-line no-restricted-imports
import {
  defaultValueRequestApprovalDialog,
  formatDateDDMMYYYY,
  rejectTypes,
  requestApprovalDialogSchema,
} from "../constantsRequestListPage";
import { StyledLoadingPopupSignDigital } from "@styles/UploadFile/UploadFile.style";
import { openDetailDialog } from "@components/GlobalDialogPortal";
import { getComponentByKey } from "@builder-table/components/componentRegistry";

// Component tái sử dụng cho required label
const RequiredLabel = ({ children }) => (
  <TextOption>
    {children}
    <SpanRequired>*</SpanRequired>
  </TextOption>
);

RequiredLabel.propTypes = {
  children: PropTypes.node.isRequired,
};

const RequestApprovalDialog = (props) => {
  const {
    open,
    onClose,
    sharedComponents,
    title,
    requestId,
    onActionSuccess,
    dataRequest,
    size,
    actionsKeyType,
    onSuccess,
    setReloadData,
    setOpenOfficialHandoverDoc,
    typePassportRequest,
  } = props;
  // logger.log("RequestApprovalDialog props:", props);
  const dispatch = useDispatch();
  const { dataDetailPassportRequest } = useSelector(
    (state) => state.passportManagement
  );
  // logger.log("dataDetailPassportRequest:", dataDetailPassportRequest);

  const toast = useToast();
  const { Dialog, InputComponents, AsyncAutoComplete } = sharedComponents;
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(requestApprovalDialogSchema),
    context: {
      actionType: actionsKeyType,
    },
    defaultValues: defaultValueRequestApprovalDialog,
    mode: "onChange",
  });

  const [isLoading, setIsLoading] = React.useState(false);

  useEffect(() => {
    if (open) {
      reset(defaultValueRequestApprovalDialog);
    }
  }, [open, actionsKeyType, reset]);

  useEffect(() => {
    const fetchData = async () => {
			if (!open) return;
      try {
        setIsLoading(true);
        await dispatch(
          getDataDetailPassportRequest(props?.id || props?.documentId || props?.requestId)
        ).unwrap();
      } catch (error) {
        const errorMessage =
          error?.response?.data?.message ||
          error?.message ||
          "Lấy dữ liệu chi tiết yêu cầu thất bại!";
        toast(errorMessage, "error");
        logger.log("Lấy dữ liệu chi tiết yêu cầu thất bại!:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [
    dispatch,
    requestId,
    open,
    dataRequest,
    toast,
    props?.id,
    props?.documentId,
    props?.requestId,
  ]);

  const titleButton = useMemo(() => {
    if (actionsKeyType === "receiveRequest") {
      return "Đồng ý và tạo biên bản";
    }
    return "Đồng ý";
  }, [actionsKeyType]);

  const actionConfig = useMemo(
    () => ({
      approve: {
        action: approvePassportRequest,
        buildBody: (data) => ({
          approvalReason: data.approvalReason,
        }),
        successMessage: "Phê duyệt yêu cầu mượn hộ chiếu thành công!",
      },
      reject: {
        action: rejectPassportRequest,
        buildBody: (data) => ({
          approvalReason: data.approvalReason,
        }),
        successMessage: "Từ chối yêu cầu mượn hộ chiếu thành công!",
      },
      transferProcessing: {
        action: transferPassportRequest,
        buildBody: (data) => ({
          handleUserId: data.handleUserId?.id,
          approvalReason: data.approvalReason,
        }),
        successMessage: "Chuyển xử lý yêu cầu mượn hộ chiếu thành công!",
      },
      rejectOfficeCommanderRequest: {
        action: rejectOfficeCommanderRequest,
        buildBody: (data) => ({
          approvalReason: data.approvalReason,
        }),
        successMessage: "Từ chối yêu cầu mượn hộ chiếu thành công!",
      },
      rejectSpecialDeptReq: {
        action: rejectSpecialistRequest,
        buildBody: (data) => ({
          approvalReason: data.approvalReason,
        }),
        successMessage: "Từ chối yêu cầu mượn hộ chiếu thành công!",
      },
      receiveRequest: {
        action: receivePassportRequest,
        buildBody: (data) => ({
          approvalReason: data.approvalReason,
        }),
        successMessage: "Tiếp nhận yêu cầu mượn hộ chiếu thành công!",
      },
    }),
    []
  );

  const handleClose = useCallback(() => {
    reset(defaultValueRequestApprovalDialog);
    onClose();
  }, [onClose, reset]);

  const handleSave = useCallback(
    async (data) => {
      const config = actionConfig[actionsKeyType];
      const configId = requestId || props?.id || props?.documentId;
      if (!config || !configId) {
        return toast("Không thể xử lý hành động này!", "error");
      }

      try {
        setIsLoading(true);
        const body = config.buildBody(data);
        await dispatch(config.action({ id: configId, body })).unwrap();
        toast(config.successMessage, "success");
        // Chỉ mở biên bản bàn giao khi tiếp nhận yêu cầu
        if (actionsKeyType === "receiveRequest") {
          // Ưu tiên: gọi callback setOpenOfficialHandoverDoc nếu có (từ ViewPassportRequest)
          if (setOpenOfficialHandoverDoc) {
            setOpenOfficialHandoverDoc(true);
          } else {
            // Fallback: mở dialog Tạo biên bản bàn giao từ GlobalDialogPortal (khi dùng từ componentRegistry)
            const officialHandoverInfo = getComponentByKey(
              "CREATE_OFFICIAL_HANDOVER"
            );
            if (officialHandoverInfo) {
              openDetailDialog(officialHandoverInfo, configId);
            }
          }
        }
        handleClose();
        onSuccess?.();
        setReloadData?.((prev) => !prev);
        onActionSuccess?.(actionsKeyType);
      } catch (error) {
        const errorMessage =
          error?.response?.data?.message ||
          error?.message ||
          "Xử lý yêu cầu thất bại!";
        toast(errorMessage, "error");
      } finally {
        setIsLoading(false);
      }
    },
    [
      actionConfig,
      actionsKeyType,
      requestId,
      dispatch,
      toast,
      handleClose,
      onActionSuccess,
      props?.id,
      props?.documentId,
      onSuccess,
      setReloadData,
      setOpenOfficialHandoverDoc,
    ]
  );

  const getDisplayValue = (value, fallbackKeys = []) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }
    if (typeof value === "object") {
      const preferredKeys = [
        "nameVn",
        "title",
        "label",
        "fullName",
        "passportNumber",
        ...fallbackKeys,
      ];

      for (const key of preferredKeys) {
        const fieldValue = value?.[key];
        if (
          fieldValue !== null &&
          fieldValue !== undefined &&
          fieldValue !== ""
        ) {
          return String(fieldValue);
        }
      }
    }
    return "";
  };

	// const configData = dataRequest ?? dataDetailPassportRequest;
	const configData = useMemo(() => dataDetailPassportRequest, [dataDetailPassportRequest]);
  const isOrganizationalRequest =
    typePassportRequest === "organizational" ||
    dataDetailPassportRequest?.typeRequest?.value === "organizational";

  const renderUserForm = useMemo(() => {
    return (
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <TextOption>Người đề nghị:</TextOption>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextOption>
            {getDisplayValue(configData?.requesterInfo?.name)}
          </TextOption>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextOption>Đơn vị:</TextOption>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextOption>
            {getDisplayValue(configData?.requesterInfo?.organizationName)}
          </TextOption>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextOption>Người mượn:</TextOption>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextOption>
            {getDisplayValue(configData?.namePassportRequest)}
          </TextOption>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextOption>Lãnh đạo:</TextOption>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextOption>
            {getDisplayValue(
              configData?.delegationLeader?.nameVn || configData?.leader
            )}
          </TextOption>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextOption>Số hộ chiếu:</TextOption>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextOption>{getDisplayValue(configData?.passportNumber)}</TextOption>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextOption>Loại hộ chiếu:</TextOption>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextOption>{getDisplayValue(configData?.passportType)}</TextOption>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextOption>Ngày dự kiến mượn:</TextOption>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextOption>{getDisplayValue(configData?.borrowDate)}</TextOption>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextOption>Ngày dự kiến trả:</TextOption>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextOption>{getDisplayValue(configData?.returnDate)}</TextOption>
        </Grid>
        {actionsKeyType === "transferProcessing" && (
          <>
            <Grid item xs={12} sm={6} md={3}>
              <RequiredLabel>Người xử lý:</RequiredLabel>
            </Grid>
            <Grid item xs={12} sm={6} md={9}>
              <Controller
                name="handleUserId"
                control={control}
                render={({ field }) => (
                  <AsyncAutoComplete
                    fullWidth
                    placeholder="Tìm kiếm người xử lý..."
                    url={`${API_PASSPORT_REQUEST}/flow-users?roleCode=BO_PHAN_CHUYEN_TRACH`}
                    queryParam="name"
                    optionLabel="name"
                    optionValue="id"
                    value={field.value}
                    onChange={field.onChange}
                    error={!!errors.handleUserId}
                    helperText={errors.handleUserId?.message}
                    size="small"
                    required={actionsKeyType === "transferProcessing"}
                    unsetFontWeight
                  />
                )}
              />
            </Grid>
          </>
        )}
        <Grid item xs={12} sm={6} md={3}>
          {rejectTypes.includes(actionsKeyType) ? (
            <RequiredLabel>Ý kiến từ chối:</RequiredLabel>
          ) : (
            <TextOption>Ý kiến:</TextOption>
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={9}>
          <Controller
            name="approvalReason"
            control={control}
            render={({ field }) => (
              <InputComponents
                {...field}
                error={!!errors.approvalReason}
                helperText={errors.approvalReason?.message}
                multiline
                rows={3}
                placeholder="Nhập ý kiến..."
                required={rejectTypes.includes(actionsKeyType)}
              />
            )}
          />
        </Grid>
      </Grid>
    );
  }, [configData, actionsKeyType, control, errors]);

	// logger.log('configData', configData)
  const renderOrganizationalForm = useMemo(() => {
    return (
      <Grid container spacing={2}>
				<Grid item xs={12} sm={6} md={2}>
					{/* Hàng 1 */}
          <TextOption>Tên đoàn:</TextOption>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextOption>
            {getDisplayValue(configData?.namePassportRequest?.nameVn)}
          </TextOption>
        </Grid>
        <Grid item xs={12} sm={6} md={1.5}>
          <TextOption>Trưởng đoàn:</TextOption>
        </Grid>
        <Grid item xs={12} sm={6} md={1.5}>
          <TextOption>
            {getDisplayValue(configData?.delegationLeader?.nameVn)}
          </TextOption>
        </Grid>
        <Grid item xs={12} sm={6} md={1}>
          <TextOption>Chức vụ:</TextOption>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <TextOption>
            {getDisplayValue(configData?.position)}
          </TextOption>
				</Grid>
				{/* Hàng 2 */}
        <Grid item xs={12} sm={6} md={2}>
          <TextOption>Nơi đến:</TextOption>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextOption>
            {getDisplayValue(configData?.destination?.title)}
          </TextOption>
        </Grid>
        <Grid item xs={12} sm={6} md={1.5}>
          <TextOption>Ngày đi:</TextOption>
        </Grid>
        <Grid item xs={12} sm={6} md={1.5}>
          <TextOption>{formatDateDDMMYYYY(configData?.departureDate)}</TextOption>
        </Grid>
        <Grid item xs={12} sm={6} md={1}>
          <TextOption>Ngày về:</TextOption>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <TextOption>{formatDateDDMMYYYY(configData?.arrivalDate)}</TextOption>
				</Grid>
				{/* Hàng 3 */}
        <Grid item xs={12} sm={6} md={2}>
          <TextOption>Đối tác làm việc:</TextOption>
        </Grid>
        <Grid item xs={12} sm={6} md={10}>
          <TextOption>{getDisplayValue(configData?.partner)}</TextOption>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <TextOption>Nội dung chuyến đi:</TextOption>
        </Grid>
        <Grid item xs={12} sm={6} md={10}>
          <TextOption>{getDisplayValue(configData?.tripContent)}</TextOption>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <TextOption>Quyết định:</TextOption>
        </Grid>
        <Grid item xs={12} sm={6} md={10}>
          <TextOption>{getDisplayValue(configData?.decision)}</TextOption>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <TextOption>Ghi chú:</TextOption>
        </Grid>
        <Grid item xs={12} sm={6} md={10}>
          <TextOption>{getDisplayValue(configData?.note)}</TextOption>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <TextOption>Tổng số hộ chiếu:</TextOption>
        </Grid>
        <Grid item xs={12} sm={6} md={10}>
          <TextOption>{getDisplayValue(configData?.listOfOrganizations?.length)}</TextOption>
        </Grid>
        {actionsKeyType === "transferProcessing" && (
          <>
            <Grid item xs={12} sm={6} md={2}>
              <RequiredLabel>Người xử lý:</RequiredLabel>
            </Grid>
            <Grid item xs={12} sm={6} md={10}>
              <Controller
                name="handleUserId"
                control={control}
                render={({ field }) => (
                  <AsyncAutoComplete
                    fullWidth
                    placeholder="Tìm kiếm người xử lý..."
                    url={`${API_PASSPORT_REQUEST}/flow-users?roleCode=BO_PHAN_CHUYEN_TRACH`}
                    queryParam="name"
                    optionLabel="name"
                    optionValue="id"
                    value={field.value}
                    onChange={field.onChange}
                    error={!!errors.handleUserId}
                    helperText={errors.handleUserId?.message}
                    size="small"
                    required={actionsKeyType === "transferProcessing"}
                    unsetFontWeight
                  />
                )}
              />
            </Grid>
          </>
        )}
        <Grid item xs={12} sm={6} md={2}>
          {rejectTypes.includes(actionsKeyType) ? (
            <RequiredLabel>Ý kiến từ chối:</RequiredLabel>
          ) : (
            <TextOption>Ý kiến:</TextOption>
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={10}>
          <Controller
            name="approvalReason"
            control={control}
            render={({ field }) => (
              <InputComponents
                {...field}
                error={!!errors.approvalReason}
                helperText={errors.approvalReason?.message}
                multiline
                rows={3}
                placeholder="Nhập ý kiến..."
                required={rejectTypes.includes(actionsKeyType)}
              />
            )}
          />
        </Grid>
      </Grid>
    );
  }, [configData, actionsKeyType, control, errors]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      onSave={handleSubmit(handleSave)}
      titleButton={titleButton}
      title={title}
      disableSave={false}
      size={isOrganizationalRequest ? "lg" : size}
      cancelButtonText="Hủy"
      isLoading={isLoading}
    >
      {isOrganizationalRequest ? renderOrganizationalForm : renderUserForm}
      {isLoading && (
        <StyledLoadingPopupSignDigital>
          <CircularProgress />
        </StyledLoadingPopupSignDigital>
      )}
    </Dialog>
  );
};

RequestApprovalDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  requestId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onActionSuccess: PropTypes.func,
  dataRequest: PropTypes.object,
  size: PropTypes.string,
  actionsKeyType: PropTypes.string,
  isOrganizationalRequest: PropTypes.bool,
};

export default withSharedComponents(RequestApprovalDialog);
