import { styled, css } from 'styled-components';

export const Container = styled.div`
  font-family: 'Inter', sans-serif;
  background: #ffffff;
  border-radius: 16px;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  padding: 16px;
  border: 1px solid #E2E8F0;

  @media (max-width: 1024px) {
    height: var(--height-tablet, 350px);
  }
`;

export const TabsHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  background: transparent;
  flex-shrink: 0;
  padding-bottom: 14px;
  border-bottom: 1px solid #E2E8F0;
`;

export const TabButton = styled.button`
  flex: 1;
  padding: 10px 16px;
  border: none;
  background: #F1F5F9;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  color: #475569;
  border-radius: 30px;
  transition: all 0.2s ease;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  svg {
    color: inherit;
  }

  &:hover {
    background: #E2E8F0;
  }

  ${({ $isActive }) => $isActive && css`
    color: #ffffff;
    background: #0056D2 !important;
    box-shadow: 0 2px 8px rgba(0, 86, 210, 0.25);
  `}
`;

export const TabDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  display: inline-block;
`;

export const TimelineContent = styled.div`
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  margin-top: 4px;
  position: relative;
  padding-right: 4px;
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.5) transparent;

  &::-webkit-scrollbar {
    width: 5px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.5);
    border-radius: 999px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(100, 116, 139, 0.7);
  }
`;

export const MarqueeWrapper = styled.div`
  display: flex;
  flex-direction: column;
`;

export const NewsItem = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 8px;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.15s ease;
  border-bottom: 1px solid #F1F5F9;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #F8FAFC;
    border-radius: 8px;

    h3 {
      color: #0056D2;
    }
  }
`;

export const ItemIconCircle = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #EBF3FF;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

export const Dot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #0056D2;
`;

export const NewsThumbnail = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: #f1f5f9;
`;

export const NewsImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export const ItemInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const ItemTitle = styled.h3`
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  color: #1E293B;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.2s ease;
`;

export const ItemDate = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: #8A94A6;
  font-size: 12px;
  font-weight: 500;

  svg {
    color: #8A94A6;
    flex-shrink: 0;
  }
`;

export const NoData = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #64748B;
  font-size: 14px;
`;

export const ThumbnailSkeleton = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 8px;
  background: #eee;
  background: linear-gradient(110deg, #ececec 8%, #f5f5f5 18%, #ececec 33%);
  background-size: 200% 100%;
  animation: shimmer 1.5s linear infinite;
  flex-shrink: 0;
`;

export const SkeletonItem = styled(NewsItem)`
  cursor: default;
  align-items: center;
  &:hover {
    background: transparent;
  }
`;

export const ItemIconCircleSkeleton = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #f1f5f9;
  background: linear-gradient(110deg, #ececec 8%, #f5f5f5 18%, #ececec 33%);
  background-size: 200% 100%;
  animation: shimmer 1.5s linear infinite;
  flex-shrink: 0;
`;

export const TitleSkeleton = styled.div`
  width: 90%;
  height: 14px;
  margin-bottom: 8px;
  background: #eee;
  background: linear-gradient(110deg, #ececec 8%, #f5f5f5 18%, #ececec 33%);
  border-radius: 4px;
  background-size: 200% 100%;
  animation: shimmer 1.5s linear infinite;

  @keyframes shimmer {
    to { background-position-x: -200%; }
  }
`;

export const DateSkeleton = styled.div`
  width: 40%;
  height: 12px;
  background: #eee;
  background: linear-gradient(110deg, #ececec 8%, #f5f5f5 18%, #ececec 33%);
  border-radius: 4px;
  background-size: 200% 100%;
  animation: shimmer 1.5s linear infinite;
`;

export const LoadMoreContainer = styled.div`
  display: none;
`;

export const LoadMoreBtn = styled.button`
  display: none;
`;

