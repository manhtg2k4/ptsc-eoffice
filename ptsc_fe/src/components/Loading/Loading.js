import React from "react";
import { keyframes } from "@mui/material";
import PropTypes from "prop-types";
import {
  LoadingContainer,
  Overlay,
  DotsContainer,
  Dot,
} from "@styles/Loading.styles";

// Định nghĩa animation xoay tròn
const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const Loading = () => {
  // 🚀 Đọc logo từ localStorage
  let logoSrc = "";
  try {
    const themeOptionsStr = localStorage.getItem('themeOptions');
    if (themeOptionsStr) {
      const themeOptions = JSON.parse(themeOptionsStr);
      if (themeOptions?.app?.logoImage) {
        logoSrc = themeOptions.app.logoImage; // Sử dụng logo từ cấu hình nếu có
      }
    }
  } catch (error) {
    logger.error("Could not parse theme options from localStorage for loading screen.", error);
  }

  return (
    <Overlay>
      <LoadingContainer>
        {logoSrc ? (
          <img
            src={logoSrc} // Sử dụng logo động
            alt="Loading Logo"
            style={{
              width: 60, // Điều chỉnh kích thước logo nếu cần
              height: 60,
              animation: `${spin} 1.5s linear infinite`, // Áp dụng animation xoay
            }}
          />
        ) : null}
        {/* 🚀 Hiển thị hiệu ứng ba chấm */}
        <DotsContainer>
          <Dot delay="0s" />
          <Dot delay="0.2s" />
          <Dot delay="0.4s" />
        </DotsContainer>
      </LoadingContainer>
    </Overlay>
  );
};

Loading.propTypes = {
  text: PropTypes.string, // Văn bản hiển thị dưới loading spinner
};

// Giá trị mặc định nếu không truyền prop
Loading.defaultProps = {
  text: "Đang tải...", // Mặc định là "Đang tải..."
};

export default Loading;
