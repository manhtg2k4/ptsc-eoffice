import React, { useCallback, useEffect, useState } from "react";
import { Box, Tabs, Tab } from "@mui/material";
import CustomTable from "@components/CustomTable/CustomTable";
import { format } from "date-fns";
import { useToast } from "@components/common/ToastProvider";
import CustomSwipper from "@components/Swipper";
import {
  columns,
  filters,
} from "./constant";
import { useDispatch } from "react-redux"; // useDispatch vẫn được giữ lại để lấy danh sách người dùng
import { getDataListUserByUnit } from "@redux/slices/managementUsersSlice";

import { API_GET_LIST_RECORD_ACCESS_HISTORY_APPROVED, API_GET_LIST_RECORD_ACCESS_HISTORY } from "@EnvironmentFile/constants/urlConfig";
import api from "@services/api";
import { styled } from "@mui/material/styles";
export const StyledTabs = styled(Tabs)(() => ({
  minHeight: 40,
  "& .MuiTabs-indicator": {
    display: "none", // bỏ underline
  },
}));

export const StyledTab = styled(Tab)(({ theme }) => ({
  minHeight: 36,
  padding: "0 14px",
  textTransform: "none",
  fontSize: 14,
  fontWeight: 500,
  borderRadius: 8,              // 👈 bo nhẹ thôi
  marginRight: 8,
  backgroundColor: "#fff",
  border: "1px solid #d9d9d9",  // 👈 viền giống ảnh
  color: "#0c0c0cff",

  "&.Mui-selected": {
    backgroundColor: theme.palette.primary.main,
    borderColor: theme.palette.primary.main,
    color: "#fff",
  },
}));

const TabLabelContainer = styled(Box)(() => ({
  display: "flex",
  alignItems: "center",
  gap: "4px",
}));

const CountBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== "active",
})(({ active }) => ({
  fontWeight: 600,
  color: active ? "#fff" : "#666",
}));

function ApprovalRequestHistory({ open, onClose }) {
  const toast = useToast();
  const dispatch = useDispatch();
  const [, setUsers] = useState([]);
  const [searchParams, setSearchParams] = useState({
    userName: "",
    method: "",
    ip: "",
    startDate: null,
    endDate: null,
  });

  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await dispatch(
          getDataListUserByUnit({ id: "all", limit: 9999 })
        ).unwrap();
        const userOptions = response.data.map((user) => ({
          name: user.username,
          value: user.username,
        }));
        setUsers(userOptions);
      } catch (error) {
        toast("Không thể tải danh sách người dùng!", "error");
      }
    };

    fetchUsers();
  }, [dispatch, toast]);
const TabLabel = ({ label, count, active }) => (
  <TabLabelContainer>
    <Box component="span">{label}</Box>
    <CountBox
      component="span"
      active={active}>
      {count}
    </CountBox>
  </TabLabelContainer>
);


  // Sử dụng useCallback để ổn định tham chiếu của fetchDataFromApi
  const fetchDataFromApi = useCallback(
    async ({ page, limit, query, code, sort }) => {
      if (!page || !limit) {
        return { data: [], total: 0 };
      }
      try {
        const { userName, ip, ...restSearchParams } = searchParams;

        const apiParams = {
          ...restSearchParams,
          // type: "DHVBTC",
          // status: tabValue === 0 ? "APPROVED" : "REJECTED",
          page,
          limit,
          ...(sort && { sort }),
        };

        if (query && Array.isArray(code) && code.length > 0) {
          code.forEach((field) => {
            apiParams[field] = query;
          });
        }

        if (userName) {
          apiParams["userName"] = userName;
        }

        if (ip) {
          apiParams["ipAddress"] = ip;
        }

        Object.keys(apiParams).forEach(
          (key) =>
            (apiParams[key] === null ||
              apiParams[key] === undefined ||
              apiParams[key] === "") &&
            delete apiParams[key]
        );

        const apiUrl = tabValue === 0 ? API_GET_LIST_RECORD_ACCESS_HISTORY_APPROVED : API_GET_LIST_RECORD_ACCESS_HISTORY;
        const response = await api.get(apiUrl, { params: apiParams });
        const rawData = response.data?.data || [];
        const formattedData = rawData.map((item) => ({
          ...item,
          createdAt: item.createdAt
            ? format(new Date(item.createdAt), "dd/MM/yyyy HH:mm:ss")
            : "",
        }));

        return {
          data: formattedData,
          total: response.data?.total || 0,
        };
      } catch (error) {
        toast("Có lỗi xảy ra khi tải dữ liệu!", "error");
        return { data: [], total: 0 };
      }
    },
    [toast, searchParams, tabValue] // Bỏ dispatch khỏi dependency của hàm này
  );

  const handleSearchChange = (field, value) => {
    if (field === "dateRange") {
      setSearchParams((prev) => ({
        ...prev,
        startDate: value.startDate,
        endDate: value.endDate,
      }));
    } else {
      setSearchParams((prev) => ({ ...prev, [field]: value }));
    }
  };
  const onDateRangeChange = ([startDate, endDate]) => {
    handleSearchChange("dateRange", { startDate, endDate });
  };



  return (
    <>
      <CustomSwipper  title="Lịch sử yêu cầu phê duyệt"
      open={open}
      onClose={onClose}
      type="view" // hoặc "edit" tùy mode
      hideBackdrop>
<Box ml={2}>
  <StyledTabs value={tabValue} onChange={handleTabChange}>
    <StyledTab
      label={
        <TabLabel
          label="ĐỒNG Ý"
          // count={23}
          active={tabValue === 0}
        />
      }
    />
    <StyledTab
      label={
        <TabLabel
          label="TỪ CHỐI"
          // count={8}
          active={tabValue === 1}
        />
      }
    />
  </StyledTabs>
</Box>

      
        <CustomTable
          fetchData={fetchDataFromApi}
          columns={columns}
          filter={filters}
          disableSynchronize
          // anableDateRangePicker
          enableTimePicker
          disableAdd
          disableDelete
          disablePaperHeight
          customMaxHeight={330}
          disableAct
          disableCheckbox
          onDateRangeChange={onDateRangeChange}
          // dateRange={{ startDate: searchParams.startDate, endDate: searchParams.endDate }}
          disableExport
					encodeHtml
        >
        </CustomTable>
      </CustomSwipper>
    </>
  );
}

export default ApprovalRequestHistory;
