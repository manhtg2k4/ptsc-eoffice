import React, { memo } from "react";
import PropTypes from "prop-types";
import LeadPanelCard from "./LeadPanelCard";
import {
	UpcomingBody,
	UpcomingDate,
	UpcomingDay,
	UpcomingItem,
	UpcomingList,
	UpcomingMeta,
	UpcomingMonth,
	UpcomingTitle,
} from "@styles/DashboardPageMedium.styles";
import NoDataDashboard from "./NoDataDashboard";
import StarOutlinedIcon from '@mui/icons-material/StarOutlined';

const splitEventDay = (dayValue) => {
	const normalizedDay = dayValue == null ? "--" : String(dayValue).trim();
	const isTextDay = /[^0-9]/.test(normalizedDay);
	return {
		day: normalizedDay || "--",
		isTextDay,
	};
};

const buildEventMeta = (item) => {
	const parts = [item.time, item.location].filter(Boolean);
	return parts.join(" • ");
};

const LeadUpcomingEventsCard = ({ data, onActionClick, onItemClick, dragHandleNode }) => {
	const mappedEvents = data.map((item) => ({
		...item,
		id: item.id,
		day: item.day,
		month: item.month,
		title: item.title,
		description: buildEventMeta(item),
		color: item.color,
	}));

	const isEmpty = mappedEvents.length === 0;

	return (
		<LeadPanelCard
			title="SỰ KIỆN SẮP TỚI"
			actionText="Xem tất cả →"
			onActionClick={onActionClick}
			dragHandleNode={dragHandleNode}
		>
			<UpcomingList>
				{isEmpty ? (
					<NoDataDashboard
						icon={StarOutlinedIcon}
						title="Không có sự kiện nào"
						description="Tuần này bạn chưa có sự kiện nào sắp diễn ra"
					/>
				) : (
					mappedEvents.map((item) => {
						const { day, isTextDay } = splitEventDay(item.day);
						return (
							<UpcomingItem
								key={item.id}
								onClick={onItemClick ? onItemClick("events", item) : undefined}
								styleCursor={onItemClick}
							>
								<UpcomingDate>
									<UpcomingDay isTextDay={isTextDay}>{day}</UpcomingDay>
									<UpcomingMonth>{item.month}</UpcomingMonth>
								</UpcomingDate>
								<UpcomingBody>
									<UpcomingTitle>{item.title}</UpcomingTitle>
									<UpcomingMeta>{item.description}</UpcomingMeta>
								</UpcomingBody>
							</UpcomingItem>
						);
					})
				)}
			</UpcomingList>
		</LeadPanelCard>
	);
};

LeadUpcomingEventsCard.propTypes = {
	data: PropTypes.array.isRequired,
	onActionClick: PropTypes.func,
	dragHandleNode: PropTypes.node,
};

export default memo(LeadUpcomingEventsCard);
