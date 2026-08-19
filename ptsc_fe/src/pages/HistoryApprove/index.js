import { useToast } from '@components/common/ToastProvider'
import CustomTable from '@components/CustomTable/CustomTableStatic'
import LoadingDialog from '@components/LoadingDialog'
import Swipper from '@components/Swipper'
import { APP_BASE } from '@EnvironmentFile/constants/urlConfig'
import api from '@services/api'
import React, { useCallback } from 'react'
import { advancedFilterConfig, columns, filter } from './constants'
import { styled, useMediaQuery, useTheme } from '@mui/material'
import { SkyBox, SkyTypography } from '@styles/SkyStyles'
import { CustomDialog } from "@components/CustomDialog";
import CustomInput from "@components/CustomInput/CustomInputBase";


const BoxContainer = styled(SkyBox)(() => ({
    height: '100%',
    overflow: 'auto',
    scrollbarWidth: 'none', // For Firefox
    msOverflowStyle: 'none', // For IE and Edge
    '&::-webkit-scrollbar': {
        display: 'none' // For Chrome, Safari, Opera
    }
}));

const StyleSkyTypography = styled(SkyTypography)(() => ({
    color: '#0062AD',
    cursor: 'pointer',
     
}));

const RejectionReasonDialog = React.memo(({ open, onClose, reason }) => (
    <CustomDialog open={open} onClose={onClose} title={'Lý do từ chối'}  disableSave>
        <CustomInput
            label="Lý do từ chối"
            value={reason}
            disabled
            multiline
            rows={2}
        />
    </CustomDialog>
));
RejectionReasonDialog.displayName = 'RejectionReasonDialog';

const NameCell = ({ row, onOpenReason }) => {
    const isRejected = row.nextAuditActionCode === "TU_CHOI_PHE_DUYET" || row.nextAuditActionCode === "TU_CHOI";

    const handleClick = useCallback((e) => {
        e.stopPropagation();
        onOpenReason(row.rejectionReason);
    }, [onOpenReason, row.rejectionReason]);

    if (isRejected) {
        return (
            <StyleSkyTypography
                
                onClick={handleClick}
            >
                {row.name}
            </StyleSkyTypography>
        );
    }
    return row.name;
};

const HistoryApprove = (props) => {
    const { open, onClose, title } = props
    const [loading, setLoading] = React.useState(false)
    const [reasonOpen, setReasonOpen] = React.useState(false)
    const [rejectionReason, setRejectionReason] = React.useState('')
    const toast = useToast()
    const theme = useTheme();

    const isMobileOrTablet = useMediaQuery(theme.breakpoints.down("md"));

    const handleOpenReason = useCallback((reason) => {
        setRejectionReason(reason || '')
        setReasonOpen(true)
    }, [])

    const handleCloseReason = () => {
        setReasonOpen(false)
    }

    const enhancedColumns = React.useMemo(() => {
        return columns.map(col => {
            if (col.row === 'name') {
                return {
                    ...col,
                    accessor: (row) => <NameCell row={row} onOpenReason={handleOpenReason} />
                };
            }
            return col;
        });
    }, [handleOpenReason]);


    const getData = useCallback(async (params) => {
        try {
            const response = await api.get(`${APP_BASE}/api/tasks/history`, { params })
            let data = [];
            let total = 0;

            if (response?.data?.data && Array.isArray(response.data.data)) {
                data = response.data.data;
                total = response.data.total || data.length;
            }
            else if (Array.isArray(response)) {
                data = response?.data;
                total = response?.total || data.length;
            }
            else if (response?.data && Array.isArray(response.data)) {
                data = response.data;
                total = response.total || data.length;
            }
            else if (response?.data?.items) {
                data = response.data.items;
                total = response.data.total || data.length;
            }
            else if (response?.items) {
                data = response.items;
                total = response.total || data.length;
            }

            return { data, total };

        } catch (error) {
            toast(
                error?.response?.data?.message || 'Lỗi khi lấy dữ liệu', 'error'
            )
            return { data: [], total: 0 };
        } finally {
            setLoading(false)
        }
    }, [toast])


    return (
        <Swipper open={open} onClose={onClose} title={title || 'Lịch sử hành động phê duyệt'} type="view">
            <BoxContainer>
                <CustomTable
                    advancedFilterConfig={advancedFilterConfig}
                    fetchData={open ? getData : null}
                    columns={enhancedColumns}
                    disableAdd
                    disableAct
                    filtersAdvanced
                    disableDeletePQ
                    filter={filter}
                    disableDelete
                    disableSelectAll
                    disableCheckbox
                    disableSynchronize
                    customMaxHeight={isMobileOrTablet ? 450 : 285}
                // anableSTT

                />
            </BoxContainer>

            <RejectionReasonDialog
                open={reasonOpen}
                onClose={handleCloseReason}
                reason={rejectionReason}
            />

            <LoadingDialog open={loading} >
                Đang tải tài liệu, vui lòng đợi...
            </LoadingDialog>
        </Swipper>
    )
}

export default HistoryApprove