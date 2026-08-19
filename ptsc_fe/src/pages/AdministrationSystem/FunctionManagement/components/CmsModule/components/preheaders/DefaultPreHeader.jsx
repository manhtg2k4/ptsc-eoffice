import React, { useMemo, useState, useEffect } from 'react';
import { useCMS } from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/context/CMSContext';
import { API_VIEW_IMAGE } from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/EnvironmentFile/urlConfig';
import AuthImage from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimImage';


export const DefaultPreHeader = ({
  imageUrl: propImageUrl,
  imageUrlMobile: propImageUrlMobile,
  title,
  text,
  titleColor = "#1e293b",
  textColor = "#64748b",
  logoUrl,
  logoWidth,
  logoHeight,
  height,
  heightMobile,
  titleSize,
  textSize
}) => {
  const { banners } = useCMS();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 466);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { finalImageUrl, linkUrl } = useMemo(() => {
    const apiMobileBanner = banners?.find(b => b.bannerKey === "home-banner-1-mobile");
    const apiDesktopBanner = banners?.find(b => b.bannerKey === "home-banner-1");

    if (isMobile) {
      // 1. Prioritize mobile banner config "bên kia" (home-banner-1-mobile)
      if (apiMobileBanner && apiMobileBanner.idfile) {
        return {
          finalImageUrl: `${API_VIEW_IMAGE}/${apiMobileBanner.idfile}`,
          linkUrl: apiMobileBanner.linkUrl
        };
      }
      // 2. Prioritize mobile custom image link ("nếu có thì dùng ảnh này")
      if (propImageUrlMobile) {
        return { finalImageUrl: propImageUrlMobile, linkUrl: null };
      }
      // 3. Fall back to desktop banner config "bên kia" (home-banner-1)
      if (apiDesktopBanner && apiDesktopBanner.idfile) {
        return {
          finalImageUrl: `${API_VIEW_IMAGE}/${apiDesktopBanner.idfile}`,
          linkUrl: apiDesktopBanner.linkUrl
        };
      }
      // 4. Fall back to desktop custom image link
      return { finalImageUrl: propImageUrl, linkUrl: null };
    } else {
      // Desktop logic remains exactly as current logic
      if (apiDesktopBanner && apiDesktopBanner.idfile) {
        return {
          finalImageUrl: `${API_VIEW_IMAGE}/${apiDesktopBanner.idfile}`,
          linkUrl: apiDesktopBanner.linkUrl
        };
      }
      return { finalImageUrl: propImageUrl, linkUrl: null };
    }
  }, [banners, propImageUrl, propImageUrlMobile, isMobile]);

  const getSize = (val, def) => val ? (isNaN(Number(val)) ? val : `${val}px`) : def;
  const finalHeight = isMobile
    ? getSize(heightMobile || height, "3.125rem")
    : getSize(height, "3.125rem");

  const Content = (
    <div
      className="pre-header-container"
      style={{
        position: 'relative',
        minHeight: finalHeight,
        cursor: linkUrl ? "pointer" : "default",
        overflow: 'hidden'
      }}
    >
      {finalImageUrl && (
        <AuthImage
          src={finalImageUrl}
          alt="Banner"
          customStyle={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            imageRendering: "-webkit-optimize-contrast",
            zIndex: 0
          }}
        />
      )}
      <div 
        className="pre-header-inner" 
        style={{ 
          position: 'relative', 
          zIndex: 1, 
          minHeight: finalHeight, 
          background: finalImageUrl ? "rgba(0, 0, 0, 0.04)" : "transparent",
          display: 'flex',
          alignItems: 'center'
        }}
      >
        {logoUrl && (
          <AuthImage
            src={logoUrl}
            alt="Logo"
            customClassName="pre-header-logo"
            customStyle={{
              width: getSize(logoWidth, "auto"),
              height: getSize(logoHeight, "4.5rem"), // Tăng mặc định lên 4.5rem (~72px)
              objectFit: "contain"
            }}
          />
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          {title && (
            <h2
              className="pre-header-title"
              style={{
                margin: "0 0 4px 0",
                fontSize: getSize(titleSize, "1.25rem"),
                fontWeight: 700,
                color: titleColor,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.2
              }}
            >
              {title}
            </h2>
          )}
          {text && (
            <p
              className="pre-header-text"
              style={{
                margin: 0,
                fontSize: getSize(textSize, "0.9rem"),
                color: textColor,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.4
              }}
            >
              {text}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  if (linkUrl) {
    return (
      <a href={linkUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
        {Content}
      </a>
    );
  }

  return Content;
};
