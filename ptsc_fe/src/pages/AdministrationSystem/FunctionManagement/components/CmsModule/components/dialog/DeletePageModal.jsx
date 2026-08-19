import React from "react";

// ─── Icons ────────────────────────────────────────────────────────────────────
function IconClose() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  modal: {
    background: "#fff",
    borderRadius: 12,
    width: "90%",
    maxWidth: 440,
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
    animation: "modalFadeIn 0.2s ease-out",
  },
  header: {
    padding: "20px 24px",
    borderBottom: "1px solid #eaecf0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    margin: 0,
    fontSize: 18,
    color: "#101828",
    fontWeight: 600,
  },
  closeButton: {
    cursor: "pointer",
    border: "none",
    background: "transparent",
    color: "#667085",
    padding: 4,
    display: "flex",
    borderRadius: 4,
  },
  body: {
    padding: "24px",
    textAlign: "center",
  },
  iconBox: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 64,
    height: 64,
    borderRadius: "50%",
    marginBottom: 16,
  },
  textPrimary: {
    margin: "0 0 8px 0",
    fontSize: 15,
    color: "#344054",
    lineHeight: "1.6",
  },
  textSecondary: {
    margin: 0,
    fontSize: 14,
    color: "#667085",
    lineHeight: "1.5",
  },
  footer: {
    padding: "16px 24px",
    borderTop: "1px solid #eaecf0",
    display: "flex",
    gap: 12,
    justifyContent: "flex-end",
  },
  btnBase: {
    padding: "10px 16px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  btnCancel: {
    border: "1px solid #d0d5dd",
    background: "#fff",
    color: "#344054",
  },
  btnDelete: {
    border: "none",
    background: "#d92d20",
    color: "#fff",
  },
  btnErrorClose: {
    border: "none",
    background: "#0B5FFF",
    color: "#fff",
  },
};

// ─── Main Component ───────────────────────────────────────────────────────────
export function DeletePageModal(props) {
  const { show, onClose, pageToDelete, error, onConfirm } = props;

  if (!show) {
    return null;
  }

  // Event Handlers
  function handleKeyDown(e) {
    if (e.key === "Enter" && pageToDelete && !error) {
      onConfirm();
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  function handleStopPropagation(e) {
    e.stopPropagation();
  }

  // Hover Handlers
  function handleCancelEnter(e) {
    e.target.style.background = "#f9fafb";
  }

  function handleCancelLeave(e) {
    e.target.style.background = "#fff";
  }

  function handleDeleteEnter(e) {
    e.target.style.background = "#b42318";
  }

  function handleDeleteLeave(e) {
    e.target.style.background = "#d92d20";
  }

  function handleErrorCloseEnter(e) {
    e.target.style.background = "#0952CC";
  }

  function handleErrorCloseLeave(e) {
    e.target.style.background = "#0B5FFF";
  }

  const dynamicIconBoxStyle = Object.assign({}, styles.iconBox, {
    background: error ? "#fef3f2" : "#fee4e2",
    color: error ? "#f79009" : "#f04438",
  });

  return (
    <div
      style={styles.overlay}
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div style={styles.modal} onClick={handleStopPropagation}>
        {/* Header */}
        <div style={styles.header}>
          <h3 style={styles.headerTitle}>
            {error ? "Không thể xóa trang" : "Xác nhận xóa trang"}
          </h3>
          <button onClick={onClose} style={styles.closeButton}>
            <IconClose />
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          <div style={dynamicIconBoxStyle}>
            <IconAlert />
          </div>

          {error ? (
            <p style={styles.textPrimary}>{error}</p>
          ) : (
            <>
              <p style={styles.textPrimary}>
                  Bạn có chắc chắn muốn xóa trang <strong>&quot;{pageToDelete}&quot;</strong>?
              </p>
              <p style={styles.textSecondary}>
                Hành động này không thể hoàn tác. Tất cả nội dung của trang sẽ bị xóa vĩnh viễn.
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          {error ? (
            <button
              onClick={onClose}
              style={Object.assign({}, styles.btnBase, styles.btnErrorClose)}
              onMouseEnter={handleErrorCloseEnter}
              onMouseLeave={handleErrorCloseLeave}
            >
              Đóng
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                style={Object.assign({}, styles.btnBase, styles.btnCancel)}
                onMouseEnter={handleCancelEnter}
                onMouseLeave={handleCancelLeave}
              >
                Hủy
              </button>
              <button
                onClick={onConfirm}
                style={Object.assign({}, styles.btnBase, styles.btnDelete)}
                onMouseEnter={handleDeleteEnter}
                onMouseLeave={handleDeleteLeave}
              >
                Xóa trang
              </button>
            </>
          )}
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