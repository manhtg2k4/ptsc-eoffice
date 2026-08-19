
import { useState } from 'react';

export const useDragAndDrop = (initialItems, onItemsChange, onDropChild) => {
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [isDrag, setIsDrag] = useState(false);

  const handleDragStart = (e, draggedItem) => {
    setIsDrag(true);
    const index = initialItems.findIndex((i) => i.id === draggedItem.id);
    setDragIndex(index);
    e.dataTransfer.setData('text/plain', draggedItem.id);
    e.dataTransfer.setData('type', draggedItem.type);
  };

  const handleDragOver = (e, targetItem) => {
    e.preventDefault();
    setDragOverId(targetItem?.id || null);
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e, targetItem) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);
     setIsDrag(false);

    const draggedId = e.dataTransfer.getData('text/plain');
    const draggedType = e.dataTransfer.getData('type');

    if (!draggedId && draggedType) {
      onDropChild(draggedType);
      return;
    }

    if (dragIndex === null) return;
    const targetIndex = initialItems.findIndex((i) => i.id === targetItem?.id);
    if (targetIndex === -1 || dragIndex === targetIndex) return;

    const updated = [...initialItems];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(targetIndex, 0, moved);
    onItemsChange(updated);
    setDragIndex(null);
  };

  const handleDropNewItem = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const type = e.dataTransfer.getData('type');
    if (type) {
      onDropChild(type);
    }
    setDragOverId(null);
    setIsDrag(false);
  };

  return {
    dragOverId,
    isDrag,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDropNewItem,
  };
};

