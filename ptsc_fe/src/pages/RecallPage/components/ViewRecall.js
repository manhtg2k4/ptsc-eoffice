import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  Grid,
  // Box,
  // Button,
  IconButton,
  // Typography,
} from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import dayjs from "dayjs";
import withSharedComponents from "@components/WrapperComponent";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import AuthImage from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimImage';
import axiosInstance from "@utils/axiosInstance";
import api from "@services/api";
import { API_NEWS_MANAGEMENT, API_UPLOAD_FILESS, APP_BASE, API_GET_LIST_UNIT } from "@EnvironmentFile/constants/urlConfig";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/vi";

dayjs.extend(relativeTime);
dayjs.locale("vi");

// Import TipTap
import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import { Link } from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { CustomResizableImage } from "@utils/tiptapExtensions";
import CustomInputTag from "@components/CustomInput/CustomInputTag";
import CustomSwipper from "@components/Swipper/BaseSwiper";

// ── Styled Components ──
import {
  FormContainer,
  MainCard,
  SectionTitle,
  // UploadIcon,
  // UploadText,
  // UploadSwitch,
  HiddenFileInput,
  UploadButton,
  // ButtonOutline,
  // SubSectionTitle,
  // FieldLabel,
  // EditorWrapper,
  // EditorContentWrapper,
  // ErrorText,
  // ImageUploadAreaBox,
  PreviewImageStyledContainer,
  UploadPlaceholder,
  // InteractionBoxContainer,
  // UploadAreaStyled,
  // SecondaryText,
  DisabledInputWrapper,
  InteractionItem,
  // InteractionIcon,
  InteractionCount,
  StatusContainer,
  StatusItem,
  StatusCircle,
  StatusLabel,
  // TagsBox,
  // FieldWrapper,
  // RowContainer,
  // StyledUserListDialog,
  // UserListDialogTitle,
  UserListDialogContent,
  UserListContainer,
  UserListItem,
  // UserAvatar,
  UserInfo,
  UserName,
  UserActionTime,
  EmptyDataBox,
  LoadingText,
  NoDataText,
  UserListDialogActions,
  PageLayoutWrapper,
  MainContentArea,
  SidePanelContainer,
  UserListDrawerHeader,
  UserListDrawerTitleBox,
  TitleIndicator,
  UnitFilterBox,
  CloseIconDrawer,
  UserAvatarIcon,
  UserActionStatus,
  UserMetaRow,
  FeedbackContent,
  FeedbackBubble,
  AlignedGridContainer,
  ImageAreaWrapper,
  UploadAreaBoxWrapper,
  ActionHeaderBox,
  ActionIconButton,
  UploadTextBold,
  MainContentBox,
  UploadSubText,
} from "./ViewRecall.styles";
import withFormWrapper from "@components/common/FormWrapper";

// Schema validation
const newsSchema = yup.object().shape({
  title: yup.string().required("Tiêu đề là bắt buộc"),
  summary: yup.string().required("Tóm tắt tin tức là bắt buộc"),
  createdDate: yup.date().required("Ngày tạo là bắt buộc").nullable(),
  scheduledPublishAt: yup.date().nullable(),
  reviewerName: yup.string(),
  topic: yup.string().required("Chủ đề là bắt buộc"),
  tags: yup.array(),
  featuredImage: yup.mixed().nullable(),
  imageTitle: yup.string(),
  content: yup.string().required("Nội dung chính là bắt buộc"),
  isComment: yup.boolean(),
  isImportant: yup.string().required("Vui lòng chọn tính chất tin"),
});


const isEditorReady = (editor) => !!editor && !editor.isDestroyed;

// Menu Bar Component
// function EditorMenuBar({ editor, onImageClick, onLinkClick }) {
//   const handleBold = useCallback(() => {
//     editor?.chain().focus().toggleBold().run();
//   }, [editor]);

//   const handleItalic = useCallback(() => {
//     editor?.chain().focus().toggleItalic().run();
//   }, [editor]);

//   const handleUnderline = useCallback(() => {
//     editor?.chain().focus().toggleUnderline().run();
//   }, [editor]);

//   const handleStrike = useCallback(() => {
//     editor?.chain().focus().toggleStrike().run();
//   }, [editor]);

//   const handleHeading1 = useCallback(() => {
//     editor?.chain().focus().toggleHeading({ level: 1 }).run();
//   }, [editor]);

//   const handleHeading2 = useCallback(() => {
//     editor?.chain().focus().toggleHeading({ level: 2 }).run();
//   }, [editor]);

//   const handleHeading3 = useCallback(() => {
//     editor?.chain().focus().toggleHeading({ level: 3 }).run();
//   }, [editor]);

//   const handleBulletList = useCallback(() => {
//     editor?.chain().focus().toggleBulletList().run();
//   }, [editor]);

//   const handleOrderedList = useCallback(() => {
//     editor?.chain().focus().toggleOrderedList().run();
//   }, [editor]);

//   const handleAlignLeft = useCallback(() => {
//     editor?.chain().focus().setTextAlign("left").run();
//   }, [editor]);

//   const handleAlignCenter = useCallback(() => {
//     editor?.chain().focus().setTextAlign("center").run();
//   }, [editor]);

//   const handleAlignRight = useCallback(() => {
//     editor?.chain().focus().setTextAlign("right").run();
//   }, [editor]);

//   const handleCode = useCallback(() => {
//     editor?.chain().focus().toggleCode().run();
//   }, [editor]);

//   const handleAddLink = useCallback(() => {
//     onLinkClick?.();
//   }, [onLinkClick]);

