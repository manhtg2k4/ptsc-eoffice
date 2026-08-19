import React, { useCallback, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  StyledTable,
  StyledTableContainer,
  StyledTableHead,
  StyledTableRow,
} from "@styles/CustomTable.styles";
import {
  CollapseHeader,
  HeaderTitle,
  ToggleButton,
  StyledTableCell,
  FullWidthCollapse,
  TableBody,
  KeyboardArrowDownIcon,
  KeyboardArrowUpIcon,
  SkyFlexGap8,
  StyledIconWrapper,
  StytedDescriptionIcon,
  UserRowContainer,
  UserIndexText,
  UserDeadlineText,
  WorkflowStatusBadge,
  HeaderStatusTableCell,
  ContentTableCell,
  ReceiverTableCell,
  ReturnReasonTableRow,
  ReturnReasonTableCell,
  ReturnReasonContainer,
  ReturnReasonText,
  ReturnReasonIcon,
  ProcessorContainer,
  ProcessorAvatarWrapper,
  ProcessorAvatar,
  ProcessorStatusIconMini,
  ProcessorInfoBox,
  ProcessorNameText,
  ProcessorPositionText,
} from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/RecipientInfoTable.styles";
import { normalizeWorkflowData, WORKFLOW_STATUS_CONFIG } from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/workflow.utils";

