import { SkyFlexGap8 } from '@styles/SkyStyles';
import React, { memo, useCallback, useEffect, useState } from 'react'
import dayjs from 'dayjs';
import api from '@services/api';
import { API_CREATE_PERSONAL_TASK_DELEGATION, API_EXPORT_FILE_REPORT, } from '@EnvironmentFile/constants/urlConfig';
import {  PERSONAL_TASK_DELEGATION_FILTER_CONFIG } from './constant';
import { useToast } from '@components/common/ToastProvider';
import AddPersonalTaskDelegation from './AddPersonalTaskDelegation';
import CustomTable from "@components/CustomTable/CustomTableStatic";
import PersonalTask from './PersonalTaskDelegation';
import CustomDatePicker from '@components/CustomDatePicker';
import LoadingDialog from '@components/LoadingDialog';
import { StyledDialogContent } from '@styles/CustomDialog.styles';
import DeleteDelegationDialog from './DeleteDelegationDialog';
import { useMediaQuery, useTheme } from '@mui/material';

const ListPersonalTaskDelegation = () => {
    const [selectedData, setSelectedData] = useState(null)
     const [startDate, setStartDate] = useState(null)
    const [endDate, setEndDate] = useState(null)
    const [debouncedStartDate, setDebouncedStartDate] = useState(null)
    const [debouncedEndDate, setDebouncedEndDate] = useState(null)
    const [reloadTable, setReloadTable] = useState(false);
    const [loading, setLoading] = useState(false);
    const theme = useTheme();
    const isMobileOrTablet = useMediaQuery(theme.breakpoints.down("md"));

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedStartDate(startDate);
            setDebouncedEndDate(endDate);
        }, 500);
        return () => clearTimeout(timer);
    }, [startDate, endDate]);

    const toast = useToast()
    const [open, setOpen] = useState({
        add: false,
        edit: false,
        view: false,
        delete: false
    })
    const [itemsToDelete, setItemsToDelete] = useState([]);


    const fetchDataTable = useCallback(async (params) => {

        try {
            const finalParams = {
                ...params,
                fromDate: debouncedStartDate ? dayjs(debouncedStartDate).toISOString() : undefined,
                endDate: debouncedEndDate ? dayjs(debouncedEndDate).toISOString() : undefined,
            }
            const response = await api.get(API_CREATE_PERSONAL_TASK_DELEGATION, { params: finalParams });
            const result = response?.data || response;

            let data = [];
            let total = 0;

            if (Array.isArray(result)) {
                data = result;
                total = result.length;
            } else if (result?.items) {
                data = result.items;
                total = result.total || result.items.length || 0;
            } else if (result?.data && Array.isArray(result.data)) {
                data = result.data;
                total = result.total || result.totalCount || result.data.length || 0;
            } else if (typeof result === 'object' && result !== null) {
                // Handle case where it might be an object with results in another field or just return empty
                data = result.data || [];
                total = result.total || data.length || 0;
            }

            return { data, total };
        } catch (error) {
            toast(error?.response?.data?.message || error?.message || "Không thể lấy danh sách uỷ quyền", "error");
            return { data: [], total: 0 };
        }
    }, [toast, debouncedStartDate, debouncedEndDate]);

    const handleOpen = useCallback((key) => {
        setOpen(prev => ({ ...prev, [key]: true }))
    }, [])


    const handleClose = useCallback((key) => {
        setOpen(prev => ({ ...prev, [key]: false }))
    }, [])

    const handleViewSubTask = useCallback((row) => {
        handleOpen('view');
        setSelectedData(row);
    }, [handleOpen]);

    const handleEditSubTask = useCallback((row) => {
        handleOpen('edit');
        setSelectedData(row);
    }, [handleOpen]);

    const handleAdd = useCallback(() => {
        handleOpen('add');
     }, [handleOpen]);

    const handleCloseAdd = useCallback(() => handleClose('add'), [handleClose]);
    const handleCloseView = useCallback(() => handleClose('view'), [handleClose]);
    const handleCloseEdit = useCallback(() => handleClose('edit'), [handleClose]);

    const moreSearch = () => {
        return (
            <SkyFlexGap8>
                <CustomDatePicker
                    label="Ngày bắt đầu"
                    value={startDate || null}
                    // futureOnly
                    onChange={setStartDate}

                />
                <CustomDatePicker
                    label="Ngày kết thúc"
                    value={endDate || null}
                    // futureOnly
                    onChange={setEndDate}

                />
            </SkyFlexGap8>
        )
    }
    const handleExport = useCallback(async (options) => {
        try {
            setLoading(true);
            const { exportType, ...params } = options;
            const res = await api.get(API_EXPORT_FILE_REPORT, {
                params: {
                    ...params,
                    viewConfigCode: 'taskDelegation',
                    exportType: exportType,
                },
                responseType: 'blob'
            });
            return res.data;
        } catch (error) {
            toast("Không thể xuất file", "error");
        } finally {
            setLoading(false);
        }
    }, [toast])

    const handleDelete = useCallback((items) => {
        const finalItems = Array.isArray(items) ? items : [items];
        setItemsToDelete(finalItems);
        setOpen(prev => ({ ...prev, delete: true }));
    }, []);

    const handleConfirmDelete = useCallback(async () => {
        try {
            setLoading(true);
            const ids = itemsToDelete.map(item => Number(item._id || item.id)); 
            
            if (ids.length === 1) {
                await api.delete(`${API_CREATE_PERSONAL_TASK_DELEGATION}/${ids[0]}`);
            } else {
                await api.delete(`${API_CREATE_PERSONAL_TASK_DELEGATION}/delete-many`, {
                    data: { ids },
                });
            }
            
            setLoading(false);
            setOpen(prev => ({ ...prev, delete: false }));
            toast("Xóa thành công", "success");
            setReloadTable(prev => !prev);
        } catch (error) {
            setLoading(false);
            toast(error?.response?.data?.message || "Có lỗi khi xóa", "error");
        }
    }, [itemsToDelete, toast]);

    const handleRemoveFromDelete = useCallback(async (id) => {
        try {
            setLoading(true);
            await api.delete(`${API_CREATE_PERSONAL_TASK_DELEGATION}/${Number(id)}`);
            setItemsToDelete(prev => {
                const newList = prev.filter(item => (item._id || item.id) !== id);
                if (newList.length === 0) setOpen(p => ({ ...p, delete: false }));
                return newList;
            });
            setLoading(false);
            toast("Xóa thành công", "success");
            setReloadTable(prev => !prev);
        } catch (error) {
            setLoading(false);
            toast(error?.response?.data?.message || "Có lỗi khi xóa", "error");
        }
    }, [toast, setReloadTable]);

    const handleCloseDelete = useCallback(() => handleClose('delete'), [handleClose]);


    return (
        <>
            <CustomTable
                // columns={columns}
                fetchData={fetchDataTable}

                disableSearch
                disableSynchronize
                reload={reloadTable}
                filtersAdvanced
                fixedHeight
                moreSearch={moreSearch}
                advancedFilterConfig={PERSONAL_TASK_DELEGATION_FILTER_CONFIG}
                onView={handleViewSubTask}
                onEdit={handleEditSubTask}
                isExportAll
                onExport={handleExport}
                onDelete={handleDelete}
                onAdd={handleAdd}
                selectionReturns="object"
                checkEditCondition={(row) => row.statusText !== "Hết hiệu lực"}
                customMaxHeight={isMobileOrTablet ? 400 : 200}
                isSetting
                isCheckTitle
                codeModule="taskDelegation"
                disableDelete
            />
            <AddPersonalTaskDelegation
                open={open.add}
                onClose={handleCloseAdd}
                setReloadData={setReloadTable}
            />
            <PersonalTask
                open={open.view}
                onClose={handleCloseView}
                id={selectedData}
                type='view'
                setReloadData={setReloadTable}
            />
            <PersonalTask
                open={open.edit}
                onClose={handleCloseEdit}
                id={selectedData}
                type='edit'
                setReloadData={setReloadTable}

            />
            <LoadingDialog open={loading}>
                <StyledDialogContent>
                    {"Đang xử lý, vui lòng chờ trong giây lát..."}
                </StyledDialogContent>
            </LoadingDialog>

            <DeleteDelegationDialog
                open={open.delete}
                onClose={handleCloseDelete}
                onConfirm={handleConfirmDelete}
                items={itemsToDelete}
                onDeleteItem={handleRemoveFromDelete}
            />

        </>

    )
}

export default memo(ListPersonalTaskDelegation)