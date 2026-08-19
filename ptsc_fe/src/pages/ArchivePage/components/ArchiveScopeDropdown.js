// File: src/components/ArchiveScopeDropdown/index.jsx
import React, { useState, useRef, useEffect } from "react";
import { Box, useTheme } from "@mui/material";
import CustomInput from "@components/CustomInput/CustomInput";
import styled from "styled-components";

// ── Hàm tạo danh sách năm động ──
const generateYears = (yearsAhead = 5, yearsBack = 2) => {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear + yearsAhead;
  const totalYears = yearsAhead + yearsBack + 1;
  return Array.from({ length: totalYears }, (_, i) => startYear - i);
};

// ── Hàm tạo danh sách quý động ──
const generateQuarters = (yearsBack = 2) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const currentQuarter = Math.ceil(currentMonth / 3); // 1-4
  
  const quarters = [];
  
  // Tạo quý từ năm hiện tại về trước
  for (let year = currentYear; year >= currentYear - yearsBack; year--) {
    const maxQuarter = year === currentYear ? currentQuarter : 4;
    
    for (let q = maxQuarter; q >= 1; q--) {
      quarters.push({
        id: `Q${q}-${year}`,
        name: `Quý ${q} - ${year}`,
        year: year,
        quarter: q
      });
    }
  }
  
  return quarters;
};

// ── CustomDatePicker ──
const CustomDatePicker = ({ value, onDateChange }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const handleDateInputChange = (e) => {
    onDateChange(e.target.value);
  };

  return (
    <div style={{ marginBottom: "12px" }}>
      <input
        type="date"
        value={value || ""}
        onChange={handleDateInputChange}
        style={{
          width: "100%",
          padding: "10px 12px",
          border: `1px solid ${isDark ? '#34495e' : '#ccc'}`,
          borderRadius: "8px",
          fontSize: "14px",
          fontFamily: "inherit",
          boxSizing: "border-box",
          backgroundColor: isDark ? '#2c3e50' : '#fff',
          color: isDark ? '#fff' : '#1a1a1a',
        }}
      />
    </div>
  );
};

// ── Styled Components ──
const SectionDropBox = styled(Box)(() => ({
  position: "relative",
}));

const SectionDropBoxCursor = styled(Box)(() => ({
  cursor: "pointer",
  "& .MuiInputBase-root": { cursor: "pointer" },
}));

const SectionDropBoxArrow = styled(Box)(({ theme }) => ({
  position: "absolute",
  right: "14px",
  top: "20px",
  transform: "translateY(-50%)",
  pointerEvents: "auto",
  cursor: "pointer",
  zIndex: 10,
  "& span": {
    color: theme.palette.mode === 'dark' ? '#fff' : '#666',
  }
}));

const SectionDropBoxDown = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  zIndex: 1300,
  marginTop: "4px",
  backgroundColor: theme.palette.mode === 'dark' ? '#2c3e50' : 'white',
  borderRadius: "8px",
  boxShadow: theme.palette.mode === 'dark' 
    ? "0 2px 8px rgba(0, 0, 0, 0.5)" 
    : "0 2px 8px rgba(0, 0, 0, 0.12)",
  border: `1px solid ${theme.palette.mode === 'dark' ? '#34495e' : '#e0e0e0'}`,
  display: "flex",
  minHeight: "300px",
  maxHeight: "400px",
  overflow: "hidden",
}));

const MenuItemStyled = styled("div")(({ isSelected, isHovered, theme }) => {
  const isDark = theme.palette.mode === 'dark';
  
  return {
    padding: "12px 16px",
    cursor: "pointer",
    backgroundColor: isSelected 
      ? (isDark ? '#1976d2' : '#e3f2fd')
      : isHovered 
        ? (isDark ? '#34495e' : '#f5f5f5')
        : (isDark ? '#2c3e50' : 'white'),
    color: isSelected 
      ? (isDark ? '#fff' : '#0066CC')
      : (isDark ? '#fff' : '#1a1a1a'),
    fontWeight: isSelected ? 600 : 400,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: `1px solid ${isDark ? '#34495e' : '#f0f0f0'}`,
    "& span:last-child": {
      color: isDark ? '#95a5a6' : '#999',
    }
  };
});

const SectionSubMenu = styled(Box)(() => ({
  flex: 1,
  display: "flex",
  flexDirection: "column",
}));

const SectionDropBoxArrowLeft = styled(Box)(({ theme }) => ({
  width: 200,
  borderRight: `1px solid ${theme.palette.mode === 'dark' ? '#34495e' : '#e0e0e0'}`,
  flexShrink: 0,
}));

