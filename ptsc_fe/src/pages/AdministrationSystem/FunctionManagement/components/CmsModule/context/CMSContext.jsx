import React, { createContext, useContext, useCallback } from "react";
import { useCMSData } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/hooks/useCMSData";
import { useCMSUI } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/hooks/useCMSUI";
import { arrayMove } from "@dnd-kit/sortable";
import { ROUTES } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/config/routes";
import { BLOCKS } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/config/blocks";
import { API_PAGE } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/EnvironmentFile/urlConfig";
import axiosClient from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/hooks/axiosClient";
import { toast } from "react-toastify";

export const CMSContext = createContext(null);

export function CMSProvider({ children, initialPagePath = ROUTES.HOME }) {
  const data = useCMSData(initialPagePath);
  const ui = useCMSUI();

  // Destructure for easier access in functions
  const {
    pages, setPages,
    activePage, setActivePage,
    headerConfig, setHeaderConfig,
    footerConfig,
    preHeaderConfig,
    topicNavConfig,
    subHeaderConfig, 
    pageIds, setPageIds,
    layout, setLayout
  } = data;

  const {
    selected, setSelected,
    setNewPageLabel, 
    setNewPagePath, 
    setPageError,
    setShowAddPageModal,
    setShowPageMenu,
    setShowEditPageModal, setEditPageLabel, setEditPagePath, setPageToEdit,
    setShowDeletePageModal, setPageToDelete, setDeleteError,
    newPageLabel, newPagePath,
    editPageLabel, editPagePath, pageToEdit,
    pageToDelete
  } = ui;

  // --- ACTIONS ---

  const savePageLayout = useCallback(async (pagePath, allPages, allPageIds, pHeader, header, footer, tNav, sHeader) => {
    // Note: logic copied from original useCMS
    const saveToApi = async (id, blocks) => {
      const payload = {
        pageId: id,
        replaceAll: true,
        blocks,
      };
      await axiosClient.post(`${API_PAGE}`, payload);
    };

    let pageId = allPageIds[pagePath];

    if (!pageId && pagePath.startsWith(ROUTES.NEWS_DETAIL_PREFIX)) {
      pageId = `news_${pagePath.split("/").pop()}`;
    }

    if (!pageId && pagePath.startsWith("/")) {
      pageId = pagePath.replace(/\//g, '_').replace(/:/g, 'var_');
    }

    if (pageId) {
      const currentLayout = allPages[pagePath] || [];
      const bodyBlocks = currentLayout.map((block, index) => ({
        ...block.props,
        key: block.id,
        name: BLOCKS[block.type]?.label || block.type,
        type: block.type,
        order: index,
      }));

      try {
        await saveToApi(pageId, [
          { key: 'preHeader', name: 'Top Bar', order: -3, ...pHeader },
          { key: 'header', name: 'Header', order: -2, ...header },
          { key: 'topicNav', name: 'Topic Menu', order: -1.75, ...tNav },
          { key: 'subHeader', name: 'Sub Header', order: -1.5, ...sHeader },
          ...bodyBlocks,
          { key: 'footer', name: 'Footer', order: 9999, ...footer },
        ]);
        logger.log(`Saved current page: ${pagePath}`);
        toast.success("Lưu trang thành công!");
      } catch (error) {
        logger.error("Failed to save page layout:", error);
        toast.error("Lưu trang thất bại!");
        throw error;
      }
    }

    // Sync to Home if necessary
    const homePath = ROUTES.HOME;
    const homeId = allPageIds[homePath];

    if (pagePath !== homePath && homeId) {
      const homeLayout = allPages[homePath];
      if (homeLayout) {
        const homeBodyBlocks = homeLayout.map((block, index) => ({
          ...block.props,
          key: block.id,
          name: BLOCKS[block.type]?.label || block.type,
          type: block.type,
          order: index,
        }));

        try {
          await saveToApi(homeId, [
            { key: 'preHeader', name: 'Top Bar', order: -3, ...pHeader },
            { key: 'header', name: 'Header', order: -2, ...header },
            { key: 'topicNav', name: 'Topic Menu', order: -1.75, ...tNav },
            ...homeBodyBlocks,
            { key: 'footer', name: 'Footer', order: 9999, ...footer },
          ]);
          logger.log("Synced Global Config to Home Page");
        } catch (e) {
          logger.error("Failed to sync global config to Home", e);
          throw e;
        }
      }
    }
  }, []);

  const onSave = useCallback(() => {
    return savePageLayout(activePage, pages, pageIds, preHeaderConfig, headerConfig, footerConfig, topicNavConfig, subHeaderConfig);
  }, [activePage, pages, pageIds, preHeaderConfig, headerConfig, footerConfig, topicNavConfig, savePageLayout, subHeaderConfig]);


  const onDragEnd = async (e) => {
    if (!e.over) return;
    const oldIndex = layout.findIndex(i => i.id === e.active.id);
    const newIndex = layout.findIndex(i => i.id === e.over.id);

    if (oldIndex === newIndex) return;

    const newLayout = arrayMove(layout, oldIndex, newIndex);
    setLayout(newLayout);

    const pageId = pageIds[activePage];
    if (pageId) {
      try {
        const payload = {
          blocks: [
            { key: "preHeader", order: -3 },
            { key: "header", order: -2 },
            { key: "topicNav", order: -1.75 },
            ...newLayout.map((b, i) => ({ key: b.id, order: i })),
            { key: "footer", order: 9999 }
          ]
        };
        await axiosClient.put(`${API_PAGE}/${pageId}/reorder`, payload);
      } catch (error) {
        logger.error("Failed to reorder blocks:", error);
      }
    }
  };

  const updateBlock = (b) => {
    setLayout(layout.map(i => i.id === b.id ? b : i));
    setSelected(b);
  };

  const deleteBlock = (id) => {
    const newLayout = layout.filter(b => b.id !== id);
    setLayout(newLayout);
    if (selected?.id === id) setSelected(null);
  };

  const handleResizeBlock = (id, newProps) => {
    setLayout(layout.map(b =>
      b.id === id ? { ...b, props: { ...b.props, ...newProps } } : b
    ));
    if (selected?.id === id) {
      setSelected(prev => prev ? { ...prev, props: { ...prev.props, ...newProps } } : prev);
    }
  };

  // --- PAGE ACTIONS ---

  const addPage = () => {
    setShowAddPageModal(true);
    setNewPageLabel("");
    setNewPagePath("");
    setPageError("");
  };

  const updatePageMetadata = async (oldHref, newLabel, newHref, fullWidth, hidePreHeader, hideTopicNav, hideSearch, subHeaderColors) => {
    if (!newLabel.trim() || !newHref.trim()) return;

    const homeId = pageIds[ROUTES.HOME];
    const payload = {
      old: { label: headerConfig.menu.find(i => i.href === oldHref)?.label, href: oldHref },
      new: { label: newLabel, href: newHref }
    };

    if (homeId) {
      try {
        await axiosClient.put(`${API_PAGE}/${homeId}/header/menu`, payload);
        toast.success("Cập nhật trang thành công!");
      } catch (error) {
        logger.error("Failed to update menu item:", error);
        toast.error("Cập nhật trang thất bại!");
      }
    }

    setHeaderConfig(prev => ({
      ...prev,
      menu: prev.menu.map(item =>
        item.href === oldHref ? { ...item, label: newLabel, href: newHref, fullWidth, hidePreHeader, hideTopicNav, hideSearch, ...subHeaderColors } : item
      )
    }));

    if (oldHref !== newHref) {
      const newId = newHref.replace(/\//g, '_').replace(/:/g, 'var_');

      setPageIds(prev => {
        const newIds = { ...prev };
        delete newIds[oldHref];
        newIds[newHref] = newId;
        return newIds;
      });

      setPages(prev => {
        const newPages = { ...prev };
        if (newPages[oldHref]) {
          newPages[newHref] = newPages[oldHref];
          delete newPages[oldHref];
        }
        return newPages;
      });

      if (activePage === oldHref) {
        setActivePage(newHref);
      }

      if (selected && selected.id === oldHref) {
        setSelected({ ...selected, id: newHref, props: { ...selected.props, label: newLabel, href: newHref } });
      }
    }
  };

  const confirmAddPage = async () => {
    if (!newPageLabel.trim()) {
      setPageError("Vui lòng nhập tên hiển thị (Label)");
      return;
    }
    if (!newPagePath.trim()) {
      setPageError("Vui lòng nhập đường dẫn (Path)");
      return;
    }
    if (!newPagePath.startsWith("/")) {
      setPageError("Đường dẫn phải bắt đầu bằng dấu /");
      return;
    }

    const label = newPageLabel.trim();
    const href = newPagePath.trim();
    const menuPayload = { label, href };
    const homeId = pageIds[ROUTES.HOME];

    if (pages[newPagePath]) {
      setPageError("Đường dẫn này đã tồn tại");
      return;
    }

    const newId = newPagePath.startsWith("/")
      ? newPagePath.replace(/\//g, '_').replace(/:/g, 'var_')
      : label.toLowerCase().replace(/\s+/g, '-');

    if (homeId) {
      try {
        await axiosClient.post(`${API_PAGE}/${homeId}/header/menu`, menuPayload);
        toast.success("Thêm trang thành công!");
      } catch (error) {
        logger.error("Failed to add menu item:", error);
        toast.error("Thêm trang thất bại!");
      }
    }

    setPageIds(prev => ({ ...prev, [newPagePath]: newId }));
    setHeaderConfig(prev => ({
      ...prev,
      menu: [...prev.menu, menuPayload]
    }));
    setPages(prev => ({ ...prev, [newPagePath]: [] }));
    setActivePage(newPagePath);
    setShowPageMenu(false);
    setShowAddPageModal(false);
    setNewPageLabel("");
    setNewPagePath("");
    setPageError("");
  };

  const openEditPageModal = (href) => {
    const item = headerConfig.menu.find(i => i.href === href);
    if (item) {
      setEditPageLabel(item.label);
      setEditPagePath(item.href);
      setPageToEdit(href);
      setShowEditPageModal(true);
      setPageError("");
    }
  };

  const confirmEditPage = async () => {
    if (!editPageLabel.trim()) {
      setPageError("Vui lòng nhập tên hiển thị (Label)");
      return;
    }
    if (!editPagePath.trim()) {
      setPageError("Vui lòng nhập đường dẫn (Path)");
      return;
    }
    if (!editPagePath.startsWith("/")) {
      setPageError("Đường dẫn phải bắt đầu bằng dấu /");
      return;
    }

    const oldHref = pageToEdit;
    const newLabel = editPageLabel.trim();
    const newHref = editPagePath.trim();

    // Reuse updatePageMetadata logic partially or rewrite?
    // Let's rewrite as it handles the specific UI closing logic too
    const menuItem = headerConfig.menu.find(item => item.href === oldHref);
    if (!menuItem) return;

    const oldLabel = menuItem.label;

    const payload = {
      old: { label: oldLabel, href: oldHref },
      new: { label: newLabel, href: newHref }
    };

    const homeId = pageIds[ROUTES.HOME];

    if (homeId) {
      try {
        await axiosClient.put(`${API_PAGE}/${homeId}/header/menu`, payload);
        toast.success("Cập nhật trang thành công!");
      } catch (error) {
        logger.error("Failed to update menu item:", error);
        toast.error("Cập nhật trang thất bại!");
      }
    }

    setHeaderConfig(prev => ({
      ...prev,
      menu: prev.menu.map(item =>
        item.href === oldHref ? { label: newLabel, href: newHref } : item
      )
    }));

    if (oldHref !== newHref) {
      const newId = newHref.replace(/\//g, '_').replace(/:/g, 'var_');
      setPageIds(prev => {
        const newIds = { ...prev };
        delete newIds[oldHref];
        newIds[newHref] = newId;
        return newIds;
      });
      setPages(prev => {
        const newPages = { ...prev };
        if (newPages[oldHref]) {
          newPages[newHref] = newPages[oldHref];
          delete newPages[oldHref];
        }
        return newPages;
      });
      if (activePage === oldHref) {
        setActivePage(newHref);
      }
    }

    setShowEditPageModal(false);
    setPageToEdit(null);
    setEditPageLabel("");
    setEditPagePath("");
    setPageError("");
  };

  const deletePage = (href) => {
    if (href === ROUTES.HOME) {
      setDeleteError("Không thể xóa trang chủ");
      setShowDeletePageModal(true);
      setPageToDelete(null);
      return;
    }
    if (headerConfig.menu.length <= 1) {
      setDeleteError("Không thể xóa trang cuối cùng");
      setShowDeletePageModal(true);
      setPageToDelete(null);
      return;
    }
    setPageToDelete(href);
    setDeleteError("");
    setShowDeletePageModal(true);
  };

  const confirmDeletePage = async () => {
    if (!pageToDelete) {
      setShowDeletePageModal(false);
      return;
    }
    const menuItem = headerConfig.menu.find(item => item.href === pageToDelete);
    const homeId = pageIds[ROUTES.HOME];

    if (menuItem && homeId) {
      try {
        await axiosClient.delete(`${API_PAGE}/${homeId}/header/menu`, {
          data: { label: menuItem.label, href: menuItem.href }
        });
        toast.success("Xóa trang thành công!");
      } catch (error) {
        logger.error("Failed to delete menu item:", error);
        toast.error("Xóa trang thất bại!");
      }
    }

    if (activePage === pageToDelete) setActivePage(ROUTES.HOME);
    if (selected?.id === pageToDelete) setSelected(null);

    setPageIds(prev => {
      const newIds = { ...prev };
      delete newIds[pageToDelete];
      return newIds;
    });

    setHeaderConfig(prev => ({ ...prev, menu: prev.menu.filter(p => p.href !== pageToDelete) }));
    setPages(prev => {
      const newPages = { ...prev };
      delete newPages[pageToDelete];
      return newPages;
    });

    setShowDeletePageModal(false);
    setPageToDelete(null);
    setDeleteError("");
  };

  const addMenuItem = async (item) => {
    const homeId = pageIds[ROUTES.HOME];
    if (homeId) {
      try {
        await axiosClient.post(`${API_PAGE}/${homeId}/header/menu`, item);
      } catch (error) {
        logger.error("Failed to add menu item:", error);
      }
    }
  };

  const updateMenuItem = async (oldItem, newItem) => {
    const homeId = pageIds[ROUTES.HOME];
    if (homeId) {
      try {
        await axiosClient.put(`${API_PAGE}/${homeId}/header/menu`, { old: oldItem, new: newItem });
      } catch (error) {
        logger.error("Failed to update menu item:", error);
      }
    }
  };

  const deleteMenuItem = async (item) => {
    const homeId = pageIds[ROUTES.HOME];
    if (homeId) {
      try {
        await axiosClient.delete(`${API_PAGE}/${homeId}/header/menu`, { data: item });
      } catch (error) {
        logger.error("Failed to delete menu item:", error);
      }
    }
  };

  const value = {
    ...data,
    ...ui, // exposes ui state setters if needed
    onDragEnd,
    updateBlock,
    deleteBlock,
    handleResizeBlock,
    addPage,
    deletePage,
    confirmAddPage,
    openEditPageModal,
    confirmEditPage,
    confirmDeletePage,
    onSave,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    updatePageMetadata
  };

  return (
    <CMSContext.Provider value={value}>
      {children}
    </CMSContext.Provider>
  );
}

export const useCMS = () => {
  const context = useContext(CMSContext);
  if (!context) {
    throw new Error("useCMS must be used within a CMSProvider");
  }
  return context;
};
