import * as React from "react";
import PropTypes from "prop-types";
import Tabs from "@mui/material/Tabs";

import Box from "@mui/material/Box";
import { useState, useRef, forwardRef, useImperativeHandle } from "react";
import {
  BoxTabCustom,
  TabCustom,
  WrapperTabCustom,
} from "@styles/TableContentCustom";

function CustomTabPanel({ children, value, index }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

CustomTabPanel.propTypes = {
  children: PropTypes.node,
  value: PropTypes.number.isRequired,
  index: PropTypes.number.isRequired,
};

const TabContentCustom = forwardRef(({ tabsData }, ref) => {
  const [value, setValue] = useState(0);
  const handleChange = (_event, newValue) => setValue(newValue);

  const contentRefs = useRef([]);

  useImperativeHandle(ref, () => ({
    getCurrentTabData: () => {
      if (contentRefs.current[value] && contentRefs.current[value].getData) {
        return contentRefs.current[value].getData();
      }
      return null;
    },
  }));

  return (
    <WrapperTabCustom>
      <BoxTabCustom>
        <Tabs value={value} onChange={handleChange} aria-label="custom tabs">
          {tabsData.map((tab, index) => (
            <TabCustom
              key={index}
              label={tab.label}
              id={`tab-${index}`}
              aria-controls={`tabpanel-${index}`}
            />
          ))}
        </Tabs>
      </BoxTabCustom>
      {tabsData.map((tab, index) => (
        <CustomTabPanel key={index} value={value} index={index}>
          {React.cloneElement(tab.content, {
            ref: (el) => (contentRefs.current[index] = el),
          })}
        </CustomTabPanel>
      ))}
    </WrapperTabCustom>
  );
});

TabContentCustom.propTypes = {
  tabsData: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      content: PropTypes.node.isRequired,
    })
  ).isRequired,
};

TabContentCustom.displayName = "TabContentCustom";

export default TabContentCustom;
