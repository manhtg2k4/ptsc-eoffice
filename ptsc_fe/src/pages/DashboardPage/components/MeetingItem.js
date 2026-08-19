import React, { useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import {
	Circle,
} from "@mui/icons-material";
import {
	MeetingItemWrapper,
	MeetingTimeBox,
	MeetingTimeText,
	MeetingDateText,
	MeetingTitle,
	MeetingContentBox,
	MeetingDetailText,
	MeetingLive,
	MeetingActionRow,
} from "@styles/DashboardPage.styles";
import FormButton from "@components/FormButton";

const MeetingItem = ({ data, onClick }) => {
	const handleButtonClick = useCallback((e) => {
		e.stopPropagation();
	}, []);

	const meetingDate = useMemo(() => {
		if (data?.date) return data.date;
		if (!Array.isArray(data?.meta)) return "";
		const calendarMeta = data.meta.find((item) => item?.icon === "calendar");
		return calendarMeta?.text || "";
	}, [data]);

	const meetingDetail = useMemo(() => {
		if (data?.detail) return data.detail;
		if (!Array.isArray(data?.meta)) return "";
		return data.meta
			.map((item) => item?.text)
			.filter(Boolean)
			.join(" • ");
	}, [data]);

	return (
		<MeetingItemWrapper styleCursor={onClick} onClick={onClick}>
			<MeetingTimeBox timeColor={data.timeColor}>
				<MeetingTimeText>{data.time}</MeetingTimeText>
				{meetingDate ? <MeetingDateText>{meetingDate}</MeetingDateText> : null}
			</MeetingTimeBox>

			<MeetingContentBox>
				<MeetingTitle>{data.title}</MeetingTitle>
				{meetingDetail ? <MeetingDetailText>{meetingDetail}</MeetingDetailText> : null}
				{data.live ? (
					<MeetingLive>
						<Circle /> Đang diễn ra
					</MeetingLive>
				) : null}
				<div onClick={handleButtonClick}>
					<MeetingActionRow>
						<FormButton
							dataDetail={data}
							isDashboardLook
						/>
					</MeetingActionRow>
				</div>
			</MeetingContentBox>
		</MeetingItemWrapper>
	);
};

MeetingItem.propTypes = {
	data: PropTypes.shape({
		type: PropTypes.string,
		timeColor: PropTypes.string,
		time: PropTypes.string,
		title: PropTypes.string,
		meta: PropTypes.arrayOf(
			PropTypes.shape({
				icon: PropTypes.string,
				text: PropTypes.string,
			})
		),
		badge: PropTypes.string,
		onAccept: PropTypes.func,
		onDecline: PropTypes.func,
		onJoin: PropTypes.func,
	}).isRequired,
};

export default MeetingItem;
