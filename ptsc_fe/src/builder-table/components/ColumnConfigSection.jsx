
import React from 'react';
import { Tooltip, Button } from '@mui/material';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { styled } from '@mui/material/styles';
import PropTypes from 'prop-types';

const ConfigButton = styled(Button)(({ theme }) => ({
  height: 40,
  width: 40,
  minWidth: '40px !important',
  padding: 0,
  marginLeft: theme.spacing(1.5),
  backgroundColor: theme.palette.mode === 'light' ? '#fff' : 'rgba(255, 255, 255, 0.05)',
  border: `1px solid ${theme.palette.mode === 'light' ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)'}`,
  borderRadius: "12px",
  color: theme.palette.mode === 'light' ? '#64748b' : '#fff',
  boxShadow: "none",
  '&:hover': {
    backgroundColor: theme.palette.mode === 'light' ? '#f8fafc' : 'rgba(255, 255, 255, 0.1)',
    borderColor: theme.palette.mode === 'light' ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)',
    boxShadow: "none",
  },
  "& .MuiSvgIcon-root": {
    fontSize: "22px",
  },
}));

const ColumnConfigSection = ({ onColumnConfigClick }) => {
  return (
    <ConfigButton
      onClick={onColumnConfigClick}
    >
      <Tooltip title="Cấu hình cột"><SettingsOutlinedIcon /></Tooltip>
    </ConfigButton>
  );
};

ColumnConfigSection.displayName = 'ColumnConfigSection';
ColumnConfigSection.propTypes = {
  onColumnConfigClick: PropTypes.func.isRequired,
  mode: PropTypes.string,
};

export default ColumnConfigSection;
