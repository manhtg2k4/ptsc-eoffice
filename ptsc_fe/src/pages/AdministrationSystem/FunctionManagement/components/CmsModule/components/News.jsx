import React, { useEffect, useState, useCallback } from "react";
import { getCounts, markRead, hasLiked, toggleLike } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/utils/newsStorage";
import {
  NewsWrapper,
  Skeleton,
  SkeletonFooter,
  NewsTitle,
  NewsContent,
  StyledLink,
  NewsFooter,
  LikeButton,
  LikeIcon,
  LikeCountValue,
  ReadCount,
} from "./News.styles";

export const News = ({ id, title, content, href, loading }) => {
  const [counts, setCounts] = useState({ reads: 0, likes: 0 });
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (loading) return;
    // Load initial data on client side only to match server HTML
    const initialCounts = getCounts(id);
    setCounts(initialCounts);
    setLiked(hasLiked(id));

    // Mark read
    const newCounts = markRead(id);
    setCounts(newCounts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onToggleLike = useCallback((e) => {
    e.preventDefault(); // Prevent navigation if clicked
    e.stopPropagation();
    const res = toggleLike(id);
    setCounts(prev => ({ ...prev, likes: res.likes }));
    setLiked(hasLiked(id));
  }, [id]);

  const InnerContent = () => (
    <>
      <NewsTitle>{title || "Tin tức"}</NewsTitle>
      <NewsContent>{content || "Tóm tắt nội dung tin..."}</NewsContent>
    </>
  );

  if (loading) {
    return (
      <NewsWrapper>
        <Skeleton $w="80%" $h="24px" $mb="12px" />
        <Skeleton $w="100%" $h="16px" $mb="8px" />
        <Skeleton $w="90%" $h="16px" $mb="16px" />
        <SkeletonFooter>
          <Skeleton $w="60px" $h="32px" $br="6px" />
          <Skeleton $w="80px" $h="20px" />
        </SkeletonFooter>
      </NewsWrapper>
    );
  }

  return (
    <NewsWrapper>
      {href ? (
        <StyledLink href={href}>
          <InnerContent />
        </StyledLink>
      ) : (
        <InnerContent />
      )}

      <NewsFooter>
        <LikeButton onClick={onToggleLike} $liked={liked}>
          <LikeIcon $liked={liked}>❤</LikeIcon>
          <LikeCountValue>{counts.likes || 0}</LikeCountValue>
        </LikeButton>

        <ReadCount>👁️ {counts.reads || 0} lượt đọc</ReadCount>
      </NewsFooter>
    </NewsWrapper>
  );
};
