import React, { memo, useCallback, useMemo, useState } from 'react'
import { StyleDialog, StyledTitleText } from "@styles/DialogDirective";
import { StyledDialogContentNoScrollbar, StyledDialogHeaderWrapper } from "@styles/RecordDestruction/RecordDestruction.styles";
import StyledCustomInputBase from "@components/CustomInput/CustomInputBase";
import CustomButton from "@components/CustomButton";
import { StyledDialogActions } from "@styles/CustomDialog.styles";
import { SkyChip, SkyGrid, SkyIconButton, SkyTooltip } from '@styles/SkyStyles';
import { ClearableInputAdornment, ChipContainer } from '@styles/CustomInput.styles';
import DescriptionIcon from "@mui/icons-material/Description";
import api from '@services/api';
import { useMediaQuery, useTheme, styled } from '@mui/material';
import {   advancedFilterConfigSourceMeeting, columnAddJobToMeeting, filterMeeting, statusOptions } from '@pages/WorkManagement/components/constants';
import { useSelector } from 'react-redux';
import { API_GET_SOURCE_MEETING } from '@EnvironmentFile/constants/urlConfig';
import CustomTableTreeStatic from '@components/CustomTableTreeStatic';

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



const SearchPopupSourceMeting = (props) => {
    const { label = "Nguồn cuộc họp", setValueChange, initialValue = null } = props;
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
        // Check nếu initialValue là object {meetingId: [], meetingConclusionId: []}
        const hasValidInitialValue = 
            initialValue && 
            typeof initialValue === 'object' && 
            !Array.isArray(initialValue) &&
            (
                (initialValue.meetingId && initialValue.meetingId.length > 0) ||
                (initialValue.meetingConclusionId && initialValue.meetingConclusionId.length > 0)
            );

        if (!isInitialized && hasValidInitialValue) {
            const fetchInitialData = async () => {
                try {
                    // Gộp tất cả IDs để gọi API
                    const allIds = [
                        ...(initialValue.meetingId || []),
                        ...(initialValue.meetingConclusionId || [])
                    ];

                    const response = await api.get(`${API_GET_SOURCE_MEETING}`, {
                        params: { documentIds: allIds.join(',') }
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
                    
                    // Filter data dựa trên type và ID tương ứng
                    const selectedData = data.filter(item => {
                        const itemId = item.id || item._id;
                        
                        if (item.type === "meeting") {
                            return initialValue.meetingId && initialValue.meetingId.includes(itemId);
                        } else if (item.type === "conclusion") {
                            return initialValue.meetingConclusionId && initialValue.meetingConclusionId.includes(itemId);
                        }
                        
                        return false;
                    });

                    if (selectedData.length > 0) {
                        const displayValues = selectedData.map(item => {
                            const maxLength = 50;
                            
                            if (item.type === "meeting") {
                                const label = `${item.title || ''} - ${item.meetingDate || ''}`;
                                return label.length > maxLength ? `${label.substring(0, maxLength)}...` : label;
                            } else if (item.type === "conclusion") {
                                const label = `${item.title || ''} - ${item.meetingName || ''} - ${item.meetingDate || ''}`;
                                return label.length > maxLength ? `${label.substring(0, maxLength)}...` : label;
                            }
                            
                            return item.title || item.id || "";
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
    }, [initialValue, isInitialized]);

    const prevInitialValueRef = React.useRef(initialValue);
    React.useEffect(() => {
        // Check nếu previous value có giá trị
        const prevHadValue = prevInitialValueRef.current && 
            typeof prevInitialValueRef.current === 'object' &&
            !Array.isArray(prevInitialValueRef.current) &&
            (
                (prevInitialValueRef.current.meetingId && prevInitialValueRef.current.meetingId.length > 0) ||
                (prevInitialValueRef.current.meetingConclusionId && prevInitialValueRef.current.meetingConclusionId.length > 0)
            );
            
        // Check nếu current value có giá trị
        const nowHasValue = initialValue &&
            typeof initialValue === 'object' &&
            !Array.isArray(initialValue) &&
            (
                (initialValue.meetingId && initialValue.meetingId.length > 0) ||
                (initialValue.meetingConclusionId && initialValue.meetingConclusionId.length > 0)
            );
            
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
                const maxLength = 50;
                
                if (item.type === "meeting") {
                    const label = `${item.title || ''} - ${item.meetingDate || ''}`;
                    return label.length > maxLength ? `${label.substring(0, maxLength)}...` : label;
                } else if (item.type === "conclusion") {
                    const label = `${item.title || ''} - ${item.meetingName || ''} - ${item.meetingDate || ''}`;
                    return label.length > maxLength ? `${label.substring(0, maxLength)}...` : label;
                }
                
                return item.title || item.id || "";
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
        const maxLength = 50;
        
        if (item.type === "meeting") {
            // Cuộc họp: title + meetingDate
            const label = `${item.title || ''} - ${item.meetingDate || ''}`;
            return label.length > maxLength ? `${label.substring(0, maxLength)}...` : label;
        } else if (item.type === "conclusion") {
            // Kết luận: title + meetingName + meetingDate
            const label = `${item.title || ''} - ${item.meetingName || ''} - ${item.meetingDate || ''}`;
            return label.length > maxLength ? `${label.substring(0, maxLength)}...` : label;
        }
        
        return item.title || item.id || "";
    }, []);


    const getFullChipLabel = (item) => {
        if (item.type === "meeting") {
            // Cuộc họp: title + meetingDate (full, không cắt)
            return `${item.title || ''} - ${item.meetingDate || ''}`;
        } else if (item.type === "conclusion") {
            // Kết luận: title + meetingName + meetingDate (full, không cắt)
            return `${item.title || ''} - ${item.meetingName || ''} - ${item.meetingDate || ''}`;
        }
        
        return item.title || item.id || "";
    };

    const fetchDataTable = useCallback(async (params) => {
        setIsLoadingTable(true);
        try {
            const response = await api.get(`${API_GET_SOURCE_MEETING}`, { params });
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
            const maxLength = 50;
            
            if (item.type === "meeting") {
                const label = `${item.title || ''} - ${item.meetingDate || ''}`;
                return label.length > maxLength ? `${label.substring(0, maxLength)}...` : label;
            } else if (item.type === "conclusion") {
                const label = `${item.title || ''} - ${item.meetingName || ''} - ${item.meetingDate || ''}`;
                return label.length > maxLength ? `${label.substring(0, maxLength)}...` : label;
            }
            
            return item.title || item.id || "";
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
                // Phân loại theo type: meeting và conclusion
                const meetingIds = [];
                const conclusionIds = [];
                
                data.forEach(item => {
                    if (item.type === "meeting") {
                        // Nếu type = "meeting" → lưu vào meetingId
                        const id = item.id || item._id;
                        if (id) meetingIds.push(id);
                    } else if (item.type === "conclusion") {
                        // Nếu type = "conclusion" → lưu vào meetingConclusionId
                        const id = item.id || item._id;
                        if (id) conclusionIds.push(id);
                    }
                });
                
                // Trả về object với 2 mảng
                setValueChange({
                    meetingId: meetingIds,
                    meetingConclusionId: conclusionIds
                });
            } else if (data && !Array.isArray(data)) {
                // Xử lý trường hợp single item (nếu có)
                const result = { meetingId: [], meetingConclusionId: [] };
                if (data.type === "meeting") {
                    const id = data.id || data._id;
                    if (id) result.meetingId.push(id);
                } else if (data.type === "conclusion") {
                    const id = data.id || data._id;
                    if (id) result.meetingConclusionId.push(id);
                }
                setValueChange(result);
            } else {
                // Trả về object rỗng
                setValueChange({ meetingId: [], meetingConclusionId: [] });
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
                    <StyledDialogHeaderWrapper><StyledTitleText component="span">Chọn cuộc họp nguồn </StyledTitleText></StyledDialogHeaderWrapper>
                    {useMemo(() => (
                        <CustomTableTreeStatic
                            columns={columnAddJobToMeeting}
                            fetchData={fetchDataTable}
                            selection={memoizedSelection}
                            onSelectionChange={handleSelectRows}
                            loading={isLoadingTable}
                            disableAdd
                            disableAct
                            filtersAdvanced
                            noneTitle
                            disableDeletePQ
                            filter={filterMeeting}
                            disableDelete
                            disableSynchronize
                            advancedFilterConfig={advancedFilterConfigSourceMeeting}
                            docTypeOptions={docTypeOptions}
                            statusOptions={statusOptions}
                            customMaxHeight={isMobileOrTablet ? 450 : 370}
                            selectionReturns="object"
                            alwaysShowCheckbox
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

SearchPopupSourceMeting.displayName = "SearchPopupSourceMeting";

export default memo(SearchPopupSourceMeting)