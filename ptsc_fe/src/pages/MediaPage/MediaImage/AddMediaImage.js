import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Grid,
  Button,
  DialogContent,
  Box,
  Typography,
  SvgIcon,
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import withSharedComponents from "@components/WrapperComponent";
import CustomSwipper from "@components/Swipper/BaseSwiper";
import {
  // FeaturedImageContainer,
  FormContainer,
  MainCard,
  // FieldLabel,
  UploadArea,
  UploadIcon,
  UploadText,
  UploadSubText,
  HiddenFileInput,
  PreviewImageBox,
  AlbumImageItem,
  DeleteButton,
  SectionTitle,
  // UploadTextSmall,
  // StyledGridContainer,
  // StyledGridItem,
  AlbumImagesArea,
  UploadInstruction,
  // HighlightText,
  InstructionSubText,
  LargeUploadIcon,
  // InstructionSubTextSmall,
  AlbumImagesGridWithMargin,
  ErrorText,
} from "@styles/MediaPageStyle/MediaImage.styles";

import { API_ADD_MEDIA_ALBUMS, API_TOPIC, API_UPLOAD_FILESS, API_MEDIA_ALBUMS } from "@EnvironmentFile/constants/urlConfig";
import { styled } from "@mui/material/styles";
import apis from "@services/api";
import AuthImage from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimImage';
import { FlexGrowBox, FooterActions } from "@styles/BaseSwiper/BaseSwiper.style";
// import { StyledSaveButton } from "@styles/UploadFile/UploadFile.style";

const StyledDialogContent = styled(DialogContent)(() => ({
  height: "var(--dialog-content-height, auto)",
  overflowY: "auto",
  paddingTop: "20px !important",
}));

const FullHeightFormContainer = styled(FormContainer)({
  minHeight: "auto",
});

const FullHeightMainCard = styled(MainCard)({
  height: "100%",
  display: "flex",
  flexDirection: "column",
});

const LargeUploadArea = styled(UploadArea)(({ theme, isError }) => ({
  height: "300px",
  ...(isError && {
    borderColor: theme.palette.error.main,
    backgroundColor: theme.palette.mode === "dark" ? "rgba(211, 47, 47, 0.1)" : "rgba(211, 47, 47, 0.05)",
  }),
}));

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

const AlbumHeaderBox = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: theme.spacing(3),
}));

const CompactSectionSubtitle = styled(SectionSubtitle)({
  marginBottom: 0,
});

const StyledAddButton = styled(Button)(({ theme }) => ({
  borderRadius: "8px",
  textTransform: "none",
  borderColor: "#E0E0E0",
  color: theme.palette.text.primary,
  "&:hover": {
    borderColor: "#3366FF",
    backgroundColor: "rgba(51, 102, 255, 0.04)",
  },
}));

const CompactAlbumImagesArea = styled(AlbumImagesArea)(({ theme, isError }) => ({
  padding: "20px",
  ...(isError && {
    borderColor: theme.palette.error.main,
    backgroundColor: theme.palette.mode === "dark" ? "rgba(211, 47, 47, 0.1)" : "rgba(211, 47, 47, 0.05)",
  }),
}));

// Schema validation
const albumSchema = yup.object().shape({
  title: yup.string().required("Tiêu đề là bắt buộc"),
  featuredImage: yup.mixed().required("Vui lòng tải lên hình ảnh đại diện"),
  albumImages: yup.array().min(1, "Vui lòng tải lên ít nhất 1 hình ảnh trong album"),
  // description: yup.string().required("Mô tả là bắt buộc"),
  // topic: yup.string().required("Chủ đề là bắt buộc"),
  // albumType: yup.string().required("Loại album là bắt buộc"),
});

