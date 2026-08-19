// File: src/components/AddNews/index.jsx
import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  Grid,
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
} from "@mui/material";
import dayjs from "dayjs";
import withSharedComponents from "@components/WrapperComponent";
import { useForm, Controller } from "react-hook-form";
import AuthImage from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimImage';
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import axiosInstance from "@utils/axiosInstance";
import api from "@services/api";
import {
  API_NEWS_MANAGEMENT,
  API_UPLOAD_FILESS,
  APP_BASE,
} from "@EnvironmentFile/constants/urlConfig";
import { withFormWrapper, FormItem } from "@components/common/FormWrapper";

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
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { useFilePreview } from "@components/FilePreview/useFilePreview";
import FilePreviewModal from "@components/FilePreview/FilePreviewModal";
import { useAttachmentClick } from "@hooks/useAttachmentClick";
import {
  handleCompressedFileDownload,
  handleDefaultFileClick,
} from "@services/FileUpload/fileUpload";

// Import Material Icons
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";
import StrikethroughSIcon from "@mui/icons-material/StrikethroughS";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft";
import FormatAlignCenterIcon from "@mui/icons-material/FormatAlignCenter";
import FormatAlignRightIcon from "@mui/icons-material/FormatAlignRight";
import FormatAlignJustifyIcon from "@mui/icons-material/FormatAlignJustify";
import CodeIcon from "@mui/icons-material/Code";
import LinkIcon from "@mui/icons-material/Link";
import ImageIcon from "@mui/icons-material/Image";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import LoadingDialog from "@components/LoadingDialog";
import { StyledDialogContent, CancelButton, SaveButton} from "@styles/CustomDialog.styles";
import {
  FormContainer,
  MainCard,
  SectionTitle,
  UploadIcon,
  UploadText,
  UploadSwitch,
  HiddenFileInput,
  UploadButton,
  SubSectionTitle,
  EditorWrapper,
  MenuBar,
  MenuButton,
  HeadingButton,
  ToolbarDivider,
  EditorContentWrapper,
  ErrorText,
  PreviewImageStyledContainer,
  UploadPlaceholder,
  UploadAreaStyled,
  DisabledInputWrapper,
  ImageUploadBox,
  DialogContentStyled,
  DialogActionsStyled,
  ImageIconStyled,
  InputWrapper,
  LinkDialogContentStyled,
  LinkDialogActionsStyled,
  TitleContainer,
  InfoBox
} from "./NewsStyles.styles";

// Schema validation
const newsSchema = yup.object().shape({
  title: yup.string().required("Tiêu đề là bắt buộc"),
  summary: yup.string().required("Tóm tắt tin tức là bắt buộc"),
  createdDate: yup.date().required("Ngày tạo là bắt buộc").nullable(),
  scheduledPublishAt: yup.date().nullable(),
  rejectReason: yup.string(),
  rejectorName: yup.string(),
  topic: yup.string().required("Chủ đề là bắt buộc"),
  tags: yup.array(),
  featuredImage: yup.mixed().nullable(),
  imageTitle: yup.string(),
  content: yup.string().required("Nội dung chính là bắt buộc"),
  isComment: yup.boolean(),
  isImportant: yup.boolean(),
});

const isEditorReady = (editor) => !!editor && !editor.isDestroyed;

