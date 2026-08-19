import React, { memo, useCallback } from "react";
import CustomTableFolder from "@components/CustomTable/CustomTableFolder";
import { useToast } from "@components/common/ToastProvider";
import { API_LIST_CATEGORY_DOCUMENT_BY_DEPARTMENT, API_EXPORT_DEPARTMENT_RECORD } from "@EnvironmentFile/constants/urlConfig";
import api from "@services/api";
import { departmentRecordColumns } from "@pages/ProfileListManagement/categoryListConstant";
// import { Folder as FolderIcon } from "@mui/icons-material";
// import { styled } from "@mui/material/styles";
import { useSelector } from "react-redux";
import { BoxContained, Body, Backdrop } from "@styles/AppBar/Appbar.style";
import AddDepartmentRecordDialog from "./AddDepartmentRecordDialog";
import DeleteDialog from "./DeleteDialog";
import RecordListPage from "./RecordListPage";
import HierarchyHeader from "./HierarchyHeader";

// const StyledFolderIcon = styled(FolderIcon)({
//     color: "#ffb300",
//     marginRight: "8px",
//     verticalAlign: "middle"
// });

/**
 * DepartmentRecordPage - Level 2
 * Breadcrumb: QUẢN LÝ DANH MỤC > [YEAR] > DANH MỤC HỒ SƠ > [FOLDER TITLE]
 */
