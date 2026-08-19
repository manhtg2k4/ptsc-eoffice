import * as yup from "yup";
import React from "react";
import FolderIcon from "@mui/icons-material/Folder";
import { Box, styled } from "@mui/material";

export const defaultValues = {
    codeDestruction: "",
    dateDestruction: new Date(),
    nameDestruction: "",
    reasonDestruction: "",
};

export const recordDestructionSchema = yup.object().shape({
    codeDestruction: yup.string().required("Vui lòng nhập mã đợt yêu cầu tiêu hủy").max(50, "Mã đợt yêu cầu không quá 50 ký tự"),
    dateDestruction: yup.date().nullable().required("Vui lòng chọn ngày tạo đợt"),
    nameDestruction: yup.string().required("Vui lòng nhập tên đợt tiêu hủy").max(500, "Tên đợt tiêu hủy không quá 500 ký tự"),
    reasonDestruction: yup.string().required("Vui lòng chọn lý do tiêu hủy"),
});

// Styled components for record code with folder icon
const RecordCodeWrapper = styled(Box)(() => ({
    display: "inline-flex",   
    alignItems: "center",     
    gap: "12px",              
    verticalAlign: "middle",
    lineHeight: 1,           
}));

const StyledFolderIcon = styled(FolderIcon)(() => ({
    color: "#FFC107",
    fontSize: "18px",         
    display: "block",         
}));
const documentSymbolAccessor = (row) => (
    <RecordCodeWrapper>
        <StyledFolderIcon />
        <span>{row.fileCode || row.documentSymbol}</span>
    </RecordCodeWrapper>
);

const dialogDocumentSymbolAccessor = (row) => (
    <span style={{ color: "#2364B0", fontWeight: 600 }}>
        {row.fileCode || row.documentSymbol || ""}
    </span>
);

const documentTitleAccessor = (row) => row.title || row.documentTitleOriginal || row.documentTitle || '';

// const recordStateAccessor = (row) => row.recordState ? <div dangerouslySetInnerHTML={{ __html: row.recordState }} /> : '';

// Columns configuration for expired records table in dialog (without STT)
export const expiredRecordsColumns = [
    { label: "SỐ VÀ KÝ HIỆU HỒ SƠ", row: "fileCode", width: "180px", isShow: true, accessor: dialogDocumentSymbolAccessor },
    { label: "TIÊU ĐỀ HỒ SƠ", row: "title", width: "250px", isShow: true, accessor: documentTitleAccessor },
    { label: "NGÀY HẾT HẠN", row: "expiryDate", width: "120px", isShow: true, isFilter: false },
    // { label: "Trạng thái", row: "recordState", width: "150px", isShow: true, accessor: recordStateAccessor },
];

// Columns configuration for selected records table (with STT)
export const selectedRecordsColumns = [
    { label: "Số, ký hiệu hồ sơ", row: "fileCode", width: "180px", isShow: true, accessor: documentSymbolAccessor },
    { label: "Tiêu đề hồ sơ", row: "title", width: "250px", isShow: true, accessor: documentTitleAccessor },
    { label: "Ngày hết hạn", row: "expiryDate", width: "120px", isShow: true, isFilter: false },
    // { label: "Trạng thái", row: "recordState", width: "150px", isShow: true, accessor: recordStateAccessor },
];

// Fake data for expired records
export const fakeExpiredRecords = [
    { id: "1", recordCode: "HS-2020-001", recordTitle: "Hồ sơ nhân sự phòng kế toán", recordType: "Nhân sự", expiryDate: "01/01/2024" },
    { id: "2", recordCode: "HS-2020-002", recordTitle: "Hồ sơ hợp đồng lao động năm 2020", recordType: "Hợp đồng", expiryDate: "15/02/2024" },
    { id: "3", recordCode: "HS-2019-015", recordTitle: "Báo cáo tài chính quý 4/2019", recordType: "Tài chính", expiryDate: "20/03/2024" },
    { id: "4", recordCode: "HS-2020-008", recordTitle: "Hồ sơ dự án xây dựng kho bãi", recordType: "Dự án", expiryDate: "10/04/2024" },
    { id: "5", recordCode: "HS-2019-022", recordTitle: "Hồ sơ mua sắm thiết bị văn phòng", recordType: "Mua sắm", expiryDate: "05/05/2024" },
    { id: "6", recordCode: "HS-2020-011", recordTitle: "Hồ sơ đào tạo nhân viên mới", recordType: "Đào tạo", expiryDate: "25/05/2024" },
    { id: "7", recordCode: "HS-2019-033", recordTitle: "Biên bản họp HĐQT năm 2019", recordType: "Hành chính", expiryDate: "12/06/2024" },
    { id: "8", recordCode: "HS-2020-019", recordTitle: "Hồ sơ bảo trì thiết bị", recordType: "Kỹ thuật", expiryDate: "18/07/2024" },
    { id: "9", recordCode: "HS-2019-041", recordTitle: "Hồ sơ kiểm toán nội bộ 2019", recordType: "Kiểm toán", expiryDate: "22/08/2024" },
    { id: "10", recordCode: "HS-2020-025", recordTitle: "Hồ sơ khách hàng VIP", recordType: "Khách hàng", expiryDate: "30/09/2024" },
    { id: "11", recordCode: "HS-2019-048", recordTitle: "Hồ sơ thanh lý tài sản", recordType: "Tài sản", expiryDate: "08/10/2024" },
    { id: "12", recordCode: "HS-2020-032", recordTitle: "Hồ sơ bảo hiểm nhân viên", recordType: "Bảo hiểm", expiryDate: "15/11/2024" },
];

// Fake data for SenderReceiverInfo
export const fakeSenderReceiverData = [
    {
        id: 1,
        processingOpinion: "Sửa lại thông tin hồ sơ",
        action: "Trình phê duyệt",
        processedBy: "Chánh văn phòng",
        opinionDate: "10:40 19/11/2025",
    },
    {
        id: 2,
        processingOpinion: "Sửa lại thông tin hồ sơ",
        action: "Trả lại",
        processedBy: "Chánh văn phòng",
        opinionDate: "10:40 19/11/2025",
    },
    {
        id: 3,
        processingOpinion: "Sửa lại thông tin hồ sơ",
        action: "Trình phê duyệt",
        processedBy: "Văn thư",
        opinionDate: "10:40 19/11/2025",
    },
    {
        id: 4,
        processingOpinion: "Sửa lại thông tin hồ sơ",
        action: "Tạo mới",
        processedBy: "Văn thư",
        opinionDate: "10:40 19/11/2025",
    },
];