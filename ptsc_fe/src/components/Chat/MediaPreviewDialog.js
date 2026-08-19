import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Typography,
  Slide,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import FileDownloadIcon from "@mui/icons-material/FileDownload";

import * as Styles from "./styles/MediaPreviewDialog.styles";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function MediaPreviewDialog({
  open,
  items = [],
  startIndex = 0,
  onClose,
}) {
  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const [index, setIndex] = useState(startIndex || 0);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!open) return;
    const next = Number.isFinite(startIndex) ? startIndex : 0;
    setIndex(Math.max(0, Math.min(next, safeItems.length - 1)));
    setZoom(1);
  }, [open, startIndex, safeItems.length]);

  const current = safeItems[index];
  const total = safeItems.length;

  const goPrev = useCallback(() => {
    if (total <= 1) return;
    setZoom(1);
    setIndex((i) => (i - 1 + total) % total);
  }, [total]);

  const goNext = useCallback(() => {
    if (total <= 1) return;
    setZoom(1);
    setIndex((i) => (i + 1) % total);
  }, [total]);

  const handleClose = useCallback(() => {
    setZoom(1);
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") handleClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose, goPrev, goNext]);

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(4, z + 0.25));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(1, z - 0.25));
  }, []);

  const downloadCurrent = useCallback(() => {
    if (!current?.url) return;
    const a = document.createElement("a");
    a.href = current.url;
    a.download = current?.content || "media";
    a.click();
  }, [current]);

//   const setByThumb = useCallback((i) => {
//     setZoom(1);
//     setIndex(i);
//   }, []);

  const handleThumbClick = useCallback((event) => {
    const indexAttr = event.currentTarget.dataset.index;
    if (indexAttr == null) return;

    const i = Number(indexAttr);
    if (!Number.isFinite(i)) return;

    setZoom(1);
    setIndex(i);
    }, []);

  return (
    <Styles.PreviewDialog
      fullScreen
      open={!!open}
      onClose={handleClose}
      TransitionComponent={Transition}
      keepMounted
    >
      {/* Top bar */}
      <Styles.TopBar>
        <Styles.TopBarLeft>
          <Styles.WhiteIconButton onClick={handleClose}>
            <CloseIcon />
          </Styles.WhiteIconButton>
          <Typography variant="body2">
            {total ? `${index + 1}/${total}` : "0/0"}
          </Typography>
        </Styles.TopBarLeft>

        <Styles.TopBarRight>
          <Styles.WhiteIconButton onClick={zoomOut} disabled={zoom <= 1}>
            <ZoomOutIcon />
          </Styles.WhiteIconButton>
          <Typography variant="caption">{Math.round(zoom * 100)}%</Typography>
          <Styles.WhiteIconButton onClick={zoomIn} disabled={zoom >= 4}>
            <ZoomInIcon />
          </Styles.WhiteIconButton>
          <Styles.WhiteIconButton onClick={downloadCurrent}>
            <FileDownloadIcon />
          </Styles.WhiteIconButton>
        </Styles.TopBarRight>
      </Styles.TopBar>

      {/* Main */}
      <Styles.MainArea>
        {total > 1 && (
          <>
            <Styles.NavButtonLeft onClick={goPrev}>
              <ChevronLeftIcon />
            </Styles.NavButtonLeft>
            <Styles.NavButtonRight onClick={goNext}>
              <ChevronRightIcon />
            </Styles.NavButtonRight>
          </>
        )}

        <Styles.MediaContainer>
          {!current ? null : current.type === "video" ? (
            <Styles.PreviewVideo controls>
              <source src={current.url} />
            </Styles.PreviewVideo>
          ) : (
            <Styles.PreviewImage
              src={current.url}
              alt=""
              draggable={false}
              $zoom={zoom}
            />
          )}
        </Styles.MediaContainer>
      </Styles.MainArea>

      {/* Thumbnails */}
      <Styles.ThumbsBar>
        {safeItems.map((it, i) => (
          <Styles.ThumbItem
            key={it.id || i}
            $active={i === index}
            data-index={i}
            role="button"
            tabIndex={0}
            onClick={handleThumbClick}
          >
            {it.type === "video" ? (
              <Styles.VideoThumb>▶</Styles.VideoThumb>
            ) : (
              <Styles.ThumbImage src={it.url} loading="lazy" />
            )}
          </Styles.ThumbItem>
        ))}
      </Styles.ThumbsBar>
    </Styles.PreviewDialog>
  );
}
