"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchVideos } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/redux/slices/newsSlice";
import axiosClient from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/hooks/axiosClient";
import { API_PUBLISHED, API_FILES_VIEW, APP_BASE } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/EnvironmentFile/urlConfig";
import { getResponsiveImage, DEFAULT_NEWS_THUMBNAIL, withPublic } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/utils/imageHelper";
import { ROUTES } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/config/routes";
import { useCMS } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/context/CMSContext";
import moment from "moment";
import AuthImage from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimImage';
import AuthVideo from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/AuthVideo';
import {
    // Ship,
    FileText,
    // BarChart3,
    PlayCircle,
    Eye,
    Heart,
    ChevronRight,
    Monitor
} from "lucide-react";

const CustomCommentIcon = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6.6665 2.14844C5.73031 2.36202 4.85902 2.79712 4.12581 3.41719C3.3926 4.03725 2.81887 4.8242 2.45279 5.71193C2.08671 6.59966 1.93897 7.56227 2.02198 8.51893C2.10499 9.47558 2.41632 10.3984 2.92984 11.2098L1.99984 13.9998L4.78984 13.0698C5.60125 13.5833 6.52402 13.8946 7.48068 13.9776C8.43734 14.0606 9.39995 13.9129 10.2877 13.5468C11.1754 13.1807 11.9624 12.607 12.5824 11.8738C13.2025 11.1406 13.6376 10.2693 13.8512 9.3331M13.8512 6.66644C13.5994 5.56457 13.0419 4.55609 12.2427 3.75688C11.4435 2.95767 10.435 2.40017 9.33317 2.14844M11.3332 7.99977C11.3332 7.11572 10.982 6.26787 10.3569 5.64275C9.73174 5.01763 8.88389 4.66644 7.99984 4.66644M8.6665 7.99977C8.6665 7.82296 8.59626 7.65339 8.47124 7.52837C8.34622 7.40334 8.17665 7.3331 7.99984 7.3331" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const NewsEmptyIcon = () => (
    <svg width="69" height="58" viewBox="0 0 69 58" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g opacity="0.3">
            <path d="M55.7148 8.57031H62.1434C63.7723 8.57011 65.3406 9.1883 66.5313 10.2999C67.7219 11.4116 68.4462 12.9338 68.5577 14.5589L68.572 14.9989V47.856C68.5721 50.2278 67.6647 52.5098 66.0358 54.2338C64.4069 55.9578 62.18 56.9932 59.812 57.1275L59.2863 57.1417H55.7148V8.57031Z" fill="url(#paint0_radial_4176_29283)"/>
            <path d="M9.28571 57.1429C6.91389 57.143 4.63192 56.2356 2.90791 54.6067C1.18391 52.9777 0.148568 50.7509 0.0142861 48.3829L4.85677e-08 47.8571V6.42857C-0.000200062 4.79964 0.617987 3.23137 1.72963 2.0407C2.84127 0.850041 4.36346 0.125777 5.98857 0.0142861L6.42857 4.85678e-08H50.7143C52.3432 -0.000200062 53.9115 0.617986 55.1022 1.72963C56.2928 2.84127 57.0171 4.36346 57.1286 5.98857L57.1429 6.42857L57.1286 57.1429H9.28571Z" fill="url(#paint1_linear_4176_29283)"/>
            <path d="M9.28571 57.1429C6.91389 57.143 4.63192 56.2356 2.90791 54.6067C1.18391 52.9777 0.148568 50.7509 0.0142861 48.3829L4.85677e-08 47.8571V6.42857C-0.000200062 4.79964 0.617987 3.23137 1.72963 2.0407C2.84127 0.850041 4.36346 0.125777 5.98857 0.0142861L6.42857 4.85678e-08H50.7143C52.3432 -0.000200062 53.9115 0.617986 55.1022 1.72963C56.2928 2.84127 57.0171 4.36346 57.1286 5.98857L57.1429 6.42857L57.1286 57.1429H9.28571Z" fill="url(#paint2_linear_4176_29283)"/>
            <path d="M9.28571 57.1429C6.91389 57.143 4.63192 56.2356 2.90791 54.6067C1.18391 52.9777 0.148568 50.7509 0.0142861 48.3829L4.85677e-08 47.8571V6.42857C-0.000200062 4.79964 0.617987 3.23137 1.72963 2.0407C2.84127 0.850041 4.36346 0.125777 5.98857 0.0142861L6.42857 4.85678e-08H50.7143C52.3432 -0.000200062 53.9115 0.617986 55.1022 1.72963C56.2928 2.84127 57.0171 4.36346 57.1286 5.98857L57.1429 6.42857L57.1286 57.1429H9.28571Z" fill="url(#paint3_linear_4176_29283)"/>
            <path d="M23.5629 25.7266C25.5343 25.7266 27.1343 27.3266 27.1343 29.298V39.2866C27.1343 41.258 25.5343 42.858 23.5629 42.858H13.5714C11.6 42.858 10 41.258 10 39.2866V29.298C10 27.3266 11.6 25.7266 13.5714 25.7266H23.5629Z" fill="url(#paint4_linear_4176_29283)"/>
            <path d="M34.9981 38.5705H44.9866C45.5296 38.5707 46.0522 38.7769 46.4489 39.1476C46.8456 39.5182 47.0868 40.0256 47.1239 40.5673C47.1609 41.109 46.9909 41.6445 46.6483 42.0657C46.3056 42.4868 45.8159 42.7622 45.2781 42.8362L44.9866 42.8562H34.9981C34.4551 42.8561 33.9325 42.6498 33.5358 42.2792C33.1391 41.9085 32.8979 41.4011 32.8608 40.8594C32.8238 40.3178 32.9938 39.7822 33.3364 39.3611C33.6791 38.9399 34.1688 38.6645 34.7066 38.5905L34.9981 38.5705ZM34.9981 25.7219H44.9866C45.5296 25.7221 46.0522 25.9284 46.4489 26.299C46.8456 26.6697 47.0868 27.1771 47.1239 27.7187C47.1609 28.2604 46.9909 28.7959 46.6483 29.2171C46.3056 29.6382 45.8159 29.9137 45.2781 29.9877L44.9866 30.0077H34.9981C34.4551 30.0075 33.9325 29.8012 33.5358 29.4306C33.1391 29.0599 32.8979 28.5525 32.8608 28.0109C32.8238 27.4692 32.9938 26.9337 33.3364 26.5125C33.6791 26.0914 34.1688 25.8159 34.7066 25.7419L34.9981 25.7219ZM12.1295 12.8477H44.9866C45.5296 12.8478 46.0522 13.0541 46.4489 13.4247C46.8456 13.7954 47.0868 14.3028 47.1239 14.8445C47.1609 15.3861 46.9909 15.9216 46.6483 16.3428C46.3056 16.764 45.8159 17.0394 45.2781 17.1134L44.9866 17.1334H12.1295C11.5827 17.1389 11.0545 16.9352 10.653 16.564C10.2515 16.1928 10.0071 15.6821 9.96982 15.1366C9.93258 14.591 10.1053 14.0519 10.4526 13.6295C10.7999 13.2072 11.2956 12.9336 11.8381 12.8648L12.1295 12.8477Z" fill="url(#paint5_linear_4176_29283)"/>
        </g>
        <defs>
            <radialGradient id="paint0_radial_4176_29283" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(76.284 15.8549) rotate(127.598) scale(33.7171 49.6774)">
                <stop stopColor="#068BEB"/>
                <stop offset="0.617" stopColor="#0056CF"/>
                <stop offset="0.974" stopColor="#0027A7"/>
            </radialGradient>
            <linearGradient id="paint1_linear_4176_29283" x1="16.3257" y1="-8.79143" x2="63.6629" y2="49.6143" gradientUnits="userSpaceOnUse">
                <stop stopColor="#3BD5FF"/>
                <stop offset="1" stopColor="#367AF2"/>
            </linearGradient>
            <linearGradient id="paint2_linear_4176_29283" x1="32.6543" y1="46.1543" x2="32.6543" y2="57.1429" gradientUnits="userSpaceOnUse">
                <stop offset="0.181" stopColor="#2764E7" stopOpacity="0"/>
                <stop offset="1" stopColor="#2764E7"/>
            </linearGradient>
            <linearGradient id="paint3_linear_4176_29283" x1="30.6114" y1="17.5829" x2="53.3314" y2="72.06" gradientUnits="userSpaceOnUse">
                <stop stopColor="#DCF8FF" stopOpacity="0"/>
                <stop offset="1" stopColor="#FF6CE8" stopOpacity="0.7"/>
            </linearGradient>
            <linearGradient id="paint4_linear_4176_29283" x1="11.6343" y1="24.8866" x2="20.2029" y2="42.0408" gradientUnits="userSpaceOnUse">
                <stop stopColor="#DEFCFF"/>
                <stop offset="1" stopColor="#9FF0F9"/>
            </linearGradient>
            <linearGradient id="paint5_linear_4176_29283" x1="13.2352" y1="13.3734" x2="17.3009" y2="45.8019" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FDFDFD"/>
                <stop offset="1" stopColor="#CCEAFF"/>
            </linearGradient>
        </defs>
    </svg>
);

