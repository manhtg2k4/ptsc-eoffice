import React, { useState, useCallback } from 'react';
import {
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';

export default function RadioOptions() {
  const [applyOption, setApplyOption] = useState('');

  const handleChange = useCallback((e) => {
    setApplyOption(e.target.value);
  }, []);

  return (
    <div>

      <FormControl component="fieldset">
        <FormLabel component="legend">Chọn một tuỳ chọn</FormLabel>
        <RadioGroup
          value={applyOption}
          // onChange={(e) => setApplyOption(e.target.value)}
          onChange={handleChange}
        >
          <FormControlLabel
            value="current"
            control={<Radio />}
            label="Áp dụng cho phiên này"
          />
          <FormControlLabel
            value="next"
            control={<Radio />}
            label="Áp dụng lần sau"
          />
        </RadioGroup>
      </FormControl>
    </div>
  );
}
