import React from "react";
import PropTypes from "prop-types";
import {
  SectionGrid,
  SectionHeaderV2,
  SectionTitleV2,
} from "@pages/TextAway/Tab/SigningSubmissionTab/componentStyle/AddDialog.style";
import { Tooltip } from "@mui/material";
import {
  KeyboardArrowDownIcon,
  KeyboardArrowUpIcon,
} from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/RecipientInfoTable.styles";
import {
  StyledIconKeyboardArrow,
  SectionHeaderSecondary,
  SectionTitleSecondary,
  StyledCountBadge,
  StyledSecondaryLabelBox,
  StyledStackActions,
} from "@styles/UploadFile/UploadFile.style";
import Button from "@components/CustomButtonBorder";

const SectionHeaderToggle = ({
  title,
  isOpen,
  onClick,
  dataSection,
  openIconProp,
  closeIconProp,
  titleButton,
  onButtonClick,
  flags,
  files,
  noneMarginTop,
  customTitle,
  children,
  useSecondaryLayout = false,
  icon,
  count,
}) => {
  const OpenIcon = openIconProp || KeyboardArrowUpIcon;
  const CloseIcon = closeIconProp || KeyboardArrowDownIcon;

  if (useSecondaryLayout) {
    return (
      <SectionHeaderSecondary>
        <StyledSecondaryLabelBox>
          {icon}
          <SectionTitleSecondary hasIcon={!!icon}>
            {title}
          </SectionTitleSecondary>
          {count !== undefined && (
            <StyledCountBadge>
              {count} tệp
            </StyledCountBadge>
          )}
        </StyledSecondaryLabelBox>
        
        <StyledStackActions>
          {children}
          <Tooltip title={isOpen ? "Thu gọn" : "Mở rộng"}>
            <StyledIconKeyboardArrow
              size="small"
              data-section={dataSection || null}
              onClick={onClick}
            >
              {isOpen ? <OpenIcon /> : <CloseIcon />}
            </StyledIconKeyboardArrow>
          </Tooltip>
        </StyledStackActions>
      </SectionHeaderSecondary>
    );
  }

  return (
    <SectionHeaderV2>
      <SectionGrid noneMarginTop={noneMarginTop} item xs={12}>
        {customTitle ? (
          customTitle
        ) : title ? (
          <SectionTitleV2>{title}</SectionTitleV2>
        ) : null}

        {flags && files?.length > 0 && titleButton && onButtonClick && (
          <Button onClick={onButtonClick}>{titleButton}</Button>
        )}
        {children}
      </SectionGrid>

      <Tooltip title={isOpen ? "Thu gọn" : "Mở rộng"}>
        <StyledIconKeyboardArrow
          size="small"
          data-section={dataSection || null}
          onClick={onClick}
        >
          {isOpen ? <OpenIcon /> : <CloseIcon />}
        </StyledIconKeyboardArrow>
      </Tooltip>
    </SectionHeaderV2>
  );
};

SectionHeaderToggle.propTypes = {
  title: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  dataSection: PropTypes.string.isRequired,
  openIconProp: PropTypes.elementType,
  closeIconProp: PropTypes.elementType,
  draftFiles: PropTypes.array,
  documentDetail: PropTypes.object,
  titleButton: PropTypes.string,
  onButtonClick: PropTypes.func,
  noneMarginTop: PropTypes.bool,
  customTitle: PropTypes.node,
};

export default SectionHeaderToggle;
