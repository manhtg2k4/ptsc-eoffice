import React from 'react';
import { COMPONENT_MAP } from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/config/componentMapping';
import { useCMS } from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/context/CMSContext';

export const Feature = ({ id, title, desc, childComponent, loading: blockLoading, backgroundColor, ...restProps }) => {
  const { isLoading } = useCMS();
  const loading = blockLoading || isLoading;
  const ChildComp = childComponent && COMPONENT_MAP[childComponent] ? COMPONENT_MAP[childComponent].component : null;

  if (loading) {
    return (
      <div style={{ padding: 20, borderRadius: 8, background: "transparent" }}>
        <div className="skeleton" style={{ width: '40%', height: '24px', margin: '0 auto 12px' }}></div>
        <div className="skeleton" style={{ width: '80%', height: '16px', margin: '0 auto 15px' }}></div>
        <div style={{ marginTop: 15, borderTop: "1px dashed #eee", paddingTop: 10 }}>
          <div className="skeleton" style={{ width: '100%', height: '150px', borderRadius: '8px' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, borderRadius: 8, textAlign: "center", background: backgroundColor || "transparent" }}>
      <h4 style={{ marginTop: 0 }}>{title || "Feature"}</h4>
      <p style={{ color: "#666" }}>{desc || "Description goes here"}</p>
      {ChildComp && (
        <div style={{ marginTop: 15, borderTop: "1px dashed #eee", paddingTop: 10 }}>
          {/* Truyền id để News có thể sử dụng localStorage nếu cần */}
          <ChildComp
            id={id ? `${id}-child` : undefined}
            title={title}
            text={desc}
            content={desc}
            {...restProps}
          />
        </div>
      )}
    </div>
  );
};