//   const handleAddImage = useCallback(() => {
//     onImageClick?.();
//   }, [onImageClick]);

//   const handleUndo = useCallback(() => {
//     editor?.chain().focus().undo().run();
//   }, [editor]);

//   const handleRedo = useCallback(() => {
//     editor?.chain().focus().redo().run();
//   }, [editor]);

//   if (!editor) return null;

//   return (
//     <MenuBar>
//       {/* Text Formatting */}
//       <MenuButton
//         active={editor.isActive("bold")}
//         onClick={handleBold}
//         title="Bold (Ctrl+B)"
//       >
//         <FormatBoldIcon />
//       </MenuButton>

//       <MenuButton
//         active={editor.isActive("italic")}
//         onClick={handleItalic}
//         title="Italic (Ctrl+I)"
//       >
//         <FormatItalicIcon />
//       </MenuButton>

//       <MenuButton
//         active={editor.isActive("underline")}
//         onClick={handleUnderline}
//         title="Underline (Ctrl+U)"
//       >
//         <FormatUnderlinedIcon />
//       </MenuButton>

//       <MenuButton
//         active={editor.isActive("strike")}
//         onClick={handleStrike}
//         title="Strikethrough"
//       >
//         <StrikethroughSIcon />
//       </MenuButton>

//       <ToolbarDivider orientation="vertical" />

//       {/* Headings */}
//       <HeadingButton
//         active={editor.isActive("heading", { level: 1 })}
//         onClick={handleHeading1}
//         title="Heading 1"
//       >
//         H1
//       </HeadingButton>

//       <HeadingButton
//         active={editor.isActive("heading", { level: 2 })}
//         onClick={handleHeading2}
//         title="Heading 2"
//       >
//         H2
//       </HeadingButton>

//       <HeadingButton
//         active={editor.isActive("heading", { level: 3 })}
//         onClick={handleHeading3}
//         title="Heading 3"
//       >
//         H3
//       </HeadingButton>

//       <ToolbarDivider orientation="vertical" />

//       {/* Lists */}
//       <MenuButton
//         active={editor.isActive("bulletList")}
//         onClick={handleBulletList}
//         title="Bullet List"
//       >
//         <FormatListBulletedIcon />
//       </MenuButton>

//       <MenuButton
//         active={editor.isActive("orderedList")}
//         onClick={handleOrderedList}
//         title="Numbered List"
//       >
//         <FormatListNumberedIcon />
//       </MenuButton>

//       <ToolbarDivider orientation="vertical" />

//       {/* Text Alignment */}
//       <MenuButton
//         active={editor.isActive({ textAlign: "left" })}
//         onClick={handleAlignLeft}
//         title="Align Left"
//       >
//         <FormatAlignLeftIcon />
//       </MenuButton>

//       <MenuButton
//         active={editor.isActive({ textAlign: "center" })}
//         onClick={handleAlignCenter}
//         title="Align Center"
//       >
//         <FormatAlignCenterIcon />
//       </MenuButton>

//       <MenuButton
//         active={editor.isActive({ textAlign: "right" })}
//         onClick={handleAlignRight}
//         title="Align Right"
//       >
//         <FormatAlignRightIcon />
//       </MenuButton>

//       <ToolbarDivider orientation="vertical" />

//       {/* Code */}
//       <MenuButton
//         active={editor.isActive("code")}
//         onClick={handleCode}
//         title="Inline Code"
//       >
//         <CodeIcon />
//       </MenuButton>

//       {/* Link & Image */}
//       <MenuButton
//         active={editor.isActive("link")}
//         onClick={handleAddLink}
//         title="Insert Link"
//       >
//         <LinkIcon />
//       </MenuButton>

//       <MenuButton onClick={handleAddImage} title="Insert Image">
//         <ImageIcon />
//       </MenuButton>

//       <ToolbarDivider orientation="vertical" />

//       {/* Undo/Redo */}
//       <MenuButton
//         onClick={handleUndo}
//         disabled={!editor.can().undo()}
//         title="Undo (Ctrl+Z)"
//       >
//         <UndoIcon />
//       </MenuButton>

//       <MenuButton
//         onClick={handleRedo}
//         disabled={!editor.can().redo()}
//         title="Redo (Ctrl+Shift+Z)"
//       >
//         <RedoIcon />
//       </MenuButton>
//     </MenuBar>
//   );
// }

