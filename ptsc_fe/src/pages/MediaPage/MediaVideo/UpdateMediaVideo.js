import React, { useState, useEffect, useMemo, useCallback } from "react";
// import dayjs from "dayjs";
import {
  Box,
  Grid,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  styled,
  DialogContent,
  Typography,
  SvgIcon,
} from "@mui/material";
// import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import { Controller, useForm, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
// import MovieIcon from "@mui/icons-material/Movie";
import DeleteIcon from "@mui/icons-material/Delete";
import withSharedComponents from "@components/WrapperComponent";
import {
  API_MEDIA_VIDEO,
  API_VIEW_FILE,
  API_TOPIC,
} from "@EnvironmentFile/constants/urlConfig";
import AuthImage from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimImage';
import {
  // FeaturedImageContainer,
  FormContainer,
  MainCard,
  FieldLabel,
  UploadArea,
  UploadIcon,
  UploadText,
  UploadSubText,
  HiddenFileInput,
  PreviewImageBox,
  SectionTitle,
  // UploadTextSmall,
  // StyledGridContainer,
  // StyledGridItem,
  ErrorText,
} from "@styles/MediaPageStyle/MediaImage.styles";
import apis from "@services/api";
import CustomSwipper from "@components/Swipper/BaseSwiper";
import { FlexGrowBox, FooterActions } from "@styles/BaseSwiper/BaseSwiper.style";

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

const DeleteMediaButton = styled(Button)(({ theme }) => ({
  position: "absolute",
  top: theme.spacing(1),
  right: theme.spacing(1),
  backgroundColor: "rgba(255, 255, 255, 0.8)",
  color: theme.palette.error.main,
  minWidth: "unset",
  padding: "4px",
  "&:hover": {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
}));

const StyledDialogContent = styled(DialogContent)(() => ({
  height: "var(--dialog-content-height, auto)", 
  overflowY: "auto",
  paddingTop: "20px !important",
}));

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

const LargeUploadArea = styled(UploadArea)(({ theme, isError }) => ({
  height: "220px",
  ...(isError && {
    borderColor: theme.palette.error.main,
    backgroundColor: theme.palette.mode === "dark" ? "rgba(211, 47, 47, 0.1)" : "rgba(211, 47, 47, 0.05)",
  }),
}));

const VideoUploadArea = styled(UploadArea)(({ theme, isError }) => ({
  height: "260px",
  width: "100%",
  marginTop: theme.spacing(2),
  ...(isError && {
    borderColor: theme.palette.error.main,
    backgroundColor: theme.palette.mode === "dark" ? "rgba(211, 47, 47, 0.1)" : "rgba(211, 47, 47, 0.05)",
  }),
}));

const MandatoryBadge = styled("span")(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "rgba(0, 102, 204, 0.2)" : "#eff6ff",
  color: "#3b82f6",
  padding: "2px 10px",
  borderRadius: "20px",
  fontSize: "12px",
  fontWeight: 600,
  marginLeft: theme.spacing(1.5),
  border: `1px solid ${theme.palette.mode === "dark" ? "#1e40af" : "#bfdbfe"}`,
  display: "inline-block",
  verticalAlign: "middle",
}));

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

// const AutoSaveText = styled(Typography)(({ theme }) => ({
//   fontSize: "13px",
//   color: theme.palette.text.secondary,
//   display: "flex",
//   alignItems: "center",
//   gap: theme.spacing(1),
// }));

const MainCardFullHeight = styled(MainCard)({
  height: "100%",
});

