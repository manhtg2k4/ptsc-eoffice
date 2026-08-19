import React, { useCallback, useMemo, useState, memo } from "react";
import PropTypes from "prop-types";
import LeadPanelCard from "./LeadPanelCard";
import {
	CertifyToggle,
	DocumentBody,
	DocumentFrom,
	DocumentItem,
	DocumentList,
	DocumentMetaRow,
	DocumentTag,
	DocumentTagRow,
	DocumentTime,
	DocumentTitle,
} from "@styles/DashboardPageMedium.styles";
import DashboardTabs from "./DashboardTabs";
import NoDataDashboard from "./NoDataDashboard";
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';

const normalizeTagType = (type) => {
	const map = {
		"red-solid": "redSolid",
		"orange-solid": "orangeSolid",
	};
	return map[type] || type;
};

const splitDocumentTime = (timeValue) => {
	if (timeValue && typeof timeValue === "object") {
		const dayValue = timeValue.day ?? "--";
		const monthValue = timeValue.month ?? "";
		return {
			day: String(dayValue),
			month: String(monthValue),
		};
	}

	const rawTime = typeof timeValue === "string" ? timeValue.trim() : "";
	if (!rawTime) {
		return { day: "--", month: "" };
	}

	const normalizedTime = rawTime.replace(/\s+/g, " ");
	const dayMatch = normalizedTime.match(/\d{1,2}/);
	const day = dayMatch?.[0] || normalizedTime.slice(0, 2);
	const month = normalizedTime.replace(day, "").trim();

	return {
		day,
		month,
	};
};

const LeadDocumentCard = ({ data, onActionClick, onItemClick, dragHandleNode }) => {
	const incoming = useMemo(() => Array.isArray(data?.incoming) ? data.incoming : [], [data?.incoming]);
	const outgoing = useMemo(() => Array.isArray(data?.outgoing) ? data.outgoing : [], [data?.outgoing]);

	const [activeTab, setActiveTab] = useState("incoming");
	const [certifyMap, setCertifyMap] = useState(() => {
		const initialState = {};
		incoming.forEach((item) => {
			if (typeof item.certify === "boolean") {
				initialState[item.id] = item.certify;
			}
		});
		return initialState;
	});

	const currentList = useMemo(
		() => (activeTab === "incoming" ? incoming : outgoing),
		[activeTab, incoming, outgoing]
	);

	const tabs = useMemo(
		() => [
			{
				id: "incoming",
				label: "VĂN BẢN ĐẾN MỚI NHẤT",
				badge: {
					value: incoming.length,
					color: "#0F5FA6",
					bgColor: "#DCEEFF",
				},
			},
			{
				id: "outgoing",
				label: "VĂN BẢN ĐI MỚI NHẤT",
				badge: {
					value: outgoing.length,
					color: "#8A5A00",
					bgColor: "#FFF0D8",
				},
			},
		],
		[incoming.length, outgoing.length]
	);

	const handleToggleCertify = useCallback((event) => {
		const { id } = event.currentTarget.dataset;
		setCertifyMap((prev) => ({
			...prev,
			[id]: !prev[id],
		}));
	}, []);

	return (
		<LeadPanelCard
			title="ĐIỀU HÀNH VĂN BẢN"
			actionText="Tất cả →"
			onActionClick={onActionClick}
			dragHandleNode={dragHandleNode}
		>
			<DashboardTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} variant="medium" />

			<DocumentList>
				{currentList.length === 0 ? (
					<NoDataDashboard
						icon={InsertDriveFileRoundedIcon}
						title="Không có văn bản nào"
						description="Không có văn bản nào"
					/>
				) : (
					currentList.map((item) => {
						const { day, month } = splitDocumentTime(item.time);
						const isTextDay = /[^0-9]/.test(day);
						return (
							<DocumentItem
								key={item.id}
								onClick={onItemClick ? onItemClick("tasks", item) : undefined}
								styleCursor={onItemClick}
							>
								<DocumentTime>
									<span className={"document-day" + (isTextDay ? " is-text" : "")}>{day}</span>
									<span className="document-month">{month}</span>
								</DocumentTime>
								<DocumentBody>
									<DocumentTitle>{item.title}</DocumentTitle>
									<DocumentMetaRow>
										<DocumentFrom>{item.from}</DocumentFrom>
										<DocumentTagRow>
											{item.tags?.map((tag) => (
												<DocumentTag key={tag.id} tagType={normalizeTagType(tag.color)}>
													{tag.label}
												</DocumentTag>
											))}
											{activeTab === "incoming" && Object.prototype.hasOwnProperty.call(certifyMap, item.id) ? (
												<CertifyToggle active={certifyMap[item.id]} onClick={handleToggleCertify} data-id={item.id}>
													{certifyMap[item.id] ? "Ký sao y" : "Thường"}
												</CertifyToggle>
											) : null}
										</DocumentTagRow>
									</DocumentMetaRow>
								</DocumentBody>
							</DocumentItem>
						);
					})
				)}
			</DocumentList>
		</LeadPanelCard>
	);
};

LeadDocumentCard.propTypes = {
	data: PropTypes.object.isRequired,
	onActionClick: PropTypes.func,
	dragHandleNode: PropTypes.node,
};

export default memo(LeadDocumentCard);
