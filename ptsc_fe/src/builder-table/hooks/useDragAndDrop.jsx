
import { useState, useCallback } from 'react';

export const useDragAndDrop = (children, onUpdateChildren, onDropChild) => {
  const [dragOverId, setDragOverId] = useState(null);

  const handleDragStart = useCallback((e, item) => {
    e.dataTransfer.setData('item', JSON.stringify(item));
  }, []);

  const handleDragOver = useCallback((e, item) => {
    e.preventDefault();
    setDragOverId(item.id);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback((e, target) => {
    e.preventDefault();
    const rawData = e.dataTransfer.getData('item');
    if (!rawData) return;
    try {
      const item = JSON.parse(rawData);
      if (!item || item.id === target.id) return;

      const updatedChildren = [...children];
      const fromIndex = children.findIndex((el) => el.id === item.id);
      const toIndex = children.findIndex((el) => el.id === target.id);

      if (fromIndex !== -1 && toIndex !== -1) {
        updatedChildren.splice(fromIndex, 1);
        updatedChildren.splice(toIndex, 0, item);
        onUpdateChildren(updatedChildren);
      }
    } catch (err) {
      // Bỏ qua lỗi parse nếu kéo thả file từ ngoài hệ thống
    }
    setDragOverId(null);
  }, [children, onUpdateChildren]);

  const handleDropNewItem = useCallback((e, slot) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('type');
    if (type) {
      onDropChild(type, slot);
    }
    setDragOverId(null);
  }, [onDropChild]);

  return {
    dragOverId,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDropNewItem,
  };
};