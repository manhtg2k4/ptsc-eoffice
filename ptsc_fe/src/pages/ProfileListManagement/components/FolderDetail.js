import React, { memo, useCallback } from "react";
import CustomTableFolder from "@components/CustomTable/CustomTableFolder";
import { useToast } from "@components/common/ToastProvider";
import { API_LIST_CATEGORY_DOCUMENT, API_YEAR_CATEGORY, API_EXPORT_FOLDER_DETAIL } from "@EnvironmentFile/constants/urlConfig";
import api from "@services/api";
import { folderDetailColumns } from "@pages/ProfileListManagement/categoryListConstant";
// import { Folder as FolderIcon } from "@mui/icons-material";
// import { styled } from "@mui/material/styles";
import { useSelector } from "react-redux";
import { BoxContained, Body, Backdrop } from "@styles/AppBar/Appbar.style";
import AddFolderTitleDialog from "./AddFolderTitleDialog";
import DeleteDialog from "./DeleteDialog";
import DepartmentRecordPage from "./DepartmentRecordPage";
import HierarchyHeader from "./HierarchyHeader";

// const StyledFolderIcon = styled(FolderIcon)({
//     color: "#ffb300",
//     marginRight: "8px",
//     verticalAlign: "middle"
// });

/**
 * FolderDetail - Level 1 (Tiêu đề mục hồ sơ)
 * Hiển thị 1 cột: Tiêu đề mục hồ sơ
 * Breadcrumb: QUẢN LÝ DANH MỤC > NĂM [YEAR]
 */
