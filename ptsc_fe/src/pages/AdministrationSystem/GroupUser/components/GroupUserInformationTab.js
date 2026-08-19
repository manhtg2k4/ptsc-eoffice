import React, { useCallback } from "react";
import {
	Box,
	Grid,
	styled,
	Typography,
	useTheme,
	useMediaQuery,
	Accordion,
	AccordionSummary,
	AccordionDetails,
} from "@mui/material";
import CustomInput from "@components/CustomInput/CustomInput";
import CustomInputTree from "@components/CustomInput/CustomInputTree";
import { Controller } from "react-hook-form";
import PropTypes from "prop-types";

// Styled Components
const FormCard = styled(Box)(({ theme }) => ({
	backgroundColor: "#ffffff",
	borderRadius: "12px",
	padding: theme.spacing(4),
	boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.04)",
	border: "1px solid #e2e8f0",
	marginBottom: theme.spacing(3),
	width: "100%",
	height: "95%"
}));

const CardHeader = styled(Box)(({ theme }) => ({
	display: "flex",
	alignItems: "center",
	gap: theme.spacing(1.5),
	paddingBottom: theme.spacing(2),
	marginBottom: theme.spacing(3),
	borderBottom: "1px solid #f1f5f9",
	color: "#2364B0",
	"& svg": {
		flexShrink: 0,
	},
}));

const CardTitle = styled(Typography)(() => ({
	fontWeight: "bold",
	fontSize: "1.1rem",
	letterSpacing: "0.5px",
	textTransform: "uppercase",
	color: "#000",
}));

const HalfWidthGridItem = styled(Grid)({
	width: "100%",
	"@media (min-width: 600px)": {
		width: "50%",
	},
});

const StyledAccordion = styled(Accordion)(({ theme }) => ({
	boxShadow: "none",
	border: "1px solid #e0e0e0",
	borderRadius: "8px !important",
	marginBottom: theme.spacing(2),
	width: "100%",
	"&:before": {
		display: "none",
	},
	"&.Mui-expanded": {
		margin: `0 0 ${theme.spacing(2)} 0`,
	},
}));

const StyledAccordionSummary = styled(AccordionSummary)(({ theme }) => ({
	borderRadius: "8px",
	minHeight: "48px !important",
	"&.Mui-expanded": {
		minHeight: "48px !important",
		borderBottomLeftRadius: 0,
		borderBottomRightRadius: 0,
	},
	"& .MuiAccordionSummary-content": {
		margin: "12px 0",
		"&.Mui-expanded": {
			margin: "12px 0",
		},
	},
	"& .MuiAccordionSummary-expandIconWrapper": {
		color: theme.palette.primary.main,
	},
}));

const StyledAccordionDetails = styled(AccordionDetails)(({ theme }) => ({
	padding: theme.spacing(2),
	borderTop: "1px solid #e0e0e0",
}));

const AccordionTitle = styled(Typography)(() => ({
	fontWeight: "bold",
	fontSize: "0.95rem",
}));

const StyledBoxInfor = styled(Box)(({ theme }) => ({
	display: "grid",
	gridTemplateColumns: "150px 1fr",
	rowGap: theme.spacing(1.5),
	columnGap: theme.spacing(2),
	width: "100%",
	alignItems: "center",
}));

const StyledTypographyInfor = styled(Typography)(() => ({
	fontWeight: "bold",
	color: "#475569",
}));

const StyledTypographyDetail = styled(Typography)(() => ({
	color: "#1e293b",
}));

