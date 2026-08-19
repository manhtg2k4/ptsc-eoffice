import React from 'react';
// import { registry } from '../utils/componentRegistry.jsx';
import { registry } from '@utils/componentRegistry.jsx';


const layoutTypes = ['row', 'column', 'grid3'];

export default function Canvas({ elements, setElements }) {
  const handleDrop = (e) => {
    const type = e.dataTransfer.getData('type');
    if (type && registry[type]) {
      setElements((prev) => [...prev, { id: Date.now(), type, children: [], props: {} }]);
    }
  };

  const addChildRecursive = (items, targetId, childType) =>
    items.map((el) => {
      if (el.id === targetId && layoutTypes.includes(el.type)) {
        return {
          ...el,
          children: [...(el.children || []), { id: Date.now(), type: childType, children: [], props: {} }]
        };
      }
      if (el.children) {
        return { ...el, children: addChildRecursive(el.children, targetId, childType) };
      }
      return el;
    });

  const handleDropChild = (targetId, childType) => {
    setElements((prev) => addChildRecursive(prev, targetId, childType));
  };

  const updatePropRecursive = (items, targetId, key, value) =>
    items.map((el) => {
      if (el.id === targetId) {
        return { ...el, props: { ...el.props, [key]: value } };
      }
      if (el.children) {
        return { ...el, children: updatePropRecursive(el.children, targetId, key, value) };
      }
      return el;
    });

  const handlePropChange = (id, key, value) => {
    setElements((prev) => updatePropRecursive(prev, id, key, value));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div
      className="canvas grid-layout"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {elements.length === 0 ? (
        <p className="canvas-placeholder">Drag components here...</p>
      ) : null}
      {elements.map((item) => renderItem(item))}
    </div>
  );

  function renderItem(item) {
    const Cmp = registry[item.type]?.component;
    if (!Cmp) return null;
    if (layoutTypes.includes(item.type)) {
      return (
        <Cmp
              mode="builder"
          key={item.id}
          item={{ ...item, registry }}
          onDropChild={handleDropChild}
          onPropChange={handlePropChange}
        />
      );
    }
    return (
      <div key={item.id} className="form-grid-item">
        <Cmp item={item} onPropChange={handlePropChange} />
      </div>
    );
  }
}
