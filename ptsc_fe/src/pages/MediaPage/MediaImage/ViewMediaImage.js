import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Grid,
  Typography,
  CircularProgress,
  styled,
} from "@mui/material";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import { Controller, useForm } from "react-hook-form";
import withSharedComponents from "@components/WrapperComponent";
import {
  // FeaturedImageContainer,
  FormContainer,
  MainCard,
  // FieldLabel,
  PreviewImageBox,
  AlbumImagesGrid,
  AlbumImageItem,
  SectionTitle,
  MetricsContainer,
  MetricItem,
  MetricText,
  EmptyText,
  LoadingBox,
  // StyledGridContainer,
  // StyledGridItem,
  // UploadTextSmall,
} from "@styles/MediaPageStyle/MediaImage.styles";

const FullHeightFormContainer = styled(FormContainer)({
  minHeight: "auto",
});

const FullHeightMainCard = styled(MainCard)({
  height: "100%",
  display: "flex",
  flexDirection: "column",
});

const InfoSectionTitle = styled(SectionTitle)(({ theme }) => ({
  marginTop: 0,
  fontSize: "18px",
  color: "#3366FF",
  marginBottom: theme.spacing(0.5),
}));

const SectionSubtitle = styled(Typography)(({ theme }) => ({
  fontSize: "13px",
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(3),
}));

const CardTitle = styled(Typography)(({ theme }) => ({
  fontSize: "18px",
  fontWeight: 600,
  color: "#3366FF",
  marginBottom: theme.spacing(0.5),
}));

const CompactSectionSubtitle = styled(SectionSubtitle)({
  marginBottom: 0,
});

const AlbumHeaderBox = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: theme.spacing(3),
}));

const LargePreviewImageBox = styled(PreviewImageBox)({
  maxHeight: "280px",
  width: "auto",
  margin: "0 auto",
  border: "none",
});

const MediaDisplayBox = styled(Box)(({ theme }) => ({
  height: "300px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: theme.palette.mode === 'dark' ? '#334155' : '#FAFAFA',
  borderRadius: '8px',
  border: `1px solid ${theme.palette.divider}`
}));

const ViewEmptyText = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.disabled,
}));

import api from "@services/api";
import { API_MEDIA_ALBUMS, API_VIEW_FILE } from "@EnvironmentFile/constants/urlConfig";
import AuthImage from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimImage';
import CustomSwipper from "@components/Swipper/BaseSwiper";

const ViewMediaImage = ({ open, onClose, data, sharedComponents, mediaId }) => {
  const {toast, InputComponents } = sharedComponents;

  const [isReady, setIsReady] = useState(false);
  const [displayData, setDisplayData] = useState(data);
  const [isLoading, setIsLoading] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  const { control, reset } = useForm({
    defaultValues: {
      title: "",
      description: "",
      topic: "",
      albumType: "normal"
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

  const fetchAlbumDetail = useCallback(async () => {
    if (!currentId) return;
    try {
      setIsLoading(true);
      const response = await api.get(`${API_MEDIA_ALBUMS}/${currentId}`);
      const detail = response.data?.data || response.data || response;
      setDisplayData(detail);
      reset({
        title: detail?.title || "",
        description: detail?.description || "",
        topic: detail?.topic?.name || detail?.topicName || detail?.topic || "",
        albumType: (detail?.albumType === "Nổi bật" || detail?.albumType === "featured") ? "featured" : "normal",
      });
    } catch (error) {
      toast("Không thể tải thông tin chi tiết album", "error");
    } finally {
      setIsLoading(false);
    }
  }, [currentId, toast, reset]);

  useEffect(() => {
    if (open && currentId) {
      fetchAlbumDetail();
    }
  }, [open, currentId, fetchAlbumDetail]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setIsReady(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsReady(false);
    }
  }, [open]);

  const albumImages = useMemo(() => {
    if (Array.isArray(displayData?.images)) {
      return displayData.images.map(img => img.file_id ? `${API_VIEW_FILE}/${img.file_id}` : (img.url || img));
    }
    return displayData?.albumImages || [];
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
        label="Mô tả album"
        placeholder="Mô tả"
        multiline
        rows={6}
        disabled
        {...field}
      />
    ),
    []
  );
  return (
    <CustomSwipper
      key={open ? "view-album-open" : "view-album-closed"}
      open={open && isReady}
      onClose={onClose}
      title="Chi tiết album"
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
            {/* LEFT SIDE - INFO */}
            <Grid item xs={12} md={6}>
              <FullHeightMainCard>
                <InfoSectionTitle>Thông tin album</InfoSectionTitle>
                <SectionSubtitle>Thông tin chi tiết về album này.</SectionSubtitle>
                
                <Grid container spacing={3}>
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
                  <Grid item xs={12}>
                    <MetricsContainer>
                      <MetricItem>
                        <ThumbUpOutlinedIcon />
                        <MetricText>{displayData?.totalLikes || 0}</MetricText>
                      </MetricItem>
                      <MetricItem>
                        <VisibilityOutlinedIcon />
                        <MetricText>{displayData?.views || 0}</MetricText>
                      </MetricItem>
                      <MetricItem>
                        <ShareOutlinedIcon />
                        <MetricText>{displayData?.shares || 0}</MetricText>
                      </MetricItem>
                    </MetricsContainer>
                  </Grid>
                </Grid>
              </FullHeightMainCard>
            </Grid>

            {/* RIGHT SIDE - FEATURED IMAGE */}
            <Grid item xs={12} md={6}>
              <FullHeightMainCard>
                <CardTitle>Hình ảnh đại diện</CardTitle>
                <SectionSubtitle>Ảnh bìa hiển thị ở danh mục album.</SectionSubtitle>
                
                <MediaDisplayBox>
                  {displayData?.thumbnailFileId || displayData?.thumbnail || displayData?.featuredImage ? (
                    <LargePreviewImageBox
                      component={AuthImage}
                      src={displayData.thumbnailFileId ? `${API_VIEW_FILE}/${displayData.thumbnailFileId}` : (displayData.thumbnail || displayData.featuredImage)}
                      alt="Featured"
                    />
                  ) : (
                    <ViewEmptyText>Không có ảnh đại diện</ViewEmptyText>
                  )}
                </MediaDisplayBox>
              </FullHeightMainCard>
            </Grid>

            {/* BOTTOM - ALBUM IMAGES */}
            <Grid item xs={12}>
              <MainCard>
                <AlbumHeaderBox>
                  <Box>
                    <CardTitle>Ảnh trong album ({albumImages.length})</CardTitle>
                    <CompactSectionSubtitle>Danh sách toàn bộ hình ảnh trong bộ sưu tập này.</CompactSectionSubtitle>
                  </Box>
                </AlbumHeaderBox>

                {albumImages.length > 0 ? (
                  <AlbumImagesGrid>
                    {albumImages.map((img, index) => (
                      <AlbumImageItem key={img || `album-img-view-${index}`}>
                        <AuthImage src={img} alt={`Album image ${index + 1}`} />
                      </AlbumImageItem>
                    ))}
                  </AlbumImagesGrid>
                ) : (
                  <EmptyText>
                    Không có ảnh trong album này.
                  </EmptyText>
                )}
              </MainCard>
            </Grid>
          </Grid>
        </FullHeightFormContainer>
      )}
    </CustomSwipper>
  );
};

export default withSharedComponents(ViewMediaImage);