const GroupUserIcon = (
	<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M12.4794 17.4897V15.8297C12.4794 15.1693 12.2168 14.5361 11.7499 14.0692C11.3414 13.6606 10.8057 13.4085 10.2358 13.3518L9.98938 13.3397H5.00938C4.34899 13.3397 3.71584 13.6022 3.24887 14.0692C2.7819 14.5361 2.51937 15.1693 2.51937 15.8297L2.51937 17.4897C2.51937 17.9481 2.14777 18.3197 1.68937 18.3197C1.23098 18.3197 0.859375 17.9481 0.859375 17.4897L0.859375 15.8297C0.859375 14.729 1.29692 13.6738 2.07519 12.8955C2.85347 12.1173 3.90873 11.6797 5.00938 11.6797H9.98938L10.1952 11.6846C11.2209 11.7355 12.1939 12.1659 12.9236 12.8955C13.7018 13.6738 14.1394 14.729 14.1394 15.8297V17.4897C14.1394 17.9481 13.7678 18.3197 13.3094 18.3197C12.851 18.3197 12.4794 17.9481 12.4794 17.4897Z" fill="#2364B0"/>
		<path d="M14.9946 5.83275C14.9946 5.28122 14.8117 4.74513 14.4742 4.30892C14.1788 3.92712 13.7795 3.64053 13.3265 3.48216L13.1295 3.42219L13.0485 3.39705C12.654 3.25089 12.4268 2.82663 12.5346 2.41062C12.6425 1.99473 13.0469 1.73488 13.4627 1.79866L13.5462 1.81568L13.7115 1.86188C14.5336 2.1117 15.259 2.61158 15.7865 3.2933C16.3491 4.02037 16.6546 4.91344 16.6546 5.83275C16.6546 6.75206 16.3491 7.64513 15.7865 8.37223C15.2239 9.09923 14.4361 9.61914 13.5462 9.8498C13.1025 9.96483 12.6497 9.69849 12.5346 9.25485C12.4195 8.81122 12.6859 8.35837 13.1295 8.24331C13.6635 8.10489 14.1366 7.79282 14.4742 7.35658C14.8118 6.92036 14.9946 6.38429 14.9946 5.83275Z" fill="#2364B0"/>
		<path d="M17.4977 17.4917V15.8326L17.4888 15.6267C17.4488 15.1485 17.2715 14.6903 16.9757 14.3088C16.6799 13.9271 16.2804 13.6408 15.8271 13.4828L15.6302 13.4228L15.5491 13.3977C15.1545 13.2519 14.927 12.8281 15.0344 12.412C15.1419 11.9961 15.5459 11.7352 15.9617 11.7985L16.0452 11.8163L16.2105 11.8625C17.0329 12.1116 17.7598 12.6101 18.2879 13.2915C18.8512 14.0182 19.1569 14.9115 19.1577 15.831V17.4917C19.1576 17.9501 18.786 18.3217 18.3277 18.3217C17.8693 18.3217 17.4977 17.9501 17.4977 17.4917Z" fill="#2364B0"/>
		<path d="M9.99156 5.82969C9.99156 4.4545 8.87679 3.33969 7.50156 3.33969C6.12638 3.33969 5.01156 4.4545 5.01156 5.82969C5.01156 7.20487 6.12638 8.31969 7.50156 8.31969C8.87679 8.31969 9.99156 7.20487 9.99156 5.82969ZM11.6516 5.82969C11.6516 8.12167 9.79352 9.97969 7.50156 9.97969C5.20958 9.97969 3.35156 8.12167 3.35156 5.82969C3.35156 3.53771 5.20958 1.67969 7.50156 1.67969C9.79352 1.67969 11.6516 3.53771 11.6516 5.82969Z" fill="#2364B0"/>
	</svg>
);