const SaveIcon = (props) => (
  <SvgIcon {...props} viewBox="0 0 16 16">
    <path d="M1.2998 12.6908L1.2998 3.31078C1.2998 2.7777 1.51173 2.2666 1.88867 1.88965C2.26562 1.5127 2.77672 1.30078 3.3098 1.30078L10.1531 1.30078C10.6809 1.3083 11.184 1.5239 11.5546 1.89946L11.5552 1.89881L14.1018 4.44533H14.1011C14.4769 4.816 14.6923 5.31955 14.6998 5.84749L14.6998 12.6908C14.6998 13.2239 14.4879 13.735 14.1109 14.1119C13.734 14.4889 13.2229 14.7008 12.6898 14.7008L3.3098 14.7008C2.77672 14.7008 2.26562 14.4889 1.88867 14.1119C1.51173 13.735 1.2998 13.2238 1.2998 12.6908ZM2.6398 12.6908C2.6398 12.8685 2.71044 13.0388 2.83609 13.1645C2.96175 13.2902 3.13211 13.3608 3.3098 13.3608L12.6898 13.3608C12.8675 13.3608 13.0379 13.2902 13.1635 13.1645C13.2892 13.0388 13.3598 12.8685 13.3598 12.6908L13.3598 5.86646L13.3559 5.80038C13.3386 5.64809 13.2694 5.50555 13.1589 5.39734L13.1537 5.39275L10.6032 2.84165C10.495 2.73124 10.3525 2.66197 10.2002 2.64471L10.1341 2.64078L3.3098 2.64078C3.13211 2.64078 2.96175 2.71142 2.83609 2.83707C2.71044 2.96272 2.6398 3.13308 2.6398 3.31078L2.6398 12.6908Z" fill="currentColor"/>
    <path d="M10.6795 14.0105L10.6795 9.32047L5.31949 9.32047L5.31949 14.0105C5.31949 14.3805 5.01952 14.6805 4.64949 14.6805C4.27946 14.6805 3.97949 14.3805 3.97949 14.0105L3.97949 9.32047C3.97949 8.9651 4.12078 8.62434 4.37207 8.37302C4.62337 8.12177 4.9641 7.98047 5.31949 7.98047L10.6795 7.98047C11.0349 7.98047 11.3756 8.12177 11.6269 8.37302C11.8782 8.62434 12.0195 8.9651 12.0195 9.32047L12.0195 14.0105C12.0195 14.3805 11.7195 14.6805 11.3495 14.6805C10.9795 14.6805 10.6795 14.3805 10.6795 14.0105Z" fill="currentColor"/>
    <path d="M3.97949 4.67422L3.97949 1.99422C3.97949 1.62419 4.27946 1.32422 4.64949 1.32422C5.01952 1.32422 5.31949 1.62419 5.31949 1.99422L5.31949 4.67422L10.0095 4.67422C10.3795 4.67422 10.6795 4.97419 10.6795 5.34422C10.6795 5.71425 10.3795 6.01422 10.0095 6.01422L5.31949 6.01422C4.9641 6.01422 4.62337 5.87294 4.37207 5.62164C4.12077 5.37034 3.97949 5.02961 3.97949 4.67422Z" fill="currentColor"/>
  </SvgIcon>
);

const StyledSaveButtonFooter = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: "#fff",
  textTransform: "none",
  padding: "10px 28px",
  borderRadius: "12px",
  fontSize: "14px",
  fontWeight: 600,
  gap: "10px",
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
}));

const StyledCancelButtonFooter = styled(Button)(() => ({
  backgroundColor: "#fff",
  color: "#1e293b",
  textTransform: "none",
  padding: "10px 28px",
  borderRadius: "12px",
  fontSize: "14px",
  fontWeight: 600,
  gap: "10px",
  border: "1px solid #e2e8f0",
  "&:hover": {
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
  },
}));

const SmallCloseIcon = styled(CloseIcon)({
  fontSize: 16,
});

const SmallSaveIcon = styled(SaveIcon)({
  fontSize: 16,
});

const LargePreviewImageBox = styled(PreviewImageBox)({
  maxHeight: "280px",
});

const LargeVideoPlayerBox = styled(VideoPlayerBox)(({ theme, isError }) => ({
  height: "280px",
  ...(isError && {
    border: `1px solid ${theme.palette.error.main}`,
  }),
}));

