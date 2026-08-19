import React, { useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BLOCKS } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/config/blocks";

export function SortableBlock({ block, onSelect, isEditing, onDelete, onResize, activePage }) {
  const sortable = useSortable({ id: block.id, disabled: !isEditing });
  const { attributes, listeners, setNodeRef } = sortable;

  const blockWidth = block.props?.width || 100;
  const blockHeight = block.props?.height || "";

  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    marginBottom: 12,
    position: "relative",
    opacity: 1,
    flex: `0 0 ${blockWidth}%`,
    maxWidth: `${blockWidth}%`,
    display: "flex",
    flexDirection: "column",
    ...(blockHeight ? { minHeight: Number(blockHeight) } : {})
  };

  const handleResizeMouseDown = useCallback((e) => {
    if (!isEditing || !onResize) return;
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = Number(block.props?.width || 100);
    const startHeight = Number(block.props?.height || 0);

    const onMouseMove = (ev) => {
      const deltaX = ev.clientX - startX;
      const deltaY = ev.clientY - startY;

      // Đơn giản: mỗi ~5px tương đương 1% chiều rộng
      const newWidth = Math.max(25, Math.min(100, startWidth + deltaX / 5));
      const rawHeight = startHeight || 0;
      const newHeight = Math.max(0, rawHeight + deltaY);

      onResize(block.id, {
        width: Math.round(newWidth),
        // Nếu height <= 0 thì cho về "" để auto
        height: newHeight > 40 ? Math.round(newHeight) : ""
      });
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [isEditing, onResize, block.id, block.props?.width, block.props?.height]);

  const handleDeleteClick = useCallback((e) => {
    e.stopPropagation();
    onDelete(block.id);
  }, [onDelete, block.id]);

  const handleSelectClick = useCallback(() => {
    onSelect(block);
  }, [onSelect, block]);

  const blockConfig = BLOCKS[block.type];
  const Comp = blockConfig?.component;

  if (!Comp) {
    return (
      <div ref={setNodeRef} style={style}>
        <div style={{ color: "red", padding: 10, border: "1px dashed red" }}>
          Lỗi: Không tìm thấy thành phần cho block &quot;{block.type}&quot;
        </div>
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div ref={setNodeRef} style={style}>
        <Comp id={block.id} {...block.props} activePage={activePage} />
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {/* Liferay-style Portlet Decorator */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#30313F", color: "#fff", padding: "4px 10px", borderRadius: "4px 4px 0 0", fontSize: 12 }}>
        <div {...listeners} style={{ cursor: "grab", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ opacity: 0.7 }}>⠿</span> <span>{blockConfig.label}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleDeleteClick}
            style={{ background: "none", border: "none", color: "#ff6b6b", cursor: "pointer", fontWeight: "bold" }}
          >✕</button>
        </div>
      </div>
      <div
        style={{ border: "2px solid #30313F", borderTop: "none", borderRadius: "0 0 4px 4px", background: block.props?.backgroundColor || "#fff", cursor: "pointer", position: "relative", flex: 1, display: "flex", flexDirection: "column" }}
        onClick={handleSelectClick}
      >
        <Comp id={block.id} {...block.props} activePage={activePage} />
        {/* Resize handle góc dưới bên phải */}
        <div
          onMouseDown={handleResizeMouseDown}
          style={{
            position: "absolute",
            right: 4,
            bottom: 4,
            width: 12,
            height: 12,
            background: "#0B5FFF",
            borderRadius: 2,
            cursor: "nwse-resize",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.15)"
          }}
        />
      </div>
    </div>
  );
}
