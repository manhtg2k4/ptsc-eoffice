import { Delete } from "@mui/icons-material";
import { TableBody, Tooltip } from "@mui/material";
import { Controller } from "react-hook-form";
import { StyledTableCell } from "@styles/CustomTable.styles";
import {
  StyledNameText,
  StyledNameTextHeader,
  StyledTable,
  StyledTableCellLarge,
  StyledTableCellMedium,
  StyledTableCellSmall,
  StyledTableHead,
  StyledTableRow,
  StyleListUserBoxContainer,
  StyleAssignmentsTableWrapper,
  StyledAssignmentsTableContainer,
  StyledDeleteButton,
  StyleButtonOtherOpinions,
  StyledInputFullWidth,
  OpinionHeader,
  OpinionTitle,
  OpinionArea,
  StyledSendIcon,
  StyledDialogFooter,
  StyledDialogFooterButtons,
} from "@styles/DialogDirective";

import React, { useCallback } from "react";

function ListUnitsUser(props) {
  const {
    assignedList,
    Input,
    removeAssignment,
    onCloseDialog,
    handleSubmit,
    control,
    Button,
    getRoleColor,
    deadlineError,
    errors,
    canConfirmPropose,
    isEditMode,
    setIsEditMode,
    availableActionsType,
    lockedPhanCongIds,
    initialAssignments,
    hasUserPhanCong,
    // isDirectAssign,
    hideFooter,
    enableInlineFooter,
		isLanhDaoTCT
  } = props;

  const handleCheckboxClick = useCallback(
    (event) => {
      const { assignmentKey } = event.currentTarget.dataset;

      if (assignmentKey) {
        removeAssignment(assignmentKey);
      }
    },
    [removeAssignment]
  );

  const handleEditMode = useCallback(() => {
    setIsEditMode(true);
  }, [setIsEditMode]);

  return (
    <StyleListUserBoxContainer>
      <StyleAssignmentsTableWrapper>
        <StyledAssignmentsTableContainer>
          <StyledTable stickyHeader>
            <StyledTableHead isBgCl>
              <StyledTableRow>
                <StyledTableCellSmall>
                  <StyledNameTextHeader>STT</StyledNameTextHeader>
                </StyledTableCellSmall>
                <StyledTableCellLarge>
                  <StyledNameTextHeader>
                    Tên đơn vị, cá nhân
                  </StyledNameTextHeader>
                </StyledTableCellLarge>
                <StyledTableCellMedium>
                  <StyledNameTextHeader>
                    {props.chiDao === true ||
                    props.chiDao === "true" ||
                    (props.actionsBySub &&
                      props.actionsBySub.length > 0 &&
                      props.actionsBySub.some(
                        (item) => item.chiDao === true || item.chiDao === "true"
                      ))
                      ? "Chỉ đạo"
                      : "Chuyển xử lý"}
                  </StyledNameTextHeader>
                </StyledTableCellMedium>
                <StyledTableCellSmall>
                  <StyledNameTextHeader>Bỏ chọn</StyledNameTextHeader>
                </StyledTableCellSmall>
              </StyledTableRow>
            </StyledTableHead>

            <TableBody>
              {!assignedList || assignedList.length === 0 ? (
                <StyledTableRow>
                  <StyledTableCell colSpan={4} align="center">
                    <StyledNameText>
                      Chưa có đơn vị/cá nhân nào được chọn
                    </StyledNameText>
                  </StyledTableCell>
                </StyledTableRow>
              ) : (
                assignedList.map((item, index) => {
                  if (item.isMark) return null;

                  return (
                    <StyledTableRow key={item.key}>
                      <StyledTableCellSmall>{index + 1}</StyledTableCellSmall>
                      <StyledTableCellLarge>
                        <StyledNameText variant="body2">
                          {item?.name}
                          {item?.position && ` - ${item.position}`}
                        </StyledNameText>
                      </StyledTableCellLarge>
                      <StyledTableCellMedium
                        roleColor={getRoleColor(item.role)}
                      >
                        {item.role}
                      </StyledTableCellMedium>
                      <StyledTableCellSmall>
                        <Tooltip title="Xóa">
                          <StyledDeleteButton
                            data-assignment-key={item.key}
                            onClick={handleCheckboxClick}
                            disabled={
                              lockedPhanCongIds?.has(item.key) ||
                              (hasUserPhanCong && initialAssignments?.[item.key]) ||
                              (canConfirmPropose &&
                                availableActionsType === "confirmPropose" &&
                                !isEditMode)
                            }
                          >
                            <Delete />
                          </StyledDeleteButton>
                        </Tooltip>
                      </StyledTableCellSmall>
                    </StyledTableRow>
                  );
                })
              )}
            </TableBody>
          </StyledTable>
        </StyledAssignmentsTableContainer>
      </StyleAssignmentsTableWrapper>

      <StyledInputFullWidth>
        <OpinionHeader>
          <StyledSendIcon />
          <OpinionTitle>
            {isLanhDaoTCT ? "Ý kiến chỉ đạo" : "Ý kiến xử lý"}
          </OpinionTitle>
        </OpinionHeader>
        <OpinionArea>
          <Controller
            name="note"
            control={control}
            render={({ field }) => (
              <Input
                multiline
                rows={3}
                placeholder="Nhập nội dung tại đây..."
                fullWidth
                {...field}
              />
            )}
          />
        </OpinionArea>
      </StyledInputFullWidth>

      {!hideFooter && enableInlineFooter && (
        <StyledDialogFooter>
          <StyledDialogFooterButtons>
            <Button
              type="submit"
              onClick={handleSubmit}
              variant="primary"
              disabled={
                !assignedList ||
                assignedList.length === 0 ||
                deadlineError ||
                Object.keys(errors || {}).length > 0
              }
            >
              {canConfirmPropose && availableActionsType === "confirmPropose"
                ? "Duyệt"
                : "Xác nhận chuyển xử lý"}
            </Button>
            {canConfirmPropose &&
              availableActionsType === "confirmPropose" &&
              !isEditMode && (
                <StyleButtonOtherOpinions
                  type="button"
                  variant="secondary"
                  onClick={handleEditMode}
                >
                  Ý kiến khác
                </StyleButtonOtherOpinions>
              )}
            <Button type="button" variant="error" onClick={onCloseDialog}>
              Hủy bỏ thao tác
            </Button>
          </StyledDialogFooterButtons>
        </StyledDialogFooter>
      )}
    </StyleListUserBoxContainer>
  );
}

export default ListUnitsUser;
