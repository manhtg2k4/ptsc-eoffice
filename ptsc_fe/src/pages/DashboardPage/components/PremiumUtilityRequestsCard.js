import React, { memo } from "react";
import PropTypes from "prop-types";
import { Stack } from "@mui/material";
import PremiumPanelCard from "./PremiumPanelCard";
import {
	PremiumContentBody,
	NoDataContainer,
	NoDataTypography,
} from "@styles/DashboardPagePremium.styles";
import {
	QuickActionGrid,
	QuickActionGroupTitle,
} from "@styles/DashboardPage.styles";
import QuickActionItem from "./QuickActionItem";
import { CardTitleWrapper, StatHighlightValue, StatItemLabel, StatItemValue, StatItemWrapper, StatsDivider, StatSlash, StatsRowContainer, StatsTitle } from "@styles/DashboardPageMedium.styles";
import { getStatIcon } from "./LeadUtilityRequestsCard";

const PremiumUtilityRequestsCard = ({ data, onItemClick, dragHandleNode }) => {
	const quickOperationList = Array.isArray(data?.actions?.quickOperation)
		? data.actions.quickOperation
		: [];
	const pinnedWidgetList = Array.isArray(data?.actions?.pinnedWidgets)
		? data.actions.pinnedWidgets
		: [];

	const hasActions = quickOperationList.length > 0 || pinnedWidgetList.length > 0;
	const hasStats = Array.isArray(data?.stats) && data.stats.length > 0;

	const createItemClickHandler = (item) =>
		onItemClick ? onItemClick("utilityRequests", item) : undefined;

	return (
		<PremiumPanelCard
			title={
				<CardTitleWrapper component="span" nonePdBt>
					Thao tác nhanh
				</CardTitleWrapper>
			} dragHandleNode={dragHandleNode} backgroundDf>
			<PremiumContentBody>
				{!hasActions && !hasStats ? (
					<NoDataContainer>
						<NoDataTypography>Chưa có dữ liệu hiển thị</NoDataTypography>
					</NoDataContainer>
				) : (
					<Stack spacing={1.5}>
						{quickOperationList.length > 0 && (
							<QuickActionGrid stylePbottom={2.5}>
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

						{hasStats && (
							<>
								<StatsTitle>{data.statsTitle}</StatsTitle>
								<StatsDivider />
								<StatsRowContainer>
									{data.stats.map((item) => (
										<StatItemWrapper
											key={item.id}
											onClick={createItemClickHandler(item)}
											styleCursor={!!onItemClick}
										>
											{getStatIcon(item)}
											<StatItemLabel>{item.label}</StatItemLabel>
											<StatItemValue>
												<span>{item.value}</span>
												<StatSlash>/</StatSlash>
												<StatHighlightValue>
													{item.highlight}
												</StatHighlightValue>
											</StatItemValue>
										</StatItemWrapper>
									))}
								</StatsRowContainer>
							</>
						)}
					</Stack>
				)}
			</PremiumContentBody>
		</PremiumPanelCard>
	);
};

PremiumUtilityRequestsCard.propTypes = {
	data: PropTypes.object.isRequired,
	onItemClick: PropTypes.func,
	dragHandleNode: PropTypes.node,
};

export default memo(PremiumUtilityRequestsCard);
