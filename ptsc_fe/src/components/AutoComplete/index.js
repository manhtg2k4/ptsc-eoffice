import CustomInput from '@components/CustomInput/CustomInputBase'
import { SkyAutocomplete, SkyChip, SkyBox, SkyTypography } from '@styles/SkyStyles'
import React, { useCallback, useState, memo } from 'react'
import { Tooltip, styled } from '@mui/material'
import CustomDialog from '@components/CustomDialog/CustomDialog'

const StyledLimitBadge = styled(SkyBox)(() => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "26px",
    height: "26px",
    borderRadius: "50%",
    backgroundColor: "#4f5d75", // Slate gray color resembling Image 3
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "bold",
    cursor: "pointer",
    marginLeft: "6px",
    marginRight: "4px",
    userSelect: "none",
    transition: "all 0.2s ease-in-out",
    boxShadow: "0px 2px 4px rgba(0,0,0,0.15)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    "&:hover": {
        backgroundColor: "#2c3e50",
        transform: "scale(1.08)",
    },
}));

const DialogContentWrapper = styled(SkyBox)({
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    padding: "10px 0",
    maxHeight: "400px",
    overflowY: "auto",
});

const DialogContentItem = styled(SkyBox)(({ theme }) => ({
    display: "flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: "6px",
    backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#f8fafc",
    border: "1px solid",
    borderColor: theme.palette.mode === "dark" ? "#334155" : "#e2e8f0",
}));

const DialogItemText = styled(SkyTypography)({
    fontSize: "14px",
    fontWeight: 500,
});

const StyledDeleteIconButton = styled("div")(({ theme }) => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    color: theme.palette.mode === "dark" ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.38)",
    cursor: "pointer",
    marginLeft: "auto", // Align to the far right
    transition: "all 0.2s ease",
    "&:hover": {
        backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.06)",
        color: theme.palette.error.main || "#ef4444",
    },
}));

const StyledExpandedChip = styled(SkyChip, {
    shouldForwardProp: (prop) => prop !== 'isExpanded' && prop !== 'disabled',
})(({ theme, isExpanded, disabled }) => ({
    height: isExpanded ? 'auto' : '24px',
    borderRadius: theme.shape.borderRadius,
    ...(disabled && {
        backgroundColor:
            theme.components?.MuiOutlinedInput?.styleOverrides?.root?.[
                "&.Mui-disabled"
            ]?.backgroundColor ||
            (theme.palette.mode === "dark" ? "#334155" : "#F5F7FA"),
        color:
            theme.components?.MuiOutlinedInput?.styleOverrides?.input?.[
                "&.Mui-disabled"
            ]?.color ||
            (theme.palette.mode === "dark" ? "#94a3b8" : "#757575"),
        "& .MuiChip-label": {
            color: 'inherit',
        },
        "& .MuiChip-deleteIcon": {
            color: 'inherit',
            opacity: 0.7,
        }
    }),
    '& .MuiChip-label': {
        whiteSpace: isExpanded ? 'normal' : 'nowrap',
        display: isExpanded ? 'block' : 'inline-block',
    },
}));

const StyledSkyAutocomplete = styled(SkyAutocomplete)(() => ({
    '& .MuiOutlinedInput-root': {
        paddingRight: '6px !important',
    },
}));

const DialogItem = memo(({ option, disabled, onDelete }) => {
    const fullLabel = typeof option === 'string' ? option : (option?.name || option?.label || "");
    const optionId = typeof option === 'string' ? option : (option?._id || option?.id);

    const handleDelete = useCallback((e) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        onDelete(option);
    }, [option, onDelete]);

    return (
        <DialogContentItem key={optionId}>
            <DialogItemText>{fullLabel}</DialogItemText>
            {!disabled && (
                <StyledDeleteIconButton onClick={handleDelete}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M2 2L10 10M10 2L2 10" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </StyledDeleteIconButton>
            )}
        </DialogContentItem>
    );
});