function ViewRecall({ open, onClose, onSuccess, sharedComponents, newsId }) {
  const {
    ButtonOutline,
    InputComponents: BaseInput,
    DateTimePicker: BaseDateTimePicker,
    toast,
  } = sharedComponents;

    const InputComponents = useMemo(() => {
      const Wrapped = withFormWrapper(BaseInput, "input");
      const Component = (props) => <Wrapped {...props} />;
      Component.displayName = "InputComponents";
      return Component;
    }, [BaseInput]);
  
    const DateTimePicker = useMemo(() => {
      const Wrapped = withFormWrapper(BaseDateTimePicker, "date");
      const Component = (props) => <Wrapped {...props} />;
      Component.displayName = "DateTimePicker";
      return Component;
    }, [BaseDateTimePicker]);

  const [isReady, setIsReady] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [detailData, setDetailData] = useState({});
  const fileInputRef = React.useRef(null);

  const [interaction, setInteraction] = useState({
    views: 0,
    likes: 0,
    comments: 0,
  });

  const [isEditMode, setIsEditMode] = useState(false);

  // State cho Popup danh sách người xem/thích
  const [userListDialog, setUserListDialog] = useState({
    open: false,
    title: "",
    data: [],
    loading: false,
    unitFilter: "",
  });

  const [topicOptions, setTopicOptions] = useState([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [unitOptions, setUnitOptions] = useState([]);

  // Fetch units cho filter
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const response = await axiosInstance.get(`${API_GET_LIST_UNIT}?limit=999`);
        const rawData = response?.data || response;
        const resultData = rawData?.data || rawData || [];
        if (Array.isArray(resultData)) {
          const options = resultData.map((unit) => ({
            label: unit.name,
            value: unit.name,
          }));
          setUnitOptions([{ label: "Tất cả đơn vị", value: "" }, ...options]);
        }
      } catch (error) {
        logger.error("Fetch units error:", error);
      }
    };
    fetchUnits();
  }, []);

  const filteredUserList = useMemo(() => {
    if (!userListDialog.unitFilter) return userListDialog.data;
    return userListDialog.data.filter(
      (user) => user.unitName === userListDialog.unitFilter
    );
  }, [userListDialog.data, userListDialog.unitFilter]);

  // State cho RecallPage - dữ liệu thu hồi
  const [recalledAt, setRecalledAt] = useState(null);
  const [recallReasonData, setRecallReasonData] = useState("");
  const [recalledByName, setRecalledByName] = useState("");

  // Fetch topics từ API
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        setIsLoadingTopics(true);
        const response = await axiosInstance.get(`${APP_BASE}/api/topic`);
        const topics = response || [];
        setTopicOptions(topics);
      } catch (error) {
        logger.error("Lỗi khi tải danh sách chủ đề:", error);
        toast("Không thể tải danh sách chủ đề", "error");
      } finally {
        setIsLoadingTopics(false);
      }
    };

    fetchTopics();
  }, [toast]);


  const defaultFormValues = useMemo(
    () => ({
      title: "",
      summary: "",
      createdDate: dayjs(),
      scheduledPublishAt: null,
      reviewerName: "",
      topic: "",
      tags: "",
      featuredImage: null,
      imageTitle: "",
      content: "",
      isComment: true,
      isImportant: "false",
    }),
    []
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({
    defaultValues: defaultFormValues,
    resolver: yupResolver(newsSchema),
  });

  const contentValue = watch("content");

  // TipTap Editor
  const handleEditorUpdate = useCallback(
    ({ editor }) => {
      if (!isEditorReady(editor)) return;
      setValue("content", editor.getHTML());
    },
    [setValue]
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      CustomResizableImage,
      TextStyle,
      Color,
    ],
    content: contentValue || "",
    onUpdate: handleEditorUpdate,
    editable: isEditMode,
    editorProps: {
      attributes: {
        "data-placeholder": "Nhập nội dung tin tức...",
      },
    },
  });

  // useEffect: Cập nhật trạng thái editable của editor khi isEditMode thay đổi
  useEffect(() => {
    if (isEditorReady(editor)) {
      editor.setEditable(isEditMode);
    }
  }, [editor, isEditMode]);

  // useEffect: Fetch chi tiết tin tức khi có newsId
  useEffect(() => {
    const fetchDetail = async () => {
      if (open && newsId) {
        try {
          // 1. Lấy chi tiết tin tức
          const response = await axiosInstance.get(
            `${API_NEWS_MANAGEMENT}/${newsId}`
          );
          const data = response?.data || response;

          // 2. Map dữ liệu về form
          const mappedData = {
            title: data.title || "",
            summary: data.summary || "",
            createdDate: data.createdAt
              ? dayjs(data.createdAt)
              : dayjs(),
            scheduledPublishAt: (data.scheduledPublishAt || data.publishedAt)
              ? dayjs(data.scheduledPublishAt || data.publishedAt)
              : null,
            reviewerName: data.reviewerName || "",
            topic: data.topic || "",
            tags: data.tags 
              ? (typeof data.tags === 'string' 
                  ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
                  : Array.isArray(data.tags) ? data.tags : [])
              : [],
            featuredImage: null,
            imageTitle: data.nameThumbnail || "",
            content: data.content || "",
            isComment: data.isComment ?? true,
            isImportant: data.isImportant === true ? "true" : "false",
          };

          // 3. Xử lý hình ảnh đại diện (nếu có)
        if (data.thumbnail?.id) {
          try {
            // Fetch ảnh từ API endpoint
            const fileResponse = await axiosInstance.get(
              `${APP_BASE}/api/files/view/${data.thumbnail.id}`,
              { responseType: "blob" }
            );
            
            // Convert Blob to Base64 Data URL (lâu hơn nhưng ổn định hơn)
            const reader = new FileReader();
            reader.onloadend = () => {
              setPreviewImage(reader.result);
            };
            reader.readAsDataURL(fileResponse.data);
            
            // Hoặc dùng URL trực tiếp API (nhanh hơn nhưng cần CORS đúng)
            // const imageUrl = `${APP_BASE}/api/files/view/${data.thumbnailFile.id}`;
            // setPreviewImage(imageUrl);
          } catch (imageError) {
            logger.error("Lỗi tải ảnh:", imageError);
            // Fallback: dùng URL trực tiếp nếu API fail
            if (data.thumbnail?.id) {
              const imageUrl = `${APP_BASE}/api/files/view/${data.thumbnail.id}`;
              setPreviewImage(imageUrl);
            }
          }
        }          // === THÊM PHẦN TƯƠNG TÁC TẠI ĐÂY ===
          setInteraction({
            views: data.viewCount || 0,
            likes: data.likeCount || 0,
            comments: data.commentCount || 0,
          });

          reset(mappedData);
          setDetailData(data);
          setRecalledAt(data.recalledAt ? dayjs(data.recalledAt, "YYYY-MM-DD") : null);
          setRecallReasonData(data.recallReason || "");
          setRecalledByName(data.recalledByName || "");

          setIsReady(true);
          setIsEditMode(false);
        } catch (error) {
          const messageError =
						error?.response?.data?.message ||
						error.message || "Có lỗi xảy ra khi tải thông tin tin tức";
          logger.error("Lỗi lấy chi tiết tin tức:", messageError);
          toast(messageError, "error");
          onClose();
        }
      } else if (open && !newsId) {
        // Trường hợp thêm mới
        setIsReady(true);
        setIsEditMode(false);

        // Khi thêm mới, đặt tương tác về 0 (tùy chọn, nếu muốn)
        setInteraction({
          views: 0,
          likes: 0,
          comments: 0,
        });
      } else {
        setIsReady(false);
        setDetailData({});
        setPreviewImage(null);
        setImageFile(null);

        // Reset tương tác khi đóng form
        setInteraction({
          views: 0,
          likes: 0,
          comments: 0,
        });
      }
    };

    fetchDetail();
  }, [open, newsId, reset, toast, onClose]);

  // useEffect: Đẩy nội dung vào editor khi editor sẵn sàng hoặc detailData thay đổi
  // (tách riêng để tránh việc editor chuyển từ null -> instance làm effect fetch
  // chạy thêm 1 lần nữa)
  useEffect(() => {
    if (isEditorReady(editor) && detailData) {
      editor.commands.setContent(detailData.content || "");
    }
  }, [editor, detailData]);

  // useEffect: Reset form khi thêm mới
  useEffect(() => {
    if (open && !newsId) {
      reset(defaultFormValues);
      setPreviewImage(null);
      setImageFile(null);
      if (isEditorReady(editor)) {
        editor.commands.setContent("");
      }
    }
  }, [open, newsId, reset, defaultFormValues, editor]);

  const onSubmitForm = useCallback(
    async (data) => {
      try {
        // Validate dữ liệu trước khi gửi
        if (!data.title?.trim()) throw new Error("Tiêu đề không được để trống");
        if (!data.summary?.trim()) throw new Error("Tóm tắt không được để trống");
        if (!data.content?.trim()) throw new Error("Nội dung không được để trống");
        if (!data.topic?.trim()) throw new Error("Chủ đề không được để chọn");

        // Gửi raw JSON
        const payload = {
          title: String(data.title || "").trim(),
          summary: String(data.summary || "").trim(),
          content: String(data.content || "").trim(),
          isComment: data.isComment === true,
          isImportant: data.isImportant === "true",
          topic: String(data.topic || "").trim(),
          tags: String(data.tags || "").trim(),
          publishedAt: dayjs(data.createdDate).format("YYYY-MM-DD"),
          reviewerName: String(data.reviewerName || "").trim(),
        };

        // Thêm ngày xuất bản theo lịch nếu có
        if (data.scheduledPublishAt) {
          payload.scheduledPublishAt = dayjs(data.scheduledPublishAt).format("YYYY-MM-DD");
        }

        // Thêm tên ảnh nếu có
        if (data.imageTitle?.trim()) {
          payload.nameThumbnail = String(data.imageTitle || "").trim();
        }

        let finalNewsId = newsId;

        // Kiểm tra là tạo mới hay cập nhật
        if (newsId) {
          // Cập nhật tin tức
          await axiosInstance.patch(`${API_NEWS_MANAGEMENT}/${newsId}`, payload, {
            headers: { "Content-Type": "application/json" },
          });
        } else {
          // Thêm mới tin tức
          const createResponse = await axiosInstance.post(API_NEWS_MANAGEMENT, payload, {
            headers: { "Content-Type": "application/json" },
          });

          finalNewsId = 
            createResponse.data?.data?.id || 
            createResponse.data?.data?._id || 
            createResponse.data?.id || 
            createResponse.data?._id ||
            createResponse.id ||
            createResponse._id;
        }

        // Upload ảnh đại diện nếu có file mới
        if (imageFile) {
          try {
            const formData = new FormData();
            formData.append("file", imageFile);
            formData.append("object_type", "news");
            formData.append("object_id", finalNewsId);
            
            await api.post(API_UPLOAD_FILESS, formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });
          } catch (uploadError) {
            logger.error("Upload thumbnail error:", uploadError);
            // Không throw error, vì tin tức đã cập nhật/tạo xong
          }
        }

        toast(newsId ? "Cập nhật tin tức thành công!" : "Thêm mới tin tức thành công!", "success");
        
        // Sau khi cập nhật thành công → quay về chế độ Chi tiết (view mode)
        if (newsId) {
          setIsEditMode(false);
        }
        
        // Gọi callback để refresh danh sách tin tức bên ngoài
        onSuccess();
      } catch (error) {
        let errorMessage = "Đã có lỗi xảy ra!";
        if (error?.response?.data?.errors && Array.isArray(error.response.data.errors)) {
          errorMessage = error.response.data.errors.map((err) => err.message).join("; ");
        } else if (error?.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error?.message) {
          errorMessage = error.message;
        }
        toast(errorMessage, "error");
      }
    },
    [toast, onSuccess, imageFile, newsId, setIsEditMode] // Thêm setIsEditMode vào dependency
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

  const handleImageUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImageChange = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      if (file) {
        if (file.type.startsWith("image/")) {
          setImageFile(file);
          const reader = new FileReader();
          reader.onloadend = () => {
            setPreviewImage(reader.result);
          };
          reader.readAsDataURL(file);
          setValue("featuredImage", file);
          toast("Đã thêm hình ảnh", "success");
        } else {
          toast("Vui lòng chọn file hình ảnh", "error");
        }
        event.target.value = "";
      }
    },
    [toast, setValue]
  );

  // const handleImageDragOver = useCallback((e) => {
  //   e.preventDefault();
  //   e.stopPropagation();
  // }, []);

  // const handleFeaturedImageDrop = useCallback(
  //   (e) => {
  //     if (!isEditMode) return;
  //     e.preventDefault();
  //     e.stopPropagation();
  //     const file = e.dataTransfer.files?.[0];
  //     if (file) {
  //       if (file.type.startsWith("image/")) {
  //         setImageFile(file);
  //         const reader = new FileReader();
  //         reader.onloadend = () => {
  //           setPreviewImage(reader.result);
  //         };
  //         reader.readAsDataURL(file);
  //         setValue("featuredImage", file);
  //         toast("Đã thêm hình ảnh", "success");
  //       } else {
  //         toast("Vui lòng chọn file hình ảnh", "error");
  //       }
  //     }
  //   },
  //   [toast, setValue, isEditMode]
  // );

  const renderTitleField = useCallback(
    ({ field }) => (
      <InputComponents
        label="Tiêu đề"
        placeholder="Nhập tiêu đề tin tức..."
        disabled={!isEditMode}
        required
        error={!!errors?.title}
        helperText={errors?.title?.message}
        {...field}
      />
    ),
    [errors?.title, isEditMode]
  );

  const renderSummaryField = useCallback(
    ({ field }) => (
      <InputComponents
        label="Tóm tắt"
        placeholder="Nhập tóm tắt tin tức..."
        multiline
        required
        rows={3.6}
        disabled={!isEditMode}
        error={!!errors?.summary}
        helperText={errors?.summary?.message}
        {...field}
      />
    ),
    [errors?.summary, isEditMode]
  );

  // const renderPublishedDateField = useCallback(
  //   ({ field }) => (
  //     <DateTimePicker
  //       label="Ngày xuất bản"
  //       value={field.value}
  //       onChange={field.onChange}
  //       showTime={false}
  //       disabled={!isEditMode}
  //       error={!!errors?.scheduledPublishAt}
  //       helperText={errors?.scheduledPublishAt?.message}
  //     />
  //   ),
  //   [errors?.scheduledPublishAt, isEditMode]
  // );

  const renderTopicField = useCallback(
    ({ field }) => (
      <InputComponents
        select
        label="Chủ đề"
        placeholder={isLoadingTopics ? "Đang tải..." : "Chọn chủ đề..."}
        options={topicOptions}
        customLabel="name"
        customValue="id"
        required
        disabled={!isEditMode || isLoadingTopics}
        error={!!errors?.topic}
        helperText={errors?.topic?.message}
        {...field}
      />
    ),
    [errors?.topic, topicOptions, isEditMode, isLoadingTopics]
  );


  const handleCloseUserList = useCallback(() => {
    setUserListDialog((prev) => ({ ...prev, open: false }));
  }, []);

  const handleUnitFilterChange = useCallback((e) => {
    const val = e?.target ? e.target.value : e;
    setUserListDialog((p) => ({ ...p, unitFilter: val }));
  }, []);


  const handleTagsChange = useCallback(
    (field) => (e) => {
      const tags = e.target?.value || [];
      field.onChange(tags);
    },
    []
  );

  const renderTagsField = useCallback(
    function renderTagsFieldInner({ field }) {
      return (
        <CustomInputTag
          label="Tags"
          placeholder="Nhập #tag rồi nhấn space/comma/enter để tạo tag..."
          value={field.value || []}
          onChange={handleTagsChange(field)}
          error={!!errors?.tags}
          helperText={errors?.tags?.message}
          enableHashtag
          disabled={!isEditMode}
          name="tags"
        />
      );
    },
    [errors?.tags, handleTagsChange, isEditMode]
  );

  const renderReviewerNameField = useCallback(
    ({ field }) => (
      <InputComponents
        label="Người kiểm duyệt"
        placeholder="Nhập tên người kiểm duyệt..."
        disabled={!isEditMode}
        error={!!errors?.reviewerName}
        helperText={errors?.reviewerName?.message}
        {...field}
      />
    ),
    [errors?.reviewerName, isEditMode]
  );

  const renderScheduledPublishAtField = useCallback(
    ({ field }) => (
      <DateTimePicker
        label="Ngày xuất bản"
        value={field.value}
        onChange={field.onChange}
        showTime={false}
        disabled={!isEditMode}
        error={!!errors?.scheduledPublishAt}
        helperText={errors?.scheduledPublishAt?.message}
      />
    ),
    [errors?.scheduledPublishAt, isEditMode]
  );


  const handleCancelClick = useCallback(() => {
    if (newsId) {
      setIsEditMode(false); // Chỉ hủy về view nếu là chỉnh sửa
    } else {
      onClose(); // Nếu là thêm mới → hủy thì đóng form luôn
    }
  }, [newsId, onClose]);

  // --- Interaction Icon Components ---
  const EyeIcon = () => (
    <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.31807 13.8808C2.22438 13.6284 2.22438 13.3508 2.31807 13.0984C3.23056 10.8858 4.77945 8.99407 6.76839 7.6629C8.75733 6.33173 11.0967 5.62109 13.49 5.62109C15.8833 5.62109 18.2228 6.33173 20.2117 7.6629C22.2006 8.99407 23.7495 10.8858 24.662 13.0984C24.7557 13.3508 24.7557 13.6284 24.662 13.8808C23.7495 16.0933 22.2006 17.9851 20.2117 19.3162C18.2228 20.6474 15.8833 21.358 13.49 21.358C11.0967 21.358 8.75733 20.6474 6.76839 19.3162C4.77945 17.9851 3.23056 16.0933 2.31807 13.8808Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13.4899 16.8622C15.3525 16.8622 16.8624 15.3523 16.8624 13.4897C16.8624 11.6271 15.3525 10.1172 13.4899 10.1172C11.6274 10.1172 10.1174 11.6271 10.1174 13.4897C10.1174 15.3523 11.6274 16.8622 13.4899 16.8622Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const HeartIcon = () => (
    <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.24829 10.6776C4.24831 9.42667 4.6278 8.20513 5.33663 7.17436C6.04547 6.14359 7.0503 5.35208 8.21841 4.90437C9.38652 4.45666 10.663 4.37381 11.8792 4.66677C13.0953 4.95973 14.194 5.61471 15.0302 6.5452C15.0891 6.60817 15.1603 6.65837 15.2394 6.69269C15.3184 6.72701 15.4037 6.74472 15.49 6.74472C15.5762 6.74472 15.6615 6.72701 15.7406 6.69269C15.8197 6.65837 15.8909 6.60817 15.9497 6.5452C16.7832 5.60866 17.8822 4.94817 19.1004 4.65166C20.3185 4.35514 21.5981 4.43665 22.7688 4.88535C23.9395 5.33405 24.9458 6.12864 25.6537 7.16338C26.3616 8.19812 26.7376 9.42392 26.7316 10.6776C26.7316 13.252 25.0454 15.1743 23.3591 16.8606L17.1852 22.8333C16.9757 23.0738 16.7175 23.2671 16.4276 23.4002C16.1377 23.5333 15.8228 23.6031 15.5038 23.6052C15.1848 23.6072 14.869 23.5413 14.5775 23.4119C14.2859 23.2825 14.0252 23.0925 13.8127 22.8546L7.62079 16.8606C5.93454 15.1743 4.24829 13.2632 4.24829 10.6776Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const FeedbackIcon = () => (
    <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.99667 13.99L0.5 27.48L27.48 13.99L0.5 0.5L4.99667 13.99ZM4.99667 13.99H13.99" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const CommentIcon = () => (
    <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.2413 3.62109C9.66264 3.98124 8.19343 4.71493 6.95705 5.76052C5.72068 6.8061 4.75323 8.13309 4.13592 9.63003C3.51862 11.127 3.2695 12.7502 3.40947 14.3633C3.54945 15.9765 4.07443 17.5326 4.94035 18.9008L3.37214 23.6055L8.07678 22.0372C9.44502 22.9031 11.001 23.4281 12.6142 23.568C14.2274 23.708 15.8506 23.4589 17.3475 22.8416C18.8444 22.2242 20.1715 21.2568 21.217 20.0205C22.2626 18.7841 22.9963 17.3149 23.3565 15.7362M23.3565 11.2396C22.9319 9.38154 21.9918 7.68099 20.6442 6.33333C19.2965 4.98566 17.5959 4.04557 15.738 3.62109M19.1105 13.4879C19.1105 11.9972 18.5183 10.5675 17.4642 9.51337C16.4101 8.45927 14.9804 7.86707 13.4896 7.86707M14.6138 13.4879C14.6138 13.1898 14.4954 12.9038 14.2845 12.693C14.0737 12.4822 13.7878 12.3637 13.4896 12.3637" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const handleOpenUserList = useCallback(
    async (type) => {
      if (!newsId) return;

      const titleMap = {
        views: "Danh sách lượt xem",
        likes: "Danh sách lượt thích",
        feedbackNews: "Danh sách góp ý",
        comments: "Danh sách bình luận"
      };
      
      let endpoint = "";
      if (type === "views") endpoint = "viewers";
      else if (type === "likes") endpoint = "likes";
      else if (type === "feedbackNews") endpoint = "comments?type=feedbackNews";
      else if (type === "comments") endpoint = "comments";

      setUserListDialog((prev) => ({
        ...prev,
        open: true,
        title: titleMap[type] || "Danh sách",
        loading: true,
        data: [],
      }));

      try {
        const response = await axiosInstance.get(
          `${API_NEWS_MANAGEMENT}/${newsId}/${endpoint}`
        );
        
        let resultData = [];
        const rawData = response?.data || response;
        
        if (type === "likes") {
          resultData = rawData?.data?.likes || rawData?.likes || (Array.isArray(rawData?.data) ? rawData.data : []);
        } else {
          resultData = Array.isArray(rawData?.data) ? rawData.data : (Array.isArray(rawData) ? rawData : []);
        }

        setUserListDialog((prev) => ({
          ...prev,
          data: resultData,
          loading: false,
        }));
      } catch (error) {
        toast(`Không thể tải danh sách ${type}`, "error");
        setUserListDialog((prev) => ({ ...prev, loading: false }));
      }
    },
    [newsId, toast]
  );

  const handleOpenViewsList = useCallback(() => {
    handleOpenUserList("views");
  }, [handleOpenUserList]);

  const handleOpenLikesList = useCallback(() => {
    handleOpenUserList("likes");
  }, [handleOpenUserList]);

  const handleOpenFeedbackList = useCallback(() => {
    handleOpenUserList("feedbackNews");
  }, [handleOpenUserList]);

  const handleOpenCommentsList = useCallback(() => {
    handleOpenUserList("comments");
  }, [handleOpenUserList]);

  const handleToggleComment = useCallback(
    (field) => () => {
      if (isEditMode) field.onChange(!field.value);
    },
    [isEditMode]
  );

  const handleToggleImportant = useCallback(
    (field) => () => {
      if (isEditMode) {
        field.onChange(field.value === "true" ? "false" : "true");
      }
    },
    [isEditMode]
  );

  const renderCommentSwitch = useCallback(
    ({ field }) => (
      <StatusItem>
        <StatusCircle
          active={field.value}
          isEditMode={isEditMode}
          onClick={handleToggleComment(field)}
        />
        <StatusLabel>Bình luận</StatusLabel>
      </StatusItem>
    ),
    [handleToggleComment, isEditMode]
  );

  const renderImportantRadio = useCallback(
    ({ field }) => (
      <StatusItem>
        <StatusCircle
          active={field.value === "true"}
          isEditMode={isEditMode}
          onClick={handleToggleImportant(field)}
        />
        <StatusLabel>Tin quan trọng</StatusLabel>
      </StatusItem>
    ),
    [handleToggleImportant, isEditMode]
  );

  // const renderContentField = useCallback(
  //   () => (
  //     <Box>
  //       <EditorWrapper>
  //         {/* <EditorMenuBar
  //           editor={editor}
  //           onImageClick={handleOpenImageDialog}
  //           onLinkClick={handleOpenLinkDialog}
  //         /> */}
  //         <EditorContentWrapper>
  //           <EditorContent editor={editor} />
  //         </EditorContentWrapper>
  //       </EditorWrapper>
  //       {errors?.content && <ErrorText>{errors.content.message}</ErrorText>}
  //     </Box>
  //   ),
  //   [editor, errors?.content]
  // );

  return (
    <CustomSwipper
      key={open ? (newsId ? "edit-news-open" : "add-news-open") : "news-closed"}
      open={open && isReady}
      onClose={onClose}
      title={
        newsId
          ? isEditMode
            ? "Chỉnh sửa tin tức"
            : "Chi tiết tin tức"
          : "Soạn tin"
      }
      type={newsId ? "view" : "edit"}
      screenType="news"
      moreActions={
        isEditMode ? (
          // Chế độ chỉnh sửa (cả khi sửa cũ lẫn thêm mới)
          <>
            <UploadButton
              onClick={handleSaveClick}
              variant="contained"
              size="medium"
            >
              Lưu
            </UploadButton>
            <ButtonOutline
              onClick={handleCancelClick}
              variant="outlined"
              size="medium"
            >
              Hủy
            </ButtonOutline>
          </>
        ) : null
      }
      hideBackdrop
    >
      <PageLayoutWrapper>
        <MainContentArea>
          <FormContainer>
            <DisabledInputWrapper>
              <MainCard>
                <Grid container spacing={4}>
                  {/* QUẢN LÝ THU HỒI */}
                  <Grid item xs={12}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={8}>
                        <Grid container spacing={3}>
                          <Grid item xs={12} sm={6}>
                            <InputComponents
                              label="Người thu hồi"
                              placeholder="Người thu hồi..."
                              value={recalledByName}
                              disabled
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <DateTimePicker
                              label="Ngày thu hồi"
                              value={recalledAt}
                              showTime={false}
                              disabled
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Controller
                              name="reviewerName"
                              control={control}
                              render={renderReviewerNameField}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Controller
                              name="scheduledPublishAt"
                              control={control}
                              render={renderScheduledPublishAtField}
                            />
                          </Grid>
                        </Grid>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <InputComponents
                          label="Lý do thu hồi"
                          placeholder="Nhập tóm tắt tin tức..."
                          multiline
                          rows={3.6}
                          value={recallReasonData}
                          disabled
                        />
                      </Grid>
                    </Grid>
                  </Grid>

                  {/* THÔNG TIN CƠ BẢN */}
                  <Grid item xs={12}>
                    <SectionTitle>THÔNG TIN CƠ BẢN</SectionTitle>
                    <Grid container spacing={3}>
                      {/* Left: 8 units */}
                      <Grid item xs={12} md={8}>
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
                                name="summary"
                                control={control}
                                render={renderSummaryField}
                              />
                           </Grid>
                           <Grid item xs={12}>
                              <AlignedGridContainer container spacing={3}>
                                 <Grid item xs={12} sm={6}>
                                    <Controller
                                      name="tags"
                                      control={control}
                                      render={renderTagsField}
                                    />
                                 </Grid>
                                  <Grid item xs={12} sm={6}>
                                    <StatusContainer>
                                      <Controller
                                        name="isComment"
                                        control={control}
                                        render={renderCommentSwitch}
                                      />
                                      <Controller
                                        name="isImportant"
                                        control={control}
                                        render={renderImportantRadio}
                                      />
                                    </StatusContainer>
                                  </Grid>
                              </AlignedGridContainer>
                           </Grid>

                           {/* INTERACTION BAR */}
                           <Grid item xs={12}>
                             <div style={{ display: 'flex', gap: '67px', marginTop: '24px', marginBottom: '16px', alignItems: 'center', justifyContent: 'center' }}>
                               <InteractionItem onClick={handleOpenViewsList}>
                                 <EyeIcon />
                                 <InteractionCount>{interaction.views}</InteractionCount>
                               </InteractionItem>

                               <InteractionItem onClick={handleOpenLikesList}>
                                 <HeartIcon />
                                 <InteractionCount>{interaction.likes}</InteractionCount>
                               </InteractionItem>

                               <InteractionItem onClick={handleOpenFeedbackList}>
                                 <FeedbackIcon />
                                 <InteractionCount>{interaction.feedbackCount}</InteractionCount>
                               </InteractionItem>

                               <InteractionItem onClick={handleOpenCommentsList}>
                                 <CommentIcon />
                                 <InteractionCount>{interaction.comments}</InteractionCount>
                               </InteractionItem>
                             </div>
                           </Grid>
                        </Grid>
                      </Grid>

                      {/* Right: 4 units */}
                      <Grid item xs={12} md={4}>
                        <Grid container spacing={3}>
                           <Grid item xs={12}>
                              <Controller
                                name="topic"
                                control={control}
                                render={renderTopicField}
                              />
                           </Grid>
                           <Grid item xs={12}>
                              <Controller
                                name="createdDate"
                                control={control}
                                render={({ field }) => (
                                  <DateTimePicker
                                    label="Ngày tạo"
                                    required
                                    value={field.value}
                                    onChange={field.onChange}
                                    disabled={!isEditMode}
                                  />
                                )}
                              />
                           </Grid>
                           <Grid item xs={12}>
                              <Controller
                                name="imageTitle"
                                control={control}
                                render={({ field }) => (
                                  <InputComponents
                                    label="Ảnh bìa"
                                    placeholder="Nhập tên ảnh"
                                    disabled={!isEditMode}
                                    {...field}
                                  />
                                )}
                              />
                           </Grid>
                           <Grid item xs={12}>
                              <ImageAreaWrapper>
                                <UploadAreaBoxWrapper
                                  onClick={isEditMode ? handleImageUploadClick : undefined}
                                >
                                  {previewImage ? (
                                    <PreviewImageStyledContainer
                                      component={AuthImage}
                                      src={previewImage}
                                      alt="Preview"
                                    />
                                  ) : (
                                    <UploadPlaceholder>
                                      <ActionHeaderBox>
                                        <ActionIconButton >
                                          <AttachFileIcon />
                                        </ActionIconButton>
                                      </ActionHeaderBox>
                                      <UploadTextBold>
                                        Kéo thả hoặc nhấp để tải hình ảnh
                                      </UploadTextBold>
                                      <UploadSubText>
                                        WEBP, PNG, JPG, GIF (tối đa 5MB)
                                      </UploadSubText>
                                    </UploadPlaceholder>
                                  )}
                                </UploadAreaBoxWrapper>

                                {isEditMode && (
                                  <HiddenFileInput
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                  />
                                )}
                              </ImageAreaWrapper>
                           </Grid>
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>

                  {/* NỘI DUNG CHÍNH */}
                  <Grid item xs={12}>
                    <SectionTitle>NỘI DUNG CHÍNH</SectionTitle>
                    <MainContentBox>
                      {isEditorReady(editor) && <EditorContent editor={editor} />}
                    </MainContentBox>
                  </Grid>
                </Grid>
              </MainCard>
            </DisabledInputWrapper>
          </FormContainer>
        </MainContentArea>

        {/* Right Side Panel - pushes content */}
        <SidePanelContainer open={userListDialog.open}>
          {/* Panel Header */}
          <UserListDrawerHeader>
            <UserListDrawerTitleBox>
              <TitleIndicator />
              <span style={{ fontWeight: 700, fontSize: "18px" }}>
                {userListDialog.title || "Danh sách"}
              </span>
            </UserListDrawerTitleBox>
            <IconButton onClick={handleCloseUserList} size="small">
              <CloseIconDrawer />
            </IconButton>
          </UserListDrawerHeader>

          {/* Unit Filter - Only show if not feedback */}
          {userListDialog.title !== "Danh sách góp ý" && (
            <UnitFilterBox>
              <InputComponents
                select
                label="Đơn vị"
                placeholder="Tất cả đơn vị"
                size="small"
                options={unitOptions}
                value={userListDialog.unitFilter}
                onChange={handleUnitFilterChange}
              />
            </UnitFilterBox>
          )}

          {/* Panel Content */}
          <UserListDialogContent>
            {userListDialog.loading ? (
              <EmptyDataBox>
                <LoadingText variant="body2">Đang tải...</LoadingText>
              </EmptyDataBox>
            ) : userListDialog.data.length === 0 ? (
              <EmptyDataBox>
                <NoDataText variant="body2">Chưa có dữ liệu</NoDataText>
              </EmptyDataBox>
            ) : (
              <UserListContainer>
                {filteredUserList.map((user, index) => (
                  <UserListItem key={user.userId || index}>
                    <UserAvatarIcon
                      ImgComponent={AuthImage}
                      src={user.avatarUrl && `${APP_BASE}/api/files/view/${user.avatarUrl}`}
                    >
                      {(user.userName || user.username || "U")[0].toUpperCase()}
                    </UserAvatarIcon>
                    <UserInfo>
                      <UserName variant="subtitle2">
                        {user.userName || user.username}
                      </UserName>
                      <UserMetaRow>
                        <UserActionStatus variant="caption">
                          {user.unitName || "Chưa xác định"}
                        </UserActionStatus>
                        {(user.viewedAt || user.createdAt) && (
                          <UserActionTime variant="caption">
                            • {dayjs(user.viewedAt || user.createdAt).format("DD/MM/YYYY")}
                          </UserActionTime>
                        )}
                      </UserMetaRow>
                      {user.content && (
                        <FeedbackBubble>
                          <FeedbackContent variant="body2">
                            {user.content}
                          </FeedbackContent>
                        </FeedbackBubble>
                      )}
                    </UserInfo>
                  </UserListItem>
                ))}
              </UserListContainer>
            )}
          </UserListDialogContent>
          <UserListDialogActions />
        </SidePanelContainer>
      </PageLayoutWrapper>
    </CustomSwipper>
  );
}

export default withSharedComponents(ViewRecall);