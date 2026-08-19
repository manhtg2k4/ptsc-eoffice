import scStyled from 'styled-components';

export const ModalWrapper = scStyled.div`
  .enm-overlay {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(15, 23, 42, 0.4); z-index: 2000;
    display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px);
  }

  .enm-container {
    width: 98%; max-width: 1500px; height: 94vh; background: #fff;
    border-radius: 12px; display: flex; flex-direction: column;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); overflow: hidden;
    font-family: 'Inter', -apple-system, sans-serif;
  }

  .enm-header {
    padding: 12px 24px; border-bottom: 1px solid #e2e8f0;
    display: flex; justify-content: space-between; align-items: center;
    background: #fff;
  }
  .enm-header-left { display: flex; align-items: center; gap: 16px; }
  .enm-header-title { font-size: 18px; font-weight: 700; color: #1e293b; margin: 0; }
  .enm-back-btn { 
    background: #f8fafc; border: 1px solid #e2e8f0; cursor: pointer; color: #64748b; 
    padding: 8px; border-radius: 8px; transition: all 0.2s;
  }

  .enm-header-actions { display: flex; gap: 12px; }
  .enm-btn {
    padding: 8px 20px; border-radius: 8px; font-weight: 600; font-size: 14px;
    cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px;
  }
  .enm-btn-save { background: #2563eb; color: #fff; border: none; }
  .enm-btn-preview { background: #fff; color: #64748b; border: 1px solid #e2e8f0; }

  .enm-body {
    flex: 1; display: grid; grid-template-columns: 1fr 1fr;
    overflow-y: hidden; background: #f1f5f9; gap: 1px;
  }

  .enm-col { padding: 24px; height: 100%; overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none; }
  .enm-col::-webkit-scrollbar { display: none; }
  .enm-main-title { font-size: 16px; font-weight: 700; color: #1e293b; margin: 0 0 16px 0; }
  
  .enm-card { 
      background: #fff; border-radius: 12px; padding: 32px 24px; 
      border: 1px solid #e2e8f0; box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }
  .enm-card-editor { padding: 0; height: calc(100% - 40px); display: flex; flex-direction: column; overflow: hidden; }

  .enm-field { margin-bottom: 24px; position: relative; }
  .enm-label { display: block; font-size: 13px; font-weight: 600; color: #64748b; margin-bottom: 8px; }
  
  /* Outlined Floating Labels */
  .outlining { margin-top: 12px; }
  .enm-label-floating {
     position: absolute;
     top: -10px;
     left: 14px;
     background: #fff;
     padding: 0 8px;
     font-size: 13px;
     font-weight: 500;
     color: #64748b;
     z-index: 10;
  }
  .enm-label-floating span { color: #ef4444; }
  .enm-label-fixed { display: block; font-size: 14px; font-weight: 600; color: #334155; margin-bottom: 8px; }
  
  .enm-input, .enm-textarea, .enm-select {
    width: 100%; border: none !important; padding: 12px 16px;
    font-size: 14px; color: #1e293b; outline: none; box-sizing: border-box;
    background: transparent !important;
  }
  
  /* Unified Bordered Containers */
  .enm-input-box, .enm-input-icon-box, .enm-select-box, .enm-tags-box, .enm-textarea-container {
      width: 100%;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      background: #fff;
      transition: all 0.2s;
      box-sizing: border-box;
  }

  .enm-readonly {
      background-color: #f8fafc !important;
      cursor: not-allowed;
  }
  .enm-readonly *:not(.enm-tag) {
      cursor: not-allowed;
      color: #64748b !important;
  }

  .enm-input-box, .enm-input-icon-box, .enm-select-box, .enm-tags-box {
      min-height: 46px;
      display: flex;
      align-items: center;
      overflow: hidden;
  }

  .enm-field.outlining:focus-within .enm-input-box, 
  .enm-field.outlining:focus-within .enm-input-icon-box, 
  .enm-field.outlining:focus-within .enm-select-box, 
  .enm-field.outlining:focus-within .enm-tags-box,
  .enm-field.outlining:focus-within .enm-textarea {
     border-color: #3b82f6; 
     box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.1); 
  }
  .enm-select:focus-within + .abs-icon { color: #3b82f6; }

  .enm-title-input { height: 100px !important; resize: none; font-weight: 600; padding: 18px 16px; font-size: 16px; border: none !important; }
  .enm-summary-input { height: 140px !important; resize: none; padding: 18px 16px; border: none !important; }

  .enm-form-row { display: flex; gap: 24px; align-items: flex-end; }
  .mt-24 { margin-top: 4px; }
  .flex-1 { flex: 1; }
  .flex-2 { flex: 2; }
  .enm-centered { display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-end; padding-bottom: 6px; }

  /* Toggle Switch Refined */
  .enm-toggle {
    width: 44px; height: 22px; border-radius: 20px; background: #94a3b8;
    position: relative; cursor: pointer; transition: all 0.3s; opacity: 0.6;
    margin-bottom: 8px;
  }
  .enm-toggle.active { background: #3b82f6; opacity: 1; }
  .enm-toggle-thumb {
    width: 16px; height: 16px; background: #fff; border-radius: 50%;
    position: absolute; top: 3px; left: 3px; transition: all 0.3s;
  }
  .enm-toggle.active .enm-toggle-thumb { left: 25px; }

  /* Select & Icons */
  .enm-input-icon-box, .enm-select-box { position: relative; width: 100%; display: flex; align-items: center; }
  .abs-icon { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #cbd5e1; pointer-events: none; z-index: 5; }
  .enm-select { width: 100%; appearance: none; border: none !important; padding: 0 16px; background: transparent !important; }
  
  /* Hide browser-native date picker icon */
  input[type="date"]::-webkit-calendar-picker-indicator {
      background: transparent; bottom: 0; color: transparent; cursor: pointer;
      height: auto; left: 0; position: absolute; right: 0; top: 0; width: auto; z-index: 10;
  }

  /* Tags */
  .enm-tags-box { padding: 0 12px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .enm-tag { background: #fff; border: 1px solid #e2e8f0; color: #475569; padding: 2px 10px; border-radius: 100px; font-size: 13px; display: flex; align-items: center; gap: 6px; }
  .close-tag { color: #94a3b8; cursor: pointer; background: #f1f5f9; border-radius: 50%; padding: 1px; }
  .enm-tag-ghost-input { border: none !important; outline: none; font-size: 13px; flex: 1; min-width: 60px; background: transparent; height: 100%; }

  /* Images Section Refined */
  .enm-img-section { margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 24px; }
  .enm-sub-title { font-size: 16px; font-weight: 700; color: #1e293b; margin: 0 0 8px 0; }
  .enm-sub-desc { font-size: 14px; color: #64748b; margin: 0 0 24px 0; }
  .enm-img-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 32px; }
  
  .enm-upload-zone { 
      border: 2px dashed #3b82f6; border-radius: 12px; height: 200px;
      display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;
      background: #f8fafc;
  }
  .enm-upload-zone:hover { background: #eff6ff; }
        .icon-circle { 
            width: 56px; height: 56px; background: #e0f2fe; border-radius: 50%; 
            display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; 
        }
        .upload-icon { color: #0066cc; }
        .cta-main-text { font-size: 14px; font-weight: 500; color: #475569; margin: 0; line-height: 1.5; }
  .cta-sub-text { font-size: 12px; color: #94a3b8; display: block; margin-top: 4px; }
  .enm-img-preview { width: 100%; height: 100%; object-fit: cover; border-radius: 10px; }
  .enm-img-meta { align-self: flex-start; margin-top: 12px; }

  /* Tiptap Editor Container */
  .enm-tiptap-container { flex: 1; display: flex; flex-direction: column; height: 100%; }
  .enm-tiptap-toolbar { 
      padding: 12px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
      display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
  }
  .t-group { display: flex; gap: 4px; }
  .t-divider { width: 1px; height: 20px; background: #e2e8f0; margin: 0 4px; }
  .t-h { font-weight: 800; font-size: 13px; color: #475569; }
  
  .toolbar-btn { 
      background: #fff; border: 1px solid #e2e8f0; padding: 6px; border-radius: 6px;
      min-width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: #475569; transition: all 0.2s;
  }
  .toolbar-btn:hover { background: #f1f5f9; border-color: #cbd5e1; }
  .toolbar-btn.active { background: #eff6ff; color: #3b82f6; border-color: #3b82f6; }

  .enm-tiptap-content { flex: 1; overflow-y: auto; padding: 32px; background: #fff; scrollbar-width: none; -ms-overflow-style: none; }
  .enm-tiptap-content::-webkit-scrollbar { display: none; }

  .ProseMirror { outline: none; min-height: 100%; font-size: 15px; color: #334155; line-height: 1.8; }
  .ProseMirror h1 { font-size: 2em; font-weight: 800; margin-bottom: 0.5em; }
  .ProseMirror h2 { font-size: 1.6em; font-weight: 700; margin-top: 1em; }
  .ProseMirror p { margin-bottom: 1em; }
  .ProseMirror ul { list-style-type: disc; padding-left: 1.5em; }
  .ProseMirror ol { list-style-type: decimal; padding-left: 1.5em; }
  .ProseMirror img { max-width: 100%; height: auto; border-radius: 8px; display: block; margin: 20px auto; }

  /* Responsive */
  @media (max-width: 1024px) {
    .enm-body { grid-template-columns: 1fr; overflow-y: auto; }
    .enm-col { height: auto; overflow-y: visible; padding: 16px; }
    .enm-card-editor { height: 600px; }
    .enm-container { height: 100vh; width: 100%; border-radius: 0; }
  }

  @media (max-width: 640px) {
    .enm-header { padding: 12px 16px; }
    .enm-header-title { font-size: 16px; }
    .enm-main-title { font-size: 15px; }
    .enm-card { padding: 20px 16px; }
    .enm-form-row { flex-direction: column; align-items: stretch; gap: 16px; }
    .enm-img-grid { grid-template-columns: 1fr; gap: 16px; }
    .enm-upload-zone { height: 160px; }
    .enm-centered { padding-bottom: 0; }
    .enm-tiptap-toolbar { padding: 8px; gap: 4px; }
    .t-group { flex-wrap: wrap; }
    .enm-card-editor { height: 500px; }
    .enm-tiptap-content { padding: 20px 16px; }
    .enm-back-btn { padding: 6px; }
    .enm-btn { padding: 8px 14px; font-size: 13px; }
    .enm-label-floating { font-size: 12px; }
  }
`;