function DepartmentRecordPage({
    open,
    onClose,
    onCloseAll,
    folderTitleId,
    folderTitleName,
    yearLabel,
    categoryLabel,
}) {
    const toast = useToast();
    const [openAddDialog, setOpenAddDialog] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [refreshTrigger, setRefreshTrigger] = React.useState(0);
    const [openDeleteDialog, setOpenDeleteDialog] = React.useState(false);
    const [idsToDelete, setIdsToDelete] = React.useState([]);

    // Level 3 state
    const [openRecordList, setOpenRecordList] = React.useState(false);
    const [selectedDepartment, setSelectedDepartment] = React.useState(null);

    const isSidebarOpen = useSelector((state) => state.layout.isSidebarOpen);
    const sidebarWidth = isSidebarOpen ? 300 : 60;

    const filterConfig = React.useMemo(() => [
        { name: "Số và ký hiệu phòng", code: "fileSymbol" },
        { name: "Tên hồ sơ phòng", code: "title" },
        { name: "Tổng số hồ sơ", code: "totalDocuments" },
        { name: "Tổng số tài liệu", code: "totalFiles" },
    ], []);

    const fetchData = React.useMemo(() => async (tableParams) => {
        const { page, limit, query, code, sort } = tableParams;
        try {
            // Theo spec BE: folderDetailId (Bắt buộc)
            const params = { page, limit, folderDetailId: folderTitleId };
            
            // Xử lý sort dạng sort[field]=1 hoặc sort[field]=-1
            if (sort && typeof sort === "object") {
                Object.keys(sort).forEach((key) => {
                    params[`sort[${key}]`] = sort[key];
                });
            } else if (sort) {
                params.sort = sort;
            }

            Object.keys(tableParams).forEach(key => { if (key.startsWith('filter[')) params[key] = tableParams[key]; });
            if (query && Array.isArray(code) && code.length > 0) {
                code.forEach(field => { if (!params[`filter[${field}]`]) params[`filter[${field}]`] = query; });
            }
            const response = await api.get(API_LIST_CATEGORY_DOCUMENT_BY_DEPARTMENT, { params });
            const resData = response.data;
            const actualData = Array.isArray(resData.data) ? resData.data : (resData.data?.data || []);
            const actualTotal = typeof resData.total === 'number' ? resData.total : (resData.data?.total || 0);
            return { data: actualData, total: actualTotal };
        } catch (error) {
            toast("Không thể tải danh sách hồ sơ phòng!", "error");
            return { data: [], total: 0 };
        }
    }, [folderTitleId, toast]);

    const handleAdd = useCallback(async (data) => {
        setIsLoading(true);
        try {
            await api.post(API_LIST_CATEGORY_DOCUMENT_BY_DEPARTMENT, {
                title: data.departmentRecord,
                fileSymbol: data.departmentSymbol,
                folderDetailId: folderTitleId
            });
            toast("Thêm mới thành công!", "success");
            setOpenAddDialog(false);
            setRefreshTrigger(prev => prev + 1);
        } catch (error) { toast(error?.response?.data?.message || "Có lỗi khi thêm mới!", "error"); }
        finally { setIsLoading(false); }
    }, [folderTitleId, toast]);

    const handleConfirmDelete = useCallback(async () => {
        try {
            // Theo spec BE: DELETE /record-catalog/file-record/:id
            const deletePromises = idsToDelete.map(id => api.delete(`${API_LIST_CATEGORY_DOCUMENT_BY_DEPARTMENT}/${id}`));
            await Promise.all(deletePromises);
            
            toast("Xoá thành công!", "success");
            setOpenDeleteDialog(false);
            setRefreshTrigger(prev => prev + 1);
        } catch (error) { toast(error?.response?.data?.message || "Có lỗi khi xoá!", "error"); }
    }, [idsToDelete, toast]);

    const handleRowClick = useCallback((row) => {
        setSelectedDepartment(row);
        setOpenRecordList(true);
    }, []);

    const handleAddDialogClick = useCallback(() => setOpenAddDialog(true), []);
    const handleCloseAddDialog = useCallback(() => setOpenAddDialog(false), []);
    const handleCloseDeleteDialog = useCallback(() => setOpenDeleteDialog(false), []);
    const handleCloseRecordList = useCallback(() => setOpenRecordList(false), []);
    const handleOpenDeleteDialog = useCallback((selection) => {
        setIdsToDelete(selection);
        setOpenDeleteDialog(true);
    }, []);
    const handleExport = useCallback(async (tableParams) => {
        try {
            const { exportType, sort, ...rest } = tableParams;
            const params = {
                ...rest,
                folderDetailId: folderTitleId,
                exportType: exportType || "excel"
            };

            // Xử lý sort dạng sort[field]=1 hoặc sort[field][-1]
            if (sort && typeof sort === "object") {
                Object.keys(sort).forEach((key) => {
                    params[`sort[${key}]`] = sort[key];
                });
            } else if (sort) {
                params.sort = sort;
            }

            const response = await api.get(API_EXPORT_DEPARTMENT_RECORD, {
                params,
                responseType: "blob"
            });
            return response.data;
        } catch (error) {
            toast("Có lỗi xảy ra khi xuất file!", "error");
        }
    }, [folderTitleId, toast]);
    const handleStopPropagation = useCallback((e) => e.stopPropagation(), []);

    if (!open) return null;

    const breadcrumbItems = [
        { label: "DANH MỤC HỒ SƠ", onClick: onCloseAll },
        { label: yearLabel.toUpperCase(), onClick: onClose },
        { label: (folderTitleName || "").toUpperCase() }
    ];

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <>
            <Backdrop onClick={handleBackdropClick}>
                <BoxContained sidebarWidth={sidebarWidth} onClick={handleStopPropagation}>
                    <HierarchyHeader items={breadcrumbItems} />
                    <Body noneOverflow>
                        <CustomTableFolder
                            codeModule="DEPARTMENT_RECORD_COLUMNS"
                            fetchData={fetchData}
                            columns={departmentRecordColumns}
                            disableSynchronize
                            onAdd={handleAddDialogClick}
                            addText="Thêm hồ sơ phòng"
                            isExportInDetail={true}
                            onExportInDetail={handleExport}
                            fileName={`Danh_sach_ho_so_phong_${folderTitleName}`}
                            onDelete={handleOpenDeleteDialog}
                            refreshTrigger={refreshTrigger}
                            filter={filterConfig}
                            disableEdit
                            onRowClick={handleRowClick}
                            disableAct
                            fixedHeight={true}
                            styledMaxHeight={130}
                            disableCheckbox={true}
                            anableSTT={true}  
                        />
                    </Body>
                </BoxContained>
            </Backdrop>

            <AddDepartmentRecordDialog open={openAddDialog} onClose={handleCloseAddDialog} onSave={handleAdd} isLoading={isLoading} />
            <DeleteDialog open={openDeleteDialog} onClose={handleCloseDeleteDialog} onConfirm={handleConfirmDelete} selectedIds={idsToDelete} />

            {openRecordList && (
                <RecordListPage
                    open={openRecordList}
                    onClose={handleCloseRecordList}
                    onCloseAll={onCloseAll}
                    goBackToYear={onClose}
                    departmentId={selectedDepartment?.id || selectedDepartment?._id}
                    departmentName={selectedDepartment?.title}
                    yearLabel={yearLabel}
                    categoryLabel={categoryLabel}
                    folderTitleName={folderTitleName}
                />
            )}
        </>
    );
}

export default memo(DepartmentRecordPage);
