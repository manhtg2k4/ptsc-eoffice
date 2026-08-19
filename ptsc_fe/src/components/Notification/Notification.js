import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  CloseIconStyled,
  HeaderTitle,
  HeaderSubtitle,
  HeaderTitleContainer,
  NotificationContent,
  NotificationFooter,
  NotificationHeader,
  NotificationItem,
  NotificationListContainer,
  StyledAccessTimeIcon,
  UnreadStatusDot,
  NotificationItemIcon,
  NotificationTitle,
  NotificationIconWrapper,
  TimeContainer,
  TimeText,
  BoxBT,
  TabButton,
  MarkAllAsReadContainer,
  MarkAllAsReadButton,
  EmptyStateBox,
  EmptyStateText,
  EmptyStateIcon,
  FooterButton,
  StyledDrawer,
  CloseIconButton,
  NotificationContentWrapper,
  EndListMessageContainer,
  EndListIcon,
  StyledDivider,
  StyledSettingsIcon,
} from "./Notification.styles";
import Loading from "@components/Loading/Loading";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "dayjs/locale/vi";
import CheckIcon from "@mui/icons-material/Check";

// Mở rộng dayjs với các plugin cần thiết
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.locale("vi");

import { useToast } from "@components/common/ToastProvider";
// eslint-disable-next-line import/no-named-as-default
import getSocket from "../../socket";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { setNotificationPreviousTitle } from "@redux/slices/layoutSlice";
import { patchMarkAllAsRead, patchMarkOneAsRead } from "@redux/slices/Notification/NotificationSlice";
import { navigateNotification } from "@utils/notificationNavigation";

