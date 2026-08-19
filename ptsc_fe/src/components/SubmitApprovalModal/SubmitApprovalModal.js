import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    Box,
    Typography,
    TextField,
    IconButton,
    Checkbox,
    styled,
    Popover,
    Divider,
    MenuItem,
    CircularProgress,
} from '@mui/material';
import {
    Search,
    FilterAlt,
} from '@mui/icons-material';
import { 
    SaveButton, 
    CancelButton 
} from "@styles/CustomDialog.styles";
import { CustomDialog } from '@components/CustomDialog';
import axiosInstance from '@utils/axiosInstance';
import { API_GET_USERS_IN_FLOW, APP_BASE } from '@EnvironmentFile/constants/urlConfig';
import { useToast } from "@components/common/ToastProvider";
import { SkyBox, SkyTypography } from '@styles/SkyStyles';

const ModalTitle = styled(Typography)(({ theme }) => ({
    color: theme.palette.primary.main,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    fontSize: '1.25rem',
}));

// --- Styled Components ---

const SearchWrapper = styled(Box)(({ theme }) => ({
    marginBottom: theme.spacing(2),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'end',
}));

const SearchInput = styled(TextField)(({ theme }) => ({
    backgroundColor: theme.palette.background.paper,
    maxWidth: '50%',
    borderRadius: 6,
    '& .MuiOutlinedInput-root': {
        paddingRight: 0,
        borderRadius: 6,
        '& fieldset': {
            borderColor: theme.palette.grey[300],
        },
        '&:hover fieldset': {
            borderColor: theme.palette.grey[400],
        },
        '&.Mui-focused fieldset': {
            borderColor: theme.palette.primary.main,
            borderWidth: 1,
        },
    },
    [theme.breakpoints.down('sm')]: {
        maxWidth: '100%',
    },
}));

const FilterButton = styled(IconButton)(() => ({
    padding: 6,
    borderRadius: 4,
}));

const SearchActionButton = styled(IconButton)(({ theme }) => ({
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.common.white,
    borderRadius: '0 6px 6px 0',
    padding: '8px 12px',
    height: '100%',
    marginLeft: 0,
    '&:hover': {
        backgroundColor: theme.palette.primary.dark,
    },
}));

const StyledInputAdornmentBox = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    height: '100%',
    borderLeft: `1px solid ${theme.palette.divider}`,
}));

const ListHeader = styled(Typography)(({ theme }) => ({
    fontWeight: 'bold',
    marginBottom: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    paddingTop: theme.spacing(1),
    borderBottom: `1px solid ${theme.palette.divider}`,
}));

const ListItem = styled(Box)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: `1px solid ${theme.palette.divider}`,
    gap: theme.spacing(2),
}));

const StyledPopover = styled(Popover)(({ theme }) => ({
    '& .MuiPaper-root': {
        marginTop: theme.spacing(1),
        padding: theme.spacing(3),
        width: 450,
        maxWidth: '100%',
        borderRadius: 12,
        boxShadow: theme.shadows[4],
        [theme.breakpoints.down('sm')]: {
            width: 'calc(100vw - 32px)',
            padding: theme.spacing(2),
        },
    },
}));

const PopupHeader = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
}));

const FilterTitle = styled(Typography)(({ theme }) => ({
    fontWeight: 'bold',
    marginRight: theme.spacing(1),
}));

const PopupContent = styled(Box)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
}));

const FieldLabel = styled(Typography)(({ theme }) => ({
    fontWeight: 'bold',
    marginBottom: theme.spacing(1),
}));

const PopupFooter = styled(Box)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: theme.spacing(4),
    [theme.breakpoints.down('sm')]: {
        flexDirection: 'column-reverse',
        gap: theme.spacing(2),
    },
}));

const FooterRightGroup = styled(Box)(({ theme }) => ({
    display: 'flex',
    gap: theme.spacing(1),
    [theme.breakpoints.down('sm')]: {
        justifyContent: 'flex-end',
        width: '100%',
    },
}));

