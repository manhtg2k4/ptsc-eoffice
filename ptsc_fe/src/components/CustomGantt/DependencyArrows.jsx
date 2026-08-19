import { memo, useMemo } from "react";
import { DependencyOverlay } from "@styles/Gantt/Grantt.styles";

/**
 * Tính toán đường path SVG cho mũi tên dependency
 * Sử dụng đường vuông góc (orthogonal) để vẽ mũi tên
 * @param {Object} from - Điểm bắt đầu {x, y}
 * @param {Object} to - Điểm kết thúc {x, y}
 * @returns {string} - Path SVG
 */
const calculateArrowPath = (from, to) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  // Khoảng cách offset từ bar
  const horizontalOffset = 15;
  const verticalGap = 10;

  // Nếu target ở bên phải và phía dưới/trên source
  if (dx > horizontalOffset * 2) {
    // Đường đi: phải -> xuống/lên -> phải
    const midX = from.x + (to.x - from.x) / 2;

    return `M ${from.x} ${from.y}
            L ${midX} ${from.y}
            L ${midX} ${to.y}
            L ${to.x} ${to.y}`;
  }

  // Nếu target ở gần hoặc bên trái source (cần vẽ đường vòng)
  // Đường đi: phải -> xuống -> trái -> xuống -> phải
  const rightOffset = from.x + horizontalOffset;
  const leftOffset = to.x - horizontalOffset;

  // Tính điểm giữa theo chiều dọc
  let midY;
  if (dy > 0) {
    // Target ở dưới
    midY = from.y + Math.abs(dy) / 2 + verticalGap;
  } else {
    // Target ở trên
    midY = from.y - Math.abs(dy) / 2 - verticalGap;
  }

  return `M ${from.x} ${from.y}
          L ${rightOffset} ${from.y}
          L ${rightOffset} ${midY}
          L ${leftOffset} ${midY}
          L ${leftOffset} ${to.y}
          L ${to.x} ${to.y}`;
};

/**
 * Component render một mũi tên dependency
 */
const DependencyArrow = memo(function DependencyArrow({
  from,
  to,
  isPreview = false,
  arrowColor = "#999",
}) {
  const path = useMemo(() => calculateArrowPath(from, to), [from, to]);
  const arrowId = useMemo(
    () =>
      `arrow-${isPreview ? "preview" : `${from.x}-${from.y}-${to.x}-${to.y}`}`,
    [isPreview, from, to]
  );

  const strokeColor = isPreview ? "#1976d2" : arrowColor;

  return (
    <g>
      {/* Định nghĩa marker mũi tên */}
      <defs>
        <marker
          id={arrowId}
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="2"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,4 L7,2 z" fill={strokeColor} />
        </marker>
      </defs>

      {/* Đường path chính */}
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeDasharray={isPreview ? "5,5" : undefined}
        markerEnd={`url(#${arrowId})`}
      />
    </g>
  );
});

/**
 * Component SVG overlay chứa tất cả mũi tên dependency
 * @param {Array} dependencies - Danh sách dependency [{id, fromId, toId}]
 * @param {Object} taskAnchors - Map task ID -> anchor positions {left: {x,y}, right: {x,y}}
 * @param {Object} dragState - State khi đang kéo {fromId, startPoint, currentPoint}
 * @param {number} svgWidth - Chiều rộng SVG
 * @param {number} svgHeight - Chiều cao SVG
 */
function DependencyArrows({
  dependencies = [],
  taskAnchors = {},
  dragState = null,
  svgWidth = "100%",
  svgHeight = "100%",
}) {
  // Render các mũi tên dependency đã lưu
  const renderedArrows = useMemo(() => {
    return dependencies
      .map((dep) => {
        const fromAnchor = taskAnchors[dep.fromId];
        const toAnchor = taskAnchors[dep.toId];

        // Skip nếu không tìm thấy anchor
        if (!fromAnchor || !toAnchor) return null;

        // Từ điểm phải của task A đến điểm trái của task B
        const from = fromAnchor.right;
        const to = toAnchor.left;

        if (!from || !to) return null;

        return (
          <DependencyArrow
            key={dep.id}
            from={from}
            to={to}
            arrowColor={'#999'}
          />
        );
      })
      .filter(Boolean);
  }, [dependencies, taskAnchors]);

  // Render preview arrow khi đang kéo
  const previewArrow = useMemo(() => {
    if (!dragState || !dragState.fromId || !dragState.currentPoint) return null;

    const fromAnchor = taskAnchors[dragState.fromId];
    if (!fromAnchor || !fromAnchor.right) return null;

    return (
      <DependencyArrow
        from={fromAnchor.right}
        to={dragState.currentPoint}
        isPreview
      />
    );
  }, [dragState, taskAnchors]);

  return (
    <DependencyOverlay svgWidth={svgWidth} svgHeight={svgHeight}>
      {renderedArrows}
      {previewArrow}
    </DependencyOverlay>
  );
}

DependencyArrows.displayName = "DependencyArrows";

export default memo(DependencyArrows);
