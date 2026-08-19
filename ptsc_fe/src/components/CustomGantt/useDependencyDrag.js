import { useState, useCallback, useRef, useEffect } from "react";

/**
 * Custom hook quản lý logic kéo thả tạo dependency
 * @param {Object} options
 * @param {Object} options.contentRef - Ref đến GanttContent container
 * @param {Array} options.dependencies - Danh sách dependency hiện tại
 * @param {Function} options.onDependencyCreate - Callback khi tạo dependency mới
 * @param {Function} options.validateDependency - Hàm validate dependency (optional)
 * @returns {Object} - State và handlers cho dependency drag
 */
function useDependencyDrag({
  contentRef,
  dependencies = [],
  onDependencyCreate,
  validateDependency,
}) {
  // State quản lý quá trình kéo
  const [dragState, setDragState] = useState(null);
  // State highlight task đang hover
  const [hoveredTaskId, setHoveredTaskId] = useState(null);
  // Kiểm tra target có hợp lệ không
  const [isValidTarget, setIsValidTarget] = useState(false);
  
  // Map lưu ref DOM của từng task bar để tính anchor
  const taskBarRefs = useRef(new Map());

  /**
   * Kiểm tra dependency có hợp lệ không
   * @param {string} fromId - ID task nguồn
   * @param {string} toId - ID task đích
   * @returns {boolean}
   */
  const isValidDependency = useCallback((fromId, toId) => {
    // Không cho phép tự link đến chính nó
    if (fromId === toId) return false;
    
    // Không cho phép tạo trùng
    const exists = dependencies.some(
      (dep) => dep.fromId === fromId && dep.toId === toId
    );
    if (exists) return false;
    
    // Kiểm tra cycle đơn giản (A -> B và B -> A)
    const reverseExists = dependencies.some(
      (dep) => dep.fromId === toId && dep.toId === fromId
    );
    if (reverseExists) return false;
    
    // Custom validation nếu có
    if (validateDependency) {
      return validateDependency(fromId, toId);
    }
    
    return true;
  }, [dependencies, validateDependency]);

  /**
   * Bắt đầu kéo từ một task
   * @param {Event} e - Mouse event
   * @param {string} taskId - ID task bắt đầu kéo
   */
  const handleDragStart = useCallback((e, taskId) => {
    e.preventDefault();
    e.stopPropagation();
    
    const contentEl = contentRef?.current;
    if (!contentEl) return;
    
    const contentRect = contentEl.getBoundingClientRect();
    
    // Tính tọa độ tương đối trong GanttContent (coordinate space của SVG)
    // KHÔNG cộng scrollLeft/scrollTop vì getBoundingClientRect của cả
    // contentEl lẫn cursor đều bị ảnh hưởng bởi scroll như nhau → tự triệt tiêu
    const startPoint = {
      x: e.clientX - contentRect.left,
      y: e.clientY - contentRect.top,
    };
    
    setDragState({
      fromId: taskId,
      startPoint,
      currentPoint: startPoint,
    });
  }, [contentRef]);

  /**
   * Cập nhật vị trí con trỏ khi đang kéo
   * @param {Event} e - Mouse event
   */
  const handleDragMove = useCallback((e) => {
    if (!dragState) return;
    
    const contentEl = contentRef?.current;
    if (!contentEl) return;
    
    const contentRect = contentEl.getBoundingClientRect();
    
    const currentPoint = {
      x: e.clientX - contentRect.left,
      y: e.clientY - contentRect.top,
    };
    
    setDragState((prev) => ({
      ...prev,
      currentPoint,
    }));
  }, [dragState, contentRef]);

  /**
   * Kết thúc kéo
   * @param {string|null} targetTaskId - ID task đích (null nếu thả vào vùng trống)
   */
  const handleDragEnd = useCallback((targetTaskId = null) => {
    if (!dragState) return;
    
    const { fromId } = dragState;
    
    // Kiểm tra hợp lệ và tạo dependency
    if (targetTaskId && isValidDependency(fromId, targetTaskId)) {
      onDependencyCreate?.({
        fromId,
        toId: targetTaskId,
        type: "FS", // Finish-to-Start mặc định
      });
    }
    
    // Reset state
    setDragState(null);
    setHoveredTaskId(null);
    setIsValidTarget(false);
  }, [dragState, isValidDependency, onDependencyCreate]);

  /**
   * Xử lý khi hover vào task trong lúc kéo
   * @param {string} taskId - ID task đang hover
   */
  const handleTaskHover = useCallback((taskId) => {
    if (!dragState) return;
    
    setHoveredTaskId(taskId);
    setIsValidTarget(isValidDependency(dragState.fromId, taskId));
  }, [dragState, isValidDependency]);

  /**
   * Xử lý khi rời khỏi task trong lúc kéo
   */
  const handleTaskLeave = useCallback(() => {
    setHoveredTaskId(null);
    setIsValidTarget(false);
  }, []);

  /**
   * Đăng ký ref cho task bar
   * @param {string} taskId - ID task
   * @param {HTMLElement} element - DOM element
   */
  const registerTaskBar = useCallback((taskId, element) => {
    if (element) {
      taskBarRefs.current.set(taskId, element);
    } else {
      taskBarRefs.current.delete(taskId);
    }
  }, []);

  /**
   * Tính toán anchor points cho tất cả task bars
   * @returns {Object} - Map taskId -> {left: {x,y}, right: {x,y}}
   */
  const calculateTaskAnchors = useCallback(() => {
    const contentEl = contentRef?.current;
    if (!contentEl) return {};
    
    const contentRect = contentEl.getBoundingClientRect();
    const anchors = {};
    
    taskBarRefs.current.forEach((element, taskId) => {
      if (!element) return;
      
      const rect = element.getBoundingClientRect();
      
      // Tính tọa độ tương đối trong GanttContent (SVG coordinate space)
      // KHÔNG cộng scrollLeft/scrollTop: khi container scroll, cả contentEl
      // lẫn mỗi bar đều dịch cùng một lượng nên tự triệt tiêu.
      // Công thức đúng: rect.left - contentRect.left (không cần scroll offset)
      const left = {
        x: rect.left - contentRect.left,
        y: rect.top - contentRect.top + rect.height / 2,
      };
      
      const right = {
        x: rect.right - contentRect.left,
        y: rect.top - contentRect.top + rect.height / 2,
      };
      
      anchors[taskId] = { left, right };
    });
    
    return anchors;
  }, [contentRef]);

  // Lắng nghe sự kiện mouse move và mouse up toàn cục khi đang kéo
  useEffect(() => {
    if (!dragState) return;
    
    const handleGlobalMouseMove = (e) => {
      handleDragMove(e);
    };
    
    const handleGlobalMouseUp = () => {
      // Nếu đang hover task thì tạo dependency
      handleDragEnd(hoveredTaskId);
    };
    
    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    
    // Thay đổi cursor toàn trang
    document.body.style.cursor = "crosshair";
    
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      document.body.style.cursor = "";
    };
  }, [dragState, hoveredTaskId, handleDragMove, handleDragEnd]);

  return {
    // State
    dragState,
    hoveredTaskId,
    isValidTarget,
    isDragging: !!dragState,
    
    // Handlers
    handleDragStart,
    handleDragEnd,
    handleTaskHover,
    handleTaskLeave,
    
    // Refs và utils
    registerTaskBar,
    calculateTaskAnchors,
  };
}

export default useDependencyDrag;
