import React, { memo } from "react";
import PropTypes from "prop-types";
import PremiumPanelCard from "./PremiumPanelCard";
import {
	PremiumNewsBody,
	PremiumNewsIcon,
	PremiumNewsItem,
	PremiumNewsStats,
	PremiumNewsTitle,
	PremiumScrollArea,
} from "@styles/DashboardPagePremium.styles";
import NoDataDashboard from "./NoDataDashboard";
import NewspaperOutlinedIcon from '@mui/icons-material/NewspaperOutlined';

const PremiumNewsCard = ({ data, onItemClick, onActionClick, dragHandleNode }) => {
	return (
		<PremiumPanelCard title="Tin tức nội bộ" actionText="Xem tất cả →" onActionClick={onActionClick} dragHandleNode={dragHandleNode}>
			<PremiumScrollArea>
				{(Array.isArray(data) ? data : []).length === 0 ? (
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
								<PremiumNewsStats>{item.stats} · {item.date}</PremiumNewsStats>
							</PremiumNewsBody>
						</PremiumNewsItem>
					))
				)}
			</PremiumScrollArea>
		</PremiumPanelCard>
	);
};

PremiumNewsCard.propTypes = {
	data: PropTypes.array.isRequired,
	onItemClick: PropTypes.func,
	onActionClick: PropTypes.func,
	dragHandleNode: PropTypes.node,
};

export default memo(PremiumNewsCard);
