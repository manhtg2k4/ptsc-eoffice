import React, { useState, useCallback } from "react";
import { X, Check, FileText, AlertCircle, CheckCircle2, Bell, ShieldAlert, Trash2 } from "lucide-react";
import moment from "moment";
import * as S from "./NotificationModal.styles";

// ─── Main Component ───────────────────────────────────────────────────────────
export default function NotificationDropdown(props) {
  const {
    isOpen,
    onClose,
    isSidebar,
    headerPos,
    notifications: propNotifications,
    fetchNotifications,
    total
  } = props;

  const notificationsFromProps = propNotifications || [];
  const [activeTab, setActiveTab] = useState("all");
  const [localDeletedIds, setLocalDeletedIds] = useState([]);
  const [localReadIds, setLocalReadIds] = useState([]);

  // ── Logic Helpers ───────────────────────────────────────────────────────────
  const notifications = notificationsFromProps
    .map(function (n) {
      return Object.assign({}, n, {
        unread: !localReadIds.includes(n.id) && !n.isRead,
        id: n.id || n._id
      });
    })
    .filter(function (n) {
      return !localDeletedIds.includes(n.id);
    });

  const unreadCount = notifications.filter(function (n) {
    return n.unread;
  }).length;

  const filteredNotifications = activeTab === "all"
    ? notifications
    : notifications.filter(function (n) {
        return n.unread;
      });

  // ── Event Handlers ──────────────────────────────────────────────────────────
  const handleMarkAllAsRead = useCallback(function (e) {
    if (e) e.stopPropagation();
    const allIds = notifications.map(function (n) { return n.id; });
    setLocalReadIds(function (prev) { return [...prev, ...allIds]; });
  }, [notifications]);

  const handleClearAll = useCallback(function (e) {
    if (e) e.stopPropagation();
    const allIds = notifications.map(function (n) { return n.id; });
    setLocalDeletedIds(function (prev) { return [...prev, ...allIds]; });
  }, [notifications]);

  const handleStopPropagation = useCallback(function (e) {
    if (e) e.stopPropagation();
  }, []);

  const handleSetTabAll = useCallback(function (e) {
    if (e) e.stopPropagation();
    setActiveTab("all");
  }, []);

  const handleSetTabUnread = useCallback(function (e) {
    if (e) e.stopPropagation();
    setActiveTab("unread");
  }, []);

  const handleSeeAll = useCallback(function (e) {
    if (e) e.stopPropagation();
    if (fetchNotifications) fetchNotifications(1, 50);
  }, [fetchNotifications]);

  // Handlers using data attributes to avoid closures
  const handleItemRead = useCallback(function (e) {
    if (e) e.stopPropagation();
    const id = e.currentTarget.getAttribute("data-id");
    if (id) {
       setLocalReadIds(function (prev) { return [...prev, id]; });
    }
  }, []);

  const handleItemDelete = useCallback(function (e) {
    if (e) e.stopPropagation();
    const id = e.currentTarget.getAttribute("data-id");
    if (id) {
       setLocalDeletedIds(function (prev) { return [...prev, id]; });
    }
  }, []);

  function getIcon(type) {
    if (type === "alert") return <AlertCircle size={20} />;
    if (type === "success") return <CheckCircle2 size={20} />;
    if (type === "warning") return <ShieldAlert size={20} />;
    return <FileText size={20} />;
  }

  if (!isOpen) return null;

  // ── Dynamic Dynamic Styles ──────────────────────────────────────────────────
  const dropdownClassName = isSidebar ? "notif-dropdown" : "notif-dropdown";
  const isSidebarStr = isSidebar ? "true" : "false";

  const dropdownDynamicStyle = Object.assign(
    {},
    isSidebar ? {
      left: headerPos === "left" ? "calc(100% + 20px)" : "auto",
      right: headerPos === "right" ? "calc(100% + 20px)" : "auto",
      transformOrigin: headerPos === "left" ? "bottom left" : "bottom right",
      "--sidebar-anim-x": headerPos === "left" ? "-20px" : "20px"
    } : {},
    props["style"]
  );

  return (
    <S.ModalWrapper>
      <div className="notif-backdrop" onClick={onClose} />
      
      <div
        className={dropdownClassName}
        data-sidebar={isSidebarStr}
        style={dropdownDynamicStyle}
        onClick={handleStopPropagation}
        onMouseDown={handleStopPropagation}
        onMouseUp={handleStopPropagation}
      >
        {/* Header */}
        <div className="notif-header">
          <div>
            <h2 className="notif-header-title">Thông báo</h2>
            {unreadCount > 0 && (
              <span className="notif-unread-text">Bạn có {unreadCount} thông báo mới</span>
            )}
          </div>
          <button onClick={onClose} className="notif-close-btn">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="notif-tabs-wrapper">
          <div className="notif-tabs-container">
            <button
              onClick={handleSetTabAll}
              className="notif-tab-btn"
              data-active={activeTab === "all" ? "true" : "false"}
            >
              Tất cả ({notifications.length})
            </button>
            <button
              onClick={handleSetTabUnread}
              className="notif-tab-btn"
              data-active={activeTab === "unread" ? "true" : "false"}
            >
              Chưa đọc ({unreadCount})
            </button>
          </div>
        </div>

        {/* Global Actions */}
        <div className="notif-global-actions">
          <div onClick={handleMarkAllAsRead} className="notif-mark-read-action">
            <Check size={14} />
            Đánh dấu tất cả đã đọc
          </div>
          <div onClick={handleClearAll} className="notif-clear-all-action">
            <Trash2 size={13} />
            Xóa tất cả
          </div>
        </div>

        {/* List */}
        <div className="notif-scroll-area">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map(function (item) {
              const isUnreadStr = item.unread ? "true" : "false";

              return (
                <div 
                  key={item.id} 
                  className="notif-item"
                  data-unread={isUnreadStr}
                  data-id={item.id}
                  onClick={handleItemRead}
                >
                  <div className="notif-icon-box">
                    {getIcon(item.type)}
                  </div>
                  
                  <div className="notif-content">
                    <div className="notif-item-header">
                      <h4 className="notif-item-title">
                        {item.title}
                      </h4>
                      {item.unread && <div className="notif-dot" />}
                    </div>
                    <p className="notif-text">
                      {item.content || item.message}
                    </p>
                    <span className="notif-time">
                      {moment(item.createdAt).fromNow()}
                    </span>
                  </div>

                  {/* Item Actions */}
                  <div className="notif-actions">
                    {item.unread && (
                      <button
                        className="notif-action-btn"
                        data-id={item.id}
                        onClick={handleItemRead}
                        title="Đánh dấu đã đọc"
                      >
                        <Check size={14} />
                      </button>
                    )}
                    <button
                      className="notif-action-btn delete"
                      data-id={item.id}
                      onClick={handleItemDelete}
                      title="Xóa thông báo"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="notif-empty-state">
              <span className="notif-empty-icon" style={{ display: "inline-block", marginBottom: "12px", color: "#e2e8f0" }}>
                <Bell size={40} />
              </span>
              <p className="notif-empty-text">Không có thông báo nào</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="notif-footer">
          <button
            onClick={handleSeeAll}
            className="notif-see-all-btn"
          >
            Xem tất cả thông báo {total > 0 ? `(${total})` : ""}
          </button>
        </div>
      </div>
    </S.ModalWrapper>
  );
}
