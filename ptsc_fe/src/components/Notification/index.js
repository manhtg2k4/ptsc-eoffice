import React, { useCallback, useState, Suspense } from "react";
import { NotificationContext } from "../NotificationContext";
import { useDispatch, useSelector } from "react-redux";
import { setNotificationPreviousTitle } from "@redux/slices/layoutSlice";
import withSharedComponents from "@components/WrapperComponent";
import { PageContainer, TabsContainer, StyledTabs, StyledTab, TabLabelContainer, CountBadge, HeaderContainer, BackButton, TableContainer } from "./Notifications.styles";
import { useNavigate } from "react-router-dom";
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import Loading from "@components/Loading/Loading";
import { getComponentByKey } from "@builder-table/components/componentRegistry";
import api from "@services/api";
import { API_NOTIFICATION, API_DELETE_NOTIFICATION } from "@EnvironmentFile/constants/urlConfig";
import { useToast } from "@components/common/ToastProvider";
// import Typography from "@mui/material/Typography";
import {SkyTypography} from "@styles/SkyStyles";
import { styled } from "@mui/material";
// import Box from "@mui/material/Box";

const SUBTABS = [
  { label: "TẤT CẢ", countKey: "total", keys: [] },
  { label: "VĂN BẢN", countKey: "document", keys: ["VIEW_INCOMING_DOC", "VIEW_OUTCOMING_DOC"] },
  { label: "CÔNG VIỆC", countKey: "task", keys: ["VIEW_TASK_APPROVAL", "VIEW_TASK_ADJUSTMENT", "VIEW_TASK", "TASK_APPROVAL_APPROVED", "VIEW_PROJECT", "TASK_APPROVAL_REJECTED", "TASK_ADJUSTMENT_REJECTED"] },
  { label: "LỊCH HỌP", countKey: "meeting", keys: ["VIEW_MEETING_ROOM", "VIEW_PROCESSING_SCHEDULE"] },
  { label: "TIN TỨC", countKey: "news", keys: ["VIEW_NEWS", "VIEW_RECALL", "VIEW_APPROVE", "VIEW_NEWS_REJECT", "VIEW_NEWS_CANCELLED", "NEWS_DETAIL_VIEW"] },
  { label: "HỘ CHIẾU", countKey: "passport", keys: ["VIEW_PASSPORT_LIST"] },
  { label: "ĐĂNG KÝ XE", countKey: "vehicle", keys: ["VIEW_NEW_REQUEST"] },
  { label: "KHÁC", countKey: "other", keys: ["OTHER"] },
];

const columns = [
  { name: "Tên thông báo", row: "content" },
  // { name: "Danh mục", row: "category" },
  // { name: "Số văn bản", row: "toBook" },
  // { name: "Trích yếu", row: "abstractNote" },
  { name: "Thời gian", row: "createdAt" },
];
const StyledLimitTags = styled(SkyTypography)(({ theme }) => ({
  fontWeight: 700,
  fontSize: '32px',
  color: theme.palette.primary.main,
  textTransform: 'none',
}));

const StyledLabelSubtab = styled(SkyTypography)(({ isActive }) => ({
  fontWeight: 700,
   fontSize: '13px',
    textTransform: 'uppercase',
     color: isActive ? '#FFFFFF' : 'inherit',
}));

const filter = [
  // { name: "Danh mục", code: "category" },
  // { name: "Số văn bản", code: "toBook" },
  // { name: "Trích yếu", code: "abstractNote" },
  { name: "Tên thông báo", code: "content" },
];

