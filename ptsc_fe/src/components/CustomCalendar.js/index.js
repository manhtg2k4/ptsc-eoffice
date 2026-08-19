import React, { useState } from "react";

const CalendarMonthView = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 11, 24));
  const [showMoreEvents, setShowMoreEvents] = useState(null);
  const MAX_VISIBLE_EVENTS = 3;

  // Icon components
  const FlagIcon = ({ size = 12 }) => (
    <svg width={size} height={size * 23/24} viewBox="0 0 24 23" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path opacity="0.5" fillRule="evenodd" clipRule="evenodd" d="M6.5 1.75C6.5 1.55109 6.42098 1.36032 6.28033 1.21967C6.13968 1.07902 5.94891 1 5.75 1C5.55109 1 5.36032 1.07902 5.21967 1.21967C5.07902 1.36032 5 1.55109 5 1.75V21.75C5 21.9489 5.07902 22.1397 5.21967 22.2803C5.36032 22.421 5.55109 22.5 5.75 22.5C5.94891 22.5 6.13968 22.421 6.28033 22.2803C6.42098 22.1397 6.5 21.9489 6.5 21.75V1.75Z" fill="#4A5565"/>
      <g opacity="0.5">
        <path d="M13.349 3.78999L13.145 3.70799C11.5819 3.08425 9.8715 2.92724 8.221 3.25599L6.5 3.59999V13.6L8.22 13.256C9.87082 12.927 11.5816 13.0841 13.145 13.708C14.8386 14.385 16.7025 14.5113 18.472 14.069L18.686 14.016C18.9898 13.9402 19.2596 13.7649 19.4524 13.5181C19.6452 13.2713 19.75 12.9672 19.75 12.654V5.28699C19.7499 5.10476 19.7084 4.92493 19.6284 4.76116C19.5485 4.59739 19.4324 4.45396 19.2887 4.34178C19.1451 4.22959 18.9779 4.15158 18.7996 4.11367C18.6214 4.07577 18.4368 4.07895 18.26 4.12299C16.6286 4.53056 14.9102 4.41469 13.349 3.78999Z" fill="white"/>
        <path d="M8.26953 3.50146C9.8724 3.1822 11.5338 3.33432 13.0518 3.93994L13.2559 4.02197C14.8659 4.66619 16.6381 4.78591 18.3203 4.36572C18.4603 4.33086 18.6069 4.3279 18.748 4.35791C18.889 4.38794 19.0212 4.4499 19.1348 4.53857C19.2484 4.62731 19.3401 4.74109 19.4033 4.87061C19.4665 5.00012 19.4999 5.14251 19.5 5.28662V12.6538C19.5 12.911 19.4141 13.161 19.2559 13.3638C19.0974 13.5666 18.8747 13.7106 18.625 13.7729L18.4121 13.8267H18.4111C16.6929 14.2561 14.8829 14.1334 13.2383 13.4761H13.2373C11.6291 12.8343 9.86908 12.6728 8.1709 13.0112L6.75 13.2944V3.8042L8.26953 3.50146Z" stroke="black" strokeOpacity="0.3" strokeWidth="0.5"/>
      </g>
    </svg>
  );

  const CheckCircle = ({ size = 12 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );

  const Clock = ({ size = 12 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );

  const AlertCircle = ({ size = 12 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );

  const XCircle = ({ size = 12 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );

  const Edit3 = ({ size = 12 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );

  const formatMonth = (date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${month} ${year}`;
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    return days;
  };

  const getStartDayOfWeek = (date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const day = firstDay.getDay();
    return day === 0 ? 6 : day - 1;
  };

  const formatDate = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const startDay = getStartDayOfWeek(currentDate);

  const events = [
    { id: 1, title: "Công việc cha", start: new Date(2025, 11, 1), end: new Date(2025, 11, 1), status: "completed" },
    { id: 2, title: "Công việc cha", start: new Date(2025, 11, 1), end: new Date(2025, 11, 1), status: "ongoing" },
    { id: 3, title: "Công việc cha", start: new Date(2025, 11, 1), end: new Date(2025, 11, 1), status: "pending" },
    { id: 10, title: "Công việc cha", start: new Date(2025, 11, 1), end: new Date(2025, 11, 1), status: "pending" },
    { id: 11, title: "Công việc cha", start: new Date(2025, 11, 1), end: new Date(2025, 11, 1), status: "pending" },
    { id: 4, title: "Công việc cha", start: new Date(2025, 11, 2), end: new Date(2025, 11, 2), status: "ongoing" },
    { id: 5, title: "Công việc cha", start: new Date(2025, 11, 2), end: new Date(2025, 11, 2), status: "pending" },
    { id: 6, title: "Công việc cha", start: new Date(2025, 11, 3), end: new Date(2025, 11, 3), status: "ongoing" },
    { id: 7, title: "Công việc cha", start: new Date(2025, 11, 9), end: new Date(2025, 11, 9), status: "completed" },
    { id: 8, title: "Công việc cha", start: new Date(2025, 11, 9), end: new Date(2025, 11, 9), status: "completed" },
    { id: 12, title: "Công việc cha", start: new Date(2025, 11, 9), end: new Date(2025, 11, 9), status: "completed" },
    { id: 13, title: "Công việc cha", start: new Date(2025, 11, 9), end: new Date(2025, 11, 9), status: "completed" },
    { id: 14, title: "Công việc cha", start: new Date(2025, 11, 9), end: new Date(2025, 11, 9), status: "ongoing" },
    { id: 15, title: "Công việc cha", start: new Date(2025, 11, 9), end: new Date(2025, 11, 9), status: "ongoing" },
    { id: 9, title: "Công việc cha", start: new Date(2025, 11, 18), end: new Date(2025, 11, 18), status: "adjusted" },
  ];

  const statusConfig = {
    completed: { bg: "#d4e8f7", border: "#64b5f6", label: "Hoàn thành", icon: CheckCircle },
    ongoing: { bg: "#fff9c4", border: "#ffd54f", label: "Đang thực hiện", icon: Clock },
    pending: { bg: "#ffe0e0", border: "#ef5350", label: "Chờ phê duyệt", icon: AlertCircle },
    canceled: { bg: "#e0e0e0", border: "#9e9e9e", label: "Hủy", icon: XCircle },
    adjusted: { bg: "#ffe4cc", border: "#ff9800", label: "Điều chỉnh", icon: Edit3 },
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setShowMoreEvents(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setShowMoreEvents(null);
  };

  const handleShowMore = (day, allEvents) => {
    setShowMoreEvents({ day, events: allEvents });
  };

  const handleCloseModal = () => {
    setShowMoreEvents(null);
  };

  const handleMouseEnter = (e) => {
    e.currentTarget.style.transform = "translateX(4px)";
    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
  };

  const handleMouseLeave = (e) => {
    e.currentTarget.style.transform = "translateX(0)";
    e.currentTarget.style.boxShadow = "none";
  };

  const handleShowMoreClick = (day, dayEvents) => {
    return () => handleShowMore(day, dayEvents);
  };

  const renderEventsForDay = (day) => {
    const dayEvents = events.filter(
      (event) => formatDate(day) >= formatDate(event.start) && formatDate(day) <= formatDate(event.end)
    );

    const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
    const remainingCount = dayEvents.length - MAX_VISIBLE_EVENTS;

    return (
      <>
        {visibleEvents.map((event) => {
          const Icon = statusConfig[event.status].icon;
          return (
            <div
              key={event.id}
              style={{
                backgroundColor: statusConfig[event.status].bg,
                borderLeft: `3px solid ${statusConfig[event.status].border}`,
                borderRadius: "3px",
                padding: "3px 6px",
                margin: "3px 0",
                fontSize: "0.7rem",
                color: "#333",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
              title={event.title}
            >
              <FlagIcon size={16} />
              <Icon size={14} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                {event.title}
              </span>
            </div>
          );
        })}
        {remainingCount > 0 && (
          <div
            onClick={handleShowMoreClick(day, dayEvents)}
            style={{
              fontSize: "0.7rem",
              color: "#1976d2",
              padding: "3px 6px",
              margin: "3px 0",
              cursor: "pointer",
              fontWeight: "500",
              textDecoration: "underline",
            }}
          >
            +{remainingCount} khác
          </div>
        )}
      </>
    );
  };

  return (
    <>
      <style>
        {`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .calendar-grid-container::-webkit-scrollbar {
            display: none;
          }
          .calendar-grid-container {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
        `}
      </style>
      <div style={{ 
        padding: "24px", 
        width: "100%", 
        margin: "20px auto",
        backgroundColor: "white",
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        borderRadius: "8px",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        maxHeight: "calc(106vh - 180px)",
      }}>
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between", 
        marginBottom: "16px" 
      }}>
        <button 
          onClick={handlePrevMonth}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "24px",
            padding: "8px",
            color: "#333",
          }}
        >
          &#8249;
        </button>
        <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "bold" }}>
          Tháng {formatMonth(currentDate)}
        </h2>
        <button 
          onClick={handleNextMonth}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "24px",
            padding: "8px",
            color: "#333",
          }}
        >
          &#8250;
        </button>
      </div>

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(7, 1fr)",
        backgroundColor: "#f5f5f5",
        fontWeight: "bold",
        fontSize: "0.875rem",
      }}>
        {["Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy", "Chủ nhật"].map((day) => (
          <div key={day} style={{ textAlign: "center", padding: "8px", color: "#555" }}>
            {day}
          </div>
        ))}
      </div>

      <div 
        className="calendar-grid-container"
        style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(7, 1fr)",
          border: "1px solid #e0e0e0",
          flex: 1,
          overflow: "auto",
        }}>
        {Array.from({ length: startDay }).map((_, index) => (
          <div 
            key={`empty-${index}`} 
            style={{ 
              minHeight: "100px",
              borderRight: "1px solid #e0e0e0",
              borderBottom: "1px solid #e0e0e0",
              backgroundColor: "#fafafa",
            }} 
          />
        ))}

        {daysInMonth.map((day) => (
          <div
            key={day.toString()}
            style={{
              borderRight: "1px solid #e0e0e0",
              borderBottom: "1px solid #e0e0e0",
              minHeight: "120px",
              height: "120px",
              padding: "8px",
              backgroundColor: formatDate(day) === "2025-12-24" ? "#e3f2fd" : "white",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div style={{ 
              fontWeight: "bold", 
              marginBottom: "8px",
              fontSize: "0.95rem",
              color: "#333",
              flexShrink: 0,
            }}>
              {day.getDate()}
            </div>
            <div style={{ 
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              paddingRight: "4px",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
            className="hide-scrollbar"
            >
              {renderEventsForDay(day)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ 
        display: "flex", 
        gap: "24px", 
        justifyContent: "flex-end", 
        marginTop: "24px",
        flexWrap: "wrap",
        borderTop: "1px solid #f0f0f0",
        paddingTop: "16px",
        flexShrink: 0,
      }}>
        {Object.entries(statusConfig).map(([key, config]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ 
              width: "20px", 
              height: "12px", 
              backgroundColor: config.bg,
              borderLeft: `3px solid ${config.border}`,
              borderRadius: "2px",
              flexShrink: 0,
            }} />
            <span style={{ fontSize: "0.85rem" }}>{config.label}</span>
          </div>
        ))}
      </div>

      {showMoreEvents && (
        <>
          <div
            onClick={handleCloseModal}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: 999,
            }}
          />
          
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              backgroundColor: "white",
              borderRadius: "8px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
              zIndex: 1000,
              minWidth: "400px",
              maxWidth: "600px",
              maxHeight: "80vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid #e0e0e0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "bold" }}>
                Ngày {showMoreEvents.day.getDate()} tháng {showMoreEvents.day.getMonth() + 1}
              </h3>
              <button
                onClick={handleCloseModal}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#666",
                  padding: "0",
                  lineHeight: "1",
                }}
              >
                ×
              </button>
            </div>

            <div style={{
              padding: "20px",
              overflowY: "auto",
              flex: 1,
            }}>
              <div style={{ fontSize: "0.9rem", color: "#666", marginBottom: "12px" }}>
                Tổng số: {showMoreEvents.events.length} công việc
              </div>
              {showMoreEvents.events.map((event, index) => {
                const Icon = statusConfig[event.status].icon;
                return (
                  <div
                    key={event.id}
                    style={{
                      backgroundColor: statusConfig[event.status].bg,
                      borderLeft: `4px solid ${statusConfig[event.status].border}`,
                      borderRadius: "4px",
                      padding: "12px 16px",
                      marginBottom: "12px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div style={{ 
                      fontWeight: "500", 
                      marginBottom: "6px",
                      fontSize: "0.9rem",
                      color: "#333",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}>
                      <FlagIcon size={20} />
                      <Icon size={18} />
                      <span>{index + 1}. {event.title}</span>
                    </div>
                    <div style={{
                      fontSize: "0.8rem",
                      color: "#666",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}>
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: "12px",
                        backgroundColor: statusConfig[event.status].border,
                        color: "white",
                        fontSize: "0.75rem",
                      }}>
                        {statusConfig[event.status].label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{
              padding: "12px 20px",
              borderTop: "1px solid #e0e0e0",
              display: "flex",
              justifyContent: "flex-end",
            }}>
              <button
                onClick={handleCloseModal}
                style={{
                  padding: "8px 20px",
                  backgroundColor: "#1976d2",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: "500",
                }}
              >
                Đóng
              </button>
            </div>
          </div>
          </>
        )}
      </div>
    </>
  );
};

export default CalendarMonthView;