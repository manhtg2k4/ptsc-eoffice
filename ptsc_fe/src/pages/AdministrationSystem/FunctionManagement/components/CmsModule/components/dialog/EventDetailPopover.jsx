"use client";

import React, { useEffect, useRef } from "react";
import {
  X,
  Trash2,
  // MoreVertical,
  MapPin,
  AlignLeft,
  Calendar,
  // Lock,
  Edit2,
  Users,
  AlertCircle
} from "lucide-react";
import moment from "moment";
import "moment/locale/vi"; // Import Vietnamese locale
import * as S from "./EventDetailPopover.styles";

const getAvatarColor = (name) => {
  const colors = [
    "#f44336", "#e91e63", "#9c27b0", "#673ab7", "#3f51b5",
    "#2196f3", "#03a9f4", "#00bcd4", "#009688", "#4caf50",
    "#8bc34a", "#cddc39", "#ff9800", "#ff5722", "#795548", "#607d8b"
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function EventDetailPopover({ 
  event, 
  isOpen, 
  onClose, 
  onDelete, 
  onEdit, 
  anchorRect, // The rect of the element clicked
  // isAdmin,
  isAdmins
}) {
  const popoverRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      const isClickInsideSummary = e.target.closest(".year-day-summary-popover");
      if (popoverRef.current && !popoverRef.current.contains(e.target) && !isClickInsideSummary) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  // Position the popover near the anchorRect
  useEffect(() => {
    if (isOpen && popoverRef.current && anchorRect) {
      const popRect = popoverRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let left = anchorRect.right + 10;
      let top = anchorRect.top - 20;

      // Flip left if not enough space on right
      if (left + popRect.width > viewportWidth) {
        left = anchorRect.left - popRect.width - 10;
      }

      // Adjust top if not enough space on bottom
      if (top + popRect.height > viewportHeight) {
        top = viewportHeight - popRect.height - 10;
      }
      
      // Ensure vertical bounds
      if (top < 10) top = 10;
      if (left < 10) left = 10;

      popoverRef.current.style.position = 'fixed';
      popoverRef.current.style.left = `${left}px`;
      popoverRef.current.style.top = `${top}px`;
    }
  }, [isOpen, anchorRect]);

  if (!isOpen || !event) return null;

  const handleDelete = () => onDelete(event);
  const handleEdit = () => onEdit(event);

  moment.locale("vi");
  const start = moment(event.startTime);
  const end = moment(event.endTime);
  const isSameDay = start.isSame(end, 'day');

  let displayDateTime = "";
  if (isSameDay) {
    let dateStr = start.format("dddd, D MMMM");
    dateStr = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    displayDateTime = `${dateStr} · ${start.format("HH:mm")} - ${end.format("HH:mm")}`;
  } else {
    let startStr = start.format("D MMM, HH:mm");
    let endStr = end.format("D MMM, HH:mm");
    displayDateTime = `${startStr} - ${endStr}`;
  }

  const getStatusColor = (event) => {
    const isImportant = event.status === 2 || event.isImportant;
    if (isImportant) return "#f59e0b"; // yellow
    const now = moment();
    const start = moment(event.startTime);
    const end = event.endTime ? moment(event.endTime) : moment(start).endOf('day');
    if (now.isAfter(end)) return "#94a3b8"; // gray
    if (now.isBetween(start, end, null, '[]')) return "#10b981"; // green
    return "#3b82f6"; // blue
  };

  return (
    <S.PopoverWrapper ref={popoverRef}>
      <S.PopoverHeader>
        {isAdmins && (
          <>
            <S.ActionButton title="Xóa" onClick={handleDelete}>
              <Trash2 size={16} />
            </S.ActionButton>
            <S.ActionButton title="Sửa" onClick={handleEdit}>
              <Edit2 size={16} />
            </S.ActionButton>
            {/* <S.ActionButton title="Tùy chọn khác">
              <MoreVertical size={16} />
            </S.ActionButton> */}
          </>
        )}
        <S.ActionButton onClick={onClose} title="Đóng">
          <X size={16} />
        </S.ActionButton>
      </S.PopoverHeader>

      <S.PopoverContent>
        <S.EventTitleRow>
          <S.ColorIndicator $indicatorColor={getStatusColor(event)} />
          <div style={{ flex: 1 }}>
            <S.Title>{event.title}</S.Title>
          </div>
        </S.EventTitleRow>

        <S.DateTimeInfo>
          {displayDateTime}
        </S.DateTimeInfo>

        {event.location && (
          <S.MetaRow>
            <div className="icon-area"><MapPin size={16} /></div>
            <div className="text-area">{event.location}</div>
          </S.MetaRow>
        )}

        <S.MetaRow>
          <div className="icon-area"><Calendar size={16} /></div>
          <div className="text-area">{event.type || "Sự kiện chung"}</div>
        </S.MetaRow>

        {event.participants && (
          <S.ParticipantRow>
            <div className="icon-area"><Users size={16} /></div>
            <div className="content-area">
              <S.ParticipantCount>
                {event.participants.split('@').filter(p => p.trim()).length} khách
              </S.ParticipantCount>
              <S.ParticipantsList>
                {event.participants.split('@').map(p => p.trim()).filter(Boolean).map((name) => (
                  <S.ParticipantItem key={name}>
                    <S.Avatar $indicatorColor={getAvatarColor(name)}>
                      {name.charAt(0)}
                    </S.Avatar>
                    <S.ParticipantName>{name}</S.ParticipantName>
                  </S.ParticipantItem>
                ))}
              </S.ParticipantsList>
            </div>
          </S.ParticipantRow>
        )}

        {event.description && (
          <S.MetaRow>
            <div className="icon-area"><AlignLeft size={16} /></div>
            <div className="text-area">Ghi chú: {event.description}</div>
          </S.MetaRow>
        )}

        <S.MetaRow>
          <div className="icon-area"><AlertCircle size={16} /></div>
          <div className="text-area">
            Quan trọng: {event.isImportant ? "Có" : "Không"}
          </div>
        </S.MetaRow>

        {/* <S.MetaRow>
          <div className="icon-area"><Lock size={16} /></div>
          <div className="text-area">Công khai</div>
        </S.MetaRow> */}
      </S.PopoverContent>
    </S.PopoverWrapper>
  );
}