const StyledFormControl = styled(FormControl)({
  marginBottom: "16px",
  width: "100%",
});

// Schema validation
const videoSchema = yup.object().shape({
  title: yup.string().required("Tiêu đề là bắt buộc"),
  description: yup.string().optional(),
  featuredImage: yup.mixed().required("Vui lòng tải lên hình ảnh đại diện"),
  videoType: yup.string().required("Vui lòng chọn loại video"),
  videoSourceType: yup.string().default("upload"),
  videoFile: yup.mixed().when("videoSourceType", {
    is: "upload",
    then: (schema) => schema.required("Vui lòng tải lên video"),
    otherwise: (schema) => schema.nullable(),
  }),
  videoLink: yup.string().when("videoSourceType", {
    is: "link",
    then: (schema) => schema.required("Vui lòng nhập link video"),
    otherwise: (schema) => schema.nullable(),
  }),
});

const UpdateMediaVideo = ({ open, onClose, onSuccess, data, sharedComponents, mediaId }) => {
  const { InputComponents, toast, LoadingDialog } = sharedComponents;

  const [isReady, setIsReady] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setTopicOptions] = useState([]);
  const [, setIsLoadingTopics] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  const fileInputRef = React.useRef(null);
  const videoInputRef = React.useRef(null);

  useEffect(() => {
    if (open) {
      if (data?.id || data?._id) {
        setCurrentId(data.id || data._id);
      } else if (mediaId) {
        setCurrentId(mediaId);
      }
    }
  }, [open, data, mediaId]);

  // Fetch topics từ API
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        setIsLoadingTopics(true);
        const response = await apis.get(`${API_TOPIC}`);
        const topics = Array.isArray(response.data?.data) ? response.data.data : Array.isArray(response.data) ? response.data : [];
        setTopicOptions(topics);
      } catch (error) {
        toast("Không thể tải danh sách chủ đề", "error");
      } finally {
        setIsLoadingTopics(false);
      }
    };

    if (open) {
      fetchTopics();
    }
  }, [open, toast]);

  const defaultFormValues = useMemo(
    () => ({
      videoType: (data?.videoType === "Nổi bật" || data?.videoType === "featured" || data?.videoType === "Hiển thị lên trang chủ") ? "Hiển thị lên trang chủ" : "Video thường",
      featuredImage: data?.thumbnail || data?.featuredImage || data?.thumbnailFileId || null,
      videoSourceType: data?.videoLink ? "link" : "upload",
      videoFile: data?.videoUrl || data?.videoFileId || null,
      videoLink: data?.videoLink || "",
    }),
    [data]
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm({
    defaultValues: defaultFormValues,
    resolver: yupResolver(videoSchema),
  });

  const fetchDetail = useCallback(async () => {
    if (!currentId) return;
    try {
      setIsLoadingDetail(true);
      const response = await apis.get(`${API_MEDIA_VIDEO}/${currentId}`);
      const detail = response.data?.data || response.data || response;
      
      reset({
        title: detail?.title || "",
        description: detail?.description || "",
        topic: detail?.topic?.id || detail?.topic || "",
        videoType: (detail?.videoType === "Nổi bật" || detail?.videoType === "featured" || detail?.videoType === "Hiển thị lên trang chủ") ? "Hiển thị lên trang chủ" : "Video thường",
        featuredImage: detail.thumbnailFileId || detail.thumbnail || detail.featuredImage || null,
        videoSourceType: detail.videoLink ? "link" : "upload",
        videoFile: detail.videoFileId || detail.videoUrl || null,
        videoLink: detail.videoLink || "",
      });
      setPreviewImage(detail.thumbnailFileId ? `${API_VIEW_FILE}/${detail.thumbnailFileId}` : (detail?.thumbnail || null));
      setVideoPreview(detail.videoFileId ? `${API_VIEW_FILE}/${detail.videoFileId}` : (detail?.videoUrl || null));
    } catch (error) {
      toast("Không thể tải chi tiết video", "error");
    } finally {
      setIsLoadingDetail(false);
    }
  }, [currentId, reset, toast]);

  useEffect(() => {
    if (open && currentId) {
      fetchDetail();
    }
  }, [open, currentId, fetchDetail]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setIsReady(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsReady(false);
    }
  }, [open]);

  // Submit form
  const onSubmitForm = useCallback(
    async (formData) => {
      if (isSubmitting) return;

      try {
        setIsSubmitting(true);

        const formDataPayload = new FormData();
        formDataPayload.append("title", formData.title);
        formDataPayload.append("description", formData.description);
        formDataPayload.append("topic", formData.topic);
        formDataPayload.append("videoType", formData.videoType);
        formDataPayload.append("videoSourceType", formData.videoSourceType);

        if (imageFile) {
          formDataPayload.append("thumbnail", imageFile);
        }

        if (formData.videoSourceType === "upload" && videoFile) {
          formDataPayload.append("video", videoFile);
        } else if (formData.videoSourceType === "link") {
          formDataPayload.append("videoLink", formData.videoLink);
        }

        await apis.patch(`${API_MEDIA_VIDEO}/${currentId}`, formDataPayload, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 100000,
        });
        
        toast("Cập nhật video thành công!", "success");

        if (onSuccess) onSuccess();
        onClose();
        reset(defaultFormValues);
      } catch (error) {
        toast(error?.message || "Có lỗi xảy ra khi cập nhật video!", "error");
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      isSubmitting,
      imageFile,
      videoFile,
      toast,
      onSuccess,
      onClose,
      reset,
      defaultFormValues,
      currentId,
    ]
  );

  const handleFormError = useCallback(
    (errs) => {
      const firstError = Object.values(errs)[0];
      toast(firstError?.message || "Vui lòng kiểm tra lại thông tin!", "error");
    },
    [toast]
  );

  const handleSaveClick = useCallback(() => {
    handleSubmit(onSubmitForm, handleFormError)();
  }, [handleSubmit, onSubmitForm, handleFormError]);

  // Handle featured image upload
  const handleImageUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImageChange = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          toast("Kích thước file không được vượt quá 5MB", "error");
          return;
        }

        if (!file.type.startsWith("image/")) {
          toast("Vui lòng chọn file hình ảnh", "error");
          return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewImage(reader.result);
        };
        reader.readAsDataURL(file);
        setImageFile(file);
        setValue("featuredImage", file, { shouldValidate: true });
      }
      event.target.value = "";
    },
    [toast, setValue]
  );

  const handleImageDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFeaturedImageDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files?.[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          toast("Kích thước file không được vượt quá 5MB", "error");
          return;
        }
        if (!file.type.startsWith("image/")) {
          toast("Vui lòng chọn file hình ảnh", "error");
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewImage(reader.result);
        };
        reader.readAsDataURL(file);
        setImageFile(file);
        setValue("featuredImage", file, { shouldValidate: true });
      }
    },
    [toast, setValue]
  );

  // Handle video upload
  const handleVideoUploadClick = useCallback(() => {
    videoInputRef.current?.click();
  }, []);

  const handleVideoChange = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      if (file) {
        if (file.size > 100 * 1024 * 1024) {
          toast("Kích thước video không được vượt quá 100MB", "error");
          return;
        }

        if (!file.type.startsWith("video/")) {
          toast("Vui lòng chọn file video", "error");
          return;
        }

        const url = URL.createObjectURL(file);
        setVideoPreview(url);
        setVideoFile(file);
        setValue("videoFile", file, { shouldValidate: true });
      }
      event.target.value = "";
    },
    [toast, setValue]
  );

  const handleVideoDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files?.[0];
      if (file) {
        if (file.size > 100 * 1024 * 1024) {
          toast("Kích thước video không được vượt quá 100MB", "error");
          return;
        }
        if (!file.type.startsWith("video/")) {
          toast("Vui lòng chọn file video", "error");
          return;
        }
        const url = URL.createObjectURL(file);
        setVideoPreview(url);
        setVideoFile(file);
        setValue("videoFile", file, { shouldValidate: true });
      }
    },
    [toast, setValue]
  );

  const handleRemoveVideo = useCallback((e) => {
    e.stopPropagation();
    setVideoFile(null);
    setVideoPreview(null);
    setValue("videoFile", null, { shouldValidate: true });
  }, [setValue]);

  const videoSourceType = useWatch({
    control,
    name: "videoSourceType",
    defaultValue: defaultFormValues.videoSourceType,
  });

  const renderVideoSourceTypeField = useCallback(
    ({ field }) => (
      <StyledFormControl component="fieldset">
        <RadioGroup {...field} row>
          <FormControlLabel
            value="upload"
            control={<Radio />}
            label="Upload video"
          />
          <FormControlLabel
            value="link"
            control={<Radio />}
            label="Gán link video"
          />
        </RadioGroup>
      </StyledFormControl>
    ),
    []
  );

  const renderTitleField = useCallback(
    ({ field }) => (
      <InputComponents
        label="Tiêu đề"
        placeholder="Nhập tiêu đề cho album"
        required
        error={!!errors?.title}
        helperText={errors?.title?.message}
        {...field}
      />
    ),
    [errors?.title]
  );

  const renderDescriptionField = useCallback(
    ({ field }) => (
      <InputComponents
        label="Mô tả"
        placeholder="Viết một vài dòng mô tả về bộ sưu tập ảnh này..."
        multiline
        rows={3}
        error={!!errors?.description}
        helperText={errors?.description?.message}
        {...field}
      />
    ),
    [errors?.description]
  );

  const renderVideoTypeField = useCallback(
    ({ field }) => (
      <FormControl component="fieldset" error={!!errors?.videoType}>
        <RadioGroup {...field} row>
          <FormControlLabel
            value="Video thường"
            control={<Radio />}
            label="Video thường"
          />
          <FormControlLabel
            value="Hiển thị lên trang chủ"
            control={<Radio />}
            label="Hiển thị trên trang chủ"
          />
        </RadioGroup>
        {errors?.videoType && <ErrorText>{errors.videoType.message}</ErrorText>}
      </FormControl>
    ),
    [errors?.videoType]
  );

  return (
    <CustomSwipper
      key={open ? "update-video-open" : "update-video-closed"}
      open={open && isReady}
      onClose={onClose}
      title="Cập nhật video"
      type="update"
      footer={
        <>
          {/* <AutoSaveText>
             <CloudUploadIcon sx={{ fontSize: 18 }} />
             Tự động lưu lúc {dayjs().format("HH:mm")}
          </AutoSaveText> */}
          <FlexGrowBox />
          <FooterActions>
            <StyledCancelButtonFooter onClick={onClose}>
              <SmallCloseIcon />
              Hủy
            </StyledCancelButtonFooter>
            <StyledSaveButtonFooter onClick={handleSaveClick}>
              <SmallSaveIcon />
              LƯU
            </StyledSaveButtonFooter>
          </FooterActions>
        </>
      }
      screenType="album"
      hideBackdrop
      disabled={isSubmitting || isLoadingDetail}
    >
      <LoadingDialog open={isSubmitting || isLoadingDetail}>
        <StyledDialogContent>
          {isSubmitting ? "Đang lưu video, vui lòng chờ trong giây lát..." : "Đang tải chi tiết video..."}
        </StyledDialogContent>
      </LoadingDialog>
      <FullHeightFormContainer>
        <Grid container spacing={3}>
          {/* TOP ROW */}
          <Grid item xs={12} md={7}>
            <MainCard>
              <VideoInfoSectionTitle>Thông tin video</VideoInfoSectionTitle>
              <SectionDescription>
                Cập nhật tiêu đề và các thông tin liên quan cho video này.
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
                <Grid item xs={12}>
                  <Controller
                    name="videoType"
                    control={control}
                    render={renderVideoTypeField}
                  />
                </Grid>
              </Grid>
            </MainCard>
          </Grid>

          <Grid item xs={12} md={5}>
            <MainCardFullHeight>
              <FieldLabel>
                Hình ảnh đại diện <span className="required">*</span>
              </FieldLabel>
              <SectionDescription>
                Tải hình ảnh mới cho video
              </SectionDescription>
              
              <LargeUploadArea 
                onClick={handleImageUploadClick}
                onDragOver={handleImageDragOver}
                onDrop={handleFeaturedImageDrop}
                isError={!!errors?.featuredImage}
              >
                {previewImage ? (
                  <LargePreviewImageBox
                    component={AuthImage}
                    src={previewImage}
                    alt="Preview"
                  />
                ) : (
                  <>
                    <UploadIcon>
                      <CloudUploadIcon />
                    </UploadIcon>
                    <UploadText>
                      Kéo thả hoặc nhấp để tải hình ảnh
                    </UploadText>
                    <UploadSubText>PNG, JPG, GIF (tối đa 5MB)</UploadSubText>
                  </>
                )}
              </LargeUploadArea>
              {errors?.featuredImage && (
                <ErrorText>{errors.featuredImage.message}</ErrorText>
              )}
              <HiddenFileInput
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
            </MainCardFullHeight>
          </Grid>

          {/* BOTTOM ROW */}
          <Grid item xs={12}>
            <MainCard>
              <Controller
                name="videoSourceType"
                control={control}
                render={renderVideoSourceTypeField}
              />
              
              {videoSourceType === "upload" ? (
                <>
                  <FieldLabelFlex>
                    Video tải lên <MandatoryBadge>Bắt buộc</MandatoryBadge>
                  </FieldLabelFlex>
                  <SectionDescription>
                    Bạn có thể tải lên video mới để thay thế
                  </SectionDescription>

                  {videoPreview ? (
                    <LargeVideoPlayerBox isError={!!errors?.videoFile}>
                      <StyledVideo src={videoPreview} controls />
                      <DeleteMediaButton onClick={handleRemoveVideo} size="small">
                        <DeleteIcon />
                      </DeleteMediaButton>
                    </LargeVideoPlayerBox>
                  ) : (
                    <VideoUploadArea 
                      onClick={handleVideoUploadClick}
                      onDragOver={handleImageDragOver}
                      onDrop={handleVideoDrop}
                      isError={!!errors?.videoFile}
                    >
                      <UploadIcon>
                        <CloudUploadIcon />
                      </UploadIcon>
                      <UploadText>Kéo thả hoặc nhấp để tải video lên</UploadText>
                      <UploadSubText>hoặc bấm để chọn video từ máy tính (Tối đa 1 video, mỗi video 100Mb)</UploadSubText>
                    </VideoUploadArea>
                  )}
                  {errors?.videoFile && (
                    <ErrorText>{errors.videoFile.message}</ErrorText>
                  )}
                  <HiddenFileInput
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleVideoChange}
                  />
                </>
              ) : (
                <>
                  <FieldLabelFlex>
                    Video tải lên <MandatoryBadge>Bắt buộc</MandatoryBadge>
                  </FieldLabelFlex>
                  <SectionDescription>
                    Bạn có thể tải lên tối đa 1 video
                  </SectionDescription>
                  <Controller
                    name="videoLink"
                    control={control}
                    render={({ field }) => (
                      <InputComponents
                        label="Link video"
                        placeholder="Nhập link video"
                        required
                        error={!!errors?.videoLink}
                        helperText={errors?.videoLink?.message}
                        {...field}
                      />
                    )}
                  />
                </>
              )}
            </MainCard>
          </Grid>
        </Grid>
      </FullHeightFormContainer>
    </CustomSwipper>
  );
};

export default withSharedComponents(UpdateMediaVideo);