function FolderDetail({ open, onClose, documentId }) {
    const yearData = documentId;
    const toast = useToast();
    const [dynamicYear, setDynamicYear] = React.useState("");
    const [openAddDialog, setOpenAddDialog] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [refreshTrigger, setRefreshTrigger] = React.useState(0);
    const [openDeleteDialog, setOpenDeleteDialog] = React.useState(false);
    const [idsToDelete, setIdsToDelete] = React.useState([]);

    // Level 2 state
    const [openDepartmentPage, setOpenDepartmentPage] = React.useState(false);
    const [selectedFolderTitle, setSelectedFolderTitle] = React.useState(null);

    const isSidebarOpen = useSelector((state) => state.layout.isSidebarOpen);
    const sidebarWidth = isSidebarOpen ? 300 : 60;

    const yearCategoryId = React.useMemo(() => {
        return typeof yearData === 'object' ? (yearData?.id || yearData?._id) : yearData;
    }, [yearData]);

    const filterConfig = React.useMemo(() => [
        { name: "Tiêu đề mục hồ sơ", code: "title" },
        { name: "Tổng số hồ sơ", code: "totalDocuments" },
        { name: "Tổng số tài liệu", code: "totalFiles" },
    ], []);

    React.useEffect(() => {
        const fetchYearDetail = async () => {
            if (open && yearCategoryId) {
                if (typeof yearData === 'object' && (yearData.year || yearData.title || yearData.value)) {
                    setDynamicYear(yearData.year || yearData.title || yearData.value);
                } else {
                    try {
                        const res = await api.get(`${API_YEAR_CATEGORY}/${yearCategoryId}`);
                        const data = res.data?.data || res.data;
                        if (data) {
                            const val = data.year || data.title || data.value;
                            if (val) setDynamicYear(val);
                        }
                    } catch { /* silent */ }
                }
            }
        };
        fetchYearDetail();
    }, [open, yearCategoryId, yearData]);

    const fetchData = React.useMemo(() => async (tableParams) => {
        const { page, limit, query, code, sort } = tableParams;
        try {
            if (!yearCategoryId) return { data: [], total: 0 };
            const params = { page, limit, yearCategoryId };
            
            // Xử lý sort dạng sort[field]=1 hoặc sort[field]=-1
            if (sort && typeof sort === "object") {
                Object.keys(sort).forEach((key) => {
                    params[`sort[${key}]`] = sort[key];
                });
            } else if (sort) {
                params.sort = sort;
            }

            Object.keys(tableParams).forEach(key => {
                if (key.startsWith('filter[')) params[key] = tableParams[key];
            });
            if (query && Array.isArray(code) && code.length > 0) {
                code.forEach(field => { if (!params[`filter[${field}]`]) params[`filter[${field}]`] = query; });
            }
            const response = await api.get(API_LIST_CATEGORY_DOCUMENT, { params });
            const resData = response.data;
            const actualData = Array.isArray(resData.data) ? resData.data : (resData.data?.data || []);
            const actualTotal = typeof resData.total === 'number' ? resData.total : (resData.data?.total || 0);
            return { data: actualData, total: actualTotal };
        } catch (error) {
            toast("Không thể tải danh sách tiêu đề mục hồ sơ!", "error");
            return { data: [], total: 0 };
        }
    }, [yearCategoryId, toast]);

    const handleAddClick = useCallback(() => setOpenAddDialog(true), []);
    const handleAdd = useCallback(async (data) => {
        setIsLoading(true);
        try {
            await api.post(API_LIST_CATEGORY_DOCUMENT, {
                title: data.folderTitle,
                yearCategoryId
            });
            toast("Thêm mới thành công!", "success");
            setOpenAddDialog(false);
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            toast(error?.response?.data?.message || "Có lỗi xảy ra khi thêm mới!", "error");
        } finally { setIsLoading(false); }
    }, [yearCategoryId, toast]);

    const handleDelete = useCallback((selectedIds) => {
        setIdsToDelete(selectedIds);
        setOpenDeleteDialog(true);
    }, []);

    const handleConfirmDelete = useCallback(async () => {
        try {
            // Theo spec BE: DELETE /record-catalog/folder-detail/:id
            // Nếu xóa nhiều, ta lặp hoặc nếu BE có hỗ trợ body ids thì dùng. 
            // Ở đây tạm thời xử lý cho single delete theo spec để đảm bảo chạy được.
            const deletePromises = idsToDelete.map(id => api.delete(`${API_LIST_CATEGORY_DOCUMENT}/${id}`));
            await Promise.all(deletePromises);
            
            toast("Xoá thành công!", "success");
            setOpenDeleteDialog(false);
            setRefreshTrigger(prev => prev + 1);
        } catch (error) { toast(error?.response?.data?.message || "Có lỗi khi xoá!", "error"); }
    }, [idsToDelete, toast]);

    const handleRowClick = useCallback((row) => {
        setSelectedFolderTitle(row);
        setOpenDepartmentPage(true);
    }, []);

    const handleExport = useCallback(async (tableParams) => {
        try {
            const { exportType, sort, ...rest } = tableParams;
            const params = {
                ...rest,
                yearCategoryId,
                exportType: exportType || "excel"
            };

            // Xử lý sort dạng sort[field]=1 hoặc sort[field]=-1
            if (sort && typeof sort === "object") {
                Object.keys(sort).forEach((key) => {
                    params[`sort[${key}]`] = sort[key];
                });
            } else if (sort) {
                params.sort = sort;
            }

            const response = await api.get(API_EXPORT_FOLDER_DETAIL, {
                params,
                responseType: "blob"
            });
            return response.data;
        } catch (error) {
            toast("Có lỗi xảy ra khi xuất file!", "error");
        }
    }, [yearCategoryId, toast]);

    const handleStopPropagation = useCallback((e) => e.stopPropagation(), []);

    const handleCloseAddDialog = useCallback(() => setOpenAddDialog(false), []);
    const handleCloseDeleteDialog = useCallback(() => setOpenDeleteDialog(false), []);
    const handleCloseDepartmentPage = useCallback(() => setOpenDepartmentPage(false), []);

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!open) return null;

    const displayYear = dynamicYear || (typeof yearData === 'object' ? (yearData?.title || yearData?.year || yearData?.value) : "");
    const yearLabel = displayYear ? (displayYear.toString().startsWith("Năm") ? displayYear : `Năm ${displayYear}`) : "";

    const breadcrumbItems = [
        { label: "DANH MỤC HỒ SƠ", onClick: onClose },
        { label: yearLabel.toUpperCase() }
    ];

    return (
        <>
            <Backdrop onClick={handleBackdropClick}>
                <BoxContained sidebarWidth={sidebarWidth} onClick={handleStopPropagation}>
                    <HierarchyHeader items={breadcrumbItems} />
                    <Body noneOverflow>
                        <CustomTableFolder
                            codeModule="FOLDER_DETAIL_COLUMNS"
                            fetchData={fetchData}
                            columns={folderDetailColumns}
                            disableSynchronize
                            onAdd={handleAddClick}
                            addText="Thêm đề mục"
                            isExportInDetail
                            onExportInDetail={handleExport}
                            fileName={`Danh_sach_de_muc_ho_so_${displayYear}`}
                            onDelete={handleDelete}
                            refreshTrigger={refreshTrigger}
                            filter={filterConfig}
                            disableEdit
                            onRowClick={handleRowClick}
                            disableAct
                            fixedHeight
                            styledMaxHeight={130}
                            disableCheckbox
                            anableSTT
                        />
                    </Body>
                </BoxContained>
            </Backdrop>

            <AddFolderTitleDialog open={openAddDialog} onClose={handleCloseAddDialog} onSave={handleAdd} isLoading={isLoading} />
            <DeleteDialog open={openDeleteDialog} onClose={handleCloseDeleteDialog} onConfirm={handleConfirmDelete} selectedIds={idsToDelete} />

            {openDepartmentPage && (
                <DepartmentRecordPage
                    open={openDepartmentPage}
                    onClose={handleCloseDepartmentPage}
                    onCloseAll={onClose}
                    folderTitleId={selectedFolderTitle?.id || selectedFolderTitle?._id}
                    folderTitleName={selectedFolderTitle?.title}
                    yearLabel={yearLabel}
                    categoryLabel="DANH MỤC HỒ SƠ"
                />
            )}
        </>
    );
}

export default memo(FolderDetail);
