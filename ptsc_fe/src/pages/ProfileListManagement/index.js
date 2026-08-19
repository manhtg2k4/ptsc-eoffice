import React from "react";
import CategoryListPage from "./components/CategoryListPage";

/**
 * ProfileListManagement - Entry Point
 * Chuyển đổi sang sử dụng CategoryListPage (màn hình cứng)
 * thay thế cho logic kéo từ quy trình động cũ.
 */
function ProfileListManagement() {
  return <CategoryListPage />;
}

export default ProfileListManagement;