const VideoEmptyIcon = () => (
    <svg width="58" height="57" viewBox="0 0 58 57" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g opacity="0.3">
            <path d="M18.3672 35.9417V20.5793C18.3676 19.8838 18.5456 19.2 18.8845 18.5927C19.2233 17.9854 19.7118 17.4748 20.3034 17.1092C20.895 16.7437 21.5702 16.5354 22.265 16.5041C22.9597 16.4728 23.6509 16.6196 24.273 16.9305L39.6355 24.6117C40.3125 24.951 40.8818 25.472 41.2796 26.1164C41.6775 26.7608 41.8882 27.5032 41.8882 28.2605C41.8882 29.0178 41.6775 29.7602 41.2796 30.4046C40.8818 31.049 40.3125 31.57 39.6355 31.9093L24.273 39.5905C23.6509 39.9014 22.9597 40.0482 22.265 40.0169C21.5702 39.9856 20.895 39.7773 20.3034 39.4118C19.7118 39.0462 19.2233 38.5356 18.8845 37.9283C18.5456 37.321 18.3676 36.6372 18.3672 35.9417Z" fill="#2859C5"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M33.0188 0.0368464C32.2167 -0.0887192 31.3975 0.109493 30.7416 0.587878C30.0856 1.06626 29.6465 1.78563 29.521 2.58774C29.3954 3.38984 29.5936 4.20898 30.072 4.86494C30.5504 5.5209 31.2698 5.95996 32.0719 6.08552C37.64 6.98214 42.6668 9.94111 46.1532 14.3743C49.6396 18.8074 51.3302 24.3901 50.889 30.0127C50.4478 35.6352 47.9071 40.8859 43.7719 44.721C39.6367 48.5561 34.2098 50.6947 28.57 50.7119C24.0688 50.7138 19.6709 49.3624 15.9474 46.8333C12.2239 44.3041 9.3467 40.7139 7.68942 36.5289C7.37417 35.7982 6.78675 35.219 6.05168 34.914C5.31661 34.6091 4.49168 34.6024 3.75177 34.8954C3.01186 35.1884 2.41514 35.758 2.08811 36.4836C1.76108 37.2091 1.72944 38.0334 1.99991 38.7818C4.45189 44.9588 8.98 50.0881 14.8052 53.2872C20.6304 56.4863 27.3884 57.5552 33.9165 56.31C40.4447 55.0647 46.3347 51.5832 50.5733 46.4645C54.8119 41.3458 57.1339 34.9098 57.14 28.264C57.1413 21.4568 54.7121 14.8729 50.2899 9.69785C45.8676 4.52282 39.7429 1.09682 33.0188 0.0368464ZM22.954 6.11817C23.7044 5.88527 24.3365 5.37273 24.7194 4.68667C25.1024 4.0006 25.2069 3.19354 25.0113 2.43256C24.8157 1.67159 24.3349 1.01497 23.6686 0.598642C23.0022 0.182315 22.2013 0.0381613 21.4316 0.196022C20.1268 0.5324 18.8475 0.960659 17.6032 1.47759C17.232 1.63195 16.8949 1.85791 16.6111 2.14256C16.3272 2.42721 16.1022 2.76499 15.9489 3.13659C15.6393 3.88708 15.6405 4.72983 15.9523 5.47943C16.1066 5.8506 16.3326 6.18773 16.6172 6.47157C16.9019 6.75541 17.2397 6.9804 17.6113 7.13371C18.3618 7.44332 19.2045 7.44212 19.9541 7.13037C20.9228 6.72767 21.9227 6.39299 22.954 6.12634M12.9381 11.7546C13.4907 11.1832 13.7993 10.4191 13.7986 9.62418C13.798 8.82923 13.4881 8.06573 12.9345 7.4952C12.3809 6.92467 11.6271 6.59187 10.8326 6.5672C10.038 6.54252 9.26502 6.82792 8.67712 7.36301C6.74109 9.23666 5.07982 11.3747 3.74268 13.7137C3.54329 14.0629 3.41464 14.4479 3.36406 14.8469C3.31348 15.2458 3.34197 15.6507 3.4479 16.0386C3.55383 16.4265 3.73513 16.7898 3.98144 17.1076C4.22775 17.4255 4.53425 17.6917 4.88344 17.8911C5.23263 18.0904 5.61767 18.2191 6.01658 18.2697C6.4155 18.3202 6.82047 18.2918 7.20837 18.1858C7.59627 18.0799 7.95951 17.8986 8.27735 17.6523C8.59518 17.406 8.86139 17.0995 9.06078 16.7503C10.1138 14.9055 11.4198 13.2239 12.9381 11.7546ZM6.34255 24.7009C6.40642 24.2995 6.38972 23.8894 6.29341 23.4945C6.1971 23.0997 6.02312 22.7279 5.78161 22.401C5.54011 22.0741 5.23591 21.7986 4.88678 21.5905C4.53765 21.3824 4.15057 21.2459 3.74813 21.189C3.34568 21.132 2.93593 21.1558 2.54279 21.259C2.14964 21.3621 1.78097 21.5425 1.45829 21.7896C1.13561 22.0368 0.865368 22.3457 0.663346 22.6984C0.461323 23.0511 0.33156 23.4404 0.281628 23.8438C0.0930476 25.1769 -0.00105973 26.5217 9.00075e-06 27.8681C9.00075e-06 28.68 0.322514 29.4585 0.896576 30.0326C1.47064 30.6067 2.24923 30.9292 3.06108 30.9292C3.87293 30.9292 4.65152 30.6067 5.22558 30.0326C5.79965 29.4585 6.12215 28.68 6.12215 27.8681C6.12215 26.7906 6.19562 25.7349 6.34255 24.7009Z" fill="#8FBFFA"/>
        </g>
    </svg>
);