const NotificationsPage = ({ sharedComponents }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const dispatch = useDispatch();
  const currentSwiperTitle = useSelector((state) => state.layout.currentSwiperTitle || "");
  const currentPageTitle = useSelector((state) => state.layout.currentPageTitle || "");
  
  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);
  const [reloadData, setReloadData] = useState(null);
  const [activeComponent, setActiveComponent] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [tabCounts, setTabCounts] = useState({});
  const [openDialogDlt, setOpenDialogDlt] = useState(false);
  const [idsToDelete, setIdsToDelete] = useState(null);
  const logger = console;

  // const handleRowClick = (row) => {
  //   if (row.key && row.recordId) {
  //     const componentInfo = getComponentByKey(row.key);
  //     if (componentInfo) {
  //       setActiveComponent({
  //         Component: componentInfo.component,
  //         props: {
  //           ...componentInfo.defaultProps,
  //           open: true,
  //           onClose: () => setActiveComponent(null),
  //           documentId: row.recordId,
  //         },
  //       });
  //     }
  //   }
  // };
    const handleRowClick = async (row) => {
    dispatch(setNotificationPreviousTitle(currentSwiperTitle || currentPageTitle));
    // Chỉ gọi API nếu thông báo chưa đọc
    if (!row.isRead) {
      try {
        await api.patch(`${API_NOTIFICATION}/${row.id}`, { isRead: true });
        // Trigger table reload
        setReloadData(new Date().getTime());
      } catch (error) {
        toast("Không thể đánh dấu đã đọc thông báo.", "error");
      }
    }

    if (row.key === "NEWS_DETAIL_VIEW" && row.link) {
      navigate(row.link);
      return;
    }

    // Luôn mở dialog chi tiết
    if (!row.key || !row.recordId) return;
    const componentInfo = getComponentByKey(row.key);
    if (!componentInfo) return;

    let queryProps = {};
    if (row.link && row.link.includes('?')) {
      try {
        const queryString = row.link.split('?')[1];
        const searchParams = new URLSearchParams(queryString);
        queryProps = Object.fromEntries(searchParams.entries());
      } catch (e) {
        logger.error("Error parsing link query params", e);
      }
    }

    setActiveComponent({
      Component: componentInfo.component,
      props: { 
        ...componentInfo.defaultProps, 
        ...queryProps,
        open: true, 
        onClose: () => setActiveComponent(null), 
        documentId: row.recordId, 
        meetingId: row.recordId, 
        vehicleRegistrationId: row.recordId,
        newsId: row.recordId,
        passportRequestId: row.recordId,
        id: row.recordId,
        isFromNotification: true,
				...(row?.isVanThuCuc && { isVanThuCuc: row.isVanThuCuc }),
				...(row.key === "STAT_CARD_DETAIL_DIALOG" && {
					statBlock: {
						code: "delay",
						label: "Danh sách công việc chậm tiến độ",
					},
				}),
      },
    });
  };

  const handleMarkReadUnread = async (row, isRead) => {
    try {
      await api.patch(`${API_NOTIFICATION}/${row.id}`, { isRead });
      toast(`Đã đánh dấu là ${isRead ? "đã" : "chưa"} đọc`, "success");
      setReloadData(new Date().getTime());
    } catch (error) {
      toast("Thao tác thất bại", "error");
    }
  };

  const handleOpenDialogDlt = useCallback((ids) => {
    setIdsToDelete(ids);
    setOpenDialogDlt(true);
  }, []);

  const handleCloseDialogDlt = useCallback(() => {
    setIdsToDelete(null);
    setOpenDialogDlt(false);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!idsToDelete) return;
    try {
      // Đảm bảo ids luôn là mảng số nguyên
      const idsArray = (Array.isArray(idsToDelete) ? idsToDelete : [idsToDelete]).map(id => Number(id));
      await api.delete(API_DELETE_NOTIFICATION, { data: { ids: idsArray } });
      toast("Xoá thông báo thành công.", "success");
      handleCloseDialogDlt();
      setReloadData(new Date().getTime());
    } catch (error) {
      toast("Không thể xoá thông báo.", "error");
    }
  }, [idsToDelete, toast, handleCloseDialogDlt]);

  const fetchData = useCallback(async ({ page, limit, query, code, sort, hidden}) => {
    try {
      // Xây dựng các tham số cho API
      const params = {
        page: page || 1,
        limit: limit || 25,
        sort: sort || "-createdAt", // Sắp xếp theo ngày tạo mới nhất làm mặc định
      };

      if (hidden !== undefined && hidden !== null) {
        params["filter[hidden]"] = hidden;
      }

      // Chỉ thêm filter key nếu không phải tab "TẤT CẢ"
      if (SUBTABS[currentTab].keys && SUBTABS[currentTab].keys.length > 0) {
        params["filter[key]"] = SUBTABS[currentTab].keys;
      }

      
      // Nếu có từ khóa tìm kiếm và trường được chọn, thêm vào filter
      if (query && code && Array.isArray(code)) {
        code.forEach((c) => {
          params[`filter[${c}]`] = query;
        });
      }
      const response = await api.get(API_NOTIFICATION, { params });

      // Cập nhật số đếm từ BE trả về
      if (response?.data?.counts) {
        setTabCounts(response.data.counts);
      } else if (response?.counts) {
        setTabCounts(response.counts);
      } else if (response?.data?.count) {
        setTabCounts(response.data.count);
      }

      if (response?.data?.data && Array.isArray(response.data.data)) {
        const formatted = response.data.data.map(notif => ({
          ...notif,
          id: notif.id || notif._id,
          content: notif.content || "Không có tiêu đề",
          category: notif.category || "Thông báo chung",
          toBook: notif.toBook || notif.documentNumber || "N/A",
          abstractNote: notif.abstractNote || "",
          createdAt: notif.createdAt || new Date().toISOString(),
        }));
        return {
          data: formatted,
          total: response.data.total || formatted.length,
        };
      }
    } catch (error) {
      toast("Không thể tải danh sách thông báo.", "error");
    }
    return { data: [], total: 0 };
  }, [toast, currentTab]);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    setReloadData(new Date().getTime());
  };

  const getCountForTab = (tab) => {
    return tabCounts?.[tab.countKey] || 0;
  };

  // BẮT BUỘC: Nếu TableNotification chưa load xong → hiện loading toàn trang
  // if (!sharedComponents?.TableNotification) {
  //   return (
  //       <PageContainer>
  //       <Loading size={80} />
  //     </PageContainer>
  //   );
  // }

  // const { TableNotification } = sharedComponents;

  // return (
  //   <PageContainer>
  //     {/* QUAN TRỌNG NHẤT: BỌC TableNotification TRONG Suspense */}
  //     <Suspense fallback={<Loading />}>
  //       <TableNotification
  //         filter={filter}
  //         columns={columns}
  //         fetchData={fetchData}
  //         disableAdd
  //         disableDelete
  //         disableEdit
  //         disableAction
  //         disableCheckbox
  //         reload={reloadData}
  //         disableSynchronize
  //         onView={handleRowClick}
  //       />
  //     </Suspense>

  //     {/* Dialog chi tiết cũng nên bọc Suspense */}
  //     {activeComponent && (
  //       <Suspense fallback={<Loading />}>
  //         <activeComponent.Component
  //           {...activeComponent.props}
  //           sharedComponents={sharedComponents}
  //         />
  //       </Suspense>
  //     )}
  //   </PageContainer>
  // );
