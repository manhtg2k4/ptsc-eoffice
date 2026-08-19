"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999, // Phủ lên toàn bộ Sidebar, Header, Modal
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    backdropFilter: "blur(10px)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    textAlign: "center",
  },
  iconBox: {
    width: "80px",
    height: "80px",
    backgroundColor: "#fff1f2",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "24px",
    color: "#e11d48",
  },
  title: {
    fontSize: "28px",
    color: "#1e293b",
    marginBottom: "12px",
    fontWeight: "700",
  },
  message: {
    color: "#64748b",
    maxWidth: "500px",
    lineHeight: "1.6",
    marginBottom: "32px",
    fontSize: "18px",
  },
  button: {
    padding: "14px 40px",
    background: "linear-gradient(135deg, #0062AD 0%, #004a82 100%)",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 8px 25px rgba(0, 98, 173, 0.4)",
    transition: "all 0.3s ease",
  },
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ErrorOverlay(props) {
  const { error } = props;

  // Handlers
  function handleReload() {
    window.location.reload();
  }

  function handleMouseOver(e) {
    e.currentTarget.style.transform = "translateY(-3px)";
  }

  function handleMouseOut(e) {
    e.currentTarget.style.transform = "translateY(0)";
  }

  if (!error) {
    return null;
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.iconBox}>
        <AlertTriangle size={40} />
      </div>

      <h1 style={styles.title}>Thông báo hệ thống</h1>

      <p style={styles.message}>
        {error || "Phát hiện lỗi kết nối nghiêm trọng. Hệ thống không thể tải cấu hình cơ bản."}
      </p>

      <button
        onClick={handleReload}
        style={styles.button}
        onMouseOver={handleMouseOver}
        onMouseOut={handleMouseOut}
      >
        Thử lại ngay
      </button>
    </div>
  );
}