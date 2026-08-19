import React, { useRef, useCallback, useEffect, useState } from "react";
import { Box, Grid, Typography } from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import PropTypes from "prop-types";
import { useToast } from "@components/common/ToastProvider";
import {
	FormContainer,
	FullWidthGridItem,
	HalfWidthGridItem,
} from "@styles/FormDialog.styles";
import DynamicValuesTable from "@pages/CategoryManagement/components/DynamicValuesTable";
import { StyleBoxTitle } from "@pages/CategoryManagement/components/DynamicValuesTable.styles";
import { useDispatch } from "react-redux";
import {
	addCrmSourcesDraft,
	deleteCrmSourceByIds,
	deleteCrmSourceChildData,
	patchCrmSources,
} from "@redux/slices/DocCategoryMgmt/DocCategoryMgmtSlice";
import { yupResolver } from "@hookform/resolvers/yup";
import { defaultDocCategoryMgmtValue, docCategoryMgmtSchema } from "./constantsDocCategoryMgmt";
import withSharedComponents from "@components/WrapperComponent";


const AddDocCategoryMgmt = ({
	open,
	onClose,
	onSuccess,
	sharedComponents,
	title,
}) => {

	const {
		CustomSwipper,
		InputComponents,
		ButtonOutline,
	} = sharedComponents;
	const dispatch = useDispatch();
	const [isLoading, setIsLoading] = useState(false);
	const draftIdRef = useRef(null);
	const isSavedRef = useRef(false);

	const {
		control,
		handleSubmit,
		formState: { errors },
		reset,
		getValues,
		trigger,
	} = useForm({
		resolver: yupResolver(docCategoryMgmtSchema),
		defaultValues: defaultDocCategoryMgmtValue,
		mode: "onChange",
	});

	const toast = useToast();
	const dynamicTableRef = useRef();

	useEffect(() => {
		if (!open) return;

		const createDraft = async () => {
			try {
				setIsLoading(true);
				isSavedRef.current = false;
				draftIdRef.current = null;
				const draftData = await dispatch(addCrmSourcesDraft()).unwrap();
				draftIdRef.current = draftData?.id || draftData?._id || null;
				reset({ ...defaultDocCategoryMgmtValue, ...draftData });
			} catch (error) {
				const errorMessage =
					error?.response?.data?.message ||
					error?.data?.message ||
					error?.message ||
					"Lỗi khi tạo bản nháp!";
				toast(errorMessage, "error");
				onClose?.();
			} finally {
				setIsLoading(false);
			}
		};

		createDraft();
	}, [open, dispatch, toast, reset, onClose]);

	const handleSave = async () => {
		const [isFormValid] = await Promise.all([
			trigger(["code", "title"]),
			dynamicTableRef.current?.validate(),
		]);

		if (!isFormValid) {
			toast("Vui lòng điền đầy đủ thông tin bắt buộc.", "error");
			return;
		}

		const data = getValues();
		const payload = {
			code: data?.code?.trim(),
			title: data?.title?.trim(),
			moduleCategory: ["documentModule"],
			status: 1,
		};

		try {
			setIsLoading(true);
			await dispatch(patchCrmSources({
				id: draftIdRef.current,
				body: payload,
			})).unwrap();
			isSavedRef.current = true;
			toast("Thêm mới danh mục thành công!", "success");
			dynamicTableRef.current?.resetData();
			reset(defaultDocCategoryMgmtValue);
			onSuccess?.();
			onClose?.();
		} catch (error) {
			toast(error?.response?.data?.message || error?.message || "Có lỗi xảy ra khi thêm mới!", "error");
		} finally {
			setIsLoading(false);
		}
	};

	const handleClose = useCallback(async () => {
		try {
			const valuesData = dynamicTableRef.current?.getValues() || [];

			// Xóa các sub-items bản nháp nếu có
			const childIds = valuesData.map(item => item.id).filter(Boolean);
			if (childIds.length > 0) {
				await dispatch(deleteCrmSourceChildData({ ids: childIds })).unwrap();
			}

			// Xóa bản nháp danh mục cha
			if (!isSavedRef.current && draftIdRef.current) {
				await dispatch(deleteCrmSourceByIds({ ids: [draftIdRef.current] })).unwrap();
			}

			// Reset data trong table
			dynamicTableRef.current?.resetData();
			reset(defaultDocCategoryMgmtValue);
			draftIdRef.current = null;
			isSavedRef.current = false;

			// Gọi onClose gốc
			onClose();
		} catch (error) {
			// Vẫn đóng dialog ngay cả khi xóa thất bại
			dynamicTableRef.current?.resetData();
			reset(defaultDocCategoryMgmtValue);
			draftIdRef.current = null;
			isSavedRef.current = false;
			onClose();
		}
	}, [dispatch, onClose, reset]);

	return (
		<CustomSwipper
			title={title || "Thêm mới danh mục"}
			open={open}
			onClose={handleClose}
			onSave={handleSubmit(handleSave)}
			type="add"
			hideBackdrop
			moreActions={
				<>
					<ButtonOutline
						onClick={handleSubmit(handleSave)}
						disabled={isLoading}
						variant="outlined"
					>
						Lưu
					</ButtonOutline>
				</>
			}
			isLoading={isLoading}
		>
			<FormContainer>
				<StyleBoxTitle>
					<Typography variant="h5">Thông tin chung</Typography>
				</StyleBoxTitle>
				<Grid container spacing={2}>
					<HalfWidthGridItem item>
						<Controller
							name="code"
							control={control}
							render={({ field }) => (
								<InputComponents
									label="Mã danh mục"
									{...field}
									error={!!errors.code}
									helperText={errors.code?.message}
									required
								/>
							)}
						/>
					</HalfWidthGridItem>
					<HalfWidthGridItem item>
						<Controller
							name="title"
							control={control}
							render={({ field }) => (
								<InputComponents
									label="Tên danh mục"
									{...field}
									error={!!errors.title}
									helperText={errors.title?.message}
									required
								/>
							)}
						/>
					</HalfWidthGridItem>

					<FullWidthGridItem item>
						<StyleBoxTitle>
							<Typography variant="h5">Danh sách giá trị thuộc danh mục</Typography>
						</StyleBoxTitle>

						<Box>
							{" "}
							<DynamicValuesTable ref={dynamicTableRef} type="add" idDocumentParent={draftIdRef.current} titlePopup="giá trị" />
						</Box>
					</FullWidthGridItem>
				</Grid>
			</FormContainer>
		</CustomSwipper >
	);
};

AddDocCategoryMgmt.propTypes = {
	open: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	onSuccess: PropTypes.func,
	sharedComponents: PropTypes.object,
	title: PropTypes.string,
};

export default withSharedComponents(AddDocCategoryMgmt);
