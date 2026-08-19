import scStyled, { keyframes, css } from 'styled-components';

import { Heart } from 'lucide-react';

const vpmFadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const vpmAppear = keyframes`
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
`;

export const ModalOverlay = scStyled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: ${vpmFadeIn} 0.3s ease;
`;

export const VideoModalWrap = scStyled.div`
  position: relative;
  width: 95vw;
  max-width: 1400px;
  aspect-ratio: 16/9;
  background: #000;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);

  @media (max-width: 768px) {
    width: 100vw;
    border-radius: 0;
  }
`;

export const Header = scStyled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 24px 32px;
  background: linear-gradient(to bottom, rgba(0,0,0,0.7), transparent);
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;

  @media (max-width: 768px) {
    padding: 16px 20px;
  }
`;

export const TitleText = scStyled.span`
  color: white;
  font-size: 18px;
  font-weight: 600;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);

  @media (max-width: 768px) {
    font-size: 14px;
  }
`;

export const CloseButton = scStyled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  background: rgba(255,255,255,0.1);
  transition: all 0.2s;

  &:hover {
    background: rgba(255,255,255,0.2);
    transform: rotate(90deg);
  }

  @media (max-width: 768px) {
    width: 32px;
    height: 32px;
  }
`;

export const PlayerMain = scStyled.div`
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const VideoTag = scStyled.video`
  width: 100%;
  height: 100%;
  object-fit: contain;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
`;

export const CenterControls = scStyled.div`
  position: absolute;
  display: flex;
  align-items: center;
  gap: 30px;
  z-index: 3;
  animation: ${vpmAppear} 0.3s ease;
`;

export const CircleButton = scStyled.button`
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(10px);
  border: none;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid rgba(255,255,255,0.2);

  ${({ $size }) => $size === 'large' ? css`
    width: 72px;
    height: 72px;
    background: rgba(255,255,255,0.25);
    
    @media (max-width: 768px) {
      width: 56px;
      height: 56px;
    }
  ` : css`
    width: 48px;
    height: 48px;
    color: rgba(255,255,255,0.9);

    @media (max-width: 768px) {
      display: none;
    }
  `}

  &:hover {
    background: rgba(255,255,255,0.3);
    transform: scale(1.05);
  }

  svg {
    pointer-events: none;
  }
`;

export const VolumeSide = scStyled.div`
  position: absolute;
  left: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  z-index: 3;

  @media (max-width: 768px) {
    display: none;
  }
`;

export const SliderVertical = scStyled.div`
  width: 20px;
  height: 120px;
  background: transparent;
  position: relative;
  cursor: pointer;
  display: flex;
  justify-content: center;
`;

export const SliderTrack = scStyled.div`
  width: 5px;
  height: 100%;
  background: rgba(255,255,255,0.2);
  border-radius: 10px;
  position: relative;
  overflow: hidden;
`;

export const SliderFill = scStyled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-radius: 10px;
  height: ${({ $vHeight }) => $vHeight}%;
`;

export const BottomBar = scStyled.div`
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 800px;
  display: flex;
  align-items: center;
  gap: 16px;
  backdrop-filter: blur(20px);
  background: rgba(255,255,255,0.1);
  padding: 12px 24px;
  border-radius: 50px;
  border: 1px solid rgba(255,255,255,0.15);
  z-index: 3;

  @media (max-width: 768px) {
    width: 95%;
    padding: 10px 16px;
    bottom: 10px;
  }
`;

export const TimeLabel = scStyled.span`
  color: white;
  font-size: 13px;
  font-weight: 500;
  min-width: 40px;
  opacity: 0.9;
`;

export const ProgressWrap = scStyled.div`
  flex: 1;
  position: relative;
  height: 20px;
  display: flex;
  align-items: center;
  cursor: pointer;
  touch-action: none;
`;

export const ProgressRail = scStyled.div`
  width: 100%;
  height: 5px;
  background: rgba(255,255,255,0.2);
  border-radius: 3px;
  position: relative;
  overflow: hidden;
`;

export const ProgressFill = scStyled.div`
  height: 100%;
  background: #3b82f6;
  border-radius: 3px;
  width: ${({ $vWidth }) => $vWidth}%;
`;

export const ProgressKnob = scStyled.div`
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  background: white;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 10px rgba(0,0,0,0.4);
  pointer-events: none;
  left: ${({ $vLeft }) => $vLeft}%;
`;

export const ActionsContainer = scStyled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  color: white;

  svg {
    cursor: pointer;
  }
`;

export const StyledHeart = scStyled(Heart)`
  color: ${({ $isLiked }) => ($isLiked ? '#ef4444' : 'white')} !important;
  fill: ${({ $isLiked }) => ($isLiked ? '#ef4444' : 'none')} !important;
`;

export const MoreMenuWrap = scStyled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

export const OptionsMenu = scStyled.div`
  position: absolute;
  bottom: 100%;
  right: 0;
  background: white;
  border-radius: 12px;
  padding: 8px;
  min-width: 140px;
  box-shadow: 0 -10px 30px rgba(0,0,0,0.2);
  margin-bottom: 12px;
  z-index: 10;
`;

export const OptionItem = scStyled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  color: #475569;
  font-size: 13px;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;

  &:hover {
    background: #f1f5f9;
    color: #3b82f6;
  }
`;
