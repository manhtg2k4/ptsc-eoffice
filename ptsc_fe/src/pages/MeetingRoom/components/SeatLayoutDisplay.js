import React, { useMemo } from 'react';
import { styled } from '@mui/material/styles';
import DeleteIcon from '@mui/icons-material/Delete';
import { SkyBox, SkyIconButton, SkyTypography } from '@styles/SkyStyles';

// --- STYLED COMPONENTS ---
const SidebarCard = styled(SkyBox)(({ theme }) => ({
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 2px 4px rgba(0,0,0,0.05)',
    overflow: 'hidden',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '500px', // Giới hạn chiều cao để có scrollbar
    [theme.breakpoints.down('md')]: {
        maxHeight: 'none',
        minHeight: '200px',
    }
}));

const CardHeader = styled(SkyBox)(({ theme }) => ({
    padding: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
}));

const Title = styled(SkyTypography)(({ theme }) => ({
    color: theme.palette.primary.main,
    fontWeight: 700,
    fontSize: '1rem',
    [theme.breakpoints.down('sm')]: {
        fontSize: '0.9rem',
    }
}));

const ListHeader = styled(SkyBox)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'space-between',
    padding: theme.spacing(1, 2),
    backgroundColor: theme.palette.background.paper,
}));



const HeaderLabel = styled(SkyTypography)(({ theme }) => ({
    fontWeight: 600,
    fontSize: '0.85rem',
    color: theme.palette.primary,
}));



const ScrollableList = styled(SkyBox)(({ theme }) => ({
    flex: 1,
    overflowY: 'auto',
    // Tùy chỉnh thanh cuộn
    '&::-webkit-scrollbar': {
        width: '6px',
    },
    '&::-webkit-scrollbar-track': {
        backgroundColor: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
        borderRadius: '10px',
        '&:hover': {
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)',
        },
    },
}));

const ListItemRow = styled(SkyBox)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(1.5, 2),
    fontSize: '0.9rem',
    color: theme.palette.text.secondary,
    '&:nth-of-type(odd)': {
        backgroundColor: theme.palette.table?.rowEven || theme.palette.action.hover,
    },
    '&:nth-of-type(even)': {
        backgroundColor: theme.palette.background.paper,
    },
}));

const ColName = styled(SkyBox)(({ theme }) => ({
    flex: 1,
    paddingRight: theme.spacing(1),
    overflow: 'hidden',
}));

const ColQuantity = styled(SkyBox)(() => ({
    width: '90px',
    textAlign: 'center',
}));

const ColAction = styled(SkyBox)(() => ({
    width: '90px',
    textAlign: 'center',
    display: 'flex',
    justifyContent: 'center',
}));

const QuantityTypography = styled(SkyTypography)(() => ({
    fontWeight: 500,
}));

const StyledDeleteIcon = styled(DeleteIcon)(() => ({
    fontSize: '1.25rem', // small equivalent
}));

const CardFooter = styled(SkyBox)(({ theme }) => ({
    padding: theme.spacing(2),
    borderTop: `1px solid ${theme.palette.divider}`,
    textAlign: 'right',
    backgroundColor: theme.palette.background.paper,
}));

const CenterBox = styled(SkyBox)(({ theme }) => ({
    padding: theme.spacing(2),
    textAlign: 'center',
}));

const SecondaryTypography = styled(SkyTypography)(({ theme }) => ({
    color: theme.palette.text.secondary,
}));

// --- NEW STYLED COMPONENTS ---
const DeviceNameTypography = styled(SkyTypography)(() => ({
    fontWeight: 500,
}));

const StyledIconButton = styled(SkyIconButton)(({ theme }) => ({
    color: theme.palette.text.primary,
}));

const SeatLayoutDisplay = ({ amenityOptions = [], fields, onRemoveEquipment }) => {
    // fields prop comes from useFieldArray in parent
    // onRemoveEquipment is removal function

    // Tính tổng số lượng thiết bị
    const totalQuantity = useMemo(() => {
        return (fields || []).reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
    }, [fields]);

    return (
        <SidebarCard>
            {/* Tiêu đề */}
            <CardHeader>
                <Title>Tiện ích phòng</Title>
            </CardHeader>

            {/* Header cột */}
            <ListHeader>
                <ColName>
                    <HeaderLabel>Tên thiết bị</HeaderLabel>
                </ColName>
                <ColQuantity>
                    <HeaderLabel>Số lượng</HeaderLabel>
                </ColQuantity>
                <ColAction>
                    <HeaderLabel>Hành động</HeaderLabel>
                </ColAction>
            </ListHeader>

            {/* Danh sách cuộn */}
            <ScrollableList>
                {fields && fields.length > 0 ? (
                    fields.map((item, index) => {
                         // Find the label in amenityOptions based on the ID stored in item.name
                         const matchedOption = amenityOptions.find(opt => opt.value === item.name);
                         const displayName = matchedOption ? matchedOption.label : item.name;

                         return (
                            <ListItemRow key={item.id}>
                                <ColName>
                                    <DeviceNameTypography variant="body2" noWrap title={displayName}>
                                        {displayName || 'Thiết bị chưa chọn'}
                                    </DeviceNameTypography>
                                </ColName>
                                
                                <ColQuantity>
                                    <QuantityTypography variant="body2">
                                        {item.quantity}
                                    </QuantityTypography>
                                </ColQuantity>

                                <ColAction>
                                    <EquipmentItemDeleteButton 
                                        index={index} 
                                        onRemove={onRemoveEquipment} 
                                    />
                                </ColAction>
                            </ListItemRow>
                         );
                    })
                ) : (
                    <CenterBox>
                        <SecondaryTypography variant="body2">
                            Chưa có thiết bị nào
                        </SecondaryTypography>
                    </CenterBox>
                )}
            </ScrollableList>

            {/* Footer tổng kết */}
            <CardFooter>
                <SecondaryTypography variant="body2">
                    Tổng: {totalQuantity} thiết bị
                </SecondaryTypography>
            </CardFooter>
        </SidebarCard>
    );
};

// Helper component to avoid inline arrow function
const EquipmentItemDeleteButton = React.memo(({ index, onRemove }) => {
    const handleClick = React.useCallback(() => {
        if (onRemove) {
            onRemove(index);
        }
    }, [index, onRemove]);

    return (
        <StyledIconButton 
            size="small" 
            onClick={handleClick}
        >
            <StyledDeleteIcon />
        </StyledIconButton>
    );
});

EquipmentItemDeleteButton.displayName = 'EquipmentItemDeleteButton';

export default SeatLayoutDisplay;