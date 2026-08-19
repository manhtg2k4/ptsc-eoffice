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
import { defaultDocCategoryMgmtValue } from "./constantsDocCategoryMgmt";
import withSharedComponents from "@components/WrapperComponent";
import { detailCrmSources } from "@redux/slices/DocCategoryMgmt/DocCategoryMgmtSlice";


const ViewDocCategoryMgmt = ({
	open,
	onClose,
	sharedComponents,
	title,
	id
}) => {

	const {
		CustomSwipper,
		InputComponents,
	} = sharedComponents;
	const dispatch = useDispatch();
	const [isLoading, setIsLoading] = useState(false);

	const {
		control,
		reset,
	} = useForm({
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


	const handleClose = useCallback(async () => {
		dynamicTableRef.current?.resetData();
		reset(defaultDocCategoryMgmtValue);
		onClose?.();
	}, [onClose, reset]);

	return (
		<CustomSwipper
			title={title || "Xem chi tiết danh mục"}
			open={open}
			onClose={handleClose}
			type="view"
			hideBackdrop
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
									required
									disabled
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
									<DynamicValuesTable ref={dynamicTableRef} defaultValue={field.value || []} type="view" idDocumentParent={id} disabled titlePopup="giá trị"/>
								)}
							/>

						</Box>
					</FullWidthGridItem>
				</Grid>
			</FormContainer>
		</CustomSwipper >
	);
};

ViewDocCategoryMgmt.propTypes = {
	open: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	sharedComponents: PropTypes.object,
	title: PropTypes.string,
	id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default withSharedComponents(ViewDocCategoryMgmt);
