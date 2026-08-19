import scStyled, { keyframes } from 'styled-components';

const cemFadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const cemSlideIn = keyframes`
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const cemPillPop = keyframes`
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
`;

export const ModalWrapper = scStyled.div`
  .cem-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(4px);
    padding: 20px;
  }

  .cem-modal-card {
    background: white;
    border-radius: 40px;
    padding: 40px 60px 40px;
    width: 100%;
    max-width: 680px;
    position: relative;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
    animation: ${cemFadeIn} 0.3s ease-out;
  }

  .cem-close-btn {
    position: absolute;
    top: 24px;
    right: 24px;
    background: transparent;
    border: none;
    width: 32px;
    height: 32px;
    cursor: pointer;
    color: #94a3b8;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cem-header {
    text-align: center;
    margin-bottom: 30px;
  }

  .cem-icon-placeholder {
    width: 70px;
    height: 70px;
    background: #f1f5f9;
    border-radius: 16px;
    margin: 0 auto 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #e2e8f0;
  }

  .cem-title {
    font-size: 24px;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
  }

  .cem-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .cem-form-group {
    display: grid;
    grid-template-columns: 120px 1fr;
    align-items: center;
    gap: 24px;
  }

  .cem-form-group.align-top {
    align-items: flex-start;
    padding-top: 10px;
  }

  .cem-form-group label {
    font-size: 15px;
    font-weight: 500;
    color: #475569;
    text-align: left;
  }

  .cem-input-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 4px;
  }

  .cem-input {
    width: 100%;
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    padding: 12px 16px;
    font-size: 15px;
    color: #1e293b;
    outline: none;
    transition: all 0.2s;
    box-sizing: border-box;
    display: block;
  }

  .cem-input.highlight {
    border-color: #3b82f6;
    border-width: 2px;
    background: #f0f7ff;
  }

  .cem-input::placeholder {
    color: #94a3b8;
  }

  .cem-input:focus {
    background: white;
    border-color: #3b82f6;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  }

  .cem-textarea {
    height: 110px;
    resize: none;
  }

  .cem-radio-group {
    display: flex;
    gap: 32px;
    align-items: center;
    height: 48px;
  }

  .cem-radio-item {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    user-select: none;
  }

  .cem-radio-item input[type="radio"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    margin: 0;
    accent-color: #3b82f6;
  }

  .cem-radio-item span {
    font-size: 15px;
    color: #475569;
    font-weight: 500;
  }

  .cem-radio-item[data-disabled="true"] {
    cursor: not-allowed;
    opacity: 0.7;
  }
  
  .cem-radio-item[data-disabled="true"] input {
    cursor: not-allowed;
  }

  .cem-input:disabled,
  .cem-textarea:disabled {
    background: #f8fafc;
    color: #64748b;
    cursor: not-allowed;
    opacity: 0.7;
  }

  .cem-custom-select-trigger[data-disabled="true"] {
    background: #f8fafc;
    color: #64748b;
    cursor: not-allowed;
    opacity: 0.7;
    pointer-events: none;
  }

  .cem-custom-select-container {
    position: relative;
    width: 100%;
  }

  .cem-custom-select-trigger {
    width: 100%;
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    padding: 10px 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    transition: all 0.2s;
    min-height: 48px;
    box-sizing: border-box;
  }

  .cem-custom-select-trigger:hover {
    border-color: #cbd5e1;
    background: #f1f5f9;
  }

  .cem-custom-select-trigger[data-open="true"] {
    background: white;
    border-color: #3b82f6;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  }

  .cem-custom-select-trigger.cem-trigger-error {
    border-color: #ef4444 !important;
    background: #fef2f2 !important;
  }

  .cem-custom-select-trigger.cem-trigger-error .cem-selected-text {
    color: #ef4444 !important;
  }

  .cem-trigger-content {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .cem-field-icon-inline {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
  }

  .cem-selected-text {
    font-size: 15px;
    color: #1e293b;
  }

  .cem-selected-text[data-placeholder="true"] {
    color: #94a3b8;
  }

  .cem-chevron {
    color: #64748b;
    transition: transform 0.2s;
  }

  .cem-chevron[data-rotate="true"] {
    transform: rotate(180deg);
  }

  .cem-custom-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    z-index: 100;
    overflow: hidden;
    animation: ${cemSlideIn} 0.2s ease-out;
  }

  .cem-custom-option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .cem-custom-option:hover {
    background: #f8fafc;
  }

  .cem-custom-option[data-selected="true"] {
    background: #f0f7ff;
    color: #2563eb;
  }

  .cem-option-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
  }

  .cem-option-label {
    font-size: 15px;
    font-weight: 500;
  }

  .cem-input-with-icon {
    position: relative;
    width: 100%;
    display: flex;
    align-items: center;
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    transition: all 0.2s;
    box-sizing: border-box;
    padding: 0px 10px;
    overflow: hidden;
  }

  .cem-input-with-icon:focus-within {
    background: white;
    border-color: #3b82f6;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  }

  .cem-input-with-icon .cem-input {
    border: none !important;
    background: transparent !important;
    box-shadow: none !important;
    width: 100%;
    padding: 12px 16px;
    padding-left: 35px;
    padding-right: 35px;
    margin: 0;
  }

  .cem-field-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #64748b;
    pointer-events: none;
    z-index: 5;
    display: flex;
    align-items: center;
  }

  .cem-tag-input-container {
    position: relative;
    width: 100%;
  }

  .cem-tag-input-wrapper {
    min-height: 52px;
    height: auto;
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    padding: 8px 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    align-content: flex-start;
    cursor: text;
    transition: all 0.2s;
    box-sizing: border-box;
    width: 100%;
    max-width: 100%;
    max-height: 120px;
    overflow-y: auto;
  }

  .cem-tag-input-wrapper:focus-within {
    background: white;
    border-color: #3b82f6;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  }

  .cem-guest-pill {
    background: #eff6ff;
    color: #2563eb;
    padding: 4px 8px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 600;
    border: 1px solid #bfdbfe;
    animation: ${cemPillPop} 0.2s ease-out;
    flex-shrink: 0;
    white-space: nowrap;

    img {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }
  }

  .cem-guest-chip {
    display: flex; align-items: center; gap: 8px; background: #eff6ff; padding: 4px 8px 4px 4px;
    border-radius: 16px; border: 1px solid #dbeafe; font-size: 13px; color: #1e40af;
  }
  .cem-guest-chip-content { display: flex; align-items: center; gap: 6px; }
  .cem-guest-avatar {
    width: 24px; height: 24px; background: #3b82f6; color: white; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700;
  }
  .cem-guest-chip button {
    display: flex; align-items: center; justify-content: center;
    border: none; background: transparent; color: #93c5fd; cursor: pointer; padding: 0;
  }
  .cem-guest-chip button:hover { color: #ef4444; }
  .cem-guest-input {
    border: none !important;
    background: transparent !important;
    outline: none !important;
    flex: 1;
    min-width: 150px;
    font-size: 15px;
    color: #1e293b;
    padding: 4px 0;
    margin: 0 !important;
    box-shadow: none !important;
    flex-shrink: 0;
  }

  .cem-guest-suggestions {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    max-height: 240px;
    overflow-y: auto;
    padding: 8px;
    animation: ${cemSlideIn} 0.2s ease-out;
  }

  .cem-suggestion-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;

    &:hover { background: #f8fafc; }
    img { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
    .suggestion-info { display: flex; flex-direction: column; }
    .suggestion-info .name { font-size: 14px; font-weight: 600; color: #1e293b; }
    .suggestion-info .role { font-size: 12px; color: #64748b; }
  }

  .cem-suggestion-search {
    padding: 8px 12px;
    border-bottom: 1px solid #f1f5f9;
    display: flex;
    align-items: center;
    gap: 10px;
    background: #fbfcfd;

    input { border: none; background: transparent; outline: none; font-size: 14px; width: 100%; color: #1e293b; }
  }

  .cem-suggestion-list { max-height: 200px; overflow-y: auto; }
  .no-users { padding: 12px; text-align: center; color: #94a3b8; font-size: 14px; }

  .cem-time-range-container { position: relative; width: 100%; }
  .cem-time-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 480px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
    z-index: 1000;
    padding: 24px;
    animation: ${cemSlideIn} 0.2s ease-out;
  }

  .cem-time-picker-row { display: flex; gap: 16px; margin-bottom: 20px; }
  .cem-time-field {
    flex: 1; display: flex; flex-direction: column; gap: 8px; min-width: 0;
    label { font-size: 13px; font-weight: 600; color: #64748b; }
    input {
      width: 100%; padding: 10px 8px; border-radius: 8px; border: 1.5px solid #e2e8f0;
      background: #f8fafc; font-size: 13px; color: #1e293b; outline: none;
      transition: all 0.2s; box-sizing: border-box;
      &:focus { background: white; border-color: #3b82f6; }
    }
  }

  .cem-time-dropdown-footer {
    display: flex; justify-content: flex-end;
    button {
      background: #3b82f6; color: white; border: none; padding: 8px 20px; border-radius: 8px;
      font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s;
      &:hover { background: #2563eb; }
    }
  }

  .cem-footer { display: flex; justify-content: flex-end; align-items: center; margin-top: 24px; }
  .cem-footer-right { display: flex; gap: 16px; }
  .cem-btn {
    padding: 12px 32px; border-radius: 8px; font-weight: 500; font-size: 15px;
    cursor: pointer; transition: all 0.2s; border: 1px solid transparent; min-width: 100px;
  }
  .cem-btn-secondary { background: white; color: #1e293b; border-color: #f1f5f9; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
  .cem-btn-primary {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
    &:active { transform: scale(0.98); }
  }

  @media (max-width: 640px) {
    .cem-modal-card { padding: 30px 20px; }
    .cem-form-group { grid-template-columns: 1fr; gap: 8px; }
    .cem-form-group label { text-align: left; }
    .cem-footer { flex-direction: column; gap: 12px; }
    .cem-footer-right { width: 100%; }
    .cem-footer-right .cem-btn { flex: 1; }
    .cem-time-dropdown { width: 100%; left: 0; right: 0; }
    .cem-time-picker-row { flex-direction: column; }
  }
`;
