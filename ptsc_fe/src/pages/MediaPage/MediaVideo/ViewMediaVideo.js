import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Grid,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  CircularProgress,
  styled,
} from "@mui/material";
import ThumbUpAltIcon from "@mui/icons-material/ThumbUpAlt";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ShareIcon from "@mui/icons-material/Share";
import { Controller, useForm } from "react-hook-form";
import withSharedComponents from "@components/WrapperComponent";
import {
  // FeaturedImageContainer,
  FormContainer,
  MainCard,
  FieldLabel,
  PreviewImageBox,
  SectionTitle,
  // UploadTextSmall,
  // StyledGridContainer,
  // StyledGridItem,
} from "@styles/MediaPageStyle/MediaImage.styles";
import api from "@services/api";
import { API_MEDIA_VIDEO, API_VIEW_FILE } from "@EnvironmentFile/constants/urlConfig";
import AuthImage from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimImage';
import CustomSwipper from "@components/Swipper/BaseSwiper";

const StyledVideo = styled("video")({
  width: "100%",
  height: "100%",
  objectFit: "contain",
  backgroundColor: "#000",
  borderRadius: "8px",
});

const VideoPlayerBox = styled(Box)({
  position: "relative",
  height: "260px",
  backgroundColor: "#000",
  borderRadius: "8px",
  overflow: "hidden",
});

const VideoInfoSectionTitle = styled(SectionTitle)({
  marginTop: 0,
});

// const MediaSectionContainer = styled(FeaturedImageContainer)({
//   height: "auto",
// });

// const VideoUploadContainer = styled(FeaturedImageContainer)({
//   marginTop: "16px",
//   height: "auto",
// });

const FullHeightFormContainer = styled(FormContainer)({
  minHeight: "auto",
});

// const FullHeightMainCard = styled(MainCard)({
//   minHeight: "calc(100vh - 164px)",
//   display: "flex",
//   flexDirection: "column",
// });

const MainCardFullHeight = styled(MainCard)({
  height: "100%",
});

const SectionDescription = styled(Typography)(({ theme }) => ({
  fontSize: "13px",
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(3),
}));

const FieldLabelFlex = styled(FieldLabel)({
  display: "flex",
  alignItems: "center",
  marginBottom: "8px",
});

const LargePreviewImageBox = styled(PreviewImageBox)({
  maxHeight: "280px",
  border: "none",
  width: "auto",
  margin: "0 auto",
});

const LargeVideoPlayerBox = styled(VideoPlayerBox)({
  height: "280px",
});

const MediaDisplayBox = styled(Box)(({ theme }) => ({
  height: "280px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: theme.palette.mode === 'dark' ? '#334155' : '#FAFAFA',
  borderRadius: '8px',
  border: `1px solid ${theme.palette.divider}`
}));

const EmptyText = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.disabled,
}));

const InteractionContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(3),
  marginTop: theme.spacing(2),
}));

const InteractionItem = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(0.5),
  color: theme.palette.text.secondary,
  "& svg": {
    fontSize: "20px",
  },
}));

const StyledStatNumber = styled(Typography)(({ theme }) => ({
  fontSize: "14px",
  fontWeight: 500,
  color: theme.palette.text.secondary,
}));

const LoadingBox = styled(Box)({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "40px",
});

