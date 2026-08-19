import scStyled, { keyframes } from 'styled-components';

const igmFade = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export const Overlay = scStyled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${igmFade} 0.3s ease;
`;

export const ModalContainer = scStyled.div`
  position: relative;
  width: 100%;
  max-width: 1600px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: transparent;
`;

export const CloseButton = scStyled.button`
  position: absolute;
  top: 24px;
  right: 24px;
  background: #000000;
  border: none;
  color: white;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 100;
  transition: all 0.2s;

  &:hover {
    transform: rotate(90deg);
  }

  @media (max-width: 768px) {
    top: 10px;
    right: 10px;
    width: 32px;
    height: 32px;
  }
`;

export const Stage = scStyled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 40px;
  width: 100%;
  height: 85vh;
  perspective: 1200px;

  @media (max-width: 768px) {
    height: auto;
  }
`;

export const ImageCard = scStyled.div`
  position: relative;
  border-radius: ${props => props.$isMain ? '20px' : '20px'};
  overflow: hidden;
  transition: all 0.6s cubic-bezier(0.25, 1, 0.5, 1);
  box-shadow: ${props => props.$isMain ? '0 35px 70px -15px rgba(0, 0, 0, 0.7)' : '0 25px 50px -12px rgba(0, 0, 0, 0.5)'};
  background: #252525;
  flex-shrink: 0;
  
  width: ${props => {
    if (props.$isMain) return '60%';
    return '250px';
  }};
  max-width: ${props => props.$isMain ? '1000px' : 'none'};
  height: ${props => props.$isMain ? '70vh' : '200px'};
  z-index: ${props => props.$isMain ? '20' : '10'};
  opacity: ${props => props.$isMain ? '1' : '0.8'};
  transform: ${props => props.$isMain ? 'scale(1)' : 'scale(0.9)'};
  filter: ${props => props.$isMain ? 'none' : 'grayscale(100%) brightness(0.6)'};
  cursor: ${props => props.$isMain ? 'default' : 'pointer'};

  &:hover {
    filter: ${props => props.$isMain ? 'none' : 'grayscale(50%) brightness(0.8)'};
    transform: ${props => props.$isMain ? 'scale(1)' : 'scale(0.95)'};
  }

  @media (max-width: 1400px) {
    width: ${props => props.$isMain ? '60%' : '200px'};
    height: ${props => props.$isMain ? '70vh' : '160px'};
  }

  @media (max-width: 1024px) {
    display: ${props => props.$isMain ? 'block' : 'none'};
    width: ${props => props.$isMain ? '90%' : 'none'};
    height: ${props => props.$isMain ? '60vh' : 'none'};
  }

  @media (max-width: 768px) {
    width: ${props => props.$isMain ? '100vw' : 'none'};
    height: ${props => props.$isMain ? 'auto' : 'none'};
    aspect-ratio: ${props => props.$isMain ? '16/9' : 'none'};
    border-radius: 0;
  }
`;

export const GalleryImage = scStyled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

export const OverlayDim = scStyled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.4);
`;

export const InfoGradient = scStyled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(28, 27, 27, 0.3);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  padding: 30px 40px;
  color: white;
  text-align: left;

  @media (max-width: 768px) {
    padding: 20px 15px;
  }
`;

export const TextContent = scStyled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
`;

export const Meta = scStyled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  opacity: 0.9;
  font-weight: 500;
  color: #cbd5e1;

  .dot {
    font-weight: bold;
    font-size: 16px;
    line-height: 0;
    margin-top: -2px;
  }

  @media (max-width: 768px) {
    font-size: 12px;
  }
`;

export const Title = scStyled.h2`
  font-size: 26px;
  font-weight: 700;
  margin: 0;
  line-height: 1.3;
  text-shadow: 0 2px 10px rgba(0,0,0,0.5);

  @media (max-width: 768px) {
    font-size: 18px;
  }
`;

export const DotsContainer = scStyled.div`
  margin-top: 16px;
  display: flex;
  gap: 8px;
`;

export const DotItem = scStyled.div`
  width: ${props => props.$isActive ? '32px' : '8px'};
  height: 8px;
  background: ${props => props.$isActive ? '#3b82f6' : 'rgba(255,255,255,0.8)'};
  border-radius: ${props => props.$isActive ? '4px' : '50%'};
  cursor: pointer;
  transition: all 0.3s;
`;
