import React, { useCallback, useMemo, useState } from "react";
import CustomTableFolder from "@components/CustomTable/CustomTableFolder";
// import { useDispatch } from "react-redux";
// import { setShowGlobalBreadcrumb } from "@redux/slices/layoutSlice";
import { useToast } from "@components/common/ToastProvider";
import { API_LIST_CATEGORY_DOCUMENT, API_YEAR_CATEGORY } from "@EnvironmentFile/constants/urlConfig";
import api from "@services/api";
import { categoryListColumns, categoryListFilters } from "@pages/ProfileListManagement/categoryListConstant";
import AddYearCategory from "./AddYearCategory";
import DeleteDialog from "./DeleteDialog";
import FolderDetail from "./FolderDetail";
// import { IconButton } from "@mui/material";

/**
 * CategoryListPage - Màn hình danh sách danh mục hồ sơ (cha)
 * Sử dụng CustomTable để hiển thị danh sách các năm.
 * Đây là "file cứng" thay thế cho logic quy trình động trước đây.
 */
function CategoryListPage() {
    const toast = useToast();
    // const dispatch = useDispatch();

    // Quản lý việc hiển thị breadcrumb ở MainLayout
    // useEffect(() => {
    //     dispatch(setShowGlobalBreadcrumb(true));
    //     return () => {
    //         dispatch(setShowGlobalBreadcrumb(false));
    //     };
    // }, [dispatch]);

    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [openDialog, setOpenDialog] = useState({ 
        add: false, 
        delete: false, 
        folderDetail: false,
        settings: false 
    });
    const [selectedItem, setSelectedItem] = useState(null);

    // Fetch dữ liệu từ API_YEAR_CATEGORY
    const fetchData = useCallback(async ({ page, limit, query, code, sort, startDate, endDate }) => {
        try {
            const params = { page, limit };
            
            // Xử lý sort dạng sort[field]=1 hoặc sort[field]=-1
            if (sort && typeof sort === "object") {
                Object.keys(sort).forEach((key) => {
                    params[`sort[${key}]`] = sort[key];
                });
            } else if (sort) {
                params.sort = sort;
            }

            if (query && Array.isArray(code) && code.length > 0) {
                code.forEach((field) => { params[`filter[${field}]`] = query; });
            }

            // Thêm lọc theo ngày khởi tạo
            if (startDate) params['filter[createdAt][startDate]'] = startDate;
            if (endDate) params['filter[createdAt][endDate]'] = endDate;

            const response = await api.get(API_YEAR_CATEGORY, { params });
            const resData = response.data;
            const dataArray = Array.isArray(resData?.data) ? resData.data : (resData?.data?.data || []);
            const total = resData?.total || resData?.data?.total || dataArray.length;

            return { data: dataArray, total };
        } catch (error) {
            toast("Không thể tải danh mục hồ sơ!", "error");
            return { data: [], total: 0 };
        }
    }, [toast]);

    const handleOpenFolderDetail = useCallback((row) => {
        setSelectedItem(row);
        setOpenDialog(prev => ({ ...prev, folderDetail: true }));
    }, []);

    const handleAddClick = useCallback(() => {
        setOpenDialog(prev => ({ ...prev, add: true }));
    }, []);

    const handleDeleteClick = useCallback((selected) => {
        setSelectedItem(selected);
        setOpenDialog(prev => ({ ...prev, delete: true }));
    }, []);

    const handleCloseDialog = (type) => {
        setOpenDialog(prev => ({ ...prev, [type]: false }));
        setSelectedItem(null);
    };

    const handleCloseAddDialog = () => handleCloseDialog('add');
    const handleCloseDeleteDialog = () => handleCloseDialog('delete');
    const handleCloseFolderDetailDialog = () => handleCloseDialog('folderDetail');

    const handleDeleteConfirm = async () => {
        try {
            const ids = Array.isArray(selectedItem) ? selectedItem : [selectedItem.id || selectedItem._id];
            await api.delete(API_YEAR_CATEGORY, { data: { ids } });
            toast("Xóa danh mục thành công!", "success");
            handleCloseDialog('delete');
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            toast(error?.response?.data?.message || "Có lỗi xảy ra khi xóa!", "error");
        }
    };

    const handleImportReload = useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
    }, []);

    const importExcelProps = useMemo(() => ({
        endpoint: `${API_LIST_CATEGORY_DOCUMENT}/import`,
        title: "Nhập danh mục hồ sơ từ Excel",
        templateKey: "template_import_hslt",
        setReloadData: handleImportReload,
    }), [handleImportReload]);

    // const handleExport = useCallback((type) => {
    //     toast(`Đang xuất file ${type.toUpperCase()}...`, "info");
    // }, [toast]);

    return (
        <>
            <CustomTableFolder
                // title="DANH MỤC HỒ SƠ"
                fetchData={fetchData}
                columns={categoryListColumns}
                filter={categoryListFilters}
                disableSynchronize
                disableAct
                onAdd={handleAddClick}
                addText="Thêm danh mục năm"
                onDelete={handleDeleteClick}
                onRowClick={handleOpenFolderDetail}
                refreshTrigger={refreshTrigger}
                isCheckTitle={false}
                disableCheckbox={true}
                anableDateRangePicker={true} // Bật tìm kiếm từ ngày đến ngày
                // fixedHeight={true} // Cố định pagination ở dưới
                styledMaxHeight={160} // Điều chỉnh chiều cao cho phù hợp màn hình chính
                isExportInDetail={false}
                showImportButton
                importExcelProps={importExcelProps}
                // isCheckTitle={false}
                // onExportInDetail={handleExport}
            />

            <AddYearCategory
                open={openDialog.add}
                onClose={handleCloseAddDialog}
                setReloadData={() => setRefreshTrigger(prev => prev + 1)}
            />

            <DeleteDialog
                open={openDialog.delete}
                onClose={handleCloseDeleteDialog}
                onConfirm={handleDeleteConfirm}
                selectedIds={Array.isArray(selectedItem) ? selectedItem : [selectedItem?.id || selectedItem?._id]}
            />

            {openDialog.folderDetail && (
                <FolderDetail
                    open={openDialog.folderDetail}
                    onClose={handleCloseFolderDetailDialog}
                    documentId={selectedItem}
                />
            )}
        </>
    );
}

export default CategoryListPage;
