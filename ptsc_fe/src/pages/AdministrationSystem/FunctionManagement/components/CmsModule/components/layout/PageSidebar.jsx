import React, { useState, useCallback } from "react";
import { ROUTES } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/config/routes";

const IconPage = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>;
const IconSettings = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
const IconTrash = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const IconPlus = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const IconClose = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;

const PageItem = ({ p, activePage, setActivePage, setSelected, deletePage, setShowPageMenu }) => {
  const [hover, setHover] = useState(false);
  const isActive = activePage === p.href;

  const handleMouseEnter = useCallback(() => setHover(true), []);
  const handleMouseLeave = useCallback(() => setHover(false), []);
  const handleClick = useCallback(() => setActivePage(p.href), [p.href, setActivePage]);

  const handleConfigClick = useCallback((e) => {
    e.stopPropagation();
    setSelected({ type: 'page', id: p.href, props: p });
    setShowPageMenu(false);
  }, [p, setSelected, setShowPageMenu]);

  const handleDeleteClick = useCallback((e) => {
    e.stopPropagation();
    deletePage(p.href);
  }, [p.href, deletePage]);

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: "12px 16px",
        background: isActive ? "#e3f2fd" : (hover ? "#f8f9fa" : "transparent"),
        borderRadius: 8,
        marginBottom: 8,
        transition: "all 0.2s ease",
        cursor: "pointer",
        border: isActive ? "1px solid #bbdefb" : "1px solid transparent"
      }}
    >
      <div
        onClick={handleClick}
        style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, color: isActive ? "#1976d2" : "#333", fontWeight: isActive ? 600 : 400 }}
      >
        <span style={{ opacity: isActive ? 1 : 0.5 }}><IconPage /></span>
        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>{p.label}</span>
      </div>

      <div style={{ display: "flex", gap: 4, opacity: (hover || isActive) ? 1 : 0, transition: "opacity 0.2s" }}>
        <button
          title="Configure Page"
          onClick={handleConfigClick}
          style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', padding: 6, display: "flex", alignItems: "center", color: "#555" }}
        >
          <IconSettings />
        </button>
        {p.href !== ROUTES.HOME && (
          <button
            title="Delete Page"
            onClick={handleDeleteClick}
            style={{ background: '#fff', border: '1px solid #ffcdd2', borderRadius: 4, cursor: 'pointer', color: '#d32f2f', padding: 6, display: "flex", alignItems: "center" }}
          >
            <IconTrash />
          </button>
        )}
      </div>
    </div>
  );
};

export function PageSidebar({ showPageMenu, headerConfig, activePage, setActivePage, setSelected, deletePage, addPage, setShowPageMenu }) {
  const handleCloseMenu = useCallback(() => setShowPageMenu(false), [setShowPageMenu]);

  const handleSystemPageConfig = useCallback((p) => (e) => {
    e.stopPropagation();
    // Tìm xem trang hệ thống này đã có cấu hình chưa, nếu chưa tạo object ảo
    const config = headerConfig.systemPages?.find(s => s.href === p.href) || { label: p.label, href: p.href, fullWidth: false, isSystem: true };
    setSelected({ type: 'page', id: p.href, props: config });
    setShowPageMenu(false);
  }, [headerConfig.systemPages, setSelected, setShowPageMenu]);

  const handleAddPageMouseDown = useCallback((e) => {
    e.currentTarget.style.transform = "scale(0.98)";
  }, []);

  const handleAddPageMouseUp = useCallback((e) => {
    e.currentTarget.style.transform = "scale(1)";
  }, []);

  return (
    <div style={{
      position: "absolute",
      top: 0,
      left: 0,
      bottom: 0,
      width: 280,
      background: "#fff",
      borderRight: "1px solid #eee",
      display: "flex",
      flexDirection: "column",
      boxShadow: showPageMenu ? "4px 0 24px rgba(0,0,0,0.04)" : "none",
      zIndex: 90,
      transform: showPageMenu ? "translateX(0)" : "translateX(-100%)",
      transition: "transform 0.3s ease-in-out"
    }}>
      <div style={{ padding: "20px 20px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>Trang</h3>
        <button onClick={handleCloseMenu} style={{ background: "none", border: "none", cursor: "pointer", color: "#999", padding: 4 }}>
          <IconClose />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 20px" }}>
        <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Trang người dùng</div>
        {headerConfig.menu.map(p => (
          <PageItem
            key={p.href}
            p={p}
            activePage={activePage}
            setActivePage={setActivePage}
            setSelected={setSelected}
            deletePage={deletePage}
            setShowPageMenu={setShowPageMenu}
          />
        ))}

        <div style={{ margin: "24px 0 12px", fontSize: 13, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Trang hệ thống</div>
        {[
          { label: "Tin tức theo chủ đề", href: ROUTES.TIN_TUC, isSystem: true },
          { label: "Chi tiết tin tức", href: ROUTES.NEWS_DETAIL_PREFIX, isSystem: true },
          { label: "Tìm kiếm", href: ROUTES.SEARCH, isSystem: true },
          { label: "Lịch sự kiện", href: ROUTES.CALENDAR, isSystem: true },
          { label: "Video", href: ROUTES.VIDEO, isSystem: true },
          { label: "Album", href: ROUTES.ALBUM, isSystem: true },
          { label: "Topic", href: ROUTES.TOPIC_PREFIX, isSystem: true }
        ].map(p => (
          <div key={p.href} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: "10px 16px",
            background: activePage?.startsWith(p.href) ? "#f1f5f9" : "transparent",
            borderRadius: 8,
            marginBottom: 4,
            cursor: "pointer",
            border: "1px solid transparent"
          }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, color: "#334155", fontSize: 14 }}>
              <span style={{ opacity: 0.5 }}><IconPage /></span>
              <span>{p.label}</span>
            </div>
            <button
              onClick={handleSystemPageConfig(p)}
              style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', padding: 6, display: "flex", alignItems: "center", color: "#555" }}
            >
              <IconSettings />
            </button>
          </div>
        ))}
      </div>

      <div style={{ padding: 20, borderTop: "1px solid #f0f0f0" }}>
        <button
          onClick={addPage}
          style={{
            width: "100%",
            padding: "12px",
            background: "#0B5FFF",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontWeight: 600,
            boxShadow: "0 4px 12px rgba(11, 95, 255, 0.2)",
            transition: "transform 0.1s"
          }}
          onMouseDown={handleAddPageMouseDown}
          onMouseUp={handleAddPageMouseUp}
        >
          <IconPlus /> Thêm trang mới
        </button>
      </div>
    </div>
  );
}
