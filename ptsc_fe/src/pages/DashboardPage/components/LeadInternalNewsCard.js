import React, { memo } from "react";
import PropTypes from "prop-types";
import LeadPanelCard from "./LeadPanelCard";
import {
	NewsList,
} from "@styles/DashboardPageMedium.styles";
import NoDataDashboard from "./NoDataDashboard";
import NewspaperOutlinedIcon from '@mui/icons-material/NewspaperOutlined';
import { PremiumNewsBody, PremiumNewsIcon, PremiumNewsItem, PremiumNewsTitle } from "@styles/DashboardPagePremium.styles";
import {
	NewsDateText,
	NewsLikesText,
	NewsCommentsText,
	StyledStack,
} from "@styles/DashboardPage.styles";

const LeadInternalNewsCard = ({ data, onActionClick, onItemClick, dragHandleNode }) => {
	const isEmpty = !data || data.length === 0;

	return (
		<LeadPanelCard title="TIN TỨC NỘI BỘ" actionText="Xem tất cả →" onActionClick={onActionClick} dragHandleNode={dragHandleNode}>
			<NewsList>
				{isEmpty ? (
					<NoDataDashboard
						icon={NewspaperOutlinedIcon}
						title="Không có tin tức nào"
						description="Không có tin tức nội bộ nào được đăng tải"
					/>
				) : (
					(Array.isArray(data) ? data : []).map((item) => (
						<PremiumNewsItem
							key={item.id}
							onClick={onItemClick ? onItemClick("news", item) : undefined}
							styleCursor={onItemClick}
						>
							<PremiumNewsIcon>{item.icon}</PremiumNewsIcon>
							<PremiumNewsBody>
								<PremiumNewsTitle>{item.title}</PremiumNewsTitle>
								<StyledStack direction="row" spacing={1.25} useFlexGap>
									<NewsDateText>{item.date}</NewsDateText>
									<NewsLikesText>{item.reactions?.[0]}</NewsLikesText>
									<NewsLikesText>{item.reactions?.[1]}</NewsLikesText>
									<NewsCommentsText>{item.reactions?.[2]}</NewsCommentsText>
								</StyledStack>
							</PremiumNewsBody>
						</PremiumNewsItem>
					))
				)}
			</NewsList>
		</LeadPanelCard>
	);
};

LeadInternalNewsCard.propTypes = {
	data: PropTypes.array.isRequired,
	onActionClick: PropTypes.func,
	dragHandleNode: PropTypes.node,
};

export default memo(LeadInternalNewsCard);
