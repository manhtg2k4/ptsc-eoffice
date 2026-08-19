import React, { useCallback, useEffect } from "react";
import PropTypes from "prop-types";
import { useForm, Controller } from "react-hook-form";
import withSharedComponents from "@components/WrapperComponent";

const RejectReturnSlipDialog = ({
	open,
	onClose,
	onSubmit,
	isLoading,
	titleButton = "Trả lại",
	sharedComponents,
}) => {
	const { Dialog: CustomDialog, Input: BaseInput } = sharedComponents || {};

	const { control, handleSubmit, reset } = useForm({
		defaultValues: {
			reason: "",
		},
		mode: "onChange",
	});

	useEffect(() => {
		if (open) {
			reset({ reason: "" });
		}
	}, [open, reset]);

	const handleFormSubmit = useCallback(
		(data) => {
			if (onSubmit) {
				onSubmit(data);
			}
		},
		[onSubmit]
	);

	return (
		<CustomDialog
			open={open}
			onClose={onClose}
			title="Trả lại phiếu hoàn trả hộ chiếu"
			onSave={handleSubmit(handleFormSubmit)}
			isLoading={isLoading}
			titleButton={titleButton}
			// colorType="error"
			size="sm"
		>
			<Controller
				name="reason"
				control={control}
				rules={{ required: "Vui lòng nhập lý do trả lại" }}
				render={({ field, fieldState: { error } }) => (
					<BaseInput
						{...field}
						label="Lý do trả lại"
						placeholder="Nhập lý do trả lại..."
						multiline
						rows={3}
						error={!!error}
						helperText={error?.message}
						fullWidth
						required
					/>
				)}
			/>
		</CustomDialog>
	);
};

RejectReturnSlipDialog.propTypes = {
	open: PropTypes.bool,
	onClose: PropTypes.func,
	onSubmit: PropTypes.func,
	isLoading: PropTypes.bool,
	titleButton: PropTypes.string,
	sharedComponents: PropTypes.object,
};

export default withSharedComponents(RejectReturnSlipDialog);
