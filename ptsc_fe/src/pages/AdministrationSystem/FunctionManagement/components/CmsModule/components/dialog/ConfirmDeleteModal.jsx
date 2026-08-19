import React from "react";
import { Trash2 } from "lucide-react";

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    backdropFilter: "blur(4px)",
  },
  modal: {
    backgroundColor: "#fff",
    padding: "32px",
    borderRadius: "20px",
    width: "100%",
    maxWidth: "400px",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  },
  header: {
    textAlign: "center",
    marginBottom: "24px",
  },
  iconContainer: {
    width: "64px",
    height: "64px",
    backgroundColor: "#fef2f2",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
    color: "#ef4444",
  },
  title: {
    fontSize: "20px",
    fontWeight: 700,
    color: "#1e293b",
    marginBottom: "8px",
  },
  message: {
    color: "#64748b",
    fontSize: "15px",
  },
  actions: {
    display: "flex",
    gap: "12px",
  },
  cancelBtn: {
    flex: 1,
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    background: "#fff",
    color: "#475569",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  confirmBtn: {
    flex: 1,
    padding: "12px",
    borderRadius: "12px",
    border: "none",
    background: "#ef4444",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
  },
};

// ─── Main Component ───────────────────────────────────────────────────────────
function ConfirmDeleteModal(props) {
  const { 
    isOpen, 
    onClose, 
    onConfirm, 
    title = "Xác nhận xóa", 
    message = "Bạn có chắc chắn muốn xóa không? Hành động này không thể hoàn tác." 
  } = props;

  // Handlers
  function handleStopPropagation(e) {
    e.stopPropagation();
  }

  function handleCancelEnter(e) {
    e.target.style.background = "#f8fafc";
  }

  function handleCancelLeave(e) {
    e.target.style.background = "#fff";
  }

  function handleConfirmEnter(e) {
    e.target.style.background = "#dc2626";
  }

  function handleConfirmLeave(e) {
    e.target.style.background = "#ef4444";
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={handleStopPropagation}>
        <div style={styles.header}>
          <div style={styles.iconContainer}>
            <Trash2 size={32} />
          </div>
          <h3 style={styles.title}>{title}</h3>
          <p style={styles.message}>{message}</p>
        </div>

        <div style={styles.actions}>
          <button
            onClick={onClose}
            style={styles.cancelBtn}
            onMouseEnter={handleCancelEnter}
            onMouseLeave={handleCancelLeave}
          >
            Hủy bỏ
          </button>
          <button
            onClick={onConfirm}
            style={styles.confirmBtn}
            onMouseEnter={handleConfirmEnter}
            onMouseLeave={handleConfirmLeave}
          >
            Xác nhận xóa
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDeleteModal;