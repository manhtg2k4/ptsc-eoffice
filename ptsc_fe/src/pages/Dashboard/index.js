import React, { useState, useEffect, useCallback } from "react";
import {
  Grid,
  Collapse,
  Divider,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Security as SecurityIcon,
} from "@mui/icons-material";

import {
  API_INCOMMING_TEXT_STATISTICS,
  API_OUTGOING_TEXT_STATISTICS,
  API_DASHBOARD_USER_LIST
} from "@EnvironmentFile/constants/urlConfig";
import { useToast } from "@components/common/ToastProvider";
import axiosInstance from "@utils/axiosInstance";
import { API_DASHBOARD_STATISTICAL } from "@EnvironmentFile/constants/ulrConfigNew";
import {
  DashboardContainer,
  ManagementCard,
  ManagementContent,
  ManagementIconWrapper,
  ManagementTitleText,
  StatCardContentWrapper,
  StatCardWrapper,
  StatLabel,
  StatNumber,
  StatsGrid,
  StatisticsTableContainer,
  StatisticsTable,
  StatisticsTableHeaderGroup,
  StatisticsTableHeaderCell,
  StatisticsTableUnitCell,
  StatisticsTableValueCell,
  DateFilterContainer,
  DatePickerWrapper,
} from "@styles/Dashboard/Dasboard.style";
import CustomDatePicker from "@components/CustomDatePicker";
import dayjs from "dayjs";
import PieChartCard from "./Chart";
 

function StatCard(props) {
  const { number, label, variant } = props;
  return (
    <StatCardWrapper elevation={3} variant={variant}>
      <StatCardContentWrapper>
        <StatNumber variant="h2" component="div">
          {number || 0}
        </StatNumber>
        <StatLabel variant="h6">{label}</StatLabel>
      </StatCardContentWrapper>
      {/* <StatCardButton fullWidth buttonColor={buttonColor}>
        Xem chi tiết
      </StatCardButton> */}
    </StatCardWrapper>
  );
}

