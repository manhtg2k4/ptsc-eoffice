import React from "react";
import { ToggleButton, ToggleButtonGroup, styled } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PropTypes from "prop-types";
import { arrCongDanOrDoanhNghiep } from "./constant";

const StyledToggleButton = styled(ToggleButton)(({ theme, selected }) => ({
    textTransform: "none",
    fontWeight: 600,
    padding: theme.spacing(1, 3),
    backgroundColor: selected ? `${theme.palette.primary.main} !important` : "white",
    color: selected ? `${theme.palette.primary.contrastText} !important` : "#666",
    boxShadow: selected ? "0px 2px 4px rgba(0, 0, 0, 0.2)" : "none",
    "&:hover": {
        backgroundColor: selected ? `${theme.palette.primary.main} !important` : "#e0e0e0",
    },
}));

const StyledCheckIcon = styled(CheckCircleIcon)(({ theme, selected }) => ({
    fontSize: 20,
    marginRight: theme.spacing(1),
    color: selected ? `${theme.palette.primary.contrastText} !important` : "#aaa",
}));

const StyledToggleButtonGroup = styled(ToggleButtonGroup)(({ theme }) => ({
    backgroundColor: theme.palette.grey[100],
    overflow: "hidden",
}));

const ToggleButtons = ({ value, handleChange }) => {
    const citizenValue = arrCongDanOrDoanhNghiep?.[0];
    const businessValue = arrCongDanOrDoanhNghiep?.[1];

    return (
        <StyledToggleButtonGroup
            value={value}
            exclusive
            onChange={handleChange}
        >
            {citizenValue && (
                <StyledToggleButton
                    value={citizenValue}
                    selected={value === citizenValue}
                >
                    <StyledCheckIcon selected={value === citizenValue} />
                    Công dân
                </StyledToggleButton>
            )}
            {businessValue && (
                <StyledToggleButton
                    value={businessValue}
                    selected={value === businessValue}
                >
                    <StyledCheckIcon selected={value === businessValue} />
                    Doanh nghiệp
                </StyledToggleButton>
            )}
        </StyledToggleButtonGroup>
    );
};

ToggleButtons.propTypes = {
    value: PropTypes.string.isRequired,
    handleChange: PropTypes.func.isRequired,
};

export default ToggleButtons;
