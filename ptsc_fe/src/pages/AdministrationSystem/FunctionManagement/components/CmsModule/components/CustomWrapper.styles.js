import scStyled, { keyframes } from 'styled-components';

const shimmer = keyframes`
  to {
    background-position-x: -200%;
  }
`;

export const SkeletonBox = scStyled.div`
  width: 100%;
  height: ${props => props.$h || '200px'};
  border-radius: 8px;
  background: #eee;
  background: linear-gradient(110deg, #ececec 8%, #f5f5f5 18%, #ececec 33%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s linear infinite;
`;

export const EmptyContainer = scStyled.div`
  padding: 20px;
  text-align: center;
  border: 1px dashed #ccc;
  color: #999;
  border-radius: 4px;
  background: #fafafa;
`;
