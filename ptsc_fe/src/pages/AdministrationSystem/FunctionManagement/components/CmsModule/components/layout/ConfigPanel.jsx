import React, { useState, useEffect, useCallback } from "react";
import { BLOCKS } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/config/blocks";
import { FOOTER_MAP, PREHEADER_MAP } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/config/componentMapping";
import { toast } from "react-toastify";
import AuthImage from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimImage';


// Icons
const IconClose = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const IconTrash = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const IconPlus = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

// Styles
const labelStyle = { display: "block", fontSize: 13, fontWeight: 600, color: "#344054", marginBottom: 6 };
const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #d0d5dd",
  borderRadius: 6,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s, box-shadow 0.2s"
};
const handleFocus = (e) => { e.target.style.borderColor = "#0B5FFF"; e.target.style.boxShadow = "0 0 0 3px rgba(11, 95, 255, 0.1)"; };
const handleBlur = (e) => { e.target.style.borderColor = "#d0d5dd"; e.target.style.boxShadow = "none"; };

export function ConfigPanel({ selected, onUpdate, onClose, headerConfig, setHeaderConfig, preHeaderConfig, setPreHeaderConfig, footerConfig, setFooterConfig, updatePageMetadata, subHeaderConfig, setSubHeaderConfig, topicNavConfig, setTopicNavConfig, addMenuItem, updateMenuItem, deleteMenuItem }) {
  const [localLabel, setLocalLabel] = useState("");
  const [localHref, setLocalHref] = useState("");
  const [localFullWidth, setLocalFullWidth] = useState(false);
  const [localHidePreHeader, setLocalHidePreHeader] = useState(false);
  const [localHideTopicNav, setLocalHideTopicNav] = useState(false);
  const [localHideSearch, setLocalHideSearch] = useState(false);
  const [localSubHeaderBg, setLocalSubHeaderBg] = useState("");
  const [localSubHeaderText, setLocalSubHeaderText] = useState("");
  const [localSubHeaderAccent, setLocalSubHeaderAccent] = useState("");
  const [localSubHeaderSearchBg, setLocalSubHeaderSearchBg] = useState("");
  const [menuItems, setMenuItems] = useState([]);
  const [deletedItems, setDeletedItems] = useState([]);
  const isSidebar = (headerConfig?.position === 'left' || headerConfig?.position === 'right');

  useEffect(() => {
    if (selected && selected.type === 'page') {
      setLocalLabel(selected.props.label || "");
      setLocalHref(selected.props.href || "");
      setLocalFullWidth(selected.props.fullWidth || false);
      setLocalHidePreHeader(selected.props.hidePreHeader || false);
      setLocalHideTopicNav(selected.props.hideTopicNav || false);
      setLocalHideSearch(selected.props.hideSearch || false);
      setLocalSubHeaderBg(selected.props.subHeaderBg || "");
      setLocalSubHeaderText(selected.props.subHeaderText || "");
      setLocalSubHeaderAccent(selected.props.subHeaderAccent || "");
      setLocalSubHeaderSearchBg(selected.props.subHeaderSearchBg || "");
    }
    if (selected && selected.id === 'header' && headerConfig?.menu) {
      setMenuItems(headerConfig.menu.map(item => ({ ...item, _original: item })));
      setDeletedItems([]);
    }
  }, [selected, headerConfig?.menu]);

  const handlePreHeaderChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setPreHeaderConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, [setPreHeaderConfig]);

  const handleHeaderChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setHeaderConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (name === 'hidden' ? !checked : checked) : (type === 'range' || type === 'number') ? parseInt(value) : value
    }));
  }, [setHeaderConfig]);

  const handleFooterChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFooterConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (name === 'hidden' ? !checked : checked) : value
    }));
  }, [setFooterConfig]);

  const handleLocalLabelChange = useCallback((e) => setLocalLabel(e.target.value), []);
  const handleLocalHrefChange = useCallback((e) => setLocalHref(e.target.value), []);
  const handleLocalFullWidthChange = useCallback((e) => setLocalFullWidth(e.target.checked), []);
  const handleLocalHidePreHeaderChange = useCallback((e) => setLocalHidePreHeader(e.target.checked), []);
  const handleLocalHideTopicNavChange = useCallback((e) => setLocalHideTopicNav(e.target.checked), []);
  const handleLocalHideSearchChange = useCallback((e) => setLocalHideSearch(e.target.checked), []);
  const handleLocalSubHeaderBgChange = useCallback((e) => setLocalSubHeaderBg(e.target.value), []);
  const handleLocalSubHeaderTextChange = useCallback((e) => setLocalSubHeaderText(e.target.value), []);
  const handleLocalSubHeaderAccentChange = useCallback((e) => setLocalSubHeaderAccent(e.target.value), []);
  const handleLocalSubHeaderSearchBgChange = useCallback((e) => setLocalSubHeaderSearchBg(e.target.value), []);

  const handleSocialLinkChange = useCallback((idx, field) => (e) => {
    const value = e.target.value;
    setFooterConfig(prev => {
      const newLinks = [...(prev.socialLinks || [])];
      newLinks[idx] = { ...newLinks[idx], [field]: value };
      return { ...prev, socialLinks: newLinks };
    });
  }, [setFooterConfig]);

  const handleRemoveSocialLink = useCallback((idx) => () => {
    setFooterConfig(prev => {
      const newLinks = (prev.socialLinks || []).filter((_, i) => i !== idx);
      return { ...prev, socialLinks: newLinks };
    });
  }, [setFooterConfig]);

  const handleAddSocialLink = useCallback(() => {
    setFooterConfig(prev => {
      const newLinks = [...(prev.socialLinks || []), {
        iconType: "facebook",
        href: "",
        bgColor: "#3b5998",
        label: ""
      }];
      return { ...prev, socialLinks: newLinks };
    });
  }, [setFooterConfig]);

  const handleSubHeaderChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setSubHeaderConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (name === 'hidden' ? !checked : checked) : (type === 'range' || type === 'number') ? (value !== "" ? Number(value) : "") : value
    }));
  }, [setSubHeaderConfig]);

  const handleTopicNavChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setTopicNavConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (name === 'hidden' ? !checked : checked) : value
    }));
  }, [setTopicNavConfig]);

  const handleBlockPropChange = useCallback((e) => {
    const { name, value, type } = e.target;
    const processedValue = (type === 'range' || type === 'number') ? (value !== "" ? Number(value) : "") : value;
    onUpdate({
      ...selected,
      props: {
        ...selected.props,
        [name]: processedValue
      }
    });
  }, [selected, onUpdate]);

  const handleMenuChange = useCallback((idx, field) => (e) => {
    const { type, checked, value } = e.target;
    setMenuItems(prev => {
      const newMenu = [...prev];
      newMenu[idx] = { ...newMenu[idx], [field]: type === "checkbox" ? checked : value };
      return newMenu;
    });
  }, []);

  const handleAddMenu = useCallback(() => {
    setMenuItems(prev => [...prev, { label: "New", href: "#", hidden: false, _original: null }]);
  }, []);

  const handleRemoveMenu = useCallback((idx) => () => {
    setMenuItems(prev => {
      const itemToDelete = prev[idx];
      if (itemToDelete?._original) {
        setDeletedItems(d => [...d, itemToDelete]);
      }
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  if (!selected) return null;

  const handleSavePage = () => {
    if (selected.props.isSystem) {
      const currentSystemPages = headerConfig.systemPages || [];
      const exists = currentSystemPages.find(s => s.href === selected.id);
      let newSystemPages;
      if (exists) {
        newSystemPages = currentSystemPages.map(s => s.href === selected.id ? {
          ...s,
          fullWidth: localFullWidth,
          hidePreHeader: localHidePreHeader,
          hideTopicNav: localHideTopicNav,
          hideSearch: localHideSearch,
          subHeaderBg: localSubHeaderBg,
          subHeaderText: localSubHeaderText,
          subHeaderAccent: localSubHeaderAccent,
          subHeaderSearchBg: localSubHeaderSearchBg
        } : s);
      } else {
        newSystemPages = [...currentSystemPages, {
          label: selected.props.label,
          href: selected.id,
          fullWidth: localFullWidth,
          hidePreHeader: localHidePreHeader,
          hideTopicNav: localHideTopicNav,
          hideSearch: localHideSearch,
          isSystem: true,
          subHeaderBg: localSubHeaderBg,
          subHeaderText: localSubHeaderText,
          subHeaderAccent: localSubHeaderAccent,
          subHeaderSearchBg: localSubHeaderSearchBg
        }];
      }
      setHeaderConfig({ ...headerConfig, systemPages: newSystemPages });
      toast.success("Cập nhật cấu hình hệ thống thành công!");
      onClose();
      return;
    }

    if (typeof updatePageMetadata === 'function') {
      updatePageMetadata(selected.id, localLabel, localHref, localFullWidth, localHidePreHeader, localHideTopicNav, localHideSearch, {
        subHeaderBg: localSubHeaderBg,
        subHeaderText: localSubHeaderText,
        subHeaderAccent: localSubHeaderAccent,
        subHeaderSearchBg: localSubHeaderSearchBg
      });
      toast.success("Cập nhật trang thành công!");
      onClose();
    } else {
      logger.error("Lỗi: updatePageMetadata chưa được truyền xuống ConfigPanel. Vui lòng kiểm tra EditView.jsx");
    }
  };

  const handleSaveMenuConfig = async () => {
    for (const item of deletedItems) {
      if (item._original) {
        await deleteMenuItem(item._original);
      }
    }
    const newConfigMenu = [];
    for (const item of menuItems) {
      const { _original, ...cleanItem } = item;
      if (_original) {
        if (_original.label !== cleanItem.label || _original.href !== cleanItem.href || _original.icon !== cleanItem.icon || Boolean(_original.hidden) !== Boolean(cleanItem.hidden)) {
          await updateMenuItem(_original, cleanItem);
        }
      } else {
        await addMenuItem(cleanItem);
      }
      newConfigMenu.push(cleanItem);
    }
    setHeaderConfig({ ...headerConfig, menu: newConfigMenu });
    setMenuItems(newConfigMenu.map(item => ({ ...item, _original: item })));
    setDeletedItems([]);
    toast.success("Đã lưu cấu hình menu!");
  };

  return (
    <div style={{ paddingBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid #eaecf0" }}>
        <h3 style={{ margin: 0, fontSize: 18, color: "#101828" }}>
          {selected.type === 'page' ? 'Cấu hình Trang' :
            selected.id === 'preHeader' ? 'Cấu hình Top Bar' :
              selected.id === 'header' ? 'Cấu hình Header' :
                selected.id === 'footer' ? 'Cấu hình Footer' :
                  'Cấu hình Block'}
        </h3>
        <button onClick={onClose} style={{ cursor: "pointer", border: "none", background: "transparent", color: "#667085", padding: 4, display: "flex" }}>
          <IconClose />
        </button>
      </div>

      {selected.type === 'page' ? (
        <>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Tên trang (Label)</label>
            <input
              style={inputStyle}
              onFocus={handleFocus} onBlur={handleBlur}
              placeholder="Trang chủ"
              value={localLabel}
              onChange={handleLocalLabelChange}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Link (Href)</label>
            <input
              style={inputStyle}
              onFocus={handleFocus} onBlur={handleBlur}
              placeholder="/home"
              value={localHref}
              onChange={handleLocalHrefChange}
            />
          </div>

          <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              id="fullWidth"
              checked={localFullWidth}
              onChange={handleLocalFullWidthChange}
              style={{ width: 18, height: 18, cursor: "pointer" }}
            />
            <label htmlFor="fullWidth" style={{ ...labelStyle, marginBottom: 0, cursor: "pointer" }}>Chiều rộng tối đa (Full Width)</label>
          </div>

          <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              id="hidePreHeader"
              checked={localHidePreHeader}
              onChange={handleLocalHidePreHeaderChange}
              style={{ width: 18, height: 18, cursor: "pointer" }}
            />
            <label htmlFor="hidePreHeader" style={{ ...labelStyle, marginBottom: 0, cursor: "pointer" }}>Ẩn Top Bar trên trang này</label>
          </div>

          <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              id="hideTopicNav"
              checked={localHideTopicNav}
              onChange={handleLocalHideTopicNavChange}
              style={{ width: 18, height: 18, cursor: "pointer" }}
            />
            <label htmlFor="hideTopicNav" style={{ ...labelStyle, marginBottom: 0, cursor: "pointer" }}>Ẩn Topic Menu trên trang này</label>
          </div>

          <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              id="hideSearch"
              checked={localHideSearch}
              onChange={handleLocalHideSearchChange}
              style={{ width: 18, height: 18, cursor: "pointer" }}
            />
            <label htmlFor="hideSearch" style={{ ...labelStyle, marginBottom: 0, cursor: "pointer" }}>Ẩn thanh tìm kiếm trên trang này</label>
          </div>

          <div style={{ marginBottom: 24, padding: "12px", background: "#f9fafb", borderRadius: 8, border: "1px solid #eaecf0" }}>
            <label style={{ ...labelStyle, marginBottom: 12 }}>Tùy chỉnh màu Sub-Header (Ticker)</label>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: "#344054", display: "block", marginBottom: 6 }}>Màu nền (Background)</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="color"
                  style={{ width: 40, height: 38, border: "1px solid #d0d5dd", borderRadius: 6, cursor: "pointer" }}
                  value={localSubHeaderBg || "#008B8B"}
                  onChange={handleLocalSubHeaderBgChange}
                />
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  value={localSubHeaderBg}
                  onChange={handleLocalSubHeaderBgChange}
                  placeholder="Mặc định (Trống)"
                />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: "#344054", display: "block", marginBottom: 6 }}>Màu chữ (Text)</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="color"
                  style={{ width: 40, height: 38, border: "1px solid #d0d5dd", borderRadius: 6, cursor: "pointer" }}
                  value={localSubHeaderText || "#ffffff"}
                  onChange={handleLocalSubHeaderTextChange}
                />
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  value={localSubHeaderText}
                  onChange={handleLocalSubHeaderTextChange}
                  placeholder="Mặc định (Trống)"
                />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: "#344054", display: "block", marginBottom: 6 }}>Màu nhấn (Accent)</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="color"
                  style={{ width: 40, height: 38, border: "1px solid #d0d5dd", borderRadius: 6, cursor: "pointer" }}
                  value={localSubHeaderAccent || "#ffffff"}
                  onChange={handleLocalSubHeaderAccentChange}
                />
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  value={localSubHeaderAccent}
                  onChange={handleLocalSubHeaderAccentChange}
                  placeholder="Mặc định (Trống)"
                />
              </div>
            </div>
            <div style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 13, color: "#344054", display: "block", marginBottom: 6 }}>Màu nền tìm kiếm</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="color"
                  style={{ width: 40, height: 38, border: "1px solid #d0d5dd", borderRadius: 6, cursor: "pointer" }}
                  value={localSubHeaderSearchBg || "#ffffff"}
                  onChange={handleLocalSubHeaderSearchBgChange}
                />
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  value={localSubHeaderSearchBg}
                  onChange={handleLocalSubHeaderSearchBgChange}
                  placeholder="Mặc định (Trống)"
                />
              </div>
            </div>
          </div>
          <button
            onClick={handleSavePage}
            style={{
              width: "100%",
              padding: "10px",
              background: "#0B5FFF",
              color: "white",
              border: "none",
              borderRadius: 6,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Lưu thay đổi
          </button>
        </>
      ) : selected.id === "header" ? (
        <>
          <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              id="showHeader"
              name="hidden"
              checked={!headerConfig?.hidden}
              onChange={handleHeaderChange}
              style={{ width: 18, height: 18, cursor: "pointer" }}
            />
            <label htmlFor="showHeader" style={{ ...labelStyle, marginBottom: 0, cursor: "pointer" }}>Hiển thị Header</label>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Favicon URL (Icon Tab trình duyệt)</label>
            <input
              style={inputStyle}
              onFocus={handleFocus} onBlur={handleBlur}
              placeholder="Link ảnh .ico hoặc .png"
              value={headerConfig?.faviconUrl || ""}
              name="faviconUrl"
              onChange={handleHeaderChange}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Tên Website (Tiêu đề Tab trình duyệt)</label>
            <input
              style={inputStyle}
              onFocus={handleFocus} onBlur={handleBlur}
              placeholder="Ví dụ: Tân Cảng Sài Gòn"
              value={headerConfig?.siteTitle || ""}
              name="siteTitle"
              onChange={handleHeaderChange}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Vị trí Header</label>
            <select
              style={{ ...inputStyle, appearance: "auto", background: "#fff" }}
              value={headerConfig?.position || "top"}
              name="position"
              onChange={handleHeaderChange}
            >
              <option value="top">Phía trên (Mặc định)</option>
              <option value="middle">Ở giữa (Phía dưới Top Bar)</option>
              <option value="left">Bên trái (Sidebar)</option>
              <option value="right">Bên phải (Sidebar)</option>
            </select>
          </div>

          <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              id="fixedHeader"
              checked={headerConfig?.isFixed}
              name="isFixed"
              onChange={handleHeaderChange}
              style={{ width: 18, height: 18, cursor: "pointer" }}
            />
            <label htmlFor="fixedHeader" style={{ ...labelStyle, marginBottom: 0, cursor: "pointer" }}>Cố định Header (Fixed)</label>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Màu nền Header</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="color"
                style={{ width: 50, height: 38, border: "1px solid #d0d5dd", borderRadius: 6, cursor: "pointer" }}
                value={headerConfig?.backgroundColor || "#ffffff"}
                name="backgroundColor"
                onChange={handleHeaderChange}
              />
              <input
                style={{ ...inputStyle, flex: 1 }}
                onFocus={handleFocus} onBlur={handleBlur}
                value={headerConfig?.backgroundColor || "#ffffff"}
                name="backgroundColor"
                onChange={handleHeaderChange}
                placeholder="#ffffff"
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Màu nền toàn trang (Page Background)</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="color"
                style={{ width: 50, height: 38, border: "1px solid #d0d5dd", borderRadius: 6, cursor: "pointer" }}
                value={headerConfig?.layoutBackgroundColor || "#eff8ff"}
                name="layoutBackgroundColor"
                onChange={handleHeaderChange}
              />
              <input
                style={{ ...inputStyle, flex: 1 }}
                onFocus={handleFocus} onBlur={handleBlur}
                value={headerConfig?.layoutBackgroundColor || "#eff8ff"}
                name="layoutBackgroundColor"
                onChange={handleHeaderChange}
                placeholder="#eff8ff"
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Link ảnh nền Header (Background Image)</label>
            <input
              style={inputStyle}
              onFocus={handleFocus} onBlur={handleBlur}
              placeholder="Dán link ảnh tại đây (ví dụ: https://...)"
              value={headerConfig?.backgroundImage || ""}
              name="backgroundImage"
              onChange={handleHeaderChange}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Logo (Ảnh hoặc Chữ)</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input
                style={inputStyle}
                onFocus={handleFocus} onBlur={handleBlur}
                placeholder="Link ảnh logo (tùy chọn)"
                value={headerConfig.logoUrl || ""}
                name="logoUrl"
                onChange={handleHeaderChange}
              />
              {headerConfig.logoUrl && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "#64748b", marginBottom: 4, display: "block" }}>Chiều rộng Logo ({headerConfig.logoWidth || (isSidebar ? 70 : 40)}px)</label>
                    <input
                      type="range" min="20" max="300" step="5"
                      style={{ width: "100%", cursor: "pointer" }}
                      value={headerConfig.logoWidth || (isSidebar ? 70 : 40)}
                      name="logoWidth"
                      onChange={handleHeaderChange}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#64748b", marginBottom: 4, display: "block" }}>Chiều cao Logo ({headerConfig.logoHeight || 'auto'}px)</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <input
                        type="number" style={{ ...inputStyle, padding: "4px 8px", height: 28 }}
                        value={headerConfig.logoHeight || ""}
                        name="logoHeight"
                        onChange={handleHeaderChange}
                        placeholder="auto"
                      />
                    </div>
                  </div>
                </div>
              )}
              <input
                style={inputStyle}
                onFocus={handleFocus} onBlur={handleBlur}
                placeholder="Chữ logo (nếu không có ảnh)"
                value={headerConfig.logo || ""}
                name="logo"
                onChange={handleHeaderChange}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Kích thước chữ Menu ({headerConfig?.menuFontSize || 14}px)</label>
            <input
              type="range"
              min="10"
              max="24"
              step="1"
              style={{ width: "100%", cursor: "pointer" }}
              value={headerConfig?.menuFontSize || 14}
              name="menuFontSize"
              onChange={handleHeaderChange}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Màu chữ Tab</label>
              <input
                type="color"
                style={{ width: "100%", height: 38, border: "1px solid #d0d5dd", borderRadius: 6, cursor: "pointer" }}
                value={headerConfig?.tabTextColor || "#185b8e"}
                name="tabTextColor"
                onChange={handleHeaderChange}
              />
            </div>
            <div>
              <label style={labelStyle}>Màu Icon Tab</label>
              <input
                type="color"
                style={{ width: "100%", height: 38, border: "1px solid #d0d5dd", borderRadius: 6, cursor: "pointer" }}
                value={headerConfig?.tabIconColor || "#185b8e"}
                name="tabIconColor"
                onChange={handleHeaderChange}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Kích thước Icon Home ({headerConfig?.homeIconSize || (headerConfig?.position === 'top' || headerConfig?.position === 'middle' || !headerConfig?.position ? 30 : 36)}px)</label>
            <input
              type="range"
              min="16"
              max="60"
              step="1"
              style={{ width: "100%", cursor: "pointer" }}
              value={headerConfig?.homeIconSize || (headerConfig?.position === 'top' || headerConfig?.position === 'middle' || !headerConfig?.position ? 30 : 36)}
              name="homeIconSize"
              onChange={handleHeaderChange}
            />
          </div>

          {(headerConfig?.position === 'left' || headerConfig?.position === 'right') && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Độ rộng Sidebar ({headerConfig?.sidebarWidth || 120}px)</label>
              <input
                type="range"
                min="80"
                max="300"
                step="5"
                style={{ width: "100%", cursor: "pointer" }}
                value={headerConfig?.sidebarWidth || 120}
                name="sidebarWidth"
                onChange={handleHeaderChange}
              />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Khoảng cách giữa các Tab ({headerConfig?.menuSpacing || (headerConfig?.position === 'top' || headerConfig?.position === 'middle' || !headerConfig?.position ? 20 : 30)}px)</label>
            <input
              type="range"
              min="0"
              max="100"
              step="2"
              style={{ width: "100%", cursor: "pointer" }}
              value={headerConfig?.menuSpacing || (headerConfig?.position === 'top' || headerConfig?.position === 'middle' || !headerConfig?.position ? 20 : 30)}
              name="menuSpacing"
              onChange={handleHeaderChange}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Menu</label>
            {menuItems.map((item, idx) => (
              <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
                <input
                  style={{ ...inputStyle, flex: "0 0 100px" }}
                  onFocus={handleFocus} onBlur={handleBlur}
                  placeholder="Label"
                  value={item.label}
                  onChange={handleMenuChange(idx, "label")}
                />
                <input
                  style={{ ...inputStyle, flex: "1" }}
                  onFocus={handleFocus} onBlur={handleBlur}
                  placeholder="Link"
                  value={item.href}
                  onChange={handleMenuChange(idx, "href")}
                />
                <input
                  style={{ ...inputStyle, flex: "0 0 100px" }}
                  onFocus={handleFocus} onBlur={handleBlur}
                  placeholder="Icon"
                  value={item.icon || ""}
                  onChange={handleMenuChange(idx, "icon")}
                  title="Nhập tên Lucide Icon, Link ảnh icon hoặc mã HTML SVG"
                />
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#344054", cursor: "pointer", whiteSpace: "nowrap" }}>
                  <input
                    type="checkbox"
                    checked={Boolean(item.hidden)}
                    onChange={handleMenuChange(idx, "hidden")}
                    style={{ width: 16, height: 16, cursor: "pointer" }}
                  />
                  Ẩn
                </label>
                <button onClick={handleRemoveMenu(idx)} style={{ color: "#d92d20", cursor: "pointer", border: "1px solid #fee4e2", background: "#fef3f2", borderRadius: 6, padding: 8, display: "flex" }}>
                  <IconTrash />
                </button>
              </div>
            ))}
            <button
              onClick={handleAddMenu}
              style={{ width: "100%", padding: "10px", cursor: "pointer", background: "#f0f9ff", border: "1px dashed #0B5FFF", color: "#0B5FFF", borderRadius: 6, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 }}
            >
              <IconPlus /> Thêm menu
            </button>
            <button
              onClick={handleSaveMenuConfig}
              style={{ width: "100%", padding: "10px", cursor: "pointer", background: "#0B5FFF", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              Lưu cấu hình
            </button>
          </div>
        </>
      ) : selected.id === "preHeader" ? (
        <>
          <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              id="showPreHeader"
              name="hidden"
              checked={!preHeaderConfig?.hidden}
              onChange={handlePreHeaderChange}
              style={{ width: 18, height: 18, cursor: "pointer" }}
            />
            <label htmlFor="showPreHeader" style={{ ...labelStyle, marginBottom: 0, cursor: "pointer" }}>Hiển thị Top Bar</label>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Component</label>
            <select
              style={{ ...inputStyle, appearance: "auto", background: "#fff" }}
              onFocus={handleFocus}
              onBlur={handleBlur}
              value={preHeaderConfig?.componentType || "default"}
              name="componentType"
              onChange={handlePreHeaderChange}
            >
              {Object.entries(PREHEADER_MAP).map(([key, def]) => (
                <option key={key} value={key}>{def.label}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Title</label>
            <input
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
              value={preHeaderConfig?.title || ""}
              name="title"
              onChange={handlePreHeaderChange}
              placeholder="Tiêu đề Top Bar"
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Title Color</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="color"
                style={{ width: 50, height: 38, border: "1px solid #d0d5dd", borderRadius: 6, cursor: "pointer" }}
                value={preHeaderConfig?.titleColor || "#1e293b"}
                name="titleColor"
                onChange={handlePreHeaderChange}
              />
              <input
                style={{ ...inputStyle, flex: 1 }}
                onFocus={handleFocus}
                onBlur={handleBlur}
                value={preHeaderConfig?.titleColor || "#1e293b"}
                name="titleColor"
                onChange={handlePreHeaderChange}
                placeholder="#1e293b"
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Title Size</label>
            <input
              type="text"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
              value={preHeaderConfig?.titleSize || ""}
              name="titleSize"
              onChange={handlePreHeaderChange}
              placeholder="Auto (e.g. 18px, 1.2rem)"
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Logo URL</label>
            <input
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
              value={preHeaderConfig?.logoUrl || ""}
              name="logoUrl"
              onChange={handlePreHeaderChange}
              placeholder="https://example.com/logo.png"
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Logo Width</label>
            <input
              type="text"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
              value={preHeaderConfig?.logoWidth || ""}
              name="logoWidth"
              onChange={handlePreHeaderChange}
              placeholder="Auto (e.g. 100px, 20%)"
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Logo Height</label>
            <input
              type="text"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
              value={preHeaderConfig?.logoHeight || ""}
              name="logoHeight"
              onChange={handlePreHeaderChange}
              placeholder="Auto (e.g. 40px, 2rem)"
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Text</label>
            <input
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
              value={preHeaderConfig?.text || ""}
              name="text"
              onChange={handlePreHeaderChange}
              placeholder="Nội dung văn bản"
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Text Color</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="color"
                style={{ width: 50, height: 38, border: "1px solid #d0d5dd", borderRadius: 6, cursor: "pointer" }}
                value={preHeaderConfig?.textColor || "#64748b"}
                name="textColor"
                onChange={handlePreHeaderChange}
              />
              <input
                style={{ ...inputStyle, flex: 1 }}
                onFocus={handleFocus}
                onBlur={handleBlur}
                value={preHeaderConfig?.textColor || "#64748b"}
                name="textColor"
                onChange={handlePreHeaderChange}
                placeholder="#64748b"
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Text Size</label>
            <input
              type="text"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
              value={preHeaderConfig?.textSize || ""}
              name="textSize"
              onChange={handlePreHeaderChange}
              placeholder="Auto (e.g. 13px, 0.9rem)"
            />
          </div>

          <div style={{ marginBottom: 16, paddingTop: 16, borderTop: "1px solid #eaecf0" }}>
            <label style={labelStyle}>Background Image URL</label>
            <input
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
              value={preHeaderConfig?.imageUrl || ""}
              name="imageUrl"
              onChange={handlePreHeaderChange}
              placeholder="https://example.com/image.png"
            />
            {preHeaderConfig?.imageUrl && (
              <div style={{ marginTop: 8 }}>
                <AuthImage
                  src={preHeaderConfig.imageUrl}
                  alt="Preview"
                  customStyle={{ width: "100%", maxHeight: 120, objectFit: "cover", borderRadius: 6, border: "1px solid #eaecf0" }}
                />
              </div>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Background Image URL Mobile</label>
            <input
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
              value={preHeaderConfig?.imageUrlMobile || ""}
              name="imageUrlMobile"
              onChange={handlePreHeaderChange}
              placeholder="https://example.com/image-mobile.png"
            />
            {preHeaderConfig?.imageUrlMobile && (
              <div style={{ marginTop: 8 }}>
                <AuthImage
                  src={preHeaderConfig.imageUrlMobile}
                  alt="Preview Mobile"
                  customStyle={{ width: "100%", maxHeight: 120, objectFit: "cover", borderRadius: 6, border: "1px solid #eaecf0" }}
                />
              </div>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Height</label>
            <input
              type="text"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
              value={preHeaderConfig?.height || ""}
              name="height"
              onChange={handlePreHeaderChange}
              placeholder="Auto (e.g. 50px, 3rem)"
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Height Mobile (≤466px)</label>
            <input
              type="text"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
              value={preHeaderConfig?.heightMobile || ""}
              name="heightMobile"
              onChange={handlePreHeaderChange}
              placeholder="Auto (e.g. 100px, 8rem)"
            />
          </div>
        </>
      ) : selected.id === "footer" ? (
        <>
          <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              id="showFooter"
              name="hidden"
              checked={!footerConfig?.hidden}
              onChange={handleFooterChange}
              style={{ width: 18, height: 18, cursor: "pointer" }}
            />
            <label htmlFor="showFooter" style={{ ...labelStyle, marginBottom: 0, cursor: "pointer" }}>Hiển thị Footer</label>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Component</label>
            <select
              style={{ ...inputStyle, appearance: "auto", background: "#fff" }}
              onFocus={handleFocus}
              onBlur={handleBlur}
              value={footerConfig?.componentType || "default"}
              name="componentType"
              onChange={handleFooterChange}
            >
              {Object.entries(FOOTER_MAP).map(([key, def]) => (
                <option key={key} value={key}>{def.label}</option>
              ))}
            </select>
          </div>

          {/* Logo Section */}
          <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #eaecf0" }}>
            <label style={{ ...labelStyle, marginBottom: 12, display: "block", fontSize: 14, fontWeight: 700, color: "#0B5FFF" }}>Logo</label>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Logo URL</label>
              <input
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
                value={footerConfig?.logoUrl || ""}
                name="logoUrl"
                onChange={handleFooterChange}
                placeholder="https://example.com/logo.png"
              />
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Width</label>
                <input
                  type="text"
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  value={footerConfig?.logoWidth || ""}
                  name="logoWidth"
                  onChange={handleFooterChange}
                  placeholder="Auto (e.g. 80px, 10%)"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Height</label>
                <input
                  type="text"
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  value={footerConfig?.logoHeight || ""}
                  name="logoHeight"
                  onChange={handleFooterChange}
                  placeholder="Auto (e.g. 80px, 5rem)"
                />
              </div>
            </div>
          </div>

          {/* Company Info Section */}
          <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #eaecf0" }}>
            <label style={{ ...labelStyle, marginBottom: 12, display: "block", fontSize: 14, fontWeight: 700, color: "#0B5FFF" }}>Thông tin công ty</label>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Tên công ty</label>
              <input
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
                value={footerConfig?.companyName || ""}
                name="companyName"
                onChange={handleFooterChange}
                placeholder="© 2025 SNP, chuyên trang nội bộ..."
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Mô tả</label>
              <textarea
                style={{ ...inputStyle, minHeight: 60, resize: "vertical", fontFamily: "inherit" }}
                onFocus={handleFocus}
                onBlur={handleBlur}
                value={footerConfig?.description || ""}
                name="description"
                onChange={handleFooterChange}
                placeholder="SNP giữ bản quyền nội dung trên website này."
              />
            </div>
          </div>

          {/* Hotline Section */}
          <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #eaecf0" }}>
            <label style={{ ...labelStyle, marginBottom: 12, display: "block", fontSize: 14, fontWeight: 700, color: "#0B5FFF" }}>Hotline</label>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Label</label>
              <input
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
                value={footerConfig?.hotlineLabel || ""}
                name="hotlineLabel"
                onChange={handleFooterChange}
                placeholder="Hotline:"
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Số điện thoại</label>
              <input
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
                value={footerConfig?.hotlineNumber || ""}
                name="hotlineNumber"
                onChange={handleFooterChange}
                placeholder="024 7300 5678"
              />
            </div>
          </div>

          {/* Social Links Section */}
          <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #eaecf0" }}>
            <label style={{ ...labelStyle, marginBottom: 12, display: "block", fontSize: 14, fontWeight: 700, color: "#0B5FFF" }}>Mạng xã hội</label>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Text theo dõi</label>
              <input
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
                value={footerConfig?.followText || ""}
                name="followText"
                onChange={handleFooterChange}
                placeholder="Theo dõi Tân Cảng Sài Gòn trên:"
              />
            </div>

            {(footerConfig?.socialLinks || []).map((link, idx) => (
              <div key={idx} style={{ marginBottom: 12, padding: 12, background: "#f8fafc", borderRadius: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Link {idx + 1}</label>
                  <button
                    onClick={handleRemoveSocialLink(idx)}
                    style={{ color: "#d92d20", cursor: "pointer", border: "none", background: "transparent", padding: 4, fontSize: 12 }}
                  >
                    <IconTrash />
                  </button>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <label style={{ ...labelStyle, fontSize: 12 }}>Icon Type</label>
                  <select
                    style={{ ...inputStyle, fontSize: 12 }}
                    value={link.iconType || "facebook"}
                    onChange={handleSocialLinkChange(idx, "iconType")}
                  >
                    <option value="facebook">Facebook</option>
                    {/* <option value="zalo">Zalo</option> */}
                    <option value="custom">Custom</option>
                  </select>
                </div>

                {link.iconType === "custom" && (
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ ...labelStyle, fontSize: 12 }}>Icon URL / SVG Code</label>
                    <input
                      style={{ ...inputStyle, fontSize: 12 }}
                      value={link.iconUrl || ""}
                      onChange={handleSocialLinkChange(idx, "iconUrl")}
                    />
                  </div>
                )}

                <div style={{ marginBottom: 8 }}>
                  <label style={{ ...labelStyle, fontSize: 12 }}>URL</label>
                  <input
                    style={{ ...inputStyle, fontSize: 12 }}
                    value={link.href || ""}
                    onChange={handleSocialLinkChange(idx, "href")}
                    placeholder="https://..."
                  />
                </div>

                <div style={{ marginBottom: 8 }}>
                  <label style={{ ...labelStyle, fontSize: 12 }}>Background Color</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="color"
                      style={{ width: 40, height: 32, border: "1px solid #d0d5dd", borderRadius: 6, cursor: "pointer" }}
                      value={link.bgColor || "#3b5998"}
                      onChange={handleSocialLinkChange(idx, "bgColor")}
                    />
                    <input
                      style={{ ...inputStyle, flex: 1, fontSize: 12 }}
                      value={link.bgColor || "#3b5998"}
                      onChange={handleSocialLinkChange(idx, "bgColor")}
                      placeholder="#3b5998"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ ...labelStyle, fontSize: 12 }}>Label (tùy chọn)</label>
                  <input
                    style={{ ...inputStyle, fontSize: 12 }}
                    value={link.label || ""}
                    onChange={handleSocialLinkChange(idx, "label")}
                    placeholder="Facebook"
                  />
                </div>
              </div>
            ))}

            <button
              onClick={handleAddSocialLink}
              style={{ width: "100%", padding: "10px", cursor: "pointer", background: "#f0f9ff", border: "1px dashed #0B5FFF", color: "#0B5FFF", borderRadius: 6, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <IconPlus /> Thêm link
            </button>
          </div>

          {/* Background Section */}
          <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #eaecf0" }}>
            <label style={{ ...labelStyle, marginBottom: 12, display: "block", fontSize: 14, fontWeight: 700, color: "#0B5FFF" }}>Background & Màu sắc</label>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Background Color (khi không có ảnh)</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="color"
                  style={{ width: 50, height: 38, border: "1px solid #d0d5dd", borderRadius: 6, cursor: "pointer" }}
                  value={footerConfig?.backgroundColor || "#2c3e50"}
                  name="backgroundColor"
                  onChange={handleFooterChange}
                />
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  value={footerConfig?.backgroundColor || "#2c3e50"}
                  name="backgroundColor"
                  onChange={handleFooterChange}
                  placeholder="#2c3e50"
                />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Background Image URL (tùy chọn)</label>
              <input
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
                value={footerConfig?.imageUrl || ""}
                name="imageUrl"
                onChange={handleFooterChange}
                placeholder="https://example.com/image.png"
              />
              {footerConfig?.imageUrl && (
                <div style={{ marginTop: 8 }}>
                  <AuthImage
                    src={footerConfig.imageUrl}
                    alt="Preview"
                    customStyle={{ width: "100%", maxHeight: 120, objectFit: "cover", borderRadius: 6, border: "1px solid #eaecf0" }}
                  />
                </div>
              )}
              <small style={{ fontSize: 11, color: "#64748b", display: "block", marginTop: 4 }}>
                Nếu có ảnh, màu background sẽ bị che phủ
              </small>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Text Color</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="color"
                  style={{ width: 50, height: 38, border: "1px solid #d0d5dd", borderRadius: 6, cursor: "pointer" }}
                  value={footerConfig?.textColor || "#ffffff"}
                  name="textColor"
                  onChange={handleFooterChange}
                />
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  value={footerConfig?.textColor || "#ffffff"}
                  name="textColor"
                  onChange={handleFooterChange}
                  placeholder="#ffffff"
                />
              </div>
            </div>
          </div>
        </>
      ) : selected.id === "topicNav" ? (
        <>
          <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              id="showTopicNav"
              name="hidden"
              checked={!topicNavConfig?.hidden}
              onChange={handleTopicNavChange}
              style={{ width: 18, height: 18, cursor: "pointer" }}
            />
            <label htmlFor="showTopicNav" style={{ ...labelStyle, marginBottom: 0, cursor: "pointer" }}>Hiển thị Menu chủ đề</label>
          </div>
          {/* Ô cấu hình Màu thanh chạy (Underline Color) mới */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Màu thanh gạch chân chạy (Underline Color)</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="color"
                style={{ width: 50, height: 38, border: "1px solid #d0d5dd", borderRadius: 6, cursor: "pointer" }}
                value={topicNavConfig?.underlineColor || "#d92d20"} // Mặc định màu đỏ nếu chưa lưu
                name="underlineColor"
                onChange={handleTopicNavChange}
              />
              <input
                style={{ ...inputStyle, flex: 1 }}
                onFocus={handleFocus}
                onBlur={handleBlur}
                value={topicNavConfig?.underlineColor || "#d92d20"}
                name="underlineColor"
                onChange={handleTopicNavChange}
                placeholder="#d92d20"
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Màu nền khu vực</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="color"
                style={{ width: 50, height: 38, border: "1px solid #d0d5dd", borderRadius: 6, cursor: "pointer" }}
                value={topicNavConfig?.backgroundColor || "#ffffff"}
                name="backgroundColor"
                onChange={handleTopicNavChange}
              />
              <input
                style={{ ...inputStyle, flex: 1 }}
                onFocus={handleFocus}
                onBlur={handleBlur}
                value={topicNavConfig?.backgroundColor || "#ffffff"}
                name="backgroundColor"
                onChange={handleTopicNavChange}
                placeholder="#ffffff"
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Màu chữ</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="color"
                style={{ width: 50, height: 38, border: "1px solid #d0d5dd", borderRadius: 6, cursor: "pointer" }}
                value={topicNavConfig?.textColor || "#1f2937"}
                name="textColor"
                onChange={handleTopicNavChange}
              />
              <input
                style={{ ...inputStyle, flex: 1 }}
                onFocus={handleFocus}
                onBlur={handleBlur}
                value={topicNavConfig?.textColor || "#1f2937"}
                name="textColor"
                onChange={handleTopicNavChange}
                placeholder="#1f2937"
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Màu nền hover</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="color"
                style={{ width: 50, height: 38, border: "1px solid #d0d5dd", borderRadius: 6, cursor: "pointer" }}
                value={topicNavConfig?.hoverBackgroundColor || "#eff6ff"}
                name="hoverBackgroundColor"
                onChange={handleTopicNavChange}
              />
              <input
                style={{ ...inputStyle, flex: 1 }}
                onFocus={handleFocus}
                onBlur={handleBlur}
                value={topicNavConfig?.hoverBackgroundColor || "#eff6ff"}
                name="hoverBackgroundColor"
                onChange={handleTopicNavChange}
                placeholder="#eff6ff"
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Màu chữ hover</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="color"
                style={{ width: 50, height: 38, border: "1px solid #d0d5dd", borderRadius: 6, cursor: "pointer" }}
                value={topicNavConfig?.hoverTextColor || "#0f62fe"}
                name="hoverTextColor"
                onChange={handleTopicNavChange}
              />
              <input
                style={{ ...inputStyle, flex: 1 }}
                onFocus={handleFocus}
                onBlur={handleBlur}
                value={topicNavConfig?.hoverTextColor || "#0f62fe"}
                name="hoverTextColor"
                onChange={handleTopicNavChange}
                placeholder="#0f62fe"
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Màu nền active</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="color"
                style={{ width: 50, height: 38, border: "1px solid #d0d5dd", borderRadius: 6, cursor: "pointer" }}
                value={topicNavConfig?.activeBackgroundColor || "#0f62fe"}
                name="activeBackgroundColor"
                onChange={handleTopicNavChange}
              />
              <input
                style={{ ...inputStyle, flex: 1 }}
                onFocus={handleFocus}
                onBlur={handleBlur}
                value={topicNavConfig?.activeBackgroundColor || "#0f62fe"}
                name="activeBackgroundColor"
                onChange={handleTopicNavChange}
                placeholder="#0f62fe"
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Màu chữ active</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="color"
                style={{ width: 50, height: 38, border: "1px solid #d0d5dd", borderRadius: 6, cursor: "pointer" }}
                value={topicNavConfig?.activeTextColor || "#ffffff"}
                name="activeTextColor"
                onChange={handleTopicNavChange}
              />
              <input
                style={{ ...inputStyle, flex: 1 }}
                onFocus={handleFocus}
                onBlur={handleBlur}
                value={topicNavConfig?.activeTextColor || "#ffffff"}
                name="activeTextColor"
                onChange={handleTopicNavChange}
                placeholder="#ffffff"
              />
            </div>
          </div>
        </>
      ) : selected.id === "subHeader" ? (
        <>
          <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              id="showSubHeader"
              name="hidden"
              checked={!subHeaderConfig?.hidden}
              onChange={handleSubHeaderChange}
              style={{ width: 18, height: 18, cursor: "pointer" }}
            />
            <label htmlFor="showSubHeader" style={{ ...labelStyle, marginBottom: 0, cursor: "pointer" }}>Hiển thị Sub Header</label>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Tên người dùng</label>
            <input
              type="text"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
              value={(subHeaderConfig && subHeaderConfig.userName) || ""}
              name="userName"
              onChange={handleSubHeaderChange}
              placeholder="Nguyễn Văn A"
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Màu nền Sub-Header</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="color"
                style={{ width: 50, height: 38, border: "1px solid #d0d5dd", borderRadius: 6, cursor: "pointer" }}
                value={subHeaderConfig?.backgroundColor || "#ffffff"}
                name="backgroundColor"
                onChange={handleSubHeaderChange}
              />
              <input
                style={{ ...inputStyle, flex: 1 }}
                onFocus={handleFocus}
                onBlur={handleBlur}
                value={subHeaderConfig?.backgroundColor || "#ffffff"}
                name="backgroundColor"
                onChange={handleSubHeaderChange}
                placeholder="#ffffff"
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Màu chữ Sub-Header</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="color"
                style={{ width: 50, height: 38, border: "1px solid #d0d5dd", borderRadius: 6, cursor: "pointer" }}
                value={subHeaderConfig?.textColor || "#1e293b"}
                name="textColor"
                onChange={handleSubHeaderChange}
              />
              <input
                style={{ ...inputStyle, flex: 1 }}
                onFocus={handleFocus}
                onBlur={handleBlur}
                value={subHeaderConfig?.textColor || "#1e293b"}
                name="textColor"
                onChange={handleSubHeaderChange}
                placeholder="#1e293b"
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Màu nhấn (Accent)</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="color"
                style={{ width: 50, height: 38, border: "1px solid #d0d5dd", borderRadius: 6, cursor: "pointer" }}
                value={subHeaderConfig?.accentColor || "#0B5FFF"}
                name="accentColor"
                onChange={handleSubHeaderChange}
              />
              <input
                style={{ ...inputStyle, flex: 1 }}
                onFocus={handleFocus}
                onBlur={handleBlur}
                value={subHeaderConfig?.accentColor || "#0B5FFF"}
                name="accentColor"
                onChange={handleSubHeaderChange}
                placeholder="#0B5FFF"
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Màu nền tìm kiếm (Search Icon)</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="color"
                style={{ width: 50, height: 38, border: "1px solid #d0d5dd", borderRadius: 6, cursor: "pointer" }}
                value={subHeaderConfig?.searchBgColor || "#0B5FFF"}
                name="searchBgColor"
                onChange={handleSubHeaderChange}
              />
              <input
                style={{ ...inputStyle, flex: 1 }}
                onFocus={handleFocus}
                onBlur={handleBlur}
                value={subHeaderConfig?.searchBgColor || "#0B5FFF"}
                name="searchBgColor"
                onChange={handleSubHeaderChange}
                placeholder="#0B5FFF"
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Chiều cao ({subHeaderConfig?.height || 44}px)</label>
            <input
              type="range"
              min="30"
              max="100"
              step="2"
              style={{ width: "100%", cursor: "pointer" }}
              value={subHeaderConfig?.height || 44}
              name="height"
              onChange={handleSubHeaderChange}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Link Video (Youtube)</label>
            <input
              type="text"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
              value={subHeaderConfig?.videoUrl || ""}
              name="videoUrl"
              onChange={handleSubHeaderChange}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>
        </>
      ) : (
        <>
          {Object.entries(BLOCKS[selected.type].schema).map(([k, schemaDef]) => {
            const isObjectSchema = typeof schemaDef === 'object' && schemaDef !== null;
            const label = isObjectSchema ? schemaDef.label : schemaDef;
            const isSelect = isObjectSchema && schemaDef.type === "select";

            return (
              <div key={k} style={{ marginBottom: 16 }}>
                <label style={labelStyle}>{label}</label>
                {isSelect ? (
                  <select
                    style={{ ...inputStyle, appearance: "auto", background: "#fff" }}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    value={selected.props[k] || ""}
                    name={k}
                    onChange={handleBlockPropChange}
                  >
                    <option value="">-- None --</option>
                    {schemaDef.options.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (k === "backgroundColor" || k.endsWith("Color")) ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="color"
                      style={{ width: 40, height: 38, border: "1px solid #d0d5dd", borderRadius: 6, cursor: "pointer" }}
                      value={selected.props[k] || "#ffffff"}
                      name={k}
                      onChange={handleBlockPropChange}
                    />
                    <input
                      style={{ ...inputStyle, flex: 1 }}
                      onFocus={handleFocus} onBlur={handleBlur}
                      value={selected.props[k] || ""}
                      name={k}
                      onChange={handleBlockPropChange}
                      placeholder="Mặc định (Trống)"
                    />
                  </div>
                ) : (k === "width" || (isObjectSchema && schemaDef.type === "range")) ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12, color: "#666" }}>
                      <span>{isObjectSchema ? schemaDef.min || 0 : 25}%</span>
                      <span>{label}: {selected.props[k] || (isObjectSchema ? schemaDef.defaultValue : 100)}%</span>
                      <span>{isObjectSchema ? schemaDef.max || 100 : 100}%</span>
                    </div>
                    <input
                      type="range"
                      min={isObjectSchema ? schemaDef.min || 0 : 25}
                      max={isObjectSchema ? schemaDef.max || 100 : 100}
                      step={1}
                      style={{ width: "100%", cursor: "pointer", accentColor: "#0B5FFF" }}
                      value={selected.props[k] || (isObjectSchema ? schemaDef.defaultValue : 100)}
                      name={k}
                      onChange={handleBlockPropChange}
                    />
                  </>
                ) : (k === "height" || k === "marginBottom") ? (
                  <input
                    type="number"
                    placeholder="Auto"
                    style={inputStyle}
                    onFocus={handleFocus} onBlur={handleBlur}
                    value={selected.props[k] || ""}
                    name={k}
                    onChange={handleBlockPropChange}
                  />
                ) : k === "heightTablet" ? (
                  <input
                    type="number"
                    placeholder="Theo chiều cao thường"
                    style={inputStyle}
                    onFocus={handleFocus} onBlur={handleBlur}
                    value={selected.props[k] || ""}
                    name={k}
                    onChange={handleBlockPropChange}
                  />
                ) : (
                  <input
                    style={inputStyle}
                    onFocus={handleFocus} onBlur={handleBlur}
                    value={selected.props[k]}
                    name={k}
                    onChange={handleBlockPropChange}
                  />
                )}
              </div>
            )
          })}

          {selected.type === 'customBlock' && selected.props.componentType === 'SubHeaderBar' && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Link Video (Youtube)</label>
              <input
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder="https://www.youtube.com/watch?v=..."
                value={selected.props.videoUrl || ""}
                name="videoUrl"
                onChange={handleBlockPropChange}
              />
            </div>
          )}
        </>
      )
      }
    </div >
  );
}