const BlueFilterIcon = styled(FilterAlt)(({ theme }) => ({
    color: theme.palette.primary.main,
}));

const PopupDivider = styled(Divider)(({ theme }) => ({
    marginBottom: theme.spacing(2),
}));

const GraySearchIcon = styled(Search)(({ theme }) => ({
    color: theme.palette.action.active,
    marginRight: '8px',
    fontSize: '1.25rem',
}));

const GraySpan = styled('span')(({ theme }) => ({
    color: theme.palette.text.secondary,
}));

const PaddingBox = styled(Box)(() => ({
    padding: '0 25px',
}));

const StyledFilterIcon = styled(FilterAlt)(() => ({
    fontSize: '1.25rem',
}));

const StyledSearchIcon = styled(Search)(() => ({
    fontSize: '1.25rem',
}));

const CustomResetButton = styled(CancelButton)(() => ({
    backgroundColor: 'transparent', 
    color: 'inherit', 
    borderColor: '#ccc',
    border: '1px solid #ccc',
    '&:hover': {
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
        borderColor: '#999',
    }
}));

const StyledLoadingContainer = styled(SkyBox)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'center',
    padding: theme.spacing(3),
}));

const StyledEmptyStateText = styled(SkyTypography)(({ theme }) => ({
    textAlign: 'center',
    padding: theme.spacing(2),
    color: theme.palette.text.secondary,
}));

// --- Component ---

