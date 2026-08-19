import React, { useMemo } from "react";
import { Radio } from "@mui/material";
import PropTypes from "prop-types";
import {
  FilterCalendarContainer,
  StyledRadioGroup,
  StyledFormControlLabel,
} from "./FilterCalendarSection.styles";

const FilterCalendarSection = ({ fields, onCalendarChange, currentFilters }) => {
  const calendarFields = useMemo(() => {
    return fields?.filter((field) => field.showFilterCalendar) || [];
  }, [fields]);

  const currentValue = useMemo(() => {
    const typeValue = currentFilters.type;
    const firstFieldKey = calendarFields[0]?.key || calendarFields[0]?.name;

    if (!typeValue) return firstFieldKey;

    const isValidCalendarField = calendarFields.some(
      (field) => (field.key || field.name) === typeValue
    );

    return isValidCalendarField ? typeValue : firstFieldKey;
  }, [calendarFields, currentFilters.type]);

  // useEffect(() => {
  //   if (currentValue && currentFilters.type !== currentValue) {
  //     onCalendarChange(currentValue);
  //   }
  // }, [currentValue, currentFilters.type, onCalendarChange]);

  if (calendarFields.length === 0) return null;

  const handleRadioChange = (event) => {
    const value = event.target.value;
    onCalendarChange(value);
  };

  return (
    <FilterCalendarContainer>
      <StyledRadioGroup value={currentValue} onChange={handleRadioChange}>
        {calendarFields.map((field) => {
          const key = field.key || field.name;
          return (
            <StyledFormControlLabel
              key={key}
              value={key}
              control={<Radio size="small" />}
              label={field.label}
            />
          );
        })}
      </StyledRadioGroup>
    </FilterCalendarContainer>
  );
};

FilterCalendarSection.propTypes = {
  fields: PropTypes.array,
  onCalendarChange: PropTypes.func.isRequired,
  currentFilters: PropTypes.object,
};

FilterCalendarSection.defaultProps = {
  fields: [],
  currentFilters: {},
};

export default FilterCalendarSection;