export default function Dashboard() {
  const [managementInfoOpen, setManagementInfoOpen] = useState(false);
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [documentIncomning, setDocumentIncomning] = useState([]);
  const [documentOutgoing, setDocumentOutgoing] = useState([]);
  const [workRes, setWorkRes] = useState([]);

  const [dashboardStatistical, setDashboardStatistical] = useState({});

  // State cho bộ lọc ngày
  const [fromDate, setFromDate] = useState(dayjs().startOf("month"));
  const [toDate, setToDate] = useState(dayjs().endOf("month"));

  // State cho danh sách thống kê theo đơn vị
  const [userListData, setUserListData] = useState([]);
  const [loadingUserList, setLoadingUserList] = useState(false);

  // Call thống kê
  const fetchDataStatistical = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(API_DASHBOARD_STATISTICAL);
      setDashboardStatistical(res);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      logger.log(error, "error");
      toast(
        error?.response?.data?.message || "Không thể tải dữ liệu thống kê.",
        "error"
      );
    }
  }, [toast]);

  //vb đến
  const fetchDocumentIncomming = useCallback(async () => {
    setLoading(true);
    try {
      const data = await axiosInstance.get(API_INCOMMING_TEXT_STATISTICS);

      // Cập nhật state với dữ liệu từ API
      setDocumentIncomning(data);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      toast(
        error?.response?.data?.message || "Không thể tải dữ liệu thống kê.",
        "error"
      );
      logger.error("Lỗi khi tải dữ liệu Dashboard:", error);
      // Set giá trị mặc định để tránh lỗi render
      setDocumentIncomning([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // vb đến
  const fetchDocumemtOutgoing = useCallback(async () => {
    setLoading(true);
    try {
      // Sử dụng Promise.all để gọi các API song song
      const data = await  
        axiosInstance.get(API_OUTGOING_TEXT_STATISTICS)
         
      
      // Cập nhật state với dữ liệu từ API
      setDocumentOutgoing(data);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      toast("Không thể tải dữ liệu thống kê.", "error");
      logger.error("Lỗi khi tải dữ liệu Dashboard:", error);
      // Set giá trị mặc định để tránh lỗi render
      setDocumentOutgoing([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // hố so công việc

  const fetchWorkRes = useCallback(async () => {
    setLoading(true);
    try {
      // Sử dụng Promise.all để gọi các API song song
      const data = await  
        axiosInstance.get(API_OUTGOING_TEXT_STATISTICS)
         
      
      // Cập nhật state với dữ liệu từ API
      setWorkRes(data);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      toast("Không thể tải dữ liệu thống kê.", "error");
      logger.error("Lỗi khi tải dữ liệu Dashboard:", error);
      // Set giá trị mặc định để tránh lỗi render
      setWorkRes([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);


  useEffect(() => {
    fetchDocumentIncomming();
    fetchDocumemtOutgoing();
    fetchWorkRes();
     
  }, [fetchDocumemtOutgoing, fetchDocumentIncomming, fetchWorkRes, toast]);

  useEffect(() => {
    fetchDataStatistical();
  }, [fetchDataStatistical]);

  function handleManagementToggle() {
    setManagementInfoOpen((prev) => !prev);
  }

  // Fetch danh sách thống kê theo đơn vị
  const fetchUserListData = useCallback(async () => {
    setLoadingUserList(true);
    try {
      const params = {
        startDate: fromDate ? fromDate.startOf("day").toISOString() : undefined,
        endDate: toDate ? toDate.endOf("day").toISOString() : undefined,
      };
      const res = await axiosInstance.get(API_DASHBOARD_USER_LIST, { params });
      if (res?.status === 1 && Array.isArray(res?.data)) {
        setUserListData(res.data);
      } else if (Array.isArray(res)) {
        setUserListData(res);
      } else {
        setUserListData([]);
      }
    } catch (error) {
      logger.error("Lỗi khi tải danh sách thống kê:", error);
      toast(
        error?.response?.data?.message || "Không thể tải danh sách thống kê.",
        "error"
      );
      setUserListData([]);
    } finally {
      setLoadingUserList(false);
    }
  }, [fromDate, toDate, toast]);

  // Handlers cho bộ lọc ngày
  const handleFromDateChange = useCallback((newValue) => {
    setFromDate(newValue);
  }, []);

  const handleToDateChange = useCallback((newValue) => {
    setToDate(newValue);
  }, []);

  // Hàm xây dựng cấu trúc cây từ danh sách phẳng dựa trên level và idOrg
  const buildTreeData = useCallback((data) => {
    if (!Array.isArray(data) || data.length === 0) return [];

    // Tìm level thấp nhất (là level cao nhất trong phân cấp)
    const minLevel = Math.min(...data.map((item) => item.level || 0));

    // Tạo map để tra cứu nhanh theo _id
    const itemMap = {};
    data.forEach((item) => {
      itemMap[item._id] = { ...item, children: [] };
    });

    const rootItems = [];

    // Duyệt và gắn con vào cha
    data.forEach((item) => {
      const mappedItem = itemMap[item._id];
      if (item.level === minLevel || !item.idOrg) {
        // Đây là node gốc (level thấp nhất hoặc không có idOrg)
        rootItems.push(mappedItem);
      } else if (item.idOrg && itemMap[item.idOrg]) {
        // Có cha, gắn vào cha
        itemMap[item.idOrg].children.push(mappedItem);
      } else {
        // Không tìm thấy cha, coi như gốc
        rootItems.push(mappedItem);
      }
    });

    // Hàm flatten cây thành danh sách với thông tin indent
    const flattenTree = (nodes, indentLevel = 0) => {
      let result = [];
      nodes.forEach((node) => {
        result.push({ ...node, indentLevel });
        if (node.children && node.children.length > 0) {
          result = result.concat(flattenTree(node.children, indentLevel + 1));
        }
      });
      return result;
    };

    return flattenTree(rootItems);
  }, []);

  // Dữ liệu đã xây dựng cây với indent
  const treeUserListData = React.useMemo(() => {
    return buildTreeData(userListData);
  }, [userListData, buildTreeData]);

  // Gọi API khi fromDate hoặc toDate thay đổi
  useEffect(() => {
    fetchUserListData();
  }, [fetchUserListData]);

  // Tạo dữ liệu cho biểu đồ từ state
  const incomingDocsData = documentIncomning
    ? Object.values(documentIncomning)
        .filter(
          (item) =>
            typeof item === "object" &&
            item !== null &&
            item.name &&
            item.count !== undefined &&
            item.color !== undefined
        )
        .map((item) => {
          const total = Object.values(documentIncomning).reduce(
            (sum, curr) =>
              typeof curr === "object" && curr !== null && curr.count
                ? sum + curr.count
                : sum,
            0
          );
          const percentage =
            total > 0 ? ((item.count / total) * 100).toFixed(1) : 0;
          return {
            name: item.name,
            value: item.count,
            percentage: percentage,
            color: item.color,
          };
        })
    : [];

  const outgoingDocsData = documentOutgoing
    ? Object.values(documentOutgoing)
        .filter(
          (item) =>
            typeof item === "object" &&
            item !== null &&
            item.name &&
            item.count !== undefined &&
            item.color !== undefined
        )
        .map((item) => {
          const total = Object.values(documentOutgoing).reduce(
            (sum, curr) =>
              typeof curr === "object" && curr !== null && curr.count
                ? sum + curr.count
                : sum,
            0
          );
          const percentage =
            total > 0 ? ((item.count / total) * 100).toFixed(1) : 0;
          return {
            name: item.name,
            value: item.count,
            percentage: percentage,
            color: item.color,
          };
        })
    : [];

  const workRecordsData = workRes
    ? Object.values(workRes)
        .filter(
          (item) =>
            typeof item === "object" &&
            item !== null &&
            item.name &&
            item.count !== undefined &&
            item.color !== undefined
        )
        .map((item) => {
          const total = Object.values(workRes).reduce(
            (sum, curr) =>
              typeof curr === "object" && curr !== null && curr.count
                ? sum + curr.count
                : sum,
            0
          );
          const percentage =
            total > 0 ? ((item.count / total) * 100).toFixed(1) : 0;
          return {
            name: item.name ,
            value: item.count,
            percentage: percentage,
            color: item.color,
          };
        })
    : [];

  return (
    <DashboardContainer>
      <StatsGrid container spacing={3}>
        <Grid item xs={12} md={4}>
          <StatCard
            number={loading ? "..." : dashboardStatistical?.incomingTotalCount}
            label="Văn bản đến chưa xử lý"
            variant="incoming"
            buttonColor="#0284c7"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard
            number={loading ? "..." : dashboardStatistical?.outgoingTotalCount}
            label="Văn bản đi chưa xử lý"
            variant="outgoing"
            buttonColor="#16a34a"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard
            number={loading ? "..." : dashboardStatistical?.taskTotalCount}
            label=" Hồ sơ công việc chưa xử lý"
            variant="work"
            buttonColor="#d97706"
          />
        </Grid>
      </StatsGrid>

      <StatsGrid container spacing={3}>
        <Grid item xs={12} md={4}>
          <PieChartCard
            title="Văn bản đến"
            data={incomingDocsData}
            showLegend
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <PieChartCard title="Văn bản đi" data={outgoingDocsData} showLegend />
        </Grid>
        <Grid item xs={12} md={4}>
          <PieChartCard
            title="Hồ sơ công việc"
            data={workRecordsData}
            showLegend
          />
        </Grid>
      </StatsGrid>

      <ManagementCard elevation={2}>
        <ListItemButton onClick={handleManagementToggle}>
          <ManagementIconWrapper>
            <SecurityIcon />
          </ManagementIconWrapper>
          <ListItemText
            primary={
              <ManagementTitleText variant="h6">
                Thông tin quản lý
              </ManagementTitleText>
            }
          />
          {managementInfoOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </ListItemButton>

        <Collapse in={managementInfoOpen} timeout="auto" unmountOnExit>
          <Divider />
          <ManagementContent>
             {/* Bộ lọc ngày */}
            <DateFilterContainer>
              <DatePickerWrapper>
                <CustomDatePicker
                  label="Từ ngày"
                  value={fromDate}
                  onChange={handleFromDateChange}
                  required
                  maxDate={toDate}
                />
              </DatePickerWrapper>
              <DatePickerWrapper>
                <CustomDatePicker
                  label="Đến ngày"
                  value={toDate}
                  onChange={handleToDateChange}
                  required
                  minDate={fromDate}
                />
              </DatePickerWrapper>
            </DateFilterContainer>
             {/* Bảng thống kê chi tiết theo đơn vị */}
            <StatisticsTableContainer>
              <StatisticsTable>
                <thead>
                  <tr>
                    <th rowSpan={3} style={{ minWidth: 180 }}>Đơn vị</th>
                    <StatisticsTableHeaderGroup colSpan={4}>Văn bản đến</StatisticsTableHeaderGroup>
                    <StatisticsTableHeaderGroup colSpan={3} rowSpan={2}>Văn bản đi</StatisticsTableHeaderGroup>
                    <StatisticsTableHeaderGroup colSpan={4} rowSpan={2}>Hồ sơ công việc</StatisticsTableHeaderGroup>
                  </tr>
                  <tr>
                    {/* Văn bản đến */}
                    <StatisticsTableHeaderCell colSpan={2}>Hoàn Thành</StatisticsTableHeaderCell>
                    <StatisticsTableHeaderCell colSpan={2}>Chưa hoàn thành</StatisticsTableHeaderCell>
                  </tr>
                  <tr>
                    {/* Văn bản đến - Hoàn thành */}
                    <StatisticsTableHeaderCell>Tổng số</StatisticsTableHeaderCell>
                    <StatisticsTableHeaderCell>Quá hạn</StatisticsTableHeaderCell>
                    {/* Văn bản đến - Chưa hoàn thành */}
                    <StatisticsTableHeaderCell>Tổng số</StatisticsTableHeaderCell>
                    <StatisticsTableHeaderCell>Quá hạn</StatisticsTableHeaderCell>
                    {/* Văn bản đi */}
                    <StatisticsTableHeaderCell>Tổng số</StatisticsTableHeaderCell>
                    <StatisticsTableHeaderCell>Chờ xử lý</StatisticsTableHeaderCell>
                    <StatisticsTableHeaderCell>Ban hành</StatisticsTableHeaderCell>
                    {/* Hồ sơ công việc */}
                    <StatisticsTableHeaderCell>Tổng số</StatisticsTableHeaderCell>
                    <StatisticsTableHeaderCell>Chưa xử lý</StatisticsTableHeaderCell>
                    <StatisticsTableHeaderCell>Đang xử lý</StatisticsTableHeaderCell>
                    <StatisticsTableHeaderCell isHighlight>Hoàn thành</StatisticsTableHeaderCell>
                  </tr>
                </thead>
                <tbody>
                  {loadingUserList ? (
                    <tr>
                      <td colSpan={12} style={{ textAlign: "center", padding: "20px" }}>
                        Đang tải dữ liệu...
                      </td>
                    </tr>
                  ) : treeUserListData.length === 0 ? (
                    <tr>
                      <td colSpan={12} style={{ textAlign: "center", padding: "20px" }}>
                        Không có dữ liệu
                      </td>
                    </tr>
                  ) : (
                    treeUserListData.map((item) => (
                      <tr key={item._id}>
                        <StatisticsTableUnitCell indentLevel={item.indentLevel || 0}>
                          {item.nameOrg}
                        </StatisticsTableUnitCell>
                        {/* Văn bản đến - Hoàn thành */}
                        <td>{item.countComplete || 0}</td>
                        <td>{item.countCompleteOutDeadline || 0}</td>
                        {/* Văn bản đến - Chưa hoàn thành */}
                        <td>{item.countNoComplete || 0}</td>
                        <td>{item.countNoCompleteOutDeadline || 0}</td>
                        {/* Văn bản đi */}
                        <td>{item.count || 0}</td>
                        <td>{item.countProcessingDoc || 0}</td>
                        <td>{item.countPromulgateDoc || 0}</td>
                        {/* Hồ sơ công việc */}
                        <td>{item.countTasks || 0}</td>
                        <td>{item.countNoProcessTasks || 0}</td>
                        <td>{item.countProcessingTasks || 0}</td>
                        <StatisticsTableValueCell isHighlight>
                          {item.countCompleteTasks || 0}
                        </StatisticsTableValueCell>
                      </tr>
                    ))
                  )}
                </tbody>
              </StatisticsTable>
            </StatisticsTableContainer>
          </ManagementContent>
        </Collapse>
      </ManagementCard>
    </DashboardContainer>
  );
}
 