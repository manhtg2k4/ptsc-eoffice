import React, { memo } from "react";
import PropTypes from "prop-types";
import LeadPanelCard from "./LeadPanelCard";
import {
	LeadMeetingActions,
	LeadMeetingBody,
	// LeadMeetingButton,
	LeadMeetingDay,
	LeadMeetingItem,
	LeadMeetingMeta,
	LeadMeetingNote,
	LeadMeetingRight,
	LeadMeetingTime,
	LeadMeetingTimeValue,
	LeadMeetingTitle,
	MeetingList,
	MeetingSeparator,
} from "@styles/DashboardPageMedium.styles";
import FormButton from "@components/FormButton";
import NoDataDashboard from "./NoDataDashboard";
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';

const LeadWeeklyMeetingsCard = ({ data, onActionClick, onItemClick, dragHandleNode }) => {
	const isEmpty = !data || data.length === 0;

	return (
		<LeadPanelCard
			title="LỊCH HỌP TUẦN NÀY"
			actionText="Tất cả →"
			onActionClick={onActionClick}
			dragHandleNode={dragHandleNode}
		>
			<MeetingList>
				{isEmpty ? (
					<NoDataDashboard
						icon={EventAvailableOutlinedIcon}
						title="Không có lịch nào"
						description="Tuần này  bạn chưa có lịch họp nào được lên kết hoạch"
					/>
				) : (
					data.map((group) => (
						<React.Fragment key={group.id}>
							<MeetingSeparator>{group.separator}</MeetingSeparator>
							{group.items.map((item) => (
								<LeadMeetingItem
									key={item.id}
									// onClick={onItemClick ? onItemClick("meetings", item) : undefined}
									styleCursor={onItemClick}
								>
									<LeadMeetingTime blockColor={item.blockColor} onClick={onItemClick ? onItemClick("meetings", item) : undefined}>
										<LeadMeetingTimeValue status={item.status}>{item.time}</LeadMeetingTimeValue>
										<LeadMeetingDay status={item.status}>{item.dayLabel}</LeadMeetingDay>
									</LeadMeetingTime>
									<LeadMeetingBody onClick={onItemClick ? onItemClick("meetings", item) : undefined}>
										<LeadMeetingTitle>{item.title}</LeadMeetingTitle>
										<LeadMeetingMeta>{item.meta}</LeadMeetingMeta>
									</LeadMeetingBody>
									<LeadMeetingRight>
										<LeadMeetingActions>
											<FormButton
												// setReloadData={setReloadData}
												// onClose={onClose}
												dataDetail={item}
												isDashboardLook
											/>
											{/* <LeadMeetingButton variantType="filled" >
                        {item.actionLabel}
                      </LeadMeetingButton>
                      {item.secondaryActionLabel ? (
                        <LeadMeetingButton variantType="outline">
                          {item.secondaryActionLabel}
                        </LeadMeetingButton>
                      ) : null} */}
										</LeadMeetingActions>
										{item.note ? (
											<LeadMeetingNote textColor={item.noteColor}>
												{item.note}
											</LeadMeetingNote>
										) : null}
									</LeadMeetingRight>
								</LeadMeetingItem>
							))}
						</React.Fragment>
					))
				)}
			</MeetingList>
		</LeadPanelCard>
	);
};

LeadWeeklyMeetingsCard.propTypes = {
	data: PropTypes.array.isRequired,
	onActionClick: PropTypes.func,
	dragHandleNode: PropTypes.node,
};

export default memo(LeadWeeklyMeetingsCard);
