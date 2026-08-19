import React from 'react';
import {

    styled,

} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { CustomDialog } from '@components/CustomDialog';
import {
    SkyBox,
    SkyIconButton,
    SkyTableContainer,
    SkyTable,
    SkyTableHead,
    SkyTableBody,
    SkyTableRow,
    SkyTableCell
} from '@styles/SkyStyles';

const StyledTableContainer = styled(SkyTableContainer)(({ theme }) => ({
    marginTop: theme.spacing(2),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: '4px',
}));

const StyledTableHead = styled(SkyTableHead)(({ theme }) => ({
    backgroundColor: theme.palette.action.hover,
    '& .MuiTableCell-root': {
        fontWeight: 'bold',
    }
}));

const StyledBox = styled(SkyBox)(({ theme }) => ({
    marginBottom: theme.spacing(2),
}));

const StyledTableCellSTT = styled(SkyTableCell)(() => ({
    width: "60px",
}));

const StyledTableCellActionHeader = styled(SkyTableCell)(() => ({
    width: "170px",
}));

const StyledIconButton = styled(SkyIconButton)(({ theme }) => ({
    color: theme.palette.error.main,
}));

const StyledDeleteIcon = styled(DeleteIcon)(({ theme }) => ({
    fontSize: theme.typography.pxToRem(20),
}));

const DeleteDelegationDialog = ({ open, onClose, onConfirm, items, onDeleteItem }) => {

    const handleDeleteClick = (id) => () => {
        onDeleteItem(id);
    };

    return (
        <CustomDialog
            open={open}
            onClose={onClose}
            onSave={onConfirm}
            title="Thông báo"
            titleButton="Xác nhận"
            cancelButtonText="Hủy"
            size="md"
            type="add"
        >
            <StyledBox>
                <StyledTableContainer>
                    <SkyTable size="small">
                        <StyledTableHead>
                            <SkyTableRow>
                                <StyledTableCellSTT align="center">STT</StyledTableCellSTT>
                                <SkyTableCell>Tên người được uỷ quyền</SkyTableCell>
                                <StyledTableCellActionHeader align="center">Hành động</StyledTableCellActionHeader>
                            </SkyTableRow>
                        </StyledTableHead>
                        <SkyTableBody>
                            {items && items.map((item, index) => (
                                <SkyTableRow key={item._id || item.id}>
                                    <SkyTableCell align="center">{index + 1}</SkyTableCell>
                                    <SkyTableCell>{item.toUser || item.toUserId?.name}</SkyTableCell>
                                    <SkyTableCell align="center">
                                        <StyledIconButton
                                            size="small"
                                            onClick={handleDeleteClick(item._id || item.id)}
                                        >
                                            <StyledDeleteIcon />
                                        </StyledIconButton>
                                    </SkyTableCell>
                                </SkyTableRow>
                            ))}
                            {(!items || items.length === 0) && (
                                <SkyTableRow>
                                    <SkyTableCell colSpan={3} align="center">
                                        Không có dữ liệu
                                    </SkyTableCell>
                                </SkyTableRow>
                            )}
                        </SkyTableBody>
                    </SkyTable>
                </StyledTableContainer>
            </StyledBox>
        </CustomDialog>
    );
};

export default DeleteDelegationDialog;
