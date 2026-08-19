import { CustomDialog } from '@components/CustomDialog';
import React, { useState, useCallback, useEffect } from 'react';
import { Add, Delete } from '@mui/icons-material';
import { styled } from "@mui/material/styles";
import { useWatch } from 'react-hook-form';
import {
    SkyTableContainer,
    SkyTable,
    SkyTableHead,
    SkyTableBody,
    SkyTableRow,
    SkyTextField,
    SkyIconButton,
    SkyButton,
    SkyTableCell,
    SkyBox,
    SkyStack,
} from "@styles/SkyStyles";

const NarrowTableCell = styled(SkyTableCell)(() => ({
    width: '60px',
    padding: '12px',
}));

const ActionTableCell = styled(SkyTableCell)(() => ({
    width: '100px',
    padding: '12px',
}));

const StandardTableCell = styled(SkyTableCell)(() => ({
    padding: '12px',
}));

const DeleteButton = styled(SkyIconButton)(({ theme }) => ({
    color: theme.palette.error.main,
    '&:hover': {
        backgroundColor: theme.palette.error.light,
    },
}));

const PopupTableConfig = (props) => {

    const { open, onClose, title, data, initialData, control, fieldName } = props;

    // Use useWatch to monitor form field value if control and fieldName are provided
    // Always call the hook, but it will return undefined if control is null
    const watchedTableConfig = useWatch({ 
        control: control || undefined, 
        name: fieldName || '', 
        disabled: !control || !fieldName 
    });

    const [rows, setRows] = useState(
        initialData && initialData.length > 0 
            ? initialData 
            : [{ id: Date.now(), name: '', code: '' }]
    );

    // Update rows when dialog opens and there's data from useWatch or initialData
    useEffect(() => {
        if (open) {
            const dataSource = watchedTableConfig || initialData;
            if (dataSource && Array.isArray(dataSource) && dataSource.length > 0) {
                setRows(dataSource);
            } else {
                setRows([{ id: Date.now(), name: '', code: '' }]);
            }
        }
    }, [open, watchedTableConfig, initialData]);


    const handleAddRow = useCallback(() => {
        const newRow = {
            id: Date.now(),
            name: '',
            code: ''
        };
        setRows(prevRows => [...prevRows, newRow]);


    }, []);

    const handleDeleteRow = useCallback((id) => {
        setRows(prevRows => prevRows.filter(row => row.id !== id));
    }, []);

    const handleChangeRow = useCallback((id, field, value) => {
        setRows(prevRows => prevRows.map(row =>
            row.id === id ? { ...row, [field]: value } : row
        ));
    }, []);

    const handleClose = useCallback(() => {
        onClose();
        setRows([{ id: Date.now(), name: '', code: '' }]);
    }, [onClose]);

    const handleSave = useCallback(() => {
        data(rows);
        onClose();
    }, [data, onClose, rows]);

    return (
        <CustomDialog open={open} onSave={handleSave} onClose={handleClose} title={title || "Cấu hình bảng"}>
            <SkyBox>
                <SkyStack spacing={2}>
                    <SkyTableContainer>
                        <SkyTable>
                            <SkyTableHead>
                                <SkyTableRow>
                                    <NarrowTableCell>STT</NarrowTableCell>
                                    <StandardTableCell>Tên *</StandardTableCell>
                                    <StandardTableCell>Mã *</StandardTableCell>
                                    <ActionTableCell>Thao tác</ActionTableCell>
                                </SkyTableRow>
                            </SkyTableHead>
                            <SkyTableBody>
                                {rows.map((row, index) => {
                                    const handleNameChange = (e) => handleChangeRow(row.id, 'name', e.target.value);
                                    const handleCodeChange = (e) => handleChangeRow(row.id, 'code', e.target.value);
                                    const handleDelete = () => handleDeleteRow(row.id);

                                    return (
                                        <SkyTableRow key={row.id}>
                                            <StandardTableCell>{index + 1}</StandardTableCell>
                                            <StandardTableCell>
                                                <SkyTextField
                                                    fullWidth
                                                    size="small"
                                                    value={row.name}
                                                    onChange={handleNameChange}

                                                />
                                            </StandardTableCell>
                                            <StandardTableCell>
                                                <SkyTextField
                                                    fullWidth
                                                    size="small"
                                                    value={row.code}
                                                    onChange={handleCodeChange}

                                                />
                                            </StandardTableCell>
                                            <StandardTableCell>
                                                <DeleteButton
                                                    size="small"
                                                    onClick={handleDelete}
                                                    disabled={rows.length === 1}
                                                >
                                                    <Delete />
                                                </DeleteButton>
                                            </StandardTableCell>
                                        </SkyTableRow>
                                    );
                                })}
                            </SkyTableBody>
                        </SkyTable>
                    </SkyTableContainer>
                    <SkyBox>
                        <SkyButton
                            variant="outlined"
                            startIcon={<Add />}
                            onClick={handleAddRow}
                        >
                            Thêm dòng
                        </SkyButton>
                    </SkyBox>
                </SkyStack>
            </SkyBox>
        </CustomDialog>
    )
}

export default PopupTableConfig