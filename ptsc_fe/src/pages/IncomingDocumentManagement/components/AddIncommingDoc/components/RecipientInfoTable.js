import React, { useCallback, useState } from "react";
import {
  StyledTable,
  StyledTableContainer,
  StyledTableHead,
  StyledTableRow,
} from "@styles/CustomTable.styles";
import {
  CollapseHeader,
  HeaderTitle,
  RecipientCell,
  RecipientName,
  StatusBox,
  SubRow,
  SubChildRow,
  TimestampText,
  ToggleButton,
  StyledTableCell,
  FullWidthCollapse,
  TableBody,
  KeyboardArrowDownIcon,
  KeyboardArrowUpIcon,
  SkyFlexGap8,
  StyledIconWrapper,
  StytedDescriptionIcon,
} from "./RecipientInfoTable.styles";

const RecipientInfoTable = ({ data, disabledColDeadline, headerTitle, styledTextTransform }) => {
  const [openMain, setOpenMain] = useState(false);
  const [openRows, setOpenRows] = useState({});
  const [openSubRows, setOpenSubRows] = useState({});

  const handleToggleMain = useCallback(() => {
    setOpenMain((prev) => !prev);
  }, []);

  const handleToggleRow = useCallback((event) => {
    const index = event.currentTarget.dataset.index;
    if (index !== undefined) {
      setOpenRows((prev) => ({ ...prev, [index]: !prev[index] }));
    }
  }, []); // setOpenRows là hàm ổn định, không cần đưa vào dependencies

  const handleToggleSubRow = useCallback((event) => {
    const id = event.currentTarget.dataset.id;
    if (id !== undefined) {
      setOpenSubRows((prev) => ({ ...prev, [id]: !prev[id] }));
    }
  }, []);

  return (
    <>
      {/* Tiêu đề + nút thu gọn */}
      <CollapseHeader item onClick={handleToggleMain}>
        <SkyFlexGap8>
          <StyledIconWrapper>
            <StytedDescriptionIcon />
          </StyledIconWrapper>
          <HeaderTitle variant="h6" styledTextTransform={styledTextTransform}>{headerTitle || "THÔNG TIN GỬI NHẬN"}</HeaderTitle>
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
                <StyledTableCell align="center">STT</StyledTableCell>
                <StyledTableCell>Người nhận</StyledTableCell>
                <StyledTableCell>Thao tác</StyledTableCell>
                {!disabledColDeadline && (
                  <StyledTableCell>Hạn xử lý</StyledTableCell>
                )}
                <StyledTableCell>Ngày xử lý</StyledTableCell>
                <StyledTableCell>Trạng thái</StyledTableCell>
              </StyledTableRow>
            </StyledTableHead>
            <TableBody>
              {(data || []).map((row, i) => (
                <React.Fragment key={row.group || i}>
                  <StyledTableRow hover index={i}>
                    <StyledTableCell align="center">
                      <RecipientCell>
                        {Array.isArray(row.childs) && row.childs.length > 0 && (
                          <ToggleButton
                            size="small"
                            onClick={handleToggleRow}
                            data-index={i}
                          >
                            {openRows[i] ? (
                              <KeyboardArrowUpIcon />
                            ) : (
                              <KeyboardArrowDownIcon />
                            )}
                          </ToggleButton>
                        )}
                        <RecipientName isMain={row.roleProcess === "processor"}>
                          {row.createdByName || "-"}
                        </RecipientName>
                        <TimestampText variant="caption">
                          ({row.createdAt || "-"})
                        </TimestampText>
                      </RecipientCell>
                    </StyledTableCell>
                    <StyledTableCell></StyledTableCell>

                    <StyledTableCell>{row.action || "-"}</StyledTableCell>
                    {!disabledColDeadline && (
                      <StyledTableCell>{row.deadline || "-"}</StyledTableCell>
                    )}
                    <StyledTableCell>
                      {row.processedDate || "-"}
                    </StyledTableCell>
                    <StyledTableCell>
                      <StatusBox status={row.stageStatus}>
                        {row.stageStatus || "-"}
                      </StatusBox>
                    </StyledTableCell>
                  </StyledTableRow>
                  {/* Hàng con (childs) */}
                  {openRows[i] &&
                    Array.isArray(row.childs) &&
                    row.childs.length > 0 &&
                    row.childs.map((child, childIndex) => (
                      <React.Fragment key={child._id || childIndex}>
                        <SubRow>
                          <StyledTableCell align="center">
                            {childIndex + 1}
                          </StyledTableCell>
                          <StyledTableCell>
                            <RecipientCell>
                              {Array.isArray(child.childs) && child.childs.length > 0 && (
                                <ToggleButton
                                  size="small"
                                  onClick={handleToggleSubRow}
                                  data-id={child._id || childIndex}
                                >
                                  {openSubRows[child._id || childIndex] ? (
                                    <KeyboardArrowUpIcon />
                                  ) : (
                                    <KeyboardArrowDownIcon />
                                  )}
                                </ToggleButton>
                              )}
                              <RecipientName>
                                {child.receiver?.name || "-"}
                              </RecipientName>
                            </RecipientCell>
                          </StyledTableCell>
                          <StyledTableCell>{child.action || "-"}</StyledTableCell>
                          {!disabledColDeadline && (
                            <StyledTableCell>
                              {child.deadline || "-"}
                            </StyledTableCell>
                          )}
                          <StyledTableCell>
                            {child.processedDate || "-"}
                          </StyledTableCell>
                          <StyledTableCell>
                            <StatusBox status={child.stageStatus}>
                              {child.stageStatus || "-"}
                            </StatusBox>
                          </StyledTableCell>
                        </SubRow>

                        {/* Hàng cháu (sub-childs) */}
                        {openSubRows[child._id || childIndex] &&
                          Array.isArray(child.childs) &&
                          child.childs.length > 0 &&
                          child.childs.map((subChild, subIndex) => (
                            <SubChildRow key={subChild._id || `${childIndex}-${subIndex}`}>
                              <StyledTableCell align="center"></StyledTableCell>
                              <StyledTableCell>
                                <RecipientName>
                                  {subChild.receiver?.name || subChild.name || "-"}
                                </RecipientName>
                              </StyledTableCell>
                              <StyledTableCell>{subChild.action || "-"}</StyledTableCell>
                              {!disabledColDeadline && (
                                <StyledTableCell>
                                  {subChild.deadline || "-"}
                                </StyledTableCell>
                              )}
                              <StyledTableCell>
                                {subChild.processedDate || "-"}
                              </StyledTableCell>
                              <StyledTableCell>
                                <StatusBox status={subChild.stageStatus}>
                                  {subChild.stageStatus || "-"}
                                </StatusBox>
                              </StyledTableCell>
                            </SubChildRow>
                          ))}
                      </React.Fragment>
                    ))}
                </React.Fragment>
              ))}
            </TableBody>
          </StyledTable>
        </StyledTableContainer>
      </FullWidthCollapse>
    </>
  );
};

export default RecipientInfoTable;
