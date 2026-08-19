import React, { useCallback } from 'react'
import PropTypes from 'prop-types'
import { SIGN_TYPE_OPTIONS } from './constants';
import { Checkbox, FormControlLabel } from '@mui/material';
import { SignTypeCheckboxGroupContainer } from './componentStyle/AddDialog.style';

const SignTypeCheckboxGroup = ({ value, onChange, disabled }) => {
	const handleSignTypeChange = useCallback(
		(event) => {
			const { checked, value: nextValue } = event.target;
			onChange(checked ? nextValue : "");
		},
		[onChange]
	);

	return (
		<SignTypeCheckboxGroupContainer>
			{SIGN_TYPE_OPTIONS.map((option) => (
				<FormControlLabel
					key={option.value}
					label={option.label}
					control={
						<Checkbox
							size="small"
							value={option.value}
							checked={value === option.value}
							onChange={handleSignTypeChange}
							disabled={disabled}
						/>
					}
				/>
			))}
		</SignTypeCheckboxGroupContainer>
	);
};

SignTypeCheckboxGroup.propTypes = {
	value: PropTypes.string,
	onChange: PropTypes.func.isRequired,
	disabled: PropTypes.bool,
}

export default SignTypeCheckboxGroup