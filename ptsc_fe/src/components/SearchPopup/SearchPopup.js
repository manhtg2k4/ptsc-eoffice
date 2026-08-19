import React, { memo, useCallback, useMemo, useState } from 'react'
import { StyleDialog, StyledTitleText } from "@styles/DialogDirective";
import { StyledDialogContentNoScrollbar, StyledDialogHeaderWrapper } from "@styles/RecordDestruction/RecordDestruction.styles";
import StyledCustomInputBase from "@components/CustomInput/CustomInputBase";
import CustomButton from "@components/CustomButton";
import CustomTable from "@components/CustomTable/CustomTableStatic";
import { StyledDialogActions } from "@styles/CustomDialog.styles";
import { SkyChip, SkyGrid, SkyIconButton, SkyTooltip } from '@styles/SkyStyles';
import { ClearableInputAdornment, ChipContainer } from '@styles/CustomInput.styles';
import DescriptionIcon from "@mui/icons-material/Description";
import api from '@services/api';
import { useMediaQuery, useTheme, styled } from '@mui/material';
import { advancedFilterConfig, columns, filter, statusOptions } from '@pages/WorkManagement/components/constants';
import { useSelector } from 'react-redux';
import { APP_BASE } from '@EnvironmentFile/constants/urlConfig';

const StyledRecordChip = styled(SkyChip)(({ theme }) => ({
    marginRight: theme.spacing(0.5),
    marginBottom: theme.spacing(0.5),
}));

const WrapChipContainer = styled(ChipContainer)({
    flexWrap: 'nowrap',
    width: '100%',
    overflowX: 'auto',
    overflowY: 'auto',
    padding: '4px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
});

const RecordChip = memo(({ item, label, fullLabel, onDelete }) => {
    const handleDelete = useCallback((e) => {
        onDelete(e, item);
    }, [item, onDelete]);

    return (
        <SkyTooltip title={fullLabel} arrow placement="top">
            <StyledRecordChip
                size="small"
                label={label}
                onDelete={handleDelete}
            />
        </SkyTooltip>
    );
});

RecordChip.displayName = "RecordChip";

const StyledGridContainer = styled(SkyGrid)({
    flexWrap: 'nowrap !important',
    alignItems: 'center !important',
    display: 'flex !important',
    width: '100%',
});

const StyledInputGrid = styled(SkyGrid)({
    minWidth: 0,
    flex: 1,
});

const StyledButtonGrid = styled(SkyGrid)({
    flexShrink: 0,
});

const StyledCustomInput = styled(StyledCustomInputBase)({
    '& .MuiInputBase-input': {
        width: '0px !important',
        flexGrow: '0 !important',
        padding: '0 !important',
    },
    '& .MuiOutlinedInput-root': {
        display: 'flex !important',
        height: "auto !important",
        minHeight: '40px',
        maxHeight: '200px',
        overflowY: 'auto !important',
    },
    '& .MuiInputAdornment-positionStart': {
        flex: 1,
        maxWidth: '100%',
        overflow: 'hidden',
    },
    '& .MuiInputAdornment-positionEnd': {
        marginLeft: 'auto',   // ✅ đẩy nút ❌ về cuối
        flexShrink: 0,
    },
});