const AddMediaImage = ({ open, onClose, onSuccess, sharedComponents }) => {
  const { InputComponents, toast, LoadingDialog } = sharedComponents;

  const [isReady, setIsReady] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [albumImages, setAlbumImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setTopicOptions] = useState([]);
  const [, setIsLoadingTopics] = useState(false);

  const fileInputRef = React.useRef(null);
  const albumImagesInputRef = React.useRef(null);

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
      title: "",
      description: "",
      topic: "",
      albumType: "featured",
      featuredImage: null,
      albumImages: [],
    }),
    []
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm({
    defaultValues: defaultFormValues,
    resolver: yupResolver(albumSchema),
  });

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setIsReady(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsReady(false);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      reset(defaultFormValues);
      setPreviewImage(null);
      setImageFile(null);
      setAlbumImages([]);
    }
  }, [open, reset, defaultFormValues]);

  // Submit form
  const onSubmitForm = useCallback(
    async (formData) => {
      if (isSubmitting) return;

      // Helper resize ảnh
      const resizeImage = (file, maxWidth) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new window.Image();
            img.onload = () => {
              const canvas = document.createElement("canvas");
              let width = img.width;
              let height = img.height;
              if (width > maxWidth) {
                height = Math.round(height * (maxWidth / width));
                width = maxWidth;
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(img, 0, 0, width, height);
              canvas.toBlob(
                (blob) => {
                  if (blob) {
                    resolve(new File([blob], file.name, { type: file.type, lastModified: Date.now() }));
                  } else {
                    resolve(file);
                  }
                },
                file.type,
                0.9
              );
            };
            img.src = e.target.result;
          };
          reader.readAsDataURL(file);
        });
      };

      // Helper upload từng version
      const uploadVersion = async (file, typeSize, targetId) => {
        const formDataUpload = new FormData();
        formDataUpload.append("file", file);
        formDataUpload.append("object_type", "album_images");
        formDataUpload.append("object_id", targetId);
        if (typeSize) {
          formDataUpload.append("typeSize", typeSize);
        }
        await apis.post(API_UPLOAD_FILESS, formDataUpload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      };

      try {
        if (!imageFile) {
          toast("Vui lòng tải lên hình ảnh đại diện", "error");
          return;
        }

        setIsSubmitting(true);

        const newFiles = albumImages.filter((img) => img.file).map((img) => img.file);
        const CHUNK_SIZE = 10;
        const chunks = [];
        for (let i = 0; i < newFiles.length; i += CHUNK_SIZE) {
          chunks.push(newFiles.slice(i, i + CHUNK_SIZE)); 
        }

        const formDataPayload = new FormData();
        formDataPayload.append("title", formData.title);
        formDataPayload.append("description", formData.description);
        formDataPayload.append("topic", formData.topic);
        formDataPayload.append("albumType", formData.albumType);

        if (imageFile) {
          formDataPayload.append("thumbnail", imageFile);
        }

        // Send the first chunk with the initial POST
        if (chunks.length > 0) {
          chunks[0].forEach((file) => {
            formDataPayload.append("files", file);
          });
        }

        const response = await apis.post(API_ADD_MEDIA_ALBUMS, formDataPayload, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 100000,
        });

        const albumId =
          response.data?.document?.id ||
          response.data?.data?.id ||
          response.data?.id ||
          response.document?.id ||
          response.id;

        // Upload remaining chunks using PATCH
        if (albumId && chunks.length > 1) {
          for (let j = 1; j < chunks.length; j++) {
            const patchFormData = new FormData();
            chunks[j].forEach((file) => {
              patchFormData.append("files", file);
            });
            await apis.patch(`${API_MEDIA_ALBUMS}/${albumId}`, patchFormData, {
              headers: {
                "Content-Type": "multipart/form-data",
              },
              timeout: 100000,
            });
          }
        }


        // Nếu lưu thành công và có ảnh đại diện thì upload thêm 3 size
        if (albumId && imageFile) {
          try {
            const [fSmall, fMedium, fBig] = await Promise.all([
              resizeImage(imageFile, 480),
              resizeImage(imageFile, 1024),
              resizeImage(imageFile, 1920),
            ]);

            await Promise.all([
              uploadVersion(fSmall, "sizeSmall", albumId),
              uploadVersion(fMedium, "sizeMedium", albumId),
              uploadVersion(fBig, "sizeBig", albumId),
            ]);
          } catch (uploadSizesErr) {
            logger.error("Lỗi upload bộ ảnh đại diện:", uploadSizesErr);
          }
        }
        
        toast("Thêm album mới thành công!", "success");

        if (onSuccess) onSuccess();
        onClose();
        reset(defaultFormValues);
      } catch (error) {
        toast(error?.message || "Có lỗi xảy ra khi thêm album!", "error");
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      isSubmitting,
      imageFile,
      albumImages,
      toast,
      onSuccess,
      onClose,
      reset,
      defaultFormValues,
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

  // Handle album images upload
  const handleAlbumImagesClick = useCallback(() => {
    albumImagesInputRef.current?.click();
  }, []);

  const handleAlbumImagesChange = useCallback(
    (event) => {
      const files = Array.from(event.target.files || []);
      
      if (albumImages.length + files.length > 100) {
        toast("Số lượng ảnh trong album không được vượt quá 100 ảnh", "error");
        return;
      }

      const validFiles = files.filter((file) => {
        if (file.size > 5 * 1024 * 1024) {
          toast(`File ${file.name} vượt quá 5MB`, "error");
          return false;
        }
        if (!file.type.startsWith("image/")) {
          toast(`File ${file.name} không phải là hình ảnh`, "error");
          return false;
        }
        return true;
      });

      validFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setAlbumImages((prev) => {
            const newImages = [
              ...prev,
              { 
                file, 
                preview: reader.result,
                uiId: `new-${Date.now()}-${Math.random()}`
              },
            ];
            setValue("albumImages", newImages, { shouldValidate: true });
            return newImages;
          });
        };
        reader.readAsDataURL(file);
      });
    },
    [toast, albumImages, setValue]
  );

  const handleAlbumImagesDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const files = Array.from(e.dataTransfer.files || []);

      if (albumImages.length + files.length > 100) {
        toast("Số lượng ảnh trong album không được vượt quá 100 ảnh", "error");
        return;
      }

      const validFiles = files.filter((file) => {
        if (file.size > 5 * 1024 * 1024) {
          toast(`File ${file.name} vượt quá 5MB`, "error");
          return false;
        }
        if (!file.type.startsWith("image/")) {
          toast(`File ${file.name} không phải là hình ảnh`, "error");
          return false;
        }
        return true;
      });

      validFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setAlbumImages((prev) => {
            const newImages = [
              ...prev,
              { 
                file, 
                preview: reader.result,
                uiId: `new-${Date.now()}-${Math.random()}`
              },
            ];
            setValue("albumImages", newImages, { shouldValidate: true });
            return newImages;
          });
        };
        reader.readAsDataURL(file);
      });
    },
    [toast, albumImages, setValue]
  );

  const handleRemoveAlbumImage = useCallback((index) => {
    setAlbumImages((prev) => {
      const newImages = prev.filter((_, i) => i !== index);
      setValue("albumImages", newImages, { shouldValidate: true });
      return newImages;
    });
  }, [setValue]);

  // Render functions
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
        label="Mô tả album"
        placeholder="Viết một vài dòng mô tả về bộ sưu tập ảnh này..."
        multiline
        rows={6}
        error={!!errors?.description}
        helperText={errors?.description?.message}
        {...field}
      />
    ),
    [errors?.description]
  );

  return (
    <CustomSwipper 
      key={open ? "add-album-open" : "add-album-closed"}
      open={open && isReady}
      onClose={onClose}
      title="Thêm mới album"
      type="add"
      onSave={handleSaveClick}
      // moreActions={
      //   <Button variant="contained" onClick={handleSaveClick}>
      //     Lưu
      //   </Button>
      // }
      footer={
        <>
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
      disabled={isSubmitting}
    >
      <LoadingDialog open={isSubmitting}>
        <StyledDialogContent>
          Đang lưu album media, vui lòng chờ trong giây lát...
        </StyledDialogContent>
      </LoadingDialog>
      <FullHeightFormContainer>
        <Grid container spacing={3}>
          {/* LEFT SIDE - ALBUM INFO */}
          <Grid item xs={12} md={6}>
            <FullHeightMainCard>
              <InfoSectionTitle>Thông tin album</InfoSectionTitle>
              <SectionSubtitle>Nhập tiêu đề và các thông tin liên quan cho album này.</SectionSubtitle>
              
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
              </Grid>
            </FullHeightMainCard>
          </Grid>

          {/* RIGHT SIDE - FEATURED IMAGE */}
          <Grid item xs={12} md={6}>
            <FullHeightMainCard>
              <CardTitle>Hình ảnh đại diện <span style={{ color: '#d32f2f' }}>*</span></CardTitle>
              <SectionSubtitle>Ảnh bìa sẽ hiển thị ở danh mục album.</SectionSubtitle>
              
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
                    <UploadSubText>
                      WEBP, PNG, JPG, GIF (tối đa 5MB)
                    </UploadSubText>
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
            </FullHeightMainCard>
          </Grid>

          {/* BOTTOM - ALBUM IMAGES */}
          <Grid item xs={12}>
            <MainCard>
              <AlbumHeaderBox>
                <Box>
                  <CardTitle>Ảnh trong album <span style={{ color: '#d32f2f' }}>*</span></CardTitle>
                  <CompactSectionSubtitle>Bạn có thể tải lên tối đa 100 ảnh cùng lúc.</CompactSectionSubtitle>
                </Box>
                <StyledAddButton 
                  variant="outlined" 
                  startIcon={<AddIcon />} 
                  onClick={handleAlbumImagesClick}
                >
                  Thêm từ máy tính
                </StyledAddButton>
              </AlbumHeaderBox>

              {albumImages.length > 0 && (
                <AlbumImagesGridWithMargin>
                  {albumImages.map((img, index) => {
                    const handleRemove = (e) => {
                      e.stopPropagation();
                      handleRemoveAlbumImage(index);
                    };
                    return (
                      <AlbumImageItem key={img.uiId}>
                        <AuthImage src={img.preview} alt="Album" />
                        <DeleteButton
                          size="small"
                          onClick={handleRemove}
                        >
                          <DeleteIcon />
                        </DeleteButton>
                      </AlbumImageItem>
                    );
                  })}
                </AlbumImagesGridWithMargin>
              )}

              <CompactAlbumImagesArea 
                onClick={handleAlbumImagesClick}
                onDragOver={handleImageDragOver}
                onDrop={handleAlbumImagesDrop}
                isError={!!errors?.albumImages}
              >
                <LargeUploadIcon>
                  <CloudUploadIcon />
                </LargeUploadIcon>
                <UploadInstruction>Kéo thả ảnh vào đây</UploadInstruction>
                <InstructionSubText>
                  hoặc bấm để chọn ảnh từ máy tính (Tối đa 100 ảnh, 5MB/ảnh)
                </InstructionSubText>
              </CompactAlbumImagesArea>
              {errors?.albumImages && (
                <ErrorText>{errors.albumImages.message}</ErrorText>
              )}
            </MainCard>
          </Grid>
        </Grid>

        <HiddenFileInput
          ref={albumImagesInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleAlbumImagesChange}
        />
      </FullHeightFormContainer>
    </CustomSwipper>
  );
};

export default withSharedComponents(AddMediaImage);
