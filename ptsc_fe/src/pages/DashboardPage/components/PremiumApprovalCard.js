import React, { useCallback, useState, memo, startTransition, useRef, useLayoutEffect, useEffect } from "react";
import PropTypes from "prop-types";
import PremiumPanelCard from "./PremiumPanelCard";
import {
	// PremiumActionButton,
	PremiumActionRow,
	PremiumApprovalBody,
	PremiumApprovalDesc,
	PremiumApprovalItem,
	PremiumApprovalMeta,
	// PremiumApprovalMetaChip,
	// PremiumApprovalOverdue,
	PremiumApprovalType,
	PremiumAvgBox,
	PremiumAvgChange,
	PremiumAvgInner,
	PremiumAvgLabel,
	PremiumAvgSuffix,
	PremiumAvgValue,
	PremiumContentBody,
	PremiumLegendDot,
	PremiumLegendItem,
	PremiumLegendRow,
	PremiumScrollArea,
	// PremiumSectionTitle,
	PremiumStackedBarRow,
	PremiumStackedBarColumn,
	PremiumStackedBarHead,
	PremiumStackedLabel,
	PremiumStackedSegment,
	PremiumStackedTrack,
	PremiumStackedValue,
	PremiumSummaryBox,
	PremiumSummaryGridFour,
	PremiumSummaryLabel,
	PremiumSummaryValue,
	PremiumApprovalSubDesc,
	SubTextFrom,
} from "@styles/DashboardPagePremium.styles";
const FormButton = React.lazy(() => import("@components/FormButton"));
import NoDataDashboard from "./NoDataDashboard";
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined';
import DashboardTabs from "./DashboardTabs";
import CircularProgress from '@mui/material/CircularProgress';

