import React, { useCallback, useState } from "react";
import { Tooltip } from "@mui/material";
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

import PropTypes from "prop-types";
import {
  // ActiveStepTitleContainer,
  // BoldTypography,
  StyleStepperContainer,
  StyleStepperMoreUser,
  StyleStepperUser,
  StyleStepperUserContainer,
  StyleStepperUserInTooltip,
  StepperWrapper,
  StepItemContainer,
  DiamondConnector,
  DiamondShape,
  DiamondContent,
  StepNumber,
  StepIconBox,
  StepLabelText,
} from "@styles/CustomSteppers.styles";

const CustomSteppers = ({
  steps,
  activeStep,
  onStepClick,
  alternativeLabel = true,
  // showMobileTitle = true,
  // mobileBreakpoint = 768,
  disabledSteps = {},
  selectedUsersByStep = {},
}) => {
  const [expandedSteps, setExpandedSteps] = useState({});
  // const theme = useTheme();
  // const isSmallScreen = useMediaQuery(theme.breakpoints.down(mobileBreakpoint));

  const handleStepClick = useCallback(
    (index) => () => {
      if (disabledSteps[index]) {
        return;
      }
      if (onStepClick) {
        onStepClick(index);
      }
    },
    [onStepClick, disabledSteps]
  );

  const handleToggleExpandUsers = useCallback(
    (stepIdOrIndex, expand) => (e) => {
      e.stopPropagation();
      setExpandedSteps((prev) => ({
        ...prev,
        [stepIdOrIndex]: expand,
      }));
    },
    []
  );

  const getStepSelectedUsers = (item, selectedUsersByStepMap) => {
    if (!item || !selectedUsersByStepMap) return null;
    const candidates = [
      item?.action,
      item?.lane,
      item?.id,
      item?.key,
      item?.label,
      item?.name,
      item?.title,
    ].filter(Boolean);
    for (const k of candidates) {
      if (
        Object.prototype.hasOwnProperty.call(selectedUsersByStepMap, k) &&
        selectedUsersByStepMap[k] !== undefined
      ) {
        return selectedUsersByStepMap[k];
      }
    }
    return null;
  };

  const getUserDisplayName = useCallback(
    (user) => user?.name || user?.userName || user?.username || "",
    []
  );

  const getStepIcon = (isSelected, isCompleted, isProcessing, canSelect) => {
    if (isCompleted) return <CheckCircleOutlineIcon />;
    if (isSelected || canSelect) return <DescriptionOutlinedIcon />;
    if (isProcessing) return <ErrorOutlineIcon />; // Use warning icon for processing
    return <ErrorOutlineIcon />;
  };

  return (
    <StyleStepperContainer
            selectedUsersByStep={selectedUsersByStep}
            alternativeLabel={alternativeLabel}
    >
      <StepperWrapper>
        {steps.map((item, index) => {
          const isSelected = index === activeStep;
          const isCompleted = item.completed === true;
          const isProcessing = item.curWorkItem && !item.completed;
          const isExpandedUsers = !!expandedSteps[item.id || index];
          const isDisabled = disabledSteps[index];
          const canSelect = !isDisabled && !isCompleted && !isProcessing;
          const isLast = index === steps.length - 1;

          // Lấy danh sách người xử lý của step:
          // Khi đã có lựa chọn cho step trong selectedUsersByStep, thay thế hoàn toàn dữ liệu cũ của step
          const fromAssigned = (item?.assigned || []).map((u) => ({
            ...u,
            name: u?.name || u?.userName || u?.username || "",
          }));

          const userSelection = getStepSelectedUsers(item, selectedUsersByStep);
          let selectedUsers = [];

          if (userSelection !== null) {
            const selectionArray = Array.isArray(userSelection)
              ? userSelection
              : [userSelection];
            selectedUsers = selectionArray.map((u) => {
              const uId = u?.userId || u?._id || u?.id;
              const matchedAssigned = fromAssigned.find(
                (au) => (au?.userId || au?._id || au?.id) === uId
              );
              return matchedAssigned
                ? {
                    ...matchedAssigned,
                    ...u,
                    name:
                      u?.name ||
                      u?.userName ||
                      matchedAssigned?.name ||
                      matchedAssigned?.userName ||
                      "",
                  }
                : {
                    ...u,
                    name: u?.name || u?.userName || u?.username || "",
                  };
            });
          } else {
            selectedUsers = fromAssigned;
          }

          // Cầu nối màu xanh nếu step kế tiếp đã hoàn thành hoặc đang xử lý
          const isConnectorCompleted = isCompleted || (index < activeStep);

          const stepDisplayNumber = String(index + 1).padStart(2, '0');

          return (
            <StepItemContainer key={item.id || index}>
              {!isLast && (
                <DiamondConnector isCompleted={isConnectorCompleted} />
              )}

              <StepLabelText 
                isSelected={isSelected} 
                isCompleted={isCompleted}
                isProcessing={isProcessing}
                canSelect={canSelect}
              >
                {item?.label || item?.name}
              </StepLabelText>
              
              <DiamondShape
                isSelected={isSelected}
                isCompleted={isCompleted}
                isProcessing={isProcessing}
                canSelect={canSelect}
                disabled={isDisabled}
                onClick={isDisabled ? undefined : handleStepClick(index)}
              >
                <DiamondContent 
                  isSelected={isSelected} 
                  isCompleted={isCompleted}
                  isProcessing={isProcessing}
                  canSelect={canSelect}
                >
                  <StepNumber>{stepDisplayNumber}</StepNumber>
                  <StepIconBox>
                    {getStepIcon(isSelected, isCompleted, isProcessing, canSelect)}
                  </StepIconBox>
                </DiamondContent>
              </DiamondShape>

              {/* Chip người được chọn */}
              {selectedUsers.length > 0 && (
                <StyleStepperUserContainer>
                  {(isExpandedUsers ? selectedUsers : selectedUsers.slice(0, 5)).map((user) => {
                    const displayName = getUserDisplayName(user);
										const isSigned = [user.isSigned, user["is-signed"], user.is_signed].some(value => value == 1);

                    return (
                      <Tooltip
                        key={user.userId || user._id || user.id}
                        title={displayName}
                        arrow
                        placement="bottom"
                      >
                        <StyleStepperUser 
                          isSigned={isSigned}
                          isCompleted={isCompleted}
                          isProcessing={isProcessing}
                          isActive={isSelected || canSelect}
                        >
                          {displayName}
                        </StyleStepperUser>
                      </Tooltip>
                    );
                  })}
                  {!isExpandedUsers && selectedUsers.length > 5 && (
                    <Tooltip
                      title={
                        <StyleStepperUserInTooltip>
                          {selectedUsers.slice(5).map((user) => (
                            <span key={user.userId || user._id || user.id}>
                              {getUserDisplayName(user)}
                            </span>
                          ))}
                        </StyleStepperUserInTooltip>
                      }
                      arrow
                      placement="bottom"
                    >
                      <StyleStepperMoreUser
                        onClick={handleToggleExpandUsers(item.id || index, true)}
                      >
                        +{selectedUsers.length - 5} người khác
                      </StyleStepperMoreUser>
                    </Tooltip>
                  )}
                  {isExpandedUsers && selectedUsers.length > 5 && (
                    <StyleStepperMoreUser
                      onClick={handleToggleExpandUsers(item.id || index, false)}
                    >
                      - Thu gọn -
                    </StyleStepperMoreUser>
                  )}
                </StyleStepperUserContainer>
              )}
            </StepItemContainer>
          );
        })}
      </StepperWrapper>

      {/* {showMobileTitle && isSmallScreen && (
        <ActiveStepTitleContainer>
          <BoldTypography variant="h6" component="div">
            {steps[activeStep]?.label || steps[activeStep]}
          </BoldTypography>
        </ActiveStepTitleContainer>
      )} */}
    </StyleStepperContainer>
  );
};

CustomSteppers.propTypes = {
  steps: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        action: PropTypes.string,
        label: PropTypes.string,
        curWorkItem: PropTypes.bool,
        completed: PropTypes.bool,
      }),
    ])
  ).isRequired,
  activeStep: PropTypes.number.isRequired,
  onStepClick: PropTypes.func,
  alternativeLabel: PropTypes.bool,
  showMobileTitle: PropTypes.bool,
  mobileBreakpoint: PropTypes.number,
  disabledSteps: PropTypes.object,
  selectedUsersByStep: PropTypes.object,
};

export default CustomSteppers;
