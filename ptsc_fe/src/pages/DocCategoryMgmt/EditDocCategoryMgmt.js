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
import { yupResolver } from "@hookform/resolvers/yup";
import { defaultDocCategoryMgmtValue, docCategoryMgmtSchema } from "./constantsDocCategoryMgmt";
import withSharedComponents from "@components/WrapperComponent";
import { detailCrmSources, patchCrmSources } from "@redux/slices/DocCategoryMgmt/DocCategoryMgmtSlice";

const EditDocCategoryMgmt = ({
	open,
	onClose,
	onSuccess,
	sharedComponents,
	title,
	id
}) => {
	const {
		CustomSwipper,
		InputComponents,
		ButtonOutline,
	} = sharedComponents;

	const dispatch = useDispatch();
	const [isLoading, setIsLoading] = useState(false);

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
		const fetchDataDetail = async () => {
			try {
				setIsLoading(true);
				const res = await dispatch(detailCrmSources(id)).unwrap();
				reset({ ...defaultDocCategoryMgmtValue, ...res });
			} catch (error) {
				logger.log("Lỗi khi lấy chi tiết danh mục:", error);
				const errorMessage =
					error?.response?.data?.message ||
					error?.data?.message ||
					error?.message ||
					"Lấy chi tiết danh mục thất bại!";
				toast(errorMessage, "error");
				onClose?.();
			} finally {
				setIsLoading(false);
			}
		};

		fetchDataDetail();
	}, [open, dispatch, toast, reset, onClose, id]);

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
			status: 1,
		};

		try {
			setIsLoading(true);
			await dispatch(patchCrmSources({
				id: id,
				body: payload,
			})).unwrap();
			toast("Cập nhật danh mục thành công!", "success");
			dynamicTableRef.current?.resetData();
			reset(defaultDocCategoryMgmtValue);
			onSuccess?.();
			onClose?.();
		} catch (error) {
			toast(error?.response?.data?.message || error?.message || "Có lỗi xảy ra khi cập nhật!", "error");
		} finally {
			setIsLoading(false);
		}
	};

	const handleClose = useCallback(async () => {
		dynamicTableRef.current?.resetData();
		reset(defaultDocCategoryMgmtValue);
		onClose?.();
	}, [onClose, reset]);

	return (
		<CustomSwipper
			title={title || "Cập nhật danh mục"}
			open={open}
			onClose={handleClose}
			onSave={handleSubmit(handleSave)}
			type="edit"
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
									disabled
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
							<Controller
								name="data"
								control={control}
								render={({ field }) => (
									<DynamicValuesTable ref={dynamicTableRef} defaultValue={field.value || []} type="edit" idDocumentParent={id} disableEdit titlePopup="giá trị" />
								)}
							/>

						</Box>
					</FullWidthGridItem>
				</Grid>
			</FormContainer>
		</CustomSwipper >
	);
};

EditDocCategoryMgmt.propTypes = {
	open: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	onSuccess: PropTypes.func,
	sharedComponents: PropTypes.object,
	title: PropTypes.string,
	id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default withSharedComponents(EditDocCategoryMgmt);
