import { styled, css } from 'styled-components';

export const Container = styled.div`
  max-width: 1550px;
  // margin: 0 auto;
  // padding-top: 20px;
  // margin-top: 20px;
  border-top: 1px solid #e2e8f0;
  font-family: 'Be Vietnam Pro', -apple-system, sans-serif;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;

  @media (max-width: 640px) {
    padding: 24px 16px;
    margin-top: 20px;
  }
`;

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-top: 40px;

  @media (max-width: 640px) {
    margin-bottom: 20px;
    gap: 8px;
  }
`;

export const TitleBox = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;

  h2 {
    font-size: 28px;
    font-weight: 700;
    background: linear-gradient(90deg, #20AAEC 0%, #5567CC 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    color: transparent;
    margin: 0;
    letter-spacing: -0.5px;

    @media (max-width: 640px) {
      font-size: 18px;
    }
  }

  @media (max-width: 640px) {
    gap: 10px;
  }
`;

export const IconBox = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;

  @media (max-width: 640px) {
    width: 32px;
    height: 32px;
    
    svg {
      width: 20px;
      height: 20px;
    }
  }
`;

export const ViewAllBtn = styled.button`
  background: none;
  border: none;
  color: #64748b;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s;
  white-space: nowrap;

  &:hover {
    color: #2563eb;
  }

  @media (max-width: 640px) {
    font-size: 12px;
  }
`;

export const TopicsBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 10px;

  @media (max-width: 640px) {
    margin-bottom: 24px;
    gap: 8px;
  }
`;

export const TopicPill = styled.button`
  padding: 10px 24px;
  border-radius: 100px;
  background: #E9EBF5;
  color: rgb(152,170,196);
  font-size: 14px;
  font-weight: 500;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;

  &:hover {
    background: linear-gradient(90deg, #4DA2F1 0%, #3E63E2 100%);
    color: #fff;
    box-shadow: 0 8px 15px -5px rgba(66, 100, 226, 0.4);
  }

  ${({ $isActive }) => $isActive && css`
    background: linear-gradient(90deg, #4DA2F1 0%, #3E63E2 100%);
    color: #fff;
    box-shadow: 0 10px 20px -5px rgba(66, 100, 226, 0.4);

    &:hover {
      opacity: 0.9;
    }
  `}

  @media (max-width: 640px) {
    padding: 8px 16px;
    font-size: 13px;
  }
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
  transition: opacity 0.3s ease;
  min-height: 400px;

  ${({ $isLoading }) => $isLoading && css`
    opacity: 0.6;
    pointer-events: none;
  `}

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 24px;
  }
`;

export const CardImg = styled.div`
  width: 100%;
  aspect-ratio: 4/3;
  border-radius: 24px;
  overflow: hidden;
  margin-bottom: 20px;
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.1);
  background: #fff;
  border: 1px solid #f1f5f9;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }
`;

export const CardTitle = styled.h3`
  font-size: 18px;
  font-weight: 400;
  color: #334155;
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.2s;
`;

export const Card = styled.div`
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-8px);
    
    ${CardTitle} {
      color: #3b82f6;
    }
    
    ${CardImg} img {
      transform: scale(1.1);
    }
  }
`;

export const NewTag = styled.span`
  color: #f59e0b;
  font-weight: 700;
  margin-right: 6px;
`;

export const UrgentTag = styled.span`
  background: #ffab40;
  color: #ffffff;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
  flex-shrink: 0;
  margin-right: 6px;
  margin-bottom: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
`;

export const NoDataContainer = styled.div`
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 80px 0;
  width: 100%;
`;

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  animation: fadeIn 0.4s ease;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

export const EmptyIconCircle = styled.div`
  width: 140px;
  height: 140px;
  background: radial-gradient(50% 50% at 50% 50%, rgba(224, 242, 254, 0.4) 0%, rgba(224, 242, 254, 0) 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
`;

export const EmptyTitle = styled.h4`
  font-size: 18px;
  font-weight: 700;
  color: #334155;
  margin: 0 0 10px 0;
`;

export const EmptySubtitle = styled.p`
  font-size: 14px;
  color: #94a3b8;
  margin: 0;
  max-width: 300px;
  line-height: 1.6;
`;

export const SkeletonCard = styled(Card)`
  pointer-events: none;
`;

export const SkeletonImg = styled(CardImg)`
  background: #eee;
  background: linear-gradient(110deg, #ececec 8%, #f5f5f5 18%, #ececec 33%);
  background-size: 200% 100%;
  animation: shimmer 1.5s linear infinite;
  border: none;

  @keyframes shimmer {
    to { background-position-x: -200%; }
  }
`;

export const SkeletonTitle = styled.div`
  background: #eee;
  background: linear-gradient(110deg, #ececec 8%, #f5f5f5 18%, #ececec 33%);
  background-size: 200% 100%;
  animation: shimmer 1.5s linear infinite;
  border-radius: 4px;
  height: ${({ $h }) => $h || '18px'};
  width: ${({ $w }) => $w || '100%'};
  margin-bottom: ${({ $mb }) => $mb || '0'};

  @keyframes shimmer {
    to { background-position-x: -200%; }
  }
`;