const GroupUserInformationTab = ({
	isView = false,
	control,
	errors,
	detailGroupUsers,
}) => {
	const theme = useTheme();
	const isSmall = useMediaQuery(theme.breakpoints.down("md"));
	const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

	// Form change handlers
	const handleNameChange = useCallback((field) => (e) => {
		const value = e.target.value;
		const sanitizedValue = value.replace(/[`~!@#$%^*]/g, "");
		field.onChange(sanitizedValue);
	}, []);

	const handleOrderChange = useCallback((field) => (e) => {
		const val = e.target.value;
		field.onChange(val !== "" ? Number(val) : "");
	}, []);

	if (isView) {
		// Read-only/View Mode
		if (isMobile) {
			return (
				<StyledAccordion expanded>
					<StyledAccordionSummary>
						<AccordionTitle>Thông tin nhóm người dùng</AccordionTitle>
					</StyledAccordionSummary>
					<StyledAccordionDetails>
						<StyledBoxInfor>
							<StyledTypographyInfor variant="body2">Mã nhóm:</StyledTypographyInfor>
							<StyledTypographyDetail variant="body2">
								{detailGroupUsers?.code}
							</StyledTypographyDetail>

							<StyledTypographyInfor variant="body2">Tên nhóm:</StyledTypographyInfor>
							<StyledTypographyDetail variant="body2">
								{detailGroupUsers?.name}
							</StyledTypographyDetail>

							<StyledTypographyInfor variant="body2">Mô tả:</StyledTypographyInfor>
							<StyledTypographyDetail variant="body2">
								{detailGroupUsers?.description}
							</StyledTypographyDetail>

							<StyledTypographyInfor variant="body2">Cấp:</StyledTypographyInfor>
							<StyledTypographyDetail variant="body2">
								{detailGroupUsers?.order}
							</StyledTypographyDetail>
						</StyledBoxInfor>
					</StyledAccordionDetails>
				</StyledAccordion>
			);
		}

		return (
			<FormCard>
				<CardHeader>
					{GroupUserIcon}
					<CardTitle>Thông tin khác</CardTitle>
				</CardHeader>
				<StyledBoxInfor>
					<StyledTypographyInfor variant="body1">Mã nhóm:</StyledTypographyInfor>
					<StyledTypographyDetail variant="body1">
						{detailGroupUsers?.code}
					</StyledTypographyDetail>

					<StyledTypographyInfor variant="body1">Tên nhóm:</StyledTypographyInfor>
					<StyledTypographyDetail variant="body1">
						{detailGroupUsers?.name}
					</StyledTypographyDetail>

					<StyledTypographyInfor variant="body1">Mô tả:</StyledTypographyInfor>
					<StyledTypographyDetail variant="body1">
						{detailGroupUsers?.description}
					</StyledTypographyDetail>

					<StyledTypographyInfor variant="body1">Cấp:</StyledTypographyInfor>
					<StyledTypographyDetail variant="body1">
						{detailGroupUsers?.order}
					</StyledTypographyDetail>
				</StyledBoxInfor>
			</FormCard>
		);
	}

	// Form/Input Mode (Add/Edit)
	if (isMobile) {
		return (
			<StyledAccordion expanded>
				<StyledAccordionSummary>
					<AccordionTitle>Thông tin nhóm người dùng</AccordionTitle>
				</StyledAccordionSummary>
				<StyledAccordionDetails>
					<Grid container spacing={2}>
						<HalfWidthGridItem item>
							<Controller
								name="code"
								control={control}
								render={({ field }) => (
									<CustomInput
										label="MÃ NHÓM"
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
								name="order"
								control={control}
								render={({ field }) => (
									<CustomInput
										label="CẤP"
										{...field}
										onChange={handleOrderChange(field)}
										type="number"
										error={!!errors.order}
										helperText={errors.order?.message}
										required
									/>
								)}
							/>
						</HalfWidthGridItem>
						<HalfWidthGridItem item>
							<Controller
								name="name"
								control={control}
								render={({ field }) => (
									<CustomInput
										label="TÊN NHÓM NGƯỜI DÙNG"
										{...field}
										error={!!errors.name}
										onChange={handleNameChange(field)}
										helperText={errors.name?.message}
										required
									/>
								)}
							/>
						</HalfWidthGridItem>
						<HalfWidthGridItem item>
							<Controller
								name="description"
								control={control}
								render={({ field }) => (
									<CustomInput
										label="MÔ TẢ"
										{...field}
										error={!!errors.description}
										helperText={errors.description?.message}
										required
									/>
								)}
							/>
						</HalfWidthGridItem>
						<Grid item xs={12}>
							<Controller
								name="organizationUnits"
								control={control}
								defaultValue={[]}
								render={({ field }) => (
									<CustomInputTree
										select
										customLabel="name"
										customValue="_id"
										api="api/organization-units"
										apiExpand="api/organization-units/children"
										treeView
										multiple
										error={!!errors.organizationUnits}
										helperText={errors.organizationUnits?.message}
										label="ĐƠN VỊ"
										placeholder="Chọn đơn vị"
										multiline={!isSmall}
										rows={!isSmall ? 2 : 1}
										{...field}
									/>
								)}
							/>
						</Grid>
					</Grid>
				</StyledAccordionDetails>
			</StyledAccordion>
		);
	}

	return (
		<FormCard>
			<CardHeader>
				{GroupUserIcon}
				<CardTitle>Thông tin khác</CardTitle>
			</CardHeader>
			<Grid container spacing={3}>
				<Grid item xs={6}>
					<Controller
						name="code"
						control={control}
						render={({ field }) => (
							<CustomInput
								label="MÃ NHÓM"
								{...field}
								error={!!errors.code}
								helperText={errors.code?.message}
								required
							/>
						)}
					/>
				</Grid>
				<Grid item xs={6}>
					<Controller
						name="order"
						control={control}
						render={({ field }) => (
							<CustomInput
								label="CẤP"
								{...field}
								onChange={handleOrderChange(field)}
								type="number"
								error={!!errors.order}
								helperText={errors.order?.message}
								required
							/>
						)}
					/>
				</Grid>
				<Grid item xs={6}>
					<Controller
						name="name"
						control={control}
						render={({ field }) => (
							<CustomInput
								label="TÊN NHÓM NGƯỜI DÙNG"
								{...field}
								error={!!errors.name}
								onChange={handleNameChange(field)}
								helperText={errors.name?.message}
								required
							/>
						)}
					/>
				</Grid>
				<Grid item xs={6}>
					<Controller
						name="description"
						control={control}
						render={({ field }) => (
							<CustomInput
								label="MÔ TẢ"
								{...field}
								error={!!errors.description}
								helperText={errors.description?.message}
								required
							/>
						)}
					/>
				</Grid>
				<Grid item xs={12}>
					<Controller
						name="organizationUnits"
						control={control}
						defaultValue={[]}
						render={({ field }) => (
							<CustomInputTree
								select
								customLabel="name"
								customValue="_id"
								api="api/organization-units"
								apiExpand="api/organization-units/children"
								treeView
								multiple
								error={!!errors.organizationUnits}
								helperText={errors.organizationUnits?.message}
								label="ĐƠN VỊ"
								placeholder="Chọn đơn vị"
								multiline={!isSmall}
								rows={!isSmall ? 4 : 1}
								{...field}
							/>
						)}
					/>
				</Grid>
			</Grid>
		</FormCard>
	);
};

GroupUserInformationTab.propTypes = {
	isView: PropTypes.bool,
	control: PropTypes.object,
	errors: PropTypes.object,
	detailGroupUsers: PropTypes.object,
};

GroupUserInformationTab.defaultProps = {
	isView: false,
	control: {},
	errors: {},
	detailGroupUsers: {},
};

export default GroupUserInformationTab;
