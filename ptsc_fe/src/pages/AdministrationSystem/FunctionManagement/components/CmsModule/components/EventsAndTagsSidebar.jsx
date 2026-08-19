"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchTags } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/redux/slices/newsSlice";
import moment from "moment";
import {
  ChevronRight
} from "lucide-react";
import { useCMS } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/context/CMSContext";
import { useRouter } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimNav";
import { ROUTES } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/config/routes";
import axiosClient from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/hooks/axiosClient";
import { API_EVENT_CALENDAR } from "./EnvironmentFile/urlConfig";

export default function EventsAndTagsSidebar() {
  const dispatch = useDispatch();
  const { setActivePage } = useCMS();
  const { tagList, loading: tagsLoading } = useSelector((state) => state.news);
  const [eventCalendarList, setEventCalendarList] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const logger = console;

  useEffect(() => {
    dispatch(fetchTags());

    const getUpcomingEvents = async () => {
      setEventsLoading(true);
      try {
        const response = await axiosClient.get(API_EVENT_CALENDAR, {
          params: {
            limit: 3,
            isUpcoming: true
          }
        });
        const items = response?.items || response?.data?.items || [];
        setEventCalendarList(items);
      } catch (err) {
        logger.error("Error fetching upcoming events:", err);
      } finally {
        setEventsLoading(false);
      }
    };

    getUpcomingEvents();
  }, [dispatch]);

  const getEventIcon = (type) => {
    switch (type) {
      case "Ngày truyền thống":
        return (
          <svg width="26" height="26" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4.41667 6.25C3.44421 6.25 2.51158 6.63631 1.82394 7.32394C1.13631 8.01158 0.75 8.94421 0.75 9.91667V15.4167C0.75 15.9029 0.943154 16.3692 1.28697 16.713C1.63079 17.0568 2.0971 17.25 2.58333 17.25H15.4167C15.9029 17.25 16.3692 17.0568 16.713 16.713C17.0568 16.3692 17.25 15.9029 17.25 15.4167V9.91667C17.25 8.94421 16.8637 8.01158 16.1761 7.32394C15.4884 6.63631 14.5558 6.25 13.5833 6.25M4.41667 6.25H13.5833M4.41667 6.25V3.5M13.5833 6.25V3.5M9 3.5V6.25M9 0.75H9.00917M4.41667 0.75H4.42583M13.5833 0.75H13.5925" stroke="url(#sidebar_paint0_l1)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M0.75 9.91602C0.75 10.8327 1.3 12.666 3.5 12.666C5.7 12.666 6.25 10.8327 6.25 9.91602C6.25 10.8327 6.8 12.666 9 12.666C11.2 12.666 11.75 10.8327 11.75 9.91602C11.75 10.8327 12.3 12.666 14.5 12.666C16.7 12.666 17.25 10.8327 17.25 9.91602" stroke="url(#sidebar_paint1_l1)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="sidebar_paint0_l1" x1="9" y1="0.75" x2="9" y2="17.25" gradientUnits="userSpaceOnUse"><stop stopColor="#FF9C39" /><stop offset="1" stopColor="#FFBB44" /></linearGradient>
              <linearGradient id="sidebar_paint1_l1" x1="9" y1="9.91602" x2="9" y2="12.666" gradientUnits="userSpaceOnUse"><stop stopColor="#FF9C39" /><stop offset="1" stopColor="#FFBB44" /></linearGradient>
            </defs>
          </svg>
        );
      case "Hội nghị & Đại hội":
        return (
          <svg width="29" height="29" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.32 7.27626C18.0109 8.44949 18.3618 9.79187 18.3332 11.1532C18.3046 12.5144 17.8977 13.8409 17.1581 14.9841C16.4185 16.1273 15.3753 17.0421 14.1454 17.6261C12.9154 18.2101 11.5472 18.4403 10.1938 18.2909M4.68279 14.7269C3.99182 13.5537 3.641 12.2113 3.66959 10.85C3.69817 9.48876 4.10504 8.16229 4.84465 7.0191C5.58426 5.87591 6.62742 4.96111 7.85739 4.37709C9.08736 3.79307 10.4556 3.56287 11.809 3.71226" stroke="url(#sidebar_paint0_l2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14.8872 7.11174C15.6032 7.8277 16.764 7.8277 17.48 7.11174C18.1959 6.39578 18.1959 5.23498 17.48 4.51902C16.764 3.80306 15.6032 3.80306 14.8872 4.51902C14.1713 5.23498 14.1713 6.39578 14.8872 7.11174Z" stroke="url(#sidebar_paint1_l2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4.51614 17.4828C5.2321 18.1988 6.3929 18.1988 7.10886 17.4828C7.82482 16.7669 7.82482 15.6061 7.10886 14.8901C6.3929 14.1742 5.2321 14.1742 4.51614 14.8901C3.80018 15.6061 3.80018 16.7669 4.51614 17.4828Z" stroke="url(#sidebar_paint2_l2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9.70364 12.2973C10.4196 13.0133 11.5804 13.0133 12.2964 12.2973C13.0123 11.5813 13.0123 10.4205 12.2964 9.70457C11.5804 8.9886 10.4196 8.9886 9.70364 9.70457C8.98768 10.4205 8.98768 11.5813 9.70364 12.2973Z" stroke="url(#sidebar_paint3_l2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="sidebar_paint0_l2" x1="11.0014" y1="3.66797" x2="11.0014" y2="18.3352" gradientUnits="userSpaceOnUse"><stop stopColor="#FF9C39" /><stop offset="1" stopColor="#FFBB44" /></linearGradient>
              <linearGradient id="sidebar_paint1_l2" x1="17.48" y1="4.51902" x2="14.8872" y2="7.11174" gradientUnits="userSpaceOnUse"><stop stopColor="#FF9C39" /><stop offset="1" stopColor="#FFBB44" /></linearGradient>
              <linearGradient id="sidebar_paint2_l2" x1="7.10886" y1="14.8901" x2="4.51614" y2="17.4828" gradientUnits="userSpaceOnUse"><stop stopColor="#FF9C39" /><stop offset="1" stopColor="#FFBB44" /></linearGradient>
              <linearGradient id="sidebar_paint3_l2" x1="12.2964" y1="9.70457" x2="9.70364" y2="12.2973" gradientUnits="userSpaceOnUse"><stop stopColor="#FF9C39" /><stop offset="1" stopColor="#FFBB44" /></linearGradient>
            </defs>
          </svg>
        );
      case "Sản xuất kinh doanh":
        return (
          <svg width="26" height="26" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.4167 14.6667L19.25 11L15.5833 10.1851M15.5833 10.1851L11 9.16667M15.5833 10.1851L16.5 5.5H12.8333M11 9.16667V13.75M11 9.16667L6.41667 10.1851M6.41667 10.1851L2.75 11L4.58333 14.6667M6.41667 10.1851L5.5 5.5H9.16667M9.16667 5.5V2.75H12.8333V5.5M9.16667 5.5H12.8333M2.75 18.3333L3.89125 17.8768C4.24607 17.7349 4.63008 17.6815 5.01016 17.7211C5.39023 17.7607 5.75497 17.8922 6.07292 18.1042C6.54852 18.4213 7.1232 18.5547 7.68987 18.4795C8.25653 18.4042 8.77652 18.1256 9.15292 17.6953L9.185 17.6587C9.41128 17.3998 9.6903 17.1924 10.0033 17.0503C10.3164 16.9081 10.6562 16.8346 11 16.8346C11.3438 16.8346 11.6836 16.9081 11.9967 17.0503C12.3097 17.1924 12.5887 17.3998 12.815 17.6587L12.848 17.6953C13.2244 18.1256 13.7444 18.4042 14.3111 18.4795C14.8777 18.5547 15.4524 18.4213 15.928 18.1042C16.2459 17.8922 16.6107 17.7607 16.9908 17.7211C17.3708 17.6815 17.7548 17.7349 18.1097 17.8768L19.25 18.3333" stroke="url(#sidebar_paint0_l3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="sidebar_paint0_l3" x1="11" y1="2.75" x2="11" y2="18.5" gradientUnits="userSpaceOnUse"><stop stopColor="#FF9C39" /><stop offset="1" stopColor="#FFBB44" /></linearGradient>
            </defs>
          </svg>
        );
      case "Văn hóa - Đoàn thể":
        return (
          <svg width="26" height="26" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10.9987 14.6673C14.5425 14.6673 17.4154 11.7945 17.4154 8.25065C17.4154 4.70682 14.5425 1.83398 10.9987 1.83398C7.45487 1.83398 4.58203 4.70682 4.58203 8.25065C4.58203 11.7945 7.45487 14.6673 10.9987 14.6673Z" stroke="url(#paint0_linear_case_vhdt)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6.41406 12.834V18.5485C6.41419 18.7106 6.45731 18.8698 6.53901 19.0098C6.62072 19.1498 6.7381 19.2656 6.87917 19.3455C7.02025 19.4253 7.17998 19.4664 7.34208 19.4644C7.50417 19.4623 7.66284 19.4174 7.8019 19.3341L10.5262 17.7006C10.6686 17.6153 10.8314 17.5702 10.9974 17.5702C11.1634 17.5702 11.3262 17.6153 11.4686 17.7006L14.1929 19.3341C14.332 19.4174 14.4906 19.4623 14.6527 19.4644C14.8148 19.4664 14.9745 19.4253 15.1156 19.3455C15.2567 19.2656 15.3741 19.1498 15.4558 19.0098C15.5375 18.8698 15.5806 18.7106 15.5807 18.5485V12.834" stroke="url(#paint1_linear_case_vhdt)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <defs>
              <linearGradient id="paint0_linear_case_vhdt" x1="10.9987" y1="1.83398" x2="10.9987" y2="14.6673" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FF9C39"/>
                <stop offset="1" stopColor="#FFBB44"/>
              </linearGradient>
              <linearGradient id="paint1_linear_case_vhdt" x1="10.9974" y1="12.834" x2="10.9974" y2="19.4644" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FF9C39"/>
                <stop offset="1" stopColor="#FFBB44"/>
              </linearGradient>
            </defs>
          </svg>
        );
      default:
        return (
          <svg width="26" height="26" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4.41667 6.25C3.44421 6.25 2.51158 6.63631 1.82394 7.32394C1.13631 8.01158 0.75 8.94421 0.75 9.91667V15.4167C0.75 15.9029 0.943154 16.3692 1.28697 16.713C1.63079 17.0568 2.0971 17.25 2.58333 17.25H15.4167C15.9029 17.25 16.3692 17.0568 16.713 16.713C17.0568 16.3692 17.25 15.9029 17.25 15.4167V9.91667C17.25 8.94421 16.8637 8.01158 16.1761 7.32394C15.4884 6.63631 14.5558 6.25 13.5833 6.25M4.41667 6.25H13.5833M4.41667 6.25V3.5M13.5833 6.25V3.5M9 3.5V6.25M9 0.75H9.00917M4.41667 0.75H4.42583M13.5833 0.75H13.5925" stroke="url(#sidebar_paint0_l_def)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="sidebar_paint0_l_def" x1="9" y1="0.75" x2="9" y2="17.25" gradientUnits="userSpaceOnUse"><stop stopColor="#FF9C39" /><stop offset="1" stopColor="#FFBB44" /></linearGradient>
            </defs>
          </svg>
        );
    }
  };


  const upcomingEvents = useMemo(() => {
    if (!eventCalendarList || !Array.isArray(eventCalendarList)) return [];

    return eventCalendarList
      .filter(event => moment(event.startTime).isAfter(moment()))
      .sort((a, b) => moment(a.startTime).diff(moment(b.startTime)))
      .slice(0, 3)
      .map(event => ({
        id: event.id,
        date: moment(event.startTime).format("DD/MM"),
        rawDate: event.startTime,
        title: event.title,
        time: `${moment(event.startTime).format("HH:mm")} - ${moment(event.endTime).format("HH:mm")}`,
        location: event.location || "Tân Cảng",
        icon: getEventIcon(event.type)
      }));
  }, [eventCalendarList]);

  const displayTags = useMemo(() => {
    const baseTags = (tagList?.length > 0 ? tagList : [
      "tancangsaigon", "binhdoan20", "logistics",
      "cangbienso", "chuyendoiso", "daotao",
      "congtudong"
    ]);
    return baseTags.slice(0, 12);
  }, [tagList]);

  const router = useRouter();

  const handleTagClick = useCallback((tag) => {
    const url = `/search?q=${encodeURIComponent(tag)}`;
    if (setActivePage) {
      setActivePage(url);
    }
    if (router?.push) {
      router.push(url);
    } else {
      window.history.pushState(null, "", url);
    }
    window.scrollTo(0, 0);
  }, [setActivePage, router]);

  const handleLinkClick = useCallback((url, date = null) => {
    let finalUrl = url;
    if (date) {
      finalUrl = `${url}?date=${moment(date).format("YYYY-MM-DD")}`;
    }
    if (setActivePage) {
      setActivePage(finalUrl);
    }
    if (router?.push) {
      router.push(finalUrl);
    } else {
      window.history.pushState(null, "", finalUrl);
    }
    window.scrollTo(0, 0);
  }, [setActivePage, router]);

  // ─── Empty States ────────────────────────────────────────────────────────
  const EventEmptyIcon = () => (
    <svg width="63" height="63" viewBox="0 0 63 63" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path opacity="0.3" d="M2.5 21.5467V53.2911C2.5 54.9749 3.25251 56.5898 4.59199 57.7805C5.93147 58.9711 7.74819 59.64 9.6425 59.64H52.4975C54.3918 59.64 56.2085 58.9711 57.548 57.7805C58.8875 56.5898 59.64 54.9749 59.64 53.2911V21.5467M2.5 21.5467V15.1978C2.5 13.5139 3.25251 11.8991 4.59199 10.7084C5.93147 9.51779 7.74819 8.84889 9.6425 8.84889H16.785M2.5 21.5467H59.64M59.64 21.5467V15.1978C59.64 13.5139 58.8875 11.8991 57.548 10.7084C56.2085 9.51779 54.3918 8.84889 52.4975 8.84889H45.355M16.785 8.84889H45.355M16.785 8.84889V2.5M45.355 8.84889V2.5" stroke="url(#sidebar_paint_event_no_data)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
      <defs>
        <linearGradient id="sidebar_paint_event_no_data" x1="2.5" y1="31.07" x2="59.64" y2="31.07" gradientUnits="userSpaceOnUse">
          <stop stopColor="#20AAEC"/>
          <stop offset="1" stopColor="#5567CC"/>
        </linearGradient>
      </defs>
    </svg>
  );

  const TagEmptyIcon = () => (
    <svg width="35" height="35" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g opacity="0.3">
        <path d="M10.5042 9.99916L9.99916 10.5042M4.28516 15.9589V7.14216C4.28516 6.38443 4.58616 5.65774 5.12195 5.12195C5.65774 4.58616 6.38443 4.28516 7.14216 4.28516H15.9589C16.7165 4.28532 17.4431 4.58643 17.9788 5.12226L29.4068 16.5503C29.9424 17.086 30.2433 17.8126 30.2433 18.5702C30.2433 19.3277 29.9424 20.0543 29.4068 20.5901L20.5901 29.4068C20.0543 29.9424 19.3277 30.2433 18.5702 30.2433C17.8126 30.2433 17.086 29.9424 16.5503 29.4068L5.12226 17.9788C4.58643 17.4431 4.28532 16.7165 4.28516 15.9589Z" stroke="url(#sidebar_paint_tag_no_data)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
      <defs>
        <linearGradient id="sidebar_paint_tag_no_data" x1="4.28516" y1="17.2642" x2="30.2432" y2="17.2642" gradientUnits="userSpaceOnUse">
          <stop stopColor="#20AAEC"/>
          <stop offset="1" stopColor="#5567CC"/>
        </linearGradient>
      </defs>
    </svg>
  );

  const SidebarEmptyState = ({ type = 'event' }) => {
    const isEvent = type === 'event';
    return (
      <div className="sidebar-empty-container">
        <div className="sidebar-empty-icon-circle">
          {isEvent ? <EventEmptyIcon /> : <TagEmptyIcon />}
        </div>
        <h4 className="sidebar-empty-title">
          {isEvent ? 'Chưa có sự kiện' : 'Chưa tags nổi bật'}
        </h4>
        {isEvent && (
          <p className="sidebar-empty-subtitle">Sắp tới chưa có sự kiện nào</p>
        )}
      </div>
    );
  };

  // Stable handler factories to avoid inline arrow functions in JSX
  const handleViewCalendarClick = useCallback(() => {
    handleLinkClick(ROUTES.CALENDAR);
  }, [handleLinkClick]);

  const handleEventItemClick = useCallback((rawDate) => () => {
    handleLinkClick(ROUTES.CALENDAR, rawDate);
  }, [handleLinkClick]);

  const handleTagItemClick = useCallback((tag) => () => {
    handleTagClick(typeof tag === "string" ? tag : tag.name);
  }, [handleTagClick]);

  return (
    <aside className="ets-sidebar">

      {/* Section 1: Upcoming Events */}
      <section className="ets-section">
        <div className="ets-header">
          <div className="ets-title-box">
            <svg width="35" height="35" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4.16797 9.72157V18.9808C4.16797 19.472 4.38746 19.943 4.77816 20.2903C5.16886 20.6376 5.69877 20.8327 6.2513 20.8327H18.7513C19.3038 20.8327 19.8337 20.6376 20.2244 20.2903C20.6151 19.943 20.8346 19.472 20.8346 18.9808V9.72157M4.16797 9.72157V7.86972C4.16797 7.37858 4.38746 6.90755 4.77816 6.56026C5.16886 6.21297 5.69877 6.01787 6.2513 6.01787H8.33464M4.16797 9.72157H20.8346M20.8346 9.72157V7.86972C20.8346 7.37858 20.6151 6.90755 20.2244 6.56026C19.8337 6.21297 19.3038 6.01787 18.7513 6.01787H16.668M8.33464 6.01787H16.668M8.33464 6.01787V4.16602M16.668 6.01787V4.16602" stroke="url(#paint0_linear_2429_12522)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="paint0_linear_2429_12522" x1="4.16797" y1="12.4993" x2="20.8346" y2="12.4993" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#20AAEC" />
                  <stop offset="1" stopColor="#5567CC" />
                </linearGradient>
              </defs>
            </svg>
            <h2 className="ets-title">Sự kiện sắp tới</h2>
          </div>
          <span className="ets-view-all" onClick={handleViewCalendarClick}>
            Xem lịch
          </span>
        </div>

        <div className="ets-events-list">
          {eventsLoading ? (
            Array(3).fill(0).map((_, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={i} className="ets-event-item" style={{ pointerEvents: "none" }}>
                <div className="ets-event-indicator skeleton"></div>
                <div className="ets-event-left">
                  <div className="skeleton" style={{ width: "24px", height: "24px", borderRadius: "50%" }}></div>
                  <div className="skeleton" style={{ width: "35px", height: "14px", marginTop: "4px" }}></div>
                </div>
                <div className="ets-event-center">
                  <div className="skeleton" style={{ height: "16px", marginBottom: "8px" }}></div>
                  <div className="skeleton" style={{ height: "12px", width: "60%" }}></div>
                </div>
              </div>
            ))
          ) : upcomingEvents.length > 0 ? (
            upcomingEvents.map((event) => (
              <div key={event.id} className="ets-event-item" onClick={handleEventItemClick(event.rawDate)}>
                <div className="ets-event-indicator"></div>
                <div className="ets-event-left">
                  <div className="ets-event-icon">
                    {event.icon}
                  </div>
                  <div className="ets-event-date">{event.date}</div>
                </div>
                <div className="ets-event-center">
                  <h3 className="ets-event-title">{event.title}</h3>
                  <div className="ets-event-meta">
                    {event.time} • {event.location}
                  </div>
                </div>
                <div className="ets-event-right">
                  <ChevronRight size={18} />
                </div>
              </div>
            ))
          ) : !eventsLoading ? (
            <SidebarEmptyState type="event" />
          ) : null}
        </div>
      </section>

      {/* Section 2: Featured Tags */}
      <section className="ets-section">
        <div className="ets-header">
          <div className="ets-title-box">
            <svg width="35" height="35" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.65994 7.29167L7.29167 7.65991M3.125 11.6375V5.20833C3.125 4.6558 3.34449 4.12589 3.73519 3.73519C4.12589 3.34449 4.6558 3.125 5.20833 3.125H11.6375C12.19 3.12512 12.7198 3.34469 13.1104 3.73542L21.4437 12.0688C21.8343 12.4594 22.0537 12.9892 22.0537 13.5417C22.0537 14.0941 21.8343 14.6239 21.4437 15.0146L15.0146 21.4437C14.6239 21.8343 14.0941 22.0537 13.5417 22.0537C12.9892 22.0537 12.4594 21.8343 12.0688 21.4437L3.73542 13.1104C3.34469 12.7198 3.12512 12.19 3.125 11.6375Z" stroke="url(#paint0_linear_2429_12558)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="paint0_linear_2429_12558" x1="3.125" y1="12.5894" x2="22.0537" y2="12.5894" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#20AAEC" />
                  <stop offset="1" stopColor="#5567CC" />
                </linearGradient>
              </defs>
            </svg>
            <h2 className="ets-title">Tags nổi bật</h2>
          </div>
        </div>

        <div className={"ets-tags-cloud" + (displayTags.length === 0 ? " empty" : "")}>
          {tagsLoading ? (
            Array(8).fill(0).map((_, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={i} className="skeleton" style={{ height: "20px", width: i % 2 === 0 ? "80px" : "100px", borderRadius: "10px" }}></div>
            ))
          ) : displayTags.length > 0 ? (
            displayTags.map((tag, idx) => {
              const tagKey = typeof tag === "string" ? tag : tag.id || tag.name || idx;
              return (
                <span
                  key={tagKey}
                  className="ets-tag"
                  onClick={handleTagItemClick(tag)}
                >
                  #{typeof tag === "string" ? tag : tag.name}
                </span>
              );
            })
          ) : !tagsLoading ? (
            <SidebarEmptyState type="tag" />
          ) : null}
        </div>
      </section>

      <style>{`
        .ets-sidebar {
          display: flex;
          flex-direction: column;
          gap: 40px;
          padding: 32px;
          border-radius: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
          height: 100%;
          box-sizing: border-box;
        }

        .ets-section {
          width: 100%;
          display: flex;
          flex-direction: column;
        }

        .ets-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-shrink: 0;
          padding-top: 40px;
        }

        .ets-title-box {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .ets-icon-blue {
          color: #3b82f6;
        }

        .ets-title {
          font-size: 26px !important;
          font-weight: 500 !important;
          background: linear-gradient(90deg, #20AAEC 0%, #5567CC 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-fill-color: transparent;
          margin: 0;
          letter-spacing: -0.5px;
        }

        .ets-view-all {
          font-size: 14px;
          font-weight: 600;
          color: #94a3b8;
          cursor: pointer;
          transition: color 0.2s;
        }

        .ets-view-all:hover {
          color: #3b82f6;
        }

        /* Events List */
        .ets-events-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .ets-event-item {
          display: flex;
          align-items: center;
          padding: 16px;
          padding-left: 20px;
          border-radius: 12px;
          position: relative;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid transparent;
          height: 85px; /* Fixed height for each item */
          box-sizing: border-box;
        }

        .ets-event-item:hover {
          background: #fff;
          border-color: #e2e8f0;
          transform: translateX(4px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .ets-event-indicator {
          position: absolute;
          left: 0;
          top: 15%;
          bottom: 15%;
          width: 3px;
          background: #f97316;
          border-radius: 0 4px 4px 0;
        }

        .ets-event-left {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 60px;
          flex-shrink: 0;
          gap: 8px;
        }

        .ets-event-icon {
          color: #f97316;
        }

        .ets-event-date {
          font-size: 14px;
          font-weight: 700;
          color: #64748b;
        }

        .ets-event-center {
          flex: 1;
          padding-left: 12px;
          overflow: hidden;
        }

        .ets-event-title {
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
          line-height: 1.4;
          margin: 0 0 6px 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ets-event-meta {
          font-size: 15px;
          color: #94a3b8;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ets-event-right {
          color: #cbd5e1;
          padding-left: 8px;
          flex-shrink: 0;
        }

        .ets-event-item:hover .ets-event-right {
          color: #3b82f6;
        }

        /* Tags Cloud */
        .ets-tags-cloud {
          display: flex;
          flex-wrap: wrap;
          gap: 10px 20px;
          padding: 10px 0;
          min-height: 150px; /* Reserves space for tag cloud */
          align-content: flex-start;
        }

        .ets-tag {
          font-size: 18px;
          font-weight: 400;
          color: #3b82f6;
          cursor: pointer;
          transition: all 0.2s;
          opacity: 0.85;
        }

        .ets-tag:hover {
          opacity: 1;
          transform: scale(1.05);
          text-decoration: underline;
        }

        /* Empty States */
        .sidebar-empty-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 20px 0;
          animation: fadeIn 0.4s ease;
        }

        .sidebar-empty-icon-circle {
          width: 120px;
          height: 120px;
          background: radial-gradient(50% 50% at 50% 50%, rgba(224, 242, 254, 0.4) 0%, rgba(224, 242, 254, 0) 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .sidebar-empty-title {
          font-size: 16px;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 8px 0;
        }

        .sidebar-empty-subtitle {
          font-size: 13px;
          color: #94a3b8;
          margin: 0;
          max-width: 200px;
          line-height: 1.5;
        }

        .ets-tags-cloud.empty {
          justify-content: center;
          min-height: 180px;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 640px) {
          .ets-sidebar { padding: 16px; }
          .ets-title { font-size: 18px; }
        }
      `}</style>
    </aside>
  );
}
