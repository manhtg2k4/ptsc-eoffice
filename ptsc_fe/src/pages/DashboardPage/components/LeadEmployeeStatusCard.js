import React, { useEffect, useMemo, useState, memo } from "react";
import PropTypes from "prop-types";
import LeadPanelCard from "./LeadPanelCard";
import ProgressBar from "./ProgressBar";
import DashboardTabs from "./DashboardTabs";
import {
	BigStatItem,
	BigStatLabel,
	BigStatValue,
	BigStatsRow,
	DeptMetricsWrap,
	EmployeeAvatar,
	EmployeeInfo,
	EmployeeName,
	EmployeeProgressText,
	EmployeeProgressWrap,
	EmployeeRole,
	EmployeeTableWrap,
	EmployeeTask,
	EmployeeTd,
	EmployeeTh,
	LegendItem,
	LegendRow,
	LegendSquare,
	ResourceBar,
	ResourceFill,
	ResourceListScrollPanel,
	ResourceName,
	ResourcePercent,
	ResourceRow,
	ScrollPanel,
	SectionMiniTitle,
	StackedBarWrap,
	StackedSegment,
	StackedTrack,
	StatusBadge,
	StyledEmployeeTable,
	EmployeeTableScrollPanel,
	NoDataContainer,
	NoDataTypography,
	BigStatSubLabel,
} from "@styles/DashboardPageMedium.styles";

const tableHeaders = {
	dang: ["NHÂN VIÊN", "CÔNG VIỆC", "TIẾN ĐỘ", "TRẠNG THÁI"],
	sap: ["NHÂN VIÊN", "CÔNG VIỆC", "TIẾN ĐỘ", "HẠN CÒN LẠI"],
	cham: ["NHÂN VIÊN", "CÔNG VIỆC", "TIẾN ĐỘ", "TRẠNG THÁI"],
};

const rowMap = {
	dang: "activeRows",
	sap: "upcomingRows",
	cham: "delayedRows",
};

const EmployeeStatusTable = ({ rows, tabKey }) => (
	<EmployeeTableWrap>
		<StyledEmployeeTable>
			<thead>
				<tr>
					{(tableHeaders[tabKey] || tableHeaders.dang).map((header) => (
						<EmployeeTh key={header}>{header}</EmployeeTh>
					))}
				</tr>
			</thead>
			<tbody>
				{rows.map((row, index) => (
					<tr key={`${tabKey}-${row?.id ?? index}`}>
						<EmployeeTd>
							<EmployeeInfo>
								<EmployeeAvatar avatarColor={row.avatarColor}>{row.initials}</EmployeeAvatar>
								<div>
									<EmployeeName>{row.name}</EmployeeName>
									<EmployeeRole>{row.role}</EmployeeRole>
								</div>
							</EmployeeInfo>
						</EmployeeTd>
						<EmployeeTd>
							<EmployeeTask>{row.task}</EmployeeTask>
						</EmployeeTd>
						<EmployeeTd>
							<EmployeeProgressWrap>
								<ProgressBar value={row.progress} fillColor={row.progressColor} styledHeight={6} radius={3} trackColor="#e8f0f5" />
								<EmployeeProgressText textColor={row.progressColor}>{row.progress}%</EmployeeProgressText>
							</EmployeeProgressWrap>
						</EmployeeTd>
						<EmployeeTd>
							<StatusBadge statusType={row.statusType}>● {row.statusText}</StatusBadge>
						</EmployeeTd>
					</tr>
				))}
			</tbody>
		</StyledEmployeeTable>
	</EmployeeTableWrap>
);

EmployeeStatusTable.propTypes = {
	rows: PropTypes.array.isRequired,
	tabKey: PropTypes.string.isRequired,
};

