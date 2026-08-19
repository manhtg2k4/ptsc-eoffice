import React from "react";
import PropTypes from "prop-types";
import { Tab } from "@mui/material";
import { StyledTabs, StyledBadge, HeaderCustomTab } from "@styles/QualificationManagement.styles";

/**
 * Component Tabs có Badge (số lượng), sử dụng StyledTabs + StyledBadge chung của hệ thống
 * 
 * @param {Array<{ label: string, count?: number }>} tabs - Danh sách tab hiển thị
 * @param {number} value - Index tab hiện tại
 * @param {function} onChange - Hàm đổi tab
 */
const CustomTabsWithBadge = ({ tabs, value, onChange, styledPaddingLeft }) => {
	const TabWithBadge = ({ label, count, badge }) => {
		const displayCount = count !== undefined ? count : badge;
		if (displayCount && displayCount > 0) {
			return (
				<StyledBadge badgeContent={displayCount > 99 ? "99+" : displayCount} >
					{label}
				</StyledBadge>
			);
		}
		return label;
	};

	return (
		<HeaderCustomTab styledPaddingLeft={styledPaddingLeft}>
			<StyledTabs
				value={value}
				onChange={onChange}
				variant="scrollable"
				scrollButtons="auto"
			>
				{tabs.map((tab, index) => (
					<Tab
						key={tab.label}
						label={<TabWithBadge label={tab.label} count={tab.count} badge={tab.badge} />}
						value={index}
					/>
				))}
			</StyledTabs>
		</HeaderCustomTab>
	);
};

CustomTabsWithBadge.propTypes = {
	tabs: PropTypes.arrayOf(
		PropTypes.shape({
			label: PropTypes.string.isRequired,
			count: PropTypes.number,
			badge: PropTypes.number,
		})
	).isRequired,
	value: PropTypes.number.isRequired,
	onChange: PropTypes.func.isRequired,
	styledPaddingLeft: PropTypes.number,
};

export default CustomTabsWithBadge;
