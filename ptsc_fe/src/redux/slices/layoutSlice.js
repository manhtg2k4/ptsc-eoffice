import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isSidebarOpen: true,
  selectedModuleCode: null, // ⚠️ CHỈ LƯU MÃ ĐỊNH DANH (ví dụ: codeRouter hoặc title)
  currentPageTitle: "", // ✅ Thêm field mới để lưu title màn hiện tại
  currentPageBreadcrumb: [], // ✅ (Optional) Lưu breadcrumb đầy đủ
  currentSwiperTitle: "", // Tiêu đề của Swiper đang mở hiện tại
  notificationPreviousTitle: "", // Tiêu đề của màn hình trước khi click Notification
};

const layoutSlice = createSlice({
  name: "layout",
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    setSidebarOpen(state, action) {
      state.isSidebarOpen = action.payload;
    },
    // Actions để quản lý phân hệ được chọn
    setSelectedModule(state, action) {
      state.selectedModuleCode = action.payload; // Chỉ lưu mã định danh
    },
    clearSelectedModule(state) {
      state.selectedModuleCode = null;
    },
     // ✅ Action mới để set title màn hiện tại
    setCurrentPageTitle(state, action) {
      state.currentPageTitle = action.payload;
    },
    // ✅ (Optional) Action để set breadcrumb
    setCurrentPageBreadcrumb(state, action) {
      state.currentPageBreadcrumb = action.payload;
    },
    // Set tiêu đề Swiper hiện tại
    setCurrentSwiperTitle(state, action) {
      state.currentSwiperTitle = action.payload;
    },
    // Xóa tiêu đề Swiper hiện tại
    clearCurrentSwiperTitle(state) {
      state.currentSwiperTitle = "";
    },
    // Lưu tiêu đề trước đó khi click thông báo
    setNotificationPreviousTitle(state, action) {
      state.notificationPreviousTitle = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  setSelectedModule,
  clearSelectedModule,
  setCurrentPageTitle,
  setCurrentPageBreadcrumb,
  setCurrentSwiperTitle,
  clearCurrentSwiperTitle,
  setNotificationPreviousTitle,
} = layoutSlice.actions;

export default layoutSlice.reducer;