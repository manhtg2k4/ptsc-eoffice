import React from 'react';
import AuthImage from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimImage';
import { DEFAULT_NEWS_THUMBNAIL } from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/utils/imageHelper';

export const Image = ({ src }) => (
  <div style={{ padding: 10, textAlign: "center" }}>
    <AuthImage src={src || DEFAULT_NEWS_THUMBNAIL} alt="Block" customStyle={{ maxWidth: "100%", borderRadius: 4 }} />
  </div>
);