const SubmitApprovalModal = ({ open, onClose, onConfirmWithAssignee, onSubmit, documentId, actionCode, workItem, flowConfig }) => {
    const [searchText, setSearchText] = useState('');
    const [selected, setSelected] = useState([]);
    const [approvers, setApprovers] = useState([]);
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    // Filter Popup State
    const [filterAnchorEl, setFilterAnchorEl] = useState(null);
    const openFilter = Boolean(filterAnchorEl);

    useEffect(() => {
        const fetchApprovers = async () => {
            if (open) {
                setLoading(true);
                try {
                    const response = await axiosInstance.get(`${API_GET_USERS_IN_FLOW}?roles=CHANH_VAN_PHONG`);
                    setApprovers(response || []);
                } catch (error) {
                    // console.error("Failed to fetch approvers:", error);
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchApprovers();
    }, [open]);

    const handleChangeSearch = useCallback((e) => {
        setSearchText(e.target.value);
    }, []);

    const handleFilterClick = useCallback((event) => {
        setFilterAnchorEl(event.currentTarget);
    }, []);

    const handleFilterClose = useCallback(() => {
        setFilterAnchorEl(null);
    }, []);

    const handleToggleSelect = useCallback((event) => {
        const id = event.target.value;
        setSelected(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    }, []);

    const handleSubmitApproval = useCallback(async () => {
        if (selected.length === 0) return;

        if (onConfirmWithAssignee) {
            await onConfirmWithAssignee(selected[0]);
            return;
        }

        try {
            setLoading(true);
            const payload = {
                actionCode: actionCode || "CHP_PHE_DUYET_HHS",
                assigneeUserId: selected[0],
                workItem: workItem,
                flowConfig: flowConfig
            };
            await axiosInstance.post(`${APP_BASE}/api/destroy-records/${documentId}/leaders-destroy-records`, payload);
            toast("Trình phê duyệt thành công", "success");
            if (onSubmit) {
                onSubmit(selected);
            }
            onClose();
        } catch (error) {
            toast(error?.response?.data?.message || error?.message || "Lỗi khi trình phê duyệt", "error");
        } finally {
            setLoading(false);
        }
    }, [selected, documentId, onSubmit, onConfirmWithAssignee, onClose, toast, actionCode, workItem, flowConfig]);

    const handleResetFilter = useCallback(() => {
        // Reset logic here
    }, []);

    const filteredApprovers = useMemo(() => {
        if (!searchText) return approvers;
        return approvers.filter(approver =>
            approver.name.toLowerCase().includes(searchText.toLowerCase())
        );
    }, [approvers, searchText]);

    return (
        <CustomDialog
            open={open}
            onClose={onClose}
            size="md"
            titleButton="TRÌNH PHÊ DUYỆT"
            cancelButtonText="ĐÓNG"
            onSave={handleSubmitApproval}
            disableSave={selected.length === 0}
            customTitleContent={
                <SkyBox p={2} pl={3}>
                    <ModalTitle>
                        TRÌNH PHÊ DUYỆT
                    </ModalTitle>
                </SkyBox>
            }
        >
            <Box p={3}>
                <SearchWrapper>
                    <SearchInput
                        fullWidth
                        size="small"
                        placeholder="Tìm kiếm..."
                        value={searchText}
                        onChange={handleChangeSearch}
                        InputProps={{
                            endAdornment: (
                                <StyledInputAdornmentBox>
                                    <FilterButton size="small" onClick={handleFilterClick}>
                                        <StyledFilterIcon />
                                    </FilterButton>
                                    <SearchActionButton size="small">
                                        <StyledSearchIcon />
                                    </SearchActionButton>
                                </StyledInputAdornmentBox>
                            ),
                        }}
                    />
                </SearchWrapper>

                <StyledPopover
                    open={openFilter}
                    anchorEl={filterAnchorEl}
                    onClose={handleFilterClose}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'right',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                    }}
                >
                    <Box>
                        <PopupHeader>
                            <FilterTitle variant="h6">Bộ lọc</FilterTitle>
                            <BlueFilterIcon />
                        </PopupHeader>
                        <PopupDivider />

                        <PopupContent>
                            <Box>
                                <FieldLabel variant="subtitle2">Tìm kiếm</FieldLabel>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Tìm kiếm..."
                                    variant="outlined"
                                    InputProps={{
                                        startAdornment: <GraySearchIcon />
                                    }}
                                />
                            </Box>

                            <Box>
                                <FieldLabel variant="subtitle2">Chức vụ</FieldLabel>
                                <TextField
                                    select
                                    fullWidth
                                    size="small"
                                    defaultValue=""
                                    SelectProps={{ displayEmpty: true }}
                                >
                                    <MenuItem value="">
                                        <GraySpan>Tất cả chức vụ</GraySpan>
                                    </MenuItem>
                                    <MenuItem value="Chỉ huy">Chỉ huy</MenuItem>
                                    <MenuItem value="Phó chỉ huy">Phó chỉ huy</MenuItem>
                                </TextField>
                            </Box>
                        </PopupContent>

                        <PopupFooter>
                            <CustomResetButton 
                                variant="outlined" 
                                size="medium" 
                                onClick={handleResetFilter}
                            >
                                Đặt lại
                            </CustomResetButton>
                            <FooterRightGroup>
                                <CancelButton variant="outlined" onClick={handleFilterClose}>
                                    Hủy
                                </CancelButton>
                                <SaveButton variant="contained" onClick={handleFilterClose}>
                                    Áp dụng lọc
                                </SaveButton>
                            </FooterRightGroup>
                        </PopupFooter>
                    </Box>
                </StyledPopover>

                <PaddingBox>
                    <ListHeader variant="subtitle1">
                        Tên chỉ huy văn phòng
                    </ListHeader>

                    {loading ? (
                        <StyledLoadingContainer>
                            <CircularProgress size={24} />
                        </StyledLoadingContainer>
                    ) : filteredApprovers.length > 0 ? (
                        filteredApprovers.map(approver => (
                            <ListItem key={approver._id}>
                                <Typography>{approver.name}</Typography>
                                <Checkbox
                                    checked={selected.includes(approver._id)}
                                    onChange={handleToggleSelect}
                                    value={approver._id}
                                />
                            </ListItem>
                        ))
                    ) : (
                        <StyledEmptyStateText>
                            Không tìm thấy nhân sự phù hợp
                        </StyledEmptyStateText>
                    )}
                </PaddingBox>
            </Box>
        </CustomDialog>
    );
};

export default SubmitApprovalModal;
