import styled, { keyframes } from 'styled-components';
import Link from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimLink';

const skeletonKeyframe = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
`;

export const NewsWrapper = styled.div`
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
`;

export const Skeleton = styled.div`
  background: #eee;
  background-image: linear-gradient(90deg, #eee 0px, #f5f5f5 40px, #eee 80px);
  background-size: 200px 100%;
  animation: ${skeletonKeyframe} 1.5s infinite linear;
  width: ${({ $w }) => $w || '100%'};
  height: ${({ $h }) => $h || '16px'};
  margin-bottom: ${({ $mb }) => $mb || '0'};
  border-radius: ${({ $br }) => $br || '4px'};
`;

export const SkeletonFooter = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

export const NewsTitle = styled.h3`
  margin-top: 0;
`;

export const NewsContent = styled.p`
  color: #444;
`;

export const StyledLink = styled(Link)`
  text-decoration: none;
  color: inherit;
  display: block;
`;

export const NewsFooter = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 8px;
`;

export const LikeButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #eee;
  cursor: pointer;
  background: ${props => props.$liked ? "#ffecec" : "#fff"};
`;

export const LikeIcon = styled.span`
  color: ${props => props.$liked ? "#e53935" : "#666"};
  font-weight: 600;
`;

export const LikeCountValue = styled.span`
  color: #333;
`;

export const ReadCount = styled.div`
  color: #888;
`;
