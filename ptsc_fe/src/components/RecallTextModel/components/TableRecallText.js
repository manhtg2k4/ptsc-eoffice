/* eslint-disable react-hooks/exhaustive-deps */
import React from "react";
import PropTypes from "prop-types";
import { TableBody } from "@mui/material";
import { styled } from "@mui/material/styles";
import { SkyBox, SkyTypography } from "@styles/SkyStyles";
import { UserInitialAvatar } from "@styles/Navbar.styles";
import {
  StyledCheckbox,
  StyledRow,
  StyledTableCellLarge,
  StyledTableCellMedium,
  StyledTableContainer1,
  StyledTable,
  StyledTableHead,
  StyledTableRow,
} from "@styles/DialogDirective";

const RecallTableContainer = styled(StyledTableContainer1)(({ theme }) => ({
  marginTop: 0,
  "& .MuiTable-root": {
    borderCollapse: "collapse",
  },
  "& thead .MuiTableRow-root": {
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  "& thead .MuiTableCell-root": {
    borderBottom: "none !important",
    padding: "12px 18px !important",
  },
  "& thead .MuiTableCell-root:first-of-type": {
    paddingLeft: "18px !important",
  },
  "& thead .MuiTableCell-root:last-of-type": {
    paddingRight: "18px !important",
  },
  "& thead .MuiTableCell-root:last-of-type, & tbody .MuiTableCell-root:last-of-type": {
    width: "130px !important",
    minWidth: "130px !important",
    maxWidth: "130px !important",
  },
  "& tbody .MuiTableCell-root": {
    padding: "10px 18px !important",
    borderBottom: "none !important",
  },
}));

const HeaderText = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontSize: 14,
  fontWeight: 700,
}));

const HeaderActionText = styled(HeaderText)(() => ({
  textAlign: "right",
  whiteSpace: "nowrap",
}));

const UserInfoBox = styled(SkyBox)(() => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  minWidth: 0,
}));

const UserAvatar = styled(UserInitialAvatar)(({ theme }) => ({
  width: 28,
  height: 28,
  flexShrink: 0,
  fontSize: 12,
  color: theme.palette.primary.main,
  backgroundColor: theme.palette.action.selected,
}));

const UserTextBox = styled(SkyBox)(() => ({
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
}));

const UserName = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1.25,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}));

const UserPosition = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: 12,
  lineHeight: 1.25,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}));

const getAvatarSrc = (item) => {
  if (Array.isArray(item?.avatar)) return item.avatar[0];
  return item?.avatar || item?.avatarUrl || item?.image || item?.photo || "";
};

const getInitials = (name = "") => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return `${words[0].charAt(0)}${words[words.length - 1].charAt(0)}`.toUpperCase();
};

// ===== Row component (không phân cấp) =====
const Row = React.memo(
  ({ item, isChecked, handleCheckboxChange }) => {
    const checked = isChecked(item, "traLai");
    const avatarSrc = getAvatarSrc(item);

    const handleChange = (e) => {
      handleCheckboxChange(item, "traLai", e.target.checked);
    };

    return (
      <StyledRow hover>
        <StyledTableCellLarge>
          <UserInfoBox>
            <UserAvatar
              username={item?.name}
              imageUrl={avatarSrc || undefined}
              size={28}
            >
              {!avatarSrc && getInitials(item?.name)}
            </UserAvatar>
            <UserTextBox>
              <UserName>{item.name}</UserName>
              {item.position && <UserPosition>{item.position}</UserPosition>}
            </UserTextBox>
          </UserInfoBox>
        </StyledTableCellLarge>

        <StyledTableCellMedium align="center">
          <StyledCheckbox checked={checked} onChange={handleChange} />
        </StyledTableCellMedium>
      </StyledRow>
    );
  },
  (prev, next) => prev.isChecked === next.isChecked
);
Row.displayName = "Row";
// ===== TableRecallText component =====
const TableRecallText = ({
  data,
  isChecked,
  handleCheckboxChange,
  label = "Phòng ban",
  customHeight,
  customMinHeight,
}) => {
  return (
    <RecallTableContainer
      customHeight={customHeight}
      customMinHeight={customMinHeight}
      noBorder
    >
      <StyledTable stickyHeader>
        <StyledTableHead>
          <StyledTableRow>
            <StyledTableCellLarge>
              <HeaderText>{label}</HeaderText>
            </StyledTableCellLarge>
            <StyledTableCellMedium>
              <HeaderActionText>Áp dụng cho</HeaderActionText>
            </StyledTableCellMedium>
          </StyledTableRow>
        </StyledTableHead>

        <TableBody>
          {data?.map((item) => (
            <Row
              key={item._id || item.id}
              item={item}
              isChecked={isChecked}
              handleCheckboxChange={handleCheckboxChange}
            />
          ))}
        </TableBody>
      </StyledTable>
    </RecallTableContainer>
  );
};

TableRecallText.propTypes = {
  data: PropTypes.array,
  isChecked: PropTypes.func.isRequired,
  handleCheckboxChange: PropTypes.func.isRequired,
};

export default React.memo(TableRecallText);
