import scStyled from 'styled-components';

export const DatePickerContainer = scStyled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.15);
  border: 1px solid #e2e8f0;
  padding: 16px;
  min-width: 280px;
  user-select: none;
`;

export const Header = scStyled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

export const MonthLabel = scStyled.span`
  font-weight: 700;
  color: #1e293b;
  text-transform: capitalize;
`;

export const NavButton = scStyled.button`
  background: none;
  border: none;
  padding: 5px;
  cursor: pointer;
  color: #64748b;
  border-radius: 50%;
  display: flex;
  transition: all 0.2s;

  &:hover {
    background: #f1f5f9;
    color: #2563eb;
  }
`;

export const WeekdaysRow = scStyled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 8px;
`;

export const WeekdayLabel = scStyled.span`
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  padding: 4px 0;
`;

export const DaysGrid = scStyled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
`;

export const DayCell = scStyled.div`
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
  color: ${props => props.$isOtherMonth ? '#cbd5e1' : '#334155'};
  
  font-weight: ${props => (props.$isSelected || props.$isToday) ? '700' : '400'};
  background: ${props => {
    if (props.$isSelected) return '#2563eb !important';
    if (props.$isToday) return '#f0f7ff';
    return 'transparent';
  }};
  color: ${props => props.$isSelected ? 'white !important' : (props.$isToday ? '#2563eb' : (props.$isOtherMonth ? '#cbd5e1' : '#334155'))};

  &:hover {
    background: ${props => props.$isSelected ? '#2563eb' : '#eff6ff'};
    color: ${props => props.$isSelected ? 'white' : '#2563eb'};
  }
`;

export const Footer = scStyled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
`;

export const ActionButton = scStyled.button`
  background: none;
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
  
  color: ${props => props.$variant === 'clear' ? '#ef4444' : '#2563eb'};

  &:hover {
    background: ${props => props.$variant === 'clear' ? '#fef2f2' : '#eff6ff'};
  }
`;
