import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import {
  Checkbox,
  Typography,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import {
  HeaderLeft,
  HeaderRight,
  OfficialHandoverDocContainer,
  OfficialHandoverDocHeader,
  DocTitle,
  DocDescription,
  StyledTable,
  StyledHeaderRow,
  StyledHeaderCell,
  StyledTotalCell,
  StyledEditableCell,
  SummaryBox,
  SignatureWrapper,
  SignatureBox,
  BoldText,
  ErrorText,
  ItalicText,
  SignatureTitle,
  SignatureNameSender,
} from "@styles/CustomTableDocument.styles";
import { TotalPassportType } from "@styles/PassportManagement.styles";

const CustomTableDocument = ({
  unitName = "TCT TÂN CẢNG SÀI GÒN",
  department = "CƠ QUAN, ĐƠN VỊ ...",
  city = "Thành phố Hồ Chí Minh",
  dateText = "",
  documentNumber = "......../TB-TCT",
  data = [],
  columns = [],
  total = {},
  receiver = {},
  sender = {},
  minRows = 10,
  onlyTable = false,
  titleDoc = "PHIẾU TIẾP NHẬN, BÀN GIAO HỘ CHIẾU",
  disableCheckbox = false,
  onSelectionChange,
  selectAllOnLoad = false,
}) => {
  const showCheckbox = !disableCheckbox;
  const [selectedIds, setSelectedIds] = useState([]);
  const autoSelectedRef = useRef(false);

  // Số dòng dữ liệu thật (không tính dòng trống)
  const realDataCount = data.length;

  const handleToggleRow = useCallback((e) => {
    const rowId = e.target.value;
    setSelectedIds((prev) =>
      prev.includes(rowId)
        ? prev.filter((id) => id !== rowId)
        : [...prev, rowId]
    );
  }, []);

  const handleToggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.length === realDataCount && realDataCount > 0) {
        return [];
      }
      return data.map((row, index) => row._id || row.id || `row-${index}`);
    });
  }, [data, realDataCount]);

  // Thông báo ra ngoài mỗi khi selectedIds thay đổi
  const selectedRows = useMemo(() => {
    if (!showCheckbox) return [];
    return data.filter((row, index) => {
      const rowId = row._id || row.id || `row-${index}`;
      return selectedIds.includes(rowId);
    });
  }, [data, selectedIds, showCheckbox]);

  useEffect(() => {
    if (!showCheckbox || !onSelectionChange) return;
    onSelectionChange(selectedRows);
  }, [showCheckbox, onSelectionChange, selectedRows]);

  useEffect(() => {
    if (selectAllOnLoad) {
      if (!autoSelectedRef.current && data.length > 0) {
        setSelectedIds(data.map((row, index) => row._id || row.id || `row-${index}`));
        autoSelectedRef.current = true;
      }
    } else {
      setSelectedIds((prev) => (prev.length ? [] : prev));
      autoSelectedRef.current = false;
    }
  }, [data, selectAllOnLoad]);

  // Đảm bảo luôn có ít nhất minRows dòng
  const filledData = useMemo(() => {
    const emptyRow = columns.reduce((acc, col) => {
      acc[col.name] = "";
      return acc;
    }, {});

    const dataWithIndex = data.map((row, index) => ({
      ...row,
      stt: index + 1,
      _rowId: row._id || row.id || `row-${index}`,
    }));

    const remaining = Math.max(0, minRows - dataWithIndex.length);
    const emptyRows = Array.from({ length: remaining }, (_, i) => ({
      ...emptyRow,
      stt: dataWithIndex.length + i + 1,
      _rowId: `empty-${i}`,
    }));

    return [...dataWithIndex, ...emptyRows];
  }, [data, columns, minRows]);

  const displayedColumns = useMemo(() => {
    // Loại bỏ cột stt từ columns gốc nếu có
    const columnsWithoutStt = columns.filter((col) => col.name !== "stt");
    
    if (showCheckbox) {
      // Nếu có checkbox, không hiển thị cột STT
      return columnsWithoutStt;
    } else {
      // Nếu không có checkbox, tự động thêm cột STT vào đầu
      return [
        { name: "stt", title: "STT", width: "50px", alignCenter: true },
        ...columnsWithoutStt,
      ];
    }
  }, [columns, showCheckbox]);

  const emptyTotalCells = useMemo(() => {
    const totalVisibleColumns =
      displayedColumns.length + (showCheckbox ? 1 : 0);
    const count = Math.max(0, totalVisibleColumns - 3);
    return Array.from({ length: count }, (_, idx) => idx);
  }, [displayedColumns.length, showCheckbox]);

  return (
    <OfficialHandoverDocContainer>
      {/* Header */}
      {!onlyTable && (
        <>
          <OfficialHandoverDocHeader>
            <HeaderLeft>
              <BoldText>{unitName}</BoldText>
              <ErrorText>{department}</ErrorText>
            </HeaderLeft>

            <HeaderRight>
              <BoldText>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</BoldText>
              <Typography>Độc lập - Tự do - Hạnh phúc</Typography>
              <ItalicText>
                {city}, {dateText}
              </ItalicText>
            </HeaderRight>
          </OfficialHandoverDocHeader>
          {/* Title */}
          <DocTitle>{titleDoc}</DocTitle>

          {/* Description */}
          <DocDescription variant="body2">
            Căn cứ Thông báo số {documentNumber} về việc thu nộp, quản lý hộ
            chiếu...
          </DocDescription>
        </>
      )}

      {/* Table */}
      <StyledTable size="small">
        <TableHead>
          <StyledHeaderRow>
            {showCheckbox && (
              <StyledHeaderCell align="center" colWidth="50px">
                <Checkbox
                  size="small"
                  checked={
                    realDataCount > 0 && selectedIds.length === realDataCount
                  }
                  indeterminate={
                    selectedIds.length > 0 && selectedIds.length < realDataCount
                  }
                  onChange={handleToggleAll}
                />
              </StyledHeaderCell>
            )}
            {displayedColumns.map((col) => (
              <StyledHeaderCell
                key={col.name}
                align="center"
                colWidth={col.width}
              >
                {col.title}
              </StyledHeaderCell>
            ))}
          </StyledHeaderRow>
        </TableHead>
        <TableBody>
          {filledData.map((row, rowIndex) => {
            const isRealRow = rowIndex < realDataCount;
            const isSelected = isRealRow && selectedIds.includes(row._rowId);
            return (
              <TableRow key={row._rowId} selected={isSelected}>
                {showCheckbox && (
                  <TableCell align="center">
                    {isRealRow && (
                      <Checkbox
                        size="small"
                        checked={isSelected}
                        onChange={handleToggleRow}
                        value={row._rowId}
                      />
                    )}
                  </TableCell>
                )}
                {displayedColumns.map((col) => {
                  const value = row[col.name] || "";
                  const align =
                    col.name === "stt" ||
                    col.name === "soHoChieu" ||
                    col.name === "passportNumber" ||
                    col.alignCenter
                      ? "center"
                      : "left";

                  const CellComponent = col.renderCell
                    ? StyledEditableCell
                    : TableCell;

                  return (
                    <CellComponent key={col.name} align={align}>
                      {col.renderCell ? col.renderCell(row, rowIndex) : value}
                    </CellComponent>
                  );
                })}
              </TableRow>
            );
          })}
          <TableRow>
            <StyledTotalCell colSpan={2}>TỔNG SỐ HỘ CHIẾU:</StyledTotalCell>

            <TableCell align="center">{total?.all ?? "....."}</TableCell>

            {/* Các ô còn lại để trống nhưng vẫn giữ border */}
            {emptyTotalCells.map((idx) => (
              <TableCell key={`total-empty-${idx}`} />
            ))}
          </TableRow>
        </TableBody>
      </StyledTable>

      {/* Summary */}
      <SummaryBox>
        <TotalPassportType variant="body2" styleMarginTop>
          Tổng số hộ chiếu: {total.all || "....."}
        </TotalPassportType>
        <TotalPassportType variant="body2">
          - Hộ chiếu ngoại giao: {total.diplomatic || "....."} cuốn
        </TotalPassportType>
        <TotalPassportType variant="body2">
          - Hộ chiếu công vụ: {total.official || "....."} cuốn
        </TotalPassportType>
        <TotalPassportType variant="body2">
          - Hộ chiếu phổ thông: {total.normal || "....."} cuốn
        </TotalPassportType>
      </SummaryBox>

      {!onlyTable && (
        <SignatureWrapper>
          <SignatureBox>
            <SignatureTitle>BÊN NHẬN</SignatureTitle>
            <SignatureNameSender variant="body2">
              {receiver.name || "Ký ở đây"}
            </SignatureNameSender>
            <Typography variant="caption">{receiver.date}</Typography>
          </SignatureBox>

          <SignatureBox>
            <SignatureTitle>BÊN GIAO</SignatureTitle>
            <SignatureNameSender variant="body2">
              {sender.name}
            </SignatureNameSender>
            <Typography variant="caption">{sender.date}</Typography>
          </SignatureBox>
        </SignatureWrapper>
      )}
    </OfficialHandoverDocContainer>
  );
};

CustomTableDocument.propTypes = {
  unitName: PropTypes.string,
  department: PropTypes.string,
  city: PropTypes.string,
  dateText: PropTypes.string,
  documentNumber: PropTypes.string,
  data: PropTypes.array,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      width: PropTypes.string,
      alignCenter: PropTypes.bool,
      renderCell: PropTypes.func,
    })
  ),
  total: PropTypes.object,
  receiver: PropTypes.object,
  sender: PropTypes.object,
  minRows: PropTypes.number,
  onlyTable: PropTypes.bool,
  titleDoc: PropTypes.string,
  disableCheckbox: PropTypes.bool,
  onSelectionChange: PropTypes.func,
  selectAllOnLoad: PropTypes.bool,
};

export default CustomTableDocument;
