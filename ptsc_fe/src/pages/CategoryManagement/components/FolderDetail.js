import React, { memo, useCallback } from "react";
import CustomTable from "@components/CustomTable/CustomTableStatic";
import { useToast } from "@components/common/ToastProvider";
import { API_FOLDER_MANAGEMENT, API_YEAR_CATEGORY } from "@EnvironmentFile/constants/urlConfig";
import api from "@services/api";
import { Folder as FolderIcon } from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import CustomSwipper from "@components/Swipper";
import AddFolderDialog from "./AddFolderDialog";
import DeleteDialog from "./DeleteDialog";
import ViewRecordManagement from "@pages/RecordManagement/ViewRecordManagement";
import OpenRecordManagement from "@pages/RecordManagement/OpenRecordManagement";
import DOMPurify from "dompurify";
const StyledFolderIcon = styled(FolderIcon)({
    color: "#ffb300",
    marginRight: "8px",
    verticalAlign: "middle"
});




function FolderDetail({ open, onClose, documentId }) {
    const [openViewDetail, setOpenViewDetail] = React.useState(false);
    const [selectedArchiveId, setSelectedArchiveId] = React.useState(null);
    const tableDataRef = React.useRef([]);

    const handleViewDetail = useCallback((rowOrId) => {
        let id = rowOrId;
        if (typeof rowOrId === 'object') {
            id = rowOrId.archiveRecordId || rowOrId.id || rowOrId._id;
        } else {
             const foundRow = tableDataRef.current.find(row => row.id === rowOrId || row._id === rowOrId);
             if (foundRow) {
                 id = foundRow.archiveRecordId || foundRow.id || foundRow._id;
             }
        }

        if (id) {
            setSelectedArchiveId(id);
            setOpenViewDetail(true);
        }
    }, []);

    const handleCloseViewDetail = useCallback(() => {
        setOpenViewDetail(false);
        setSelectedArchiveId(null);
    }, []);

    const yearData = documentId;
    const toast = useToast();
    const [dynamicYear, setDynamicYear] = React.useState("");
    const [openAddDialog, setOpenAddDialog] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [refreshTrigger, setRefreshTrigger] = React.useState(0);
    const [openDeleteDialog, setOpenDeleteDialog] = React.useState(false);
    const [idsToDelete, setIdsToDelete] = React.useState([]);
    const [openOpenRecordManagement, setOpenOpenRecordManagement] = React.useState(false);
    const [selectedFolderForOpen, setSelectedFolderForOpen] = React.useState(null);

    const columns = React.useMemo(() => [
        {
            name: "Số và ký hiệu hồ sơ",
            row: "documentSymbol",
            width: "200px"
        },
        {
            name: "Tiêu đề hồ sơ",
            row: "documentTitle",
            width: "500px",
            render: (value, row) => {
                const titleToRender = row.documentTitleOriginal || value || row.abstract;
                if (value && value.includes('<')) {
                    return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(`<p>${value}</p>`) }} />;
                }
                return (
                    <>
                        <StyledFolderIcon />
                        {titleToRender}
                    </>
                );
            }
        },
        {
            name: "Trạng thái",
            row: "statusLabel",
            width: "150px",
            render: (value, row) => {
                if (value && value.includes('<')) {
                    return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(`<p>${value}</p>`) }} />;
                }
                const statusMap = {
                    "0": { label: "Chưa mở", color: "#e0e0e0" },
                    "1": { label: "Đã mở", color: "#e3f2fd" },
                    "2": { label: "Đã lưu trữ", color: "#e8f5e9" },
                    "Chưa mở": { label: "Chưa mở", color: "#e0e0e0" },
                    "Đã mở": { label: "Đã mở", color: "#e3f2fd" },
                    "Đã lưu trữ": { label: "Đã lưu trữ", color: "#e8f5e9" }
                };
                const statusKey = row.status || value;
                const status = statusMap[statusKey] || { label: value || "Không xác định", color: "#f5f5f5" };
                return (
                    <span style={{ 
                        backgroundColor: status.color, 
                        padding: "4px 12px", 
                        borderRadius: "16px",
                        fontSize: "0.875rem"
                    }}>
                        {status.label}
                    </span>
                );
            }
        }
    ], []);

    const yearCategoryId = React.useMemo(() => {
        return typeof yearData === 'object' ? (yearData?.id || yearData?._id) : yearData;
    }, [yearData]);
    const filterConfig = React.useMemo(() => [
        { name: "Tiêu đề hồ sơ", code: "documentTitle" },
        { name: "Số/Ký hiệu hồ sơ", code: "documentSymbol" }
    ], []);

    React.useEffect(() => {
        const fetchYearDetail = async () => {
            if (open && yearCategoryId) {
                if (typeof yearData === 'object' && (yearData.year || yearData.title || yearData.value)) {
                    const val = yearData.year || yearData.title || yearData.value;
                    setDynamicYear(val);
                } else {
                    try {
                        const res = await api.get(`${API_YEAR_CATEGORY}/${yearCategoryId}`);
                        const data = res.data?.data || res.data;
                        if (data) {
                            const val = data.year || data.title || data.value;
                            if (val) {
                                setDynamicYear(val);
                            }
                        }
                    } catch (error) {
                        // Silent error
                    }
                }
            }
        };
        fetchYearDetail();
    }, [open, yearCategoryId, yearData]);

    const fetchData = React.useMemo(() => async (tableParams) => {
        const { page, limit, query, code } = tableParams;
        try {
            if (!yearCategoryId) {
                return { data: [], total: 0 };
            }

            const params = {
                page,
                limit,
                yearCategoryId
            };

            Object.keys(tableParams).forEach(key => {
                if (key.startsWith('filter[')) {
                    params[key] = tableParams[key];
                }
            });

            if (query && Array.isArray(code) && code.length > 0) {
                 code.forEach((field) => {
                     if (!params[`filter[${field}]`]) {
                         params[`filter[${field}]`] = query;
                     }
                });
            }

            const response = await api.get(API_FOLDER_MANAGEMENT, { params });
            const resData = response.data;

            // Handle different API response structures
            const actualData = Array.isArray(resData.data) ? resData.data : (resData.data?.data || []);
            const actualTotal = typeof resData.total === 'number' ? resData.total : (resData.data?.total || 0);

            tableDataRef.current = actualData;

            return {
                data: actualData,
                total: actualTotal,
            };
        } catch (error) {
            toast("Không thể tải danh sách hồ sơ!", "error");
            return { data: [], total: 0 };
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [yearCategoryId]);

    const handleAddClick = useCallback(() => {
        setOpenAddDialog(true);
    }, []);

    const handleCloseAddDialog = useCallback(() => {
        setOpenAddDialog(false);
    }, []);

    const handleCloseDeleteDialog = useCallback(() => {
        setOpenDeleteDialog(false);
    }, []);

    const handleAdd = useCallback(async (data) => {
        setIsLoading(true);
        try {
            const yearCategoryId = typeof yearData === 'object' ? (yearData?.id || yearData?._id) : yearData;
            
            const payload = {
                documentSymbol: data.documentSymbol,
                documentTitle: data.documentTitle,
                yearCategoryId: yearCategoryId
            };

            await api.post(API_FOLDER_MANAGEMENT, payload);
            toast("Thêm danh mục hồ sơ thành công!", "success");
            handleCloseAddDialog();
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            toast(error?.response?.data?.message || "Có lỗi xảy ra khi thêm mới!", "error");
        } finally {
            setIsLoading(false);
        }
    }, [yearData, toast, handleCloseAddDialog]);

    const handleDelete = useCallback((selectedIds) => {
        setIdsToDelete(selectedIds);
        setOpenDeleteDialog(true);
    }, []);

    const handleConfirmDelete = useCallback(async () => {
        try {
            const payload = {
                ids: idsToDelete
            };

            await api.delete(API_FOLDER_MANAGEMENT, { data: payload });
            toast("Xóa danh mục hồ sơ thành công!", "success");
            setOpenDeleteDialog(false);
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            toast(error?.response?.data?.message || "Có lỗi xảy ra khi xóa!", "error");
        }
    }, [idsToDelete, toast]);

    const handleCloseOpenRecordManagement = useCallback(() => {
        setOpenOpenRecordManagement(false);
    }, []);

    const handleReload = useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
    }, []);

    const handleAddItems = useCallback((row) => {
        setSelectedFolderForOpen(row);
        setOpenOpenRecordManagement(true);
    }, []);

    const checkDeleteCondition = useCallback((row) => {
        return row.status === 0 || row.status === "0";
    }, []);

    const checkAddItemsCondition = useCallback((row) => {
        return row.status === 0 || row.status === "0";
    }, []);

    const checkViewCondition = useCallback((row) => {
        return row.status !== 0 && row.status !== "0";
    }, []);

    const handleExport = useCallback(async (tableParams) => {
        try {
            const yearCategoryId = typeof yearData === 'object' ? (yearData?.id || yearData?._id) : yearData;
            const params = {
                ...tableParams,
                yearCategoryId
            };

            const response = await api.get(`${API_FOLDER_MANAGEMENT}/exports`, {
                params,
                responseType: 'blob'
            });
            return response.data;
        } catch (error) {
            toast("Có lỗi xảy ra khi xuất file!", "error");
            return null;
        }
    }, [yearData, toast]);

    const displayYear = dynamicYear || (typeof yearData === 'object' ? (yearData?.title || yearData?.year || yearData?.value) : "");

    return (
        <>
            <CustomSwipper
                open={open}
                onClose={onClose}
                title={`Chi tiết danh mục hồ sơ "${displayYear ? (displayYear.toString().startsWith("Năm") ? displayYear : `Năm ${displayYear}`) : ""}"`}
                type="view"
                noneOverflow
            >
                <CustomTable
                    fetchData={fetchData}
                    columns={columns}
                    disableSynchronize
                    onAdd={handleAddClick}
                    onDelete={handleDelete}
                    refreshTrigger={refreshTrigger}
                    filter={filterConfig}
                    isExportAll
                    onExport={handleExport}
                    fileName={`Danh_muc_ho_so_${displayYear || ''}`}
                    // isCheckTitle
                    disableEdit
                    onView={handleViewDetail}
                    onAddItems={handleAddItems}
                    checkDeleteCondition={checkDeleteCondition}
                    checkAddItemsCondition={checkAddItemsCondition}
                    checkViewCondition={checkViewCondition}
                    styledMaxHeight={120}
                />
            </CustomSwipper>
            <AddFolderDialog
                open={openAddDialog}
                onClose={handleCloseAddDialog}
                onSave={handleAdd}
                isLoading={isLoading}
            />
            <DeleteDialog
                open={openDeleteDialog}
                onClose={handleCloseDeleteDialog}
                onConfirm={handleConfirmDelete}
                selectedIds={idsToDelete}
            />
            {openViewDetail && (
                <ViewRecordManagement
                    open={openViewDetail}
                    onClose={handleCloseViewDetail}
                    archiveId={selectedArchiveId}
                    setReloadData={() => setRefreshTrigger(prev => prev + 1)}
                />
            )}
            {openOpenRecordManagement && ( 
                <OpenRecordManagement
                    open={openOpenRecordManagement}
                    onClose={handleCloseOpenRecordManagement}
                    initialFolder={selectedFolderForOpen}
                    setReloadData={handleReload}
                    hiddenSearchCategory
                />
            )}
        </>
    );
}

export default memo(FolderDetail);
