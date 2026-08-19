"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import {
  Overlay,
  ModalContainer,
  CloseButton,
  Stage,
  ImageCard,
  GalleryImage,
  OverlayDim,
  InfoGradient,
  TextContent,
  Meta,
  Title,
  DotsContainer,
  DotItem,
} from './ImageGalleryModal.styles';

const GalleryDot = React.memo(({ index, isActive, onClick }) => {
  const handleClick = useCallback(() => {
    onClick(index);
  }, [index, onClick]);

  return <DotItem $isActive={isActive} onClick={handleClick} />;
});

GalleryDot.displayName = "GalleryDot";

const ImageGalleryModal = ({ item, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;

  const images = item?.images || [];
  const totalImages = images.length;

  const nextImage = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalImages);
  }, [totalImages]);

  const prevImage = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalImages) % totalImages);
  }, [totalImages]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "ArrowRight") nextImage();
    if (e.key === "ArrowLeft") prevImage();
    if (e.key === "Escape") onClose();
  }, [nextImage, prevImage, onClose]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const onTouchStart = useCallback((e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const onTouchMove = useCallback((e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) nextImage();
    if (isRightSwipe) prevImage();
  }, [touchStart, touchEnd, nextImage, prevImage]);

  const stopPropagation = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const setIndex = useCallback((idx) => {
    setCurrentIndex(idx);
  }, []);

  return (
    <Overlay onClick={onClose}>
      <ModalContainer onClick={stopPropagation}>
        <CloseButton onClick={onClose}>
          <X size={24} />
        </CloseButton>

        <Stage
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {totalImages > 1 && (
            <ImageCard onClick={prevImage}>
              <GalleryImage src={images[(currentIndex - 1 + totalImages) % totalImages]?.url || item.thumbnail} alt="prev" />
              <OverlayDim />
            </ImageCard>
          )}

          <ImageCard $isMain>
            <GalleryImage src={images[currentIndex]?.url || item.thumbnail} alt="main" />

            <InfoGradient>
              <TextContent>
                <Meta>
                  <span>Tác giả: {item.createdByName || item.author || "Tạ Minh Duy"}</span>
                  <span className="dot">•</span>
                  <span>{item.departmentName || item.department || "Phòng Chính trị TCT"}</span>
                </Meta>
                <Title>{item.title}</Title>
              </TextContent>
            </InfoGradient>
          </ImageCard>

          {totalImages > 1 && (
            <ImageCard onClick={nextImage}>
              <GalleryImage src={images[(currentIndex + 1) % totalImages]?.url || item.thumbnail} alt="next" />
              <OverlayDim />
            </ImageCard>
          )}
        </Stage>

        <DotsContainer>
          {totalImages > 0 ? (
            images.map((img, idx) => (
              <GalleryDot
                key={img.url || idx}
                index={idx}
                isActive={idx === currentIndex}
                onClick={setIndex}
              />
            ))
          ) : (
            <DotItem $isActive />
          )}
        </DotsContainer>
      </ModalContainer>
    </Overlay>
  );
};

export default ImageGalleryModal;
