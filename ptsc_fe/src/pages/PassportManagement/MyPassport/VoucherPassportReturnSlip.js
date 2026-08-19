import React, { useState, useMemo, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import withSharedComponents from "@components/WrapperComponent";
import CustomTableDocument from "@components/CustomTable/CustomTableDocument";
import { useDispatch, useSelector } from "react-redux";
import { EditableCellInput } from "@styles/CustomTableDocument.styles";
import { StyledLoadingPopupSignDigital } from "@styles/UploadFile/UploadFile.style";
import { CircularProgress } from "@mui/material";
import { StyledHeaderSectionContent } from "@styles/PassportManagement.styles";
import { StyledBoxContainerContent } from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import {
	getDataListPassportInReturnSlip,
	signVoucherPassportReturnSlip,
} from "@redux/slices/PassportManagement/PassportManagementSlice";
import { useToast } from "@components/common/ToastProvider";
import { useForm } from "react-hook-form";
import PassportVouchersDialog from "@pages/PassportManagement/RequestListPage/components/PassportVouchersDialog";

const PASSPORT_TYPE_MAP = {
	DIPLOMATIC: "Ngoại giao",
	OFFICIAL: "Công vụ",
	SERVICE: "Công vụ",
	ORDINARY: "Phổ thông",
	NORMAL: "Phổ thông",
};

const VoucherPassportReturnSlip = (props) => {
	const {
		open,
		onClose,
		sharedComponents,
		title,
		id,
		// setReloadData,
		data,
	} = props;
	const { CustomSwipper, ButtonOutline } = sharedComponents;
	const dispatch = useDispatch();
	const toast = useToast();
	const { dataUser } = useSelector((state) => state.auth);
	const { dataListPassportInReturnSlip, dataDetailPassportsReturnSlip } = useSelector(
		(state) => state.passportManagement
	);

	const {reset: resetForm } = useForm({
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
				await dispatch(getDataListPassportInReturnSlip(id)).unwrap();
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
		let sourceData = [];
		if (Array.isArray(dataListPassportInReturnSlip)) {
			sourceData = dataListPassportInReturnSlip;
		} else if (dataListPassportInReturnSlip && Array.isArray(dataListPassportInReturnSlip.items)) {
			sourceData = dataListPassportInReturnSlip.items;
		} else if (data?.listOfOrganizations) {
			sourceData = data.listOfOrganizations;
		} else if (Array.isArray(data)) {
			sourceData = data;
		}

		if (!sourceData) return [];

		return sourceData.map((row, idx) => ({
			...row,
			note: notes[idx] !== undefined ? notes[idx] : row.note || "",
		}));
	}, [data, dataListPassportInReturnSlip, notes]);

	const totals = useMemo(() => {
		const sourceData = dataWithNotes || [];
		
		let diplomatic = 0;
		let official = 0;
		let normal = 0;

		const hasTotalsInObject = 
			dataListPassportInReturnSlip && 
			!Array.isArray(dataListPassportInReturnSlip) && 
			(dataListPassportInReturnSlip.totalDiplomaticPassports !== undefined ||
			 dataListPassportInReturnSlip.totalServicePassports !== undefined ||
			 dataListPassportInReturnSlip.totalOrdinaryPassports !== undefined);

		if (hasTotalsInObject) {
			diplomatic = dataListPassportInReturnSlip.totalDiplomaticPassports || 0;
			official = dataListPassportInReturnSlip.totalServicePassports || 0;
			normal = dataListPassportInReturnSlip.totalOrdinaryPassports || 0;
		} else {
			sourceData.forEach((row) => {
				const type = typeof row?.passportType === "object"
					? row?.passportType?.code
					: row?.passportType;
				
				if (type === "DIPLOMATIC") {
					diplomatic++;
				} else if (type === "OFFICIAL" || type === "SERVICE") {
					official++;
				} else if (type === "ORDINARY" || type === "NORMAL") {
					normal++;
				}
			});
		}

		return {
			all: sourceData.length,
			diplomatic,
			official,
			normal,
		};
	}, [dataListPassportInReturnSlip, dataWithNotes]);


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
					const type = typeof row?.passportType === "object"
						? row?.passportType?.title || row?.passportType?.name || row?.passportType?.code
						: row?.passportType;
					return PASSPORT_TYPE_MAP[type] || type || "";
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

	const receiverId = useMemo(() => {
		return dataDetailPassportsReturnSlip?.eofficeAccountInfo?.id ||
			(typeof dataDetailPassportsReturnSlip?.eofficeAccount === "object"
				? dataDetailPassportsReturnSlip?.eofficeAccount?.id
				: dataDetailPassportsReturnSlip?.eofficeAccount) ||
			"";
	}, [dataDetailPassportsReturnSlip]);

	const dialogData = useMemo(() => {
		const performerName =
			(!Array.isArray(dataListPassportInReturnSlip) && dataListPassportInReturnSlip?.performerName) ||
			dataDetailPassportsReturnSlip?.fullName ||
			dataDetailPassportsReturnSlip?.eofficeAccountInfo?.nameVn ||
			".....";

		return {
			performerName,
		};
	}, [dataListPassportInReturnSlip, dataDetailPassportsReturnSlip]);

	const handleConfirmSign = async () => {
		try {
			setIsLoading(true);
			const itemNotes = dataWithNotes.reduce((acc, item) => {
				acc[item.id] = item.note;
				return acc;
			}, {});

			const body = {
				unitName: dataDetailPassportsReturnSlip?.unitName || "",
				departmentName: dataDetailPassportsReturnSlip?.departmentName || "",
				performerName: dataUser?.name || "",
				receiverId,
				receiverName:
					dataDetailPassportsReturnSlip?.fullName ||
					dataDetailPassportsReturnSlip?.eofficeAccountInfo?.nameVn ||
					"",
				selectedItemIds: dataWithNotes.map((item) => item.id || item.passportId),
				itemNotes,
			};

			await dispatch(signVoucherPassportReturnSlip({ id: id, body })).unwrap();
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
			logger.log("Lỗi khi ký:", error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<CustomSwipper
			title={title || "Biên bản hoàn trả hộ chiếu"}
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
						total={totals}
						disableCheckbox
						titleDoc={"Biên bản hoàn trả hộ chiếu"}
						documentNumber={`.../TB-TCT/${new Date().getFullYear()}`}
						receiver={{
							name: dataDetailPassportsReturnSlip?.voucher?.receiverSignature || "Ký ở đây",
							date: dataDetailPassportsReturnSlip?.voucher?.receiverSignedAt
								? new Date(dataDetailPassportsReturnSlip.voucher.receiverSignedAt).toLocaleDateString("vi-VN")
								: "",
						}}
						sender={{
							name: dataDetailPassportsReturnSlip?.voucher?.performerName || "Ký ở đây",
							date: dataDetailPassportsReturnSlip?.voucher?.performerSignedAt
								? new Date(dataDetailPassportsReturnSlip.voucher.performerSignedAt).toLocaleDateString("vi-VN")
								: "",
						}}
					/>
				</StyledBoxContainerContent>

				<PassportVouchersDialog
					open={openConfirmSign}
					onClose={handleCloseConfirmSignDialog}
					onSave={handleConfirmSign}
					titleButton={"Xác nhận ký"}
					title={"Xác nhận ký biên bản hoàn trả hộ chiếu"}
					disableSave={false}
					size="md"
					cancelButtonText="Hủy"
					isLoading={isLoading}
					data={dialogData}
					typeDialog="createReturn"
				/>
			</>
		</CustomSwipper>
	);
};

VoucherPassportReturnSlip.propTypes = {
	open: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	title: PropTypes.string,
	id: PropTypes.string.isRequired,
	requestId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	onSuccess: PropTypes.func,
	setReloadData: PropTypes.func,
	data: PropTypes.object,
};

export default withSharedComponents(VoucherPassportReturnSlip);
