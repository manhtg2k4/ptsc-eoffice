import React, { useCallback } from "react";
import { Stepper, useMediaQuery, Tooltip } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import PropTypes from "prop-types";
import {
  ActiveStepTitleContainer,
  BpmnStepIconCircle,
  BpmnStepIconRoot,
  BoldTypography,
  InteractiveStep,
  InteractiveStepLabel,
  StyleStepperContainer,
  StyleStepperMoreUser,
  StyleStepperUser,
  StyleStepperUserContainer,
  StyleStepperUserInTooltip,
} from "@styles/CustomStepper.styles";

const BpmnStepIcon = (props) => {
  const { active, completed, icon, disabled } = props;

  return (
    <BpmnStepIconRoot active={active} completed={completed} disabled={disabled}>
      <BpmnStepIconCircle
        active={active}
        completed={completed}
        disabled={disabled}
      >
        {icon}
      </BpmnStepIconCircle>
    </BpmnStepIconRoot>
  );
};

BpmnStepIcon.propTypes = {
  active: PropTypes.bool,
  completed: PropTypes.bool,
  icon: PropTypes.node,
  disabled: PropTypes.bool,
};

const CustomStepper = ({
  steps,
  activeStep,
  onStepClick,
  alternativeLabel = true,
  showMobileTitle = true,
  mobileBreakpoint = 768,
  disabledSteps = {},
  selectedUsersByStep = {},
  visualVariant = "default",
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down(mobileBreakpoint));

  const handleStepClick = useCallback(
    (index) => () => {
      // Không cho click nếu step bị disabled
      if (disabledSteps[index]) {
        return;
      }
      if (onStepClick) {
        onStepClick(index);
      }
    },
    [onStepClick, disabledSteps]
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

  return (
    <StyleStepperContainer
      selectedUsersByStep={selectedUsersByStep}
      alternativeLabel={alternativeLabel}
      visualVariant={visualVariant}
    >
      <Stepper activeStep={activeStep} alternativeLabel={alternativeLabel}>
        {steps.map((item, index) => {
          const isActive = item?.curWorkItem && !item?.completed;
          const isCurrentStep = index === activeStep;
          const isCompleted = item?.completed || index < activeStep;
          const isDisabled = disabledSteps[index];
          const stepLabel = item?.label || item;
          const stepActive =
            visualVariant === "bpmnEdit" ? isCurrentStep : isActive;

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

          return (
            <InteractiveStep
              key={item?.id || item}
              active={stepActive}
              completed={isCompleted}
              onClick={isDisabled ? undefined : handleStepClick(index)}
              disabled={isDisabled}
              alternativeLabel={alternativeLabel}
              visualVariant={visualVariant}
            >
              <InteractiveStepLabel
                isActive={stepActive}
                isCurrentStep={isCurrentStep}
                canSelect={!isDisabled}
                hasSelectedUsers={selectedUsers.length > 0}
                isCompleted={isCompleted}
                alternativeLabel={alternativeLabel}
                visualVariant={visualVariant}
                StepIconComponent={
                  visualVariant === "bpmnEdit" ? BpmnStepIcon : undefined
                }
              >
                {stepLabel}
              </InteractiveStepLabel>

              {/* Chip người được chọn - dùng absolute để không ảnh hưởng layout step */}
              {!alternativeLabel && selectedUsers.length > 0 && (
                <StyleStepperUserContainer>
                  {/* Hiển thị tối đa 2 người */}
                  {selectedUsers.slice(0, 1).map((user) => {
                    const displayName = getUserDisplayName(user);

                    return (
                      <Tooltip
                        key={user.userId || user._id || user.id}
                        title={displayName}
                        arrow
                        placement="bottom"
                      >
                        <StyleStepperUser>{displayName}</StyleStepperUser>
                      </Tooltip>
                    );
                  })}
                  {/* Nếu có hơn 2 người, hiển thị ... với tooltip */}
                  {selectedUsers.length > 1 && (
                    <Tooltip
                      title={
                        <StyleStepperUserInTooltip>
                          {selectedUsers.slice(1).map((user) => (
                            <span key={user.userId || user._id || user.id}>
                              {getUserDisplayName(user)}
                            </span>
                          ))}
                        </StyleStepperUserInTooltip>
                      }
                      arrow
                      placement="bottom"
                    >
                      <StyleStepperMoreUser>
                        +{selectedUsers.length - 1} người khác
                      </StyleStepperMoreUser>
                    </Tooltip>
                  )}
                </StyleStepperUserContainer>
              )}
            </InteractiveStep>
          );
        })}
      </Stepper>

      {/* Hiển thị tên của step đang active ở bên dưới và căn giữa trên mobile */}
      {showMobileTitle && isSmallScreen && (
        <ActiveStepTitleContainer>
          <BoldTypography variant="h6" component="div">
            {steps[activeStep]?.label || steps[activeStep]}
          </BoldTypography>
        </ActiveStepTitleContainer>
      )}
    </StyleStepperContainer>
  );
};

CustomStepper.propTypes = {
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
  visualVariant: PropTypes.oneOf(["default", "bpmnEdit"]),
};

export default CustomStepper;
