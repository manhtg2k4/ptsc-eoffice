import withSharedComponents from '@components/WrapperComponent';
import React, { useState } from 'react'
import GeneralInformation from './components/GeneralInformation';
import ProposedTreatment from './components/ProposedTreatment';

const AddIncommingDoc = ({
	open,
	onClose,
	control,
	// handleSubmit,
	// onSubmit,
	// onSave,
	errors,
	// isLoading,
	sharedComponents
}) => {
	const { CustomSwipper, CustomTabsWithBadge } = sharedComponents;
	const [tabValue, setTabValue] = useState(0);

	const tabs = [
		{ label: "Thông tin chung" },
		{ label: "Đề xuất xử lý" },
	];
	const renderTabContent = () => {
		switch (tabValue) {
			case 0:
				return <GeneralInformation control={control} errors={errors} />;
			case 1:
				return <ProposedTreatment control={control} errors={errors} />;
			default:
				return null;
		}
	};

	const handleTabChange = (event, newValue) => {
		setTabValue(newValue);
	};

	return (
		<CustomSwipper
			open={open}
			onClose={onClose}
			title="Thêm mới tiếp nhận văn bản đến"
			type="add"
		>
			<CustomTabsWithBadge
				tabs={tabs}
				value={tabValue}
				onChange={handleTabChange}
			/>
			{renderTabContent()}
		</CustomSwipper>
	)
}

export default withSharedComponents(AddIncommingDoc)