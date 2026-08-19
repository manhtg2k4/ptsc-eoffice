import React from "react";
import PropTypes from "prop-types";
import {
  BoldTableCell,
  EmptyTableCell,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  StyledTableCell50,
  StyledTableCell70,
  StyledTableCell260,
  StyledTableCell90,
} from "./ListOfRecipients.styles";

export default function ListOfRecipients({ documentDetail }) {
	const internalUnit = documentDetail?.internalReceivingDept || [];
	const internalDepartment = documentDetail?.internalReceivingUnit || [];
	const externalDepartment = documentDetail?.externalReceivingUnit || [];
	const processors = documentDetail?.processors || [];

	return (
		<div>
			{internalDepartment.length > 0 && (
				<RecipientTable data={internalDepartment} unitLabel="Đơn vị nhận nội ngành" />
			)}
			{externalDepartment.length > 0 && (
				<RecipientTable data={externalDepartment} unitLabel="Đơn vị nhận ngoại ngành" />
			)}
			{internalUnit.length > 0 && (
				<RecipientTable data={internalUnit} unitLabel="Đơn vị nhận nội bộ" />
			)}
			{processors.length > 0 && (
				<RecipientTable data={processors} unitLabel="Người nhận xử lý" />
			)}
		</div>
	);
}

function RecipientTable({ data, unitLabel }) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <StyledTableCell50>STT</StyledTableCell50>
            <StyledTableCell260>{unitLabel}</StyledTableCell260>
            <StyledTableCell70>Trạng thái</StyledTableCell70>
            <StyledTableCell90>Trạng thái xử lý</StyledTableCell90>
            <StyledTableCell90>Ngày xử lý</StyledTableCell90>
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.isArray(data) && data.length > 0 ? (
            data.map((item, index) => (
              <TableRow hover key={item._id || index}>
                <TableCell>{index + 1}</TableCell>
                <BoldTableCell>{item.name || "-"}</BoldTableCell>
                <BoldTableCell>{item.requestStatusName || "-"}</BoldTableCell>
                <BoldTableCell>{item.processStatusName || "-"}</BoldTableCell>
                <TableCell>{item.processedDate || "-"}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <EmptyTableCell colSpan={6} align="center">
                Không có dữ liệu
              </EmptyTableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

RecipientTable.propTypes = {
  data: PropTypes.array,
  unitLabel: PropTypes.string,
  isPerson: PropTypes.bool,
};
