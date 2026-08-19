import React, { memo, useCallback } from "react";
import CustomTableFolder from "@components/CustomTable/CustomTableFolder";
import { useToast } from "@components/common/ToastProvider";
import CustomInput from "@components/CustomInput/CustomInput";
import { API_LIST_CATEGORY_DOCUMENT_BY_DOCUMENT, API_EXPORT_RECORD_LIST } from "@EnvironmentFile/constants/urlConfig";
import api from "@services/api";
import { recordListColumns } from "@pages/ProfileListManagement/categoryListConstant";
// import { Folder as FolderIcon } from "@mui/icons-material";
// import { styled } from "@mui/material/styles";
import { useSelector } from "react-redux";
import { BoxContained, Body, Backdrop } from "@styles/AppBar/Appbar.style";
import { Box, styled } from "@mui/material";
import AddFolderDialog from "./AddFolderDialog";
import DeleteDialog from "./DeleteDialog";
import ViewRecordManagement from "@pages/RecordManagement/ViewRecordManagement";
import OpenProfileManagement from "@pages/RecordManagement/OpenProfileManagement";
import HierarchyHeader from "./HierarchyHeader";

// const StyledFolderIcon = styled(FolderIcon)({
//     color: "#ffb300",
//     marginRight: "8px",
//     verticalAlign: "middle"
// });

/**
 * RecordListPage - Level 3
 * Breadcrumb: QUẢN LÝ DANH MỤC > [YEAR] > DANH MỤC HỒ SƠ > [FOLDER TITLE] > [DEPARTMENT]
 */
