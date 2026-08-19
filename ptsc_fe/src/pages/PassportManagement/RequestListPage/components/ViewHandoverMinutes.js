import React, { useState, useEffect, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import withSharedComponents from "@components/WrapperComponent";
import CustomTableDocument from "@components/CustomTable/CustomTableDocument";
// eslint-disable-next-line no-restricted-imports
// import { columns } from "../constantsRequestListPage";
import { useDispatch, useSelector } from "react-redux";
import { StyledLoadingPopupSignDigital } from "@styles/UploadFile/UploadFile.style";
import { CircularProgress, Grid } from "@mui/material";
import { StyledBoxContainerContent } from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import {
  getDetailHandoverMinutes,
  receiveMinutes,
	rejectMinutes,
	ownerSignPassportReturnSlip,
} from "@redux/slices/PassportManagement/PassportManagementSlice";
import { useToast } from "@components/common/ToastProvider";
// eslint-disable-next-line no-restricted-imports
import {
  formatDatePassportModule,
  formatDateVNPassportModule,
	refuseValidationSchema,
} from "../constantsRequestListPage";
import PassportVouchersDialog from "./PassportVouchersDialog";
import { CancelButton } from "@styles/CustomDialog.styles";
import { Controller, useForm } from "react-hook-form";
import { SpanRequired, TextOption } from "@styles/PassportManagement.styles";
import { yupResolver } from "@hookform/resolvers/yup";

const RequiredLabel = ({ children }) => (
	<TextOption>
		{children}
		<SpanRequired>*</SpanRequired>
	</TextOption>
);

RequiredLabel.propTypes = {
	children: PropTypes.node.isRequired,
};


const ViewHandoverMinutes = (props) => {
  const {
    open,
    onClose,
    sharedComponents,
    id,
    onSuccess,
    // setReloadData,
  } = props;
  const { CustomSwipper, ButtonOutline, Dialog, InputComponents } =
    sharedComponents;
  const dispatch = useDispatch();
  const toast = useToast();
  // const { dataUser } = useSelector((state) => state.auth);
  const { dataDetailHandoverMinutes } = useSelector(
    (state) => state.passportManagement
  );
  // logger.log("dataDetailHandoverMinutes", dataDetailHandoverMinutes);
  // logger.log("data", data);
  // logger.log("dataUser", dataUser);
  const [isLoading, setIsLoading] = useState(false);
  const [openConfirmSign, setOpenConfirmSign] = useState(false);
  const [openRefuseDialog, setOpenRefuseDialog] = useState(false);
  const {
    control,
    // watch,
		formState: { errors },
		handleSubmit,
    reset: resetForm,
	} = useForm({
		resolver: yupResolver(refuseValidationSchema),
    defaultValues: {
      rejectReason: "",
    },
    mode: "onChange",
  });

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
          "Lấy chi tiết biên bản bàn giao thất bại!";
        logger.log("Lỗi khi lấy chi tiết biên bản bàn giao:", error);
        toast(errorMessage, "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dispatch, id, open, toast]);

  const handleOpenConfirmSignDialog = () => {
    setOpenConfirmSign(true);
  };

  const handleCloseConfirmSignDialog = () => {
    setOpenConfirmSign(false);
  };

  const handleOpenRefuseDialog = () => {
    setOpenRefuseDialog(true);
  };

  const handleCloseRefuseDialog = useCallback(() => {
		setOpenRefuseDialog(false);
		resetForm();
  }, [resetForm]);

  // logger.log("dataWithNotes", dataWithNotes);

  const columns = [
    // { name: "stt", title: "STT", width: "50px", alignCenter: true },
    { name: "fullName", title: "Họ và tên", width: "200px", alignCenter: true },
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
      alignCenter: true,
    },
  ];

	const handleConfirmSign = async () => {
		try {
			setIsLoading(true);

			if (showOwnerSignButton) {
				const receiverId =
					dataDetailHandoverMinutes?.receiverId ||
					dataDetailHandoverMinutes?.eofficeAccount ||
					"";

				const receiverName =
					dataDetailHandoverMinutes?.receiverName ||
					"";

				const itemNotes = {};
				const selectedItemIds = [];
				dataDetailHandoverMinutes?.items?.forEach((item) => {
					const itemId = item.id || item.passportId;
					if (itemId) {
						selectedItemIds.push(itemId);
						itemNotes[itemId] = item.note || "";
					}
				});

				const body = {
					unitName: dataDetailHandoverMinutes?.unitName || "",
					departmentName: dataDetailHandoverMinutes?.departmentName || "",
					performerName: dataDetailHandoverMinutes?.performerName || "",
					receiverId,
					receiverName,
					selectedItemIds,
					itemNotes,
				};

				const requestId = dataDetailHandoverMinutes?.requestId;
				await dispatch(ownerSignPassportReturnSlip({ id: requestId, body })).unwrap();
				toast("Ký nhận hoàn trả hộ chiếu thành công!", "success");
			} else {
				await dispatch(receiveMinutes(id)).unwrap();
				toast("Ký nhận biên bản bàn giao thành công!", "success");
			}

			if (onSuccess) {
				await Promise.resolve(onSuccess());
			}
			handleCloseConfirmSignDialog();
			onClose({ signed: true });
		} catch (error) {
			const errorMessage =
				error.response?.data?.message ||
				error.message ||
				(showOwnerSignButton
					? "Ký nhận hoàn trả hộ chiếu thất bại!"
					: "Ký nhận biên bản bàn giao thất bại!");
			toast(errorMessage, "error");
			logger.log("Lỗi khi ký:", error);
		} finally {
			setIsLoading(false);
		}
	};
	
	const handleSaveRefuse = useCallback(async(data) => {
		logger.log("data", data);
		try {
			setIsLoading(true);
			await dispatch(rejectMinutes({ id, body: data })).unwrap();
			toast("Từ chối biên bản bàn giao thành công!", "success");
			if (onSuccess) {
				await Promise.resolve(onSuccess());
			}
			handleCloseRefuseDialog();
			onClose({ refused: true });
		} catch (error) {
			const errorMessage =
				error.response?.data?.message ||
				error.message ||
				"Từ chối biên bản bàn giao thất bại!";
			toast(errorMessage, "error");
			logger.log("Lỗi khi từ chối biên bản bàn giao:", error);
		} finally {
			setIsLoading(false);
		}
	}, [dispatch, id, onSuccess, onClose, handleCloseRefuseDialog, toast]);

	const showOwnerSignButton = useMemo(() => {
		return dataDetailHandoverMinutes?.availableActions?.find((action) => action.actionGroup === "KY_NHAN");
	}, [dataDetailHandoverMinutes]);

  const titleTable = dataDetailHandoverMinutes?.flags?.canSignPassport
    ? "PHIẾU TIẾP NHẬN, HOÀN TRẢ HỘ CHIẾU"
    : "PHIẾU TIẾP NHẬN, BÀN GIAO HỘ CHIẾU";

  const titlePopupConfirmSign = dataDetailHandoverMinutes?.flags
    ?.canSignPassport
    ? "Xác nhận ký hoàn trả"
    : "Xác nhận ký bàn giao";

	const titleViewHandoverMinutes = dataDetailHandoverMinutes?.voucherType === "RETURN"
		? "Chi tiết biên bản hoàn trả"
		: "Chi tiết biên bản bàn giao";

	return (
		<CustomSwipper
			title={titleViewHandoverMinutes || "Xem chi tiết biên bản"}
			open={open}
			onClose={onClose}
			type="view"
			hideBackdrop
			isLoading={isLoading}
			moreActions={
				<>
					{dataDetailHandoverMinutes?.flags?.canSignVoucher && (
						<ButtonOutline
							onClick={handleOpenConfirmSignDialog}
							variant="outlined"
						>
							Ký xác nhận bb bàn giao
						</ButtonOutline>
					)}
					{dataDetailHandoverMinutes?.flags?.canSignPassport && (
						<ButtonOutline
							onClick={handleOpenConfirmSignDialog}
							variant="outlined"
						>
							Ký xác nhận bb hoàn trả
						</ButtonOutline>
					)}
					{showOwnerSignButton && (
						<ButtonOutline
							onClick={handleOpenConfirmSignDialog}
							variant="outlined"
						>
							Ký nhận
						</ButtonOutline>
					)}
					{dataDetailHandoverMinutes?.flags?.canRefusePassportVoucher && (
						<CancelButton onClick={handleOpenRefuseDialog} variant="outlined">
							Từ chối
						</CancelButton>
					)}
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
					<CustomTableDocument
						titleDoc={titleTable}
						data={dataDetailHandoverMinutes?.items || []}
						columns={columns}
						total={{
							all: dataDetailHandoverMinutes?.items?.length,
							diplomatic: dataDetailHandoverMinutes?.totalDiplomaticPassports, //Ngoại giao
							official: dataDetailHandoverMinutes?.totalOfficialPassports, //Công vụ
							normal: dataDetailHandoverMinutes?.totalOrdinaryPassports, //Phổ thông
						}}
						dateText={formatDateVNPassportModule(
							dataDetailHandoverMinutes?.createdAt
						)}
						receiver={{
							name: dataDetailHandoverMinutes?.receiverSignature || "Ký ở đây",
							date: dataDetailHandoverMinutes?.receiverSignedAt
								? formatDatePassportModule(
									dataDetailHandoverMinutes?.receiverSignedAt
								)
								: null,
						}}
						sender={{
							name: dataDetailHandoverMinutes?.performerName,
							date: dataDetailHandoverMinutes?.performerSignedAt
								? formatDatePassportModule(
									dataDetailHandoverMinutes?.performerSignedAt
								)
								: null,
						}}
						disableCheckbox
					/>
				</StyledBoxContainerContent>

        <PassportVouchersDialog
          open={openConfirmSign}
          onClose={handleCloseConfirmSignDialog}
          onSave={handleConfirmSign}
          titleButton={"Xác nhận ký"}
          title={titlePopupConfirmSign}
          disableSave={false}
          size="md"
          cancelButtonText="Hủy"
          isLoading={isLoading}
          data={dataDetailHandoverMinutes}
          typeDialog="receiveMinutes"
        />

        <Dialog
          open={openRefuseDialog}
					onClose={handleCloseRefuseDialog}
					onSave={handleSubmit(handleSaveRefuse)}
          title={"Từ chối ký biên bản hoàn trả"}
          size="sm"
          cancelButtonText="Hủy"
          isLoading={isLoading}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <RequiredLabel>Ý kiến từ chối:</RequiredLabel>
            </Grid>
            <Grid item xs={12} sm={6} md={9}>
              <Controller
                name="rejectReason"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    {...field}
                    error={!!errors.rejectReason}
                    helperText={errors.rejectReason?.message}
                    multiline
                    rows={3}
                    placeholder="Nhập ý kiến..."
                    required
                  />
                )}
              />
            </Grid>
          </Grid>
          {isLoading && (
            <StyledLoadingPopupSignDigital>
              <CircularProgress />
            </StyledLoadingPopupSignDigital>
          )}
        </Dialog>
      </>
    </CustomSwipper>
  );
};

ViewHandoverMinutes.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  id: PropTypes.string.isRequired,
  onSuccess: PropTypes.func,
  setReloadData: PropTypes.func,
  data: PropTypes.object,
};

export default withSharedComponents(ViewHandoverMinutes);
