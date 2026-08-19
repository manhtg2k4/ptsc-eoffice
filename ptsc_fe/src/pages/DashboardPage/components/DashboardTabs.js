import React, { useCallback } from "react";
import PropTypes from "prop-types";
import { styled } from "@mui/material/styles";
import {
	MedimiumTabBadge,
	MedimiumTabButton,
	MedimiumTabValue,
} from "@styles/DashboardPageMedium.styles";
import {
	PremiumTabButton,
	PremiumTabOuter,
	PremiumTabs,
} from "@styles/DashboardPagePremium.styles";

const CompactTabs = styled(PremiumTabs)({
	height: 40,
	padding: 4,
	boxSizing: "border-box",
});

const CompactPremiumTabButton = styled(PremiumTabButton)({
	height: "100%",
	minHeight: "unset",
	padding: "4px 12px",
});

const CompactMediumTabButton = styled(MedimiumTabButton)({
	height: "100%",
	minHeight: "unset",
	padding: "4px 12px",
});

const DashboardTabs = ({ tabs, activeTab, onChange, variant }) => {
	const safeTabs = Array.isArray(tabs) ? tabs : [];

	const handleTabClick = useCallback(
		(event) => {
			const nextTab = event.currentTarget.dataset.tab;
			if (typeof onChange === "function") {
				onChange(nextTab, event);
			}
		},
		[onChange]
	);

	return (
		<PremiumTabOuter>
			<CompactTabs>
				{safeTabs.map((tab) => {
					const isActive = activeTab === tab.id;

					if (variant === "medium") {
						return (
							<CompactMediumTabButton
								key={tab.id}
								active={isActive}
								data-tab={tab.id}
								onClick={handleTabClick}
							>
								<MedimiumTabValue active={isActive}>{tab.label}</MedimiumTabValue>
								{tab.badge?.value ? (
									<MedimiumTabBadge clText={tab.badge.color} bgCl={tab.badge.bgColor}>
										{tab.badge.value}
									</MedimiumTabBadge>
								) : null}
							</CompactMediumTabButton>
						);
					}

					return (
						<CompactPremiumTabButton
							key={tab.id}
							active={isActive}
							data-tab={tab.id}
							onClick={handleTabClick}
						>
							<MedimiumTabValue active={isActive}>{tab.label}</MedimiumTabValue>
						</CompactPremiumTabButton>
					);
				})}
			</CompactTabs>
		</PremiumTabOuter>
	);
};

DashboardTabs.propTypes = {
	tabs: PropTypes.arrayOf(
		PropTypes.shape({
			id: PropTypes.string.isRequired,
			label: PropTypes.string.isRequired,
			badge: PropTypes.shape({
				value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
				color: PropTypes.string,
				bgColor: PropTypes.string,
			}),
		})
	).isRequired,
	activeTab: PropTypes.string.isRequired,
	onChange: PropTypes.func.isRequired,
	variant: PropTypes.oneOf(["medium", "premium"]),
};

DashboardTabs.defaultProps = {
	variant: "premium",
};

export default DashboardTabs;