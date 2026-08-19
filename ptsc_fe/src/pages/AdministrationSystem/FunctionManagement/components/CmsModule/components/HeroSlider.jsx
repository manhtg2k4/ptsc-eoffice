import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchSpecialNews } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/redux/slices/newsSlice";
import { useCMS } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/context/CMSContext";
import { ROUTES } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/config/routes";
import { getResponsiveImage } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/utils/imageHelper";
import AuthImage from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimImage';
import AuthBgDiv from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/AuthBgDiv';

export function HeroSlider() {
  const { setActivePage } = useCMS();
  const dispatch = useDispatch();
  const { specialNews } = useSelector((state) => state.news);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSpecialLoading, setIsSpecialLoading] = useState(false);

  useEffect(() => {
    setIsSpecialLoading(true);
    dispatch(fetchSpecialNews({ isSpecial: true })).finally(() => {
      setIsSpecialLoading(false);
    });
  }, [dispatch]);

  const slides = useMemo(() => {
    const rawItems = specialNews?.items || specialNews?.data || (Array.isArray(specialNews) ? specialNews : []);

    return rawItems.map(item => {
      const resImage = getResponsiveImage(item);
      const thumb = resImage.src;

      let dateDisplay = "16/06/2025";
      if (item.created_at || item.publish_date) {
        try {
          const d = new Date(item.created_at || item.publish_date);
          if (!isNaN(d.getTime())) {
            dateDisplay = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
          }
        // eslint-disable-next-line no-unused-vars
        } catch (_e) {
          // ignore parse errors
        }
      }

      return {
        id: item.id,
        image: thumb,
        imageSrcSet: resImage.srcSet,
        imageSizes: resImage.sizes,
        badge: item.topic || "TIÊU ĐIỂM",
        title: item.title || "Không có tiêu đề",
        summary: item.summary || item.brief || "",
        date: dateDisplay,
        buttonText: "Xem chi tiết"
      };
    });
  }, [specialNews]);

  useEffect(() => {
    if (slides.length > 0) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [slides.length]);

  const goToSlide = useCallback((index) => {
    setCurrentSlide(index);
  }, []);

  const handleSlideClick = useCallback(() => {
    if (!slides[currentSlide]) return;
    const url = ROUTES.newsDetail(slides[currentSlide].id);
    const fromUrl = window.location.pathname + window.location.search;
    setActivePage(url);
    window.history.pushState({ fromUrl }, "", url);
    window.scrollTo(0, 0);
  }, [slides, currentSlide, setActivePage]);

  // Curried factory for thumbnail click — avoids inline arrow in JSX
  const handleThumbClick = useCallback((index) => () => {
    goToSlide(index);
  }, [goToSlide]);

  // Handler for thumbnail click with navigation to detail page
  const handleThumbClickWithNavigation = useCallback((index) => () => {
    goToSlide(index);
    if (!slides[index]) return;
    const url = ROUTES.newsDetail(slides[index].id);
    const fromUrl = window.location.pathname + window.location.search;
    setActivePage(url);
    window.history.pushState({ fromUrl }, "", url);
    window.scrollTo(0, 0);
  }, [goToSlide, slides, setActivePage]);

  const thumbsRef = useRef(null);

  useEffect(() => {
    if (thumbsRef.current) {
      const activeBtn = thumbsRef.current.querySelector(".thumb-card.active");
      if (activeBtn) {
        const container = thumbsRef.current;
        const scrollLeft = activeBtn.offsetLeft - (container.offsetWidth / 2) + (activeBtn.offsetWidth / 2);
        container.scrollTo({ left: scrollLeft, behavior: "smooth" });
      }
    }
  }, [currentSlide]);

  const activeSlide = slides[currentSlide];

  return (
    <div className="hero-slider-wrapper" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Hero Feature Container */}
      <div className="hero-feature-container" style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", gap: "25px", padding: "40px 25px" }}>
        {isSpecialLoading && slides.length === 0 ? (
          <div className="hero-feature-container" style={{ width: "100%", gap: "25px", flex: 1 }}>
            <div className="main-feature skeleton" style={{ width: "100%", flex: 1, borderRadius: "40px" }}></div>
            <div className="thumbnails-grid">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="thumb-card">
                  <div className="thumb-img-box skeleton" style={{ aspectRatio: "16/10", borderRadius: "20px" }}></div>
                  <div className="skeleton" style={{ height: "16px", width: "80%", borderRadius: "4px" }}></div>
                </div>
              ))}
            </div>
          </div>
        ) : slides.length === 0 ? (
          <div className="empty-state" style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
            Không có tin tức tiêu điểm
          </div>
        ) : (
          <>
            {/* Main Feature */}
            {activeSlide && (
              <AuthBgDiv
                customClassName="main-feature"
                bgSrc={activeSlide.image}
                customStyle={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end"
                }}
                onClick={handleSlideClick}
              >
                <div className="feature-overlay">
                  <div className="feature-meta">
                    <span className="feature-topic">{activeSlide.badge}</span>
                    <span className="meta-sep">•</span>
                    <span className="feature-date">{activeSlide.date}</span>
                  </div>
                  <h2 className="feature-title">{activeSlide.title}</h2>
                  <div className="feature-hover-content">
                    <p className="feature-summary">{activeSlide.summary}</p>
                    <span className="feature-more-link">Xem chi tiết</span>
                  </div>
                </div>
              </AuthBgDiv>
            )}

            {/* Thumbnails Grid + Dots Indicator Group */}
            <div className="bottom-content-group" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Thumbnails Grid */}
              <div className="thumbnails-grid" ref={thumbsRef} style={{ margin: 0, padding: 0 }}>
                {slides.map((slide, index) => {
                  const thumbCls = "thumb-card" + (currentSlide === index ? " active" : "");
                  return (
                    <div
                      key={slide.id}
                      className={thumbCls}
                      onClick={handleThumbClickWithNavigation(index)}
                      style={{ flex: "0 0 calc(25% - 12px)", minWidth: "150px" }}
                    >
                      <div className="thumb-img-box">
                        <AuthImage src={slide.image} alt={slide.title} customClassName="thumb-img" />
                      </div>
                      <p className="thumb-title" style={{ fontSize: 16, fontWeight: 500 }}>{slide.title}</p>
                    </div>
                  );
                })}
              </div>

              {/* Dots Indicator - Only show if more than 1 slide */}
              {slides.length > 1 && (
                <div className="dots-indicator-row" style={{ marginTop: "4px" }}>
                  {slides.map((slide, index) => {
                    const dotCls = "nav-dot" + (currentSlide === index ? " active" : "");
                    return (
                      <button
                        key={slide.id}
                        className={dotCls}
                        onClick={handleThumbClick(index)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <style>{STYLES}</style>
    </div>
  );
}

const STYLES = `
  /* HeroSlider 2025 Redesign Local Styles */
  .hero-slider-wrapper {
    display: flex;
    flex-direction: column;
    gap: 20px;
    background: transparent;
    width: 100%;
    height: 100%;
  }

  .hero-slider-wrapper .hero-feature-container {
    display: flex;
    flex-direction: column;
    gap: 25px;
    width: 100%;
    flex: 1;
  }

  .hero-slider-wrapper .main-feature {
    position: relative;
    width: 100%;
    flex: 1;
    min-height: 400px;
    border-radius: 40px;
    overflow: hidden;
    background-size: cover;
    background-position: center;
    cursor: pointer;
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .hero-slider-wrapper .main-feature:hover {
    transform: scale(1.005);
  }

  .hero-slider-wrapper .feature-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to top, rgba(15, 15, 15, 0.85) 0%, rgba(15, 15, 15, 0.6) 50%, rgba(15, 15, 15, 0) 100%);
    padding: 40px 25px 20px 25px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 10;
    border-radius: 0 0 40px 40px;
  }

  .hero-slider-wrapper .main-feature:hover .feature-overlay {
    background: linear-gradient(to top, rgba(15, 15, 15, 0.9) 0%, rgba(15, 15, 15, 0.7) 60%, rgba(15, 15, 15, 0) 100%) !important;
    padding-top: 60px;
  }

  .hero-slider-wrapper .feature-hover-content {
    max-height: 0;
    opacity: 0;
    overflow: hidden;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .hero-slider-wrapper .main-feature:hover .feature-hover-content {
    max-height: 200px;
    opacity: 1;
    margin-top: 6px;
  }

  .hero-slider-wrapper .feature-summary {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.4;
    margin: 0 0 4px 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .hero-slider-wrapper .feature-more-link {
    font-size: 14px;
    font-weight: 600;
    color: #3b82f6;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .hero-slider-wrapper .feature-more-link:hover {
    opacity: 1;
    text-decoration: underline;
  }

  .hero-slider-wrapper .feature-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    color: rgba(255, 255, 255, 0.9);
    font-size: 14px;
    margin-bottom: 2px;
    font-weight: 500;
  }

  .hero-slider-wrapper .meta-sep {
    opacity: 0.8;
    font-size: 14px;
  }

  .hero-slider-wrapper .feature-title {
    font-size: 22px;
    font-weight: 700;
    color: #fff;
    margin: 0;
    line-height: 1.25;
    max-width: 100%;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .hero-slider-wrapper .thumbnails-grid {
    display: flex !important;
    flex-wrap: nowrap !important;
    overflow-x: auto;
    gap: 30px;
    width: 100%;
    padding: 8px 4px 16px 4px;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
  }

  .hero-slider-wrapper .thumbnails-grid {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .hero-slider-wrapper .thumbnails-grid::-webkit-scrollbar {
    display: none;
  }

  .hero-slider-wrapper .thumb-card {
    cursor: pointer;
    display: flex !important;
    flex-direction: column !important;
    gap: 10px;
    transition: transform 0.3s ease;
    flex: 0 0 190px;
    min-width: 190px;
    scroll-snap-align: start;
  }

  .hero-slider-wrapper .thumb-img-box {
    width: 100%;
    aspect-ratio: 16/10;
    border-radius: 20px;
    overflow: hidden;
    position: relative;
    transition: all 0.3s ease;
    background: #f1f5f9;
  }

  .hero-slider-wrapper .thumb-card.active .thumb-img-box {
    transform: translateY(-8px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
  }

  .hero-slider-wrapper .thumb-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .hero-slider-wrapper .thumb-title {
    font-size: 15px;
    font-weight: 500;
    color: #334155;
    line-height: 1.5;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    transition: color 0.2s;
    padding: 0 2px;
  }

  .hero-slider-wrapper .thumb-card:hover .thumb-title,
  .hero-slider-wrapper .thumb-card.active .thumb-title {
    color: #3b82f6;
    font-weight: 700;
  }

  .hero-slider-wrapper .dots-indicator-row {
    display: flex !important;
    justify-content: center;
    align-items: center;
    gap: 8px;
    width: 100%;
    position: relative;
    z-index: 10;
  }

  .hero-slider-wrapper .nav-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #cbd5e1;
    border: none;
    cursor: pointer;
    padding: 0;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .hero-slider-wrapper .nav-dot:hover {
    background: #94a3b8;
  }

  .hero-slider-wrapper .nav-dot.active {
    background: #3b82f6;
    width: 25px;
    border-radius: 10px;
  }

  @media (max-width: 1024px) {
    .hero-slider-wrapper .main-feature {
      aspect-ratio: 35/10;
      border-radius: 12px;
    }
    .hero-slider-wrapper .feature-title {
      font-size: 14px;
    }
    .hero-slider-wrapper .feature-overlay {
      padding: 30px 20px 15px 20px;
    }
    .hero-slider-wrapper .main-feature:hover .feature-overlay {
      padding-top: 45px;
    }
    .hero-slider-wrapper .thumb-card {
      min-width: 190px;
      width: 190px;
    }
  }

  @media (max-width: 767px) {
    .hero-slider-wrapper .main-feature {
      aspect-ratio: 4/3;
      border-radius: 24px;
    }
    .hero-slider-wrapper .feature-title {
      font-size: 12px;
    }
    .hero-slider-wrapper .feature-overlay {
      padding: 24px 15px 12px 15px;
    }
    .hero-slider-wrapper .main-feature:hover .feature-overlay {
      padding-top: 36px;
    }
    .hero-slider-wrapper .thumb-card {
      min-width: 160px;
      width: 160px;
      flex-direction: column !important;
    }
  }

  @media (max-width: 466px) {
    .hero-slider-wrapper .main-feature {
      min-height: 170px
    }
  }

  @media (max-width: 466px) {
    .hero-slider-wrapper .hero-feature-container {
      padding: 15px !important;
    }
  }
`;