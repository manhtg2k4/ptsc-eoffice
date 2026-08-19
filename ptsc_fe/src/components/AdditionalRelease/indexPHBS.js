import React, { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import {
	DialogActions,
	Grid,
	Box,
	Typography,
	IconButton,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { Close as CloseIcon } from "@mui/icons-material";
import {
	API_GET_LIST_UNIT,
	API_GET_LIST_USERS,
} from "@EnvironmentFile/constants/urlConfig";
// import { useToast } from "@components/common/ToastProvider";
import { useToast } from "@components/common/ToastProvider";
import withSharedComponents from "@components/WrapperComponent";
import withFormWrapper from "@components/common/FormWrapper";
import { useDispatch } from "react-redux";
import { savePHBS } from "@redux/slices/OutGoingDoc/OutGoingDocSlice";

const EMPTY_FORM_DATA = {
	unitReceiving: [],
	userReceiving: [],
	commentUser: [],
};
export const DialogActionsButton = styled(DialogActions)(({ theme }) => ({
	padding: "18px 20px",
	justifyContent: "flex-end",
	gap: theme.spacing(1),
}));
const DialogHeaderBar = styled(Box)(({ theme }) => ({
	position: "relative",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	minHeight: "56px",
	padding: theme.spacing(0, 6),
	backgroundColor: "#eef3f7",
}));

const DialogHeaderTitle = styled(Typography)(({ theme }) => ({
	fontSize: 20,
	lineHeight: "28px",
	fontWeight: 700,
	textTransform: "uppercase",
	color: theme.palette.primary.main,
	textAlign: "center",
}));

const DialogHeaderCloseButton = styled(IconButton)(({ theme }) => ({
	position: "absolute",
	right: theme.spacing(1),
	top: "50%",
	transform: "translateY(-50%)",
	color: "#98a2b3",
}));
const safeArray = (value) => {
	if (Array.isArray(value)) return value;
	if (typeof value === "string") {
		try {
			const parsed = JSON.parse(value);
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	}
	return [];
};

const getItemId = (item) => item?._id || item?.id || item?.userId || "";

const uniqueById = (items = []) => {
	const seen = new Set();

	return items.filter((item) => {
		const id = getItemId(item);
		if (!id || seen.has(id)) return false;
		seen.add(id);
		return true;
	});
};

const getNewItemsOnly = (items = [], originalItems = []) => {
	const originalIds = new Set(originalItems.map(getItemId).filter(Boolean));
	return uniqueById(items).filter((item) => !originalIds.has(getItemId(item)));
};

const normalizeUser = (item) => {
	if (!item) return null;

	if (typeof item === "string") {
		return { _id: item, id: item, name: item };
	}

	const receiver = item.receiver || item.user || item;
	const id =
		receiver?._id ||
		receiver?.id ||
		receiver?.userId ||
		item?._id ||
		item?.id ||
		item?.userId;
	const name =
		receiver?.name ||
		item?.name ||
		item?.fullName ||
		item?.userName ||
		"";

	if (!id && !name) return null;

	return {
		...receiver,
		...item,
		_id: id || receiver?._id,
		id: id || receiver?.id,
		name,
	};
};

const normalizeUnit = (item) => {
	if (!item) return null;

	if (typeof item === "string") {
		return { _id: item, id: item, name: item };
	}

	const id = item._id || item.id;
	if (!id) return null;

	return {
		...item,
		_id: id,
		id,
		name: item.name || item.title || item.label || "",
	};
};

const AdditionalReleasePHBS = ({
	open,
	onClose,
	dataDetail,
	setReloadData,
	onCloseAppBar,
	sharedComponents,
	textUnit
}) => {
	const {
		Dialog,
		AsyncAutoComplete: BaseAsyncAutoComplete,
	} = sharedComponents;
	const dispatch = useDispatch();
	const AsyncAutoComplete = useMemo(() => {
		const Wrapped = withFormWrapper(BaseAsyncAutoComplete, "asyncSelect");
		const Component = (props) => <Wrapped {...props} />;
		Component.displayName = "AsyncAutoComplete";
		return Component;
	}, [BaseAsyncAutoComplete]);


	const [formData, setFormData] = useState(EMPTY_FORM_DATA);
	const [originalData, setOriginalData] = useState(EMPTY_FORM_DATA);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const toast = useToast();
	const documentId =
		dataDetail?.document?.documentId ||
		dataDetail?.document?._id ||
		dataDetail?.document?.id ||
		dataDetail?.documentId ||
		dataDetail?._id ||
		dataDetail?.id;
	const isAuthority = dataDetail?.document?.isAuthority || dataDetail?.isAuthority;

	useEffect(() => {
		if (!open || !dataDetail) {
			setFormData(EMPTY_FORM_DATA);
			setOriginalData(EMPTY_FORM_DATA);
			return;
		}

		const doc = dataDetail?.document || dataDetail;

		const existingUnits = uniqueById(
			safeArray(doc.internalReceivingDept)
				.map(normalizeUnit)
				.filter(Boolean)
		);

		const rawKnowReceivers = safeArray(doc.knowReceivers);
		const rawProcessors = safeArray(doc.processor);
		const rawLegacyUsers = safeArray(doc.processors);
		const rawLegacyComments = safeArray(doc.commentUsers);

		const existingUsers = uniqueById(
			(rawKnowReceivers.length > 0 ? rawKnowReceivers : rawLegacyUsers)
				.map(normalizeUser)
				.filter(Boolean)
		);

		const existingComments = uniqueById(
			(rawProcessors.length > 0 ? rawProcessors : rawLegacyComments)
				.map(normalizeUser)
				.filter(Boolean)
		);

		const initialData = {
			unitReceiving: existingUnits,
			userReceiving: existingUsers,
			commentUser: existingComments,
		};

		setFormData(initialData);
		setOriginalData(initialData);
	}, [open, dataDetail]);

	const handleFieldChange = (field) => (newValue) => {
		if (!Object.prototype.hasOwnProperty.call(originalData, field)) return;

		const incomingValues = Array.isArray(newValue)
			? newValue
			: (newValue ? [newValue] : []);

		const normalizedIncoming = uniqueById(incomingValues.filter(Boolean));
		const originalIds = new Set(originalData[field].map(getItemId).filter(Boolean));
		const newItemsOnly = normalizedIncoming.filter(
			(item) => !originalIds.has(getItemId(item))
		);

		setFormData((prev) => ({
			...prev,
			[field]: uniqueById([...originalData[field], ...newItemsOnly]),
		}));
	};

	const hasChanges = useMemo(() => {
		const newUnits = getNewItemsOnly(
			formData.unitReceiving,
			originalData.unitReceiving
		);
		const newUsers = getNewItemsOnly(
			formData.userReceiving,
			originalData.userReceiving
		);
		const newCommentUsers = getNewItemsOnly(
			formData.commentUser,
			originalData.commentUser
		);

		return newUnits.length > 0 || newUsers.length > 0 || newCommentUsers.length > 0;
	}, [formData, originalData]);

	const handleSave = async () => {
		if (!documentId) {
			toast("Không xác định được văn bản cần phát hành bổ sung", "error");
			return;
		}

		if (isSubmitting) return;

		try {
			setIsSubmitting(true);

			const newUnits = getNewItemsOnly(
				formData.unitReceiving,
				originalData.unitReceiving
			);
			const newUsers = getNewItemsOnly(
				formData.userReceiving,
				originalData.userReceiving
			);
			const newCommentUsers = getNewItemsOnly(
				formData.commentUser,
				originalData.commentUser
			);

			const body = {
				documentId,
				receiveUnits: newUnits.map((u) => u._id || u.id),
				knowReceivers: newUsers.map((u) => u._id || u.id),
				processors: newCommentUsers.map((u) => u._id || u.id),
			};

			const params = isAuthority ? { isAuthority } : undefined;
			await dispatch(savePHBS({ body, params })).unwrap();
			toast("Gửi bổ sung thành công", "success");
			onClose();
			if (onCloseAppBar) onCloseAppBar();
			if (setReloadData) setReloadData(new Date().getTime());
		} catch (error) {
			const messageErr = error?.response?.data?.message || error?.message || "Có lỗi xảy ra";
			toast(messageErr, "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog
			title="CHỌN ĐƠN VỊ, CÁ NHÂN NHẬN BỔ SUNG VĂN BẢN"
			open={open}
			onClose={onClose}
			onSave={handleSave}
			type="add"
			isLoading={isSubmitting}
			size="md"
			cancelButtonText="Hủy"
			titleButton="Đồng ý"
			disableSave={isSubmitting}
			disabled={!hasChanges}
			hiddenFooter
			customTitleContent={(
				<DialogHeaderBar>
					<DialogHeaderTitle>CHỌN ĐƠN VỊ, CÁ NHÂN NHẬN BỔ SUNG VĂN BẢN</DialogHeaderTitle>
					<DialogHeaderCloseButton onClick={onClose} aria-label="Đóng">
						<CloseIcon />
					</DialogHeaderCloseButton>
				</DialogHeaderBar>
			)}
		>

			<Grid container spacing={4}>
				<Grid item xs={12}>
					<AsyncAutoComplete
						label={textUnit || "Đơn vị soạn thảo"}
						placeholder="Tìm kiếm"
						isMulti
						value={formData.unitReceiving.map((item) => ({
							...item,
							isFixed: originalData.unitReceiving.some(
								(o) => getItemId(o) === getItemId(item)
							),
						}))}
						onChange={handleFieldChange("unitReceiving")}
						ChipProps={(option) => ({
							disabled: originalData.unitReceiving.some(
								(o) => getItemId(o) === getItemId(option)
							),
						})}
						url={API_GET_LIST_UNIT}
						queryParam="name"
						optionLabel="name"
						optionValue="_id"
						returnObject
						fullWidth
					/>
				</Grid>

				<Grid item xs={12}>
					<AsyncAutoComplete
						label="Cá nhân nhận văn bản"
						placeholder="Tìm kiếm"
						isMulti
						value={formData.userReceiving.map((item) => ({
							...item,
							isFixed: originalData.userReceiving.some(
								(o) => getItemId(o) === getItemId(item)
							),
						}))}
						onChange={handleFieldChange("userReceiving")}
						ChipProps={(option) => ({
							disabled: originalData.userReceiving.some(
								(o) => getItemId(o) === getItemId(option)
							),
						})}
						// url={API_GET_LIST_USERS}
						url={`${API_GET_LIST_USERS}/principals`}
						queryParam="name"
						optionLabel="name"
						optionValue="_id"
						returnObject
						fullWidth
					/>
				</Grid>

				<Grid item xs={12}>
					<AsyncAutoComplete
						label="Xin ý kiến"
						placeholder="Tìm kiếm"
						isMulti
						value={formData.commentUser.map((item) => ({
							...item,
							isFixed: originalData.commentUser.some(
								(o) => getItemId(o) === getItemId(item)
							),
						}))}
						onChange={handleFieldChange("commentUser")}
						ChipProps={(option) => ({
							disabled: originalData.commentUser.some(
								(o) => getItemId(o) === getItemId(option)
							),
						})}
						url={API_GET_LIST_USERS}
						queryParam="name"
						optionLabel="name"
						optionValue="_id"
						returnObject
						fullWidth
					/>
				</Grid>
			</Grid>
		</Dialog>
	);
};

AdditionalReleasePHBS.propTypes = {
	open: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	dataDetail: PropTypes.object,
	setReloadData: PropTypes.func,
	onCloseAppBar: PropTypes.func,
};

export default withSharedComponents(AdditionalReleasePHBS);
