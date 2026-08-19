import React, { memo, useState, useCallback } from "react";
import PropTypes from "prop-types";
import { Collapse, Paper, Box, Typography, TableBody, TableHead } from "@mui/material";
import { styled } from "@mui/material/styles";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import {
    StyledTable,
    StyledTableRow,
    StyledTableCell as BaseStyledTableCell,
    StyledTableContainer as BaseStyledTableContainer,
} from "@styles/CustomTable.styles";
import {
    StyledSectionTitle,
    StyledHeaderWrapper,
    StyledHeaderActions,
    StyledCollapseIconButton,
    StyledTitleWithToggle
} from "@styles/RecordDestruction/RecordDestruction.styles";
import { FileIconSvg } from "@assets/icons/FileIconSvg";

// Styled Components - Tương tự RecipientInfoTable
const StyledTableContainer = styled(BaseStyledTableContainer.withComponent(Paper))(({ theme }) => ({
    border: `1px solid ${theme.palette.mode === 'dark' ? theme.palette.divider : '#e2e8f0'}`,
    overflowX: "auto",
    borderRadius: "12px",
    boxShadow: "none",
    overflow: "hidden",
}));

const CollapseHeader = styled(StyledHeaderWrapper)(({ theme }) => ({
    marginBottom: theme.spacing(3.5),
    cursor: "pointer",
    userSelect: "none",
}));

const FullWidthCollapse = styled(Collapse)({
    width: '100%',
});

const CustomTableHead = styled(TableHead)(({ theme }) => ({
    backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#f8fafc",
    "& .MuiTableCell-root": {
        backgroundColor: `${theme.palette.mode === "dark" ? "#1e293b" : "#f8fafc"} !important`,
        color: "#475569",
        fontWeight: 600,
        fontSize: "0.875rem",
        borderBottom: `1px solid ${theme.palette.mode === 'dark' ? theme.palette.divider : '#e2e8f0'}`,
    },
}));

// Header Cell
const StyledTableCell = styled(BaseStyledTableCell)({
    fontWeight: 600,
    whiteSpace: "nowrap",
    padding: "14px 16px",
    textAlign: "left",
    "&[align=center]": { textAlign: "center" },
});

// Body Cell - Text thường (không in đậm)
const BodyCell = styled(BaseStyledTableCell)({
    fontWeight: "normal",
    whiteSpace: "nowrap",
    padding: "14px 16px",
    textAlign: "left",
    color: "#475569",
    "&[align=center]": { textAlign: "center" },
});

// Bold Body Cell - Text in đậm (cho Người xử lý và Ý kiến xử lý)
const BoldBodyCell = styled(BodyCell)({
    fontWeight: 600,
    color: "#1e293b",
});

const WrappingBoldBodyCell = styled(BoldBodyCell)({
    whiteSpace: "normal",
});

// STT Header Cell - Nhỏ gọn, in đậm
const STTHeaderCell = styled(StyledTableCell)({
    width: 80,
    minWidth: 80,
    maxWidth: 80,
    textAlign: "center",
});

// STT Body Cell - Nhỏ gọn, text in đậm như mockup
const STTBodyCell = styled(BodyCell)({
    width: 80,
    minWidth: 80,
    maxWidth: 80,
    textAlign: "center",
    fontWeight: 600,
    color: "#1e293b",
});

// Mobile Card Styles
const MobileCardList = styled(Box)(({ theme }) => ({
    display: "none",
    [theme.breakpoints.down("sm")]: {
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing(1.5),
    },
}));

const MobileCard = styled(Box)(({ theme }) => ({
    backgroundColor: theme.palette.mode === "dark" ? "#2d3748" : "#f8fafc",
    borderRadius: 8,
    padding: theme.spacing(1.5),
    border: `1px solid ${theme.palette.divider}`,
}));

const MobileCardRow = styled(Box)(({ theme }) => ({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing(0.75),
    "&:last-child": {
        marginBottom: 0,
    },
}));

const MobileLabel = styled(Typography)(({ theme }) => ({
    fontSize: "0.75rem",
    color: theme.palette.text.secondary,
    fontWeight: 500,
    minWidth: 80,
}));

const MobileValue = styled(Typography)(({ theme }) => ({
    fontSize: "0.813rem",
    color: theme.palette.text.primary,
    textAlign: "right",
    flex: 1,
}));

const DesktopTableWrapper = styled(Box)(({ theme }) => ({
    display: "block",
    [theme.breakpoints.down("sm")]: {
        display: "none",
    },
}));

