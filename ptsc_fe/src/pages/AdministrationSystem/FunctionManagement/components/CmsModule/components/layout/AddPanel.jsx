import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { BLOCKS } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/config/blocks";

// --- Styles ---
const styles = {
  panelContainer: {
    paddingBottom: 16
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "clamp(12px, 3vw, 24px)",
    paddingBottom: "clamp(8px, 2vw, 16px)",
    borderBottom: "1px solid #eaecf0"
  },
  headerTitleWrapper: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0
  },
  headerIcon: {
    color: "#0B5FFF",
    flexShrink: 0
  },
  headerText: {
    margin: 0,
    fontSize: "clamp(16px, 4vw, 18px)",
    color: "#101828",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  closeButton: {
    cursor: "pointer",
    border: "none",
    background: "transparent",
    color: "#667085",
    padding: 4,
    display: "flex"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 12
  },
  itemOuter: {
    padding: "12px 16px",
    border: "1px solid #eaecf0",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    gap: 12,
    transition: "all 0.2s ease",
    boxShadow: "0 1px 2px rgba(16, 24, 40, 0.05)",
    cursor: "grab",
    borderRadius: 8 // Thêm bo góc cho đồng bộ
  },
  itemInner: {
    padding: "clamp(8px, 3vw, 12px) clamp(10px, 4vw, 16px)",
    border: "1px solid #eaecf0",
    borderRadius: 8,
    background: "#fff",
    display: "flex",
    alignItems: "center",
    gap: "clamp(8px, 3vw, 12px)",
    boxShadow: "0 1px 2px rgba(16, 24, 40, 0.05)",
    width: "100%"
  },
  iconBox: {
    width: "clamp(32px, 10vw, 40px)",
    height: "clamp(32px, 10vw, 40px)",
    background: "#f0f9ff",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#0B5FFF",
    flexShrink: 0
  },
  textWrapper: {
    flex: 1,
    minWidth: 0
  },
  label: {
    fontWeight: 600,
    fontSize: 13,
    color: "#344054",
    marginBottom: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  subLabel: {
    fontSize: 11,
    color: "#667085"
  }
};

// --- Icons ---
function IconGrid() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// --- Components ---

function DraggableItem(props) {
  const { type, children, onClick } = props;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: "new-" + type,
    data: { type, isNew: true }
  });

  const draggingStyle = {
    opacity: isDragging ? 0.5 : 1
  };

  function handleMouseEnter(e) {
    e.currentTarget.style.borderColor = "#0B5FFF";
    e.currentTarget.style.boxShadow = "0 4px 12px rgba(11, 95, 255, 0.1)";
    e.currentTarget.style.transform = "translateY(-2px)";
  }

  function handleMouseLeave(e) {
    e.currentTarget.style.borderColor = "#eaecf0";
    e.currentTarget.style.boxShadow = "0 1px 2px rgba(16, 24, 40, 0.05)";
    e.currentTarget.style.transform = "translateY(0)";
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ ...styles.itemOuter, ...draggingStyle }}
    >
      {children}
    </div>
  );
}

export function AddPanel(props) {
  const { onAddBlock, onClose } = props;

  return (
    <div style={styles.panelContainer}>
      <div style={styles.header}>
        <div style={styles.headerTitleWrapper}>
          <div style={styles.headerIcon}>
            <IconGrid />
          </div>
          <h3 style={styles.headerText}>Thư viện</h3>
        </div>
        <button onClick={onClose} style={styles.closeButton}>
          <IconClose />
        </button>
      </div>

      <div style={styles.grid}>
        {Object.keys(BLOCKS).map(function (t) {
          function handleItemClick() {
            const schemaKeys = Object.keys(BLOCKS[t].schema);
            const defaultProps = {};
            
            // Khởi tạo giá trị mặc định từ schema
            for (let i = 0; i < schemaKeys.length; i++) {
              const key = schemaKeys[i];
              defaultProps[key] = "";
            }

            if ("width" in defaultProps) defaultProps.width = 100;
            if ("height" in defaultProps) defaultProps.height = "";

            onAddBlock({
              id: Date.now().toString(),
              type: t,
              props: defaultProps
            });
          }

          return (
            <DraggableItem
              key={t}
              type={t}
              onClick={handleItemClick}
            >
              <div style={styles.itemInner}>
                <div style={styles.iconBox}>
                  <IconPlus />
                </div>
                <div style={styles.textWrapper}>
                  <div style={styles.label}>
                    {BLOCKS[t].label}
                  </div>
                  <div style={styles.subLabel}>
                    Click để thêm
                  </div>
                </div>
              </div>
            </DraggableItem>
          );
        })}
      </div>
    </div>
  );
}