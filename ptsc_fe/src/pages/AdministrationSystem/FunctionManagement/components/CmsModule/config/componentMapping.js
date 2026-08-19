import NewsDetailView from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/NewsDetailView";
import { DefaultPreHeader } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/preheaders/DefaultPreHeader";
import { TopNewsTabs } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/TopNewsTabs";
import { HeroSlider } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/HeroSlider";
import NewsGridView from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/NewsGridView";
import SearchResultsPage from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/SearchResultsPage";
import PreHeaderBar from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/PreHeaderBar";
import DefaultFooter from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/footer/DefaultFooter";
import BusinessPortal from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/BusinessPortal";
import TopicNewsGrid from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/TopicNewsGrid";
import EventsAndTagsSidebar from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/EventsAndTagsSidebar";
import EventCalendarPage from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/EventCalendarPage";
import ResourceGridView from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/ResourceGridView";

export const COMPONENT_MAP = {
  newsDetail: {
    label: "Chi tiết Tin tức",
    component: NewsDetailView
  },
  topNews: {
    label: "Tin tức Nổi bật (Tabs)",
    component: TopNewsTabs
  },
  heroSlider: {
    label: "Trình chiếu Chính",
    component: HeroSlider
  },
  newsGridView: {
    label: "Tin tức dạng Lưới",
    component: NewsGridView
  },
  searchResults: {
    label: "Kết quả Tìm kiếm",
    component: SearchResultsPage
  },
  PreHeaderBar: {
    label: "Thanh Tiêu đề trên",
    component: PreHeaderBar
  },
  SubHeaderBar: {
    label: "Chủ đề Trang",
    component: BusinessPortal
  },
  topicNewsGrid: {
    label: "Tin tức theo chủ đề",
    component: TopicNewsGrid
  },
  topicNewsList: {
    label: "Sự kiện + Tag nổi bật",
    component: EventsAndTagsSidebar
  },
  eventCalendar: {
    label: "Lịch sự kiện",
    component: EventCalendarPage
  },
  resourceGridView: {
    label: "Thư viện truyền thông",
    component: ResourceGridView
  }
};

export const PREHEADER_MAP = {
  default: {
    label: "Thanh trên Mặc định",
    component: DefaultPreHeader
  }
};

export const SUBHEADER_MAP = {
  default: {
    label: "Thanh phụ Mặc định",
    component: PreHeaderBar
  }
};

export const FOOTER_MAP = {
  default: {
    label: "Chân trang Mặc định",
    component: DefaultFooter
  }
};