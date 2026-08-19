import React, { useEffect, useState } from "react";
import { CircularProgress, Alert } from "@mui/material";
import {
  StyledTable,
  StyledTableHead,
  StyledTableCell,
  StyledTableRow,
} from "@styles/CustomTable.styles";
import { API_BPMN } from "@EnvironmentFile/constants/urlConfig";
import dayjs from "dayjs";
import PropTypes from "prop-types";
import api from "../../services/api";
import {
  CenteredBox,
  HistoryContainer,
  HistoryTableRow,
  HistoryTitle,
  TableWrapper,
} from "@styles/ProcessHistory.styles";

const ProcessHistory = ({ processInstanceId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!processInstanceId) return;

    const fetchLogs = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await api.get(
          `${API_BPMN}/logs/${processInstanceId}`
        );
        setLogs(res.data || []);
      } catch (err) {
        setError("Không thể tải lịch sử xử lý tiến trình.");
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [processInstanceId]);

  if (loading) {
    return (
      <CenteredBox>
        <CircularProgress />
      </CenteredBox>
    );
  }

  if (error) {
    return (
      <HistoryContainer>
        <Alert severity="error">{error}</Alert>
      </HistoryContainer>
    );
  }

  if (!logs.length) {
    return (
      <HistoryContainer>
        <HistoryTitle>Không có lịch sử xử lý nào.</HistoryTitle>
      </HistoryContainer>
    );
  }

  return (
    <HistoryContainer>
      <HistoryTitle>Lịch sử xử lý</HistoryTitle>
      <TableWrapper>
        <StyledTable>
          <StyledTableHead>
            <StyledTableRow>
              <StyledTableCell>STT</StyledTableCell>
              <StyledTableCell>Hành động</StyledTableCell>
              <StyledTableCell>Người gửi</StyledTableCell>
              <StyledTableCell>Người xử lý</StyledTableCell>
              <StyledTableCell>Thời gian xử lý</StyledTableCell>
            </StyledTableRow>
          </StyledTableHead>

          <tbody>
            {logs.map((log, index) => (
              <HistoryTableRow
                key={log._id}
                hover
              >
                <StyledTableCell>{index + 1}</StyledTableCell>
                <StyledTableCell>{log.taskName || "-"}</StyledTableCell>
                <StyledTableCell>{log.senderName || "-"}</StyledTableCell>
                <StyledTableCell>{log.assigneeName || "-"}</StyledTableCell>
                <StyledTableCell>
                  {log.completedAt
                    ? dayjs(log.completedAt).format("HH:mm DD/MM/YYYY")
                    : "-"}
                </StyledTableCell>
              </HistoryTableRow>
            ))}
          </tbody>
        </StyledTable>
      </TableWrapper>
    </HistoryContainer>
  );
};

ProcessHistory.propTypes = {
  processInstanceId: PropTypes.string.isRequired,
};

export default ProcessHistory;
