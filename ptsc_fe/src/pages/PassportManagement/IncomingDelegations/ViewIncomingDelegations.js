import React from "react";
import PropTypes from "prop-types";

import AddIncomingDelegations from "./AddIncomingDelegations";

const ViewIncomingDelegations = (props) => (
  <AddIncomingDelegations
    {...props}
    mode="view"
    title={props.title || "Chi tiết đoàn vào"}
  />
);

ViewIncomingDelegations.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  title: PropTypes.string,
};

export default ViewIncomingDelegations;
