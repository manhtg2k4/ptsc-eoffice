import React, { useCallback, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Box, Grid } from "@mui/material";
import { CustomDialog } from "@components/CustomDialog";
import { Controller, useForm } from "react-hook-form";
import withSharedComponents from "@components/WrapperComponent";
import { API_GET_USER_IN_FLOW } from "@EnvironmentFile/constants/urlConfig";
import CustomTable from "@components/CustomTable/CustomTable";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  columnsExtendProcessingTime,
  defaultFormValues,
  extendProcessingTimeSchema,
} from "./constantsInDoc";
import dayjs from "dayjs";
import { useToast } from "@components/common/ToastProvider";
import { useDispatch } from "react-redux";
import { updateProcessingTime } from "@redux/slices/IncomingDocument/ExtendProcessingTimeSlice";

const ExtendProcessingTimePopup = ({
  open,
  onClose,
  // onSave,
  isLoading,
  sharedComponents,
  ...props
}) => {
  const { documentId } = props;
  const { AsyncAutoCompleted, DateTimePicker } = sharedComponents;
  const [selectedUsers, setSelectedUsers] = useState([]);
  const dispatch = useDispatch();
  const toast = useToast();
  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm({
    resolver: yupResolver(extendProcessingTimeSchema),
    defaultValues: defaultFormValues,
  });

  const formatDateTime = (value) => {
    if (!value) return "-";
    return dayjs(value).format("DD/MM/YYYY HH:mm");
  };

  const selectedNewDeadline = watch("newDeadline");
  const formattedDeadline = selectedNewDeadline
    ? dayjs(selectedNewDeadline).format("YYYY-MM-DDTHH:mm:ss")
    : null;

  const handleSave = useCallback(
    async (data) => {
      try {
        const payload = {
          items: (data.auditId || []).map((auditId) => ({
            auditId: Number(auditId),
            newDeadline: data.newDeadline
              ? dayjs(data.newDeadline).toISOString()
              : null,
          })),
        };
        await dispatch(
          updateProcessingTime({ docId: documentId, payload })
        ).unwrap();
        toast("Gia hạn thời gian xử lý thành công!", "success");
        onClose();
        reset(defaultFormValues);
      } catch (error) {
        const errorMessage =
          error?.data?.message || error?.errors || error?.message || "Lỗi không xác định";
        logger.log("Lỗi khi gia hạn thời gian xử lý!", error);
        toast(`Lỗi khi gia hạn thời gian xử lý: ${errorMessage}!`, "error");
      }
    },
    [dispatch, toast, reset, onClose, documentId]
  );

  const handleSelectedUser = (selectedOptions) => {
    setSelectedUsers(selectedOptions);
  };

  const tableData = useMemo(() => {
    if (!Array.isArray(selectedUsers)) return [];

    return selectedUsers.map((user) => ({
      auditId: user.auditId,
      name: user.name,
      currentDeadline: formatDateTime(user.deadline) || "-",
      newDeadline: formattedDeadline ? formatDateTime(formattedDeadline) : "-",
    }));
  }, [selectedUsers, formattedDeadline]);

  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      onSave={handleSubmit(handleSave)}
      title="ĐẶT HẠN XỬ LÝ"
      isLoading={isLoading}
      titleButton="Gia hạn"
      size="md"
    >
      <Box component="form" onSubmit={handleSubmit(handleSave)}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Controller
              name="auditId"
              control={control}
              render={({ field }) => (
                <AsyncAutoCompleted
                  label="Gia hạn cho"
                  placeholder="Tìm kiếm"
                  {...field}
                  url={`${API_GET_USER_IN_FLOW}?documentId=${documentId || ""}`}
                  queryParam="name"
                  optionLabel="name"
                  optionValue="auditId"
                  selectedOptions={handleSelectedUser}
                  isMulti
                  required
                  error={!!errors.auditId}
                  helperText={errors.auditId?.message}
                />
              )}
            />
          </Grid>

          <Grid item xs={12}>
            <Controller
              name="newDeadline"
              control={control}
              render={({ field }) => (
                <DateTimePicker
                  label="Ngày gia hạn"
                  value={field.value ?? null}
                  onChange={field.onChange}
                  showTime
                  onBlur={field.onBlur}
                  futureOnly
                  error={!!errors.newDeadline}
                  helperText={errors.newDeadline?.message}
                  required
                />
              )}
            />
          </Grid>
        </Grid>

        <Grid container>
          <Grid item xs={12}>
            <div style={{ marginTop: "16px" }}>
              <CustomTable
                data={tableData}
                columns={columnsExtendProcessingTime}
                onlyTable
                disableSelectAll
                disableCheckbox
                disableAct
                disablePagination
                disableSynchronize
                autoHeight
								encodeHtml
              />
            </div>
          </Grid>
        </Grid>
      </Box>
    </CustomDialog>
  );
};

ExtendProcessingTimePopup.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
  onSave: PropTypes.func,
};

ExtendProcessingTimePopup.defaultProps = {
  onClose: () => {},
  onSave: () => {},
  staffData: [],
};

export default withSharedComponents(ExtendProcessingTimePopup);
