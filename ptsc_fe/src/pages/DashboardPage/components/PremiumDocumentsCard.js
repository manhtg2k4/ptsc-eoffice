import React, { useMemo, useState, memo } from "react";
import PropTypes from "prop-types";
import PremiumPanelCard from "./PremiumPanelCard";
import DashboardTabs from "./DashboardTabs";
import {
	PremiumBarColumnWrap,
	PremiumBarMonthGroup,
	PremiumBarPair,
	PremiumCategoryCard,
	PremiumCategoryGridFour,
	PremiumCategoryLabel,
	PremiumCategoryValue,
	PremiumContentBody,
	PremiumDocumentBody,
	PremiumDocumentFrom,
	PremiumDocumentItem,
	PremiumDocumentMetaRow,
	PremiumDocumentTime,
	PremiumDocumentTitle,
	PremiumDocumentUrgency,
	PremiumLegendDot,
	PremiumLegendItem,
	PremiumLegendRow,
	PremiumMonthBars,
	PremiumMonthLabel,
	PremiumMonthLabels,
	PremiumScrollArea,
	PremiumSectionTitle,
	PremiumSummaryBox,
	PremiumSummaryLabel,
	PremiumSummaryValue,
	PremiumSummaryGridThree,
	PremiumDocumentTimeCol,
} from "@styles/DashboardPagePremium.styles";
import NoDataDashboard from "./NoDataDashboard";
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';


const getTone = (tone) => {
	if (tone === "green") {
		return "success";
	}
	if (tone === "orange") {
		return "warning";
	}
	if (tone === "blue") {
		return "blue";
	}
	return "default";
};