return (
  <PageContainer>
    <HeaderContainer>
      <BackButton onClick={handleGoBack}>
        <ArrowBackRoundedIcon />
        QUAY LẠI
      </BackButton>
      <StyledLimitTags variant="h5">Danh sách thông báo</StyledLimitTags>
    </HeaderContainer>
    
    <TabsContainer>
      <StyledTabs
        value={currentTab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
      >
        {SUBTABS.map((tab, index) => {
          const count = getCountForTab(tab);
          return (
            <StyledTab
              key={tab.label}
              isActive={currentTab === index}
              label={
                <TabLabelContainer>
                  <StyledLabelSubtab isActive={currentTab === index}>{tab.label}</StyledLabelSubtab>
                  <CountBadge isActive={currentTab === index} isVisible={count > 0}>
                    {count}
                  </CountBadge>
                </TabLabelContainer>
              }
            />
          );
        })}
      </StyledTabs>
    </TabsContainer>

    <TableContainer>
      <Suspense fallback={<Loading size={80} />}>
        <sharedComponents.TableNotification
          filter={filter}
          columns={columns}
          fetchData={fetchData}
          disableAdd
          disableDetail
          disableEdit
          disableAction
          disableCheckbox
          reload={reloadData}
          disableSynchronize
          onView={handleRowClick}
          onDelete={handleOpenDialogDlt}
          onMarkReadUnread={handleMarkReadUnread}
          title={false}
          paginationTop
          paginationBottom
          isMaxHeight 
          showGroupButtons
        />
      </Suspense>
    </TableContainer>

    {/* Dialog xác nhận xóa */}
    {sharedComponents.Dialog && (
      <sharedComponents.Dialog
        onClose={handleCloseDialogDlt}
        onSave={handleDelete}
        open={openDialogDlt}
        title={'Xác nhận xóa?'}
        type="delete"
      >
        Bạn có chắc chắn muốn xóa thông báo này không?
      </sharedComponents.Dialog>
     )}

    {/* Dialog chi tiết */}
    {activeComponent && (
      <Suspense fallback={<Loading />}>
        <NotificationContext.Provider value={{ isFromNotification: true }}>
          <activeComponent.Component
            {...activeComponent.props}
            sharedComponents={sharedComponents}
          />
        </NotificationContext.Provider>
      </Suspense>
    )}
  </PageContainer>
);
};

export default withSharedComponents(NotificationsPage);