"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSelector } from "react-redux";
// import { fetchTopics } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/redux/slices/newsSlice";
import axiosClient from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/hooks/axiosClient";
import { API_PUBLISHED } from "./EnvironmentFile/urlConfig";
import { getResponsiveImage, DEFAULT_NEWS_THUMBNAIL } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/utils/imageHelper";
import { ROUTES } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/config/routes";
import { useCMS } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/context/CMSContext";
import * as S from "./TopicNewsGrid.styles";
import AuthImage from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimImage';

// ─── Sub-components ─────────────────────────────────────────────────────────

const NewsEmptyIcon = () => (
  <svg width="69" height="58" viewBox="0 0 69 58" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g opacity="0.3">
      <path d="M55.7148 8.57031H62.1434C63.7723 8.57011 65.3406 9.1883 66.5313 10.2999C67.7219 11.4116 68.4462 12.9338 68.5577 14.5589L68.572 14.9989V47.856C68.5721 50.2278 67.6647 52.5098 66.0358 54.2338C64.4069 55.9578 62.18 56.9932 59.812 57.1275L59.2863 57.1417H55.7148V8.57031Z" fill="url(#paint0_radial_4176_29283)" />
      <path d="M9.28571 57.1429C6.91389 57.143 4.63192 56.2356 2.90791 54.6067C1.18391 52.9777 0.148568 50.7509 0.0142861 48.3829L4.85677e-08 47.8571V6.42857C-0.000200062 4.79964 0.617987 3.23137 1.72963 2.0407C2.84127 0.850041 4.36346 0.125777 5.98857 0.0142861L6.42857 4.85678e-08H50.7143C52.3432 -0.000200062 53.9115 0.617986 55.1022 1.72963C56.2928 2.84127 57.0171 4.36346 57.1286 5.98857L57.1429 6.42857L57.1286 57.1429H9.28571Z" fill="url(#paint1_linear_4176_29283)" />
      <path d="M9.28571 57.1429C6.91389 57.143 4.63192 56.2356 2.90791 54.6067C1.18391 52.9777 0.148568 50.7509 0.0142861 48.3829L4.85677e-08 47.8571V6.42857C-0.000200062 4.79964 0.617987 3.23137 1.72963 2.0407C2.84127 0.850041 4.36346 0.125777 5.98857 0.0142861L6.42857 4.85678e-08H50.7143C52.3432 -0.000200062 53.9115 0.617986 55.1022 1.72963C56.2928 2.84127 57.0171 4.36346 57.1286 5.98857L57.1429 6.42857L57.1286 57.1429H9.28571Z" fill="url(#paint2_linear_4176_29283)" />
      <path d="M9.28571 57.1429C6.91389 57.143 4.63192 56.2356 2.90791 54.6067C1.18391 52.9777 0.148568 50.7509 0.0142861 48.3829L4.85677e-08 47.8571V6.42857C-0.000200062 4.79964 0.617987 3.23137 1.72963 2.0407C2.84127 0.850041 4.36346 0.125777 5.98857 0.0142861L6.42857 4.85678e-08H50.7143C52.3432 -0.000200062 53.9115 0.617986 55.1022 1.72963C56.2928 2.84127 57.0171 4.36346 57.1286 5.98857L57.1429 6.42857L57.1286 57.1429H9.28571Z" fill="url(#paint3_linear_4176_29283)" />
      <path d="M23.5629 25.7266C25.5343 25.7266 27.1343 27.3266 27.1343 29.298V39.2866C27.1343 41.258 25.5343 42.858 23.5629 42.858H13.5714C11.6 42.858 10 41.258 10 39.2866V29.298C10 27.3266 11.6 25.7266 13.5714 25.7266H23.5629Z" fill="url(#paint4_linear_4176_29283)" />
      <path d="M34.9981 38.5705H44.9866C45.5296 38.5707 46.0522 38.7769 46.4489 39.1476C46.8456 39.5182 47.0868 40.0256 47.1239 40.5673C47.1609 41.109 46.9909 41.6445 46.6483 42.0657C46.3056 42.4868 45.8159 42.7622 45.2781 42.8362L44.9866 42.8562H34.9981C34.4551 42.8561 33.9325 42.6498 33.5358 42.2792C33.1391 41.9085 32.8979 41.4011 32.8608 40.8594C32.8238 40.3178 32.9938 39.7822 33.3364 39.3611C33.6791 38.9399 34.1688 38.6645 34.7066 38.5905L34.9981 38.5705ZM34.9981 25.7219H44.9866C45.5296 25.7221 46.0522 25.9284 46.4489 26.299C46.8456 26.6697 47.0868 27.1771 47.1239 27.7187C47.1609 28.2604 46.9909 28.7959 46.6483 29.2171C46.3056 29.6382 45.8159 29.9137 45.2781 29.9877L44.9866 30.0077H34.9981C34.4551 30.0075 33.9325 29.8012 33.5358 29.4306C33.1391 29.0599 32.8979 28.5525 32.8608 28.0109C32.8238 27.4692 32.9938 26.9337 33.3364 26.5125C33.6791 26.0914 34.1688 25.8159 34.7066 25.7419L34.9981 25.7219ZM12.1295 12.8477H44.9866C45.5296 12.8478 46.0522 13.0541 46.4489 13.4247C46.8456 13.7954 47.0868 14.3028 47.1239 14.8445C47.1609 15.3861 46.9909 15.9216 46.6483 16.3428C46.3056 16.764 45.8159 17.0394 45.2781 17.1134L44.9866 17.1334H12.1295C11.5827 17.1389 11.0545 16.9352 10.653 16.564C10.2515 16.1928 10.0071 15.6821 9.96982 15.1366C9.93258 14.591 10.1053 14.0519 10.4526 13.6295C10.7999 13.2072 11.2956 12.9336 11.8381 12.8648L12.1295 12.8477Z" fill="url(#paint5_linear_4176_29283)" />
    </g>
    <defs>
      <radialGradient id="paint0_radial_4176_29283" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(76.284 15.8549) rotate(127.598) scale(33.7171 49.6774)">
        <stop stopColor="#068BEB" />
        <stop offset="0.617" stopColor="#0056CF" />
        <stop offset="0.974" stopColor="#0027A7" />
      </radialGradient>
      <linearGradient id="paint1_linear_4176_29283" x1="16.3257" y1="-8.79143" x2="63.6629" y2="49.6143" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3BD5FF" />
        <stop offset="1" stopColor="#367AF2" />
      </linearGradient>
      <linearGradient id="paint2_linear_4176_29283" x1="32.6543" y1="46.1543" x2="32.6543" y2="57.1429" gradientUnits="userSpaceOnUse">
        <stop offset="0.181" stopColor="#2764E7" stopOpacity="0" />
        <stop offset="1" stopColor="#2764E7" />
      </linearGradient>
      <linearGradient id="paint3_linear_4176_29283" x1="30.6114" y1="17.5829" x2="53.3314" y2="72.06" gradientUnits="userSpaceOnUse">
        <stop stopColor="#DCF8FF" stopOpacity="0" />
        <stop offset="1" stopColor="#FF6CE8" stopOpacity="0.7" />
      </linearGradient>
      <linearGradient id="paint4_linear_4176_29283" x1="11.6343" y1="24.8866" x2="20.2029" y2="42.0408" gradientUnits="userSpaceOnUse">
        <stop stopColor="#DEFCFF" />
        <stop offset="1" stopColor="#9FF0F9" />
      </linearGradient>
      <linearGradient id="paint5_linear_4176_29283" x1="13.2352" y1="13.3734" x2="17.3009" y2="45.8019" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FDFDFD" />
        <stop offset="1" stopColor="#CCEAFF" />
      </linearGradient>
    </defs>
  </svg>
);

