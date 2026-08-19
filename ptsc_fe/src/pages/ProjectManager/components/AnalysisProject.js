import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axiosInstance from "@utils/axiosInstance";
import {
  Grid,
  Box,
  IconButton,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as ChartTooltip,
} from 'recharts';
import {
  CheckCircleOutline,
  ErrorOutline,
  TrendingUp,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  AnalysisSummaryCard,
  AnalysisSummaryTitle,
  AnalysisSummaryValue,
  AnalysisSummarySubText,
  AnalysisProgressContainer,
  AnalysisChartBox,
  AnalysisChartTitle,
  AnalysisChartWrapper,
  AnalysisLegend,
  AnalysisLegendDot,
  AnalysisTypographyWeight,
  AnalysisTableContainer,
  AnalysisLinearProgress,
  AnalysisIconWrapper,
  AnalysisChartCenterBox,
  AnalysisChartContainer,
  AnalysisMainWrapper,
  AnalysisGridContainer,
  AnalysisMemberName,
  AnalysisLegendText,
  AnalysisLegendPercentage,
  AnalysisResponsiveContainer,
  AnalysisTypography,
  AnalysisLegendTable,
  AnalysisLegendHeader,
  AnalysisLegendCell,
} from './AddProject.styles';
import CustomTable from '@components/CustomTable/CustomTable';
import { API_PROJECT_MANAGEMENT } from "@EnvironmentFile/constants/urlConfig";
import api from '@services/api';

const MemberSearchWrapper = styled(Box)(({ theme }) => ({
  width: 520,
  maxWidth: '100%',
  border: '1px solid #d0d7de',
  borderRadius: '10px',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'stretch',
  backgroundColor: '#fff',
  marginTop: 18,
  marginLeft: 6,
  [theme.breakpoints.down('sm')]: {
    width: '100%',
  },
}));

const MemberSearchInput = styled('input')({
  flex: 1,
  border: 'none',
  outline: 'none',
  padding: '0 12px',
  fontSize: '12px',
  color: '#4f5b67',
});

const MemberSearchButton = styled(IconButton)({
  width: 44,
  borderRadius: 0,
  backgroundColor: '#0f66b1',
  color: '#fff',
  '&:hover': {
    backgroundColor: '#0b568f',
  },
});

const MemberSearchIcon = styled(SearchIcon)({
  fontSize: 18,
});

