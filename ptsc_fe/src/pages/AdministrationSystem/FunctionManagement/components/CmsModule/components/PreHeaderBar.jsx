"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Settings } from 'lucide-react'; // 1. Thêm Settings vào đây
import moment from 'moment';
import 'moment/locale/vi';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLatestNews } from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/redux/slices/newsSlice';
import { useRouter } from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimNav';
import { useCMS } from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/context/CMSContext';
import { ROUTES } from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/config/routes';
import * as S from './PreHeaderBar.styles';

// ─── Sub-components ─────────────────────────────────────────────────────────

function TickerItemComponent({ news, txt, acc, onClick }) {
  const handleClick = useCallback(() => {
    onClick(news.id);
  }, [news.id, onClick]);

  return (
    <S.TickerItem $txt={txt} $acc={acc} onClick={handleClick}>
      {news.title}
    </S.TickerItem>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PreHeaderBar({
  backgroundColor,
  textColor,
  accentColor,
  searchBgColor,
  height,
  hideSearch
}) {
  const dispatch = useDispatch();
  // 2. Lấy thêm userRoleList từ Redux store
  const { latestNews, userRoleList } = useSelector((state) => state.news);
  // 3. Lấy thêm setIsPreview từ CMSContext
  const { setActivePage, setIsPreview } = useCMS();
  const router = useRouter();

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const customBg = backgroundColor || '#fff';
  const customText = textColor || '#333';
  const customAccent = accentColor || '#0B5FFF';
  const customSearchBg = searchBgColor || `${customAccent}22`;
  const customHeight = height || 44;

  // 4. Kiểm tra quyền Admin dựa trên danh sách roles
  const isAdmin = useMemo(() => {
    return userRoleList?.roles?.some((role) => role === "ADMIN_NEWS");
  }, [userRoleList]);

  useEffect(() => {
    dispatch(fetchLatestNews({ page: 1, limit: 10 }));
    setMounted(true);
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(timer);
    };
  }, [dispatch]);

  const formatDateTime = useCallback((date) => {
    if (!date) return '';
    const m = moment(date).locale('vi');
    const formatted = m.format('dddd, DD/MM/YYYY');
    const capitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    return m.format('HH:mm') + ' \u2022 ' + capitalized;
  }, []);

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) return;
    const searchUrl = ROUTES.search(searchQuery.trim());
    if (setActivePage) {
      setActivePage(searchUrl);
      router.push(searchUrl);
    } else {
      router.push(searchUrl);
    }
    setIsSearchFocused(false);
  }, [searchQuery, setActivePage, router]);

  const handleNewsClick = useCallback((id) => {
    const url = ROUTES.newsDetail(id);
    if (setActivePage) {
      setActivePage(url);
      router.push(url);
    } else {
      router.push(url);
    }
  }, [setActivePage, router]);

  const handleSearchQueryChange = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleSearchKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleSearch();
  }, [handleSearch]);

  const handleSearchBlur = useCallback(() => {
    if (!searchQuery) setIsSearchFocused(false);
  }, [searchQuery]);

  const handleSearchTriggerClick = useCallback(() => {
    setIsSearchFocused(prev => !prev);
  }, []);

  // 5. Hàm xử lý khi nhấn vào nút cấu hình
  const handleEditClick = useCallback(() => {
    if (setIsPreview) {
      setIsPreview(false); // Chuyển sang màn hình cấu hình
    }
  }, [setIsPreview]);

  const handleMouseEnter = useCallback((e) => {
    e.currentTarget.style.animationPlayState = 'paused';
  }, []);

  const handleMouseLeave = useCallback((e) => {
    e.currentTarget.style.animationPlayState = 'running';
  }, []);

  const tickerNews = useMemo(() => latestNews || [], [latestNews]);

  const tickerDuration = useMemo(() => {
    return Math.max(tickerNews.length * 30, 60);
  }, [tickerNews.length]);

  if (!mounted) return null;

  return (
    <S.Wrapper $bkg={customBg} $isMob={isMobile} $ht={customHeight}>
      {/* LEFT: Ticker area */}
      <S.TickerWrap $txt={customText}>
        <S.TickerOuter>
          <S.TickerContent
            $dur={tickerDuration}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {tickerNews.length > 0 ? (
              <>
                {[...tickerNews, ...tickerNews].map((news, idx) => (
                  <span key={idx}>
                    <TickerItemComponent
                      news={news}
                      txt={customText}
                      acc={customAccent}
                      onClick={handleNewsClick}
                    />
                    <S.TickerDot $txt={customText}>&bull;</S.TickerDot>
                  </span>
                ))}
              </>
            ) : (
              <S.TickerItem $txt={customText}>Đang cập nhật bản tin...</S.TickerItem>
            )}
          </S.TickerContent>
        </S.TickerOuter>
      </S.TickerWrap>

      {/* RIGHT: Time & Search & Settings */}
      <S.RightContainer $bkg={customBg}>
        {!isMobile && (
          <S.TimeBox $txt={customText}>
            <span>{formatDateTime(currentTime)}</span>
          </S.TimeBox>
        )}

        {!hideSearch && (
          <S.SearchWrapper>
            <S.SearchInputContainer $isFoc={isSearchFocused} $isMob={isMobile}>
              <S.InlineInput
                autoFocus
                placeholder="Tìm kiếm..."
                $acc={customAccent}
                $txt={customText}
                value={searchQuery}
                onChange={handleSearchQueryChange}
                onKeyDown={handleSearchKeyDown}
                onBlur={handleSearchBlur}
              />
            </S.SearchInputContainer>
            <S.SearchTriggerBtn $acc={customAccent} $bgBtn={customSearchBg} onClick={handleSearchTriggerClick}>
              <Search size={16} />
            </S.SearchTriggerBtn>
          </S.SearchWrapper>
        )}

        {/* 6. Thêm nút cấu hình cho Admin tại đây */}
        {isAdmin && (
          <S.ConfigActionButton
            onClick={handleEditClick}
            title="Cấu hình giao diện"
            $acc={customAccent}
            $txt={customText}
          >
            <Settings size={18} />
          </S.ConfigActionButton>
        )}
      </S.RightContainer>
    </S.Wrapper>
  );
}