const PremiumApprovalCard = ({ data = {}, listProps = {}, onLoadMore, onItemClick, dragHandleNode }) => {

	const [activeTab, setActiveTab] = useState("overview");
	const avgProcessing = data?.avgProcessing && typeof data.avgProcessing === "object"
		? data.avgProcessing
		: {};
	
	const { 
		list: approvalList = [], 
		lowestPage = 1, 
		highestPage = 1, 
		hasMore = true, 
		hasMoreUp = false, 
		loading = false 
	} = listProps;

	const [loadingDirection, setLoadingDirection] = useState('down');
	// localLoading: hiển thị spinner ngay lập tức khi scroll, không chờ Redux round-trip
	const [localLoading, setLocalLoading] = useState(false);
	const scrollRef = useRef(null);
	const scrollMetrics = useRef({ scrollHeight: 0, scrollTop: 0 });
	const isPrepending = useRef(false);
	const isRequestingRef = useRef(false);
	// isLoadingEff: dùng trong render để hiển thị spinner (kết hợp local + Redux)
	const isLoadingEff = loading || localLoading;

	useLayoutEffect(() => {
		if (isPrepending.current && scrollRef.current) {
			const el = scrollRef.current;
			const heightDiff = el.scrollHeight - scrollMetrics.current.scrollHeight;
			el.scrollTop = scrollMetrics.current.scrollTop + heightDiff;
			isPrepending.current = false;
		}
	}, [approvalList]);

	useEffect(() => {
		if (!loading) {
			isRequestingRef.current = false;
			// Khi Redux loading xong → reset local loading
			setLocalLoading(false);
		}
	}, [loading]);

	useEffect(() => {
		if (activeTab !== "list") return;
		if (loading || localLoading || isRequestingRef.current) return;
		if (!hasMore) return;
		if (approvalList.length === 0) return;
		const el = scrollRef.current;
		if (!el) return;
		const notFilled = el.scrollHeight <= el.clientHeight + 40;
		if (notFilled && typeof onLoadMore === "function") {
			isRequestingRef.current = true;
			setLoadingDirection('down');
			setLocalLoading(true);
			onLoadMore(highestPage + 1, 'down');
		}
	}, [approvalList, activeTab, hasMore, highestPage, loading, localLoading, onLoadMore]);

	const handleTabChange = useCallback((nextTab) => {
		startTransition(() => {
			setActiveTab(nextTab);
		});
		if (nextTab === "list" && approvalList.length === 0 && !loading && !localLoading) {
			if (typeof onLoadMore === "function") {
				isRequestingRef.current = true;
				setLoadingDirection('down');
				setLocalLoading(true);
				onLoadMore(1);
			}
		}
	}, [approvalList.length, loading, localLoading, onLoadMore]);

	const handleButtonClick = useCallback((e) => {
		e.stopPropagation();
	}, []);

	const handleScroll = useCallback((e) => {
		const el = e.currentTarget;
		if (!el) return;

		// Chặn double-fire: đã có request đang chờ (local flag hoặc Redux loading)
		if (isRequestingRef.current || loading || localLoading) return;

		const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
		if (nearBottom && hasMore) {
			if (typeof onLoadMore === "function") {
				isRequestingRef.current = true;
				// Set localLoading=true ngay lập tức để spinner hiển thị mà không chờ Redux
				setLoadingDirection('down');
				setLocalLoading(true);
				onLoadMore(highestPage + 1, 'down');
			}
			return;
		}

		const nearTop = el.scrollTop < 120;
		if (nearTop && hasMoreUp) {
			if (typeof onLoadMore === "function") {
				scrollMetrics.current = {
					scrollHeight: el.scrollHeight,
					scrollTop: el.scrollTop,
				};
				isPrepending.current = true;
				isRequestingRef.current = true;
				// Set localLoading=true ngay lập tức để spinner hiển thị mà không chờ Redux
				setLoadingDirection('up');
				setLocalLoading(true);
				onLoadMore(lowestPage - 1, 'up');
			}
		}
	}, [hasMore, hasMoreUp, highestPage, lowestPage, loading, localLoading, onLoadMore]);

	const handleItemClick = useCallback(
		(e) => {
			const itemId = e.currentTarget.dataset.id;
			const targetItem = approvalList.find((x) => String(x.id) === String(itemId));
			if (targetItem && typeof onItemClick === "function") {
				const handler = onItemClick("approvals", targetItem);
				if (typeof handler === "function") {
					handler(e);
				}
			}
		},
		[approvalList, onItemClick]
	);

	const getPercent = useCallback((value, total) => {
		if (!total || total <= 0 || !value || value <= 0) return 0;
		return Math.max(0, (value / total) * 100);
	}, []);

	const tabs = [
		{ id: "overview", label: "Tổng quan" },
		{ id: "list", label: "Danh sách chờ" },
	];

	return (
		<PremiumPanelCard title="Phê duyệt cấp TGĐ" badgeCount={data?.total} dragHandleNode={dragHandleNode}>
			<DashboardTabs tabs={tabs} activeTab={activeTab} onChange={handleTabChange} variant="premium" />
			{activeTab === "overview" ? (
				<PremiumContentBody nonePdTop>
						{(Array.isArray(data?.summaryCards) ? data.summaryCards : []).length === 0 && (Array.isArray(data?.categories) ? data.categories : []).length === 0 ? (
							<NoDataDashboard
								icon={CheckOutlinedIcon}
								title="Không có yêu cầu phê duyệt nào"
								description="Chưa có yêu cầu phê duyệt nào được trình lên"
							/>
						) : (
							<>
								<PremiumSummaryGridFour>
									{(Array.isArray(data?.summaryCards) ? data.summaryCards : []).map((item) => (
										<PremiumSummaryBox key={item.id}>
											<PremiumSummaryValue clText={item.color}>{item.value}</PremiumSummaryValue>
											<PremiumSummaryLabel>{item.label}</PremiumSummaryLabel>
										</PremiumSummaryBox>
									))}
								</PremiumSummaryGridFour>

								{/* <PremiumSectionTitle>{data?.stackedTitle}</PremiumSectionTitle> */}
								{(Array.isArray(data?.categories) ? data.categories : []).map((item) => (
									<PremiumStackedBarRow key={item.id}>
										<PremiumStackedBarColumn>
											<PremiumStackedBarHead>
												<PremiumStackedLabel>{item.label}</PremiumStackedLabel>
												<PremiumStackedValue valueSize={14} valueMinWidth={30}>
													{item.total}
												</PremiumStackedValue>
											</PremiumStackedBarHead>
											<PremiumStackedTrack
												trackHeight={18}
												trackRadius={999}
												trackBg="#d8dee6"
												trackFlex="none"
												trackWidth="100%"
											>
												{item.ok ? (
													<PremiumStackedSegment
														segmentWidth={getPercent(item.ok, item.total)}
														segmentColor="#2364B0"
														segmentRadius={item.soon || item.late ? 0 : "999px"}
													/>
												) : null}
												{item.soon ? (
													<PremiumStackedSegment
														segmentWidth={getPercent(item.soon, item.total)}
														segmentColor="#FFA60080"
														segmentRadius={0}
													/>
												) : null}
												{item.late ? (
													<PremiumStackedSegment
														segmentWidth={getPercent(item.late, item.total)}
														segmentColor="#EF535080"
														segmentRadius={item.ok || item.soon ? "0 999px 999px 0" : "999px"}
													/>
												) : null}
											</PremiumStackedTrack>
										</PremiumStackedBarColumn>
									</PremiumStackedBarRow>
								))}

								<PremiumLegendRow>
									<PremiumLegendItem>
										<PremiumLegendDot dotColor="#2364B0" />Trong hạn
									</PremiumLegendItem>
									<PremiumLegendItem>
										<PremiumLegendDot dotColor="#FFA60080" />Đến hạn
									</PremiumLegendItem>
									<PremiumLegendItem>
										<PremiumLegendDot dotColor="#EF535080" />Quá hạn
									</PremiumLegendItem>
								</PremiumLegendRow>

								<PremiumAvgBox>
									<PremiumAvgInner>
										<div>
											<PremiumAvgLabel>Thời gian xử lý trung bình</PremiumAvgLabel>
											<PremiumAvgValue>
												{avgProcessing.value} <PremiumAvgSuffix>{avgProcessing.suffix}</PremiumAvgSuffix>
											</PremiumAvgValue>
										</div>
										<div>
											<PremiumAvgLabel>{avgProcessing.changeLabel}</PremiumAvgLabel>
											<PremiumAvgChange>{avgProcessing.change}</PremiumAvgChange>
										</div>
									</PremiumAvgInner>
								</PremiumAvgBox>
							</>
						)}
				</PremiumContentBody>
			) : null}

			{activeTab === "list" ? (
				<PremiumScrollArea ref={scrollRef} scrollPadding="0px 20px 16px" onScroll={handleScroll}>
					{approvalList.length === 0 && !isLoadingEff ? (
						<NoDataDashboard
							icon={CheckOutlinedIcon}
							title="Không có yêu cầu phê duyệt nào"
							description="Chưa có yêu cầu phê duyệt nào được trình lên"
						/>
					) : (
						<>
							{isLoadingEff && loadingDirection === 'up' && (
								<div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
									<CircularProgress size={24} />
								</div>
							)}
							{approvalList.map((item) => (
								<PremiumApprovalItem
									key={item.id}
									data-id={item.id}
									onClick={handleItemClick}
									styleCursor={onItemClick}
								>
									<PremiumApprovalType approvalType={item.type}>{item.icon}</PremiumApprovalType>
									<PremiumApprovalBody>
										<PremiumApprovalDesc>{item.desc}</PremiumApprovalDesc>
										<PremiumApprovalSubDesc>
											<PremiumApprovalMeta>
												Từ <SubTextFrom>{item.from}</SubTextFrom>
											</PremiumApprovalMeta>
											<div onClick={handleButtonClick}>
												<PremiumActionRow>
													<React.Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '4px 0' }}><CircularProgress size={20} /></div>}>
														<FormButton
															dataDetail={item}
															isDashboardLook
														/>
													</React.Suspense>
												</PremiumActionRow>
											</div>
										</PremiumApprovalSubDesc>
									</PremiumApprovalBody>
								</PremiumApprovalItem>
							))}
							{isLoadingEff && loadingDirection === 'down' && (
								<div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
									<CircularProgress size={24} />
								</div>
							)}
						</>
					)}
				</PremiumScrollArea>
			) : null}
		</PremiumPanelCard>
	);
};

PremiumApprovalCard.propTypes = {
	data: PropTypes.object.isRequired,
	listProps: PropTypes.object,
	onLoadMore: PropTypes.func,
	onItemClick: PropTypes.func,
	dragHandleNode: PropTypes.node,
};

export default memo(PremiumApprovalCard);
