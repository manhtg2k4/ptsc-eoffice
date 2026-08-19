import React, { memo } from "react";
import PropTypes from "prop-types";
import { Stack } from "@mui/material";
import EventItem from "./EventItem";
import PremiumPanelCard from "./PremiumPanelCard";
import { PremiumContentBody } from "@styles/DashboardPagePremium.styles";
import NoDataDashboard from "./NoDataDashboard";
import StarOutlinedIcon from '@mui/icons-material/StarOutlined';

const PremiumEventsCard = ({ data, onItemClick, onActionClick, dragHandleNode }) => {
	return (
		<PremiumPanelCard title="Sự kiện sắp tới" actionText="Xem tất cả →" onActionClick={onActionClick} dragHandleNode={dragHandleNode}>
			<PremiumContentBody>
				{(Array.isArray(data) ? data : []).length === 0 ? (
					<NoDataDashboard
						icon={StarOutlinedIcon}
						title="Không có sự kiện nào"
						description="Tuần này bạn chưa có sự kiện nào sắp diễn ra"
					/>
				) : (
					<Stack spacing={0.5}>
						{(Array.isArray(data) ? data : []).map((item) => (
							<EventItem
								key={item.id}
								data={{
									day: item.day,
									month: item.month,
									title: item.title,
									description: item.info,
									color: "blue",
								}}
								onClick={onItemClick ? onItemClick("events", item) : undefined}
								styleCursor={onItemClick}
							/>
						))}
					</Stack>
				)}
			</PremiumContentBody>
		</PremiumPanelCard>
	);
};

PremiumEventsCard.propTypes = {
	data: PropTypes.array.isRequired,
	onItemClick: PropTypes.func,
	onActionClick: PropTypes.func,
	dragHandleNode: PropTypes.node,
};

export default memo(PremiumEventsCard);
