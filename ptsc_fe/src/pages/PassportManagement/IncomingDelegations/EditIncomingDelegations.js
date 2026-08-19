import React from "react";
import PropTypes from "prop-types";

import AddIncomingDelegations from "./AddIncomingDelegations";

const EditIncomingDelegations = (props) => (
  <AddIncomingDelegations
    {...props}
    mode="edit"
    title={props.title || "Cập nhật đoàn vào"}
  />
);

EditIncomingDelegations.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  title: PropTypes.string,
};

export default EditIncomingDelegations;
