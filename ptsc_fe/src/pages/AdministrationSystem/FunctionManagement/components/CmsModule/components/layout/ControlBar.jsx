import React, { useCallback } from "react";
import { toast } from "react-toastify";

// 1. Chuyển Icon thành function bình thường để có Display Name rõ ràng
function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function IconArrowLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

export function ControlBar({ 
  headerConfig, 
  activePage, 
  showPageMenu, 
  setShowPageMenu, 
  showAddPanel, 
  setShowAddPanel, 
  setSelected, 
  setIsPreview, 
  onSave, 
  onBack 
}) {
  
  // 2. Tách các handler ra ngoài dùng useCallback để tránh tạo mới function mỗi lần render
  const handleToggleMenu = useCallback(() => {
    setShowPageMenu(!showPageMenu);
  }, [setShowPageMenu]);

  const handleToggleAddPanel = useCallback(() => {
    setShowAddPanel((prev) => !prev);
    setSelected(null);
  }, [setShowAddPanel, setSelected]);

  const handleApply = useCallback(async () => {
    if (onSave) {
      try {
        await onSave();
        toast.success("Áp dụng cấu hình thành công!");
        setIsPreview(true);
      } catch (error) {
        toast.error("Áp dụng cấu hình thất bại! Vui lòng thử lại.");
      }
    } else {
      setIsPreview(true);
    }
  }, [onSave, setIsPreview]);

  const handleGoBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  }, [onBack]);

  return (
    <div className="control-bar-wrapper" style={{ height: 64, background: "#1D2939", display: "flex", alignItems: "center", padding: "0 24px", justifyContent: "space-between", color: "#fff", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)", zIndex: 100 }}>
      <style>{`
        .control-bar-btn-text, .control-bar-title-page, .control-bar-title-separator {
          display: inline;
        }
        /* Thay thế onMouseEnter/onMouseLeave bằng CSS hover */
        .menu-toggle-btn:hover {
          background: rgba(255,255,255,0.1) !important;
        }
        @media (max-width: 820px) {
          .control-bar-wrapper { padding: 0 12px !important; }
          .control-bar-left { gap: 8px !important; }
          .control-bar-right { gap: 6px !important; }
          .control-bar-btn-text { display: none; }
          .control-bar-right button { padding: 8px !important; }
          .control-bar-title-page, .control-bar-title-separator { display: none; }
        }
      `}</style>

      <div className="control-bar-left" style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <button 
          className="menu-toggle-btn"
          onClick={handleToggleMenu} 
          style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", padding: 8, borderRadius: 6, transition: "background 0.2s" }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <h3 style={{ margin: 0, fontWeight: 500, fontSize: 18, display: "flex", alignItems: "center", gap: 12, color: "#fff" }}>
          {headerConfig.logo}
          <span className="control-bar-title-separator" style={{ opacity: 0.3, fontWeight: 300 }}>|</span>
          <span className="control-bar-title-page" style={{ opacity: 0.9, fontSize: 14, background: "rgba(0, 0, 0, 0.08)", padding: "2px 8px", borderRadius: 4 }}>{activePage}</span>
        </h3>
      </div>

      <div className="control-bar-right" style={{ display: "flex", gap: 12 }}>
        <button
          onClick={handleGoBack}
          style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff",
            padding: "8px 16px",
            borderRadius: 6,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 14,
            fontWeight: 500
          }}
        >
          <IconArrowLeft /> <span className="control-bar-btn-text">Trở về</span>
        </button>

        <button
          onClick={handleToggleAddPanel}
          style={{
            background: showAddPanel ? "#0B5FFF" : "rgba(255,255,255,0.05)",
            border: showAddPanel ? "1px solid #0B5FFF" : "1px solid rgba(255,255,255,0.1)",
            color: "#fff",
            padding: "8px 16px",
            borderRadius: 6,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 14,
            fontWeight: 500,
            transition: "all 0.2s"
          }}
        >
          <IconPlus /> <span className="control-bar-btn-text">Thêm Widget</span>
        </button>

        <button
          onClick={handleApply}
          style={{
            background: "#10B981",
            border: "1px solid #059669",
            color: "#fff",
            padding: "8px 16px",
            borderRadius: 6,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 14,
            fontWeight: 500,
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
          }}
        >
          <IconPlay /> <span className="control-bar-btn-text">Áp dụng</span>
        </button>
      </div>
    </div>
  );
}