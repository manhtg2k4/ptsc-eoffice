/* eslint-disable react/forbid-component-props, no-restricted-syntax */
import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Slider, Typography
} from '@mui/material';

export default function ImageCropperDialog({ 
  open, 
  onClose, 
  imageSrc, 
  onCropComplete, 
  targetWidth: targetWidthProp,
  targetHeight: targetHeightProp,
  exportScale = 4,
  aspect
}) {
  const [targetWidth, setTargetWidth] = useState(targetWidthProp || 160);
  const [targetHeight, setTargetHeight] = useState(targetHeightProp || 107);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  const [baseWidth, setBaseWidth] = useState('auto');
  const [baseHeight, setBaseHeight] = useState('auto');
 
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const imgRef = useRef(null);
 
  // Scale display UI up so it's not too small to interact with
  const displayScale = Math.min(500 / targetWidth, 400 / targetHeight);
  const displayWidth = targetWidth * displayScale;
  const displayHeight = targetHeight * displayScale;
 
  useEffect(() => {
    if (open) {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      if (!aspect || targetWidthProp) {
        setTargetWidth(targetWidthProp || 160);
        setTargetHeight(targetHeightProp || 107);
      }
    }
  }, [open, imageSrc, targetWidthProp, targetHeightProp, aspect]);
 
  const handleImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    
    let currentTargetWidth = targetWidthProp || 160;
    let currentTargetHeight = targetHeightProp || 107;

    // Chỉ tự động tính toán targetWidth/targetHeight theo kích thước ảnh 
    // nếu có aspect prop và KHÔNG truyền targetWidthProp
    if (aspect && !targetWidthProp) {
      let calculatedWidth = naturalWidth;
      let calculatedHeight = naturalWidth / aspect;
      if (calculatedHeight > naturalHeight) {
        calculatedHeight = naturalHeight;
        calculatedWidth = naturalHeight * aspect;
      }
      
      const maxDimension = 1920;
      if (calculatedWidth > maxDimension) {
        calculatedWidth = maxDimension;
        calculatedHeight = maxDimension / aspect;
      } else if (calculatedHeight > maxDimension) {
        calculatedHeight = maxDimension;
        calculatedWidth = maxDimension * aspect;
      }

      currentTargetWidth = Math.round(calculatedWidth);
      currentTargetHeight = Math.round(calculatedHeight);
      
      setTargetWidth(currentTargetWidth);
      setTargetHeight(currentTargetHeight);
    }

    const currentDisplayScale = Math.min(500 / currentTargetWidth, 400 / currentTargetHeight);
    const currentDisplayWidth = currentTargetWidth * currentDisplayScale;
    const currentDisplayHeight = currentTargetHeight * currentDisplayScale;

    const containerRatio = currentDisplayWidth / currentDisplayHeight;
    const imageRatio = naturalWidth / naturalHeight;
 
    // "Contain" logic: ensure the whole image is visible initially
    if (imageRatio > containerRatio) {
      setBaseWidth(`${currentDisplayWidth}px`);
      setBaseHeight('auto');
    } else {
      setBaseHeight(`${currentDisplayHeight}px`);
      setBaseWidth('auto');
    }
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSave = () => {
    const supersampleScale = Math.max(1, exportScale);
    const img = imgRef.current;
    const container = containerRef.current;

    if (!img || !container) {
      onClose();
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();

    // Export at higher pixel density than the crop frame. The crop frame remains
    // targetWidth x targetHeight, but the saved PNG keeps enough pixels for PDF rendering.
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = Math.round(targetWidth * supersampleScale);
    outputCanvas.height = Math.round(targetHeight * supersampleScale);
    const outputCtx = outputCanvas.getContext('2d');

    // 2) Map display-space coordinates to oversampled output-space.
    const pixelScale = supersampleScale / displayScale;
    const drawX = (imgRect.left - containerRect.left) * pixelScale;
    const drawY = (imgRect.top - containerRect.top) * pixelScale;
    const drawW = imgRect.width * pixelScale;
    const drawH = imgRect.height * pixelScale;

    // 3) Draw image using the same visual transform logic as the preview.
    outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
    outputCtx.imageSmoothingEnabled = true;
    outputCtx.imageSmoothingQuality = 'high';
    outputCtx.drawImage(img, drawX, drawY, drawW, drawH);

    outputCanvas.toBlob((blob) => {
      if (!blob) return;
      const newFile = new File([blob], 'cropped_image.png', { type: 'image/png' });
      onCropComplete(newFile, URL.createObjectURL(blob));
      onClose();
    }, 'image/png');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Điều chỉnh kích thước ảnh</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden' }}>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Khung có kích thước chuẩn ({targetWidth}x{targetHeight}). Dùng chuột kéo ảnh để di chuyển, dùng thanh trượt để phóng to/thu nhỏ.
        </Typography>

        <Box
          ref={containerRef}
          sx={{
            width: displayWidth,
            height: displayHeight,
            overflow: 'hidden',
            position: 'relative',
            border: '2px dashed #1976d2',
            cursor: isDragging ? 'grabbing' : 'grab',
            backgroundColor: 'transparent',
            // Simple checkerboard pattern for transparency indication
            backgroundImage: 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYNgfQEhjhg1gYKQcM0Z18KgOA4MDw979f4cMGBgZBw0wOByw4nZMAADvSwwxX8t4zAAAAABJRU5ErkJggg==")',
            mb: 3,
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {imageSrc && (
            <img
              ref={imgRef}
              src={imageSrc}
              alt="crop source"
              onLoad={handleImageLoad}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: baseWidth,
                height: baseHeight,
                transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${zoom})`,
                transformOrigin: 'center center',
                pointerEvents: 'none',
                userSelect: 'none'
              }}
            />
          )}
        </Box>

        <Box sx={{ width: '80%', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="caption">Thu nhỏ </Typography>
          <Slider
            value={zoom}
            min={0.1}
            max={3}
            step={0.01}
            onChange={(e, val) => setZoom(val)}
          />
          <Typography variant="caption">Phóng to</Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Hủy</Button>
        <Button onClick={handleSave} color="primary" variant="contained">Lưu ảnh</Button>
      </DialogActions>
    </Dialog>
  );
}
