import styled from "styled-components";
import { SkyBox, SkyTypography, SkyLink } from "@styles/SkyStyles";

export const BreadcrumbBar = styled(SkyBox)`
  display: flex;
  align-items: center;
  padding: 16px 24px;
  background-color: #f8f9fa;
  gap: 12px;
`;

export const StyledBreadcrumbLink = styled(SkyLink)`
  font-weight: 500;
  color: #1976d2;
  text-decoration: none;
  cursor: pointer;
  text-transform: uppercase;
  font-size: 0.9rem;
  
  &:hover {
    text-decoration: underline;
  }
`;

export const StyledActiveBreadcrumb = styled(SkyTypography)`
  font-weight: 700;
  color: #333;
  text-transform: uppercase;
  font-size: 0.9rem;
`;

export const BackButton = styled(SkyBox)`
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #1976d2;
  margin-right: 8px;
  
  &:hover {
    color: #1565c0;
  }
`;

export const Container = styled(SkyBox)`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
`;

export const ContentArea = styled(SkyBox)`
  flex: 1;
  overflow: auto;
  padding: 0;
`;
