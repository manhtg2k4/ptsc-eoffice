import React, { useMemo } from "react";
import PropTypes from "prop-types";
import BoltIcon from "@mui/icons-material/Bolt";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useSelector } from "react-redux";
import {
	AlertAction,
	AlertContent,
	AlertEmText,
	AlertIcon,
	AlertMainText,
	AlertMessageRow,
	AlertRowClickable,
	AlertSubText,
	BannerLeft,
	BannerRoot,
	BoltDecor,
	BossPanel,
	BossPanelBigValue,
	BossPanelColumns,
	BossPanelGoalSubText,
	BossPanelGoalText,
	BossPanelGoalValue,
	BossPanelLabel,
	BossPanelLeftSection,
	BossPanelRightSection,
	BossTrendChip,
	BossTrendDownIcon,
	BossTrendLabel,
	BossTrendUpIcon,
	BossTrendValue,
	DateIcon,
	DateRow,
	DateText,
	GreetingLabel,
	GreetingName,
	GreetingRow,
} from "@styles/Dashboard/Dasboard.style";

const DAYS_VI = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];

const formatViDate = () => {
	const now = new Date();
	const dayName = DAYS_VI[now.getDay()];
	const day = now.getDate();
	const month = now.getMonth() + 1;
	const year = now.getFullYear();
	return `Hôm nay, ${dayName} ngày ${day} tháng ${month < 10 ? "0" + month : month} năm ${year}`;
};

// ─── Component ───────────────────────────────────────────────────────────────

const DashboardGreetingBanner = ({
	alerts,
	alertCount,
	alertText,
	alertSubText,
	onAlertClick,
	// Boss-only props
	showBossPanel,
	bossPerformanceLabel,
	bossCompletedPct,
	bossGoalPct,
	bossTrend,
	bossTrendLabel,
}) => {
	const { dataUser } = useSelector((state) => state.auth);
	// logger.log("Data user", dataUser);
	const displayName = dataUser?.name || dataUser?.username || "Người dùng";
	const dateStr = useMemo(() => formatViDate(), []);

	const dataAlertsCount = alertCount && typeof alertCount === "object"
		? alertCount.pending
		: Array.isArray(alertCount)
			? alertCount.length
			: alertCount;

	const alertList = Array.isArray(alerts) ? alerts : [];
	const primaryAlert = alertList[0];

	const renderAlertLine = (item) => {
		if (!item || typeof item !== "object") return "";
		const emphasis = item?.emphasis || "";
		const text = item?.text || "";
		const suffix = item?.suffix || "";
		const isTextFirst = item?.emphasisFirst === false;

		if (isTextFirst) {
			return (
				<>
					{text ? `${text} ` : ""}
					{emphasis ? `Bạn có ` : ""}
					{emphasis ? <AlertEmText>{emphasis}</AlertEmText> : null}
					{suffix ? ` ${suffix}` : ""}
				</>
			);
		}

		return (
			<>
				{emphasis ? `Bạn có ` : ""}
				{emphasis ? <AlertEmText>{emphasis}</AlertEmText> : null}
				{text ? ` ${text}` : ""}
				{suffix ? ` ${suffix}` : ""}
			</>
		);
	};

	const fallbackMainText = (
		<>
			Bạn có <AlertEmText>{dataAlertsCount || 0} yêu cầu</AlertEmText> phê duyệt đang chờ xử lý.
		</>
	);

	const resolvedMainAlertText = alertText || (primaryAlert ? renderAlertLine(primaryAlert) : fallbackMainText);
	const resolvedAlertSubText = alertSubText || (alertList.length > 1 ? `${alertList.length - 1} cảnh báo khác cần theo dõi.` : "");
	const hasAlertData = Boolean(alertText) || alertList.length > 0 || Number(dataAlertsCount) > 0;

	return (
		<BannerRoot>
			<BannerLeft>
				{/* Greeting */}
				<GreetingRow>
					<GreetingLabel>Xin chào,</GreetingLabel>
					<GreetingName>{displayName}</GreetingName>
					<DateRow>
						<DateIcon />
						<DateText>{dateStr}</DateText>
					</DateRow>
				</GreetingRow>

				{/* Alert row */}
				{hasAlertData && (
					<AlertRowClickable
						onClick={onAlertClick}
						clickable={Boolean(onAlertClick)}
					>
						<AlertMessageRow>
							<AlertIcon>
								<ErrorOutlineOutlinedIcon />
							</AlertIcon>
							<AlertContent>
								<AlertMainText>
									{resolvedMainAlertText}
								</AlertMainText>
								{resolvedAlertSubText && (
									<AlertSubText>{resolvedAlertSubText}</AlertSubText>
								)}
							</AlertContent>
						</AlertMessageRow>
						{onAlertClick && (
							<AlertAction>
								Xem chi tiết
								<ChevronRightIcon />
							</AlertAction>
						)}
					</AlertRowClickable>
				)}
			</BannerLeft>

			{/* Bolt decoration */}
			<BoltDecor>
				<BoltIcon />
			</BoltDecor>

			{/* Boss Performance Panel */}
			{showBossPanel && (
				<BossPanel>
					<BossPanelLabel>{bossPerformanceLabel || "Hiệu suất công việc - Toàn CT"}</BossPanelLabel>
					<BossPanelColumns>
						<BossPanelLeftSection>
							<BossPanelGoalText>Hoàn thành</BossPanelGoalText>
							<BossPanelBigValue>{bossCompletedPct ?? 80}%</BossPanelBigValue>
						</BossPanelLeftSection>
						<BossPanelRightSection>
							<BossPanelGoalSubText>
								Mục tiêu <BossPanelGoalValue>{bossGoalPct ?? 65}%</BossPanelGoalValue>
							</BossPanelGoalSubText>
							{bossTrend !== undefined && (
								<BossTrendChip isUp={bossTrend >= 0}>
									{bossTrend >= 0 ? (
										<BossTrendUpIcon />
									) : (
										<BossTrendDownIcon />
									)}
									<BossTrendValue>{Math.abs(bossTrend)}%</BossTrendValue>
									<BossTrendLabel>{bossTrendLabel || "So với tháng trước"}</BossTrendLabel>
								</BossTrendChip>
							)}
						</BossPanelRightSection>
					</BossPanelColumns>
				</BossPanel>
			)}
		</BannerRoot>
	);
};

DashboardGreetingBanner.propTypes = {
	alerts: PropTypes.arrayOf(
		PropTypes.shape({
			id: PropTypes.string,
			emphasis: PropTypes.string,
			text: PropTypes.string,
			emphasisFirst: PropTypes.bool,
			suffix: PropTypes.string,
		})
	),
	alertCount: PropTypes.number,
	alertText: PropTypes.node,
	alertSubText: PropTypes.string,
	onAlertClick: PropTypes.func,
	showBossPanel: PropTypes.bool,
	bossPerformanceLabel: PropTypes.string,
	bossCompletedPct: PropTypes.number,
	bossGoalPct: PropTypes.number,
	bossTrend: PropTypes.number,
	bossTrendLabel: PropTypes.string,
};

DashboardGreetingBanner.defaultProps = {
	alerts: [],
	showBossPanel: false,
};

export default DashboardGreetingBanner;