// Menu Bar Component
function EditorMenuBar({ editor, onImageClick, onLinkClick }) {
  const handleBold = useCallback(() => {
    isEditorReady(editor) && editor.chain().focus().toggleBold().run();
  }, [editor]);

  const handleItalic = useCallback(() => {
    isEditorReady(editor) && editor.chain().focus().toggleItalic().run();
  }, [editor]);

  const handleUnderline = useCallback(() => {
    isEditorReady(editor) && editor.chain().focus().toggleUnderline().run();
  }, [editor]);

  const handleStrike = useCallback(() => {
    isEditorReady(editor) && editor.chain().focus().toggleStrike().run();
  }, [editor]);

  const handleHeading1 = useCallback(() => {
    isEditorReady(editor) && editor.chain().focus().toggleHeading({ level: 1 }).run();
  }, [editor]);

  const handleHeading2 = useCallback(() => {
    isEditorReady(editor) && editor.chain().focus().toggleHeading({ level: 2 }).run();
  }, [editor]);

  const handleHeading3 = useCallback(() => {
    isEditorReady(editor) && editor.chain().focus().toggleHeading({ level: 3 }).run();
  }, [editor]);

  const handleBulletList = useCallback(() => {
    isEditorReady(editor) && editor.chain().focus().toggleBulletList().run();
  }, [editor]);

  const handleOrderedList = useCallback(() => {
    isEditorReady(editor) && editor.chain().focus().toggleOrderedList().run();
  }, [editor]);

  const handleAlignLeft = useCallback(() => {
    isEditorReady(editor) && editor.chain().focus().setTextAlign("left").run();
  }, [editor]);

  const handleAlignCenter = useCallback(() => {
    isEditorReady(editor) && editor.chain().focus().setTextAlign("center").run();
  }, [editor]);

  const handleAlignRight = useCallback(() => {
    isEditorReady(editor) && editor.chain().focus().setTextAlign("right").run();
  }, [editor]);

  const handleAlignJustify = useCallback(() => {
    isEditorReady(editor) && editor.chain().focus().setTextAlign("justify").run();
  }, [editor]);

  const handleCode = useCallback(() => {
    isEditorReady(editor) && editor.chain().focus().toggleCode().run();
  }, [editor]);

  const handleAddLink = useCallback(() => {
    onLinkClick?.();
  }, [onLinkClick]);

  const handleAddImage = useCallback(() => {
    onImageClick?.();
  }, [onImageClick]);

  const handleUndo = useCallback(() => {
    isEditorReady(editor) && editor.chain().focus().undo().run();
  }, [editor]);

  const handleRedo = useCallback(() => {
    isEditorReady(editor) && editor.chain().focus().redo().run();
  }, [editor]);

  if (!isEditorReady(editor)) return null;

  return (
    <MenuBar>
      {/* Text Formatting */}
      <MenuButton
        active={editor.isActive("bold")}
        onClick={handleBold}
        title="Bold (Ctrl+B)"
      >
        <FormatBoldIcon />
      </MenuButton>

      <MenuButton
        active={editor.isActive("italic")}
        onClick={handleItalic}
        title="Italic (Ctrl+I)"
      >
        <FormatItalicIcon />
      </MenuButton>

      <MenuButton
        active={editor.isActive("underline")}
        onClick={handleUnderline}
        title="Underline (Ctrl+U)"
      >
        <FormatUnderlinedIcon />
      </MenuButton>

      <MenuButton
        active={editor.isActive("strike")}
        onClick={handleStrike}
        title="Strikethrough"
      >
        <StrikethroughSIcon />
      </MenuButton>

      <ToolbarDivider orientation="vertical" />

      {/* Headings */}
      <HeadingButton
        active={editor.isActive("heading", { level: 1 })}
        onClick={handleHeading1}
        title="Heading 1"
      >
        H1
      </HeadingButton>

      <HeadingButton
        active={editor.isActive("heading", { level: 2 })}
        onClick={handleHeading2}
        title="Heading 2"
      >
        H2
      </HeadingButton>

      <HeadingButton
        active={editor.isActive("heading", { level: 3 })}
        onClick={handleHeading3}
        title="Heading 3"
      >
        H3
      </HeadingButton>

      <ToolbarDivider orientation="vertical" />

      {/* Lists */}
      <MenuButton
        active={editor.isActive("bulletList")}
        onClick={handleBulletList}
        title="Bullet List"
      >
        <FormatListBulletedIcon />
      </MenuButton>

      <MenuButton
        active={editor.isActive("orderedList")}
        onClick={handleOrderedList}
        title="Numbered List"
      >
        <FormatListNumberedIcon />
      </MenuButton>

      <ToolbarDivider orientation="vertical" />

      {/* Text Alignment */}
      <MenuButton
        active={editor.isActive({ textAlign: "left" })}
        onClick={handleAlignLeft}
        title="Align Left"
      >
        <FormatAlignLeftIcon />
      </MenuButton>

      <MenuButton
        active={editor.isActive({ textAlign: "center" })}
        onClick={handleAlignCenter}
        title="Align Center"
      >
        <FormatAlignCenterIcon />
      </MenuButton>

      <MenuButton
        active={editor.isActive({ textAlign: "right" })}
        onClick={handleAlignRight}
        title="Align Right"
      >
        <FormatAlignRightIcon />
      </MenuButton>

      <MenuButton
        active={editor.isActive({ textAlign: "justify" })}
        onClick={handleAlignJustify}
        title="Align Justify"
      >
        <FormatAlignJustifyIcon />
      </MenuButton>

      <ToolbarDivider orientation="vertical" />

      {/* Code */}
      <MenuButton
        active={editor.isActive("code")}
        onClick={handleCode}
        title="Inline Code"
      >
        <CodeIcon />
      </MenuButton>

      {/* Link & Image */}
      <MenuButton
        active={editor.isActive("link")}
        onClick={handleAddLink}
        title="Insert Link"
      >
        <LinkIcon />
      </MenuButton>

      <MenuButton onClick={handleAddImage} title="Insert Image">
        <ImageIcon />
      </MenuButton>

      <ToolbarDivider orientation="vertical" />

      {/* Undo/Redo */}
      <MenuButton
        onClick={handleUndo}
        disabled={!editor.can().undo()}
        title="Undo (Ctrl+Z)"
      >
        <UndoIcon />
      </MenuButton>

      <MenuButton
        onClick={handleRedo}
        disabled={!editor.can().redo()}
        title="Redo (Ctrl+Shift+Z)"
      >
        <RedoIcon />
      </MenuButton>
    </MenuBar>
  );
}

