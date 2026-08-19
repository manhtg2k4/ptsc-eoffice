import { AccountCircle, Home } from "@mui/icons-material";
import { TableBody } from "@mui/material";
import { StyledTableCell } from "@styles/CustomTable.styles";
import {
  IconWrapper,
  StyleBoxFoodter,
  StyledActionButton,
  StyledCheckbox,
  StyledNameText,
  StyledNameTextHeader,
  StyledRowBox,
  StyledTable,
  StyledTableCellLarge,
  StyledTableCellMedium,
  StyledTableCellSmall,
  StyledTableHead,
  StyledTableRow,
  StyleListUserBoxContainer,
  StyleAssignmentsTableWrapper,
  StyledAssignmentsTableContainer,
  StyledDialogFooter,
  StyledDialogFooterButtons,
  StyledInputFullWidth,
} from "@styles/DialogDirective";

import React from "react";
import { Controller } from "react-hook-form";

function ListUnitsUser(props) {
  const {
    assignedList,
    Input,
    // Button,
    DatePicker,
    removeAssignment,
    onCloseDialog,
    handleSubmit,
    control,
    // getRoleColor,
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
            <StyledTableHead>
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
                <StyledTableCellMedium>
                  <StyledNameTextHeader>Bỏ chọn</StyledNameTextHeader>
                </StyledTableCellMedium>
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
                        <IconWrapper>
                          {item.unitType === "user" ? (
                            <AccountCircle />
                          ) : (
                            <Home />
                          )}
                          <StyledNameText variant="body2">
                            {item.name}
                          </StyledNameText>
                        </IconWrapper>
                      </StyledTableCellLarge>
                      <StyledTableCellMedium>{item.role}</StyledTableCellMedium>
                      <StyledTableCellMedium>
                        <StyledCheckbox
                          data-assignment-key={item.key}
                          checked={item.chiDao || item.phoi || item.nhanDeBiet}
                          onClick={handleCheckboxClick}
                        />
                      </StyledTableCellMedium>
                    </StyledTableRow>
                  );
                })
              )}
            </TableBody>
          </StyledTable>
        </StyledAssignmentsTableContainer>
      </StyleAssignmentsTableWrapper>
      <StyledDialogFooter>
        <StyledInputFullWidth>
          <Controller
            name="content"
            control={control}
            render={({ field }) => (
              <Input label="Nội dung xử lý" multiline rows={4} {...field} />
            )}
          />
        </StyledInputFullWidth>

        <StyleBoxFoodter>
          <StyledRowBox>
            <Controller
              name="deadlineReply"
              control={control}
              render={({ field }) => (
                <DatePicker futureOnly label="Hạn xử lý" {...field} />
              )}
            />
          </StyledRowBox>

          <StyledDialogFooterButtons>
            <StyledActionButton
              variant="primary"
              onClick={handleSubmit}
              disabled={!assignedList || assignedList.length === 0}
            >
              Lưu
            </StyledActionButton>
            <StyledActionButton variant="secondary" onClick={onCloseDialog}>Đóng</StyledActionButton>
          </StyledDialogFooterButtons>
        </StyleBoxFoodter>
      </StyledDialogFooter>
    </StyleListUserBoxContainer>
  );
}

export default ListUnitsUser;
