import { Delete } from "@mui/icons-material";
import { TableBody, Tooltip } from "@mui/material";
import { StyledTableCell } from "@styles/CustomTable.styles";
import { Controller } from "react-hook-form";
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
  StyledDialogFooter,
  StyledDialogFooterButtons,
  StyledInputFullWidth,
  OpinionHeader,
  OpinionTitle,
  OpinionArea,
  StyledSendIcon,
} from "@styles/DialogDirective";

import React from "react";

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
    isSuggestion,
    hideFooter,
    enableInlineFooter,
  } = props;

  const handleCheckboxClick = React.useCallback(
    (event) => {
      const { assignmentKey } = event.currentTarget.dataset;

      if (assignmentKey) {
        removeAssignment(assignmentKey);
      }
    },
    [removeAssignment]
  );

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
                  <StyledNameTextHeader>Vai trò</StyledNameTextHeader>
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
                      <StyledTableCellMedium roleColor={getRoleColor(item.role)}>{(item.role)}</StyledTableCellMedium>
                      <StyledTableCellSmall>
                        <Tooltip title="Xóa">
                          <StyledDeleteButton
                            data-assignment-key={item.key}
                            onClick={handleCheckboxClick}
                          >
                            <Delete />
                          </StyledDeleteButton>
                        </Tooltip >
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
            {isSuggestion ? "Ý kiến chỉ đạo xử lý" : "Nội dung xử lý"}
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
                placeholder="Nhập nội dung chỉ đạo tại đây..."
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
              disabled={!assignedList || assignedList.length === 0 || deadlineError}
            >
              Xác nhận chuyển xử lý
            </Button>
            <Button type="button" variant="error" onClick={onCloseDialog}>Hủy bỏ thao tác</Button>
          </StyledDialogFooterButtons>
        </StyledDialogFooter>
      )}
    </StyleListUserBoxContainer>
  );
}

export default ListUnitsUser;
