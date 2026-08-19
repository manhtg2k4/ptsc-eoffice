import scStyled from 'styled-components';

export const ModalWrapper = scStyled.div`
  /* Backbackground Backdrop */
  .notif-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    background: transparent;
  }

  /* Dropdown Main Container */
  .notif-dropdown {
    position: absolute;
    background-color: #fff;
    display: flex;
    flex-direction: column;
    z-index: 10000;
  }

  /* Version in Sidebar */
  .notif-dropdown[data-sidebar="true"] {
    bottom: -10px;
    width: min(420px, 80vw);
    max-height: max(500px, 80vh);
    border-radius: 20px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15), 0 0 1px rgba(0, 0, 0, 0.2);
    animation: dropdownFadeInSidebar 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* Version in Header */
  .notif-dropdown[data-sidebar="false"] {
    top: 100%;
    right: 0;
    margin-top: 12px;
    width: min(420px, 90vw);
    max-height: 600px;
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15), 0 0 1px rgba(0, 0, 0, 0.1);
    animation: dropdownFadeIn 0.2s ease-out;
    transform-origin: top right;
  }

  @keyframes dropdownFadeIn {
    from { opacity: 0; transform: translateY(-10px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes dropdownFadeInSidebar {
    from { opacity: 0; transform: scale(0.9) translateX(var(--sidebar-anim-x, 0)); }
    to { opacity: 1; transform: scale(1) translateX(0); }
  }

  /* Header */
  .notif-header {
    padding: 20px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #f1f5f9;
  }

  .notif-header-title {
    margin: 0;
    font-size: 20px;
    font-weight: 800;
    color: #1e293b;
  }

  .notif-unread-text {
    font-size: 12px;
    color: #64748b;
    font-weight: 500;
  }

  .notif-close-btn {
    background: #f1f5f9;
    border: none;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    cursor: pointer;
    color: #64748b;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .notif-close-btn:hover {
    background: #e2e8f0;
  }

  /* Tabs */
  .notif-tabs-wrapper {
    padding: 12px 16px 0;
  }

  .notif-tabs-container {
    display: flex;
    background-color: #f1f5f9;
    padding: 3px;
    border-radius: 10px;
    gap: 2px;
  }

  .notif-tab-btn {
    flex: 1;
    padding: 8px;
    border: none;
    border-radius: 7px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    background: transparent;
    color: #64748b;
  }

  .notif-tab-btn[data-active="true"] {
    background-color: #fff;
    color: #1d4ed8;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  /* Global Actions */
  .notif-global-actions {
    padding: 12px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #f1f5f9;
  }

  .notif-mark-read-action {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #2563eb;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
  }

  .notif-clear-all-action {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #ef4444;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
  }

  /* List */
  .notif-scroll-area {
    flex: 1;
    overflow-y: auto;
    max-height: 400px;
  }

  .notif-item {
    padding: 16px 20px;
    display: flex;
    gap: 12px;
    cursor: pointer;
    transition: background 0.2s;
    border-bottom: 1px solid #f8fafc;
    position: relative;
  }

  .notif-item:hover {
    background-color: #f8fafc;
  }

  .notif-icon-box {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background-color: #f1f5f9;
    color: #94a3b8;
  }

  .notif-item[data-unread="true"] .notif-icon-box {
    background-color: #eff6ff;
    color: #3b82f6;
  }

  .notif-content {
    flex: 1;
    padding-right: 40px;
  }

  .notif-item-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 2px;
  }

  .notif-item-title {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    color: #64748b;
  }

  .notif-item[data-unread="true"] .notif-item-title {
    color: #1e293b;
  }

  .notif-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #3b82f6;
    margin-top: 5px;
  }

  .notif-text {
    margin: 0 0 4px 0;
    font-size: 13px;
    color: #94a3b8;
    line-height: 1.4;
  }

  .notif-item[data-unread="true"] .notif-text {
    color: #475569;
  }

  .notif-time {
    font-size: 11px;
    color: #94a3b8;
  }

  /* Item Actions */
  .notif-actions {
    position: absolute;
    right: 20px;
    top: 50%;
    transform: translateY(-50%);
    display: none;
    gap: 8px;
    background: #f8fafc;
    padding-left: 10px;
    box-shadow: -10px 0 10px #f8fafc;
  }

  .notif-item:hover .notif-actions {
    display: flex;
  }

  .notif-action-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: none;
    background: #fff;
    color: #64748b;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    transition: all 0.2s;
  }

  .notif-action-btn:hover {
    color: #2563eb;
    transform: scale(1.1);
  }

  .notif-action-btn.delete:hover {
    color: #ef4444;
  }

  /* Empty State */
  .notif-empty-state {
    padding: 60px 20px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .notif-empty-icon {
    color: #e2e8f0;
    margin-bottom: 12px;
  }

  .notif-empty-text {
    color: #94a3b8;
    margin: 0;
    font-size: 13px;
  }

  /* Footer */
  .notif-footer {
    padding: 14px;
    text-align: center;
    background-color: #f8fafc;
    border-top: 1px solid #f1f5f9;
    border-radius: 0 0 20px 20px;
  }

  .notif-see-all-btn {
    background: none;
    border: none;
    color: #2563eb;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    width: 100%;
    text-align: center;
  }
`;
