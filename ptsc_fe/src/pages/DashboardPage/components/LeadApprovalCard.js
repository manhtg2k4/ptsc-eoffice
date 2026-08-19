import React, { useCallback, useState, memo, startTransition, useRef, useLayoutEffect, useEffect } from "react";
import PropTypes from "prop-types";
import LeadPanelCard from "./LeadPanelCard";
import DoughnutChartCard from "./DoughnutChartCard";
import DashboardTabs from "./DashboardTabs";
import {
	// ApprovalActionButton,
	// ApprovalActions,
	// ApprovalActionButtonFlex,
	// GlobalActionRow,
	ApprovalItemWrap,
	ApprovalListInner,
	ApprovalMeta,
	ApprovalMetaLeft,
	ApprovalSender,
	ApprovalTitle,
	BreakdownBar,
	BreakdownBarFill,
	BreakdownLabel,
	BreakdownList,
	BreakdownRow,
	BreakdownTitle,
	BreakdownValue,
	BreakdownWrap,
	OverdueBadge,
	ApprovalScrollPanel,
} from "@styles/DashboardPageMedium.styles";
import NoDataDashboard from "./NoDataDashboard";
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined';
import CircularProgress from '@mui/material/CircularProgress';
const FormButton = React.lazy(() => import("@components/FormButton"));

const ApprovalItem = memo(({ item, onItemClick, handleButtonClick }) => {
	const handleClick = useCallback(() => {
		if (typeof onItemClick === "function") {
			const handler = onItemClick("approvals", item);
			if (handler) handler();
		}
	}, [item, onItemClick]);

	return (
		<ApprovalItemWrap
			overdue={item.overdue}
			onClick={onItemClick ? handleClick : undefined}
			styleCursor={onItemClick}
		>
			<ApprovalMeta>
				<ApprovalMetaLeft>
					<span>{item.typeIcon}</span>
					<ApprovalSender>👤 {item.sender} · Gửi {item.sentAt}</ApprovalSender>
				</ApprovalMetaLeft>
				{item.overdueText ? <OverdueBadge>⚠ {item.overdueText}</OverdueBadge> : null}
			</ApprovalMeta>
			<ApprovalTitle>{item.title}</ApprovalTitle>
			<React.Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '4px 0' }}><CircularProgress size={20} /></div>}>
				<FormButton
					dataDetail={item}
					isDashboardLook
					onClick={handleButtonClick}
				/>
			</React.Suspense>
		</ApprovalItemWrap>
	);
});
ApprovalItem.displayName = "ApprovalItem";

const LeadApprovalCard = ({ data, listProps = {}, onLoadMore, onActionClick, onItemClick, dragHandleNode }) => {
	const [activeTab, setActiveTab] = useState("tongquan");
	const safeData = data && typeof data === "object" ? data : {};
	const summary = Array.isArray(safeData.summary) ? safeData.summary : [];
	const breakdown = Array.isArray(safeData.breakdown) ? safeData.breakdown : [];
	
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
		if (activeTab !== "danhsach") return;
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

	const tabs = [
		{ id: "tongquan", label: "Tổng quan" },
		{ id: "danhsach", label: "Danh sách chờ" },
	];

	const handleTabChange = useCallback((nextTab) => {
		startTransition(() => {
			setActiveTab(nextTab);
		});
		if (nextTab === "danhsach" && approvalList.length === 0 && !loading && !localLoading) {
			if (typeof onLoadMore === "function") {
				isRequestingRef.current = true;
				setLoadingDirection('down');
				setLocalLoading(true);
				onLoadMore(1);
			}
		}
	}, [approvalList.length, loading, localLoading, onLoadMore]);

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

	const handleButtonClick = useCallback((e) => {
		e.stopPropagation();
	}, []);

	return (
		<LeadPanelCard
			title="PHÊ DUYỆT ĐANG CHỜ"
			badgeCount={safeData.pending}
			// badgeCount={safeData.total}
			// actionText="Xem tất cả →"
			onActionClick={onActionClick}
			dragHandleNode={dragHandleNode}
		>
			<DashboardTabs tabs={tabs} activeTab={activeTab} onChange={handleTabChange} variant="medium" />

			{activeTab === "tongquan" ? (
				<ApprovalScrollPanel>
					{summary.length === 0 && breakdown.length === 0 ? (
						<NoDataDashboard
							icon={CheckOutlinedIcon}
							title="Không có yêu cầu phê duyệt nào"
							description="Chưa có yêu cầu phê duyệt nào được trình lên"
						/>
					) : (
						<>
							<DoughnutChartCard
								variant="approval"
								chartData={{
									labels: summary.map((item) => item.label),
									values: summary.map((item) => item.value),
									colors: summary.map((item) =>
										item.color === "green"
											? "#2DB84B"
											: item.color === "orange"
												? "#F5821F"
												: "#E63946"
									),
								}}
								centerText={{
									value: safeData.total,
									label: "yêu cầu",
								}}
								legendItems={summary}
								summaryItems={summary}
							/>

							<BreakdownWrap>
								<BreakdownTitle>{safeData.breakdownTitle}</BreakdownTitle>
								<BreakdownList>
									{breakdown.map((item) => (
										<BreakdownRow key={item.id}>
											<span style={{ fontSize: 13, width: 20, textAlign: "center" }}>{item.icon}</span>
											<BreakdownLabel>{item.label}</BreakdownLabel>
											<BreakdownBar>
												<BreakdownBarFill fillWidth={item.percent} fillColor={item.color} />
											</BreakdownBar>
											<BreakdownValue clText={item.color}>{item.value}</BreakdownValue>
										</BreakdownRow>
									))}
								</BreakdownList>
							</BreakdownWrap>
						</>
					)}
				</ApprovalScrollPanel>
			) : (
				<ApprovalScrollPanel ref={scrollRef} onScroll={handleScroll}>
					{/* ApprovalListInner: không có scroll riêng → ApprovalScrollPanel là scroll container duy nhất */}
					<ApprovalListInner nonePdTop>
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
									<ApprovalItem 
										key={item.id} 
										item={item} 
										onItemClick={onItemClick} 
										handleButtonClick={handleButtonClick} 
									/>
								))}
								{isLoadingEff && loadingDirection === 'down' && (
									<div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
										<CircularProgress size={24} />
									</div>
								)}
							</>
						)}
					</ApprovalListInner>
				</ApprovalScrollPanel>
			)}
		</LeadPanelCard>
	);
};

LeadApprovalCard.propTypes = {
	data: PropTypes.object.isRequired,
	listProps: PropTypes.object,
	onLoadMore: PropTypes.func,
	onActionClick: PropTypes.func,
	onItemClick: PropTypes.func,
	dragHandleNode: PropTypes.node,
};

export default memo(LeadApprovalCard);
