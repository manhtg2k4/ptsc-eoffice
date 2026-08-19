import React, { memo } from "react";
import PropTypes from "prop-types";
import { Stack } from "@mui/material";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import PremiumPanelCard from "./PremiumPanelCard";
import QuickActionItem from "./QuickActionItem";
import {
	QuickActionGrid,
	QuickActionGroupTitle,
} from "@styles/DashboardPage.styles";
import {
	PremiumContentBody,
	NoDataContainer,
	NoDataTypography,
} from "@styles/DashboardPagePremium.styles";
import {
	CardTitleWrapper,
	StatsDivider,
	StatsTitle,
	StatsRowContainer,
	StatItemWrapper,
	StatIconWrapper,
	StatItemLabel,
	StatItemValue,
	StatHighlightValue,
	StatSlash,
} from "@styles/DashboardPageMedium.styles";

export const getStatIcon = (item) => {
	let IconComponent = PublicOutlinedIcon;
	const labelLower = item.label?.toLowerCase() || "";
	if (item.icon === "car" || item.key === "car" || labelLower.includes("duyệt")) {
		IconComponent = LocalShippingOutlinedIcon;
	} else if (item.icon === "warning" || item.key === "warning" || labelLower.includes("làm")) {
		IconComponent = ErrorOutlineIcon;
	}
	return (
		<StatIconWrapper>
			<IconComponent />
		</StatIconWrapper>
	);
};

const LeadUtilityRequestsCard = ({ data, onItemClick, dragHandleNode }) => {
	const safeData = data && typeof data === "object" ? data : {};
	const safeActions = Array.isArray(safeData.actions?.quickOperation) ? safeData.actions.quickOperation : [];
	const safeStats = Array.isArray(safeData.stats) ? safeData.stats : [];

	const pinnedWidgetList = Array.isArray(safeData.actions?.pinnedWidgets)
		? safeData.actions.pinnedWidgets
		: [];

	const quickOperationList = Array.isArray(safeData.actions?.quickOperation)
		? safeData.actions.quickOperation
		: [];

	const createItemClickHandler = (item) =>
		onItemClick ? onItemClick("utilityRequests", item) : undefined;

	return (
		<PremiumPanelCard
			title={
				<CardTitleWrapper component="span" nonePdBt>
					Thao tác nhanh
				</CardTitleWrapper>
			}
			dragHandleNode={dragHandleNode}
			backgroundDf
			nonePdBt
		>
			<PremiumContentBody>
				{safeActions.length === 0 && safeStats.length === 0 ? (
					<NoDataContainer>
						<NoDataTypography>Chưa có dữ liệu hiển thị</NoDataTypography>
					</NoDataContainer>
				) : (
					<Stack spacing={1.5}>
						{quickOperationList.length > 0 && (
							<QuickActionGrid stylePbottom={1}>
								{quickOperationList.map((item) => (
									<QuickActionItem
										key={item.id}
										data={item}
										onClick={createItemClickHandler(item)}
									/>
								))}
							</QuickActionGrid>
						)}

						{pinnedWidgetList.length > 0 && (
							<Stack spacing={0.8}>
								<QuickActionGroupTitle>Tiện ích đã ghim</QuickActionGroupTitle>
								<QuickActionGrid>
									{pinnedWidgetList.map((item) => (
										<QuickActionItem
											key={item.id}
											data={item}
											onClick={createItemClickHandler(item)}
										/>
									))}
								</QuickActionGrid>
							</Stack>
						)}


						{safeStats.length > 0 ? (
							<>
								<StatsTitle>{safeData.statsTitle}</StatsTitle>
								<StatsDivider />
								<StatsRowContainer>
									{safeStats.map((item) => (
										<StatItemWrapper
											key={item.id}
											onClick={createItemClickHandler(item)}
											styleCursor={!!onItemClick}
										>
											{getStatIcon(item)}
											<StatItemLabel>{item.label}</StatItemLabel>
											<StatItemValue>
												<span>{item.values?.[0]?.text}</span>
												<StatSlash>/</StatSlash>
												<StatHighlightValue>
													{item.values?.[1]?.text}
												</StatHighlightValue>
											</StatItemValue>
										</StatItemWrapper>
									))}
								</StatsRowContainer>
							</>
						) : null}
					</Stack>
				)}
			</PremiumContentBody>
		</PremiumPanelCard>
	);
};

LeadUtilityRequestsCard.propTypes = {
	data: PropTypes.object.isRequired,
	onItemClick: PropTypes.func,
	dragHandleNode: PropTypes.node,
};

export default memo(LeadUtilityRequestsCard);
