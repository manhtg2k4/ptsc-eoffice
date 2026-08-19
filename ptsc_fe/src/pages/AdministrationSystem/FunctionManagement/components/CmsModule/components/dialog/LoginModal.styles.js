import scStyled from 'styled-components';

export const ModalWrapper = scStyled.div`
  .login-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    backdrop-filter: blur(4px);
  }

  .login-modal-content {
    background: #fff;
    width: 90%;
    max-width: 440px;
    border-radius: 20px;
    padding: 40px;
    position: relative;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    animation: modalFadeIn 0.3s ease-out;
  }

  @keyframes modalFadeIn {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .login-modal-close {
    position: absolute;
    top: 20px;
    right: 20px;
    background: #f8fafc;
    border: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #64748b;
    transition: all 0.2s;
  }

  .login-modal-close:hover {
    background: #f1f5f9;
    color: #1e293b;
    transform: rotate(90deg);
  }

  .login-modal-header {
    text-align: center;
    margin-bottom: 32px;
  }

  .login-modal-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-bottom: 24px;
  }
  
  .login-logo-main {
    width: 48px;
    height: 48px;
  }
  
  .login-logo-name {
    width: 180px;
    height: 32px;
  }

  .login-modal-title {
    font-size: 24px;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 8px 0;
  }

  .login-modal-subtitle {
    font-size: 14px;
    color: #64748b;
    margin: 0;
  }

  .login-modal-error {
    background: #fee2e2;
    color: #b91c1c;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 20px;
    font-size: 14px;
    text-align: center;
    border: 1px solid #fecaca;
    margin-left: auto;
    margin-right: auto;
    width: 100%;
  }

  .login-modal-form {
    width: 100%;
    display: block;
  }

  .login-modal-field {
    margin-bottom: 20px;
  }

  .login-modal-field label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #475569;
    margin-bottom: 8px;
  }

  .login-modal-field input {
    width: 100%;
    height: 48px;
    padding: 0 16px;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    font-size: 14px;
    color: #1e293b;
    outline: none;
    transition: all 0.2s;
    box-sizing: border-box;
    display: block;
  }

  .login-modal-field input:focus {
    border-color: #1976d2;
    background: #fff;
    box-shadow: 0 0 0 4px rgba(25, 118, 210, 0.1);
  }

  .login-modal-forgot {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 24px;
  }

  .login-modal-forgot button {
    background: none;
    border: none;
    color: #1976d2;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }

  .login-modal-submit {
    width: 100%;
    height: 52px;
    background: #1976d2;
    color: #fff;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 8px 16px rgba(25, 118, 210, 0.24);
    box-sizing: border-box;
  }

  .login-modal-submit:hover {
    background: #1565c0;
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(25, 118, 210, 0.3);
  }

  .login-modal-submit:disabled {
    background: #93c5fd;
    cursor: not-allowed;
    transform: none;
  }
`;
