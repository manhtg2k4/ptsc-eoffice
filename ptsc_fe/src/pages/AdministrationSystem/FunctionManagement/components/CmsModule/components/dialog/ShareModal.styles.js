import scStyled from 'styled-components';

export const Overlay = scStyled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
`;

export const ModalContent = scStyled.div`
    background-color: #fff;
    border-radius: 12px;
    width: 100%;
    max-width: 480px;
    overflow: hidden;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
`;

export const ModalHeader = scStyled.div`
    padding: 16px 24px;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

export const ModalTitle = scStyled.h3`
    margin: 0;
    font-size: 18px;
    font-weight: 600;
`;

export const CloseButton = scStyled.button`
    background: none;
    border: none;
    cursor: pointer;
    color: #666;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &:hover {
        color: #333;
    }
`;

export const ModalBody = scStyled.div`
    padding: 24px;
`;

export const Label = scStyled.p`
    margin: 0 0 16px 0;
    font-size: 14px;
    color: #666;
    font-weight: 500;
`;

export const CopyLabel = scStyled(Label)`
    margin-bottom: 12px;
`;

export const Grid = scStyled.div`
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;
    margin-bottom: 24px;
`;

export const SocialButton = scStyled.a`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    text-decoration: none;
    font-size: 13px;
    font-weight: 500;
    color: ${({ $themeColor }) => $themeColor || '#1877F2'};
`;

export const IconCircle = scStyled.span`
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s;
    background-color: ${({ $mainBg }) => $mainBg || '#e7f5ff'};
    color: ${({ $themeColor }) => $themeColor || '#1877F2'};

    &:hover {
        transform: scale(1.05);
    }
`;

export const InputGroup = scStyled.div`
    display: flex;
    gap: 8px;
`;

export const Input = scStyled.input`
    flex: 1;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid #ddd;
    font-size: 14px;
    background-color: #f9f9f9;
    outline: none;

    &:focus {
        border-color: #0B5FFF;
    }
`;

export const CopyButton = scStyled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 16px;
    border-radius: 8px;
    border: none;
    background-color: ${({ $isCopied }) => ($isCopied ? '#10b981' : '#0B5FFF')};
    color: #fff;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
        opacity: 0.9;
    }
`;
