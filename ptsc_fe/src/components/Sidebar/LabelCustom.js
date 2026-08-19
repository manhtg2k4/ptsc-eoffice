import React from "react";
import PropTypes from "prop-types";
import { LabelContainer, LabelText, ValueText } from "@styles/LabelCustom.styles";

const LabelCustom = ({ label, value }) => {
  return (
    <LabelContainer>
      <LabelText>{label}:</LabelText>
      <ValueText>{value}</ValueText>
    </LabelContainer>
  );
};

LabelCustom.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
};

export default LabelCustom;