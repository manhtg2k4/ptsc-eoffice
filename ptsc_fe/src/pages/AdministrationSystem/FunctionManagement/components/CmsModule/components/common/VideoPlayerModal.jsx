"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  RotateCcw,
  RotateCw,
  Pause,
  Play,
  Volume2,
  Minimize,
  Maximize,
  MoreVertical,
  Download,
  Link as LinkIcon,
  X,
  Mail
} from "lucide-react";
import { toast } from "react-toastify";
import {
  ModalOverlay,
  VideoModalWrap,
  Header,
  TitleText,
  CloseButton,
  PlayerMain,
  VideoTag,
  CenterControls,
  CircleButton,
  VolumeSide,
  SliderVertical,
  SliderTrack,
  SliderFill,
  BottomBar,
  TimeLabel,
  ProgressWrap,
  ProgressRail,
  ProgressFill,
  ProgressKnob,
  ActionsContainer,
  MoreMenuWrap,
  OptionsMenu,
  OptionItem,
  StyledHeart,
} from './VideoPlayerModal.styles';

const VideoPlayerModal = ({ item, videoUrl, onClose, isLiked, onLike, onDownload }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoVolume, setVideoVolume] = useState(60);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showModalMoreMenu, setShowModalMoreMenu] = useState(false);

  const videoRef = useRef(null);
  const progressWrapRef = useRef(null);
  const volumeWrapRef = useRef(null);
  const videoModalWrapRef = useRef(null);
  const isDraggingRef = useRef(false);
  const isDraggingVolumeRef = useRef(false);
  const wasPlayingRef = useRef(false);
  const videoDurationRef = useRef(0);

  const parseDurationToSeconds = useCallback((duration) => {
    if (!duration) return 0;
    if (typeof duration === 'number') return Math.floor(duration);
    if (typeof duration === 'string') {
      if (!duration.includes(':')) return parseInt(duration, 10) || 0;
      const parts = duration.split(':').map(Number);
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  }, []);

  const formatVideoTime = useCallback((seconds) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return "0:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  }, []);

  useEffect(() => {
    const dur = parseDurationToSeconds(item?.duration) || item?.durationInSeconds || 0;
    if (dur > 0) {
      setVideoDuration(dur);
      videoDurationRef.current = dur;
    }
    setIsPlaying(true);
  }, [item, parseDurationToSeconds]);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  const toggleFullscreen = useCallback((e) => {
    e?.stopPropagation();
    const wrap = videoModalWrapRef.current;
    if (!document.fullscreenElement) {
      if (wrap?.requestFullscreen) wrap.requestFullscreen();
      else if (wrap?.webkitRequestFullscreen) wrap.webkitRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = videoVolume / 100;
    }
  }, [videoVolume]);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => setIsPlaying(false));
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  const stopPropagation = useCallback((e) => e.stopPropagation(), []);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current && !isDraggingRef.current) {
      setVideoTime(Math.floor(videoRef.current.currentTime));
    }
  }, []);

  const handleLoadedMetadata = useCallback((e) => {
    const dur = Math.floor(e.target.duration);
    if (!isNaN(dur) && dur > 0) {
      setVideoDuration(dur);
      videoDurationRef.current = dur;
    }
  }, []);

  const handleSeekBack = useCallback((e) => {
    e.stopPropagation();
    if (videoRef.current) {
      const newTime = Math.max(0, videoRef.current.currentTime - 15);
      videoRef.current.currentTime = newTime;
      setVideoTime(Math.floor(newTime));
    }
  }, []);

  const handleSeekForward = useCallback((e) => {
    e.stopPropagation();
    if (videoRef.current) {
      const duration = videoRef.current.duration || videoDuration;
      if (duration) {
        const newTime = Math.min(duration, videoRef.current.currentTime + 15);
        videoRef.current.currentTime = newTime;
        setVideoTime(Math.floor(newTime));
      }
    }
  }, [videoDuration]);

  const togglePlay = useCallback((e) => {
    e.stopPropagation();
    setIsPlaying(prev => !prev);
  }, []);

  const handleVolumeChange = useCallback((e) => {
    e.stopPropagation();
    if (volumeWrapRef.current) {
      const rect = volumeWrapRef.current.getBoundingClientRect();
      const val = 100 - ((e.clientY - rect.top) / rect.height * 100);
      setVideoVolume(Math.min(100, Math.max(0, val)));
    }
  }, []);

  const toggleMute = useCallback(() => {
    setVideoVolume(prev => (prev === 0 ? 60 : 0));
  }, []);

  const handleProgressMouseDown = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    isDraggingRef.current = true;
    if (videoRef.current) {
      wasPlayingRef.current = !videoRef.current.paused;
      videoRef.current.pause();
      setIsPlaying(false);
    }
    if (progressWrapRef.current) {
      const rect = progressWrapRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const duration = videoDurationRef.current || videoRef.current?.duration || 0;
      if (duration > 0) {
        const newTime = Math.floor(pct * duration);
        if (videoRef.current) videoRef.current.currentTime = newTime;
        setVideoTime(newTime);
      }
    }
  }, []);

  const handleVolumeMouseDown = useCallback((e) => {
    e.stopPropagation();
    isDraggingVolumeRef.current = true;
    handleVolumeChange(e);
  }, [handleVolumeChange]);

  useEffect(() => {
    const handleMove = (e) => {
      if (isDraggingRef.current && progressWrapRef.current) {
        const rect = progressWrapRef.current.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const duration = videoDurationRef.current || videoRef.current?.duration || 0;
        if (duration > 0) {
          const newTime = Math.floor(pct * duration);
          setVideoTime(newTime);
          if (videoRef.current) videoRef.current.currentTime = newTime;
        }
      }
      if (isDraggingVolumeRef.current) {
        handleVolumeChange(e);
      }
    };

    const handleUp = () => {
      if (isDraggingRef.current) {
        if (wasPlayingRef.current) {
          setIsPlaying(true);
          videoRef.current?.play();
        }
      }
      isDraggingRef.current = false;
      isDraggingVolumeRef.current = false;
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [handleVolumeChange]);

  const toggleMoreMenu = useCallback((e) => {
    e.stopPropagation();
    setShowModalMoreMenu(prev => !prev);
  }, []);

  const handleLikeClick = useCallback((e) => {
    if (onLike) onLike(e, item);
  }, [onLike, item]);
  const handleDownloadClick = useCallback((e) => {
    e.stopPropagation();
    if (onDownload) {
      onDownload();
    } else if (videoUrl) {
      const a = document.createElement('a');
      a.href = videoUrl;
      a.target = '_blank';
      a.download = item?.title ? `${item.title}.mp4` : 'video.mp4';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Đang bắt đầu tải xuống...");
    }
    setShowModalMoreMenu(false);
  }, [onDownload, videoUrl, item]);

  const handleCopyLink = useCallback((e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(window.location.href)
      .then(() => toast.success("Đã sao chép liên kết chia sẻ"))
      .catch(() => toast.error("Lỗi khi sao chép liên kết"));
    setShowModalMoreMenu(false);
  }, []);

  const handleGmailShare = useCallback((e) => {
    e.stopPropagation();
    const title = item?.title || "";
    const url = window.location.href;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&tf=1&su=${encodeURIComponent(title)}&body=${encodeURIComponent(`Mình chia sẻ cho bạn bài viết này:\n${url}`)}`;
    window.open(gmailUrl, '_blank');
    setShowModalMoreMenu(false);
  }, [item]);

  const handleEnded = useCallback(() => setIsPlaying(false), []);

  return (
    <ModalOverlay onClick={onClose}>
      <VideoModalWrap ref={videoModalWrapRef} onClick={stopPropagation}>
        <Header>
          <TitleText>{item?.title}</TitleText>
          <CloseButton onClick={onClose}>
            <X size={24} />
          </CloseButton>
        </Header>

        <PlayerMain>
          <VideoTag
            src={videoUrl}
            ref={videoRef}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            onClick={togglePlay}
            playsInline
          />

          <CenterControls onClick={stopPropagation}>
            <CircleButton onClick={handleSeekBack}>
              <RotateCcw size={20} />
            </CircleButton>
            <CircleButton $size="large" onClick={togglePlay}>
              {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
            </CircleButton>
            <CircleButton onClick={handleSeekForward}>
              <RotateCw size={20} />
            </CircleButton>
          </CenterControls>

          <VolumeSide onClick={stopPropagation}>
            <SliderVertical ref={volumeWrapRef} onMouseDown={handleVolumeMouseDown}>
              <SliderTrack>
                <SliderFill $vHeight={videoVolume} />
              </SliderTrack>
            </SliderVertical>
            <Volume2 size={20} onClick={toggleMute} />
          </VolumeSide>

          <BottomBar onClick={stopPropagation}>
            <TimeLabel>{formatVideoTime(videoTime)}</TimeLabel>
            <ProgressWrap ref={progressWrapRef} onPointerDown={handleProgressMouseDown}>
              <ProgressRail>
                <ProgressFill $vWidth={videoDuration > 0 ? (videoTime / videoDuration) * 100 : 0} />
              </ProgressRail>
              <ProgressKnob $vLeft={videoDuration > 0 ? (videoTime / videoDuration) * 100 : 0} />
            </ProgressWrap>
            <TimeLabel>{formatVideoTime(videoDuration)}</TimeLabel>

            <ActionsContainer>
              <StyledHeart
                size={20}
                $isLiked={isLiked}
                onClick={handleLikeClick}
              />
              {isFullscreen ? (
                <Minimize size={20} onClick={toggleFullscreen} />
              ) : (
                <Maximize size={20} onClick={toggleFullscreen} />
              )}
              <MoreMenuWrap>
                <MoreVertical size={20} onClick={toggleMoreMenu} />
                {showModalMoreMenu && (
                  <OptionsMenu>
                    <OptionItem onClick={handleDownloadClick}>
                      <Download size={14} /> <span>Tải xuống</span>
                    </OptionItem>
                    <OptionItem onClick={handleCopyLink}>
                      <LinkIcon size={14} /> <span>Sao chép liên kết</span>
                    </OptionItem>
                    <OptionItem onClick={handleGmailShare}>
                      <Mail size={14} /> <span>Gmail</span>
                    </OptionItem>
                  </OptionsMenu>
                )}
              </MoreMenuWrap>
            </ActionsContainer>
          </BottomBar>
        </PlayerMain>
      </VideoModalWrap>
    </ModalOverlay>
  );
};

export default VideoPlayerModal;
