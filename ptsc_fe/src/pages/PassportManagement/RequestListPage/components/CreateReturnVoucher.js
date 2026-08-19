import React, { useState, useMemo, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import withSharedComponents from "@components/WrapperComponent";
import CustomTableDocument from "@components/CustomTable/CustomTableDocument";
// eslint-disable-next-line no-restricted-imports
// import { columns } from "../constantsRequestListPage";
import { useDispatch, useSelector } from "react-redux";
import { EditableCellInput } from "@styles/CustomTableDocument.styles";
import { StyledLoadingPopupSignDigital } from "@styles/UploadFile/UploadFile.style";
import { Box, CircularProgress } from "@mui/material";
import { StyledHeaderSectionContent } from "@styles/PassportManagement.styles";
import { StyledBoxContainerContent } from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import {
  getDetailHandoverMinutes,
  postPassportVouchers,
} from "@redux/slices/PassportManagement/PassportManagementSlice";
import { useToast } from "@components/common/ToastProvider";
import PassportVouchersDialog from "./PassportVouchersDialog";
import { Controller, useForm } from "react-hook-form";

const CreateReturnVoucher = (props) => {
  const {
    open,
    onClose,
    sharedComponents,
    title,
    id,
    requestId,
    // setReloadData,
    data,
  } = props;
  const { CustomSwipper, ButtonOutline, InputComponents } = sharedComponents;
  const dispatch = useDispatch();
  const toast = useToast();
  const { dataUser } = useSelector((state) => state.auth);
  const { dataDetailHandoverMinutes } = useSelector(
    (state) => state.passportManagement
  );
  const [selectedItemIds, setSelectedItemIds] = useState([]);

  const {
    control,
    // watch,
    formState: { errors },
    handleSubmit,
    reset: resetForm,
  } = useForm({
    defaultValues: {
      partialReturnReason: "",
    },
    mode: "onChange",
  });
  // const partialReturnReasonValue = watch("partialReturnReason");
  const [isLoading, setIsLoading] = useState(false);
  const [openConfirmSign, setOpenConfirmSign] = useState(false);
  // logger.log("dataDetailHandoverMinutes", dataDetailHandoverMinutes);
  // logger.log("selectedItemIds", selectedItemIds);
  // logger.log("dataUser", dataUser);

  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        await dispatch(getDetailHandoverMinutes(id)).unwrap();
      } catch (error) {
        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          "Lấy chi tiết biên bản hoàn trả hộ chiếu thất bại!";
        logger.log("Lỗi khi lấy chi tiết biên bản hoàn trả hộ chiếu:", error);
        toast(errorMessage, "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dispatch, id, open, toast]);
  const [notes, setNotes] = useState({});

  const handleOpenConfirmSignDialog = () => {
    setOpenConfirmSign(true);
  };

  const handleCloseConfirmSignDialog = () => {
    setOpenConfirmSign(false);
  };

  const handleChangeNote = useCallback(
    (rowIndex) => (e) => {
      const value = e.target.value;
      setNotes((prev) => ({
        ...prev,
        [rowIndex]: value,
      }));
    },
    []
  );

  // Merge data với notes
  const dataWithNotes = useMemo(() => {
    // Ưu tiên dataDetailHandoverMinutes, nếu không có thì dùng data từ props
    const sourceData =
      dataDetailHandoverMinutes && dataDetailHandoverMinutes?.items?.length > 0
        ? dataDetailHandoverMinutes?.items
        : data?.listOfOrganizations || [];

    if (!sourceData) return [];

    return sourceData
      ?.filter((row) => row?.usageStatus === "IN_USE") // lọc dữ liệu
      .map((row, idx) => ({
        ...row,
        note: notes[idx] !== undefined ? notes[idx] : row.note || "",
      }));
  }, [data, dataDetailHandoverMinutes, notes]);

  // logger.log("dataWithNotes", dataWithNotes);

  const columns = useMemo(
    () => [
      // { name: "stt", title: "STT", width: "50px", alignCenter: true },
      {
        name: "fullName",
        title: "Họ và tên",
        width: "200px",
        alignCenter: true,
      },
      {
        name: "passportNumber",
        title: "Số hộ chiếu",
        width: "100px",
        alignCenter: true,
      },
      {
        name: "passportType",
        title: "Loại hộ chiếu",
        width: "150px",
        alignCenter: true,
        renderCell: (row) => {
          return typeof row?.passportType === "object"
            ? row?.passportType?.title
            : row?.passportType;
        },
      },
      {
        name: "expiryDate",
        title: "Giá trị sử dụng",
        width: "150px",
        alignCenter: true,
      },
      {
        name: "note",
        title: "Ghi chú",
        width: "200px",
        renderCell: (row, rowIndex) => (
          <EditableCellInput
            placeholder="Ghi chú:"
            value={row.note || ""}
            onChange={handleChangeNote(rowIndex)}
          />
        ),
      },
    ],
    [handleChangeNote]
  );

  const isValidateReasonReturn =
    selectedItemIds.length !== dataWithNotes.length;

  const handleConfirmSign = async (data) => {
    try {
      setIsLoading(true);
      const itemNotes = dataWithNotes.reduce((acc, item) => {
        acc[item.id] = item.note;
        return acc;
      }, {});
      if (isValidateReasonReturn && !data?.partialReturnReason?.trim()) {
        toast("Vui lòng nhập lý do trả thiếu!", "error");
        return;
      }

      const body = {
        voucherType: "RETURN",
        receiverId: dataDetailHandoverMinutes?.performerId, //Id người nhận
        receiverName: dataDetailHandoverMinutes?.performerName, //Tên người nhận
        fromName: dataUser?.name, //Tên người bàn giao
        requestId: requestId, //Id yêu cầu,
        itemNotes,
        selectedItemIds,
        partialReturnReason: data?.partialReturnReason,
      };
      await dispatch(postPassportVouchers(body)).unwrap();
      toast("Ký biên bản hoàn trả hộ chiếu thành công!", "success");
      handleCloseConfirmSignDialog();
      resetForm();
      onClose({ signed: true });
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Ký biên bản hoàn trả hộ chiếu thất bại!";
      toast(errorMessage, "error");
      logger.log("Lỗi khi ký biên bản hoàn trả hộ chiếu:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvalidSubmit = useCallback(
    (errors) => {
      if (errors.partialReturnReason && selectedItemIds.length > 0) {
        toast(
          errors.partialReturnReason.message ||
            "Vui lòng nhập lý do trả thiếu!",
          "error"
        );
      }
    },
    [selectedItemIds, toast]
  );

  const handleSelectedRow = useCallback((selectedRows) => {
    const nextIds = selectedRows.map((row) => row.id);

    setSelectedItemIds((prev) => {
      if (
        prev.length === nextIds.length &&
        prev.every((id, index) => id === nextIds[index])
      ) {
        return prev;
      }
      return nextIds;
    });
  }, []);

  return (
    <CustomSwipper
      title={title || "Xem chi tiết yêu cầu"}
      open={open}
      onClose={onClose}
      type="view"
      hideBackdrop
      isLoading={isLoading}
      moreActions={
        <>
          <ButtonOutline
            onClick={handleOpenConfirmSignDialog}
            variant="outlined"
          >
            Ký & lập biên bản
          </ButtonOutline>
        </>
      }
    >
      <>
        {isLoading && (
          <StyledLoadingPopupSignDigital>
            <CircularProgress />
          </StyledLoadingPopupSignDigital>
        )}
        <StyledBoxContainerContent styledMarginTop>
          <StyledHeaderSectionContent variant="h6" noWrap>
            Danh sách hoàn trả hộ chiếu
          </StyledHeaderSectionContent>
          <CustomTableDocument
            data={dataWithNotes}
            columns={columns}
            total={{
              all: dataWithNotes?.length,
              diplomatic: dataDetailHandoverMinutes?.totalDiplomaticPassports, //Ngoại giao
              official: dataDetailHandoverMinutes?.totalServicePassports, //Công vụ
              normal: dataDetailHandoverMinutes?.totalOrdinaryPassports, //Phổ thông
            }}
            onSelectionChange={handleSelectedRow}
            onlyTable
            selectAllOnLoad
          />
          <Box pt={2}>
            <Controller
              name="partialReturnReason"
              control={control}
              rules={{
                validate: (value) => {
                  if (isValidateReasonReturn && !value?.trim()) {
                    return "Vui lòng nhập lý do trả thiếu hộ chiếu!";
                  }
                  return true;
                },
              }}
              render={({ field }) => (
                <InputComponents
                  {...field}
                  multiline
                  label="Lý do trả thiếu"
                  rows={3}
                  placeholder="Nhập lý do trả thiếu..."
                  error={!!errors.partialReturnReason}
                  helperText={errors.partialReturnReason?.message || ""}
                />
              )}
            />
          </Box>
        </StyledBoxContainerContent>

        <PassportVouchersDialog
          open={openConfirmSign}
          onClose={handleCloseConfirmSignDialog}
          onSave={handleSubmit(handleConfirmSign, handleInvalidSubmit)}
          titleButton={"Xác nhận ký"}
          title={"Xác nhận ký biên bản hoàn trả hộ chiếu"}
          disableSave={false}
          size="md"
          cancelButtonText="Hủy"
          isLoading={isLoading}
          data={dataDetailHandoverMinutes}
          typeDialog="createReturn"
        />
      </>
    </CustomSwipper>
  );
};

CreateReturnVoucher.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  id: PropTypes.string.isRequired,
  requestId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onSuccess: PropTypes.func,
  setReloadData: PropTypes.func,
  data: PropTypes.object,
};

export default withSharedComponents(CreateReturnVoucher);
