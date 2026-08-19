import React, { useState, useCallback } from 'react';
import { X, Send } from 'lucide-react';
import { toast } from 'react-toastify';
import styled from 'styled-components';
import axiosClient from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/hooks/axiosClient";
import { API_COMMENTS } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/EnvironmentFile/urlConfig";

const ModalWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  padding: 20px;

  .opm-container {
    background: white;
    width: 100%;
    max-width: 500px;
    border-radius: 16px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    overflow: hidden;
    animation: opm-slide-up 0.3s ease-out;
  }

  @keyframes opm-slide-up {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .opm-header {
    padding: 20px 24px;
    border-bottom: 1px solid #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .opm-title {
    font-size: 18px;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
  }

  .opm-close-btn {
    background: #f8fafc;
    border: none;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
  }

  .opm-body {
    padding: 24px;
  }

  .opm-label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: #475569;
    margin-bottom: 8px;
  }

  .opm-textarea {
    width: 100%;
    min-height: 120px;
    padding: 12px 16px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    font-size: 14px;
    line-height: 1.5;
    color: #1e293b;
    resize: vertical;
    transition: border-color 0.2s;
    background: #f8fafc;

    &:focus {
      outline: none;
      border-color: #3b82f6;
      background: white;
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
    }

    &::placeholder {
      color: #94a3b8;
    }
  }

  .opm-footer {
    padding: 16px 24px;
    background: #f8fafc;
    border-top: 1px solid #f1f5f9;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .opm-btn {
    padding: 10px 20px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .opm-btn-cancel {
    background: white;
    color: #64748b;
    border: 1px solid #e2e8f0;

    &:hover {
      background: #f1f5f9;
      color: #1e293b;
    }
  }

  .opm-btn-submit {
    background: #3b82f6;
    color: white;
    display: flex;
    align-items: center;
    gap: 8px;

    &:hover {
      background: #2563eb;
      transform: translateY(-1px);
    }

    &:disabled {
      background: #94a3b8;
      cursor: not-allowed;
      transform: none;
    }
  }
`;

export default function OpinionModal({ isOpen, onClose, newsTitle, newsId }) {
  const [opinion, setOpinion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStopPropagation = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const handleOpinionChange = useCallback((e) => {
    setOpinion(e.target.value);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!opinion.trim() || !newsId) return;

    setIsSubmitting(true);
    try {
      const payload = {
        content: opinion.trim(),
        type: "feedbackNews",
        mentionIds: [],
        fileId: []
      };

      await axiosClient.post(`${API_COMMENTS}?refType=news&refId=${newsId}`, payload);
      
      toast.success('Cảm ơn bạn đã đóng góp ý kiến!');
      setOpinion('');
      onClose();
    } catch (error) {
      toast.error('Có lỗi xảy ra khi gửi góp ý, vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  }, [opinion, newsId, onClose]);

  if (!isOpen) return null;

  return (
    <ModalWrapper onClick={onClose}>
      <div className="opm-container" onClick={handleStopPropagation}>
        <div className="opm-header">
          <h2 className="opm-title">Góp ý nội dung</h2>
          <button className="opm-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        
        <div className="opm-body">
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
            Ý kiến của bạn về bài viết: <strong style={{ color: '#1e293b' }}>{newsTitle}</strong>
          </p>
          
          <label className="opm-label">Nội dung góp ý</label>
          <textarea
            className="opm-textarea"
            placeholder="Hãy cho chúng tôi biết ý kiến hoặc đề xuất của bạn..."
            value={opinion}
            onChange={handleOpinionChange}
          />
        </div>

        <div className="opm-footer">
          <button className="opm-btn opm-btn-cancel" onClick={onClose}>
            Hủy
          </button>
          <button 
            className="opm-btn opm-btn-submit" 
            onClick={handleSubmit}
            disabled={!opinion.trim() || isSubmitting}
          >
            {isSubmitting ? 'Đang gửi...' : 'Gửi ý kiến'}
            {!isSubmitting && <Send size={16} />}
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}
