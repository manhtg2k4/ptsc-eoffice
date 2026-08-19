import React, { useState, useCallback } from "react";
import AuthorizationManagements from "./components/AuthorizationManagements";
import EditAuthorization from "./components/EditAuthorization"; // Import
import ViewAuthorization from "./components/ViewAuthorization"; // Import
import withSharedComponents from "@components/WrapperComponent";

const AuthorizationManagement = () => {
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [selectedId, setSelectedId] = useState(null); // Giả sử ID này lấy từ bảng

 

  const handleClose = useCallback(() => {
    setOpenAdd(false);
    setOpenEdit(false);
    setOpenView(false);
    setSelectedId(null);
  }, []);

  const handleSuccess = useCallback(() => {
    // Logic để tải lại danh sách sau khi thêm/sửa thành công
    handleClose();
  }, []);

  return (
    <>

      <AuthorizationManagements open={openAdd} onClose={handleClose} onSuccess={handleSuccess} />
      {openEdit && <EditAuthorization open={openEdit} onClose={handleClose} onSuccess={handleSuccess} documentId={selectedId} />}
      {openView && <ViewAuthorization open={openView} onClose={handleClose} documentId={selectedId} />}
    </>
  );
};

export default withSharedComponents(AuthorizationManagement);