const StatusFilterWrapper = styled(Box)({
    width: "250px",
    "& .MuiFormControl-root": {
        width: "100%",
    }
});
function RecordListPage({
    open,
    onClose,
    onCloseAll,
    goBackToYear,
    departmentId,
    departmentName,
    yearLabel,
    // categoryLabel,
    folderTitleName,
}) {
    const toast = useToast();
    const tableDataRef = React.useRef([]);
    const [openAddDialog, setOpenAddDialog] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [refreshTrigger, setRefreshTrigger] = React.useState(0);
    const [openDeleteDialog, setOpenDeleteDialog] = React.useState(false);
    const [idsToDelete, setIdsToDelete] = React.useState([]);

    // Detail actions
    const [openViewDetail, setOpenViewDetail] = React.useState(false);
    const [selectedArchiveId, setSelectedArchiveId] = React.useState(null);
    const [openOpenRecord, setOpenOpenRecord] = React.useState(false);
    const [selectedFolderForOpen, setSelectedFolderForOpen] = React.useState(null);
    const [recordState, setRecordState] = React.useState("");

    const isSidebarOpen = useSelector((state) => state.layout.isSidebarOpen);
    const sidebarWidth = isSidebarOpen ? 300 : 60;

    const filterConfig = React.useMemo(() => [
        { name: "Tiêu đề hồ sơ", code: "documentTitle" },
        { name: "Số/Ký hiệu hồ sơ", code: "documentSymbol" },

    ], []);

    const fetchData = React.useMemo(() => async (tableParams) => {
        const { page, limit, query, code, sort } = tableParams;
        try {
            // Theo spec BE: fileRecordId (Bắt buộc)
            const params = { 
                page, 
                limit, 
                fileRecordId: departmentId,
                ...(recordState !== "all" && recordState !== "" && { "filter[status]": recordState })
            };

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
            const response = await api.get(API_LIST_CATEGORY_DOCUMENT_BY_DOCUMENT, { params });
            const resData = response.data;
            const actualData = Array.isArray(resData.data) ? resData.data : (resData.data?.data || []);
            const actualTotal = typeof resData.total === 'number' ? resData.total : (resData.data?.total || 0);
            tableDataRef.current = actualData;
            return { data: actualData, total: actualTotal };
        } catch (error) { toast("Không thể tải danh sách!", "error"); return { data: [], total: 0 }; }
    }, [departmentId, toast, recordState]);

    const handleAdd = useCallback(async (data) => {
        setIsLoading(true);
        try {
            await api.post(API_LIST_CATEGORY_DOCUMENT_BY_DOCUMENT, { 
                documentTitle: data.documentTitle,
                documentSymbol: data.documentSymbol,
                fileRecordId: departmentId 
            });
            toast("Thêm mới thành công!", "success");
            setOpenAddDialog(false);
            setRefreshTrigger(prev => prev + 1);
        } catch (error) { toast(error?.response?.data?.message || "Có lỗi khi thêm mới!", "error"); }
        finally { setIsLoading(false); }
    }, [departmentId, toast]);

    const handleConfirmDelete = useCallback(async () => {
        try {
            // Theo spec BE: DELETE /record-catalog/record-document/:id
            const deletePromises = idsToDelete.map(id => api.delete(`${API_LIST_CATEGORY_DOCUMENT_BY_DOCUMENT}/${id}`));
            await Promise.all(deletePromises);
            
            toast("Xoá thành công!", "success");
            setOpenDeleteDialog(false);
            setRefreshTrigger(prev => prev + 1);
        } catch (error) { toast(error?.response?.data?.message || "Có lỗi khi xoá!", "error"); }
    }, [idsToDelete, toast]);

    const handleViewDetail = useCallback((rowOrId) => {
        let row = rowOrId;
        if (typeof rowOrId !== 'object') {
            row = tableDataRef.current.find(r => r.id === rowOrId || r._id === rowOrId);
        }

        // Chặn xem chi tiết nếu hồ sơ chưa mở (status === "0")
        if (row && String(row.status) === "0") {
            toast("Đồng chí vui lòng mở hồ sơ để xem chi tiết", "error");
            return;
        }

        let id = rowOrId;
        if (typeof rowOrId === 'object') id = rowOrId.archiveRecordId || rowOrId.id || rowOrId._id;
        else { if (row) id = row.archiveRecordId || row.id || row._id; }
        if (id) { setSelectedArchiveId(id); setOpenViewDetail(true); }
    }, [toast]);

    const handleReload = () => setRefreshTrigger(prev => prev + 1);

    const handleAddClick = useCallback(() => setOpenAddDialog(true), []);
    const handleCloseAddDialog = useCallback(() => setOpenAddDialog(false), []);
    const handleCloseDeleteDialog = useCallback(() => setOpenDeleteDialog(false), []);
    const handleCloseViewDetail = useCallback(() => setOpenViewDetail(false), []);
    const handleCloseOpenRecord = useCallback(() => setOpenOpenRecord(false), []);
    const handleOpenDeleteDialog = useCallback((selection) => {
        setIdsToDelete(selection);
        setOpenDeleteDialog(true);
    }, []);
  const handleAddItems = useCallback((row) => {
    setSelectedFolderForOpen(row.id || row._id); // 🔥 hỗ trợ cả id và _id
    setOpenOpenRecord(true);
}, []);
    const handleExport = useCallback(async (tableParams) => {
        try {
            const { exportType, sort, ...rest } = tableParams;
            const params = {
                ...rest,
                fileRecordId: departmentId,
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

            const response = await api.get(API_EXPORT_RECORD_LIST, {
                params,
                responseType: "blob"
            });
            return response.data;
        } catch (error) {
            toast("Có lỗi xảy ra khi xuất file!", "error");
        }
    }, [departmentId, toast]);
    const handleStopPropagation = useCallback((e) => e.stopPropagation(), []);

   const handleRecordStateChange = (e) => {
    // console.log(e);
    const value = e?.target ? e.target.value : e;
    setRecordState(value);
};

    const renderMoreSearch = () => (
        <StatusFilterWrapper>
            <CustomInput
                select
                size="small"
                value={recordState === "" ? "all" : recordState}
                onChange={handleRecordStateChange}
                options={[
                    { label: "Tất cả trạng thái", value: "all" },
                    { label: "Chưa mở", value: "0" },
                    { label: "Đang thu thập", value: "1" },
                    { label: "Đã lưu trữ", value: "2" },
                ]}
                disableClear
            />
        </StatusFilterWrapper>
    );

    if (!open) return null;

    const breadcrumbItems = [
        { label: "DANH MỤC HỒ SƠ", onClick: onCloseAll },
        { label: yearLabel.toUpperCase(), onClick: goBackToYear },
        { label: (folderTitleName || "").toUpperCase(), onClick: onClose },
        { label: (departmentName || "").toUpperCase() }
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
                            codeModule="RECORD_LIST_COLUMNS"
                            fetchData={fetchData}
                            columns={recordListColumns}
                            disableSynchronize
                            onAdd={handleAddClick}
                            addText="Thêm tiêu đề hồ sơ"
                            isExportInDetail
                            onExportInDetail={handleExport}
                            fileName={`Danh_sach_tieu_de_ho_so_${departmentName}`}
                            onDelete={handleOpenDeleteDialog}
                            checkDeleteCondition={(row) => row.canDelete}
                            checkViewCondition={(row) => row.canView}
                            checkAddItemsCondition={(row) => row.canOpen}
                            refreshTrigger={refreshTrigger}
                            filter={filterConfig}
                            disableEdit
                            onView={handleViewDetail}
                            onRowClick={handleViewDetail}
                            onAddItems={handleAddItems}
                            anableSTT={false}
                            fixedHeight
                            styledMaxHeight={130}
                            moreSearch={renderMoreSearch}
                        />
                    </Body>
                </BoxContained>
            </Backdrop>

            <AddFolderDialog open={openAddDialog} onClose={handleCloseAddDialog} onSave={handleAdd} isLoading={isLoading} />
            <DeleteDialog open={openDeleteDialog} onClose={handleCloseDeleteDialog} onConfirm={handleConfirmDelete} selectedIds={idsToDelete} />

            {openViewDetail && (
                <ViewRecordManagement open={openViewDetail} onClose={handleCloseViewDetail} archiveId={selectedArchiveId} setReloadData={handleReload} />
            )}
            {openOpenRecord && (
                <OpenProfileManagement
  open={openOpenRecord}
  onClose={handleCloseOpenRecord}
  initialFileId={selectedFolderForOpen}   // 🔥 đổi tên rõ nghĩa
  setReloadData={handleReload}
  hiddenSearchCategory
/>
            )}
        </>
    );
}

export default memo(RecordListPage);
