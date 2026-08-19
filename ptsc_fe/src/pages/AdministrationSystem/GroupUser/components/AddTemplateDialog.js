import React, { useState, useEffect } from "react";
import { Box, styled, useTheme, useMediaQuery } from "@mui/material";
import PropTypes from "prop-types";
import Swipper from "@components/Swipper/BaseSwiper";
import Button from '@components/CustomButton';
import { FormFieldLayoutContext } from "@components/CustomInput/FormFieldLayoutContext";
import CustomTabsWithBadge from "@components/CustomTabs";
import GroupUserInformationTab from "./GroupUserInformationTab";
import GroupUserRoleTab from "./GroupUserRoleTab";

const FormContainer = styled(Box)(() => ({
	backgroundColor: "transparent",
	flex: 1,
	minHeight: 0,
	display: "flex",
	flexDirection: "column",
	overflow: "hidden",
}));

const DIALOG_TABS = [
	{ key: "thongTinKhac", label: "Thông tin khác" },
	{ key: "vaiTro", label: "Vai trò" },
];

const AddTemplateDialog = ({
	open,
	onClose,
	onSave,
	control,
	errors,
	isLoading,
	roleType,
	setRoleType,
	selectedFixedRole,
	setSelectedFixedRole,
	selectedDynamicRole,
	setSelectedDynamicRole,
}) => {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
	const [activeTab, setActiveTab] = useState(0);

	useEffect(() => {
		if (open) {
			setActiveTab(0);
		}
	}, [open]);

	const handleChangeTab = (event, newValue) => {
		setActiveTab(newValue);
	};

	return (
		<FormFieldLayoutContext.Provider value={{ inputLabelLayout: "stacked" }}>
			<Swipper
				title="Thêm nhóm người dùng"
				open={open}
				onClose={onClose}
				onSave={onSave}
				type="add"
				isLoading={isLoading}
				moreActions={
					<>
						<Button variant="outlined" onClick={onSave}>
							Lưu
						</Button>
					</>
				}
				nonePadding
				noneOverflow
			>
				<div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
					<CustomTabsWithBadge
						tabs={DIALOG_TABS}
						value={activeTab}
						onChange={handleChangeTab}
						styledPaddingLeft={isMobile ? 0 : 2}
					/>
					<FormContainer component="form">
						{activeTab === 0 && (
							<div style={{ padding: isMobile ? theme.spacing(1) : theme.spacing(2), overflowY: "auto", flex: 1 }}>
								<GroupUserInformationTab
									control={control}
									errors={errors}
									isView={false}
								/>
							</div>
						)}
						{activeTab === 1 && (
							<div style={{ padding: isMobile ? theme.spacing(1) : theme.spacing(2), display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
								<GroupUserRoleTab
									isView={false}
									roleType={roleType}
									setRoleType={setRoleType}
									selectedFixedRole={selectedFixedRole}
									setSelectedFixedRole={setSelectedFixedRole}
									selectedDynamicRole={selectedDynamicRole}
									setSelectedDynamicRole={setSelectedDynamicRole}
								/>
							</div>
						)}
					</FormContainer>
				</div>
			</Swipper>
		</FormFieldLayoutContext.Provider>
	);
};

AddTemplateDialog.propTypes = {
	open: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	onSave: PropTypes.func.isRequired,
	control: PropTypes.object.isRequired,
	errors: PropTypes.object.isRequired,
	isLoading: PropTypes.bool,
	roleType: PropTypes.string.isRequired,
	setRoleType: PropTypes.func.isRequired,
	selectedFixedRole: PropTypes.array,
	setSelectedFixedRole: PropTypes.func.isRequired,
	selectedDynamicRole: PropTypes.array,
	setSelectedDynamicRole: PropTypes.func.isRequired,
};

AddTemplateDialog.defaultProps = {
	isLoading: false,
	selectedFixedRole: [],
	selectedDynamicRole: [],
};

export default AddTemplateDialog;