const LeadEmployeeStatusCard = ({ data, onActionClick, dragHandleNode }) => {
	const [activeTab, setActiveTab] = useState("chiso");

	const safeData = useMemo(
		() => (data && typeof data === "object" ? data : {}),
		[data]
	);
	const safeStackedBar = useMemo(
		() => (safeData.stackedBar && typeof safeData.stackedBar === "object" ? safeData.stackedBar : {}),
		[safeData]
	);
	const safeTabs = useMemo(
		() => (Array.isArray(safeData.tabs) ? safeData.tabs : []),
		[safeData]
	);
	const safeSegments = useMemo(
		() => (Array.isArray(safeStackedBar.segments) ? safeStackedBar.segments : []),
		[safeStackedBar]
	);
	const safeBigStats = useMemo(
		() => (Array.isArray(safeData.bigStats) ? safeData.bigStats : []),
		[safeData]
	);
	const safeResourceRows = useMemo(
		() => (Array.isArray(safeData.resourceRows) ? safeData.resourceRows : []),
		[safeData]
	);

	useEffect(() => {
		if (safeTabs.length === 0) return;
		if (!safeTabs.some((tab) => tab.id === activeTab)) {
			setActiveTab(safeTabs[0].id);
		}
	}, [safeTabs, activeTab]);

	const currentRows = useMemo(() => {
		const key = rowMap[activeTab];
		if (!key) return [];
		const rows = safeData[key];
		return Array.isArray(rows) ? rows : [];
	}, [activeTab, safeData]);

	const isOverviewTab = activeTab === "chiso" || !rowMap[activeTab];

	return (
		<LeadPanelCard
			title="TÌNH TRẠNG NHÂN SỰ PHÒNG"
			actionText="Xem chi tiết →"
			onActionClick={onActionClick}
			dragHandleNode={dragHandleNode}
		>
			<DashboardTabs
				tabs={safeTabs}
				activeTab={activeTab}
				onChange={setActiveTab}
				variant="medium"
			/>

			{isOverviewTab ? (
				<ScrollPanel>
					{safeSegments.length === 0 && safeBigStats.length === 0 && safeResourceRows.length === 0 ? (
						<NoDataContainer>
							<NoDataTypography>Chưa có dữ liệu hiển thị</NoDataTypography>
						</NoDataContainer>
					) : (
						<>
							<StackedBarWrap>
								<SectionMiniTitle>{safeStackedBar.title}</SectionMiniTitle>
								<LegendRow>
									{safeSegments.map((segment) => (
										<LegendItem key={segment.id}>
											<LegendSquare squareColor={segment.color} />
											{segment.label} ({segment.value})
										</LegendItem>
									))}
								</LegendRow>
								<StackedTrack>
									{safeSegments.map((segment) => (
										<StackedSegment
											key={segment.id}
											segWidth={segment.width}
											segColor={segment.color}
											title={`${segment.label}: ${segment.value} CV`}
										>
											{segment.value}
										</StackedSegment>
									))}
								</StackedTrack>
							</StackedBarWrap>

							<DeptMetricsWrap>
								<BigStatsRow>
									{safeBigStats.map((item) => (
										<BigStatItem key={item.id}>
											<BigStatValue valueColor={item.color}>{item.value}</BigStatValue>
											<BigStatLabel>{item.label}</BigStatLabel>
											<BigStatSubLabel>{item.subLabel}</BigStatSubLabel>
										</BigStatItem>
									))}
								</BigStatsRow>

								<SectionMiniTitle>{safeData.resourceTitle}</SectionMiniTitle>
								<ResourceListScrollPanel>
									{safeResourceRows.map((row) => (
										<ResourceRow key={row.id}>
											<ResourceName>{row.name}</ResourceName>
											<ResourceBar>
												<ResourceFill fillWidth={row.percent} fillColor={row.color} />
											</ResourceBar>
											<ResourcePercent textColor={row.color}>{row.percent}%</ResourcePercent>
										</ResourceRow>
									))}
								</ResourceListScrollPanel>
							</DeptMetricsWrap>
						</>
					)}
				</ScrollPanel>
			) : (
				<EmployeeTableScrollPanel key={activeTab}>
					{currentRows.length === 0 ? (
						<NoDataContainer>
							<NoDataTypography>Chưa có dữ liệu hiển thị</NoDataTypography>
						</NoDataContainer>
					) : (
						<EmployeeStatusTable rows={currentRows} tabKey={activeTab} />
					)}
				</EmployeeTableScrollPanel>
			)}
		</LeadPanelCard>
	);
};

LeadEmployeeStatusCard.propTypes = {
	data: PropTypes.object.isRequired,
	onActionClick: PropTypes.func,
	dragHandleNode: PropTypes.node,
};

export default memo(LeadEmployeeStatusCard);
