import React, { useCallback } from "react";

const IconClose = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;

export function AddPageModal({ show, onClose, label, setLabel, path, setPath, error, onConfirm }) {
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && label && path) {
      onConfirm();
    } else if (e.key === "Escape") {
      onClose();
    }
  }, [label, path, onConfirm, onClose]);

  const handleStopPropagation = useCallback((e) => e.stopPropagation(), []);
  const handleLabelChange = useCallback((e) => setLabel(e.target.value), [setLabel]);
  const handlePathChange = useCallback((e) => setPath(e.target.value), [setPath]);

  const handleInputFocus = useCallback((e) => {
    e.target.style.borderColor = "#0B5FFF";
    e.target.style.boxShadow = "0 0 0 4px rgba(11, 95, 255, 0.1)";
  }, []);

  const handleInputBlur = useCallback((e) => {
    e.target.style.borderColor = "#d0d5dd";
    e.target.style.boxShadow = "none";
  }, []);

  const handlePathFocus = useCallback((e) => {
    if (!error) {
      e.target.style.borderColor = "#0B5FFF";
      e.target.style.boxShadow = "0 0 0 4px rgba(11, 95, 255, 0.1)";
    }
  }, [error]);

  const handlePathBlur = useCallback((e) => {
    if (!error) {
      e.target.style.borderColor = "#d0d5dd";
      e.target.style.boxShadow = "none";
    }
  }, [error]);

  const handleCancelMouseEnter = useCallback((e) => { 
    e.target.style.background = "#f9fafb"; 
  }, []);
  
  const handleCancelMouseLeave = useCallback((e) => { 
    e.target.style.background = "#fff"; 
  }, []);

  const handleConfirmMouseEnter = useCallback((e) => { 
    e.target.style.background = "#0952CC"; 
  }, []);

  const handleConfirmMouseLeave = useCallback((e) => { 
    e.target.style.background = "#0B5FFF"; 
  }, []);

  if (!show) return null;

  return (
    <div 
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: "#fff",
          borderRadius: 12,
          width: "90%",
          maxWidth: 480,
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          animation: "modalFadeIn 0.2s ease-out"
        }}
        onClick={handleStopPropagation}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid #eaecf0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <h3 style={{ margin: 0, fontSize: 18, color: "#101828", fontWeight: 600 }}>
            Thêm trang mới
          </h3>
          <button 
            onClick={onClose}
            style={{
              cursor: "pointer",
              border: "none",
              background: "transparent",
              color: "#667085",
              padding: 4,
              display: "flex",
              borderRadius: 4
            }}
          >
            <IconClose />
          </button>
        </div>

        <div style={{ padding: "24px" }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: "block",
              fontSize: 14,
              fontWeight: 500,
              color: "#344054",
              marginBottom: 8
            }}>
              Tên trang (Label)
            </label>
            <input
              autoFocus
              type="text"
              value={label}
              onChange={handleLabelChange}
              onKeyDown={handleKeyDown}
              placeholder="Ví dụ: Sản phẩm"
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1px solid #d0d5dd",
                borderRadius: 8,
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s, box-shadow 0.2s"
              }}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
          </div>

          <label style={{
            display: "block",
            fontSize: 14,
            fontWeight: 500,
            color: "#344054",
            marginBottom: 8
          }}>
            Đường dẫn (Path)
          </label>
          <input
            type="text"
            value={path}
            onChange={handlePathChange}
            onKeyDown={handleKeyDown}
            placeholder="Ví dụ: /products/:id"
            style={{
              width: "100%",
              padding: "10px 14px",
              border: error ? "1px solid #f04438" : "1px solid #d0d5dd",
              borderRadius: 8,
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.2s, box-shadow 0.2s"
            }}
            onFocus={handlePathFocus}
            onBlur={handlePathBlur}
          />
          {error && (
            <div style={{
              color: "#f04438",
              fontSize: 13,
              marginTop: 6
            }}>
              {error}
            </div>
          )}
          <div style={{
            color: "#667085",
            fontSize: 13,
            marginTop: 8
          }}>
            Nhập <code>:param</code> cho các tham số động. Ví dụ: <code>/blog/:slug</code>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 24px",
          borderTop: "1px solid #eaecf0",
          display: "flex",
          gap: 12,
          justifyContent: "flex-end"
        }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 16px",
              border: "1px solid #d0d5dd",
              background: "#fff",
              color: "#344054",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseEnter={handleCancelMouseEnter}
            onMouseLeave={handleCancelMouseLeave}
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "10px 16px",
              border: "none",
              background: "#0B5FFF",
              color: "#fff",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseEnter={handleConfirmMouseEnter}
            onMouseLeave={handleConfirmMouseLeave}
          >
            Tạo trang
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}