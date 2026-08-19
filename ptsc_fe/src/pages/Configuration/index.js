// File: src/components/Configuration/index.jsx
import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Grid,
  Box,
  Typography,
  IconButton,
  InputAdornment,
  DialogContent,
} from "@mui/material";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { ReactCrop, centerCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Search as SearchIcon } from "@mui/icons-material";
import axiosInstance from "@utils/axiosInstance";
import api from "@services/api";
import {
  APP_BASE,
  API_UPLOAD_FILESS,
  API_NEWS_MANAGEMENT,
  API_BANNER_MANAGEMENT,
  API_VIEW_FILE,
  API_UPLOAD_SETTING,
} from "@EnvironmentFile/constants/urlConfig";
import CustomDateRangePicker from "@components/CustomInput/CustomDateRangePicker";
import CustomInput from "@components/CustomInput/CustomInput";
import { useToast } from "@components/common/ToastProvider";
import AddIcon from "@mui/icons-material/Add";
import AuthImage from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimImage';
import CustomSwipper from "@components/Swipper/BaseSwiper";

// ── Styled Components ──
import {
  // Container,
  // Header,
  SaveButton,
  // FormContainer,
  MainCard,
  SectionTitle,
  UploadIcon,
  UploadText,
  UploadSubText,
  // UploadArrowUpwardIcon,
  // UploadArrowDownwardIcon,
  UploadDeleteIcon,
  // UploadKeyboardArrowUpIcon,
  UploadExpandMoreIcon,
  UploadExpandLessIcon,
  HiddenFileInput,
  NewsCard,
  // NewsCardMedia,
  // NewsImageWrapper,
  NewsCardContent,
  NewsTitle,
  NewsDate,
  NewsTag,
  AddNewsButton,
  SearchBox,
  BannerLinkInput,
  // SectionCollapseBox,
  // SectionTitleWithCollapse,
  // CollapseIcon,
  SectionBox,
  NumberBadge,
  NewsItemBox,
  SectionDescription,
  BannerImageWrapper,
  BannerTypography,
  // BannerImage,
  BannerDeleteButton,
  DeleteIconWhite,
  UploadAreaLarge,
  UploadAreaMedium,
  NewsListContainerMedium,
  LoadingBox,
  NewsListContainerLarge,
  DraggableNewsCard,
  NewsActionContainer,
  EmptySlotBox,
  SectionHeaderBox,
  SectionHeaderSpaceBetween,
  HeaderTitleColumnBox,
  CountBadge,
  SlotBadge,
  HintText,
  DraggableBox,
  // CenterBox,
  ActionIconButton,
  FlexColumnBox,
  BannerContentBox,
  FilterContainer,
  // NewsCardContentWithPadding,
  // TagsContainer,
  TagsBox,
  BannerTitle,
  ConfigCaption,
  BannerSkeleton,
  CropContainer,
  CropCaptionText,
  SectionTitleBox,
  VerticalIndicator,
  NewsMetaBox,
  AddButtonBox,
  EmptySlotContainer,
  FeaturedNewsContentBox,
} from "@styles/ConfigurationStyles.styles";
import { FlexGrowBox, FooterActions } from "@styles/BaseSwiper/BaseSwiper.style";



// ── Helper Functions ──
function createMockOutstandingNews() {
  return Array.from({ length: 5 }, function (_, i) {
    return {
      id: i + 1,
      title: `Người ủy đồng Tổn Cảng Sài Gòn "Hiến giọt máu yêu thương"`,
      date: "Sáng 29.5, tại TP. HCM. Tổng công ty Tân Cảng Sài Gòn tổ chức...",
      image:
        "https://via.placeholder.com/140x100/1976D2/FFFFFF?text=News+" +
        (i + 1),
      tags: ["#giaoliuc", "#TCTS"],
    };
  });
}

function transformNewsData(news, imageUrl) {
  let tagsArray = [];
  if (news.tags) {
    if (Array.isArray(news.tags)) {
      tagsArray = news.tags;
    } else if (typeof news.tags === "string") {
      tagsArray = news.tags
        .split(",")
        .map(function (tag) {
          return tag.trim();
        })
        .filter(Boolean);
    }
  }

  let displayDate = "";
  if (news.publishedAt) {
    const pubDate = new Date(news.publishedAt);
    if (!isNaN(pubDate.getTime())) {
      displayDate = pubDate.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } else {
      displayDate = news.publishedAt;
    }
  } else if (news.createdAt) {
    const creDate = new Date(news.createdAt);
    if (!isNaN(creDate.getTime())) {
      displayDate = creDate.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } else {
      displayDate = news.createdAt;
    }
  }

  return {
    id: news.id || news._id,
    title: news.title || "Không có tiêu đề",
    date: displayDate,
    image: imageUrl,
    tags: tagsArray,
    _original: news,
  };
}



// Đã tối ưu hóa: Không gọi API fetch blob nữa, chỉ trả về URL chuỗi.
async function loadNewsImage(news) {
  let imageUrl = "https://via.placeholder.com/140x100";

  // 1. Ưu tiên tìm trong mảng files phần tử có typeSize là null
  let imageId = null;
  if (Array.isArray(news.files) && news.files.length > 0) {
    const originalFile = news.files.find(function (f) {
      return f.typeSize === null || f.typeSize === undefined || f.typeSize === "";
    });
    if (originalFile) {
      imageId = originalFile.id;
    }
  }

  // 2. Nếu không thấy trong files, thử các trường size hoặc thumbnail
  if (!imageId) {
    const imageData = news.sizeMedium || news.sizeSmall || news.sizeBig || news.thumbnail;
    imageId = imageData?.id;
  }

  if (imageId) {
    // Tối ưu: Chỉ trả về URL string, không cần gọi API blob
    imageUrl = `${API_VIEW_FILE}/${imageId}`;
  } else if (news.content) {
    // 3. Nếu vẫn không có ID, thử trích xuất từ nội dung content (Trường hợp ID 226)
    const imgMatch = news.content.match(/<img[^>]+src=["']([^"']+)["']/);
    if (imgMatch && imgMatch[1]) {
      imageUrl = imgMatch[1];
    }
  }

  return imageUrl;
}