const Notification = ({ open, onClose, onUpdateUnreadCount }) => {
	const navigate = useNavigate();
	const dispatch = useDispatch();
  const currentSwiperTitle = useSelector((state) => state.layout.currentSwiperTitle || "");
  const currentPageTitle = useSelector((state) => state.layout.currentPageTitle || "");
  const [notifications, setNotifications] = useState([]);
  const [processNotifications, setProcessNotifications] = useState([]);
  const [receiveNotifications, setReceiveNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [processTotal, setProcessTotal] = useState(0);
  const [receiveTotal, setReceiveTotal] = useState(0);
  const [loading] = useState(false);
  const toast = useToast();
  const [currentLimit] = useState(50);
  const [displayedCount] = useState(50);
  const [activeTab, setActiveTab] = useState(0); // 0: Xử lý, 1: Nhận để biết
  const [totalCount, setTotalCount] = useState(0);

  const handleViewAll = () => {
    navigate("/notifications");
    onClose();
  };

  const handleConfigClick = useCallback(() => {
    navigate("/notification-config");
    onClose();
  }, [navigate, onClose]);

  const handleTabChange = (newValue) => {
    setActiveTab(newValue);
  };

  const handleSelectAllTab = () => handleTabChange(0);
  const handleSelectUnreadTab = () => handleTabChange(1);

  const handleMarkAllAsRead = async () => {
    try {
      await dispatch(patchMarkAllAsRead()).unwrap();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setProcessNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setReceiveNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      onUpdateUnreadCount(0);
      toast("Đã đánh dấu tất cả thông báo là đã đọc", "success");
    } catch (error) {
      toast("Không thể đánh dấu thông báo", "error");
    }
  };

  useEffect(() => {
    const socket = getSocket();

    const emitFetch = () => {
      socket.emit("fetchNotifications", { limit: currentLimit });
    };

    socket.on("connect", emitFetch);
    emitFetch();

		  const handleNewNotification = (payload) => {
		    setTotalCount(payload || { total: 0, unreadCount: 0 });
		    if (payload?.data) {
		      setNotifications(payload.data);
		      const newUnreadCount = payload?.unreadCount || 0;
		      onUpdateUnreadCount(newUnreadCount);
		    }
		    if (payload?.dataGroup?.PROCESS) {
		      setProcessNotifications(payload.dataGroup.PROCESS.data || []);
		      setProcessTotal(payload.dataGroup.PROCESS.total || 0);
		    }
		    if (payload?.dataGroup?.RECEIVE) {
		      setReceiveNotifications(payload.dataGroup.RECEIVE.data || []);
		      setReceiveTotal(payload.dataGroup.RECEIVE.total || 0);
		    }
		  };

    socket.on("notificationList", handleNewNotification);

    return () => {
      socket.off("notificationList", handleNewNotification);
      socket.off("connect", emitFetch);
    };
  }, [currentLimit, onUpdateUnreadCount]);

  useEffect(() => {
    const currentUnread = totalCount?.unreadCount || notifications.filter(n => !n.isRead).length;
    setUnreadCount(currentUnread);
	}, [notifications, totalCount?.unreadCount]);
	
  const handleNotificationClick = async (notification) => {
    dispatch(setNotificationPreviousTitle(currentSwiperTitle || currentPageTitle));
    if (!notification.isRead) {
      try {
        const body = { isRead: true };
        await dispatch(patchMarkOneAsRead({ id: notification.id, body })).unwrap();

        const markRead = (prev) =>
          prev.map((n) => n.id === notification.id ? { ...n, isRead: true } : n);
        setNotifications(markRead);
        setProcessNotifications(markRead);
        setReceiveNotifications(markRead);
        onUpdateUnreadCount(unreadCount - 1);
      } catch (error) {
        toast("Không thể đánh dấu đã đọc thông báo.", "error");
      }
    }

    navigateNotification(notification, navigate);
    onClose();
  };

  const createNotificationClickHandler = (notification) => () => {
    handleNotificationClick(notification);
  };

  const getNotificationIcon = (notification) => {
    const type = notification.type;
    const content = notification.content.toLowerCase();
    const key = notification.key;

    if (type === 'document' || content.includes('văn bản')) {
      return '/VB.png';
    }
    if (type === 'deadline' || content.includes('thời hạn')) {
      return '/Cb.png';
    }
    if (type === 'new_user' || content.includes('người dùng')) {
      return '/AddUser.png';
    }
    if (key === 'VIEW_FEEDBACK' || key === 'VIEW_RECOMMENDATION' || key === 'VIEW_RECOMMENDATION_BPCT' || content.includes('phản ánh') || content.includes('phản ảnh') || content.includes('kiến nghị')) {
      return '/bell.png';
    }
    if (key === 'VIEW_NEWS' || key === 'NEWS_DETAIL_VIEW' || type === 'news' || content.includes('tin tức')) {
      return '/VB.png';
    }
    return '/bell.png';
  };
  
  const getNotificationType = (notification) => {
    const content = notification.content?.toLowerCase() || '';
    if (notification.type === 'calendar' || notification.type === 'MEETING_INVITATION' || notification.key === 'VIEW_PROCESSING_SCHEDULE' || content.includes('lịch họp')) return 'calendar';
    if (notification.type === 'document' || content.includes('văn bản')) return 'document';
    return 'default';
  };

	const getNotificationTitle = (notification) => {
  	const {
  	  type,
  	  key,
  	  content = "",
  	  category = "",
  	  title,
  	} = notification || {};
  	const normalizedContent = content.toLowerCase();
  	const viewDocKeys = ['VIEW_INCOMING_DOC', 'VIEW_OUTCOMING_DOC'];
  	const taskKeys = [
  	  'VIEW_TASK',
  	  'VIEW_TASK_APPROVAL',
  	  'VIEW_TASK_ADJUSTMENT',
  	  'TASK_APPROVAL_APPROVED',
  	  'VIEW_PROJECT',
  	  'TASK_APPROVAL_REJECTED',
  	  'TASK_ADJUSTMENT_REJECTED',
  	];
  	const feedbackKeys = [
  	  'VIEW_FEEDBACK',
  	  'VIEW_RECOMMENDATION',
  	  'VIEW_RECOMMENDATION_BPCT',
  	];
  	// 1. Document
  	if (type === 'document' || viewDocKeys.includes(key)) {
  	  return title || 'Văn bản mới cần xử lý';
  	}
  	// 2. Deadline
  	if (type === 'deadline' || normalizedContent.includes('thời hạn')) {
  	  return 'Thời hạn sắp đến';
  	}
  	// 3. User
  	if (type === 'new_user' || normalizedContent.includes('người dùng')) {
  	  return 'Người dùng mới';
  	}
  	// 4. Chat
  	if (key === 'CHAT' || normalizedContent.includes('chat')) {
  	  return 'Tin nhắn mới';
  	}
  	// 5. Task
  	if (taskKeys.includes(key) || normalizedContent.includes('công việc')) {
  	  return 'Công việc';
  	}
  	// 6. Calendar
  	if (!category && (normalizedContent.includes('lịch') || key === 'VIEW_PROCESSING_SCHEDULE' || type === 'MEETING_INVITATION')) {
  	  return 'Lịch họp';
  	}
  	// 7. Feedback
  	if (
  	  feedbackKeys.includes(key) ||
  	  normalizedContent.includes('phản ánh') ||
  	  normalizedContent.includes('phản ảnh') ||
  	  normalizedContent.includes('kiến nghị')
  	) {
  	  return 'Phản ánh kiến nghị';
  	}
  	// 8. News
  	if (key === 'VIEW_NEWS' || key === 'NEWS_DETAIL_VIEW' || type === 'news' || normalizedContent.includes('tin tức')) {
  	  return 'Tin tức mới';
  	}
        if (	
  	  normalizedContent.includes('hộ chiếu') ||  normalizedContent.includes('Hộ chiếu')
  	) {
  	  return 'Hộ chiếu';
  	}
    if (key ==='VIEW_RECORD_EXPLOITATION') {
  	  return 'Khai thác hồ sơ';
  	}
     if (	
  	  normalizedContent.includes('xe')
  	) {
  	  return 'Đặt xe';
  	}
  	// Default
  	return category || 'Thông báo hệ thống';
	};
	
	 const filteredNotifications =
	   activeTab === 0
	     ? processNotifications
	     : receiveNotifications;

  return (
    <>
      <StyledDrawer
        anchor="right"
        open={open}
        onClose={onClose}
        variant="temporary"
        ModalProps={{
          BackdropProps: {
            sx: { backgroundColor: "transparent" },
          },
        }}
        elevation={0}
      >
        {/* Header */}
        <NotificationHeader>
          <HeaderTitleContainer>
            <HeaderTitle>Thông báo</HeaderTitle>
            <HeaderSubtitle>Bạn có {unreadCount.toLocaleString()} thông báo mới</HeaderSubtitle>
          </HeaderTitleContainer>
          <CloseIconButton onClick={onClose} size="small">
            <CloseIconStyled />
          </CloseIconButton>
        </NotificationHeader>

        {/* Tabs */}
        <BoxBT>
          <TabButton
            onClick={handleSelectAllTab}
            $isActive={activeTab === 0}
          >
            Xử lý ({ processTotal.toLocaleString() })
          </TabButton>
          <TabButton
            onClick={handleSelectUnreadTab}
            $isActive={activeTab === 1}
          >
            Nhận để biết ({ receiveTotal.toLocaleString() })
          </TabButton>
        </BoxBT>

        {/* Nút đánh dấu tất cả đã đọc */}
        <MarkAllAsReadContainer>
          <MarkAllAsReadButton
            startIcon={<CheckIcon />}
            onClick={handleMarkAllAsRead}
          >
            Đánh dấu tất cả là đã đọc
          </MarkAllAsReadButton>
        </MarkAllAsReadContainer>

        {/* Danh sách thông báo */}
        <NotificationListContainer>
          {loading ? (
            <Loading />
          ) : filteredNotifications.length === 0 ? (
            <EmptyStateBox>
              <EmptyStateIcon />
              <EmptyStateText>Không có thông báo mới</EmptyStateText>
            </EmptyStateBox>
          ) : (
            <>
              {filteredNotifications
                .slice(0, displayedCount)
                .map((item) => {
                  const nType = getNotificationType(item);
                  return (
                    <NotificationItem
                      key={item.id}
                      $isNew={!item.isRead}
                      $isRead={item.isRead}
                      $type={nType}
                      onClick={createNotificationClickHandler(item)}
                    >
                      <NotificationIconWrapper $type={nType}>
                        <NotificationItemIcon src={getNotificationIcon(item)} alt="icon" />
                      </NotificationIconWrapper>

                      <NotificationContentWrapper>
                        <NotificationTitle $isRead={item.isRead}>
                          {getNotificationTitle(item)}
                        </NotificationTitle>

                        <NotificationContent>
                          {item.content}
                        </NotificationContent>

                        <TimeContainer>
                          <StyledAccessTimeIcon />
                          <TimeText>
                            {item.createdAt?.includes('/') 
                              ? dayjs(item.createdAt, ["HH:mm DD/MM/YYYY", "DD/MM/YYYY HH:mm"]).fromNow() 
                              : dayjs(item.createdAt).fromNow()}
                          </TimeText>
                        </TimeContainer>
                      </NotificationContentWrapper>

                      {!item.isRead && <UnreadStatusDot $type={nType} />}
                    </NotificationItem>
                  );
                })}
              
              {/* Message at the end of list */}
              <EndListMessageContainer>
                <EndListIcon />
                <EmptyStateText>Tất cả thông báo gần đây đã được hiển thị.</EmptyStateText>
              </EndListMessageContainer>
            </>
          )}
        </NotificationListContainer>

        <StyledDivider />

        {/* Footer */}
        <NotificationFooter>
          <FooterButton
            variant="outlined"
            onClick={handleViewAll}
            fullWidth
          >
            Xem tất cả
          </FooterButton>
          <FooterButton
            variant="text"
            startIcon={<StyledSettingsIcon />}
            fullWidth
            onClick={handleConfigClick}
          >
            Cấu hình
          </FooterButton>
        </NotificationFooter>
      </StyledDrawer>
    </>
  );
};

Notification.propTypes = {
	open: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	onUpdateUnreadCount: PropTypes.func.isRequired,
};

export default Notification;