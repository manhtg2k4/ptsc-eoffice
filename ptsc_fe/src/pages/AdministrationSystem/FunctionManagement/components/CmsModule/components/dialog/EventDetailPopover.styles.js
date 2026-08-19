import scStyled from 'styled-components';

export const PopoverWrapper = scStyled.div.attrs({
  className: "popover-wrapper"
})`
  position: absolute;
  z-index: 2100;
  width: 380px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
  padding: 0;
  font-family: 'Inter', -apple-system, sans-serif;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.05);
  animation: popIn 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  @keyframes popIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
`;

export const PopoverHeader = scStyled.div`
  padding: 8px 12px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

export const ActionButton = scStyled.button`
  background: none;
  border: none;
  color: #5f6368;
  padding: 8px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;

  &:hover {
    background: #f1f3f4;
    color: #202124;
  }
`;

export const PopoverContent = scStyled.div`
  padding: 0 20px 20px 20px;
`;

export const EventTitleRow = scStyled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 4px;
  align-items: flex-start;
`;

export const ColorIndicator = scStyled.div`
  width: 16px;
  height: 16px;
  border-radius: 4px;
  background-color: ${props => props.$indicatorColor || '#0062AD'};
  margin-top: 6px;
  flex-shrink: 0;
`;

export const Title = scStyled.h2`
  font-size: 16px;
  font-weight: 600;
  color: #202124;
  margin: 0;
  line-height: 1.4;
`;

export const InfoRow = scStyled.div`
  display: flex;
  gap: 12px;
  padding: 8px 0 8px 30px;
  color: #3c4043;
  font-size: 14px;
  align-items: center;
  line-height: 1.5;

  svg {
    color: #5f6368;
    flex-shrink: 0;
  }
`;

export const DateTimeInfo = scStyled.div`
  padding: 0 0 12px 30px;
  font-size: 14px;
  color: #3c4043;
  margin-bottom: 8px;
`;

export const DescriptionBox = scStyled.div`
  display: flex;
  gap: 14px;
  padding: 6px 0;
  margin-top: 4px;

  .icon-area {
    color: #5f6368;
    width: 18px;
    margin-left: 2px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 22px; /* Center with text line-height */
  }

  .text-area {
    font-size: 15px;
    color: #3c4043;
    line-height: 1.5;
    flex: 1;
    overflow-wrap: break-word;
    display: flex;
    align-items: center;
  }
`;

export const MetaRow = scStyled.div`
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 6px 0;
  color: #3c4043;
  font-size: 14px;

  .icon-area {
    color: #5f6368;
    width: 16px;
    margin-left: 2px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 20px;
  }

  .text-area {
    flex: 1;
    display: flex;
    align-items: center;
    min-height: 20px;
  }
`;

export const ParticipantsList = scStyled.div`
  margin-top: 4px;
`;

export const ParticipantRow = scStyled.div`
  display: flex;
  align-items: flex-start;
  gap: 18px;
  padding: 8px 0;
  color: #3c4043;
  font-size: 14px;

  .icon-area {
    color: #5f6368;
    width: 16px;
    margin-left: 2px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 20px;
  }

  .content-area {
    flex: 1;
  }
`;

export const ParticipantCount = scStyled.div`
  font-weight: 500;
  margin-bottom: 8px;
  color: #3c4043;
`;

export const ParticipantItem = scStyled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0;
`;

export const Avatar = scStyled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: ${props => props.$bgColor || '#0062AD'};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  flex-shrink: 0;
`;

export const ParticipantName = scStyled.span`
  color: #3c4043;
  font-size: 14px;
`;