// ── Hàm hỗ trợ ──
function getDisplayValue(selectedScope, selectedValue, scopeOptions) {
  if (!selectedScope) return "Chọn phạm vi...";
  if (!selectedValue) {
    const scopeName = scopeOptions.find((s) => s.id === selectedScope)?.name;
    return scopeName || "Chọn phạm vi...";
  }
  return selectedValue;
}

function getListItemStyle(isSelected, isDark) {
  return {
    padding: "12px 16px",
    cursor: "pointer",
    backgroundColor: isSelected 
      ? (isDark ? '#1976d2' : '#e3f2fd')
      : (isDark ? '#2c3e50' : 'white'),
    color: isSelected 
      ? (isDark ? '#fff' : '#0066CC')
      : (isDark ? '#fff' : '#1a1a1a'),
    fontWeight: isSelected ? 600 : 400,
    transition: "background-color 0.2s",
    borderBottom: `1px solid ${isDark ? '#34495e' : '#f0f0f0'}`,
  };
}

function renderSubmenu(
  hoveredScope,
  selectedScope,
  selectedValue,
  years,
  quarters,
  dateRange,
  handleYearSelect,
  handleQuarterSelect,
  dateRangeHandlers,
  isDark
) {
  switch (hoveredScope) {
    case "year":
      return (
        <div style={{ flex: 1, overflowY: "auto", maxHeight: "300px" }}>
          {years.map((year) => (
            <YearItem
              key={year}
              year={year}
              isSelected={selectedScope === "year" && selectedValue === year.toString()}
              onSelect={handleYearSelect}
              isDark={isDark}
            />
          ))}
        </div>
      );
    case "quarter":
      return (
        <div style={{ flex: 1, overflowY: "auto", maxHeight: "300px" }}>
          {quarters.map((quarter) => (
            <QuarterItem
              key={quarter.id}
              quarter={quarter}
              isSelected={selectedScope === "quarter" && selectedValue === quarter.name}
              onSelect={handleQuarterSelect}
              isDark={isDark}
            />
          ))}
        </div>
      );
    case "month":
      return (
        <div style={{ flex: 1, padding: "16px", minWidth: "280px" }}>
          <CustomDatePicker value={dateRange.from} onDateChange={dateRangeHandlers.from} />
          <CustomDatePicker value={dateRange.to} onDateChange={dateRangeHandlers.to} />
        </div>
      );
    default:
      return (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: isDark ? '#fff' : '#999',
            fontSize: "14px",
            padding: "20px",
          }}
        >
          Hover vào một tùy chọn để xem chi tiết
        </div>
      );
  }
}