const PremiumDocumentsCard = ({ data = {}, onItemClick, dragHandleNode }) => {
	const [activeTab, setActiveTab] = useState("overview");
	const overview =
		data?.overview && typeof data.overview === "object" ? data.overview : {};
	const incomingValues = useMemo(
		() => (Array.isArray(overview.incoming) ? overview.incoming : []),
		[overview.incoming]
	);
	const outgoingValues = useMemo(
		() => (Array.isArray(overview.outgoing) ? overview.outgoing : []),
		[overview.outgoing]
	);
	const maxValue = useMemo(() => {
		const values = [...incomingValues, ...outgoingValues];
		return values.length > 0 ? Math.max(...values) : 1;
	}, [incomingValues, outgoingValues]);
	const tabs = useMemo(
		() => [
			{ id: "overview", label: "Tổng quan" },
			{ id: "incoming", label: "Văn bản đến" },
			{ id: "outgoing", label: "Văn bản đi" },
		],
		[]
	);

	const currentList = useMemo(() => {
		if (activeTab === "incoming") {
			return Array.isArray(data?.incoming) ? data.incoming : [];
		}
		if (activeTab === "outgoing") {
			return Array.isArray(data?.outgoing) ? data.outgoing : [];
		}
		return [];
	}, [activeTab, data?.incoming, data?.outgoing]);

	return (
		<PremiumPanelCard title="Điều hành văn bản toàn Công ty" dragHandleNode={dragHandleNode}>
			<DashboardTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

			{activeTab === "overview" ? (
				<PremiumContentBody nonePdTop>
					{(Array.isArray(overview.summaryCards) ? overview.summaryCards : []).length === 0 && (Array.isArray(overview.categories) ? overview.categories : []).length === 0 ? (
						<NoDataDashboard
							icon={InsertDriveFileRoundedIcon}
							title="Không có văn bản nào"
							description="Không có văn bản nào"
						/>
					) : (
						<>
							<PremiumSectionTitle>{overview.title}</PremiumSectionTitle>
							<PremiumSummaryGridThree>
								{/* <PremiumSummaryGridFour> */}
								{(Array.isArray(overview.summaryCards)
									? overview.summaryCards
									: []
								).map((item) => (
									<PremiumSummaryBox key={item.id} tone={getTone(item.color)}>
										<PremiumSummaryLabel>{item.title}</PremiumSummaryLabel>
										<PremiumSummaryValue clText={item.color}>
											{item.value}
										</PremiumSummaryValue>
									</PremiumSummaryBox>
								))}
							</PremiumSummaryGridThree>

							<PremiumBarColumnWrap>
								{(Array.isArray(overview.months) ? overview.months : []).map(
									(month, index) => {
										const incomingValue = incomingValues[index] ?? 0;
										const outgoingValue = outgoingValues[index] ?? 0;
										const incomingHeight = `${(incomingValue / maxValue) * 140}px`;
										const outgoingHeight = `${(outgoingValue / maxValue) * 140}px`;
										return (
											<PremiumBarMonthGroup key={month}>
												<PremiumBarPair>
													<PremiumMonthBars
														barHeight={incomingHeight}
														barColor="#2364B0"
														labelColor="#2364B0"
														data-label={incomingValue}
													/>
													<PremiumMonthBars
														barHeight={outgoingHeight}
														barColor="#E8EDF2"
														labelColor="#5C6B7B"
														// labelColor="#E8EDF2"
														data-label={outgoingValue}
													/>
												</PremiumBarPair>
											</PremiumBarMonthGroup>
										);
									}
								)}
							</PremiumBarColumnWrap>
							<PremiumMonthLabels>
								{(Array.isArray(overview.months) ? overview.months : []).map(
									(month) => (
										<PremiumMonthLabel key={month}>{month}</PremiumMonthLabel>
									)
								)}
							</PremiumMonthLabels>

							<PremiumLegendRow>
								<PremiumLegendItem>
									<PremiumLegendDot dotColor="#2364B0" />
									Văn bản đến
								</PremiumLegendItem>
								<PremiumLegendItem>
									<PremiumLegendDot dotColor="#E8EDF2" />
									Văn bản đi
								</PremiumLegendItem>
							</PremiumLegendRow>

							<PremiumSectionTitle stCl="#2364B0">{overview.categoryTitle}</PremiumSectionTitle>
							<PremiumCategoryGridFour>
								{(Array.isArray(overview.categories)
									? overview.categories
									: []
								).map((item) => (
									<PremiumCategoryCard key={item.id} bgCl={item.bgCl}>
										<PremiumCategoryLabel colorText={item.color}>
											{item.label}
										</PremiumCategoryLabel>
										<PremiumCategoryValue colorText={item.color}>
											{item.value}
										</PremiumCategoryValue>
									</PremiumCategoryCard>
								))}
							</PremiumCategoryGridFour>
						</>
					)}
				</PremiumContentBody>
			) : (
				<PremiumScrollArea>
					{currentList.length === 0 ? (
						<NoDataDashboard
							icon={InsertDriveFileRoundedIcon}
							title="Không có văn bản nào"
							description="Không có văn bản nào"
						/>
					) : (
						currentList.map((item) => (
							<PremiumDocumentItem
								key={item.id}
								onClick={onItemClick ? onItemClick("documents", item) : undefined}
								styleCursor={onItemClick}
							>
								<PremiumDocumentTimeCol>
									<PremiumDocumentTime>{item.time}</PremiumDocumentTime>
								</PremiumDocumentTimeCol>
								<PremiumDocumentBody>
									<PremiumDocumentTitle>{item.title}</PremiumDocumentTitle>
									<PremiumDocumentMetaRow>
										<PremiumDocumentFrom>{item.from}</PremiumDocumentFrom>
										<PremiumDocumentUrgency urgencyType={item.urgency}>
											{item.urgLabel}
										</PremiumDocumentUrgency>
									</PremiumDocumentMetaRow>
								</PremiumDocumentBody>
							</PremiumDocumentItem>
						))
					)}
				</PremiumScrollArea>
			)}
		</PremiumPanelCard>
	);
};

PremiumDocumentsCard.propTypes = {
	data: PropTypes.object.isRequired,
	onItemClick: PropTypes.func,
	dragHandleNode: PropTypes.node,
};

export default memo(PremiumDocumentsCard);