const EmptyState = ({ type = 'news' }) => {
    const containerClass = "bp-empty-state " + type;
    return (
        <div className={containerClass}>
            <div className="bp-empty-icon-circle">
                {type === 'news' ? <NewsEmptyIcon /> : <VideoEmptyIcon />}
            </div>
            <h4 className="bp-empty-title">
                {type === 'news' ? "Chưa có tin tức nào" : "Chưa có video nổi bật nào"}
            </h4>
            {type === 'news' && (
                <p className="bp-empty-subtitle">Chủ đề này chưa có tin tức nào được đăng tải</p>
            )}
        </div>
    );
};

export default function BusinessPortal(props) {
    const { videoUrl } = props;

    const dispatch = useDispatch();
    const { setActivePage, banners } = useCMS();
    const { topicList, videoList, loading: topicsLoading } = useSelector((state) => state.news);
    const [apiVideoUrl, setApiVideoUrl] = useState(null);
    const [homeBanner, setHomeBanner] = useState(null);
    const [sectionsData, setSectionsData] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const fetchedSectionsKeyRef = useRef("");

    const getVideoConfig = (url) => {
        if (!url) return null;

        // YouTube
        // eslint-disable-next-line no-useless-escape
        const ytRegex = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const ytMatch = url.match(ytRegex);
        if (ytMatch && ytMatch[2].length === 11) {
            // eslint-disable-next-line no-useless-escape
            return { type: 'iframe', url: `https://www.youtube.com/embed/${ytMatch[2]}?autoplay=0&rel=0` };
        }

        // Vimeo
        const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/;
        const vimeoMatch = url.match(vimeoRegex);
        if (vimeoMatch) {
            return { type: 'iframe', url: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
        }

        // Facebook
        if (url.includes('facebook.com') || url.includes('fb.watch')) {
            return { type: 'iframe', url: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0` };
        }

        // Direct Video Files or API View URLs
        const isDirectVideo = /\.(mp4|webm|ogg)$/i.test(url);
        const isApiView = url.includes('/api/files/view') || (API_FILES_VIEW && url.startsWith(API_FILES_VIEW));

        if (isDirectVideo || isApiView) {
            return { type: 'video', url: url };
        }

        return { type: 'iframe', url: url };
    };

    useEffect(() => {
        if (banners && banners.length > 0) {
            const featured = banners.find(b => b.bannerKey === 'featured-video');
            if (featured) {
                if (featured.linkUrl) {
                    setApiVideoUrl(featured.linkUrl);
                } else if (featured.idfile) {
                    setApiVideoUrl(withPublic(`${API_FILES_VIEW}/${featured.idfile}`));
                }
            }

            const hb2 = banners.find(b => b.bannerKey === 'home-banner-2');
            if (hb2) {
                setHomeBanner({
                    image: hb2.idfile ? withPublic(`${API_FILES_VIEW}/${hb2.idfile}`) : (hb2.imageUrl?.startsWith('http') ? hb2.imageUrl : hb2.imageUrl),
                    link: hb2.linkUrl
                });
            }
        }
    }, [banners]);

    useEffect(() => {
        dispatch(fetchVideos());
    }, [dispatch]);

    const top3Topics = useMemo(() => {
        const list = Array.isArray(topicList) ? topicList : (topicList?.data || topicList?.items || []);
        const activeList = list.filter(topic => !topic.status?.includes("Không hoạt động"));
        return activeList.slice(0, 3);
    }, [topicList]);

    const featuredVideos = useMemo(() => {
        const list = Array.isArray(videoList?.data) ? videoList.data : (Array.isArray(videoList) ? videoList : []);
        return list.filter(v => v.videoType === 'Hiển thị lên trang chủ').slice(0, 3);
    }, [videoList]);

    const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

    const featuredVideo = featuredVideos[currentVideoIndex] || featuredVideos[0];

    // const getFullUrl = (url) => {
    //     if (!url) return "";
    //     if (url.startsWith("http")) return url;
    //     return `${APP_BASE}${url}`;
    // };

    const finalVideoUrl = useMemo(() => {
        if (!featuredVideo) return apiVideoUrl || videoUrl;
        const v = featuredVideo;
        if (v.videoLink) return v.videoLink;
        return v.videoFileId ? withPublic(`${API_FILES_VIEW}/${v.videoFileId}`) : (v.path ? (v.path.startsWith('http') ? v.path : `${APP_BASE}${v.path}`) : (v.videoUrl || apiVideoUrl || videoUrl));
    }, [featuredVideo, apiVideoUrl, videoUrl]);

    const finalVideoTitle = featuredVideo?.title || "Các kỳ Đại hội Đảng bộ...";

    const finalVideoThumb = useMemo(() => {
        if (!featuredVideo) return "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&q=80&w=800";
        const v = featuredVideo;
        if (v.thumbnailFileId) return withPublic(`${API_FILES_VIEW}/${v.thumbnailFileId}`);
        if (v.files && v.files.length > 0 && v.files[0].id) return withPublic(`${API_FILES_VIEW}/${v.files[0].id}`);
        if (v.idfile) return withPublic(`${API_FILES_VIEW}/${v.idfile}`);
        if (v.thumbnail_id) return withPublic(`${API_FILES_VIEW}/${v.thumbnail_id}`);
        if (v.nameThumbnail) return v.nameThumbnail.startsWith('http') ? v.nameThumbnail : `${APP_BASE}${v.nameThumbnail}`;
        if (v.thumbnail) return v.thumbnail.startsWith('http') ? v.thumbnail : `${APP_BASE}${v.thumbnail}`;
        return "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&q=80&w=800";
    }, [featuredVideo]);

    const videoConfig = useMemo(() => {
        if (!finalVideoUrl) return null;
        return getVideoConfig(finalVideoUrl);
    }, [finalVideoUrl]);
    useEffect(() => {
        const sectionsKey = top3Topics.map(topic => topic.id).join("|");

        if (!sectionsKey) {
            if (!topicsLoading) {
                setIsLoading(false);
            }
            return;
        }

        if (fetchedSectionsKeyRef.current === sectionsKey) {
            return;
        }

        let isMounted = true;
        fetchedSectionsKeyRef.current = sectionsKey;
        setIsLoading(true);

        const fetchSectionsNews = async () => {
            const data = {};
            await Promise.all(top3Topics.map(async (topic) => {
                try {
                    const response = await axiosClient.get(`${API_PUBLISHED}/published`, {
                        params: { "filter[topic]": topic.id, limit: 5 }
                    });
                    const items = response.data?.items || response.items || (Array.isArray(response) ? response : []);
                    data[topic.id] = items;
                } catch (err) {
                    logger.error(`Error fetching news for topic ${topic.id}:`, err);
                    data[topic.id] = [];
                }
            }));

            if (isMounted) {
                setSectionsData(data);
                setIsLoading(false);
            }
        };

        fetchSectionsNews();

        return () => { isMounted = false; };
    }, [top3Topics, topicsLoading]);

    const handleTopicClick = useCallback((topicId, topicName) => {
        const url = `/tin-tuc?topicId=${topicId}${topicName ? `&topicName=${encodeURIComponent(topicName)}` : ''}`;
        setActivePage(url);
        window.history.pushState(null, "", url);
        window.scrollTo(0, 0);
    }, [setActivePage]);

    const handleNewsClick = useCallback((id) => {
        const url = ROUTES.newsDetail(id);
        const fromUrl = window.location.pathname + window.location.search;
        setActivePage(url);
        window.history.pushState({ fromUrl }, "", url);
        window.scrollTo(0, 0);
    }, [setActivePage]);

    const onTopicClick = useCallback((topicId, topicName) => () => handleTopicClick(topicId, topicName), [handleTopicClick]);
    const onNewsClick = useCallback((id) => () => handleNewsClick(id), [handleNewsClick]);
    const onDotClick = useCallback((idx) => () => setCurrentVideoIndex(idx), []);

    const formatDate = (item) => {
        const dateStr = item?.publishedAt || item?.createdAt || item?.created_at || item?.publish_date;
        if (!dateStr) return "—";
        const m = moment(dateStr, ["YYYY-MM-DDTHH:mm:ss", "YYYY-MM-DD", "DD/MM/YYYY", moment.ISO_8601]);
        return m.isValid() ? m.format("DD/MM/YYYY") : "—";
    };

    const renderSectionIcon = (index) => {
        switch (index) {
            case 0: return <svg width="35" height="35" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.7917 16.6667L21.875 12.5L17.7083 11.574M17.7083 11.574L12.5 10.4167M17.7083 11.574L18.75 6.25H14.5833M12.5 10.4167V15.625M12.5 10.4167L7.29167 11.574M7.29167 11.574L3.125 12.5L5.20833 16.6667M7.29167 11.574L6.25 6.25H10.4167M10.4167 6.25V3.125H14.5833V6.25M10.4167 6.25H14.5833M3.125 20.8333L4.42187 20.3146C4.82508 20.1533 5.26145 20.0926 5.69336 20.1376C6.12527 20.1826 6.53974 20.332 6.90104 20.5729C7.4415 20.9333 8.09455 21.0849 8.73848 20.9994C9.38242 20.9139 9.97332 20.5972 10.401 20.1083L10.4375 20.0667C10.6946 19.7725 11.0117 19.5368 11.3674 19.3753C11.7232 19.2138 12.1093 19.1302 12.5 19.1302C12.8907 19.1302 13.2768 19.2138 13.6326 19.3753C13.9883 19.5368 14.3054 19.7725 14.5625 20.0667L14.6 20.1083C15.0277 20.5972 15.6186 20.9139 16.2626 20.9994C16.9065 21.0849 17.5595 20.9333 18.1 20.5729C18.4613 20.332 18.8758 20.1826 19.3077 20.1376C19.7396 20.0926 20.176 20.1533 20.5792 20.3146L21.875 20.8333" stroke="url(#paint0_linear_1132_4957)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                    <linearGradient id="paint0_linear_1132_4957" x1="3.125" y1="12.0738" x2="21.875" y2="12.0738" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#20AAEC" />
                        <stop offset="1" stopColor="#5567CC" />
                    </linearGradient>
                </defs>
            </svg>
            ;
            case 1: return <svg width="35" height="35" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8.33341 16.667V11.4587M12.5001 16.667V8.33366M16.6667 16.667V14.5837M18.7501 4.16699H6.25008C5.69755 4.16699 5.16764 4.38649 4.77694 4.77719C4.38624 5.16789 4.16675 5.69779 4.16675 6.25033V18.7503C4.16675 19.3029 4.38624 19.8328 4.77694 20.2235C5.16764 20.6142 5.69755 20.8337 6.25008 20.8337H18.7501C19.3026 20.8337 19.8325 20.6142 20.2232 20.2235C20.6139 19.8328 20.8334 19.3029 20.8334 18.7503V6.25033C20.8334 5.69779 20.6139 5.16789 20.2232 4.77719C19.8325 4.38649 19.3026 4.16699 18.7501 4.16699Z" stroke="url(#paint0_linear_1132_1775)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                    <linearGradient id="paint0_linear_1132_1775" x1="4.16675" y1="12.5003" x2="20.8334" y2="12.5003" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#20AAEC" />
                        <stop offset="1" stopColor="#5567CC" />
                    </linearGradient>
                </defs>
            </svg>
            case 2: return <svg width="35" height="35" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8.33317 3.125H6.24984C5.6973 3.125 5.1674 3.34449 4.7767 3.73519C4.386 4.12589 4.1665 4.6558 4.1665 5.20833V19.7917C4.1665 20.3442 4.386 20.8741 4.7767 21.2648C5.1674 21.6555 5.6973 21.875 6.24984 21.875H18.7498C19.3024 21.875 19.8323 21.6555 20.223 21.2648C20.6137 20.8741 20.8332 20.3442 20.8332 19.7917V5.20833C20.8332 4.6558 20.6137 4.12589 20.223 3.73519C19.8323 3.34449 19.3024 3.125 18.7498 3.125H14.5832M8.33317 3.125V12.5L11.4582 9.375L14.5832 12.5V3.125M8.33317 3.125H14.5832" stroke="url(#paint0_linear_1132_5161)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                    <linearGradient id="paint0_linear_1132_5161" x1="4.1665" y1="12.5" x2="20.8332" y2="12.5" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#20AAEC" />
                        <stop offset="1" stopColor="#5567CC" />
                    </linearGradient>
                </defs>
            </svg>
            ;


            default: return <FileText size={20} />;
        }
    };

    const renderSectionColor = (index) => {
        switch (index) {
            case 0: return "blue";
            case 1: return "cyan";
            case 2: return "purple";
            default: return "blue";
        }
    };

    if (isLoading) {
        const skeletonStyle = {
            background: '#e2e8f0',
            backgroundImage: 'linear-gradient(90deg, #e2e8f0 0px, #f8fafc 50%, #e2e8f0 100%)',
            backgroundSize: '200% 100%',
            animation: 'bp-shimmer 2s infinite linear',
            borderRadius: '4px',
        };
        return (
            <div style={{ maxWidth: '1550px', margin: '0', padding: '20px 20px 0', fontFamily: "'Be Vietnam Pro', -apple-system, sans-serif", width: '100%', boxSizing: 'border-box' }}>
                <style>{`
                    @keyframes bp-shimmer {
                        0% { background-position: 200% 0; }
                        100% { background-position: -200% 0; }
                    }
                `}</style>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.1fr', gap: '50px', minHeight: '100%' }}>
                    {/* Left Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        {[1, 2].map((s) => (
                            <section key={s} style={{ marginBottom: '48px' }}>
                                {/* Section header */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                    <div style={{ ...skeletonStyle, width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0 }}></div>
                                    <div style={{ ...skeletonStyle, width: '40%', height: '24px' }}></div>
                                </div>
                                {/* Feature row: card + list */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                    {/* Feature card */}
                                    <div>
                                        <div style={{ ...skeletonStyle, width: '100%', aspectRatio: '16/10', borderRadius: '12px', marginBottom: '16px' }}></div>
                                        <div style={{ ...skeletonStyle, height: '18px', width: '100%', marginBottom: '10px' }}></div>
                                        <div style={{ ...skeletonStyle, height: '18px', width: '70%', marginBottom: '10px' }}></div>
                                        <div style={{ ...skeletonStyle, height: '14px', width: '40%' }}></div>
                                    </div>
                                    {/* News list */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} style={{ display: 'flex', gap: '12px', paddingBottom: '16px', borderBottom: i < 3 ? '1px solid #e2e8f0' : 'none' }}>
                                                <div style={{ ...skeletonStyle, width: '6px', height: '6px', borderRadius: '50%', marginTop: '8px', flexShrink: 0 }}></div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ ...skeletonStyle, height: '15px', width: '100%', marginBottom: '6px' }}></div>
                                                    <div style={{ ...skeletonStyle, height: '15px', width: '80%', marginBottom: '6px' }}></div>
                                                    <div style={{ ...skeletonStyle, height: '12px', width: '30%' }}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        ))}
                    </div>
                    {/* Right Column */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <section style={{ marginBottom: '48px' }}>
                            {/* Section header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                <div style={{ ...skeletonStyle, width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0 }}></div>
                                <div style={{ ...skeletonStyle, width: '55%', height: '24px' }}></div>
                            </div>
                            {/* Featured image */}
                            <div style={{ ...skeletonStyle, height: '180px', width: '100%', borderRadius: '16px', marginBottom: '24px' }}></div>
                            {/* Featured text */}
                            <div style={{ ...skeletonStyle, height: '16px', width: '100%', marginBottom: '8px' }}></div>
                            <div style={{ ...skeletonStyle, height: '16px', width: '80%', marginBottom: '8px' }}></div>
                            <div style={{ ...skeletonStyle, height: '12px', width: '30%', marginBottom: '24px' }}></div>
                            {/* List items */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} style={{ display: 'flex', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
                                        <div style={{ ...skeletonStyle, width: '6px', height: '6px', borderRadius: '50%', marginTop: '8px', flexShrink: 0 }}></div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ ...skeletonStyle, height: '15px', width: '100%', marginBottom: '8px' }}></div>
                                            <div style={{ ...skeletonStyle, height: '12px', width: '40%' }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        );
    }


    // Map the top 3 topics with fallback titles to preserve UI structure when API is empty/broken
    const section1 = top3Topics[0] || { id: 'fb-1', name: "Hoạt động sản xuất kinh doanh" };
    const section1News = (section1 && section1.id !== 'fb-1') ? (sectionsData[section1.id] || []) : [];

    const section2 = top3Topics[1] || { id: 'fb-2', name: "Chuyển đổi số - Cải cách hành chính" };
    const section2News = (section2 && section2.id !== 'fb-2') ? (sectionsData[section2.id] || []) : [];

    const section3 = top3Topics[2] || { id: 'fb-3', name: "Kế hoạch - Thông báo" };
    const section3News = (section3 && section3.id !== 'fb-3') ? (sectionsData[section3.id] || []) : [];

    return (
        <div className="bp-container">
            <div className="bp-grid">
                {/* Left Column */}
                <div className="bp-left-col">

                    {/* Section 1 */}
                    <section className="bp-section">
                        <div className="bp-section-header">
                            <div className={"bp-header-icon " + renderSectionColor(0)}>
                                {renderSectionIcon(0)}
                            </div>
                            <h2
                                className={"bp-section-title " + renderSectionColor(0)}
                                onClick={onTopicClick(section1.id, section1.name || section1.title)}
                            >
                                {section1.name || section1.title}
                            </h2>
                        </div>

                        <div className="bp-feature-row">
                            {section1News.length > 0 ? (
                                <>
                                    <div className="bp-feature-card" onClick={onNewsClick(section1News[0].id)}>
                                        <div className="bp-feature-img-box">
                                            {(() => {
                                                const resImage = getResponsiveImage(section1News[0]);
                                                const imgUrl = resImage.src;
                                                const isPlaceholder = !imgUrl || imgUrl.includes('placeholder.com');
                                                return (
                                                    <AuthImage
                                                        src={isPlaceholder ? DEFAULT_NEWS_THUMBNAIL : imgUrl}
                                                        srcSet={isPlaceholder ? undefined : resImage.srcSet}
                                                        sizes={isPlaceholder ? undefined : resImage.sizes}
                                                        alt={section1News[0].title}
                                                    />
                                                );
                                            })()}
                                        </div>
                                        <div className="bp-feature-content">
                                            <div className="bp-text-dark">
                                                <h3 className="bp-feature-title bp-no-margin">
                                                    {section1News[0].isImportant && <span className="bp-tag-important">Quan trọng</span>}
                                                    {section1News[0].isNew && <span className="bp-new-tag">[Mới] </span>}
                                                    {section1News[0].title}
                                                </h3>
                                            </div>
                                            <div className="bp-feature-meta">
                                                <span className="bp-date">{formatDate(section1News[0])}</span>
                                                <div className="bp-stats">
                                                    <span><Eye size={14} /> {section1News[0].viewCount || 0}</span>
                                                    <span><Heart size={14} /> {section1News[0].likeCount || 0}</span>
                                                    <span><CustomCommentIcon size={14} /> {section1News[0].commentCount || 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bp-news-list">
                                        {section1News.slice(1, 4).map(item => (
                                            <div key={item.id} className="bp-news-item" onClick={onNewsClick(item.id)}>
                                                <div className="bp-news-dot"></div>
                                                <div className="bp-news-item-content">
                                                    <div className="bp-news-item-header">
                                                        <h4 className="bp-news-item-title bp-no-margin">
                                                            {item.isImportant && <span className="bp-tag-important">Quan trọng</span>}
                                                            {item.isNew && <span className="bp-new-tag">[Mới] </span>}
                                                            {item.title}
                                                        </h4>
                                                    </div>
                                                    <span className="bp-date">{formatDate(item)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="bp-no-data-wrapper">
                                    <EmptyState type="news" />
                                </div>
                            )}
                        </div>
                    </section>

                    {/* HRM Portal Banner replaced by Dynamic Banner */}
                    {homeBanner ? (
                        <div className="bp-dynamic-banner">
                            <a href={homeBanner.link} target="_blank" rel="noopener noreferrer">
                                <AuthImage
                                    src={homeBanner.image}
                                    alt="Home Banner"
                                    customClassName="bp-dynamic-banner-img"
                                />
                            </a>
                        </div>
                    ) : (
                        <div className="bp-hrm-banner">
                            <div className="bp-hrm-content">
                                <div className="bp-hrm-badge"><div className="bp-pulse"></div> LIVE</div>
                                <h2 className="bp-hrm-title">HRM Portal - Cổng thông tin nhân sự</h2>
                                <div className="bp-hrm-links">
                                    <span>Thông tin cá nhân</span>
                                    <span className="bp-dot">•</span>
                                    <span>Thông tin chấm công</span>
                                    <span className="bp-dot">•</span>
                                    <span>Tiền lương</span>
                                    <span className="bp-dot">•</span>
                                    <span>Quản lý phép</span>
                                </div>
                            </div>
                            <div className="bp-hrm-decoration">
                                <div className="bp-hrm-app-mockup">
                                    <span className="bp-monitor-icon"><Monitor size={48} /></span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Section 2 */}
                    <section className="bp-section">
                        <div className="bp-section-header">
                            <div className={"bp-header-icon " + renderSectionColor(1)}>
                                {renderSectionIcon(1)}
                            </div>
                            <h2
                                className={"bp-section-title " + renderSectionColor(1)}
                                onClick={onTopicClick(section2.id, section2.name || section2.title)}
                            >
                                {section2.name || section2.title}
                            </h2>
                        </div>

                        <div className="bp-feature-row">
                            {section2News.length > 0 ? (
                                <>
                                    <div className="bp-feature-card" onClick={onNewsClick(section2News[0].id)}>
                                        <div className="bp-feature-img-box">
                                            {(() => {
                                                const resImage = getResponsiveImage(section2News[0]);
                                                const imgUrl = resImage.src;
                                                const isPlaceholder = !imgUrl || imgUrl.includes('placeholder.com');
                                                return (
                                                    <AuthImage
                                                        src={isPlaceholder ? DEFAULT_NEWS_THUMBNAIL : imgUrl}
                                                        srcSet={isPlaceholder ? undefined : resImage.srcSet}
                                                        sizes={isPlaceholder ? undefined : resImage.sizes}
                                                        alt={section2News[0].title}
                                                    />
                                                );
                                            })()}
                                        </div>
                                        <div className="bp-feature-content">
                                            <div className="bp-text-dark">
                                                <h3 className="bp-feature-title bp-no-margin">
                                                    {section2News[0].isImportant && <span className="bp-tag-important">Quan trọng</span>}
                                                    {section2News[0].isNew && <span className="bp-new-tag">[Mới] </span>}
                                                    {section2News[0].title}
                                                </h3>
                                            </div>
                                            <div className="bp-feature-meta">
                                                <span className="bp-date">{formatDate(section2News[0])}</span>
                                                <div className="bp-stats">
                                                    <span><Eye size={14} /> {section2News[0].viewCount || 0}</span>
                                                    <span><Heart size={14} /> {section2News[0].likeCount || 0}</span>
                                                    <span><CustomCommentIcon size={14} /> {section2News[0].commentCount || 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bp-news-list">
                                        {section2News.slice(1, 4).map(item => (
                                            <div key={item.id} className="bp-news-item" onClick={onNewsClick(item.id)}>
                                                <div className="bp-news-dot"></div>
                                                <div className="bp-news-item-content">
                                                    <div className="bp-news-item-header">
                                                        <h4 className="bp-news-item-title bp-no-margin">
                                                            {item.isImportant && <span className="bp-tag-important">Quan trọng</span>}
                                                            {item.isNew && <span className="bp-new-tag">[Mới] </span>}
                                                            {item.title}
                                                        </h4>
                                                    </div>
                                                    <span className="bp-date">{formatDate(item)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="bp-no-data-wrapper">
                                    <EmptyState type="news" />
                                </div>
                            )}
                        </div>
                    </section>

                </div>

                {/* Right Column */}
                <div className="bp-right-col">

                    {/* Section 3 */}
                    <section className={"bp-section bp-section-3 " + (section3News.length > 0 ? "has-data" : "no-data")}>
                        <div className="bp-section-header">
                            <div className={"bp-header-icon " + renderSectionColor(2)}>
                                {renderSectionIcon(2)}
                            </div>
                            <h2
                                className={"bp-section-title " + renderSectionColor(2)}
                                onClick={onTopicClick(section3.id, section3.name || section3.title)}
                            >
                                {section3.name || section3.title}
                            </h2>
                        </div>

                        {/* Section 3 News Content or Empty State */}
                        {section3News.length > 0 ? (
                            <>
                                {/* Featured Announcement */}
                                <div className="bp-announcement-featured" onClick={onNewsClick(section3News[0].id)}>
                                    <div className="bp-featured-img-box">
                                        {(() => {
                                            const resImage = getResponsiveImage(section3News[0]);
                                            const imgUrl = resImage.src;
                                            const isPlaceholder = !imgUrl || imgUrl.includes('placeholder.com') || imgUrl === '/assets/imgBackground/IMG.png';
                                            return (
                                                <AuthImage
                                                    src={isPlaceholder ? DEFAULT_NEWS_THUMBNAIL : imgUrl}
                                                    srcSet={isPlaceholder ? undefined : resImage.srcSet}
                                                    sizes={isPlaceholder ? undefined : resImage.sizes}
                                                    alt={section3News[0].title}
                                                />
                                            );
                                        })()}
                                    </div>
                                    <div className="bp-featured-text">
                                        <div className="bp-text-dark">
                                            <p className="bp-no-margin">
                                                {section3News[0].isImportant && <span className="bp-tag-important">Quan trọng</span>}
                                                {section3News[0].isNew && <span className="bp-new-tag">[Mới] </span>}
                                                {section3News[0].title}
                                            </p>
                                        </div>
                                        <div className="bp-feature-meta mini bp-text-secondary">
                                            <span className="bp-date">{formatDate(section3News[0])}</span>
                                            <div className="bp-stats">
                                                <span><Eye size={12} /> {section3News[0].viewCount || 0}</span>
                                                <span><Heart size={12} /> {section3News[0].likeCount || 0}</span>
                                                <span><CustomCommentIcon size={12} /> {section3News[0].commentCount || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* List of remaining items in section 3 */}
                                {section3News.length > 1 && (
                                    <div className="bp-announcement-list">
                                        {section3News.slice(1, 4).map(item => (
                                            <div key={item.id} className="bp-ann-item" onClick={onNewsClick(item.id)}>
                                                <div className="bp-news-dot"></div>
                                                <div className="bp-ann-item-content">
                                                    <div className="bp-ann-header">
                                                        <h4 className="bp-ann-title">
                                                            {item.isImportant && <span className="bp-tag-important">Quan trọng</span>}
                                                            {item.isNew && <span className="bp-new-tag">[Mới] </span>}
                                                            {item.title}
                                                        </h4>
                                                    </div>
                                                    <span className="bp-date">{formatDate(item)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="bp-no-data-wrapper right-align">
                                <EmptyState type="news" />
                            </div>
                        )}
                    </section>

                    {/* Video Section at bottom - Only show if featuredVideo exists */}
                    {featuredVideos.length > 0 && featuredVideo ? (
                        <>
                            <div className={"bp-video-card has-data " + (section3News.length > 0 ? "s3-has-data" : "s3-no-data")}>
                                {videoConfig ? (
                                    <div className="bp-video-container">
                                        {videoConfig.type === 'iframe' ? (
                                            <iframe
                                                key={finalVideoUrl}
                                                src={videoConfig.url}
                                                title="Video Player"
                                                frameBorder="0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            ></iframe>
                                        ) : (
                                            <AuthVideo key={finalVideoUrl} controls poster={finalVideoThumb} src={videoConfig.url} customStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}>
                                                
                                                Trình duyệt của bạn không hỗ trợ xem video này.
                                            </AuthVideo>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bp-video-thumb" onClick={onNewsClick(featuredVideo.id)}>
                                        <AuthImage src={finalVideoThumb} alt="Video" />
                                        <div className="bp-video-overlay">
                                            <span className="bp-play-icon"><PlayCircle size={40} /></span>
                                        </div>
                                    </div>
                                )}
                                <div className="bp-video-info">
                                    <h4 className="bp-video-title">{finalVideoTitle}</h4>
                                    <div className="bp-video-actions">
                                        <button onClick={onNewsClick(featuredVideo.id)}><ChevronRight size={16} /></button>
                                    </div>
                                </div>
                            </div>
                            {featuredVideos.length > 1 && (
                                <div className="bp-slider-dots" style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '12px 0'}}>
                                    {featuredVideos.map((_, idx) => (
                                        <div
                                            key={idx}
                                            onClick={onDotClick(idx)}
                                            style={{
                                                width: currentVideoIndex === idx ? '24px' : '8px',
                                                height: '8px',
                                                borderRadius: '4px',
                                                backgroundColor: currentVideoIndex === idx ? '#068BEB' : '#ccc',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease'
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className={"bp-video-card-empty no-data " + (section3News.length > 0 ? "s3-has-data" : "s3-no-data")}>
                            <EmptyState type="video" />
                        </div>
                    )}

                </div>
            </div>

            <style>{`
        .skeleton {
          background: #e2e8f0;
          background-image: linear-gradient(
            90deg,
            #e2e8f0 0px,
            #f1f5f9 50%,
            #e2e8f0 100%
          );
          background-size: 200% 100%;
          animation: shimmer 2s infinite linear;
          border-radius: 4px;
        }

        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        .bp-new-tag {
          color: #f59e0b;
          font-weight: 700;
          margin-right: 6px;
        }

        .bp-flex-start-gap {
          display: flex;
          gap: 8px;
          align-items: flex-start;
          margin-bottom: 8px;
        }

        .bp-flex-start-gap-sm {
          display: flex;
          gap: 8px;
          align-items: flex-start;
          margin-bottom: 4px;
        }

        .bp-no-margin {
          margin: 0;
        }

        .bp-text-dark {
          color: #4E4E4E;
        }

        .bp-text-secondary {
          color: #616161;
        }

        .bp-dynamic-banner {
          margin-bottom: 48px;
        }

        .bp-dynamic-banner-img {
          width: 100%;
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          display: block;
        }

        .bp-monitor-icon {
          color: white;
          opacity: 0.2;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .bp-play-icon {
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .bp-section-title {
          cursor: pointer;
        }
        .bp-container {
          max-width: 1550px;
          margin: 0;
          padding: 20px 20px 0;
          background-color: transparent;
          font-family: 'Be Vietnam Pro', -apple-system, sans-serif;
        }

        .bp-grid {
          display: grid;
          grid-template-columns: 1.63fr 0.98fr;
          gap: 25px;
          min-height: 100%;
        }

        .bp-left-col {
          display: flex;
          flex-direction: column;
          width: 100%;
        }

        .bp-right-col {
          display: flex;
          flex-direction: column;
        }

        .bp-section {
          margin-bottom: 10px;
        }

        .bp-section-3.has-data {
        }

        .bp-section-3.no-data {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .bp-section-3.no-data .bp-no-data-wrapper {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 !important;
        }

        .bp-section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          padding-top: 40px;
        }

        .bp-header-icon {
          width: 35px;
          height: 35px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .bp-header-icon.blue { color: #3b82f6 }
        .bp-header-icon.cyan { color: #06b6d4 }
        .bp-header-icon.purple { color: #8b5cf6}

        .bp-section-title {
            font-size: 26px !important;
            font-weight: 500 !important;
            background: linear-gradient(90deg, #20AAEC 0%, #5567CC 100%) !important;
            -webkit-background-clip: text !important;
            -webkit-text-fill-color: transparent !important;
            background-clip: text !important;
            color: #3b82f6 !important;
            margin: 0 !important;
            letter-spacing: -0.5px !important;
            position: relative;
            cursor: pointer;
            width: fit-content;
            text-decoration: none;
        }

        .bp-section-title:hover {
            text-decoration: underline;
            text-decoration-color: #3b82f6;
            text-decoration-skip-ink: auto;
            text-underline-offset: 3.5px;
            text-decoration-thickness: 1px;
        }
        .bp-section-title.blue { color: #3b82f6; }
        .bp-section-title.cyan { color: #0891b2; }
        .bp-section-title.purple { color: #7c3aed; }

        .bp-feature-row {
          display: grid;
          grid-template-columns: 0.5fr 1fr;
          gap: 24px;
        }

        .bp-feature-card {
           background: transparent;
           cursor: pointer;
           transition: all 0.2s ease;
        }

        .bp-feature-card:hover .bp-feature-title {
          color: #3b82f6;
        }

        .bp-feature-img-box {
          width: 100%;
          aspect-ratio: 16/10;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 16px;
          box-shadow: 0 10px 20px rgba(0,0,0,0.05);
        }

        .bp-feature-img-box img {
          width: 100%; height: 100%; object-fit: cover;
          transition: transform 0.3s ease;
        }

        .bp-feature-img-box:hover img { transform: scale(1.05); }

        .bp-feature-title {
          font-size: 20px;
          font-weight: 600;
          color: #334155;
          line-height: 1.5;
          margin-bottom: 12px;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 72px;
        }

        .bp-feature-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #616161;
          font-size: 13px;
        }

        .bp-stats {
          display: flex;
          gap: 16px;
        }

        .bp-stats span {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .bp-news-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .bp-news-item {
          display: flex;
          gap: 12px;
          padding-bottom: 16px;
          border-bottom: 1px solid #e2e8f0;
          cursor: pointer;
        }
        
        .bp-news-item:last-child { border-bottom: none; }

        .bp-news-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #cbd5e1;
          margin-top: 8px;
          flex-shrink: 0;
          transition: background 0.2s ease;
        }

        .bp-news-item:hover .bp-news-dot {
          background: #3b82f6;
        }

        .bp-news-item-title {
          font-size: 18px;
          font-weight: 500;
          color: #475569;
          line-height: 1.4;
          margin-bottom: 4px;
          transition: color 0.2s;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .bp-news-item:hover .bp-news-item-title { color: #3b82f6; }

        .bp-date { font-size: 14px; color: #94a3b8; }

        .bp-hrm-banner {
          background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%);
          border-radius: 20px;
          padding: 32px;
          margin-bottom: 48px;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(59, 130, 246, 0.2);
        }

        .bp-hrm-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.2);
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 16px;
          letter-spacing: 1px;
        }

        .bp-pulse {
          width: 8px; height: 8px; border-radius: 50%; background: #ef4444;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }

        .bp-hrm-title {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .bp-hrm-links {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          opacity: 0.9;
          flex-wrap: wrap;
        }

        .bp-hrm-app-mockup {
          width: 80px;
          height: 80px;
          background: rgba(255,255,255,0.1);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(4px);
          border: 1px solid rgba(255,255,255,0.2);
        }

        .bp-announcement-featured {
          background: transparent;
          border-radius: 0;
          overflow: visible;
          padding-bottom: 24px;
        //   border-bottom: 1px solid #e2e8f0;
          margin-bottom: 24px;
          cursor: pointer;
        }

        .bp-announcement-featured .bp-featured-img-box {
          height: 194px;
          background: #f1f5f9;
          overflow: hidden;
          border-radius: 16px;
          margin-bottom: 16px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.08);
        }

        .bp-announcement-featured .bp-featured-img-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .bp-announcement-featured:hover .bp-featured-img-box img {
          transform: scale(1.05);
        }

        .bp-announcement-featured:hover p {
          color: #3b82f6;
          transition: color 0.2s ease;
        }

        .bp-featured-text {
          padding: 0;
          color: #334155;
          background-color: transparent;
        }

        .bp-featured-text p {
          font-size: 16px;
          font-weight: 500;
          line-height: 1.5;
          margin-bottom: 16px;
          opacity: 0.95;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .bp-feature-meta.mini {
          justify-content: space-between;
        //   border-top: 1px solid #e2e8f0;
          padding-top: 12px;
          color: #64748b;
        }

        .bp-announcement-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .bp-ann-item {
          display: flex;
          gap: 12px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .bp-ann-item:hover .bp-ann-title {
          color: #3b82f6;
        }

        .bp-ann-item:hover .bp-news-dot {
          background: #3b82f6;
        }

        .bp-ann-item-content {
          flex: 1;
        }

        .bp-ann-header {
           display: flex;
           gap: 8px;
           margin-bottom: 4px;
           align-items: flex-start;
        }

        .bp-ann-title {
          font-size: 18px;
          font-weight: 500;
          color: #475569;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .bp-tag-important {
          background: #ffab40;
          color: #ffffff;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 10px;
          border-radius: 20px;
          flex-shrink: 0;
          margin-right: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: fit-content;
          vertical-align: middle;
        }

        .bp-video-card {
           margin-top: auto !important;
           background: #fff;
           border-radius: 16px;
           overflow: hidden;
           box-shadow: 0 10px 25px rgba(0,0,0,0.08);
           border: 1px solid #e2e8f0;
           transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .bp-video-card.has-data.s3-has-data {
        }

        .bp-video-card.has-data.s3-no-data {
        }

        .bp-video-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 15px 35px rgba(0,0,0,0.12);
        }

        .bp-video-container {
          position: relative;
          width: 100%;
          aspect-ratio: 20/10;
          background: #000;
        }

        .bp-video-container iframe,
        .bp-video-container video {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
          object-fit: cover;
        }

        .bp-video-thumb {
          position: relative;
          width: 100%;
          height: 160px;
        }

        .bp-video-thumb img {
          width: 100%; height: 100%; object-fit: cover;
        }

        .bp-video-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.3s;
        }

        .bp-video-info {
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          display: none;
        }

        .bp-video-title {
          font-size: 14px;
          font-weight: 600;
          color: #334155;
        }

        .bp-video-actions button {
          border: none;
          background: #f1f5f9;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
        }

        @media (max-width: 1024px) {
          .bp-grid { grid-template-columns: 1fr; }
          .bp-feature-row { grid-template-columns: 1fr; }
          .bp-hrm-banner { flex-direction: column; text-align: center; gap: 24px; }
          .bp-hrm-links { justify-content: center; }

          .bp-section-3.has-data,
          .bp-section-3.no-data,
          .bp-video-card.has-data.s3-has-data,
          .bp-video-card.has-data.s3-no-data,
          .bp-video-card-empty.no-data.s3-has-data,
          .bp-video-card-empty.no-data.s3-no-data {
            margin-left: 0 !important;
          }
        }

        /* Empty State Styles */
        .bp-no-data-wrapper {
          grid-column: 1 / -1;
          width: 100%;
          display: flex;
          justify-content: center;
          padding: 24px 0;
          min-height: 332px; /* Đồng bộ chiều cao với khi có dữ liệu tin tức */
        }

        .bp-no-data-wrapper.right-align {
          padding: 24px 0;
        }

        .bp-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 20px;
          animation: fadeIn 0.5s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .bp-empty-icon-circle {
          width: 80px;
          height: 80px;
          background: rgba(59, 130, 246, 0.04);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
          position: relative;
        }

        .bp-empty-icon-circle::after {
          content: '';
          position: absolute;
          width: 80px;
          height: 80px;
          background: rgba(59, 130, 246, 0.06);
          border-radius: 50%;
          z-index: 0;
        }

        .bp-empty-icon-circle svg {
          position: relative;
          z-index: 1;
        }

        .bp-empty-title {
          font-size: 16px;
          font-weight: 600;
          color: #334155;
          margin: 0 0 8px 0;
          font-family: inherit;
        }

        .bp-empty-subtitle {
          font-size: 13px;
          color: #94a3b8;
          max-width: 300px;
          line-height: 1.5;
          margin: 0;
        }

        .bp-video-card-empty {
          margin-top: auto !important;
          background: #f8fafc;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          padding: 40px 20px;
          display: flex;
          justify-content: center;
          align-items: center;
          transition: all 0.3s ease;
        }

        .bp-video-card-empty.no-data.s3-has-data {
        }

        .bp-video-card-empty.no-data.s3-no-data {
        }

        .bp-video-card-empty:hover {
          border-color: #bad9ff;
          background: #ebf5ff;
        }

        .video .bp-empty-icon-circle {
          width: 100px;
          height: 100px;
          background: rgba(59, 130, 246, 0.05);
        }
      `}</style>
        </div>
    );
}