export default function Configuration({ open = true, onClose = () => {} }) {
  const toast = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // States cho cropping
  const [cropImageSrc, setCropImageSrc] = useState("");
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState();
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const imgRef = useRef(null);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(null);

  // States cho banner images
  const [bannerImages, setBannerImages] = useState([]);
  const [isLoadingBanner, setIsLoadingBanner] = useState(true);
  const [bannerLinks, setBannerLinks] = useState(["", "", "", ""]);
  const bannerFileInputRef = useRef(null);
  const initialFeaturedIdsRef = useRef([]);

  // States cho topics
  const [topicOptions, setTopicOptions] = useState([]);

  // States cho tin nổi bật
  const [outstandingNews, setOutstandingNews] = useState([]);
  const [featuredNewsList, setFeaturedNewsList] = useState(
    Array(10).fill(null)
  );
  const [draggedItem, setDraggedItem] = useState(null);
  const [draggedFromIndex, setDraggedFromIndex] = useState(null);
  const [draggedType, setDraggedType] = useState(null);
  const [searchOutstanding, setSearchOutstanding] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [dateRangeOutstanding, setDateRangeOutstanding] = useState({
    from: null,
    to: null,
  });
  const [page, setPage] = useState(1);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // States cho các tham số cấu hình tin tức
  const [configNewDays, setConfigNewDays] = useState(24);
  const [configViewHours, setConfigViewHours] = useState(24);
  const [configLikeCount, setConfigLikeCount] = useState(24);
  const [configApprovalHours, setConfigApprovalHours] = useState(24);





  const fetchNewsData = useCallback(async (query = "", topic = "all", dates = null, pageNum = 1, isSpecial = undefined) => {
    try {
      const params = {
        page: pageNum,
        limit: 50,
        status: 1,
      };

      if (query) {
        params["filter[title]"] = query;
      }

      if (topic && topic !== "all") {
        params["filter[topic]"] = topic;
      }

      if (dates?.from && dates?.to &&
        dates.from !== "Invalid Date" && dates.to !== "Invalid Date") {
        params.startDate = dates.from;
        params.endDate = dates.to;
      }

      if (isSpecial !== undefined) {
        params["filter[isSpecial]"] = isSpecial;
      }

      const newsResponse = await api.get(
        `${API_NEWS_MANAGEMENT}/public/published`,
        {
          params,
        }
      );

      const newsData =
        newsResponse?.data?.items || newsResponse?.data?.data || [];

      const transformedNewsPromises = newsData.map(async function (news) {
        const imageUrl = await loadNewsImage(news);
        return transformNewsData(news, imageUrl);
      });

      return await Promise.all(transformedNewsPromises);
    } catch (error) {
      logger.error("Error fetching news:", error);
      throw error;
    }
  }, []);

  const handleSearchClick = useCallback(async () => {
    try {
      setPage(1);
      const news = await fetchNewsData(searchOutstanding, selectedTopic, dateRangeOutstanding, 1);
      setOutstandingNews(news);
    } catch (error) {
      toast("Không thể tìm kiếm bài viết", "error");
    }
  }, [fetchNewsData, searchOutstanding, selectedTopic, dateRangeOutstanding, toast]);

  // Fetch dữ liệu khi component mount
  useEffect(
    function () {
      async function fetchConfiguration() {
        try {
          setIsLoadingBanner(true);
          setPage(1);

          // Tối ưu: Gọi song song các API
          const [topicsRes, newsRes, bannerRes, configRes, specialNewsRes] = await Promise.all([
            axiosInstance.get(`${APP_BASE}/api/topic`).catch(() => []),
            fetchNewsData("", "all", null, 1).catch((err) => {
              logger.error("Error fetching news:", err);
              return null;
            }),
            api.get(API_BANNER_MANAGEMENT, { params: {} }).catch((err) => {
              logger.error("Error fetching banners:", err);
              return null;
            }),
            api.get(`${API_UPLOAD_SETTING}/detail-config/news`).catch((err) => {
              logger.error("Error fetching news configuration:", err);
              return null;
            }),
            fetchNewsData("", "all", null, 1, true).catch((err) => {
              logger.error("Error fetching special news:", err);
              return null;
            })
          ]);

          // 1. Xử lý Topics
          const topics = topicsRes || [];
          setTopicOptions(topics);

          // 2. Xử lý News
          if (newsRes) {
            const transformedNews = newsRes;
            setOutstandingNews(transformedNews);
          } else {
            toast("Không thể tải tin tức. Đang sử dụng dữ liệu mẫu.", "warning");
            setOutstandingNews(createMockOutstandingNews());
          }

          // 2.2 Xử lý Tin nổi bật lấy trực tiếp từ API
          if (specialNewsRes) {
            const specialNews = [...specialNewsRes].sort(function (a, b) {
              const orderA = a._original?.displayOrder || 999;
              const orderB = b._original?.displayOrder || 999;
              return orderA - orderB;
            });

            initialFeaturedIdsRef.current = specialNews.map(function (news) {
              const id = news._original?.id || news._original?._id || news.id;
              return parseInt(id, 10);
            }).filter(Boolean);

            // Tạo mảng 10 phần tử với tin nổi bật ở đúng vị trí
            const initialFeaturedList = Array(10).fill(null);

            specialNews.forEach(function (news) {
              const order = news._original?.displayOrder;

              if (order && order >= 1 && order <= 10) {
                initialFeaturedList[order - 1] = news;
              } else {
                const emptyIndex = initialFeaturedList.findIndex(
                  function (item) {
                    return item === null;
                  }
                );
                if (emptyIndex !== -1) {
                  initialFeaturedList[emptyIndex] = news;
                }
              }
            });

            setFeaturedNewsList(initialFeaturedList);
          } else {
            setFeaturedNewsList(Array(10).fill(null));
          }

          // 3. Xử lý Banners
          try {
            const banners = bannerRes?.data?.data || [];

            // Sắp xếp banner theo order
            const sortedBanners = banners.sort(function (a, b) {
              return a.order - b.order;
            });

            // Map banner data vào state
            const loadedBannerImages = [];
            const loadedBannerLinks = ["", "", "", ""];

            sortedBanners.forEach(function (banner) {
              const match = banner.bannerKey?.match(/home-banner-(\d+)/);
              if (match) {
                const index = parseInt(match[1]) - 1;

                if (index >= 0 && index < 4) {
                  if (banner.imageUrl || banner.idfile) {
                    loadedBannerImages[index] = {
                      id: banner.id,
                      url: banner.idfile
                        ? `${API_VIEW_FILE}/${banner.idfile}`
                        : `${APP_BASE}${banner.imageUrl}`,
                      filePath: banner.imageUrl,
                      idfile: banner.idfile,
                      file: null,
                    };
                  }

                  if (banner.linkUrl) {
                    loadedBannerLinks[index] = banner.linkUrl;
                  }
                }
              }
            });

            setBannerImages(loadedBannerImages);
            setBannerLinks(loadedBannerLinks);
            // toast("Đã tải cấu hình banner", "success");
          } catch (e) {
            // handled above
            setBannerImages([]);
            setBannerLinks(["", "", "", ""]);
          } finally {
            setIsLoadingBanner(false);
          }

          // 4. Xử lý Config
          if (configRes) {
            const configData = configRes?.data || configRes;
            if (configData) {
              setConfigApprovalHours(configData.timeSave || 24);
              setConfigNewDays(configData.newArticlesDays || 24);
              setConfigViewHours(configData.mostViewedArticlesThreshold || 24);
              setConfigLikeCount(configData.favoriteArticlesThreshold || 24);
            }
          }




        } catch (error) {
          logger.error("Configuration fetch error:", error);
          toast("Có lỗi xảy ra khi tải cấu hình", "error");
          setIsLoadingBanner(false);
        }
      }

      fetchConfiguration();
    },
    [toast, fetchNewsData]
  );

  // Handlers
  const handleBannerUploadClick = useCallback(function () {
    if (bannerFileInputRef.current) {
      bannerFileInputRef.current.click();
    }
  }, []);

  const handleBannerImageChange = useCallback(
    function (event) {
      const file = event.target.files?.[0];
      if (file) {
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onloadend = function () {
            setCropImageSrc(reader.result);
            setIsCropDialogOpen(true);
            setCrop(undefined); // Reset crop
          };
          reader.readAsDataURL(file);
        } else {
          toast("Vui lòng chọn file hình ảnh", "error");
        }
        // event.target.value = ""; // Đã chuyển xuống handleCropConfirm
      }
    },
    [toast]
  );

  const onImageLoad = useCallback((e) => {
    const width = e.currentTarget.width;
    const height = e.currentTarget.height;
    const crop = centerCrop(
      {
        unit: '%',
        width: 80,
        height: 80,
      },
      width,
      height
    );
    setCrop(crop);
    imgRef.current = e.currentTarget;
  }, []);

  const handleCropConfirm = async () => {
    if (!completedCrop || !imgRef.current) return;

    const canvas = document.createElement('canvas');
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
    const MAX_WIDTH = 1920;
    let targetWidth = completedCrop.width * scaleX;
    let targetHeight = completedCrop.height * scaleY;

    // Giới hạn resolution để ảnh vừa nét vừa nhẹ (Downscaling)
    if (targetWidth > MAX_WIDTH) {
      const downScaleRatio = MAX_WIDTH / targetWidth;
      targetWidth = MAX_WIDTH;
      targetHeight = targetHeight * downScaleRatio;
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');

    // Đảm bảo chất lượng vẽ tốt nhất
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      targetWidth,
      targetHeight
    );

    const base64Image = canvas.toDataURL('image/jpeg', 0.8);
    const blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.8);
    });
    const fileName = `banner_${Date.now()}.jpg`;
    const croppedFile = new File([blob], fileName, { type: 'image/jpeg' });

    const newImage = {
      id: Date.now(),
      url: base64Image,
      file: croppedFile,
    };

    setBannerImages(function (prev) {
      const newList = [...prev];
      // Đảm bảo mảng có đủ 4 phần tử
      while (newList.length < 4) newList.push(null);
      newList[currentUploadIndex] = newImage;
      return newList;
    });

    setIsCropDialogOpen(false);
    setCropImageSrc("");
    setCurrentUploadIndex(null);
    if (bannerFileInputRef.current) {
      bannerFileInputRef.current.value = "";
    }
    toast("Đã thêm ảnh banner", "success");
  };

  const handleCloseCropDialog = useCallback(() => {
    setIsCropDialogOpen(false);
    setCropImageSrc("");
  }, []);

  const handleDeleteBannerImage = useCallback(
    async function (imageId) {
      try {
        const imageToDelete = bannerImages.find((img) => img && img.id === imageId);

        // Nếu là banner đã lưu trên server (không có thuộc tính file)
        if (imageToDelete && imageToDelete.id && !imageToDelete.file) {
          await api.delete(`${API_BANNER_MANAGEMENT}/${imageToDelete.id}`);
        }

        setBannerImages(function (prev) {
          const newList = [...prev];
          const index = newList.findIndex((img) => img && img.id === imageId);
          if (index !== -1) {
            newList[index] = null;
          }
          return newList;
        });
        toast("Đã xóa ảnh banner", "success");
      } catch (error) {
        logger.error("Error deleting banner:", error);
        toast("Xóa ảnh banner thất bại", "error");
      }
    },
    [toast, bannerImages]
  );

  const handleSearchOutstandingChange = useCallback(function (e) {
    setSearchOutstanding(e.target.value);
  }, []);


  const handleBannerLinkChange = useCallback(function (index, value) {

    setBannerLinks(function (prev) {
      const newLinks = [...prev];
      newLinks[index] = value;
      return newLinks;
    });
  }, []);

  const handleDateRangeChange = useCallback(async (dates) => {
    const newDates = {
      from: dates[0],
      to: dates[1],
    };
    setDateRangeOutstanding(newDates);
    setPage(1);

    try {
      const news = await fetchNewsData(searchOutstanding, selectedTopic, newDates, 1);
      setOutstandingNews(news);
    } catch (error) {
      toast("Không thể lọc tin tức theo ngày", "error");
    }
  }, [fetchNewsData, searchOutstanding, selectedTopic, toast]);

  const handleTopicChange = useCallback(
    async (topicId) => {
      setSelectedTopic(topicId);
      setPage(1);
      try {
        const news = await fetchNewsData(searchOutstanding, topicId, dateRangeOutstanding, 1);
        setOutstandingNews(news);
      } catch (error) {
        toast("Không thể lọc tin tức", "error");
      }
    },
    [fetchNewsData, searchOutstanding, dateRangeOutstanding, toast]
  );

  const handleSaveClick = useCallback(
    async function () {
      if (isSubmitting) return;
      setIsSubmitting(true);

      try {
        let uploadedImageData = {};

        // Upload các banner images mới (chỉ upload những ảnh có file từ máy tính)
        if (bannerImages.length > 0) {
          const uploadPromises = bannerImages.map(function (image, index) {
            return (async function () {
              // Chỉ upload nếu có file object (ảnh mới từ máy tính)
              if (image && image.file) {
                try {
                  const formData = new FormData();
                  formData.append("file", image.file);
                  formData.append("object_type", "banner");
                  formData.append("object_id", `banner_${index + 1}`);

                  const uploadResponse = await api.post(
                    API_UPLOAD_FILESS,
                    formData,
                    {
                      headers: { "Content-Type": "multipart/form-data" },
                    }
                  );

                  // Lưu file_path và id của ảnh đã upload
                  const responseData = uploadResponse?.data;
                  if (responseData) {
                    const path = responseData.file_path || responseData.filePath || responseData.path;
                    const id = responseData.id || responseData.file_id;

                    if (path) {
                      uploadedImageData[index] = {
                        path: path,
                        id: id
                      };
                    }
                  }
                } catch (uploadError) {
                  logger.error(`Upload banner ${index} error:`, uploadError);
                  throw uploadError;
                }
              }
            })();
          });
          await Promise.all(uploadPromises);
        }

        // Chuẩn bị payload cho banners

        const bannersPayload = [];

        // Tìm đến đoạn code này trong hàm handleSaveClick
        for (let i = 0; i < 4; i++) {
          const bannerImage = bannerImages[i];
          const linkUrl = bannerLinks[i]?.trim() || null;

          let imageUrl = null;
          let idfile = null;

          if (uploadedImageData[i]) {
            imageUrl = uploadedImageData[i].path;
            idfile = uploadedImageData[i].id;
          } else if (bannerImage?.filePath) {
            imageUrl = bannerImage.filePath;
            idfile = bannerImage.idfile;
          }

          // ✅ SỬA LOGIC: Có ảnh HOẶC có link thì tạo banner
          if (imageUrl || linkUrl) {
            const bannerData = {
              bannerKey: `home-banner-${i + 1}`,
              order: i + 1,
              status: 1, // ← LUÔN SET STATUS = 1 (active)
            };

            if (imageUrl) {
              bannerData.imageUrl = imageUrl;
              bannerData.idfile = idfile;
            }

            if (linkUrl) {
              bannerData.linkUrl = linkUrl;
            }

            bannersPayload.push(bannerData);
          }
        }

        // Gửi request lưu banners
        if (bannersPayload.length > 0) {
          await api.post(API_BANNER_MANAGEMENT, {
            banners: bannersPayload,
          });
        }

        // ========== PHẦN 2: XỬ LÝ FEATURED NEWS ==========

        // Lấy danh sách ID của các tin nổi bật
        const featuredNewsIds = featuredNewsList
          .filter(function (item) {
            return item !== null;
          })
          .map(function (item) {
            const id = item._original?.id || item._original?._id || item.id;
            return parseInt(id, 10);
          });

        const updatePromises = [];

        // Cập nhật isSpecial = true cho các tin trong danh sách nổi bật
        featuredNewsList.forEach(function (news, index) {
          if (news !== null) {
            const newsId = news._original?.id || news._original?._id || news.id;
            const numericId = parseInt(newsId, 10);

            if (!isNaN(numericId) && numericId > 0) {
              updatePromises.push(
                api.patch(`${API_NEWS_MANAGEMENT}/${numericId}`, {
                  isSpecial: true,
                  displayOrder: index + 1,
                })
              );
            }
          }
        });

        // Tìm các tin cần bỏ khỏi danh sách nổi bật bằng cách so sánh danh sách ID ban đầu với danh sách ID hiện tại
        initialFeaturedIdsRef.current.forEach(function (numericId) {
          if (!featuredNewsIds.includes(numericId)) {
            updatePromises.push(
              api.patch(`${API_NEWS_MANAGEMENT}/${numericId}`, {
                isSpecial: false,
                displayOrder: null,
              })
            );
          }
        });

        // Thực hiện tất cả các update promises
        if (updatePromises.length > 0 || bannersPayload.length > 0) {
          if (updatePromises.length > 0) {
            await Promise.all(updatePromises);
          }
          // Cập nhật lại initialFeaturedIdsRef sau khi lưu thành công
          initialFeaturedIdsRef.current = featuredNewsIds;
        }

        // ========== PHẦN 3: XỬ LÝ CẤU HÌNH THÔNG SỐ ==========
        try {
          await api.put(`${API_UPLOAD_SETTING}/update`, {
            timeSave: parseInt(configApprovalHours, 10),
            newArticlesDays: parseInt(configNewDays, 10),
            mostViewedArticlesThreshold: parseInt(configViewHours, 10),
            favoriteArticlesThreshold: parseInt(configLikeCount, 10),
            autoClean: false,
            updater: "",
            type: "news",
          });
        } catch (configError) {
          logger.error("Save news settings error:", configError);
        }

        toast("Lưu cấu hình thành công!", "success");
      } catch (error) {
        let errorMessage = "Có lỗi xảy ra khi lưu cấu hình!";
        if (error?.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error?.message) {
          errorMessage = error.message;
        }
        toast(errorMessage, "error");
        logger.error("Save configuration error:", error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      bannerImages,
      bannerLinks,
      featuredNewsList,
      outstandingNews,
      isSubmitting,
      toast,
      configNewDays,
      configViewHours,
      configLikeCount,
      configApprovalHours,

    ]
  );

  const handleDragStart = useCallback(function (e, news, type, fromIndex) {
    setDraggedItem(news);
    setDraggedType(type);
    setDraggedFromIndex(fromIndex);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback(function (e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    function (e, toIndex) {
      e.preventDefault();

      if (!draggedItem) return;

      if (draggedType === "outstanding") {
        setFeaturedNewsList(function (prev) {
          const newList = [...prev];
          if (newList[toIndex] === null) {
            newList[toIndex] = { ...draggedItem, id: Date.now() };
            toast("Đã thêm tin vào danh sách nổi bật", "success");
          } else {
            toast("Vị trí này đã có tin, vui lòng chọn vị trí khác", "warning");
          }
          return newList;
        });
      } else if (draggedType === "featured" && draggedFromIndex !== null) {
        setFeaturedNewsList(function (prev) {
          const newList = [...prev];
          const temp = newList[draggedFromIndex];
          newList[draggedFromIndex] = newList[toIndex];
          newList[toIndex] = temp;
          toast("Đã di chuyển tin", "success");
          return newList;
        });
      }

      setDraggedItem(null);
      setDraggedType(null);
      setDraggedFromIndex(null);
    },
    [draggedItem, draggedType, draggedFromIndex, toast]
  );

  const handleAddToFeatured = useCallback(
    function (news) {
      const emptyIndex = featuredNewsList.findIndex(function (item) {
        return item === null;
      });
      if (emptyIndex !== -1) {
        setFeaturedNewsList(function (prev) {
          const newList = [...prev];
          newList[emptyIndex] = { ...news, id: Date.now() };
          return newList;
        });
        toast("Đã thêm tin vào danh sách nổi bật", "success");
      } else {
        toast("Danh sách nổi bật đã đầy (10/10)", "warning");
      }
    },
    [featuredNewsList, toast]
  );

  const handleRemoveFromFeatured = useCallback(
    function (index) {
      setFeaturedNewsList(function (prev) {
        const newList = [...prev];
        newList[index] = null;
        return newList;
      });
      toast("Đã xóa tin khỏi danh sách nổi bật", "success");
    },
    [toast]
  );

  const handleMoveFeaturedUp = useCallback(
    function (index) {
      if (index === 0) return;

      setFeaturedNewsList(function (prev) {
        const newList = [...prev];
        const temp = newList[index];
        newList[index] = newList[index - 1];
        newList[index - 1] = temp;
        return newList;
      });
      toast("Đã di chuyển tin lên", "success");
    },
    [toast]
  );

  const handleMoveFeaturedDown = useCallback(
    function (index) {
      if (index >= 9) return;

      setFeaturedNewsList(function (prev) {
        const newList = [...prev];
        const temp = newList[index];
        newList[index] = newList[index + 1];
        newList[index + 1] = temp;
        return newList;
      });
      toast("Đã di chuyển tin xuống", "success");
    },
    [toast]
  );

  // Banner link change handlers
  function handleBannerLink0Change(e) {
    handleBannerLinkChange(0, e.target.value);
  }

  function handleBannerLink1Change(e) {
    handleBannerLinkChange(1, e.target.value);
  }

  // function handleBannerLink2Change(e) {
  //   handleBannerLinkChange(2, e.target.value);
  // }

  // function handleBannerLink3Change(e) {
  //   handleBannerLinkChange(3, e.target.value);
  // }

  // function handleToggleBannerSection() {
  //   handleToggleSection("banner");
  // }

  const handleConfigNewDaysChange = useCallback((e) => {
    setConfigNewDays(e.target.value);
  }, []);

  const handleConfigViewHoursChange = useCallback((e) => {
    setConfigViewHours(e.target.value);
  }, []);

  // const handleConfigLikeCountChange = useCallback((e) => {
  //   setConfigLikeCount(e.target.value);
  // }, []);

  const handleConfigApprovalHoursChange = useCallback((e) => {
    setConfigApprovalHours(e.target.value);
  }, []);

  const handleScroll = useCallback(
    async (e) => {
      const { scrollTop, clientHeight, scrollHeight } = e.target;
      // Kiểm tra nếu scroll gần đến đáy (còn 50px)
      if (scrollTop + clientHeight >= scrollHeight - 50) {
        if (isFetchingMore) return;

        setIsFetchingMore(true);
        const nextPage = page + 1;

        try {
          const newItems = await fetchNewsData(
            searchOutstanding,
            selectedTopic,
            dateRangeOutstanding,
            nextPage
          );

          if (newItems && newItems.length > 0) {
            setOutstandingNews((prev) => {
              let updated = [...prev, ...newItems];
              // Yêu cầu: call lần 1 - lần 2 - đến lần call thứ 3 phải xóa lần call 1 đi
              // Tức là chỉ giữ lại tối đa 2 trang (100 item)
              if (nextPage >= 3) {
                updated = updated.slice(50); // Xóa 50 item đầu (items của page cũ nhất)
              }
              return updated;
            });
            setPage(nextPage);
          }
        } catch (error) {
          // logger.error("Lỗi khi tải thêm tin:", error);
        } finally {
          setIsFetchingMore(false);
        }
      }
    },
    [
      isFetchingMore,
      page,
      fetchNewsData,
      searchOutstanding,
      selectedTopic,
      dateRangeOutstanding,
    ]
  );


  // Helper render functions
  function renderBannerImage(imageData, imageId) {
    if (!imageData) return null;

    function handleDeleteClick() {
      handleDeleteBannerImage(imageData.id);
    }

    return (
      <BannerImageWrapper>
        <AuthImage 
          src={imageData.url} 
          alt={`Banner ${imageId}`} 
          customStyle={{ width: "100%", height: "100%", objectFit: "contain", backgroundColor: "#f8f9fa" }} 
        />
        <BannerDeleteButton onClick={handleDeleteClick}>
          <DeleteIconWhite />
        </BannerDeleteButton>
      </BannerImageWrapper>
    );
  }

  function renderUploadPlaceholder() {
    return (
      <>
        <UploadIcon>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" />
          </svg>
        </UploadIcon>
        <UploadText>Kéo thả hoặc nhấp để tải hình ảnh</UploadText>
        <UploadSubText>PNG, JPG, GIF (tối đa 5MB)</UploadSubText>
      </>
    );
  }

  function renderBannerUploadArea(bannerIndex, isLarge) {
    const bannerData = bannerImages[bannerIndex];
    const AreaComponent = isLarge ? UploadAreaLarge : UploadAreaMedium;

    if (isLoadingBanner) {
      return <BannerSkeleton variant="rectangular" isLarge={isLarge} />;
    }

    function handleUploadClick() {
      if (!bannerData) {
        setCurrentUploadIndex(bannerIndex);
        handleBannerUploadClick();
      }
    }

    return (
      <AreaComponent onClick={handleUploadClick}>
        {bannerData
          ? renderBannerImage(bannerData, bannerIndex + 1)
          : renderUploadPlaceholder()}
      </AreaComponent>
    );
  }

  function renderNewsItem(news) {
    return (
      <NewsCard>
        <NewsCardContent>
          <NewsTitle >{news.title}</NewsTitle>
          <NewsMetaBox>
            <NewsDate>{news.date}</NewsDate>
            <TagsBox>
              {news.tags?.map(function (tag, idx) {
                return <NewsTag key={idx}>{tag}</NewsTag>;
              })}
            </TagsBox>
          </NewsMetaBox>
        </NewsCardContent>
      </NewsCard>
    );
  }


  function renderOutstandingNewsItem(news) {
    // Kiểm tra xem tin này đã có trong danh sách nổi bật chưa
    const isInFeaturedList = featuredNewsList.some(function (featuredNews) {
      if (!featuredNews) return false;
      const featuredId =
        featuredNews._original?.id ||
        featuredNews._original?._id ||
        featuredNews.id;
      const currentId = news._original?.id || news._original?._id || news.id;
      return featuredId === currentId;
    });

    // Nếu đã có trong danh sách nổi bật thì không hiển thị
    if (isInFeaturedList) {
      return null;
    }

    function handleDragStartOutstanding(e) {
      handleDragStart(e, news, "outstanding");
    }

    function handleAddClick() {
      handleAddToFeatured(news);
    }

    return (
      <DraggableBox
        key={news.id || news._id}
        draggable
        onDragStart={handleDragStartOutstanding}
      >
        {renderNewsItem(news)}
        <AddButtonBox>
          <AddNewsButton
            startIcon={<AddIcon />}
            size="small"
            onClick={handleAddClick}
          >
            Thêm vào nổi bật
          </AddNewsButton>
        </AddButtonBox>
      </DraggableBox>
    );
  }


  function renderFeaturedSlotActions(index) {
    function handleMoveUpClick(e) {
      e.preventDefault();
      e.stopPropagation();
      handleMoveFeaturedUp(index);
    }

    function handleMoveDownClick(e) {
      e.preventDefault();
      e.stopPropagation();
      handleMoveFeaturedDown(index);
    }

    function handleRemoveClick(e) {
      e.preventDefault();
      e.stopPropagation();
      handleRemoveFromFeatured(index);
    }

    function handleMouseDownStop(e) {
      e.stopPropagation();
    }

    return (
      <NewsActionContainer draggable={false}>
        <ActionIconButton
          size="small"
          onClick={handleMoveUpClick}
          onMouseDown={handleMouseDownStop}
          disabled={index === 0}
        >
          <UploadExpandLessIcon />
        </ActionIconButton>

        <ActionIconButton
          size="small"
          onClick={handleMoveDownClick}
          onMouseDown={handleMouseDownStop}
          disabled={index === 9}
        >
          <UploadExpandMoreIcon />
        </ActionIconButton>

        <ActionIconButton
          size="small"
          onClick={handleRemoveClick}
          onMouseDown={handleMouseDownStop}
        >
          <UploadDeleteIcon />
        </ActionIconButton>
      </NewsActionContainer>

    );
  }

  function renderFeaturedNewsCard(news, index) {
    function handleDragStartFeatured(e) {
      handleDragStart(e, news, "featured", index);
    }

    function handleMouseDownPrevent(e) {
      if (e.target.closest("button")) {
        e.preventDefault();
      }
    }

    return (
      <DraggableNewsCard
        draggable
        onDragStart={handleDragStartFeatured}
        onMouseDown={handleMouseDownPrevent}
      >
        <NumberBadge>{index + 1}</NumberBadge>
        <FeaturedNewsContentBox>
          <NewsTitle>{news.title}</NewsTitle>
          <NewsDate>{news.date}</NewsDate>
        </FeaturedNewsContentBox>
        {renderFeaturedSlotActions(index)}
      </DraggableNewsCard>

    );
  }

  function renderFeaturedSlot(index) {
    const news = featuredNewsList[index];

    function handleDropSlot(e) {
      handleDrop(e, index);
    }

    return (
      <Box key={index} onDragOver={handleDragOver} onDrop={handleDropSlot}>
        <NewsItemBox>
          {news ? (
            renderFeaturedNewsCard(news, index)
          ) : (
            <EmptySlotContainer>
              <NumberBadge>{index + 1}</NumberBadge>
              <EmptySlotBox>Trống - Vị trí #{index + 1}</EmptySlotBox>
            </EmptySlotContainer>
          )}
        </NewsItemBox>
      </Box>

    );
  }

  return (
    <CustomSwipper
      open={open}
      onClose={onClose}
      title="CẤU HÌNH"
      footer={
        <>
          <FlexGrowBox />
          <FooterActions>
        <SaveButton
          variant="contained"
          onClick={handleSaveClick}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Đang lưu..." : "Lưu"}
        </SaveButton>
          </FooterActions>
        </>
      }
    >
      <MainCard>
        <FlexColumnBox>
          {/* ẢNH BANNER */}
          <Box>
            <SectionTitleBox>
              <VerticalIndicator />
              <SectionTitle>ẢNH BANNER</SectionTitle>
            </SectionTitleBox>
            <SectionDescription>
              Quản lý và cập nhật hình ảnh banner trình chiếu trên trang chủ.
            </SectionDescription>


              <BannerContentBox>
                <Grid container spacing={2}>
                  {/* Ảnh banner 1 */}
                  <Grid item xs={12} sm={6}>
                    <Box>
                      {renderBannerUploadArea(0)}
                      <BannerLinkInput>
                        <CustomInput
                          placeholder="Link liên kết"
                          value={bannerLinks[0]}
                          onChange={handleBannerLink0Change}
                          size="small"
                          fullWidth
                        />
                      </BannerLinkInput>
                    </Box>
                  </Grid>

                  {/* Ảnh banner 2 */}
                  <Grid item xs={12} sm={6}>
                    <Box>
                      {renderBannerUploadArea(1)}
                      <BannerLinkInput>
                        <CustomInput
                          placeholder="Link liên kết"
                          value={bannerLinks[1]}
                          onChange={handleBannerLink1Change}
                          size="small"
                          fullWidth
                        />
                      </BannerLinkInput>
                    </Box>
                  </Grid>

                  {/* Ảnh banner 3 */}
                  {/* <Grid item xs={12} sm={6}>
                    <Box>
                      {renderBannerUploadArea(2)}
                      <BannerLinkInput>
                        <CustomInput
                          placeholder="Link liên kết"
                          value={bannerLinks[2]}
                          onChange={handleBannerLink2Change}
                          size="small"
                          fullWidth
                        />
                      </BannerLinkInput>
                    </Box>
                  </Grid> */}

                  {/* Ảnh banner 4 */}
                  {/* <Grid item xs={12} sm={6}>
                    <Box>
                      {renderBannerUploadArea(3)}
                      <BannerLinkInput>
                        <CustomInput
                          placeholder="Link liên kết"
                          value={bannerLinks[3]}
                          onChange={handleBannerLink3Change}
                          size="small"
                          fullWidth
                        />
                      </BannerLinkInput>
                    </Box>
                  </Grid> */}
                </Grid>

                <HiddenFileInput
                  ref={bannerFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBannerImageChange}
                />
              </BannerContentBox>
          </Box>

          {/* QUẢN LÝ TIN NỔI BẬT */}

          <Box>
            <SectionBox>
              <SectionTitleBox>
                <VerticalIndicator />
                <SectionTitle>Quản lý tin nổi bật</SectionTitle>
              </SectionTitleBox>
              <SectionDescription>
                Chọn lọc và sắp xếp thứ tự ưu tiên của các bài viết quan trọng nhất.
              </SectionDescription>

              <BannerContentBox>
                <Grid container spacing={3}>
                  {/* CỘT TRÁI - KHO TIN BÀI */}
                  <Grid item xs={12} md={5.5}>
                    <Box>
                      <SectionHeaderBox>
                        <BannerTypography variant="subtitle2">
                          Kho tin bài
                        </BannerTypography>
                        <CountBadge>{outstandingNews.length}</CountBadge>
                      </SectionHeaderBox>

                      <SearchBox>
                        <CustomInput
                          placeholder="Tìm kiếm bài viết..."
                          value={searchOutstanding}
                          onChange={handleSearchOutstandingChange}
                          size="small"
                          InputProps={{
                            endAdornment: (
                              <InputAdornment>
                                <IconButton onClick={handleSearchClick} edge="end">
                                  <SearchIcon />
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />
                      </SearchBox>

                      <FilterContainer>
                        <Grid container spacing={1}>
                          <Grid item xs={5}>
                            <CustomInput
                              value={selectedTopic}
                              onChange={handleTopicChange}
                              select
                              placeholder="Tất cả chủ đề"
                              size="small"
                              options={[
                                { id: "all", name: "Tất cả chủ đề" },
                                ...topicOptions,
                              ]}
                              customLabel="name"
                              customValue="id"
                            />
                          </Grid>
                          <Grid item xs={7}>
                            <CustomDateRangePicker
                              start={dateRangeOutstanding.from}
                              end={dateRangeOutstanding.to}
                              onChange={handleDateRangeChange}
                            />
                          </Grid>
                        </Grid>
                      </FilterContainer>
                      <NewsListContainerMedium onScroll={handleScroll}>
                        {outstandingNews
                          .map(renderOutstandingNewsItem)
                          .filter(Boolean)}
                        {isFetchingMore && (
                          <LoadingBox>
                            <Typography variant="caption">Đang tải thêm...</Typography>
                          </LoadingBox>
                        )}
                      </NewsListContainerMedium>
                    </Box>
                  </Grid>

                  {/* CỘT PHẢI - DANH SÁCH NỔI BẬT */}
                  <Grid item xs={12} md={6.5}>
                    <Box>
                      <SectionHeaderSpaceBetween>
                        <HeaderTitleColumnBox>
                          <BannerTypography variant="subtitle2">
                            DANH SÁCH NỔI BẬT
                          </BannerTypography>
                          <HintText>
                            KÉO THẢ ĐỂ SẮP XẾP VỊ TRÍ
                          </HintText>
                        </HeaderTitleColumnBox>
                        <SlotBadge>
                          {featuredNewsList.filter(Boolean).length}/10 Slot
                        </SlotBadge>
                      </SectionHeaderSpaceBetween>

                      <NewsListContainerLarge>
                        {Array.from({ length: 10 }, function (_, index) {
                          return renderFeaturedSlot(index);
                        })}
                      </NewsListContainerLarge>
                    </Box>
                  </Grid>
                </Grid>
              </BannerContentBox>
            </SectionBox>
          </Box>

          {/* CẤU HÌNH KHÁC */}
          <Box>
            <SectionBox>
              <SectionTitleBox>
                <VerticalIndicator />
                <SectionTitle>CẤU HÌNH KHÁC</SectionTitle>
              </SectionTitleBox>
              <SectionDescription>
                Cấu hình top hiển thị và thời gian nhắc nhở phê duyệt
              </SectionDescription>

              <BannerContentBox>
                <Grid container spacing={4}>
                  {/* Cột trái */}
                  <Grid item xs={12} md={6}>
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                          <Box>
                            <BannerTitle variant="subtitle2">
                              Tin mới
                            </BannerTitle>
                            <CustomInput
                              fullWidth
                              type="number"
                              placeholder="Enter text"
                              value={configNewDays}
                              onChange={handleConfigNewDaysChange}
                              size="small"
                            />
                            <ConfigCaption variant="caption">
                              Nhập số lượng Top tin mới
                            </ConfigCaption>
                          </Box>
                        </Grid>
                        <Grid item xs={12}>
                          <Box>
                            <BannerTitle variant="subtitle2">
                              Hạn phê duyệt
                            </BannerTitle>
                            <CustomInput
                              fullWidth
                              type="number"
                              placeholder="Enter text"
                              value={configApprovalHours}
                              onChange={handleConfigApprovalHoursChange}
                              size="small"
                            />
                            <ConfigCaption variant="caption">
                              Đơn vị được tính bằng giờ
                            </ConfigCaption>
                          </Box>
                        </Grid>
                      </Grid>
                    </Grid>


                  {/* Cột phải */}
                  <Grid item xs={12} md={6}>
                      <Box>
                        <BannerTitle variant="subtitle2">
                          Tin xem nhiều
                        </BannerTitle>
                        <CustomInput
                          fullWidth
                          type="number"
                          placeholder="Enter text"
                          value={configViewHours}
                          onChange={handleConfigViewHoursChange}
                          size="small"
                        />
                        <ConfigCaption variant="caption">
                          Nhập số lượng Top tin xem nhiều
                        </ConfigCaption>
                      </Box>
                    </Grid>
                </Grid>
              </BannerContentBox>

            </SectionBox>
          </Box>
        </FlexColumnBox>
      </MainCard>

      {/* Dialog cắt ảnh */}
      <CustomDialog
        open={isCropDialogOpen}
        onClose={handleCloseCropDialog}
        title="Cắt ảnh banner"
        onSave={handleCropConfirm}
        titleButton="XÁC NHẬN"
        cancelButtonText="Hủy"
        type="add"
        size="md"
      >
        <DialogContent>
          <CropContainer>
            {cropImageSrc && (
              <ReactCrop
                crop={crop}
                onChange={setCrop}
                onComplete={setCompletedCrop}
              >
                <img
                  src={cropImageSrc}
                  onLoad={onImageLoad}
                  alt="Crop source"
                  style={{ maxWidth: '100%', maxHeight: '70vh' }}
                />
              </ReactCrop>
            )}
          </CropContainer>
          <CropCaptionText>
            Kéo các góc hoặc cạnh để chọn vùng ảnh. Bạn có thể tự do điều chỉnh khung cắt theo ý muốn.
          </CropCaptionText>
        </DialogContent>
      </CustomDialog>
    </CustomSwipper>
  );
}