function ViewNewReacts({ open, onClose, onSuccess, sharedComponents, newsId }) {
  const {
    ButtonOutline,
    InputComponents: BaseInput,
    DateTimePicker: BaseDateTimePicker,
    toast,
  } = sharedComponents;

  const [isEditMode, setIsEditMode] = useState(false);
  const isView = !isEditMode;

  // Wrapper components để đưa label lên phía trên input
  const InputComponents = useMemo(() => {
    const Wrapped = withFormWrapper(BaseInput, "input");
    const Component = ({ label, required, isView: propIsView, ...props }) => (
      <FormItem label={label} required={required} isView={false}>
        <Wrapped {...props} label={null} isView={propIsView ?? isView} />
      </FormItem>
    );
    Component.displayName = "InputComponents";
    return Component;
  }, [isView, BaseInput]);

    const InputTag = useMemo(() => {
    const Wrapped = withFormWrapper(CustomInputTag, "input");
    const Component = ({ label, required, isView: propIsView, ...props }) => (
      <FormItem label={label} required={required} isView={false}>
        <Wrapped {...props} label={null} isView={propIsView ?? isView} />
      </FormItem>
    );
    Component.displayName = "InputTag";
    return Component;
  }, [isView]);

  const DateTimePicker = useMemo(() => {
    const Wrapped = withFormWrapper(BaseDateTimePicker, "date");
    const Component = ({ label, required, isView: propIsView, ...props }) => (
      <FormItem label={label} required={required} isView={false}>
        <Wrapped {...props} label={null} isView={propIsView ?? isView} />
      </FormItem>
    );
    Component.displayName = "DateTimePicker";
    return Component;
  }, [isView, BaseDateTimePicker]);

  const [isReady, setIsReady] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [detailData, setDetailData] = useState({});
  const fileInputRef = React.useRef(null);

  // State cho dialog upload ảnh
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const imageUploadInputRef = React.useRef(null);
  const [editorImageTitle, setEditorImageTitle] = useState(""); // Tên ảnh cho editor

  // State cho dialog insert linkonSubmitForm 
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  const [, setInteraction] = useState({
    views: 0,
    likes: 0,
    comments: 0,
  });



  const [topicOptions, setTopicOptions] = useState([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);

  // State cho workflow actions
  const [canSubmitNews, setCanSubmitNews] = useState(false);
  const [isSubmittingNews, setIsSubmittingNews] = useState(false);
  const [hasSuccessRefresh, setHasSuccessRefresh] = useState(false);

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
      rejectReason: "",
      rejectorName: "",
      topic: "",
      tags: "",
      featuredImage: null,
      imageTitle: "",
      content: "",
      isComment: true,
      isImportant: false,
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

  const handleCloseDrawer = useCallback(() => {
    if (hasSuccessRefresh) {
      onSuccess?.();
    }
    onClose();
  }, [hasSuccessRefresh, onSuccess, onClose]);

  const extensions = useMemo(() => [
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
  ], []);

  const {
    previewOpen,
    previewUrl,
    previewFileName,
    isPreviewLoading,
    verificationResult,
    handlePreview,
    handleClosePreview,
  } = useFilePreview();

  const handlePreviewRef = React.useRef(handlePreview);
  useEffect(() => {
    handlePreviewRef.current = handlePreview;
  }, [handlePreview]);

  const handleFileClick = useCallback(
    (params) => handleDefaultFileClick({ ...params, handlePreview }),
    [handlePreview]
  );

  const handleArticleClick = useAttachmentClick(handleFileClick);

  const editor = useEditor({
    extensions,
    content: contentValue || "",
    onUpdate: handleEditorUpdate,
    editable: isEditMode,
    editorProps: {
      attributes: {
        "data-placeholder": "Nhập nội dung tin tức...",
      },
      handleClick(view, pos, event) {
        const anchor = event.target.closest("a");
        if (anchor) {
          const href = anchor.getAttribute("href");
          const isFileLink =
            anchor.classList.contains("file-attachment-link") ||
            (href && href.includes("/api/files/view/"));
          if (isFileLink) {
            const match = href ? href.match(/\/api\/files\/view\/([a-zA-Z0-9]+)/) : null;
            const fileId = match ? match[1] : null;
            const fileName = anchor.textContent?.trim() || anchor.innerText?.trim() || "Tài liệu";

            if (handleCompressedFileDownload({ href, fileName, fileId, event })) {
              return true;
            }

            if (fileId) {
              // File nội bộ → mở preview modal
              event.preventDefault();
              event.stopPropagation();
              handlePreviewRef.current({ id: fileId, fileName, href });
              return true;
            } else {
              // URL bên ngoài → mở tab mới bình thường
              event.preventDefault();
              event.stopPropagation();
              window.open(href, "_blank", "noopener,noreferrer");
              return true;
            }
          }
        }
        return false;
      },
    },
  });

  // useEffect: Cập nhật trạng thái editable của editor khi isEditMode thay đổi
  useEffect(() => {
    if (isEditorReady(editor)) {
      editor.setEditable(isEditMode);
    }
  }, [editor, isEditMode]);

  // Fetch chi tiết tin tức
  const getNewsDetail = useCallback(async () => {
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
          createdDate: data.publishedAt
            ? dayjs(data.publishedAt, "YYYY-MM-DD")
            : dayjs(),
          scheduledPublishAt: data.scheduledPublishAt
            ? dayjs(data.scheduledPublishAt, "YYYY-MM-DD")
            : null,
          rejectReason: data.rejectReason || "",
          rejectorName: data.rejectorName || "",
          topic: data.topic || "",
          tags: data.tags
            ? typeof data.tags === "string"
              ? data.tags
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter((tag) => tag)
              : Array.isArray(data.tags)
                ? data.tags
                : []
            : [],
          featuredImage: null,
          imageTitle: data.nameThumbnail || "",
          content: data.content || "",
          isComment: data.isComment ?? true,
          isImportant: data.isImportant ?? false,
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
          } catch (imageError) {
            logger.error("Lỗi tải ảnh:", imageError);
            // Fallback: dùng URL trực tiếp nếu API fail
            if (data.thumbnail?.id) {
              const imageUrl = `${APP_BASE}/api/files/view/${data.thumbnail.id}`;
              setPreviewImage(imageUrl);
            }
          }
        } // === THÊM PHẦN TƯƠNG TÁC TẠI ĐÂY ===
        setInteraction({
          views: data.viewCount || 0,
          likes: data.likeCount || 0,
          comments: data.commentCount || 0,
        });

        reset(mappedData);
        setDetailData(data);

        setIsReady(true);
        // setIsEditMode(false); // Controlled outside

        // Lấy các cờ phân quyền action
        const flags = data.actionFlags || {};
        setCanSubmitNews(flags.canSubmitNews === true);

      } catch (error) {
        // logger.error("Lỗi lấy chi tiết tin tức:", error);
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
      setCanSubmitNews(false);
    }
  }, [open, newsId, reset, toast, onClose]);

  // useEffect: Đẩy nội dung vào editor khi editor sẵn sàng hoặc detailData thay đổi
  // (tách riêng khỏi getNewsDetail để tránh việc editor chuyển từ null -> instance
  // làm getNewsDetail bị tạo lại và effect fetch chạy thêm 1 lần nữa)
  useEffect(() => {
    if (isEditorReady(editor) && detailData) {
      editor.commands.setContent(detailData.content || "");
    }
  }, [editor, detailData]);

  // useEffect: Fetch chi tiết tin tức khi có newsId
  useEffect(() => {
    getNewsDetail();
    if (open && newsId) setIsEditMode(false);
  }, [getNewsDetail, open, newsId]);

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
      if (isSaving) return;
      try {
        setIsSaving(true);
        // Validate dữ liệu trước khi gửi
        if (!data.title?.trim()) throw new Error("Tiêu đề không được để trống");
        if (!data.summary?.trim())
          throw new Error("Tóm tắt không được để trống");
        if (!data.content?.trim())
          throw new Error("Nội dung không được để trống");
        if (!data.topic?.trim()) throw new Error("Chủ đề không được để chọn");

        // Gửi raw JSON
        const payload = {
          title: String(data.title || "").trim(),
          summary: String(data.summary || "").trim(),
          content: String(data.content || "").trim(),
          isComment: data.isComment === true,
          topic: String(data.topic || "").trim(),
          tags: String(data.tags || "").trim(),
          publishedAt: dayjs(data.createdDate).format("YYYY-MM-DD"),
          rejectReason: String(data.rejectReason || "").trim(),
        };

        // Thêm ngày xuất bản theo lịch nếu có
        if (data.scheduledPublishAt) {
          payload.scheduledPublishAt = dayjs(data.scheduledPublishAt).format(
            "YYYY-MM-DD"
          );
        }

        // Thêm tên ảnh nếu có
        if (data.imageTitle?.trim()) {
          payload.nameThumbnail = String(data.imageTitle || "").trim();
        }

        let finalNewsId = newsId;

        // Kiểm tra là tạo mới hay cập nhật
        if (newsId) {
          // Cập nhật tin tức
          await axiosInstance.patch(
            `${API_NEWS_MANAGEMENT}/${newsId}`,
            payload,
            {
              headers: { "Content-Type": "application/json" },
            }
          );
        } else {
          // Thêm mới tin tức
          const createResponse = await axiosInstance.post(
            API_NEWS_MANAGEMENT,
            payload,
            {
              headers: { "Content-Type": "application/json" },
            }
          );

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

        toast(
          newsId
            ? "Cập nhật tin tức thành công!"
            : "Thêm mới tin tức thành công!",
          "success"
        );

        // Sau khi cập nhật thành công → quay về chế độ Chi tiết (view mode)
        if (newsId) {
          setIsEditMode(false);
          await getNewsDetail();
        }

        // Gọi callback để refresh danh sách tin tức bên ngoài
        onSuccess?.();
      } catch (error) {
        let errorMessage = "Đã có lỗi xảy ra!";
        if (
          error?.response?.data?.errors &&
          Array.isArray(error.response.data.errors)
        ) {
          errorMessage = error.response.data.errors
            .map((err) => err.message)
            .join("; ");
        } else if (error?.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error?.message) {
          errorMessage = error.message;
        }
        toast(errorMessage, "error");
      } finally {
        setIsSaving(false);
      }
    },
    [toast, onSuccess, imageFile, newsId, setIsEditMode, isSaving, getNewsDetail] // Thêm setIsEditMode vào dependency
  );

  // Hàm Trình duyệt - gọi API detail và submit
  const handleBrowseNews = useCallback(async () => {
    // Prevent multiple submit
    if (isSubmittingNews || !newsId) return;

    try {
      setIsSubmittingNews(true);

      // Gọi API lấy chi tiết tin tức vừa tạo
      const detailResponse = await axiosInstance.get(
        `${API_NEWS_MANAGEMENT}/${newsId}`,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      const newsData =
        detailResponse.data?.document ||
        detailResponse.data?.data ||
        detailResponse.data ||
        detailResponse;

      // Lấy workItem ID từ dữ liệu trả về
      const currentWorkItem = newsData?.currentUserWorkItem;
      if (!currentWorkItem || !currentWorkItem.id) {
        throw new Error("Không tìm thấy thông tin quy trình xử lý");
      }

      // Lấy workflow action "TRINH_DUYET"
      const availableActions = newsData?.availableActions || [];
      const submitAction = availableActions.find(
        (action) => action.code === "TRINH_DUYET"
      );

      if (!submitAction || !submitAction.canExecute) {
        throw new Error("Không có quyền trình duyệt tin tức này");
      }

      // Lấy roleCode từ currentUserWorkItem.role và processKey từ currentUserWorkItem.bpmnVersion
      const roleCode = "NGUOI_PHE_DUYET";
      const processKey = currentWorkItem.bpmnVersion;

      if (!roleCode || !processKey) {
        throw new Error("Không tìm thấy thông tin roleCode hoặc processKey");
      }

      // Gọi API submit với payload
      const submitPayload = {
        ids: [newsId],
        roleCode: roleCode,
        processKey: processKey,
        note: "Đề nghị phê duyệt tin tức này",
      };

      await axiosInstance.post(
        `${APP_BASE}/api/news/submit/${currentWorkItem.id}`,
        submitPayload,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      toast("Trình duyệt tin tức thành công!", "success");

      setHasSuccessRefresh(true);
      onSuccess?.();
      handleCloseDrawer();
    } catch (error) {
      let errorMessage = "Đã có lỗi xảy ra!";
      if (
        error?.response?.data?.errors &&
        Array.isArray(error.response.data.errors)
      ) {
        errorMessage = error.response.data.errors
          .map((err) => err.message)
          .join("; ");
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      toast(errorMessage, "error");
    } finally {
      setIsSubmittingNews(false);
    }
  }, [
    isSubmittingNews,
    newsId,
    toast,
    handleCloseDrawer,
    onSuccess,
  ]);

  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  // Xử lý click nút Trình duyệt
  const handleBrowseClick = useCallback(() => {
    setConfirmSubmitOpen(true);
  }, []);

  const handleConfirmSubmit = useCallback(() => {
    setConfirmSubmitOpen(false);
    handleBrowseNews();
  }, [handleBrowseNews]);

  const handleCancelSubmit = useCallback(() => {
    setConfirmSubmitOpen(false);
  }, []);

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



  // Xử lý upload ảnh vào editor
  const handleOpenImageDialog = useCallback(() => {
    setImageDialogOpen(true);
    setImageUrl("");
  }, []);

  const handleCloseImageDialog = useCallback(() => {
    setImageDialogOpen(false);
    setImageUrl("");
    setEditorImageTitle("");
  }, []);

  const handleUploadImageFile = useCallback(
    async (eventOrFile) => {
      let file;
      if (eventOrFile.target) {
        file = eventOrFile.target.files?.[0];
      } else {
        file = eventOrFile;
      }
      if (file && file.type.startsWith("image/")) {
        try {
          // Kiểm tra xem có newsId không
          if (!newsId) {
            toast(
              "Vui lòng lưu tin tức trước khi thêm ảnh vào nội dung",
              "warning"
            );
            if (eventOrFile.target) eventOrFile.target.value = "";
            return;
          }

          // Upload ảnh lên server ngay
          const formData = new FormData();
          formData.append("file", file);
          formData.append("object_type", "news");
          formData.append("object_id", newsId);

          const uploadResponse = await api.post(API_UPLOAD_FILESS, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          // Lấy URL của ảnh từ response
          const fileId =
            uploadResponse?.data?.data?.id ||
            uploadResponse?.data?.data?._id ||
            uploadResponse?.data?.id ||
            uploadResponse?.data?._id;

          if (!fileId) {
            throw new Error("Không lấy được ID ảnh từ server");
          }

          const imageUrl = `${APP_BASE}/api/files/view/${fileId}`;

          // Chèn ảnh vào editor với URL thực từ server
          if (isEditorReady(editor)) {
            const title = editorImageTitle.trim();
            let htmlContent = `<img src="${imageUrl}" alt="${title || file.name}" title="${title || file.name}" />`;
            if (title) {
              htmlContent += `<p style="text-align: center"><em>${title}</em></p>`;
            }
            editor.chain().focus().insertContent(htmlContent).run();
          }

          toast("Đã thêm ảnh vào trình soạn thảo", "success");
          handleCloseImageDialog();
        } catch (error) {
          logger.error("Error uploading image file:", error);
          const errorMsg =
            error?.response?.data?.message ||
            error?.message ||
            "Lỗi khi upload ảnh";
          toast(errorMsg, "error");
        }
      }
      if (eventOrFile.target) eventOrFile.target.value = "";
    },
    [editor, toast, handleCloseImageDialog, newsId, editorImageTitle]
  );

  const handleInsertImageUrl = useCallback(() => {
    if (imageUrl.trim() && isEditorReady(editor)) {
      const title = editorImageTitle.trim();
      let htmlContent = `<img src="${imageUrl}" alt="${title || "image"}" title="${title || "image"}" />`;
      if (title) {
        htmlContent += `<p style="text-align: center"><em>${title}</em></p>`;
      }
      editor.chain().focus().insertContent(htmlContent).run();
      handleCloseImageDialog();
    }
  }, [editor, imageUrl, handleCloseImageDialog, editorImageTitle]);

  const handleImageUploadBoxClick = useCallback(() => {
    imageUploadInputRef.current?.click();
  }, []);

  const handleImageDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFeaturedImageDrop = useCallback(
    (e) => {
      if (!isEditMode) return;
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files?.[0];
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
      }
    },
    [toast, setValue, isEditMode]
  );

  const handleImageDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleUploadImageFile(file);
      }
    },
    [handleUploadImageFile]
  );

  const handleEditorImageTitleChange = useCallback((e) => {
    setEditorImageTitle(e.target.value);
  }, []);

  const handleOpenLinkDialog = useCallback(() => {
    setLinkDialogOpen(true);
    setLinkUrl("");
    setLinkText("");
  }, []);

  const handleCloseLinkDialog = useCallback(() => {
    setLinkDialogOpen(false);
    setLinkUrl("");
    setLinkText("");
  }, []);

  const handleInsertLink = useCallback(
    (url) => {
      if (url?.trim()) {
        isEditorReady(editor) && editor.chain().focus().setLink({ href: url, target: "_blank" }).run();
        handleCloseLinkDialog();
      }
    },
    [editor, handleCloseLinkDialog]
  );

  const handleLinkUrlChange = useCallback((e) => {
    setLinkUrl(e.target.value);
  }, []);

  const handleLinkTextChange = useCallback((e) => {
    setLinkText(e.target.value);
  }, []);

  const handleInsertLinkClick = useCallback(() => {
    handleInsertLink(linkUrl);
  }, [linkUrl, handleInsertLink]);

  const renderTitleField = useCallback(
    ({ field }) => (
      <InputComponents
        label="TIÊU ĐỀ"
        placeholder="Nhập tiêu đề tin tức..."
        multiline
        rows={1}
        required
        isView={false}
        disabled={!isEditMode}
        forceViewStyle={!isEditMode} 
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
        label="TÓM TẮT"
        placeholder="Nhập tóm tắt tin tức..."
        multiline
        rows={3}
        required
        isView={false}
        forceViewStyle={!isEditMode} // Use view style when not editing
        disabled={!isEditMode}
        error={!!errors?.summary}
        helperText={errors?.summary?.message}
        {...field}
      />
    ),
    [errors?.summary, isEditMode]
  );

  const renderDateField = useCallback(
    ({ field }) => (
      <DateTimePicker
        label="NGÀY TẠO"
        value={field.value}
        onChange={field.onChange}
        showTime={false}
        required
        disabled={!isEditMode}
        error={!!errors?.createdDate}
        helperText={errors?.createdDate?.message}
      />
    ),
    [errors?.createdDate, isEditMode]
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
        label="CHỦ ĐỀ"
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
        <InputTag
          label="Tags"
          placeholder="Nhập #tag rồi nhấn space/comma/enter để tạo tag..."
          value={field.value || []}
          onChange={handleTagsChange(field)}
          // required
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

  const handleSwitchChange = useCallback(
    (field) => (e) => {
      field.onChange(e.target.checked);
    },
    []
  );

  const handleImportantChange = useCallback(
    (field) => (e) => {
      field.onChange(e.target.value === "true");
    },
    []
  );

  const renderRejectReasonField = useCallback(
    ({ field }) => (
      <InputComponents
        label="LÝ DO TRẢ LẠI"
        placeholder="Nhập lý do..."
        disabled={!isEditMode}
        error={!!errors?.rejectReason}
        helperText={errors?.rejectReason?.message}
        // multiline
        // rows={3}
        // isView={false} // Force edit mode layout
        forceViewStyle={!isEditMode} // Use view style when not editing
        {...field}
      />
    ),
    [errors?.rejectReason, isEditMode]
  );

  const renderRejectorNameField = useCallback(
    ({ field }) => (
      <InputComponents
        label="NGƯỜI TRẢ LẠI"
        placeholder="Người đã trả lại tin"
        disabled
        error={!!errors?.rejectorName}
        helperText={errors?.rejectorName?.message}
        {...field}
      />
    ),
    [errors?.rejectorName]
  );

  const renderImportantField = useCallback(
    ({ field }) => (
      <FormItem label="TIN QUAN TRỌNG" isView={false}>
        <RadioGroup
          row
          value={field.value ? "true" : "false"}
          onChange={handleImportantChange(field)}
        >
          <FormControlLabel
            value="true"
            control={<Radio size="small" disabled={!isEditMode} />}
            label={<Typography variant="body2">Có</Typography>}
          />
          <FormControlLabel
            value="false"
            control={<Radio size="small" disabled={!isEditMode} />}
            label={<Typography variant="body2">Không</Typography>}
          />
        </RadioGroup>
      </FormItem>
    ),
    [handleImportantChange, isEditMode]
  );

  // Handler cho cancel button
  const handleCancelClick = useCallback(() => {
    if (newsId) {
      // Chỉnh sửa tin tức: Reset form về dữ liệu gốc và thoát edit mode
      // Fetch lại dữ liệu gốc để reset
      getNewsDetail();
      setIsEditMode(false);
    } else {
      // Thêm mới tin tức: Đóng dialog
      onClose();
    }
  }, [newsId, onClose, getNewsDetail]);

  // Handler cho edit button
  const handleEditClick = useCallback(() => {
    setIsEditMode(true);
  }, []);

  const renderCommentSwitch = useCallback(
    ({ field }) => (
      <UploadSwitch
        checked={field.value}
        onChange={handleSwitchChange(field)}
        disabled={!isEditMode}
      />
    ),
    [handleSwitchChange, isEditMode]
  );

  const renderImageTitleField = useCallback(
    ({ field }) => (
      <InputComponents
        label="TÊN ẢNH"
        placeholder="Nhập tên ảnh..."
        disabled={!isEditMode}
        {...field}
      />
    ),
    [isEditMode]
  );

  const renderContentField = useCallback(
    () => (
      <Box>
        <EditorWrapper>
          <EditorMenuBar
            editor={editor}
            onImageClick={handleOpenImageDialog}
            onLinkClick={handleOpenLinkDialog}
          />
          <EditorContentWrapper onClick={handleArticleClick}>
            {isEditorReady(editor) && <EditorContent editor={editor} />}
          </EditorContentWrapper>
        </EditorWrapper>
        {errors?.content && <ErrorText>{errors.content.message}</ErrorText>}
      </Box>
    ),
    [editor, errors?.content, handleOpenImageDialog, handleOpenLinkDialog, handleArticleClick]
  );

  return (
    <CustomSwipper
      key={open ? (newsId ? "edit-news-open" : "add-news-open") : "news-closed"}
      open={open && isReady}
      onClose={handleCloseDrawer}
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
              disabled={isSaving}
            >
              LƯU
            </UploadButton>
            <ButtonOutline
              onClick={handleCancelClick}
              variant="outlined"
              size="medium"
            >
              HỦY
            </ButtonOutline>
          </>
        ) : (
          // Chế độ xem chi tiết (chỉ hiện khi có newsId)
          newsId && (
            <>
              {canSubmitNews && (
                <ButtonOutline
                  type="button"
                  onClick={handleBrowseClick}
                  variant="outlined"
                  disabled={isSubmittingNews}
                >
                  TRÌNH LẠI                    
                </ButtonOutline>
              )}
              <ButtonOutline onClick={handleEditClick} variant="outlined">
                CHỈNH SỬA
              </ButtonOutline>
            </>
          )
        )
      }
      hideBackdrop
    >
      <FormContainer>
        <DisabledInputWrapper disabled={false}>
          {/* THÔNG TIN CƠ BẢN (8/4) */}
          <MainCard>
             <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="rejectorName"
                  control={control}
                  render={renderRejectorNameField}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="rejectReason"
                  control={control}
                  render={renderRejectReasonField}
                />
              </Grid>
            </Grid>
            <SectionTitle>THÔNG TIN CƠ BẢN</SectionTitle>
            <Grid container spacing={4}>
              {/* CỘT TRÁI - 8/12 */}
              <Grid item xs={12} md={8}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Controller name="title" control={control} render={renderTitleField} />
                  </Grid>
                  <Grid item xs={12}>
                    <Controller name="summary" control={control} render={renderSummaryField} />
                  </Grid>
                  <Grid item xs={12} container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Controller name="tags" control={control} render={renderTagsField} />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <FormItem label="BÌNH LUẬN" isView={false}>
                        <Controller name="isComment" control={control} render={renderCommentSwitch} />
                      </FormItem>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Controller name="isImportant" control={control} render={renderImportantField} />
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>

              {/* CỘT PHẢI - 4/12 */}
              <Grid item xs={12} md={4}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Controller name="topic" control={control} render={renderTopicField} />
                  </Grid>
                  <Grid item xs={12}>
                    <Controller name="createdDate" control={control} render={renderDateField} />
                  </Grid>
                  <Grid item xs={12}>
                    <FormItem label="ẢNH BÌA" required isView={false}>
                      <Grid container spacing={1}>
                        <Grid item xs={12}>
                          <UploadAreaStyled
                            onClick={isEditMode ? handleImageUploadClick : undefined}
                            onDragOver={handleImageDragOver}
                            onDrop={handleFeaturedImageDrop}
                          >
                            {previewImage ? (
                              <PreviewImageStyledContainer component={AuthImage} src={previewImage} alt="Preview" />
                            ) : (
                              <UploadPlaceholder>
                                <UploadIcon>
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" />
                                  </svg>
                                </UploadIcon>
                                <UploadText>{isEditMode ? "Kéo thả hoặc nhấp để tải hình ảnh" : "ẢNH BÌA"}</UploadText>
                              </UploadPlaceholder>
                            )}
                          </UploadAreaStyled>
                          {isEditMode && <HiddenFileInput ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} />}
                        </Grid>
                        <Grid item xs={12}>
                          <Controller name="imageTitle" control={control} render={renderImageTitleField} />
                        </Grid>
                      </Grid>
                    </FormItem>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </MainCard>

          {/* NỘI DUNG CHÍNH */}
          <MainCard>
            <SectionTitle>NỘI DUNG CHÍNH</SectionTitle>
            <Controller name="content" control={control} render={renderContentField} />
          </MainCard>
        </DisabledInputWrapper>
      </FormContainer>

      {/* Dialog Upload Hình Ảnh vào Editor */}
      <Dialog open={imageDialogOpen} onClose={handleCloseImageDialog}>
        <DialogTitle>Chèn hình ảnh</DialogTitle>
        <DialogContentStyled>
          <Grid container spacing={2}>
            {/* Tab Upload File */}
            <Grid item xs={12}>
              <SubSectionTitle>Thông tin hình ảnh</SubSectionTitle>
              <InputWrapper>
                <TextField
                  fullWidth
                  label="Tên ảnh (Alt text)"
                  placeholder="Nhập tên mô tả cho ảnh..."
                  value={editorImageTitle}
                  onChange={handleEditorImageTitleChange}
                  variant="outlined"
                  size="small"
                />
              </InputWrapper>
              <SubSectionTitle>Tải lên file</SubSectionTitle>
              <ImageUploadBox
                onClick={handleImageUploadBoxClick}
                onDragOver={handleImageDragOver}
                onDrop={handleImageDrop}
              >
                <ImageIconStyled />
                <Typography variant="body2">
                  Nhấp để tải lên hình ảnh
                </Typography>
                <Typography variant="caption">
                  hoặc kéo thả tệp vào đây
                </Typography>
              </ImageUploadBox>
              <HiddenFileInput
                ref={imageUploadInputRef}
                type="file"
                accept="image/*"
                onChange={handleUploadImageFile}
              />
            </Grid>

            {/* Divider */}
            {/* <Grid item xs={12}>
              <Divider>hoặc</Divider>
            </Grid> */}

            {/* Tab Nhập URL */}
            {/* <Grid item xs={12}>
              <SubSectionTitle>Nhập URL</SubSectionTitle>
              <TextField
                fullWidth
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={handleImageUrlChange}
                variant="outlined"
                size="small"
              />
            </Grid> */}
          </Grid>
        </DialogContentStyled>
       <DialogActionsStyled>
          <CancelButton onClick={handleCloseImageDialog} variant="contained">
            Hủy
          </CancelButton>
          <SaveButton
            onClick={handleInsertImageUrl}
            variant="contained"
            disabled={!imageUrl.trim()}
          >
            Chèn
          </SaveButton>
        </DialogActionsStyled>
      </Dialog>

      {/* Dialog Insert Link */}
      <Dialog
        open={linkDialogOpen}
        onClose={handleCloseLinkDialog}
        PaperProps={{
          sx: { minWidth: "450px" },
        }}
      >
        <DialogTitle>Chèn liên kết</DialogTitle>
        <LinkDialogContentStyled>
          <TextField
            fullWidth
            label="URL"
            placeholder="https://example.com"
            value={linkUrl}
            onChange={handleLinkUrlChange}
            variant="outlined"
            size="small"
            autoFocus
          />
          <TextField
            fullWidth
            label="Văn bản hiển thị (tùy chọn)"
            placeholder="Nhập văn bản..."
            value={linkText}
            onChange={handleLinkTextChange}
            variant="outlined"
            size="small"
          />
        </LinkDialogContentStyled>
        <LinkDialogActionsStyled>
          <Button onClick={handleCloseLinkDialog} variant="outlined">
            Hủy
          </Button>
          <Button
            onClick={handleInsertLinkClick}
            variant="contained"
            disabled={!linkUrl.trim()}
          >
            Chèn
          </Button>
        </LinkDialogActionsStyled>
      </Dialog>
      {/* Confirm Submit Dialog */}
      <CustomDialog
        open={confirmSubmitOpen}
        onClose={handleCancelSubmit}
        onSave={handleConfirmSubmit}
        title={
          <TitleContainer>
            Xác nhận trình lại
          </TitleContainer>
        }
        isLoading={isSubmittingNews}
        titleButton={isSubmittingNews ? "Đang xử lý..." : "Đồng ý"}
        size="sm"
      >
        <InfoBox>
          <Typography>
            Bạn có chắc chắn muốn trình lại tin tức này không?
          </Typography>
        </InfoBox>
      </CustomDialog>

      {/* Loading Dialog */}
      <LoadingDialog open={isSaving || isSubmittingNews}>
        <StyledDialogContent>
          {isSubmittingNews 
            ? "Đang trình duyệt tin tức, vui lòng chờ trong giây lát..."
            : "Đang cập nhật tin tức, vui lòng chờ trong giây lát..."}
        </StyledDialogContent>
      </LoadingDialog>
      <FilePreviewModal
        open={previewOpen}
        onClose={handleClosePreview}
        fileName={previewFileName}
        url={previewUrl}
        loading={isPreviewLoading}
        verificationResult={verificationResult}
      />
    </CustomSwipper>
  );
}

export default withSharedComponents(ViewNewReacts);