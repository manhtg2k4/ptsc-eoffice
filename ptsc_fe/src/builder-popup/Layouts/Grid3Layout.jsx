import React from 'react';

export default function Grid3Layout({ item, onDropChild, onPropChange }) {
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const type = e.dataTransfer.getData('type');
    if (type) {
      onDropChild(item.id, type);
    }
  };
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div
      className="form-grid3-layout"
      onDragOver={handleDragOver}

      onDrop={handleDrop}
    >
      {item.children?.length > 0 ? (
        item.children.map((child, i) => {
          const Cmp = item.registry[child.type]?.component;
          if (!Cmp) return null;
          if (['row', 'column', 'grid3'].includes(child.type)) {
            return (
              <Cmp
                key={i}
                item={{ ...child, registry: item.registry }}
                onDropChild={onDropChild}
                onPropChange={onPropChange}
              />
            );
          }
          return <Cmp key={i} item={child} onPropChange={onPropChange} />;
        })
      ) : (
        <span style={{ color: '#999' }}>Drop here</span>
      )}
    </div>
  );
}
