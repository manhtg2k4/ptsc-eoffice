// import React from "react";
// import { Folder as FolderIcon } from "@mui/icons-material";
// import { styled } from "@mui/material/styles";
// import dayjs from "dayjs";

// const StyledFolderIcon = styled(FolderIcon)({
//     color: "#ffb300",
//     marginRight: "10px",
//     verticalAlign: "middle",
// });

export const categoryListColumns = [
    {
        name: "Danh mục năm",
        row: "year",
        // width: "300px",
        isFolder: true,
        render: (value) => value ? (value.toString().startsWith("Năm") ? value : `Năm ${value}`) : "",
    },
    {
        name: "Tổng số hồ sơ",
        row: "totalDocuments",
        // width: "150px",
        align: "center",
        render: (value) => value ?? 0,
    },
    {
        name: "Tổng số tài liệu",
        row: "totalFiles",
        // width: "150px",
        align: "center",
        render: (value) => value ?? 0,
    },
    {
        name: "Ngày khởi tạo",
        row: "createdAt",
        // width: "180px",
        render: (value) => value || "--/--/----",
    },
];

export const folderDetailColumns = [
    {
        name: "Tiêu đề mục hồ sơ",
        row: "title",
        // width: "400px",
        isFolder: true,
    },
    {
        name: "Tổng số hồ sơ",
        row: "totalDocuments",
        // width: "120px",
        align: "center",
    },
    {
        name: "Tổng số tài liệu",
        row: "totalFiles",
        // width: "120px",
        align: "center",
    },
];

export const departmentRecordColumns = [
    {
        name: "Số và ký hiệu phòng",
        row: "fileSymbol",
        // width: "200px",
    },
    {
        name: "Tên hồ sơ phòng",
        row: "title",
        // width: "500px",
        isFolder: true,
    },
    {
        name: "Tổng số hồ sơ",
        row: "totalDocuments",
        // width: "120px",
        align: "center",
    },
    {
        name: "Tổng số tài liệu",
        row: "totalFiles",
        // width: "120px",
        align: "center",
    },
];

export const recordListColumns = [
    {
        name: "Số và ký hiệu hồ sơ",
        row: "documentSymbol",
        // width: "200px",
    },
    {
        name: "Tiêu đề hồ sơ",
        row: "documentTitle",
        // width: "500px",
        isFolder: true,
    },
    {
        name: "Trạng thái",
        row: "statusLabel",
				justifyContent: "center"
        // width: "150px",
    },
];

export const categoryListFilters = [
    { name: "Danh mục năm", code: "year" },
    { name: "Tổng số hồ sơ", code: "totalDocuments" },
    { name: "Tổng số tài liệu", code: "totalFiles" },
];