function EmptyState() {
  return (
    <S.NoDataContainer>
      <S.EmptyState>
        <S.EmptyIconCircle>
          <NewsEmptyIcon />
        </S.EmptyIconCircle>
        <S.EmptyTitle>Chưa có tin tức nào</S.EmptyTitle>
        <S.EmptySubtitle>Chủ đề này chưa có tin tức nào được đăng tải</S.EmptySubtitle>
      </S.EmptyState>
    </S.NoDataContainer>
  );
}

function TopicPillItem({ topic, isActive, onClick }) {
  const handleClick = useCallback(() => {
    onClick(topic.id);
  }, [topic.id, onClick]);

  return (
    <S.TopicPill $isActive={isActive} onClick={handleClick}>
      {topic.name || topic.title}
    </S.TopicPill>
  );
}

function NewsCardItem({ item, onClick }) {
  const handleClick = useCallback(() => {
    onClick(item.id);
  }, [item.id, onClick]);

  return (
    <S.Card onClick={handleClick}>
      <S.CardImg>
        {(() => {
          const resImage = getResponsiveImage(item);
          const imgUrl = resImage.src;
          const isPlaceholder = !imgUrl || imgUrl.includes('placeholder.com');
          return (
            <AuthImage 
              src={isPlaceholder ? DEFAULT_NEWS_THUMBNAIL : imgUrl} 
              srcSet={isPlaceholder ? undefined : resImage.srcSet}
              sizes={isPlaceholder ? undefined : resImage.sizes}
              alt={item.title} 
            />
          );
        })()}
      </S.CardImg>
      <S.CardTitle>
        {item.isImportant && <S.UrgentTag>Quan trọng</S.UrgentTag>}
        {item.isNew && <S.NewTag>[Mới] </S.NewTag>}
        {item.title}
      </S.CardTitle>
    </S.Card>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function TopicNewsGrid() {
  // const dispatch = useDispatch();
  const { setActivePage } = useCMS();
  const { topicList } = useSelector((state) => state.news);

  const [activeTopicId, setActiveTopicId] = useState(null);
  const [newsList, setNewsList] = useState([]);
  const [isLoadingNews, setIsLoadingNews] = useState(false);

  // Removed fetchTopics({ limit: 20 }) to avoid duplicate API calls and overwriting global state
  // as PreviewView/EditView already fetch topics with limit 100

  const topics = useMemo(() => {
    const list = Array.isArray(topicList) ? topicList : (topicList?.data || topicList?.items || []);
    const activeList = list.filter(topic => !topic.status?.includes("Không hoạt động"));
    // Bỏ qua 3 chủ đề đầu tiên vì đã hiển thị ở phần tiêu điểm của BusinessPortal
    // Giới hạn số lượng topic hiển thị ở mức tối đa ~17 topics (tương đương limit 20 cũ)
    return activeList.slice(3, 20);
  }, [topicList]);

  const currentTopicId = activeTopicId || topics[0]?.id;

  useEffect(() => {
    let isMounted = true;
    const fetchNewsByTopic = async () => {
      if (!currentTopicId) return;

      setIsLoadingNews(true);
      try {
        const response = await axiosClient.get(`${API_PUBLISHED}/published`, {
          params: { topic: currentTopicId, limit: 6 }
        });
        const items = response.data?.items || response.items || (Array.isArray(response) ? response : []);

        if (isMounted) {
          setNewsList(items);
        }
      } catch (err) {
        // eslint-disable-next-line no-undef
        if (typeof logger !== 'undefined') logger.error("Error fetching news for topic:", err);
        // eslint-disable-next-line no-console
        else console.error("Error fetching news for topic:", err);
        if (isMounted) setNewsList([]);
      } finally {
        if (isMounted) setIsLoadingNews(false);
      }
    };

    fetchNewsByTopic();
    return () => { isMounted = false; };
  }, [currentTopicId]);

  const handleNewsClick = useCallback((id) => {
    const url = ROUTES.newsDetail(id);
    const fromUrl = window.location.pathname + window.location.search;
    setActivePage(url);
    window.history.pushState({ fromUrl }, "", url);
    window.scrollTo(0, 0);
  }, [setActivePage]);

  const handleViewAll = useCallback(() => {
    const activeTopic = topics.find(t => t.id === currentTopicId);
    const topicName = activeTopic?.name || activeTopic?.title || "";
    let url = "/tin-tuc";
    if (currentTopicId) {
      const params = new URLSearchParams({ topicId: currentTopicId });
      if (topicName) params.set("topicName", topicName);
      url = `/tin-tuc?${params.toString()}`;
    }
    setActivePage(url);
    window.history.pushState(null, "", url);
    window.scrollTo(0, 0);
  }, [currentTopicId, topics, setActivePage]);

  const handleTopicClick = useCallback((id) => {
    setActiveTopicId(id);
  }, []);

  return (
    <S.Container>
      {/* Header */}
      <S.Header>
        <S.TitleBox>
          <S.IconBox>
            <svg width="35" height="35" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.20833 13.5417V5.20833C5.20833 4.6558 5.42783 4.12589 5.81853 3.73519C6.20923 3.34449 6.73913 3.125 7.29167 3.125H19.7917C20.3442 3.125 20.8741 3.34449 21.2648 3.73519C21.6555 4.12589 21.875 4.6558 21.875 5.20833V18.75C21.875 19.7917 21.25 21.875 18.75 21.875M18.75 21.875H6.25C5.20833 21.875 3.125 21.25 3.125 18.75V16.6667H15.625V18.75C15.625 21.25 17.7083 21.875 18.75 21.875Z" stroke="url(#paint0_linear_2429_12445)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="paint0_linear_2429_12445" x1="3.125" y1="12.5" x2="21.875" y2="12.5" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#20AAEC" />
                  <stop offset="1" stopColor="#5567CC" />
                </linearGradient>
              </defs>
            </svg>
          </S.IconBox>
          <h2 className="bp-section-title">Tin tức theo chủ đề</h2>
        </S.TitleBox>
        <S.ViewAllBtn onClick={handleViewAll}>
          Xem tất cả
        </S.ViewAllBtn>
      </S.Header>

      {/* Topic Pills */}
      <S.TopicsBar>
        {topics.map((topic) => (
          <TopicPillItem
            key={topic.id}
            topic={topic}
            isActive={currentTopicId === topic.id}
            onClick={handleTopicClick}
          />
        ))}
      </S.TopicsBar>

      {/* News Grid */}
      <S.Grid $isLoading={isLoadingNews}>
        {newsList.length === 0 && isLoadingNews ? (
          [1, 2, 3, 4, 5, 6].map((idx) => (
            <S.SkeletonCard key={idx}>
              <S.SkeletonImg />
              <S.SkeletonTitle $h="18px" $mb="8px" />
              <S.SkeletonTitle $h="18px" $w="60%" />
            </S.SkeletonCard>
          ))
        ) : newsList.length > 0 ? (
          newsList.map((item) => (
            <NewsCardItem
              key={item.id}
              item={item}
              onClick={handleNewsClick}
            />
          ))
        ) : !isLoadingNews ? (
          <EmptyState />
        ) : null}
      </S.Grid>
    </S.Container>
  );
}
