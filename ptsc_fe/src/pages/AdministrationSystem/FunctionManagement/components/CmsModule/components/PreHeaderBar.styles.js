import styled, { keyframes } from 'styled-components';

const tickerAnimation = keyframes`
  0% { transform: translate3d(0, 0, 0); }
  100% { transform: translate3d(-50%, 0, 0); }
`;

export const Wrapper = styled.div`
  background-color: ${({ $bkg }) => $bkg};
  border-bottom: 1px solid #f0f0f0;
  padding: ${({ $isMob }) => ($isMob ? '0 15px' : '0 120px')};
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  height: ${({ $ht }) => $ht}px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  overflow: hidden;
  box-sizing: border-box;
`;

export const TickerWrap = styled.div`
  overflow: hidden;
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  padding-left: 20px;
  position: relative;

  &::before {
    content: "";
    position: absolute;
    left: 10px;
    height: 16px;
    width: 1px;
    background-color: ${({ $txt }) => $txt};
    opacity: 0.3;
    z-index: 2;
  }
`;

export const TickerOuter = styled.div`
  width: 100%;
  overflow: hidden;
`;

export const TickerContent = styled.div`
  white-space: nowrap;
  display: inline-block;
  animation: ${tickerAnimation} ${({ $dur }) => $dur}s linear infinite;
  will-change: transform;
`;

export const TickerItem = styled.span`
  display: inline-block;
  padding: 0 25px;
  color: ${({ $txt }) => $txt};
  font-weight: 400;
  cursor: pointer;
  font-size: 13.5px;
  transition: color 0.2s;

  &:hover {
    color: ${({ $acc }) => $acc};
    text-decoration: underline;
  }
`;

export const TickerDot = styled.span`
  color: ${({ $txt }) => $txt};
  opacity: 0.6;
  margin: 0 5px;
  font-weight: bold;
`;

export const RightContainer = styled.div`
  display: flex;
  align-items: center;
  flex-shrink: 0;
  background: ${({ $bkg }) => $bkg};
  padding-left: 30px;
  z-index: 10;
  gap: 25px;
  height: 100%;
`;

export const TimeBox = styled.div`
  color: ${({ $txt }) => $txt};
  opacity: 0.8;
  white-space: nowrap;
  font-size: 12px;
  border-left: 1px solid ${({ $txt }) => $txt}22;
  padding-left: 25px;
  display: flex;
  align-items: center;
  height: 14px;
`;

export const SearchWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 100%;
`;

export const SearchInputContainer = styled.div`
  overflow: hidden;
  transition: width 0.3s ease, opacity 0.3s ease;
  width: ${({ $isFoc, $isMob }) => ($isFoc ? ($isMob ? '120px' : '200px') : '0px')};
  opacity: ${({ $isFoc }) => ($isFoc ? 1 : 0)};
  display: flex;
  align-items: center;
`;

export const InlineInput = styled.input`
  border: none;
  border-bottom: 1.5px solid ${({ $acc }) => $acc};
  padding: 2px 4px;
  font-size: 13px;
  outline: none;
  width: 100%;
  background-color: transparent;
  color: ${({ $txt }) => $txt};
`;

export const SearchTriggerBtn = styled.div`
  color: ${({ $acc }) => $acc};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ $bgBtn }) => $bgBtn};
  width: 32px;
  height: 32px;
  border-radius: 50%;

  &:hover {
    filter: brightness(0.9);
  }
`;
export const ConfigActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px;
  margin-left: 8px;
  border-radius: 4px;
  color: ${props => props.$txt || '#333'};
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.$acc ? `${props.$acc}15` : 'rgba(0, 0, 0, 0.05)'};
    color: ${props => props.$acc || '#0B5FFF'};
  }
`;