function SenderReceiverInfo({ data = [], title = "THÔNG TIN GỬI NHẬN" }) {
    const [open, setOpen] = useState(true);

    const handleToggle = useCallback(() => {
        setOpen((prev) => !prev);
    }, []);

    if (!data || data.length === 0) {
        return null;
    }

    return (
        <>
            {/* Header với nút thu gọn */}
            <CollapseHeader onClick={handleToggle}>
                <StyledTitleWithToggle>
                    <FileIconSvg size={24} />
                    <StyledSectionTitle variant="h6" noWrap>
                        {title}
                    </StyledSectionTitle>
                </StyledTitleWithToggle>
                <StyledHeaderActions>
                    <StyledCollapseIconButton isCollapsed={!open}>
                        <KeyboardArrowDownIcon />
                    </StyledCollapseIconButton>
                </StyledHeaderActions>
            </CollapseHeader>

            <FullWidthCollapse in={open}>
                {/* Desktop/Tablet Table */}
                <DesktopTableWrapper>
                    <StyledTableContainer elevation={0}>
                        <StyledTable>
                            <CustomTableHead>
                                <StyledTableRow>
                                    <STTHeaderCell align="center">STT</STTHeaderCell>
                                    <StyledTableCell>Hành động</StyledTableCell>
                                    <StyledTableCell>Người xử lý</StyledTableCell>
                                    <StyledTableCell>Ngày ý kiến</StyledTableCell>
                                    <StyledTableCell>Ý kiến xử lý</StyledTableCell>
                                </StyledTableRow>
                            </CustomTableHead>
                            <TableBody>
                                {data.map((row, index) => (
                                    <StyledTableRow key={row.id || index} hover index={index}>
                                        <STTBodyCell align="center">{index + 1}</STTBodyCell>
                                        <BodyCell>{row.action || row.hanhDong || ""}</BodyCell>
                                        <BoldBodyCell>{row.processor || row.processedBy || row.nguoiXuLy || row.displayName || ""}</BoldBodyCell>
                                        <BodyCell>{row.opinionDate || row.ngayYKien || row.timeLabel || ""}</BodyCell>
                                        <WrappingBoldBodyCell>
                                            {typeof (row.details || row.yKienXuLy || row.processingOpinion) === 'object'
                                                ? ((row.details || row.yKienXuLy || row.processingOpinion)?.note || "")
                                                : (row.details || row.yKienXuLy || row.processingOpinion || "")
                                            }
                                        </WrappingBoldBodyCell>
                                    </StyledTableRow>
                                ))}
                            </TableBody>
                        </StyledTable>
                    </StyledTableContainer>
                </DesktopTableWrapper>

                {/* Mobile Card Layout */}
                <MobileCardList>
                    {data.map((row, index) => (
                        <MobileCard key={row.id || index}>
                            <MobileCardRow>
                                <MobileLabel>STT:</MobileLabel>
                                <MobileValue>{index + 1}</MobileValue>
                            </MobileCardRow>

                            <MobileCardRow>
                                <MobileLabel>Hành động:</MobileLabel>
                                <MobileValue>{row.action || row.hanhDong || "-"}</MobileValue>
                            </MobileCardRow>

                            <MobileCardRow>
                                <MobileLabel>Người xử lý:</MobileLabel>
                                <MobileValue>{row.processor || row.processedBy || row.nguoiXuLy || "-"}</MobileValue>
                            </MobileCardRow>

                            <MobileCardRow>
                                <MobileLabel>Ngày ý kiến:</MobileLabel>
                                <MobileValue>{row.opinionDate || row.ngayYKien || "-"}</MobileValue>
                            </MobileCardRow>

                            <MobileCardRow>
                                <MobileLabel>Ý kiến xử lý:</MobileLabel>
                                <MobileValue>
                                    {typeof (row.details || row.yKienXuLy || row.processingOpinion) === 'object' 
                                        ? ((row.details || row.yKienXuLy || row.processingOpinion)?.note || "-") 
                                        : (row.details || row.yKienXuLy || row.processingOpinion || "-")
                                    }
                                </MobileValue>
                            </MobileCardRow>
                        </MobileCard>
                    ))}
                </MobileCardList>
            </FullWidthCollapse>
        </>
    );
}

SenderReceiverInfo.propTypes = {
    data: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            yKienXuLy: PropTypes.string,
            hanhDong: PropTypes.string,
            nguoiXuLy: PropTypes.string,
            ngayYKien: PropTypes.string,
        })
    ),
    title: PropTypes.string,
};

SenderReceiverInfo.displayName = "SenderReceiverInfo";

export default memo(SenderReceiverInfo);
