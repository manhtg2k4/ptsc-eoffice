import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { APP_BASE, BASE_URL_DOCUMENT, BASE_URL_DOCUMENT_LOCAL } from '@EnvironmentFile/constants/urlConfig';
import { EditStyled } from "@styles/UploadFile/UploadFile.style";

export default function CollaboraEditor({ fileId, fileName, onEditorLoaded }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch Collabora config từ backend
  useEffect(() => {
    if (!fileId) return;

    const fetchConfig = async () => {
      try {
        setLoading(true);
        const userToken =
          localStorage.getItem('token') ||
          localStorage.getItem('access_token') ||
          localStorage.getItem('wso2_access_token');
        const requestUrl = `${APP_BASE}/api/files/collabora/config/${fileId}?mode=edit`;

        const response = await fetch(
          requestUrl,
          {
            credentials: 'include',
            headers: {
              'Authorization': `Bearer ${userToken}`,
              'Content-Type': 'application/json'
            }
          }
        );


        if (!response.ok) {
         if (response?.status === 403) {
          throw new Error('Văn bản đã được ký số, không thể chỉnh sửa nội dung.');
          }

          throw new Error('Failed to load Collabora config');
        }

        const data = await response.json();
  
        setConfig(data);
      } catch (err) {
    
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [fileId]);

  // Tạo Collabora iframe URL từ config
  const collaboraUrl = useMemo(() => {
    if (!config || !config.collaboraActionUrl) return null;

    const params = new URLSearchParams({
      WOPISrc: config.wopiSrc,
      // eslint-disable-next-line camelcase
      access_token: config.accessToken,
    });

    // Replace domain từ discovery URL sang server thật
    const actionUrl = config.collaboraActionUrl.replace(
      BASE_URL_DOCUMENT_LOCAL,
      BASE_URL_DOCUMENT
    );

    // Xử lý dấu '?' để tránh bị lặp thành '??'
    const separator = actionUrl.includes('?') ? (actionUrl.endsWith('?') ? '' : '&') : '?';
    const finalUrl = `${actionUrl}${separator}${params.toString()}`;

    return finalUrl;
  }, [config]);

  if (loading) {
    return <div>Đang tải...</div>;
  }

  if (error) {
    return <div>Lỗi: {error}</div>;
  }

  if (!collaboraUrl) {
    return <div>Không thể tải nội dung</div>;
  }
   
  const handleEditorLoad = () => {
    if (onEditorLoaded) {
      onEditorLoaded();
    }
  }

  return (
    <EditStyled>
      <iframe
        src={collaboraUrl}
        style={{ width: '100%', height: '100%', border: 'none' }}
        title={`Document Editor - ${fileName || 'Document'}`}
        allow="clipboard-read; clipboard-write; fullscreen"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-popups-to-escape-sandbox"
        onLoad={handleEditorLoad}
      />
    </EditStyled>
  );
}

CollaboraEditor.propTypes = {
  fileId: PropTypes.string.isRequired,
  fileName: PropTypes.string,
  onEditorLoaded: PropTypes.func,
};
