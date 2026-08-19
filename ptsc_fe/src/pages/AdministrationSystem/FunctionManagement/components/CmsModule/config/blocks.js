import { COMPONENT_MAP } from "./componentMapping";
import { TwoColumn } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/TwoColumn";
import { Feature } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/Feature";
import { CustomWrapper } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/CustomWrapper";

export const BLOCKS = {
  // Map from Registry
  // banner: {
  //   ...COMPONENT_MAP.banner,
  //   schema: { title: "Tiêu đề", width: "Chiều rộng (%)", height: "Chiều cao (px)" }
  // },
  // text: {
  //   ...COMPONENT_MAP.text,
  //   schema: { text: "Nội dung", width: "Chiều rộng (%)", height: "Chiều cao (px)" }
  // },
  // image: {
  //   ...COMPONENT_MAP.image,
  //   schema: { src: "Đường dẫn ảnh", width: "Chiều rộng (%)", height: "Chiều cao (px)" }
  // },
  // news: {
  //   ...COMPONENT_MAP.news,
  //   schema: { title: "Tiêu đề", content: "Nội dung", width: "Chiều rộng (%)", height: "Chiều cao (px)" }
  // },
  newsDetail: {
    ...COMPONENT_MAP.newsDetail,
    schema: { title: "Tiêu đề", content: "Nội dung", width: "Chiều rộng (%)", height: "Chiều cao (px)", heightTablet: "Chiều cao Tablet (px)", backgroundColor: "Màu nền", marginBottom: "Khoảng cách dưới (px)" }
  },

  // Layout / Wrapper Blocks
  twoColumn: {
    label: "Bố cục: 2 Cột",
    component: TwoColumn,
    schema: {
      split: {
        type: "range",
        label: "Chiều rộng cột trái",
        min: 20,
        max: 80,
        defaultValue: 50
      },
      leftComponent: {
        type: "select",
        label: "Thành phần bên trái",
        options: Object.keys(COMPONENT_MAP).map(key => ({
          label: COMPONENT_MAP[key].label,
          value: key
        }))
      },
      rightComponent: {
        type: "select",
        label: "Thành phần bên phải",
        options: Object.keys(COMPONENT_MAP).map(key => ({
          label: COMPONENT_MAP[key].label,
          value: key
        }))
      },
      width: "Chiều rộng (%)",
      height: "Chiều cao (px)",
      heightTablet: "Chiều cao Tablet (px)",
      backgroundColor: "Màu nền",
      marginBottom: "Khoảng cách dưới (px)",
      scrollSpeed: {
        type: "select",
        label: "Tốc độ cuộn tin",
        options: [
          { label: "Rất chậm", value: "0.15" },
          { label: "Chậm", value: "0.25" },
          { label: "Bình thường (Mặc định)", value: "0.35" },
          { label: "Nhanh", value: "0.6" },
          { label: "Rất nhanh", value: "1.0" }
        ]
      }
    }
  },
  feature: {
    label: "Thành phần: Đặc sắc",
    component: Feature,
    schema: {
      title: "Tiêu đề",
      desc: "Mô tả",
      childComponent: {
        type: "select",
        label: "Tiện ích nhúng",
        options: Object.keys(COMPONENT_MAP).map(key => ({
          label: COMPONENT_MAP[key].label,
          value: key
        }))
      },
      width: "Chiều rộng (%)",
      height: "Chiều cao (px)",
      heightTablet: "Chiều cao Tablet (px)",
      backgroundColor: "Màu nền",
      marginBottom: "Khoảng cách dưới (px)",
      scrollSpeed: {
        type: "select",
        label: "Tốc độ cuộn tin",
        options: [
          { label: "Rất chậm", value: "0.15" },
          { label: "Chậm", value: "0.25" },
          { label: "Bình thường (Mặc định)", value: "0.35" },
          { label: "Nhanh", value: "0.6" },
          { label: "Rất nhanh", value: "1.0" }
        ]
      }
    }
  },
  customBlock: {
    label: "Khối tùy chỉnh",
    component: CustomWrapper,
    schema: {
      componentType: {
        type: "select",
        label: "Chọn thành phần",
        options: Object.keys(COMPONENT_MAP).map(key => ({
          label: COMPONENT_MAP[key].label,
          value: key
        }))
      },
      width: "Chiều rộng (%)",
      height: "Chiều cao (px)",
      heightTablet: "Chiều cao Tablet (px)",
      backgroundColor: "Màu nền",
      marginBottom: "Khoảng cách dưới (px)",
      scrollSpeed: {
        type: "select",
        label: "Tốc độ cuộn tin",
        options: [
          { label: "Rất chậm", value: "0.15" },
          { label: "Chậm", value: "0.25" },
          { label: "Bình thường (Mặc định)", value: "0.35" },
          { label: "Nhanh", value: "0.6" },
          { label: "Rất nhanh", value: "1.0" }
        ]
      }
    }
  }
};

export const EMBEDDABLE_COMPONENTS = Object.keys(COMPONENT_MAP);