const SearchPopup = (props) => {
    const { label = "Nguồn văn bản", setValueChange, initialValue = null } = props;
    const { crmSource } = useSelector((state) => state.config);

    const [openDialog, setOpenDialog] = useState(false);
    const [selectValue, setSelectValue] = useState(null);
    const [isLoadingTable, setIsLoadingTable] = useState(false);
    const [selectedRows, setSelectedRows] = React.useState([]);
    const [isInitialized, setIsInitialized] = React.useState(false);
    const theme = useTheme();
    const isMobileOrTablet = useMediaQuery(theme.breakpoints.down("md"));
    const docTypeOptions = useMemo(() =>
        crmSource.find((item) => item.code === "S19")?.data || [], [crmSource]);

    React.useEffect(() => {
        if (!isInitialized && initialValue && Array.isArray(initialValue) && initialValue.length > 0) {
            const fetchInitialData = async () => {
                try {
                    const response = await api.get(`${APP_BASE}/api/incoming/list/for-task?type=waiting`, { 
                        params: { documentIds: initialValue.join(',') } 
                    });
                    
                    let data = [];
                    if (Array.isArray(response)) {
                        data = response;
                    } else if (response?.data?.items) {
                        data = response.data.items;
                    } else if (response?.items) {
                        data = response.items;
                    } else if (response?.data && Array.isArray(response.data)) {
                        data = response.data;
                    }
                    const selectedData = data.filter(item => 
                        initialValue.includes(item.documentId)
                    );

                    if (selectedData.length > 0) {
                        const displayValues = selectedData.map(item => {
                            const { toBook, abstractNote } = item;
                            const maxLength = 25;
                            const truncatedNote = abstractNote && abstractNote.length > maxLength
                                ? `${abstractNote.substring(0, maxLength)}...`
                                : abstractNote;

                            return toBook && abstractNote
                                ? `${toBook} - ${truncatedNote}`
                                : toBook || abstractNote || "";
                        });

                        setSelectValue({
                            value: displayValues.join('; '),
                            data: selectedData
                        });
                        setSelectedRows(selectedData);
                    }
                    setIsInitialized(true);
                } catch (error) {
                    setIsInitialized(true);
                }
            };
            fetchInitialData();
        } else if (!isInitialized) {
            setIsInitialized(true);
        }
    }, []);

    const prevInitialValueRef = React.useRef(initialValue);
    React.useEffect(() => {
        const prevHadValue = prevInitialValueRef.current && 
                            Array.isArray(prevInitialValueRef.current) && 
                            prevInitialValueRef.current.length > 0;
        const nowHasValue = initialValue && 
                           Array.isArray(initialValue) && 
                           initialValue.length > 0;
        if (isInitialized && prevHadValue && !nowHasValue) {
            setSelectValue(null);
            setSelectedRows([]);
        }
        prevInitialValueRef.current = initialValue;
    }, [initialValue, isInitialized]);

    const handleOpenDialog = () => {
        if (selectValue?.data) {
            setSelectedRows(Array.isArray(selectValue.data) ? selectValue.data : [selectValue.data]);
        } else {
            setSelectedRows([]);
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
    };
    const handleClick = (e) => {
        e?.stopPropagation();
        setSelectValue(null);
        setSelectedRows([]);
    };

    const handleDeleteRecord = useCallback((targetItem) => {
        const targetId = targetItem._id || targetItem.id;

        setSelectValue(prev => {
            if (!prev || !prev.data) return null;

            // Lọc bỏ bản ghi dựa trên ID hoặc so sánh object reference nếu không có ID
            const newData = prev.data.filter(item => {
                const itemId = item._id || item.id;
                if (targetId && itemId) {
                    return itemId !== targetId;
                }
                return item !== targetItem; // Fallback so sánh reference
            });

            if (newData.length === 0) return null;

            const displayValues = newData.map(item => {
                const { toBook, abstractNote } = item;
                const maxLength = 25;
                const truncatedNote = abstractNote && abstractNote.length > maxLength
                    ? `${abstractNote.substring(0, maxLength)}...`
                    : abstractNote;

                return toBook && abstractNote
                    ? `${toBook} - ${truncatedNote}`
                    : toBook || abstractNote || "";
            });

            return {
                value: displayValues.join('; '),
                data: newData
            };
        });

        setSelectedRows(prev => prev.filter(item => {
            const itemId = item._id || item.id;
            if (targetId && itemId) {
                return itemId !== targetId;
            }
            return item !== targetItem;
        }));
    }, []);

    const handleDeleteChip = useCallback((e, item) => {
        e.stopPropagation();
        handleDeleteRecord(item);
    }, [handleDeleteRecord]);

    const getChipLabel = useCallback((item) => {
        const { toBook, abstractNote } = item;
        const maxLength = 25;
        const truncatedNote = abstractNote && abstractNote.length > maxLength
            ? `${abstractNote.substring(0, maxLength)}...`
            : abstractNote;

        return toBook && abstractNote
            ? `${toBook} - ${truncatedNote}`
            : toBook || abstractNote || "";
    }, []);


    const getFullChipLabel = (item) => {
        const { toBook, abstractNote } = item;
        return toBook && abstractNote
            ? `${toBook} - ${abstractNote}`
            : toBook || abstractNote || "";
    };

    const fetchDataTable = useCallback(async (params) => {
        setIsLoadingTable(true);
        try {
            const response = await api.get(`${APP_BASE}/api/incoming/list/for-task?type=waiting`, { params });
            let data = [];
            let total = 0;

            if (Array.isArray(response)) {
                data = response;
                total = response.length;
            } else if (response?.data?.items) {
                data = response.data.items;
                total = response.data.total || data.length;
            } else if (response?.items) {
                data = response.items;
                total = response.total || data.length;
            } else if (response?.data && Array.isArray(response.data)) {
                data = response.data;
                total = response.total || data.length;
            }

            return { data, total };
        } catch (error) {
            return { data: [], total: 0 };
        } finally {
            setIsLoadingTable(false);
        }
    }, []);

    const handleSelectRows = useCallback((selection) => {
        // CustomTable with selectionReturns="object" will pass array of full row objects
        if (Array.isArray(selection)) {
            const filtered = selection.filter(Boolean);
            // Only update if selection actually changed (avoid unnecessary re-renders)
            setSelectedRows(prev => {
                if (prev.length !== filtered.length) return filtered;
                // Check if items are the same
                const isSame = prev.every((item, idx) => {
                    const filteredItem = filtered[idx];
                    return (item._id || item.id) === (filteredItem?._id || filteredItem?.id);
                });
                return isSame ? prev : filtered;
            });
        }
    }, []);

    const handleSaveSelection = useCallback(() => {
        if (selectedRows.length === 0) {

            return;
        }

        // Format display values from selected data
        const displayValues = selectedRows.map(item => {
            const { toBook, abstractNote } = item;
            const maxLength = 25; // Keep it shorter if multiple items are selected
            const truncatedNote = abstractNote && abstractNote.length > maxLength
                ? `${abstractNote.substring(0, maxLength)}...`
                : abstractNote;

            return toBook && abstractNote
                ? `${toBook} - ${truncatedNote}`
                : toBook || abstractNote || "";
        });

        setSelectValue({
            value: displayValues.join('; '),
            data: selectedRows
        });

        // Close dialog after saving
        setOpenDialog(false);
    }, [selectedRows]);

    React.useEffect(() => {
        if (setValueChange) {
            const data = selectValue?.data;
            if (Array.isArray(data) && data.length > 0) {
                const summaries = data.map(item => item.documentId).filter(Boolean);
                setValueChange(summaries);
            } else if (data && !Array.isArray(data)) {
                setValueChange(data.documentId ? [data.documentId] : []);
            } else {
                setValueChange([]);
            }
        }
    }, [selectValue, setValueChange]);

    // Memoize selection to prevent unnecessary re-renders when scrolling
    const memoizedSelection = useMemo(() => selectedRows, [selectedRows]);

    return (
        <>
            <StyledGridContainer container spacing={1}>
                <StyledInputGrid item>
                    <StyledCustomInput
                        label={label}
                        value={selectValue?.data?.length > 0 ? ' ' : ''}

                        autoHeight
                        InputProps={{
                            readOnly: true,
                            style: {
                                cursor: 'pointer'
                            },
                            startAdornment: selectValue?.data?.length > 0 ? (
                                <WrapChipContainer>
                                    {selectValue.data.map((item) => (
                                        <RecordChip
                                            key={item._id || item.id}
                                            item={item}
                                            label={getChipLabel(item)}
                                            fullLabel={getFullChipLabel(item)}
                                            onDelete={handleDeleteChip}
                                        />
                                    ))}
                                </WrapChipContainer>
                            ) : (
                                selectValue?.value ? <DescriptionIcon /> : null
                            ),
                            endAdornment: selectValue?.data?.length ? (
                                <ClearableInputAdornment>
                                    <SkyIconButton size="small" onClick={handleClick} edge="end">
                                        ✖
                                    </SkyIconButton>
                                </ClearableInputAdornment>
                            ) : null
                        }}
                    />
                </StyledInputGrid>
                <StyledButtonGrid item>
                    <CustomButton
                        variant="contained"
                        onClick={handleOpenDialog}
                    >
                        TÌM KIẾM
                    </CustomButton>
                </StyledButtonGrid>
            </StyledGridContainer>
            <StyleDialog
                open={openDialog}
                onClose={handleCloseDialog}

            >
                <StyledDialogContentNoScrollbar>
                    <StyledDialogHeaderWrapper><StyledTitleText component="span">Chọn văn bản nguồn</StyledTitleText></StyledDialogHeaderWrapper>
                    {useMemo(() => (
                        <CustomTable
                            columns={columns}
                            fetchData={fetchDataTable}
                            selection={memoizedSelection}
                            onSelectionChange={handleSelectRows}
                            loading={isLoadingTable}
                            disableAdd
                            disableAct
                            filtersAdvanced
                            noneTitle
                            disableDeletePQ
                            filter={filter}
                            disableDelete
                            disableSynchronize
                            advancedFilterConfig={advancedFilterConfig}
                            docTypeOptions={docTypeOptions}
                            statusOptions={statusOptions}
                            customMaxHeight={isMobileOrTablet ? 450 : 370}
                            selectionReturns="object"
														encodeHtml
                        />
                    ), [
                        fetchDataTable,
                        memoizedSelection,
                        handleSelectRows,
                        isLoadingTable,
                        isMobileOrTablet,
                        docTypeOptions
                    ])}
                </StyledDialogContentNoScrollbar>
                <StyledDialogActions>
                    <CustomButton variant="primary" onClick={handleSaveSelection}>
                        LƯU
                    </CustomButton>
                    <CustomButton variant="error" onClick={handleCloseDialog}>
                        ĐÓNG
                    </CustomButton>
                </StyledDialogActions>
            </StyleDialog>

        </>
    );
};

SearchPopup.displayName = "SearchPopup";

export default memo(SearchPopup)