DialogItem.displayName = "DialogItem";

const AutoComplete = (props) => {
    const { limitTags, value = [], options, onChange, disabled, label, formLabel, ...rest } = props
    const [openDialog, setOpenDialog] = useState(false);

    const handleOpenDialog = useCallback((e) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        setOpenDialog(true);
    }, []);

    const handleCloseDialog = useCallback(() => {
        setOpenDialog(false);
    }, []);

    const handlePreventDefault = useCallback((e) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
    }, []);

    const handleDeleteItem = useCallback((optionToDelete) => {
        const newValue = value.filter((val) => {
            const valId = typeof val === 'object' ? (val?._id || val?.id) : val;
            const deleteId = typeof optionToDelete === 'object' ? (optionToDelete?._id || optionToDelete?.id) : optionToDelete;
            return valId !== deleteId;
        });
        onChange(null, newValue);
        const maxToShow = Number(limitTags) || 3;
        if (newValue.length <= maxToShow) {
            setOpenDialog(false);
        }
    }, [value, onChange, limitTags]);

    const renderTags = useCallback(
        (selected, getTagProps) => {
            const maxToShow = Number(limitTags) || 3;
            const displayTags = selected?.slice(0, maxToShow) || [];
            const hiddenTags = selected?.slice(maxToShow) || [];

            const renderedChips = displayTags.map((option, index) => {
                const fullLabel = typeof option === 'string' ? option : (option?.name || option?.label || "");
                const isTruncated = fullLabel?.length > 15;
                const displayLabel = isTruncated ? `${fullLabel?.substring(0, 15)}...` : fullLabel;

                const { onDelete, ...chipProps } = getTagProps({ index });
                const chipItem = (
                    <StyledExpandedChip
                        {...chipProps}
                        onDelete={disabled ? undefined : onDelete}
                        label={displayLabel}
                        size="small"
                        isExpanded={false}
                        disabled={disabled}
                    />
                );

                return isTruncated ? (
                    <Tooltip key={chipProps.key} title={fullLabel} arrow>
                        <span>{chipItem}</span>
                    </Tooltip>
                ) : chipItem;
            });

            if (hiddenTags.length > 0) {
                renderedChips.push(
                    <StyledLimitBadge
                        key="limit-badge"
                        onClick={handleOpenDialog}
                        onMouseDown={handlePreventDefault}
                    >
                        +{hiddenTags.length}
                    </StyledLimitBadge>
                );
            }

            return renderedChips;
        },
        [limitTags, disabled, handleOpenDialog, handlePreventDefault]
    );

    return (
        <>
            <StyledSkyAutocomplete
                multiple={props.multiple}
                // Disable MUI's internal limiting to handle it manually in renderTags
                limitTags={undefined}
                onChange={onChange}
                disabled={disabled}
                value={value}
                options={options}
                getOptionLabel={(option) => typeof option === 'string' ? option : (option?.name || option?.label || "")}
                renderInput={params => (
                    <CustomInput
                        {...params}
                        label={label}
                        InputLabelProps={{ shrink: true }}
                        InputProps={{ ...params.InputProps, readOnly: true }}
                    />
                )}
                renderTags={props.multiple ? renderTags : undefined}
                componentsProps={{ popupIndicator: { sx: { display: 'none' } } }}
                {...rest}
            />
            {props.multiple && (
                <CustomDialog
                    open={openDialog}
                    onClose={handleCloseDialog}
                    title={formLabel || label}
                    size="xs"
                    disableSave
                >
                    <DialogContentWrapper>
                        {value && value.map((option, idx) => (
                            <DialogItem
                                key={typeof option === 'string' ? option : (option?._id || option?.id || idx)}
                                option={option}
                                disabled={disabled}
                                onDelete={handleDeleteItem}
                            />
                        ))}
                    </DialogContentWrapper>
                </CustomDialog>
            )}
        </>
    )
}

export default AutoComplete
