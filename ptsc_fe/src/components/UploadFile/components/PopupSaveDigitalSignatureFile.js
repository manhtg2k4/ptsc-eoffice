import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { CustomDialog } from "@components/CustomDialog";
import { Box, Grid, Typography } from "@mui/material";
import CustomInput from "@components/CustomInput/CustomInput";
import { FullWidthGridItem } from "@styles/FormList.styles";
import { HalfWidthGridItem } from "@styles/ThemeConfig.styles";

/**
 * Popup xác nhận ký số
 * Nhập: password, reason, location
 */
const PopupSaveDigitalSignatureFile = ({
	open,
	onClose,
	onSave,
	isLoading,
	fileName,
	hidePasswordField = false,
}) => {
	const [password, setPassword] = useState("");
	const [reason, setReason] = useState("Ký số điện tử");
	const [location, setLocation] = useState("Việt Nam");
	const [errors, setErrors] = useState({});

	// Reset values khi mở popup
	useEffect(() => {
		if (open) {
			setPassword("");
			setReason("Ký số điện tử");
			setLocation("Việt Nam");
			setErrors({});
		}
	}, [open]);

	const validate = useCallback(() => {
		const newErrors = {};
		
		// Chỉ kiểm tra password khi không ẩn trường này
		if (!hidePasswordField && (!password || password.trim() === "")) {
			newErrors.password = "Vui lòng nhập mật khẩu xác nhận";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	}, [password, hidePasswordField]);

	const handleSave = useCallback(() => {
		if (validate()) {
			onSave({ 
				password: password.trim(),
				reason: reason.trim() || "Ký số điện tử",
				location: location.trim() || "Việt Nam",
			});
		}
	}, [validate, onSave, password, reason, location]);

	const handlePasswordChange = useCallback((e) => {
		setPassword(e.target.value);
		// Xóa lỗi khi user bắt đầu nhập
		if (errors.password) {
			setErrors({});
		}
	}, [errors.password]);

	const handleReasonChange = useCallback((e) => {
		setReason(e.target.value);
	}, []);

	const handleLocationChange = useCallback((e) => {
		setLocation(e.target.value);
	}, []);

	return (
		<CustomDialog
			open={open}
			onClose={onClose}
			onSave={handleSave}
			title="Xác nhận ký số"
			isLoading={isLoading}
			titleButton="Xác nhận ký"
			size="sm"
		>
			<Box>
				<Grid container spacing={2}>
					{fileName && (
						<FullWidthGridItem item>
							<Typography variant="body2">
								<strong>File:</strong> {fileName}
							</Typography>
						</FullWidthGridItem>
					)}

					{!hidePasswordField && (
						<FullWidthGridItem item>
							<CustomInput
								label="Mật khẩu xác nhận (End Entity)"
								type="password"
								placeholder="Nhập mật khẩu End Entity"
								value={password}
								onChange={handlePasswordChange}
								error={!!errors.password}
								helperText={errors.password}
								required
								autoFocus
							/>
						</FullWidthGridItem>
					)}

					<HalfWidthGridItem item>
						<CustomInput
							label="Lý do ký"
							placeholder="VD: Ký số điện tử"
							value={reason}
							onChange={handleReasonChange}
						/>
					</HalfWidthGridItem>

					<HalfWidthGridItem item>
						<CustomInput
							label="Địa điểm"
							placeholder="VD: Việt Nam"
							value={location}
							onChange={handleLocationChange}
						/>
					</HalfWidthGridItem>
				</Grid>
			</Box>
		</CustomDialog>
	);
};

PopupSaveDigitalSignatureFile.propTypes = {
	open: PropTypes.bool,
	onClose: PropTypes.func,
	onSave: PropTypes.func,
	isLoading: PropTypes.bool,
	fileName: PropTypes.string,
	hidePasswordField: PropTypes.bool,
};

export default PopupSaveDigitalSignatureFile;