const AnalysisProject = ({ projectId, sharedComponents }) => {
  const { toast } = sharedComponents || {};
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [overviewData, setOverviewData] = useState({
    totalTasks: 0,
    completedTasks: 0,
    onTimeTasks: 0,
    overdueTasks: 0,
    progressPercentage: 0
  });

  const [statusData, setStatusData] = useState([]);
  const [membersStats, setMembersStats] = useState([]);
  const [membersTotal, setMembersTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const [performanceData, setPerformanceData] = useState({
    onTime: 0,
    overdue: 0,
    total: 0,
    onTimePercentage: 0,
    overduePercentage: 0
  });

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      if (!projectId) {
        logger.warn("AnalysisProject: projectId is missing");
        return;
      }

      const fetchOverview = async () => {
        try {
          const res = await axiosInstance.get(`${API_PROJECT_MANAGEMENT}/${projectId}/statistics/overview`);
          if (isMounted) {
            const oData = res.data?.data ?? res.data ?? res;
            if (oData && typeof oData === 'object') {
              setOverviewData({
                totalTasks: Number(oData.totalTasks ?? oData.total_tasks ?? 0),
                completedTasks: Number(oData.completedTasks ?? oData.completed_tasks ?? 0),
                onTimeTasks: Number(oData.onTimeTasks ?? oData.on_time_tasks ?? 0),
                overdueTasks: Number(oData.overdueTasks ?? oData.overdue_tasks ?? 0),
                progressPercentage: Number(oData.progressPercentage ?? oData.progress_percentage ?? 0)
              });
            }
          }
        } catch (error) {
          const errMsg = error.response?.data?.message || "Lỗi lấy tổng quan dự án";
          if (error.response?.status === 403) {
            toast?.(errMsg, "error");
          }
          logger.error("Fetch Overview failed:", error);
        }
      };

      const fetchStatus = async () => {
        try {
          const res = await axiosInstance.get(`${API_PROJECT_MANAGEMENT}/${projectId}/statistics/status-distribution`);
          if (isMounted) {
            const sData = res.data?.data ?? res.data ?? res;
            if (Array.isArray(sData)) {
              setStatusData(sData.map(item => ({
                id: item.status ?? item.id,
                name: item.label ?? item.name,
                value: Number(item.count ?? item.value ?? 0),
                percentage: Number(item.percentage ?? 0),
                color: item.color || '#3b82f6'
              })));
            }
          }
        } catch (error) {
          const errMsg = error.response?.data?.message || "Lỗi lấy phân bổ trạng thái";
          // Only toast if not already handled by fetchOverview to avoid multiple toasts
          if (error.response?.status === 403) {
            // Check if we want to show multiple toasts or just one. 
            // Usually one is enough if it's the same permission error.
            toast?.(errMsg, "error");
          }
          logger.error("Fetch Status Distribution failed:", error);
        }
      };

      const fetchPerformance = async () => {
        try {
          const res = await axiosInstance.get(`${API_PROJECT_MANAGEMENT}/${projectId}/statistics/performance`);
          if (isMounted) {
            const pData = res.data?.data ?? res.data ?? res;
            if (pData && typeof pData === 'object') {
              setPerformanceData({
                onTime: Number(pData.onTime ?? 0),
                overdue: Number(pData.overdue ?? 0),
                total: Number(pData.total ?? 0),
                onTimePercentage: Number(pData.onTimePercentage ?? 0),
                overduePercentage: Number(pData.overduePercentage ?? 0)
              });
            }
          }
        } catch (error) {
          const errMsg = error.response?.data?.message || "Lỗi lấy hiệu suất dự án";
          if (error.response?.status === 403) {
            toast?.(errMsg, "error");
          }
          logger.error("Fetch Performance failed:", error);
        }
      };

      Promise.allSettled([
        fetchOverview(),
        fetchStatus(),
        fetchPerformance()
      ]);
    };

    fetchStats();
    return () => { isMounted = false; };
  }, [projectId, toast]);

  // useEffect riêng cho bảng thành viên để hỗ trợ tìm kiếm qua API

  const fetchMembers = useCallback(async (params = {}) => {
      if (!projectId) return { data: [], total: 0 };
      setLoading(true);

      try {
        const { ...restParams } = params;
        delete restParams.sort;
        if (searchTerm && searchTerm.trim() !== "") {
          restParams.search = searchTerm;
        }

        const res = await api.get(`${API_PROJECT_MANAGEMENT}/${projectId}/statistics/members`, {
          params: {
            ...restParams
          }
        });

        const mData = res.data?.data || [];
        const totalItems = res?.data?.total || 0;

        if (Array.isArray(mData) && mData.length > 0) {
          setMembersStats(mData);
          setMembersTotal(totalItems);

          return { data: mData, total: totalItems };
        }
        return { data: [], total: 0 };

      } catch (error) {
        const errMsg = error.response?.data?.message || "Lỗi lấy thống kê thành viên";
        if (error.response?.status === 403) {
          toast?.(errMsg, "error");
        }
        logger.error("Fetch Members Stats failed:", error);
        return { data: [], total: 0 };
      } finally {
        setLoading(false);
      }
    }, [projectId, searchTerm, toast]); 

  const summaryData = useMemo(() => [
    {
      id: 'total',
      title: 'Tổng công việc',
      value: overviewData.totalTasks,
      subText: `${overviewData.completedTasks} hoàn thành`,
      color: '#333',
    },
    {
      id: 'ontime',
      title: 'Đúng hạn',
      value: overviewData.onTimeTasks,
      subText: `${overviewData.totalTasks > 0 ? ((overviewData.onTimeTasks / overviewData.totalTasks) * 100).toFixed(0) : 0}% công việc`,
      color: '#2e7d32',
      icon: <CheckCircleOutline />,
    },
    {
      id: 'overdue',
      title: 'Trễ hạn',
      value: overviewData.overdueTasks,
      subText: `${overviewData.totalTasks > 0 ? ((overviewData.overdueTasks / overviewData.totalTasks) * 100).toFixed(0) : 0}% công việc`,
      color: '#d32f2f',
      icon: <ErrorOutline />,
    },
    {
      id: 'progress',
      title: 'Tiến độ',
      value: `${overviewData.progressPercentage}%`,
      color: '#0288d1',
      icon: <TrendingUp />,
      isProgress: true,
      progress: overviewData.progressPercentage
    },
  ], [overviewData]);

  // Data for Task Status Chart from API
  const taskStatusData = useMemo(() => statusData.length > 0 ? statusData : [
    { id: 'empty', name: 'Không có dữ liệu', value: 0, color: '#f3f4f6', percentage: 0 }
  ], [statusData]);

  // Data for Efficiency Chart from Performance API
  const efficiencyData = useMemo(() => [
    { id: 'eff-ontime', name: 'Đúng hạn', value: performanceData.onTime, color: '#4caf50', percentage: performanceData.onTimePercentage },
    { id: 'eff-overdue', name: 'Trễ hạn', value: performanceData.overdue, color: '#f44336', percentage: performanceData.overduePercentage },
  ], [performanceData]);

  const columns = [
    { name: "Mã nhân viên", row: "userCode" },
    { 
      name: "Tên thành viên", 
      row: "userName",
      accessor: (row) => (
        <AnalysisMemberName isPlaceholder={row.isPlaceholder}>
          {row.userName}
        </AnalysisMemberName>
      )
    },
    { name: "Chức vụ", row: "position" },
    { 
      name: "Số công việc đang đảm nhận", 
      row: "totalAssigned",
      accessor: (row) => <div style={{ textAlign: 'center' }}>{row.totalAssigned}</div>
    },
    { 
      name: "Xử lý chính", 
      row: "mainProcess",
      accessor: (row) => <div style={{ textAlign: 'center' }}>{row.mainProcess}</div>
    },
    { 
      name: "Phối hợp", 
      row: "coordinate",
      accessor: (row) => <div style={{ textAlign: 'center' }}>{row.coordinate}</div>
    },
    { 
      name: "Số công việc hoàn thành", 
      row: "completed",
      accessor: (row) => <div style={{ textAlign: 'center' }}>{row.completed}</div>
    },
    { 
      name: "Số công việc quá hạn", 
      row: "overdue",
      accessor: (row) => <div style={{ textAlign: 'center' }}>{row.overdue}</div>
    },
  ];

  const handleSearchInputChange = useCallback((e) => {
    setSearchInput(e.target.value);
  }, []);

  const handleMemberSearch = useCallback(() => {
    setSearchTerm(searchInput.trim());
  }, [searchInput]);

  const handleSearchKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleMemberSearch();
    }
  }, [handleMemberSearch]);

  return (
    <AnalysisMainWrapper>
      {/* Top Row: Summary Cards */}
      <AnalysisGridContainer container spacing={3}>
        {summaryData.map((item) => (
          <Grid item xs={12} sm={6} md={3} key={item.id}>
            <AnalysisSummaryCard>
              <AnalysisSummaryTitle>
                {item.icon && (
                  <AnalysisIconWrapper iconColor={item.color}>
                    {item.icon}
                  </AnalysisIconWrapper>
                )}
                {item.title}
              </AnalysisSummaryTitle>
              <AnalysisSummaryValue valColor={item.color}>
                {item.value}
              </AnalysisSummaryValue>
              {item.isProgress ? (
                <AnalysisProgressContainer>
                  <AnalysisLinearProgress
                    variant="determinate"
                    value={item.progress || 0}
                    barColor={item.color}
                  />
                </AnalysisProgressContainer>
              ) : (
                <AnalysisSummarySubText>
                  {item.subText}
                </AnalysisSummarySubText>
              )}
            </AnalysisSummaryCard>
          </Grid>
        ))}
      </AnalysisGridContainer>

      {/* Middle Row: Charts */}
      <AnalysisGridContainer container spacing={3}>
        <Grid item xs={12} md={6}>
          <AnalysisChartBox>
            <AnalysisChartTitle>Trạng thái công việc</AnalysisChartTitle>
            <AnalysisChartWrapper>
              <AnalysisChartContainer>
                <AnalysisResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={taskStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {taskStatusData.map((entry) => (
                        <Cell key={`cell-${entry.id}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </AnalysisResponsiveContainer>
                <AnalysisChartCenterBox>
                  <AnalysisTypography variant="caption">Tổng</AnalysisTypography>
                  <AnalysisTypographyWeight variant="h5">{overviewData.totalTasks}</AnalysisTypographyWeight>
                </AnalysisChartCenterBox>
              </AnalysisChartContainer>

              <AnalysisLegend>
                <AnalysisLegendHeader>
                  <AnalysisLegendCell>Tên trạng thái</AnalysisLegendCell>
                  <AnalysisLegendCell align="right">Số lượng</AnalysisLegendCell>
                  <AnalysisLegendCell align="right">%</AnalysisLegendCell>
                </AnalysisLegendHeader>
                <AnalysisLegendTable>
                  {taskStatusData.map((item) => (
                    <React.Fragment key={item.id}>
                      <AnalysisLegendCell>
                        <AnalysisLegendDot dotColor={item.color} />
                        <AnalysisLegendText variant="caption">{item.name}</AnalysisLegendText>
                      </AnalysisLegendCell>
                      <AnalysisLegendCell align="right">
                        <AnalysisLegendText variant="caption">{item.value}</AnalysisLegendText>
                      </AnalysisLegendCell>
                      <AnalysisLegendCell align="right">
                        <AnalysisLegendPercentage variant="caption">
                          {item.percentage}%
                        </AnalysisLegendPercentage>
                      </AnalysisLegendCell>
                    </React.Fragment>
                  ))}
                </AnalysisLegendTable>
              </AnalysisLegend>
            </AnalysisChartWrapper>
          </AnalysisChartBox>
        </Grid>

        <Grid item xs={12} md={6}>
          <AnalysisChartBox>
            <AnalysisChartTitle>Hiệu suất công việc</AnalysisChartTitle>
            <AnalysisChartWrapper>
              <AnalysisChartContainer>
                <AnalysisResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={efficiencyData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {efficiencyData.map((entry) => (
                        <Cell key={`cell-${entry.id}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </AnalysisResponsiveContainer>
                <AnalysisChartCenterBox>
                  <AnalysisTypography variant="caption">Tổng</AnalysisTypography>
                  <AnalysisTypographyWeight variant="h5">{overviewData.totalTasks}</AnalysisTypographyWeight>
                </AnalysisChartCenterBox>
              </AnalysisChartContainer>

              <AnalysisLegend>
                <AnalysisLegendHeader>
                  <AnalysisLegendCell>Hiệu suất</AnalysisLegendCell>
                  <AnalysisLegendCell align="right">Số lượng</AnalysisLegendCell>
                  <AnalysisLegendCell align="right">%</AnalysisLegendCell>
                </AnalysisLegendHeader>
                <AnalysisLegendTable>
                  {efficiencyData.map((item) => (
                    <React.Fragment key={item.id}>
                      <AnalysisLegendCell>
                        <AnalysisLegendDot dotColor={item.color} />
                        <AnalysisLegendText variant="caption">{item.name}</AnalysisLegendText>
                      </AnalysisLegendCell>
                      <AnalysisLegendCell align="right">
                        <AnalysisLegendText variant="caption">{item.value}</AnalysisLegendText>
                      </AnalysisLegendCell>
                      <AnalysisLegendCell align="right">
                        <AnalysisLegendPercentage variant="caption">
                          {item.percentage}%
                        </AnalysisLegendPercentage>
                      </AnalysisLegendCell>
                    </React.Fragment>
                  ))}
                </AnalysisLegendTable>
              </AnalysisLegend>
            </AnalysisChartWrapper>
          </AnalysisChartBox>
        </Grid>
      </AnalysisGridContainer>

      {/* Bottom Section: Members Table */}
      <AnalysisChartBox>
        <AnalysisChartTitle>Thành viên dự án</AnalysisChartTitle>
        <MemberSearchWrapper>
          <MemberSearchInput
            type="text"
            value={searchInput}
            onChange={handleSearchInputChange}
            onKeyDown={handleSearchKeyDown}
            placeholder="Tìm kiếm theo tên thành viên"
          />
          <MemberSearchButton onClick={handleMemberSearch}>
            <MemberSearchIcon />
          </MemberSearchButton>
        </MemberSearchWrapper>

        <AnalysisTableContainer>
          <CustomTable
            columns={columns}
            data={membersStats}
            total={membersTotal}
            fetchData={fetchMembers}
            disableCheckbox
            disablePaperHeight
            disableFilter
            disableAdd
            disableDelete
            disableSynchronize
            customMaxHeight={400}
            disableSort
            disableDefaultSort
            onlyTable={false}
            loading={loading}
            disableAct
						encodeHtml
          />
        </AnalysisTableContainer>
      </AnalysisChartBox>
    </AnalysisMainWrapper>
  );
};

export default AnalysisProject;
