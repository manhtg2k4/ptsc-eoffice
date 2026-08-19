import { useState } from "react";

export function useCMSUI() {
  const [isPreview, setIsPreview] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showPageMenu, setShowPageMenu] = useState(false);
  
  // Add Page Modal
  const [showAddPageModal, setShowAddPageModal] = useState(false);
  const [newPageLabel, setNewPageLabel] = useState("");
  const [newPagePath, setNewPagePath] = useState("");
  const [pageError, setPageError] = useState("");

  // Edit Page Modal
  const [showEditPageModal, setShowEditPageModal] = useState(false);
  const [editPageLabel, setEditPageLabel] = useState("");
  const [editPagePath, setEditPagePath] = useState("");
  const [pageToEdit, setPageToEdit] = useState(null);

  // Delete Page Modal
  const [showDeletePageModal, setShowDeletePageModal] = useState(false);
  const [pageToDelete, setPageToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  return {
    isPreview, setIsPreview,
    selected, setSelected,
    showAddPanel, setShowAddPanel,
    showPageMenu, setShowPageMenu,
    
    // Add Page
    showAddPageModal, setShowAddPageModal,
    newPageLabel, setNewPageLabel,
    newPagePath, setNewPagePath,
    pageError, setPageError,

    // Edit Page
    showEditPageModal, setShowEditPageModal,
    editPageLabel, setEditPageLabel,
    editPagePath, setEditPagePath,
    pageToEdit, setPageToEdit,

    // Delete Page
    showDeletePageModal, setShowDeletePageModal,
    pageToDelete, setPageToDelete,
    deleteError, setDeleteError,
  };
}
