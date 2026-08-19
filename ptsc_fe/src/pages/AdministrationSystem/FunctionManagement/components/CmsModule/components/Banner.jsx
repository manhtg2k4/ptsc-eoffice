import React from 'react';

export const Banner = ({ title }) => {
  // Ví dụ sử dụng biến môi trường ở client component
  const onlyOfficeUrl = process.env.NEXT_PUBLIC_URL_ONLYOFFICE;

  return (
    <div style={{ padding: 16, background: "#1976d2", color: "#fff" }}>
      <h3>{title}</h3>
      <p style={{ fontSize: 'small', opacity: 0.8, margin: '8px 0 0' }}>URL từ env: {onlyOfficeUrl}</p>
    </div>
  );
};