const RecipientInfoTableOutGoing = ({
  data,
  disabledColDeadline,
  headerTitle,
  styledTextTransform,
}) => {
  const [openMain, setOpenMain] = useState(false);

  const handleToggleMain = useCallback(() => {
    setOpenMain((prev) => !prev);
  }, []);

  // normalize dữ liệu sang chuẩn tương thích từ workflow.utils
  const steps = useMemo(() => normalizeWorkflowData(data), [data]);

  const renderStatusBadge = useCallback((userStatus, statusLabel) => {
    const styleConfig =
      WORKFLOW_STATUS_CONFIG[userStatus] ||
      WORKFLOW_STATUS_CONFIG.waiting;
    return (
      <WorkflowStatusBadge
        statusColor={styleConfig.backgroundColor}
        textColor={styleConfig.color}
      >
        {statusLabel || "-"}
      </WorkflowStatusBadge>
    );
  }, []);

  const renderProcessorCell = useCallback((user, step) => {
    if (!user) return "-";

    const userStatus = user?.status || step?.status || "waiting";
    const statusConfig =
      WORKFLOW_STATUS_CONFIG[userStatus] || WORKFLOW_STATUS_CONFIG.waiting;
    const statusColor = statusConfig.color;
    const statusIcon = statusConfig.icon;

    const processorName =
      user?.raw?.createdBy?.name || user?.processorName || user?.name || "-";
    const processorPosition =
      user?.position ||
      user?.raw?.createdBy?.position ||
      user?.raw?.processorPosition ||
      user?.raw?.position ||
      user?.raw?.positionName ||
      user?.department ||
      "";

    const avatarUrl =
      user?.avatar ||
      user?.raw?.createdBy?.avatar ||
      user?.raw?.processorAvatar ||
      user?.raw?.avatar;

    const initialLetter =
      processorName && processorName !== "-"
        ? processorName.trim().charAt(0).toUpperCase()
        : "?";

    return (
      <ProcessorContainer>
        <ProcessorAvatarWrapper>
          <ProcessorAvatar
            src={avatarUrl || undefined}
            statusColor={statusColor}
          >
            {!avatarUrl && initialLetter}
          </ProcessorAvatar>
          <ProcessorStatusIconMini statusColor={statusColor}>
            {statusIcon}
          </ProcessorStatusIconMini>
        </ProcessorAvatarWrapper>
        <ProcessorInfoBox>
          <ProcessorNameText variant="body2">
            {processorName}
          </ProcessorNameText>
          {processorPosition && (
            <ProcessorPositionText variant="caption">
              {processorPosition}
            </ProcessorPositionText>
          )}
        </ProcessorInfoBox>
      </ProcessorContainer>
    );
  }, []);

  const renderHistory = useCallback(
    (step, totalRows) => {
      return Array.from({ length: totalRows }).map((_, userIdx) => {
        const user = step.users?.[userIdx];

        const rowKey = user && user.id ? user.id : `${step.stepId}-row-${userIdx}`;
        const receiverName = user?.raw?.receiver?.name || user?.receiverName || "-";

        return (
          <StyledTableRow key={rowKey} hover>
            {/* Cột Người Xử Lý */}
            <StyledTableCell>
              {renderProcessorCell(user, step)}
            </StyledTableCell>

            {/* Cột Thao Tác */}
            <ContentTableCell>
              {!user ? step.actionName || "-" : user.action || "-"}
            </ContentTableCell>

            {/* Cột Người Nhận */}
            <ReceiverTableCell>
              {!user ? "-" : receiverName}
            </ReceiverTableCell>

            {/* Cột Hạn Xử Lý */}
            {!disabledColDeadline && (
              <StyledTableCell>
                {!user ? (
                  "-"
                ) : (
                  <UserRowContainer>
                    {step.totalUsers > 1 && user.deadline && user.deadline !== "-" && (
                      <UserIndexText variant="body2">
                        {userIdx + 1}
                      </UserIndexText>
                    )}
                    <UserDeadlineText
                      isUrgent={user.deadline && (String(user.deadline).includes("Còn") || String(user.deadline).includes("Quá hạn"))}
                    >
                      {user.deadline || "-"}
                    </UserDeadlineText>
                  </UserRowContainer>
                )}
              </StyledTableCell>
            )}

            {/* Cột Ngày Xử Lý */}
            <ContentTableCell>
              {!user ? "-" : user.processedDate || "-"}
            </ContentTableCell>

            {/* Cột Trạng Thái */}
            <StyledTableCell>
              {user ? renderStatusBadge(user.status, user.statusLabel) : renderStatusBadge(step.status, step.statusLabel)}
            </StyledTableCell>
          </StyledTableRow>
        );
      });
    },
    [disabledColDeadline, renderProcessorCell, renderStatusBadge]
  );

  return (
    <>
      {/* Tiêu đề + nút thu gọn chính */}
      <CollapseHeader item onClick={handleToggleMain}>
        <SkyFlexGap8>
          <StyledIconWrapper>
            <StytedDescriptionIcon />
          </StyledIconWrapper>
          <HeaderTitle variant="h6" styledTextTransform={styledTextTransform}>
            {headerTitle || "THÔNG TIN LUÂN CHUYỂN"}
          </HeaderTitle>
        </SkyFlexGap8>
        <ToggleButton size="small">
          {openMain ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
        </ToggleButton>
      </CollapseHeader>

      <FullWidthCollapse in={openMain}>
        <StyledTableContainer elevation={0}>
          <StyledTable>
            <StyledTableHead>
              <StyledTableRow>
                <StyledTableCell>NGƯỜI XỬ LÝ</StyledTableCell>
                <StyledTableCell>THAO TÁC</StyledTableCell>
                <StyledTableCell>NGƯỜI NHẬN</StyledTableCell>
                {!disabledColDeadline && (
                  <StyledTableCell>HẠN XỬ LÝ</StyledTableCell>
                )}
                <StyledTableCell>NGÀY XỬ LÝ</StyledTableCell>
                <HeaderStatusTableCell>TRẠNG THÁI</HeaderStatusTableCell>
              </StyledTableRow>
            </StyledTableHead>
            <TableBody>
              {steps.map((step) => {
                const totalRows = Math.max(1, step.totalUsers);
                const returnReason =
                  step.returnReason ||
                  (Array.isArray(step.users) &&
                    step.users.find(
                      (u) =>
                        u.raw?.returnReason ||
                        u.raw?.return_reason ||
                        u.raw?.reason ||
                        u.status === "returned"
                    )?.raw?.returnReason) ||
                  (Array.isArray(step.users) &&
                    step.users.find(
                      (u) =>
                        u.raw?.returnReason ||
                        u.raw?.return_reason ||
                        u.raw?.reason ||
                        u.status === "returned"
                    )?.raw?.reason);

                return (
                  <React.Fragment key={step.stepId}>
                    {renderHistory(step, totalRows)}
                    {returnReason && (
                      <ReturnReasonTableRow>
                        <ReturnReasonTableCell colSpan={disabledColDeadline ? 5 : 6}>
                          <ReturnReasonContainer>
                            <ReturnReasonIcon />
                            <ReturnReasonText variant="body2">
                              <strong>Lý do trả lại: </strong>
                              {returnReason}
                            </ReturnReasonText>
                          </ReturnReasonContainer>
                        </ReturnReasonTableCell>
                      </ReturnReasonTableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </StyledTable>
        </StyledTableContainer>
      </FullWidthCollapse>
    </>
  );
};

RecipientInfoTableOutGoing.propTypes = {
  data: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  disabledColDeadline: PropTypes.bool,
  headerTitle: PropTypes.string,
  styledTextTransform: PropTypes.string,
};

export default RecipientInfoTableOutGoing;
