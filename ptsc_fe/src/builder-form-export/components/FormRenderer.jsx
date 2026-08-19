import React, { useState } from 'react';
// eslint-disable-next-line no-restricted-imports
import { registry } from '../utils/componentRegistry.jsx';

const layoutTypes = ['row', 'column', 'grid3'];

export default function FormRenderer({ definition }) {
  const [formData, setFormData] = useState(null);

  if (!definition || definition.length === 0) {
    return <p>No form found.</p>;
  }

  const renderItem = (item) => {
    const Cmp = registry[item.type]?.component;
    if (!Cmp) return null;
    if (layoutTypes.includes(item.type)) {
      return (
        <Cmp key={item.id} item={{ ...item, registry }}>
          {item.children?.map((child) => renderItem(child))}
        </Cmp>
      );
    }
    return <Cmp key={item.id} item={item} mode="viewer" />;
  }; 

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {};
    const form = e.target;
    const inputs = form.querySelectorAll('input[name]');
    inputs.forEach((input) => {
      data[input.name] = input.value;
    });
    setFormData(data);
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        {definition.map(renderItem)}
        <button type="submit">Lưu</button>
      </form>
      {formData && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Kết quả:</h3>
          <pre>{JSON.stringify(formData, null, 2)}</pre>
        </div>
      )}
    </>
  );
}
