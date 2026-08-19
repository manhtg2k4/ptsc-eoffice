import React, { memo, useCallback } from "react";
import PropTypes from "prop-types";
import PremiumPanelCard from "./PremiumPanelCard";
import {
	PremiumActionRow,
	// PremiumActionButton,
	// PremiumActionRow,
	// PremiumJoinButton,
	PremiumMeetingBody,
	PremiumMeetingDate,
	PremiumMeetingDetail,
	PremiumMeetingHour,
	PremiumMeetingItem,
	PremiumMeetingLive,
	PremiumMeetingTimeCol,
	PremiumMeetingTitle,
	PremiumPulseDot,
	PremiumScrollArea,
} from "@styles/DashboardPagePremium.styles";
import FormButton from "@components/FormButton";
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import NoDataDashboard from "./NoDataDashboard";


const PremiumMeetingsCard = ({ data, onItemClick, onActionClick, dragHandleNode }) => {
	const createClickHandler = useCallback(
		(item) => () => {
			onItemClick?.("meetings", item);
		},
		[onItemClick]
	);

	const handleButtonClick = useCallback((e) => {
		e.stopPropagation();
	}, []);
	return (
		<PremiumPanelCard title="Lịch họp & Sự kiện" actionText="Tất cả →" onActionClick={onActionClick} dragHandleNode={dragHandleNode}>
			<PremiumScrollArea>
				{(Array.isArray(data) ? data : []).length === 0 ? (
					<NoDataDashboard
						icon={EventAvailableOutlinedIcon}
						title="Không có lịch nào"
						description="Tuần này  bạn chưa có lịch họp nào được lên kết hoạch"
					/>
				) : (
					(Array.isArray(data) ? data : []).map((item) => (
						<PremiumMeetingItem
							key={item.id}
							onClick={createClickHandler(item)}
							styleCursor={!!onItemClick}
						>
							<PremiumMeetingTimeCol bgCl={item.blockColor}>
								<PremiumMeetingHour>
									{item.time}
								</PremiumMeetingHour>
								<PremiumMeetingDate>
									{item.date}
								</PremiumMeetingDate>
							</PremiumMeetingTimeCol>
							<PremiumMeetingBody>
								<PremiumMeetingTitle>{item.title}</PremiumMeetingTitle>
								<PremiumMeetingDetail>{item.detail}</PremiumMeetingDetail>
								{item.live ? (
									<PremiumMeetingLive>
										<PremiumPulseDot /> Đang diễn ra
									</PremiumMeetingLive>
								) : null}
								<div onClick={handleButtonClick}>
									<PremiumActionRow justifyContentEnd="end">
										<FormButton
											dataDetail={item}
											isDashboardLook
										/>
									</PremiumActionRow>
								</div>
							</PremiumMeetingBody>
						</PremiumMeetingItem>
					))
				)}
			</PremiumScrollArea>
		</PremiumPanelCard>
	);
};

PremiumMeetingsCard.propTypes = {
	data: PropTypes.array.isRequired,
	onItemClick: PropTypes.func,
	onActionClick: PropTypes.func,
	dragHandleNode: PropTypes.node,
};

export default memo(PremiumMeetingsCard);
