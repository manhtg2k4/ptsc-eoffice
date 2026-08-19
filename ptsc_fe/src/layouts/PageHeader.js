import React from 'react';
import { useSelector } from 'react-redux';
import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const HeaderContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2, 3),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
}));

const HeaderContainerTitle = styled(Typography)(() => ({
  fontWeight: 600
}));

const PageHeader = () => {
  const currentPageTitle = useSelector((state) => state.layout.currentPageTitle);

  if (!currentPageTitle) return null;

  return (
    <HeaderContainer>
      <HeaderContainerTitle variant="h5">
        {currentPageTitle}
      </HeaderContainerTitle>
    </HeaderContainer>
  );
};

export default PageHeader;