// ── Component con ──
const YearItem = ({ year, isSelected, onSelect, isDark }) => {
  const handleMouseEnter = (e) => {
    if (!isSelected) e.currentTarget.style.backgroundColor = isDark ? '#34495e' : '#f5f5f5';
  };
  const handleMouseLeave = (e) => {
    if (!isSelected) e.currentTarget.style.backgroundColor = isDark ? '#2c3e50' : 'white';
  };
  const handleYearClick = () => onSelect(year);

  return (
    <div
      style={getListItemStyle(isSelected, isDark)}
      onClick={handleYearClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {year}
    </div>
  );
};

const QuarterItem = ({ quarter, isSelected, onSelect, isDark }) => {
  const handleMouseEnter = (e) => {
    if (!isSelected) e.currentTarget.style.backgroundColor = isDark ? '#34495e' : '#f5f5f5';
  };
  const handleMouseLeave = (e) => {
    if (!isSelected) e.currentTarget.style.backgroundColor = isDark ? '#2c3e50' : 'white';
  };
  const handleQuarterClick = () => onSelect(quarter);

  return (
    <div
      style={getListItemStyle(isSelected, isDark)}
      onClick={handleQuarterClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {quarter.name}
    </div>
  );
};

// ── Component chính ──
const ArchiveScopeDropdown = ({
  value = "",
  onChange,
  error = false,
  helperText = "",
  label = "Phạm vi đợt lưu trữ",
  required = true,
  yearsAhead = 5,      // Số năm về tương lai
  yearsBack = 2,       // Số năm về quá khứ
  quartersBack = 2,    // Số năm quý về quá khứ
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [isOpen, setIsOpen] = useState(false);
  const [hoveredScope, setHoveredScope] = useState(null);
  const [selectedScope, setSelectedScope] = useState("");
  const [selectedValue, setSelectedValue] = useState("");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  const containerRef = useRef(null);

  const scopeOptions = [
    { id: "year", name: "Theo năm" },
    { id: "quarter", name: "Theo quý" },
    { id: "month", name: "Tùy chọn" },
  ];

  // Tạo danh sách năm và quý động
  const years = generateYears(yearsAhead, yearsBack);
  const quarters = generateQuarters(quartersBack);

  useEffect(() => {
    if (!value) return;
    try {
      const parsed = typeof value === "string" ? JSON.parse(value) : value;
      if (parsed.scope) {
        setSelectedScope(parsed.scope);
        if (parsed.scope === "year") {
          setSelectedValue(parsed.value.toString());
        } else if (parsed.scope === "quarter") {
          const quarter = quarters.find((q) => q.id === parsed.value);
          setSelectedValue(quarter?.name || parsed.value);
        } else if (parsed.scope === "month" && parsed.value) {
          // parsed.value có thể là string "29/10/2025 - 30/12/2025" hoặc object {from, to}
          if (typeof parsed.value === "string") {
            setSelectedValue(parsed.value);
            // Parse lại để set vào dateRange
            const [from, to] = parsed.value.split(" - ");
            if (from && to) {
              // Convert DD/MM/YYYY back to YYYY-MM-DD
              const convertToInputFormat = (dateStr) => {
                const [day, month, year] = dateStr.trim().split("/");
                return `${year}-${month}-${day}`;
              };
              setDateRange({
                from: convertToInputFormat(from),
                to: convertToInputFormat(to)
              });
            }
          } else {
            setSelectedValue(`${parsed.value.from} - ${parsed.value.to}`);
            setDateRange(parsed.value);
          }
        }
      }
    } catch {
      setSelectedScope(value);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setHoveredScope(null);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleToggle = () => setIsOpen((prev) => !prev);

  const handleScopeHover = (scopeId) => {
    setHoveredScope(scopeId);
  };

  const createHoverHandler = (scopeId) => () => handleScopeHover(scopeId);

  const handleYearSelect = (year) => {
    setSelectedValue(year.toString());
    setSelectedScope("year");
    onChange({ scope: "year", value: year });
    setIsOpen(false);
    setHoveredScope(null);
  };

  const handleQuarterSelect = (quarter) => {
    setSelectedValue(quarter.name);
    setSelectedScope("quarter");
    onChange({ scope: "quarter", value: quarter.id });
    setIsOpen(false);
    setHoveredScope(null);
  };

  const handleDateRangeChange = (field, val) => {
    // Convert từ YYYY-MM-DD sang DD/MM/YYYY
    const convertToDisplayFormat = (dateStr) => {
      if (!dateStr) return "";
      const [year, month, day] = dateStr.split("-");
      return `${day}/${month}/${year}`;
    };

    setDateRange((prev) => {
      const newRange = { ...prev, [field]: val };
      if (newRange.from && newRange.to) {
        const displayFrom = convertToDisplayFormat(newRange.from);
        const displayTo = convertToDisplayFormat(newRange.to);
        const displayValue = `${displayFrom} - ${displayTo}`;
        setSelectedValue(displayValue);
        setSelectedScope("month");
        onChange({ 
          scope: "month", 
          value: displayValue
        });
      }
      return newRange;
    });
  };

  const dateRangeHandlers = {
    from: (val) => handleDateRangeChange("from", val),
    to: (val) => handleDateRangeChange("to", val),
  };

  const displayText = getDisplayValue(selectedScope, selectedValue, scopeOptions);

  return (
    <SectionDropBox>
      <SectionDropBoxCursor onClick={handleToggle}>
        <CustomInput
          label={label}
          placeholder="Chọn phạm vi..."
          value={displayText}
          required={required}
          error={error}
          helperText={helperText}
          readOnly
        />
      </SectionDropBoxCursor>

      <SectionDropBoxArrow onClick={handleToggle} theme={theme}>
        <span
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
            fontSize: "20px",
          }}
        >
          ▼
        </span>
      </SectionDropBoxArrow>

      {isOpen && (
        <SectionDropBoxDown ref={containerRef} theme={theme}>
          <SectionDropBoxArrowLeft theme={theme}>
            {scopeOptions.map((option) => {
              const isSelected = selectedScope === option.id;
              const isHovered = hoveredScope === option.id;

              return (
                <MenuItemStyled
                  key={option.id}
                  isSelected={isSelected}
                  isHovered={isHovered}
                  onMouseEnter={createHoverHandler(option.id)}
                  theme={theme}
                >
                  <span>{option.name}</span>
                  <span style={{ transform: "rotate(-90deg)", fontSize: 16 }}>▼</span>
                </MenuItemStyled>
              );
            })}
          </SectionDropBoxArrowLeft>

          <SectionSubMenu>
            {renderSubmenu(
              hoveredScope,
              selectedScope,
              selectedValue,
              years,
              quarters,
              dateRange,
              handleYearSelect,
              handleQuarterSelect,
              dateRangeHandlers,
              isDark
            )}
          </SectionSubMenu>
        </SectionDropBoxDown>
      )}
    </SectionDropBox>
  );
};

export default ArchiveScopeDropdown;