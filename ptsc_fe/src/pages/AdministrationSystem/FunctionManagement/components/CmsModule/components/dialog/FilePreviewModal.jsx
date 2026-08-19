import React from "react";
import { X, Download, FileText, Loader2 } from "lucide-react";
import AuthImage from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimImage';


// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10000,
    backdropFilter: "blur(8px)",
    padding: "20px",
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: "24px",
    width: "100%",
    maxWidth: "1200px",
    height: "90vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  },
  header: {
    padding: "16px 24px",
    borderBottom: "1px solid #f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#fff",
  },
  fileInfoBox: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  iconWrapper: {
    width: "40px",
    height: "40px",
    backgroundColor: "#eff6ff",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#2563eb",
  },
  fileName: {
    fontSize: "16px",
    fontWeight: 600,
    color: "#1e293b",
    margin: 0,
  },
  fileType: {
    fontSize: "12px",
    color: "#64748b",
    margin: 0,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  downloadLink: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    borderRadius: "10px",
    backgroundColor: "#f8fafc",
    color: "#475569",
    fontSize: "14px",
    fontWeight: 600,
    textDecoration: "none",
    transition: "all 0.2s",
    border: "1px solid #e2e8f0",
  },
  closeBtn: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    border: "none",
    background: "#f8fafc",
    color: "#64748b",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
  },
  contentArea: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    position: "relative",
    overflow: "auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
  },
  loader: {
    color: "#2563eb",
  },
  loadingText: {
    color: "#64748b",
    fontWeight: 500,
  },
  iframe: {
    width: "100%",
    height: "100%",
    border: "none",
  },
  imagePreview: {
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: "contain",
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
  },
  fallbackContainer: {
    textAlign: "center",
    padding: "40px",
  },
  fallbackText: {
    color: "#64748b",
  },
  fallbackLink: {
    color: "#2563eb",
    fontWeight: 600,
  }
};

// ─── Main Component ───────────────────────────────────────────────────────────
function FilePreviewModal(props) {
  const { isOpen, onClose, file, loading } = props;

  if (!isOpen) {
    return null;
  }

  // Handlers
  function handleStopPropagation(e) {
    e.stopPropagation();
  }

  function handleDownloadEnter(e) {
    e.currentTarget.style.backgroundColor = "#f1f5f9";
  }

  function handleDownloadLeave(e) {
    e.currentTarget.style.backgroundColor = "#f8fafc";
  }

  function handleCloseEnter(e) {
    e.currentTarget.style.backgroundColor = "#fee2e2";
    e.currentTarget.style.color = "#ef4444";
  }

  function handleCloseLeave(e) {
    e.currentTarget.style.backgroundColor = "#f8fafc";
    e.currentTarget.style.color = "#64748b";
  }

  // Helper for file description
  function getFileDescription() {
    if (file?.type === "pdf") return "Tài liệu PDF";
    if (file?.type === "image") return "Hình ảnh";
    return "Tài liệu";
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={handleStopPropagation}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.fileInfoBox}>
            <div style={styles.iconWrapper}>
              <FileText size={20} />
            </div>
            <div>
              <h3 style={styles.fileName}>{file?.name || "Xem trước tài liệu"}</h3>
              <p style={styles.fileType}>{getFileDescription()}</p>
            </div>
          </div>

          <div style={styles.actions}>
            {file?.url && (
              <a
                href={file.url}
                download={file.name}
                style={styles.downloadLink}
                onMouseEnter={handleDownloadEnter}
                onMouseLeave={handleDownloadLeave}
              >
                <Download size={18} />
                Tải về
              </a>
            )}
            <button
              onClick={onClose}
              style={styles.closeBtn}
              onMouseEnter={handleCloseEnter}
              onMouseLeave={handleCloseLeave}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div style={styles.contentArea}>
          {loading ? (
            <div style={styles.loadingBox}>
              <span className="animate-spin" style={styles.loader}>
                <Loader2 size={40} />
              </span>
              <p style={styles.loadingText}>Đang chuẩn bị tài liệu...</p>
            </div>
          ) : file?.url ? (
            (function () {
              if (file.type === "pdf") {
                return <iframe src={file.url} style={styles.iframe} title="File Preview" />;
              }
              if (file.type === "image") {
                return <AuthImage src={file.url} alt="Preview" customStyle={styles.imagePreview} />;
              }
              if (file.type === "html") {
                return (
                  <iframe
                    srcDoc={file.html || ""}
                    style={Object.assign({}, styles.iframe, { background: "#fff" })}
                    title="File Preview"
                  />
                );
              }
              return (
                <div style={styles.fallbackContainer}>
                  <span style={{ color: "#94a3b8", marginBottom: "16px", display: "inline-block" }}>
                    <FileText size={48} />
                  </span>
                  <p style={styles.fallbackText}>Không hỗ trợ xem trước định dạng này.</p>
                  <a href={file.url} download={file.name} style={styles.fallbackLink}>
                    Tải về để xem
                  </a>
                </div>
              );
            })()
          ) : (
            <div style={styles.fallbackText}>Không có tệp để hiển thị</div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default FilePreviewModal;