const ViewMediaVideo = ({ open, onClose, data, sharedComponents, mediaId }) => {
  const { toast, InputComponents } = sharedComponents;

  const [isReady, setIsReady] = useState(false);
  const [displayData, setDisplayData] = useState(data);
  const [isLoading, setIsLoading] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  const { control, reset } = useForm({
    defaultValues: {
      title: "",
      description: "",
      topic: "",
      videoType: "Video thường"
    }
  });

  useEffect(() => {
    if (open) {
      if (data?.id || data?._id) {
        setCurrentId(data.id || data._id);
      } else if (mediaId) {
        setCurrentId(mediaId);
      }
    }
  }, [open, data, mediaId]);

  const fetchVideoDetail = useCallback(async () => {
    if (!currentId) return;
    try {
      setIsLoading(true);
      const response = await api.get(`${API_MEDIA_VIDEO}/${currentId}`);
      const detail = response.data?.data || response.data || response;
      setDisplayData(detail);
      reset({
        title: detail?.title || "",
        description: detail?.description || "",
        topic: detail?.topic?.name || detail?.topicName || detail?.topic || "",
        videoType: (detail?.videoType === "Nổi bật" || detail?.videoType === "featured" || detail?.videoType === "Hiển thị lên trang chủ") ? "Hiển thị lên trang chủ" : "Video thường",
      });
    } catch (error) {
      toast("Không thể tải thông tin chi tiết video", "error");
    } finally {
      setIsLoading(false);
    }
  }, [currentId, toast, reset]);

  useEffect(() => {
    if (open && currentId) {
      fetchVideoDetail();
    }
  }, [open, currentId, fetchVideoDetail]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setIsReady(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsReady(false);
    }
  }, [open]);

  const videoUrl = useMemo(() => {
    if (displayData?.videoFileId) {
      return `${API_VIEW_FILE}/${displayData.videoFileId}`;
    }
    return displayData?.videoUrl || null;
  }, [displayData]);

  const renderTitleField = useCallback(
    ({ field }) => (
      <InputComponents
        label="Tiêu đề"
        placeholder="Tiêu đề"
        disabled
        {...field}
      />
    ),
    []
  );

  const renderDescriptionField = useCallback(
    ({ field }) => (
      <InputComponents
        label="Mô tả"
        placeholder="Mô tả"
        disabled
        multiline
        rows={3}
        {...field}
      />
    ),
    []
  );

  return (
    <CustomSwipper
      key={open ? "view-video-open" : "view-video-closed"}
      open={open && isReady}
      onClose={onClose}
      title="Chi tiết video"
      type="view"
      screenType="album"
      hideBackdrop
      disabled={isLoading}
    >
      {isLoading ? (
        <LoadingBox>
          <CircularProgress />
        </LoadingBox>
      ) : (
        <FullHeightFormContainer>
          <Grid container spacing={3}>
            {/* TOP ROW */}
            <Grid item xs={12} md={7}>
              <MainCard>
                <VideoInfoSectionTitle>Thông tin video</VideoInfoSectionTitle>
                <SectionDescription>
                  Chi tiết thông tin liên quan đến video này.
                </SectionDescription>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Controller
                      name="title"
                      control={control}
                      render={renderTitleField}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Controller
                      name="description"
                      control={control}
                      render={renderDescriptionField}
                    />
                  </Grid>
                  <Grid item xs={12} container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <FormControl component="fieldset">
                        <RadioGroup 
                          value={(displayData?.videoType === "Nổi bật" || displayData?.videoType === "featured" || displayData?.videoType === "Hiển thị lên trang chủ") ? "Hiển thị lên trang chủ" : "Video thường"} 
                          row
                        >
                          <FormControlLabel
                            value="Video thường"
                            control={<Radio disabled />}
                            label="Video thường"
                          />
                          <FormControlLabel
                            value="Hiển thị lên trang chủ"
                            control={<Radio disabled />}
                            label="Hiển thị trên trang chủ"
                          />
                        </RadioGroup>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <FieldLabelFlex>Tương tác</FieldLabelFlex>
                      <InteractionContainer>
                        <InteractionItem>
                          <ThumbUpAltIcon />
                          <StyledStatNumber>{displayData?.likeCount || 0}</StyledStatNumber>
                        </InteractionItem>
                        <InteractionItem>
                          <VisibilityIcon />
                          <StyledStatNumber>{displayData?.viewCount || 0}</StyledStatNumber>
                        </InteractionItem>
                        <InteractionItem>
                          <ShareIcon />
                          <StyledStatNumber>{displayData?.shareCount || 0}</StyledStatNumber>
                        </InteractionItem>
                      </InteractionContainer>
                    </Grid>
                  </Grid>
                </Grid>
              </MainCard>
            </Grid>

            <Grid item xs={12} md={5}>
              <MainCardFullHeight>
                <FieldLabel>Hình ảnh đại diện</FieldLabel>
                <SectionDescription>
                  Hình ảnh hiển thị của video
                </SectionDescription>
                <MediaDisplayBox>
                  {displayData?.thumbnailFileId || displayData?.thumbnail ? (
                    <LargePreviewImageBox
                      component={AuthImage}
                      src={displayData.thumbnailFileId ? `${API_VIEW_FILE}/${displayData.thumbnailFileId}` : displayData.thumbnail}
                      alt="Thumbnail"
                    />
                  ) : (
                    <EmptyText>Không có ảnh đại diện</EmptyText>
                  )}
                </MediaDisplayBox>
              </MainCardFullHeight>
            </Grid>

            {/* BOTTOM ROW */}
            <Grid item xs={12}>
              <MainCard>
                <FormControl component="fieldset">
                  <RadioGroup 
                    value={displayData?.videoLink ? "link" : "upload"} 
                    row
                  >
                    <FormControlLabel
                      value="upload"
                      control={<Radio disabled />}
                      label="Upload video"
                    />
                    <FormControlLabel
                      value="link"
                      control={<Radio disabled />}
                      label="Gán link video"
                    />
                  </RadioGroup>
                </FormControl>

                {displayData?.videoLink ? (
                  <>
                    <FieldLabelFlex>Video tải lên</FieldLabelFlex>
                    <SectionDescription>
                      Bạn có thể tải lên tối đa 1 video
                    </SectionDescription>
                    <InputComponents
                      label="Link video"
                      value={displayData.videoLink}
                      disabled
                    />
                  </>
                ) : (
                  <>
                    <FieldLabelFlex>Video</FieldLabelFlex>
                    <SectionDescription>
                      Nội dung video đã tải lên
                    </SectionDescription>
                    {videoUrl ? (
                      <LargeVideoPlayerBox>
                        <StyledVideo src={videoUrl} controls />
                      </LargeVideoPlayerBox>
                    ) : (
                      <MediaDisplayBox>
                        <EmptyText>Không có dữ liệu video</EmptyText>
                      </MediaDisplayBox>
                    )}
                  </>
                )}
              </MainCard>
            </Grid>
          </Grid>
        </FullHeightFormContainer>
      )}
    </CustomSwipper>
  );
};

export default withSharedComponents(ViewMediaVideo);
