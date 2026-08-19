// File: src/components/AddNews/index.jsx
import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useFilePreview } from "@components/FilePreview/useFilePreview";
import FilePreviewModal from "@components/FilePreview/FilePreviewModal";
import {
  Grid,
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  // TextField,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";
import DeleteIcon from "@mui/icons-material/Delete";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import AuthImage from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimImage';
import withSharedComponents from "@components/WrapperComponent";
import ImageCropperDialog from "@components/ImageCropperDialog";
import { useForm, Controller } from "react-hook-form";
import { ReactCrop, centerCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
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
import { Node, mergeAttributes } from "@tiptap/core";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import { Link } from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { CustomResizableImage } from "@utils/tiptapExtensions";
import CustomSwipper from "@components/Swipper/BaseSwiper";
import DOMPurify from "dompurify";
import { useAttachmentClick } from "@hooks/useAttachmentClick";
import {
  handleCompressedFileDownload,
  handleDefaultFileClick,
} from "@services/FileUpload/fileUpload";

// Tiptap slogan extensions
const Slogan = Node.create({
  name: "slogan",
  group: "block",
  content: "block+",
  parseHTML() {
    return [
      {
        tag: "div",
        getAttrs: (element) => element.classList.contains("slogan-container") && null,
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "slogan-container" }), 0];
  },
});

const SloganText = Node.create({
  name: "sloganText",
  group: "block",
  content: "inline*",
  parseHTML() {
    return [
      {
        tag: "div",
        getAttrs: (element) => element.classList.contains("slogan-text") && null,
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "slogan-text" }), 0];
  },
});

const SloganMotto = Node.create({
  name: "sloganMotto",
  group: "block",
  content: "inline*",
  parseHTML() {
    return [
      {
        tag: "div",
        getAttrs: (element) => element.classList.contains("slogan-motto") && null,
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "slogan-motto" }), 0];
  },
});

import CustomInputTag from "@components/CustomInput/CustomInputTag";

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
import CampaignIcon from "@mui/icons-material/Campaign";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import TextField from "@mui/material/TextField";
import LoadingDialog from "@components/LoadingDialog";
import {
	CancelButton,
	StyledDialogContent,
	SaveButton,
} from "@styles/CustomDialog.styles";
import ApproveNewsDialog from "./ApproveNewsDialog";
// ── Styled Components ──
import {
  FormContainer,
  MainCard,
  SectionTitle,
  UploadArea,
  RemoveImageIconButton,
  UploadIcon,
  UploadText,
  UploadSubText,
  ButtonDanger,
  HiddenFileInput,
  SubSectionTitle,
  EditorWrapper,
  MenuBar,
  MenuButton,
  HeadingButton,
  ToolbarDivider,
  EditorContentWrapper,
  PreviewImageBox,
  ErrorText,
  ImageUploadBox,
  DialogContentStyled,
  DialogActionsStyled,
  ImageIconStyled,
  InputWrapper,
  DialogPreviewImage,
  LinkDialogContentStyled,
  LinkDialogActionsStyled,
  PreviewDialogTitle,
  PreviewDialogContentStyled,
  PreviewContentBox,
  PreviewImageSection,
  ButtonActionBox,
  PreviewImage,
  PreviewImageCaption,
  PreviewDialog,
  PreviewTitleText,
  FieldLabelText,
  CropContainer,
  CropCaptionText,
  FileDialog,
  FileDialogSectionTitle,
  FileDialogHelperText,
  StyledFormGroup,
  TagsAndOptionsGrid,
  CheckboxGridItem,
  BasicInfoCard,
} from "./NewsForm.styles";
import SubmitNewsDialog from "./SubmitNewsDialog";
import { FlexGrowBox, FooterActions } from "@styles/BaseSwiper/BaseSwiper.style";

const isHtmlEmpty = (html) => {
  if (!html) return true;
  const cleanText = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, "").trim();
  const hasImages = html.includes("<img") || html.includes("<iframe") || html.includes("<video");
  return cleanText === "" && !hasImages;
};

// Schema validation
const newsSchema = yup.object().shape({
  title: yup.string().required("Tiêu đề là bắt buộc"),
  summary: yup.string().nullable(),
  createdDate: yup.date().required("Ngày tạo là bắt buộc").nullable(),
  scheduledPublishAt: yup.date().nullable(),
  reviewerName: yup.string(),
  topic: yup.string().required("Chủ đề là bắt buộc"),
  tags: yup.array().nullable(),
  featuredImage: yup.mixed().nullable(),
  imageTitle: yup.string(),
  content: yup
    .string()
    .test("is-empty", "Nội dung chính là bắt buộc", (value) => !isHtmlEmpty(value))
    .required("Nội dung chính là bắt buộc"),
  isComment: yup.boolean(),
  isImportant: yup.string().required("Vui lòng chọn tính chất tin"),
});

const isEditorReady = (editor) => !!editor && !editor.isDestroyed;

// Menu Bar Component
function EditorMenuBar({ editor: tiptapEditor, onImageClick, onLinkClick, onSloganClick, onFileClick }) {
  const editor = isEditorReady(tiptapEditor) ? tiptapEditor : null;
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

  const handleAddSlogan = useCallback(() => {
    onSloganClick?.();
  }, [onSloganClick]);

  const handleAddFile = useCallback(() => {
    onFileClick?.();
  }, [onFileClick]);

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

      <MenuButton onClick={handleAddSlogan} title="Chèn khẩu hiệu, phương châm">
        <CampaignIcon />
      </MenuButton>

      <MenuButton
        onClick={handleAddFile}
        title="Chèn tài liệu (PDF, DOCX...)"
      >
        <AttachFileIcon />
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

function ViewNews({ open, onClose, onSuccess, sharedComponents, newsId, data, documentId }) {
  const {
    Dialog: CustomDialog,
    ButtonOutline,
    InputComponents: BaseInput,
    DateTimePicker: BaseDateTimePicker,
    toast,
  } = sharedComponents;

  const [isEditMode, setIsEditMode] = useState(false);
  const isView = !isEditMode;

  const {
    previewOpen,
    previewUrl,
    previewFileName,
    isPreviewLoading,
    verificationResult,
    handlePreview,
    handleClosePreview,
  } = useFilePreview();

  const handlePreviewRef = useRef(handlePreview);
  useEffect(() => {
    handlePreviewRef.current = handlePreview;
  }, [handlePreview]);

  const handleFileClick = useCallback(
    (params) => handleDefaultFileClick({ ...params, handlePreview }),
    [handlePreview]
  );

  const handleArticleClick = useAttachmentClick(handleFileClick);

  // Wrapper components to move labels above inputs
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

  const [isReady, setIsReady] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [isFeaturedImageDragActive, setIsFeaturedImageDragActive] = useState(false);
  const [detailData, setDetailData] = useState({});
  const fileInputRef = React.useRef(null);
  const handleUploadImageFileRef = React.useRef(null);

  // State cho dialog upload ảnh
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const imageUploadInputRef = React.useRef(null);
  const [editorImageTitle, setEditorImageTitle] = useState(""); // Tên ảnh cho editor

  // State cho dialog upload file (docs, pdf...)
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [fileUrl, setFileUrl] = useState("");
  const [fileDisplayName, setFileDisplayName] = useState("");
  const documentUploadInputRef = React.useRef(null);

  // State cho khẩu hiệu & phương châm
  const [sloganDialogOpen, setSloganDialogOpen] = useState(false);
  const [sloganValue, setSloganValue] = useState("");
  const [mottoValue, setMottoValue] = useState("");

  // State cho dialog insert linkonSubmitForm 
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [linkUrlError, setLinkUrlError] = useState("");

  // State cho dialog preview
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const [, setInteraction] = useState({
    views: 0,
    likes: 0,
    comments: 0,
  });

  // State cho workflow actions
  const [canSubmitNews, setCanSubmitNews] = useState(false);
  const [canPublishDirectly, setCanPublishDirectly] = useState(false);
  const [canPublished, setCanPublished] = useState(false);
  const [isSubmittingNews, setIsSubmittingNews] = useState(false);
  const [isPublishingNews] = useState(false);
  const [openConfirmBrowse, setOpenConfirmConfirmBrowse] = useState(false);
  const [openApproveDialog, setOpenApproveDialog] = useState(false);
  const [hasSuccessRefresh, setHasSuccessRefresh] = useState(false);
  const [currentNewsData, setCurrentNewsData] = useState(null);

  // States cho cropping (giống Configuration/index.js)
  // States cho ImageCropperDialog (Hình ảnh đại diện)
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState(null);
  const [cropImageSrc, setCropImageSrc] = useState("");
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState();
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [cropTarget, setCropTarget] = useState(null); // "featured" hoặc "editor"
  const imgRef = React.useRef(null);

  const [topicOptions, setTopicOptions] = useState([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);

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
      tags: [],
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
    context: { previewImage },
  });

  const contentValue = watch("content");

  // TipTap Editor
  const handleCloseDrawer = useCallback(() => {
    if (hasSuccessRefresh) {
      onSuccess?.();
    }
    onClose();
  }, [hasSuccessRefresh, onSuccess, onClose]);

  // --- DIALOG HANDLERS (Moved to top to prevent TDZ issues) ---
  
  const handleClosePreviewDialog = useCallback(() => {
    setPreviewDialogOpen(false);
  }, []);

  const handlePreviewClick = useCallback(() => {
    setPreviewDialogOpen(true);
  }, []);

  const handleCloseLinkDialog = useCallback(() => {
    setLinkDialogOpen(false);
    setLinkUrl("");
    setLinkText("");
    setLinkUrlError("");
  }, []);

  const handleCloseSloganDialog = useCallback(() => {
    setSloganDialogOpen(false);
  }, []);

  const handleCloseFileDialog = useCallback(() => {
    setFileDialogOpen(false);
    setFileUrl("");
    setFileDisplayName("");
  }, []);

  const handleCloseImageDialog = useCallback(() => {
    setImageDialogOpen(false);
    setImageUrl("");
    setEditorImageTitle("");
  }, []);

  const handleCloseConfirmBrowse = useCallback(() => {
    setOpenConfirmConfirmBrowse(false);
  }, []);

  const handleCloseApproveDialog = useCallback(() => {
    setOpenApproveDialog(false);
  }, []);

  const handleCloseCropDialog = useCallback(() => {
    setIsCropDialogOpen(false);
    setCropImageSrc("");
    setCropTarget(null);
  }, []);

  const handleEditorUpdate = useCallback(
    ({ editor }) => {
      if (!isEditorReady(editor)) return;
      setValue("content", editor.getHTML());
    },
    [setValue]
  );

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
    Slogan,
    SloganText,
    SloganMotto,
  ], []);

  const editor = useEditor({
    extensions,
    content: contentValue || "",
    onUpdate: handleEditorUpdate,
    editable: isEditMode,
    editorProps: {
      attributes: {
        "data-placeholder": "Nhập nội dung tin tức...",
      },
      handleDrop(view, event, slice, moved) {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
          const file = event.dataTransfer.files[0];
          if (file && file.type.startsWith("image/")) {
            event.preventDefault();
            if (handleUploadImageFileRef.current) {
              handleUploadImageFileRef.current(file);
            }
            return true;
          }
        }
        return false;
      },
      handlePaste(view, event) {
        if (event.clipboardData && event.clipboardData.files && event.clipboardData.files.length > 0) {
          const file = event.clipboardData.files[0];
          if (file && file.type.startsWith("image/")) {
            event.preventDefault();
            if (handleUploadImageFileRef.current) {
              handleUploadImageFileRef.current(file);
            }
            return true;
          }
        }
        return false;
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

  // useEffect: Đẩy nội dung vào editor khi editor đã sẵn sàng hoặc detailData thay đổi
  // (tách riêng khỏi getNewsDetail để tránh việc editor chuyển từ null -> instance
  // làm getNewsDetail bị tạo lại và effect fetch chạy thêm 1 lần nữa)
  useEffect(() => {
    if (isEditorReady(editor) && detailData) {
      editor.commands.setContent(detailData.content || "");
    }
  }, [editor, detailData]);

  // useEffect: Cập nhật trạng thái editable của editor khi isEditMode thay đổi
  useEffect(() => {
    if (isEditorReady(editor)) {
      editor.setEditable(isEditMode);
    }
  }, [editor, isEditMode]);

  // Fetch chi tiết tin tức
  const getNewsDetail = useCallback(async () => {
    const id = newsId || data?.id || data?._id || documentId;
    if (open && id) {
      try {
        // 1. Lấy chi tiết tin tức
        const response = await axiosInstance.get(
          `${API_NEWS_MANAGEMENT}/${id}`
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
          reviewerName: data.reviewerName || "",
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
        setCurrentNewsData(data);

        // Lấy các cờ phân quyền action
        const flags = data.actionFlags || {};
        setCanSubmitNews(flags.canSubmitNews === true);
        setCanPublishDirectly(flags.canPublishDirectly === true);
        setCanPublished(flags.canPublished === true);

        setIsReady(true);
        // setIsEditMode(false); // Không reset edit mode ở đây để tránh conflict logic khi submit
      } catch (error) {
        // logger.error("Lỗi lấy chi tiết tin tức:", error);
        const messageError =
					error?.response?.data?.message ||
					error.message || "Có lỗi xảy ra khi tải thông tin tin tức";
        logger.error("Lỗi lấy chi tiết tin tức:", messageError);
        toast(messageError, "error");
        onClose();
      }
    } else if (open && !id) {
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
      setCurrentNewsData(null);
      setCanSubmitNews(false);
      setCanPublishDirectly(false);
      setCanPublished(false);
      setPreviewImage(null);
      setImageFile(null);

      // Reset tương tác khi đóng form
      setInteraction({
        views: 0,
        likes: 0,
        comments: 0,
      });
    }
  }, [open, newsId, data, documentId, reset, toast, onClose]);

  // useEffect: Fetch chi tiết tin tức khi có newsId hoặc documentId
  useEffect(() => {
    if (open && (newsId || data || documentId)) {
      getNewsDetail();
    }
  }, [open, newsId, data, documentId, getNewsDetail]);

  // useEffect: Reset form khi thêm mới
  useEffect(() => {
    if (open && !newsId && !documentId && !data) {
      reset(defaultFormValues);
      setPreviewImage(null);
      setImageFile(null);
      if (isEditorReady(editor)) {
        editor.commands.setContent("");
      }
    }
  }, [open, newsId, documentId, data, reset, defaultFormValues, editor]);

  const onSubmitForm = useCallback(
    async (data) => {
      if (isSaving) return;
      try {
        setIsSaving(true);
        if (!data.title?.trim()) throw new Error("Tiêu đề không được để trống");
        if (isHtmlEmpty(data.content))
          throw new Error("Nội dung không được để trống");
        if (!data.topic?.trim()) throw new Error("Chủ đề không được để chọn");
        // if (!data.tags || data.tags.length === 0) throw new Error("Tags là bắt buộc");

        // Thêm các trường vào payload
        const payload = {
          title: String(data.title || "").trim(),
          summary: String(data.summary || "").trim(),
          content: String(data.content || "").trim(),
          isComment: data.isComment === true,
          isImportant: data.isImportant === "true",
          topic: String(data.topic || "").trim(),
          tags: Array.isArray(data.tags) 
            ? data.tags.join(", ") 
            : String(data.tags || "").trim(),
          publishedAt: dayjs(data.createdDate).format("YYYY-MM-DD"),
          reviewerName: String(data.reviewerName || "").trim(),
        };

        // Thêm ngày xuất bản theo lịch nếu có
        if (data.scheduledPublishAt) {
          payload.scheduledPublishAt = dayjs(data.scheduledPublishAt).format(
            "YYYY-MM-DD"
          );
        }

        // Thêm tên ảnh đại diện và cờ xóa ảnh
        payload.nameThumbnail = String(data.imageTitle || "").trim();
        payload.removeThumbnail = !previewImage && !imageFile;

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
        setHasSuccessRefresh(true);
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
    [toast, imageFile, newsId, setIsEditMode, isSaving, getNewsDetail] // Thêm setIsEditMode vào dependency
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
      setCurrentNewsData(newsData);

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

      setCanPublishDirectly(false);
      setCanPublished(false);
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
  ],
  );
  
  const handleApproveSuccess = useCallback(() => {
    setHasSuccessRefresh(true);
    onSuccess?.();
    onClose?.();
  }, [onSuccess, onClose]);

  // Xử lý click nút Trình duyệt
  const handleBrowseClick = useCallback(() => {
    setOpenConfirmConfirmBrowse(true);
  }, []);

  // Xử lý click nút Xuất bản
  const handlePublishClick = useCallback(() => {
    setOpenApproveDialog(true);
  }, []);

  const handleImageUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRemoveFeaturedImage = useCallback(
    (e) => {
      e?.stopPropagation();
      setPreviewImage(null);
      setImageFile(null);
      setValue("featuredImage", null, { shouldValidate: true });
      setValue("imageTitle", "");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [setValue]
  );

  // Xử lý upload ảnh vào editor
  const handleOpenImageDialog = useCallback(() => {
    setImageDialogOpen(true);
    setImageUrl("");
  }, []);

  const handleImageChange = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      if (file) {
        if (file.size > 200 * 1024 * 1024) {
          toast("Kích thước file không được vượt quá 200MB", "error");
          return;
        }
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setCropperImageSrc(reader.result);
            setCropperOpen(true);
          };
          reader.readAsDataURL(file);
        } else {
          toast("Vui lòng chọn file hình ảnh", "error");
        }
        event.target.value = "";
      }
    },
    [toast]
  );

  const handleUploadImageFile = useCallback(
    async (eventOrFile) => {
      let file;
      if (eventOrFile.target) {
        file = eventOrFile.target.files?.[0];
      } else {
        file = eventOrFile;
      }

      if (file) {
        if (file.size > 200 * 1024 * 1024) {
          toast("Kích thước file không được vượt quá 200MB", "error");
          if (eventOrFile.target) eventOrFile.target.value = "";
          return;
        }
      }

      if (file && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setCropImageSrc(reader.result);
          setIsCropDialogOpen(true);
          setCropTarget("editor");
          setCrop(undefined); // Reset crop
        };
        reader.readAsDataURL(file);
      }
      if (eventOrFile.target) {
        eventOrFile.target.value = "";
      }
    },
    [toast]
  );
  handleUploadImageFileRef.current = handleUploadImageFile;

  const onImageLoad = useCallback((e) => {
    const width = e.currentTarget.width;
    const height = e.currentTarget.height;
    const crop = centerCrop(
      {
        unit: "%",
        width: 100,
        height: 100,
      },
      width,
      height
    );
    setCrop(crop);
    imgRef.current = e.currentTarget;
  }, []);

  const handleCropConfirm = async () => {
    if (!completedCrop || !imgRef.current) return;

    const canvas = document.createElement("canvas");
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext("2d");

    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );

    const base64Image = canvas.toDataURL("image/jpeg");
    // const res = await fetch(base64Image);
    // const blob = await res.blob();
    const blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9);
    });
    const fileName = `cropped_${Date.now()}.jpg`;
    const croppedFile = new File([blob], fileName, { type: "image/jpeg" });

    if (cropTarget === "featured") {
      setImageFile(croppedFile);
      setPreviewImage(base64Image);
      setValue("featuredImage", croppedFile, { shouldValidate: true });
      toast("Đã cắt và thêm ảnh đại diện thành công", "success");
    } else if (cropTarget === "editor") {
      try {
        const formData = new FormData();
        formData.append("file", croppedFile);
        formData.append("object_type", "news");

        const uploadResponse = await api.post(API_UPLOAD_FILESS, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        const fileId =
          uploadResponse?.data?.data?.id ||
          uploadResponse?.data?.data?._id ||
          uploadResponse?.data?.id ||
          uploadResponse?.data?._id;

        if (!fileId) {
          throw new Error("Không lấy được ID file từ server");
        }

        const imageUrlFromServer = `${APP_BASE}/api/files/view/${fileId}`;
        setImageUrl(imageUrlFromServer);
        if (!imageDialogOpen && editor && !editor.isDestroyed) {
          let htmlContent = `<img src="${imageUrlFromServer}" alt="image" title="image" />`;
          editor.chain().focus().insertContent(htmlContent).run();
          toast("Chèn ảnh thành công", "success");
        } else {
          toast("Tải lên ảnh thành công. Nhấn 'Chèn' để đưa vào bài viết.", "success");
        }
      } catch (error) {
        logger.error("Error uploading cropped image:", error);
        toast("Lỗi khi upload ảnh đã cắt", "error");
      }
    }

    setIsCropDialogOpen(false);
    setCropImageSrc("");
    setCropTarget(null);
  };

  const handleCropperComplete = useCallback((croppedFile, objectUrl) => {
    setImageFile(croppedFile);
    setPreviewImage(objectUrl);
    setValue("featuredImage", croppedFile, { shouldValidate: true });
    toast("Đã cắt và thêm ảnh đại diện thành công", "success");
  }, [setValue, toast]);

  const handleCropperClose = useCallback(() => {
    setCropperOpen(false);
  }, []);


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
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    setIsFeaturedImageDragActive(true);
  }, [isEditMode]);

  const handleImageDragEnter = useCallback((e) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    setIsFeaturedImageDragActive(true);
  }, [isEditMode]);

  const handleImageDragLeave = useCallback((e) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    setIsFeaturedImageDragActive(false);
  }, [isEditMode]);

  const handleFeaturedImageDrop = useCallback(
    (e) => {
      if (!isEditMode) return;
      e.preventDefault();
      e.stopPropagation();
      setIsFeaturedImageDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) {
        if (file.size > 200 * 1024 * 1024) {
          toast("Kích thước file không được vượt quá 200MB", "error");
          return;
        }
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setCropperImageSrc(reader.result);
            setCropperOpen(true);
          };
          reader.readAsDataURL(file);
        } else {
          toast("Vui lòng chọn file hình ảnh", "error");
        }
      }
    },
    [toast, isEditMode]
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
    if (!isEditorReady(editor)) return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ");
    setLinkDialogOpen(true);
    setLinkUrl("");
    setLinkText(selectedText || "");
  }, [editor]);


  const handleInsertLink = useCallback(
    (url, text) => {
      if (url?.trim() && isEditorReady(editor)) {
        const finalUrl = url.trim();
        const finalText = text?.trim() || finalUrl;

        // Nếu không có văn bản được chọn
        if (editor.state.selection.empty) {
          editor
            .chain()
            .focus()
            .insertContent(`<a href="${finalUrl}" target="_blank" rel="noopener noreferrer">${finalText}</a> `)
            .run();
        } else {
          // Nếu có văn bản được chọn
          if (text?.trim()) {
            // Nếu người dùng nhập text mới trong dialog, thay thế đoạn chọn bằng text đó và gắn link
            editor
              .chain()
              .focus()
              .insertContent(`<a href="${finalUrl}" target="_blank" rel="noopener noreferrer">${finalText}</a>`)
              .run();
          } else {
            // Nếu không nhập text trong dialog, chỉ gắn link cho đoạn văn bản đang chọn
            editor
              .chain()
              .focus()
              .extendMarkRange("link")
              .setLink({ href: finalUrl, target: "_blank" })
              .run();
          }
        }
        handleCloseLinkDialog();
      }
    },
    [editor, handleCloseLinkDialog]
  );

  const handleOpenSloganDialog = useCallback(() => {
    setSloganDialogOpen(true);
    setSloganValue("");
    setMottoValue("");
  }, []);

  const handleSloganValueChange = useCallback((e) => {
    setSloganValue(e.target.value);
  }, []);

  const handleMottoValueChange = useCallback((e) => {
    setMottoValue(e.target.value);
  }, []);

  const handleLinkUrlChange = useCallback((e) => {
    const value = e.target.value;
    setLinkUrl(value);
    
    // Regex validate link URL (bắt buộc phải có protocol http/https)
    const urlPattern = /^https?:\/\/[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/;
    
    if (value && !urlPattern.test(value)) {
      setLinkUrlError("Link phải bắt đầu bằng http:// hoặc https:// (ví dụ: https://google.com)");
    } else {
      setLinkUrlError("");
    }
  }, []);

  const handleLinkTextChange = useCallback((e) => {
    setLinkText(e.target.value);
  }, []);

  const handleInsertLinkClick = useCallback(() => {
    handleInsertLink(linkUrl, linkText);
  }, [linkUrl, linkText, handleInsertLink]);

  const handleFileUrlChange = useCallback((e) => {
    setFileUrl(e.target.value);
  }, []);

  const handleFileDisplayNameChange = useCallback((e) => {
    setFileDisplayName(e.target.value);
  }, []);

  const handleOpenFileDialog = useCallback(() => {
    setFileDialogOpen(true);
    setFileUrl("");
    setFileDisplayName("");
  }, []);

  const handleUploadDocFile = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      if (file) {
        // Giới hạn 200MB cho file tài liệu
        if (file.size > 200 * 1024 * 1024) {
          toast("Kích thước file không được vượt quá 200MB", "error");
          event.target.value = "";
          return;
        }

        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("object_type", "news");

          const uploadResponse = await api.post(API_UPLOAD_FILESS, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          const fileId =
            uploadResponse?.data?.data?.id ||
            uploadResponse?.data?.data?._id ||
            uploadResponse?.data?.id ||
            uploadResponse?.data?._id;

          if (!fileId) {
            throw new Error("Không lấy được ID file từ server");
          }

          const fileUrlFromServer = `${APP_BASE}/api/files/view/${fileId}?filename=${encodeURIComponent(file.name)}`;
          setFileUrl(fileUrlFromServer);
          setFileDisplayName(file.name);
          toast("Tải lên file thành công. Nhấn 'Chèn' để đưa vào bài viết.", "success");
        } catch (error) {
          logger.error("Error uploading document:", error);
          toast("Lỗi khi upload tài liệu", "error");
        }
      }
      event.target.value = "";
    },
    [toast]
  );

  const handleDocDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files?.[0];
      if (file) {
        // Mock event object for handleUploadDocFile
        handleUploadDocFile({ target: { files: [file], value: "" } });
      }
    },
    [handleUploadDocFile]
  );

  const handleInsertFileLink = useCallback(() => {
    if (fileUrl.trim() && isEditorReady(editor)) {
      const name = fileDisplayName.trim() || "Tài liệu đính kèm";
      const htmlContent = `<a href="${fileUrl}" data-type="attachment" class="file-attachment-link" target="_blank" rel="noopener noreferrer">${name}</a> `;
      editor.chain().focus().insertContent(htmlContent).run();
      toast("Chèn file thành công", "success");
      handleCloseFileDialog();
    }
  }, [editor, fileUrl, fileDisplayName, handleCloseFileDialog, toast]);

  const handleFileUploadBoxClick = useCallback(() => {
    documentUploadInputRef.current?.click();
  }, []);

  const renderTitleField = useCallback(
    ({ field }) => (
      <InputComponents
        label="Tiêu đề"
        placeholder="Nhập tiêu đề tin tức..."
        required
        isView={false} // Force edit mode layout
        forceViewStyle={!isEditMode} // Use view style when not editing
        disabled={!isEditMode}
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
        rows={3.5}
        isView={false} // Force edit mode layout
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
        label="Ngày tạo"
        value={field.value}
        onChange={field.onChange}
        showTime={false}
        required
        disabled
        error={!!errors?.createdDate}
        helperText={errors?.createdDate?.message}
      />
    ),
    [errors?.createdDate]
  );

  const renderTopicField = useCallback(
    ({ field }) => (
      <InputComponents
        select
        label="Chủ đề"
        placeholder={isLoadingTopics ? "Đang tải..." : "Chọn chủ đề..."}
        options={topicOptions?.filter((topic) => topic.status?.includes("Hoạt động"))}
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

  // // Handler cho cancel button
  // const handleCancelClick = useCallback(() => {
  //   if (newsId) {
  //     // Chỉnh sửa tin tức: Reset form về dữ liệu gốc và thoát edit mode
  //     // Fetch lại dữ liệu gốc để reset
  //     getNewsDetail();
  //     setIsEditMode(false);
  //   } else {
  //     // Thêm mới tin tức: Đóng dialog
  //     onClose();
  //   }
  // }, [newsId, onClose, getNewsDetail]);

  const handleEditClick = useCallback(() => {
    setIsEditMode(true);
  }, []);

  const handleInsertSlogan = useCallback(() => {
    if (sloganValue.trim() && isEditorReady(editor)) {
      const sloganHtml = `
        <div class="slogan-container">
          <div class="slogan-text">“${sloganValue.trim()}”</div>
          ${mottoValue.trim() ? `<div class="slogan-motto">${mottoValue.trim()}</div>` : ""}
        </div>
      `;
      // Chèn tại vị trí con trỏ hiện tại
      editor.chain().focus().insertContent(sloganHtml).run();
      handleCloseSloganDialog();
      toast("Đã chèn khẩu hiệu thành công", "success");
    }
  }, [editor, sloganValue, mottoValue, toast, handleCloseSloganDialog]);

  const handleImportantChange = useCallback(
    (field) => (e) => {
      field.onChange(e.target.checked ? "true" : "false");
    },
    []
  );

  const renderCommentSwitch = useCallback(
    ({ field }) => (
      <FormControlLabel
        control={
          <Checkbox
            checked={field.value}
            onChange={handleSwitchChange(field)}
            icon={<RadioButtonUncheckedIcon />}
            checkedIcon={<RadioButtonCheckedIcon />}
            disabled={!isEditMode}
          />
        }
        label="Bình luận"
      />
    ),
    [handleSwitchChange, isEditMode]
  );

  const renderImportantRadio = useCallback(
    ({ field }) => (
      <FormControlLabel
        control={
          <Checkbox
            checked={field.value === "true"}
            onChange={handleImportantChange(field)}
            icon={<RadioButtonUncheckedIcon />}
            checkedIcon={<RadioButtonCheckedIcon />}
            disabled={!isEditMode}
          />
        }
        label="Tin quan trọng"
      />
    ),
    [handleImportantChange, isEditMode]
  );

  const renderImageTitleField = useCallback(
    ({ field }) => (
      <InputComponents
        label="Tên ảnh"
        placeholder="Nhập tên ảnh..."
        disabled={!isEditMode}
        error={!!errors?.imageTitle}
        helperText={errors?.imageTitle?.message}
        {...field}
      />
    ),
    [errors?.imageTitle, isEditMode]
  );

  const renderContentField = useCallback(
    () => (
      <Box>
        <EditorWrapper error={!!errors?.content}>
          {isEditMode && isEditorReady(editor) && (
            <EditorMenuBar
              editor={editor}
              onImageClick={handleOpenImageDialog}
              onLinkClick={handleOpenLinkDialog}
              onSloganClick={handleOpenSloganDialog}
              onFileClick={handleOpenFileDialog}
            />
          )}
          <EditorContentWrapper onClick={handleArticleClick}>
            {isEditorReady(editor) && <EditorContent editor={editor} />}
          </EditorContentWrapper>
        </EditorWrapper>
        {errors?.content && <ErrorText>{errors.content.message}</ErrorText>}
      </Box>
    ),
    [editor, errors?.content, handleOpenImageDialog, handleOpenLinkDialog, handleOpenSloganDialog, handleOpenFileDialog, isEditMode, handleArticleClick]
  );

  return (
    <CustomSwipper
      key={open ? (newsId ? "view-news-open" : "add-news-open") : "news-closed"}
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
      footer={
        <>
          <FlexGrowBox />
          <FooterActions>
            <ButtonActionBox>
              {isEditMode ? (
                <>
                {canSubmitNews && (
                    <ButtonOutline
                      type="button"
                      onClick={handleBrowseClick}
                      variant="outlined"
                      disabled={isSubmittingNews}
                    >
                      TRÌNH DUYỆT
                    </ButtonOutline>
                  )}
                  {(canPublishDirectly || canPublished) && (
                    <ButtonOutline
                      type="button"
                      onClick={handlePublishClick}
                      variant="outlined"
                      disabled={isPublishingNews}
                    >
                      XUẤT BẢN
                    </ButtonOutline>
                  )}
                  <ButtonOutline onClick={handlePreviewClick} variant="outlined">
                    XEM TRƯỚC
                  </ButtonOutline>
                  <ButtonOutline onClick={handleSaveClick} disabled={isSaving} variant="outlined">
                    LƯU
                  </ButtonOutline>
                </>
              ) : (
                <>
                  {canSubmitNews && (
                    <ButtonOutline
                      type="button"
                      onClick={handleBrowseClick}
                      variant="outlined"
                      disabled={isSubmittingNews}
                    >
                      TRÌNH DUYỆT
                    </ButtonOutline>
                  )}
                  {(canPublishDirectly || canPublished) && (
                    <ButtonOutline
                      type="button"
                      onClick={handlePublishClick}
                      variant="outlined"
                      disabled={isPublishingNews}
                    >
                      XUẤT BẢN
                    </ButtonOutline>
                  )}
                  <ButtonOutline onClick={handlePreviewClick} variant="outlined">
                    XEM TRƯỚC
                  </ButtonOutline>
                  <ButtonOutline onClick={handleEditClick} variant="outlined">
                    CHỈNH SỬA
                  </ButtonOutline>
                </>
              )}
            </ButtonActionBox>
          </FooterActions>
        </>
      }
      hideBackdrop
    >
      <FormContainer>
        <BasicInfoCard>
          <SectionTitle>THÔNG TIN CƠ BẢN</SectionTitle>
          <Grid container spacing={4}>
            {/* CỘT TRÁI - THÔNG TIN CHI TIẾT */}
            <Grid item xs={12} md={8}>
              <Grid container spacing={3}>
                {/* Tiêu đề */}
                <Grid item xs={12}>
                  <Controller
                    name="title"
                    control={control}
                    render={renderTitleField}
                  />
                </Grid>

                {/* Tóm tắt */}
                <Grid item xs={12}>
                  <Controller
                    name="summary"
                    control={control}
                    render={renderSummaryField}
                  />
                </Grid>

                {/* Tags & Options */}
                <TagsAndOptionsGrid item xs={12} container spacing={2}>
                  <Grid item xs={12} sm={currentNewsData?.isApprover ? 6 : 12}>
                    <Controller
                      name="tags"
                      control={control}
                      render={renderTagsField}
                    />
                  </Grid>
                  {currentNewsData?.isApprover && (
                    <>
                      <CheckboxGridItem item xs={6} sm={3}>
                        <Controller
                          name="isComment"
                          control={control}
                          render={renderCommentSwitch}
                        />
                      </CheckboxGridItem>
                      <CheckboxGridItem item xs={6} sm={3}>
                        <Controller
                          name="isImportant"
                          control={control}
                          render={renderImportantRadio}
                        />
                      </CheckboxGridItem>
                    </>
                  )}
                </TagsAndOptionsGrid>
              </Grid>
            </Grid>

            {/* CỘT PHẢI - CHỦ ĐỀ & HÌNH ẢNH */}
            <Grid item xs={12} md={4}>
              <Grid container spacing={3}>
                {/* Chủ đề */}
                <Grid item xs={12}>
                  <Controller
                    name="topic"
                    control={control}
                    render={renderTopicField}
                  />
                </Grid>

                {/* Ngày tạo */}
                <Grid item xs={12}>
                  <Controller
                    name="createdDate"
                    control={control}
                    render={renderDateField}
                  />
                </Grid>

                {/* Hình ảnh đại diện */}
                <Grid item xs={12}>
                    <Grid container spacing={1}>
                      <Grid item xs={12}>
                      <FormItem label="Ảnh bìa" required isView={false}></FormItem>
                      {/* Name Input */}
                      <Grid item xs={12}>
                        <Controller
                          name="imageTitle"
                          control={control}
                          render={renderImageTitleField}
                        />
                      </Grid>
                        <UploadArea
                          onClick={
                            isEditMode ? handleImageUploadClick : undefined
                          }
                          onDragEnter={handleImageDragEnter}
                          onDragOver={handleImageDragOver}
                          onDragLeave={handleImageDragLeave}
                          onDrop={handleFeaturedImageDrop}
                          isDragActive={isFeaturedImageDragActive}
                        >
                          {previewImage ? (
                            <>
                              <PreviewImageBox
                                component={AuthImage}
                                src={previewImage}
                                alt="Preview"
                              />
                              {isEditMode && (
                                <RemoveImageIconButton
                                  size="small"
                                  onClick={handleRemoveFeaturedImage}
                                  title="Xóa ảnh"
                                >
                                  <DeleteIcon />
                                </RemoveImageIconButton>
                              )}
                            </>
                          ) : (
                            <>
                              <UploadIcon>
                                <svg
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" />
                                </svg>
                              </UploadIcon>
                              <UploadText>
                                {isEditMode
                                  ? "Kéo thả hoặc nhấp để tải hình ảnh cho tin tức"
                                  : "Ảnh bìa"}
                              </UploadText>
                              {isEditMode && (
                                <UploadSubText>
                                  PNG, JPG, GIF (tối đa 200MB)
                                </UploadSubText>
                              )}
                            </>
                          )}
                        </UploadArea>

                        {isEditMode && (
                          <HiddenFileInput
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                          />
                        )}
                      </Grid>
                    </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </BasicInfoCard>

        {/* PHẦN NỘI DUNG CHÍNH */}
        <MainCard>
          <SectionTitle>NỘI DUNG CHÍNH</SectionTitle>
          <Controller
            name="content"
            control={control}
            render={renderContentField}
          />
        </MainCard>
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
                <InputComponents
                  fullWidth
                  label="Tên ảnh (Alt text)"
                  placeholder="Nhập tên mô tả cho ảnh..."
                  value={editorImageTitle}
                  onChange={handleEditorImageTitleChange}
                  variant="outlined"
                />
              </InputWrapper>
              <SubSectionTitle>Tải lên file</SubSectionTitle>
              {imageUrl ? (
                <DialogPreviewImage
                  src={imageUrl}
                  alt="Preview"
                />
              ) : (
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
              )}
              <HiddenFileInput
                ref={imageUploadInputRef}
                type="file"
                accept="image/*"
                onChange={handleUploadImageFile}
              />
            </Grid>
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

      {/* Dialog Preview */}
      <PreviewDialog
        open={previewDialogOpen}
        onClose={handleClosePreviewDialog}
      >
        <PreviewDialogTitle>Xem trước tin tức</PreviewDialogTitle>
        <PreviewDialogContentStyled>
          {/* Main Title */}
          {watch("title") && (
            <PreviewTitleText>
              {watch("title")}
            </PreviewTitleText>
          )}

          {/* Featured Image */}
          {previewImage && (
            <PreviewImageSection>
              <PreviewImage src={previewImage} alt="Featured" />
              <PreviewImageCaption>
                {watch("imageTitle") || "Ảnh bìa"}
              </PreviewImageCaption>
            </PreviewImageSection>
          )}

          {/* Summary */}
          {watch("summary") && (
            <FieldLabelText>
              {watch("summary")}
            </FieldLabelText>
          )}

          {/* Content */}
          {watch("content") && (
            <PreviewContentBox
              onClick={handleArticleClick}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(watch("content")) }}
            />
          )}
        </PreviewDialogContentStyled>
        <DialogActionsStyled>
          <ButtonDanger 
            onClick={handleClosePreviewDialog} 
            variant="contained"
          >
            Đóng
          </ButtonDanger>
        </DialogActionsStyled>
      </PreviewDialog>

      {/* Dialog Insert Link */}
      <Dialog
        open={linkDialogOpen}
        onClose={handleCloseLinkDialog}
        PaperProps={{
          sx: { minWidth: "450px" }
        }}
      >
        <DialogTitle>Chèn liên kết</DialogTitle>
        <LinkDialogContentStyled>
          <InputComponents
            fullWidth
            label="URL"
            placeholder="https://example.com"
            value={linkUrl}
            onChange={handleLinkUrlChange}
            variant="outlined"
            autoFocus
            error={!!linkUrlError}
            helperText={linkUrlError}
          />
          <InputComponents
            fullWidth
            label="Văn bản hiển thị (tùy chọn)"
            placeholder="Nhập văn bản..."
            value={linkText}
            onChange={handleLinkTextChange}
            variant="outlined"
          />
        </LinkDialogContentStyled>
        <LinkDialogActionsStyled>
          <ButtonDanger onClick={handleCloseLinkDialog} variant="contained">
            Hủy
          </ButtonDanger>
          <Button
            onClick={handleInsertLinkClick}
            variant="contained"
            disabled={!linkUrl.trim() || !!linkUrlError}
          >
            Chèn
          </Button>
        </LinkDialogActionsStyled>
      </Dialog>

      {/* Dialog Insert Slogan */}
      <Dialog
        open={sloganDialogOpen}
        onClose={handleCloseSloganDialog}
        PaperProps={{
          sx: { minWidth: "550px" },
        }}
      >
        <DialogTitle>Chèn khẩu hiệu, phương châm</DialogTitle>
        <LinkDialogContentStyled>
          <InputComponents
            fullWidth
            label="Khẩu hiệu / Nội dung chính"
            placeholder="Nhập nội dung khẩu hiệu..."
            value={sloganValue}
            onChange={handleSloganValueChange}
            multiline
            rows={3}
            variant="outlined"
            autoFocus
          />
          <InputComponents
            fullWidth
            label="Phương châm / Tiêu đề phụ"
            placeholder="Ví dụ: Phương châm hoạt động"
            value={mottoValue}
            onChange={handleMottoValueChange}
            variant="outlined"
          />
        </LinkDialogContentStyled>
        <LinkDialogActionsStyled>
          <ButtonDanger onClick={handleCloseSloganDialog} variant="contained">
            Hủy
          </ButtonDanger>
          <Button
            onClick={handleInsertSlogan}
            variant="contained"
            disabled={!sloganValue.trim()}
          >
            Chèn
          </Button>
        </LinkDialogActionsStyled>
      </Dialog>

      {/* Dialog Xác nhận Trình duyệt */}
      <SubmitNewsDialog
        open={openConfirmBrowse}
        onClose={handleCloseConfirmBrowse}
        onConfirm={handleBrowseNews}
        newsId={newsId}
        toast={toast}
      />

       {/* Dialog Xác nhận Duyệt & Xuất bản */}
       <ApproveNewsDialog
        open={openApproveDialog}
        onClose={handleCloseApproveDialog}
        onSuccess={handleApproveSuccess}
        newsId={newsId || data?.id || data?._id || documentId}
        toast={toast}
        isView={isView}
      />

       {/* Loading Dialog */}
      <LoadingDialog open={isSaving || isSubmittingNews || isPublishingNews}>
        <StyledDialogContent>
          {isSubmittingNews 
            ? "Đang trình duyệt tin tức, vui lòng chờ trong giây lát..."
            : isPublishingNews
              ? "Đang xuất bản tin tức, vui lòng chờ trong giây lát..."
              : "Đang cập nhật tin tức, vui lòng chờ trong giây lát..."}
        </StyledDialogContent>
      </LoadingDialog>

      {/* Dialog cắt ảnh (Giống Banner trong Configuration) */}
      <CustomDialog
        open={isCropDialogOpen}
        onClose={handleCloseCropDialog}
        title={cropTarget === "featured" ? "Cắt ảnh đại diện" : "Cắt ảnh nội dung"}
        onSave={handleCropConfirm}
        titleButton="XÁC NHẬN"
        cancelButtonText="Hủy"
        type="add"
        size="md"
      >
        <DialogContent>
          <CropContainer>
            {cropImageSrc && (
              <ReactCrop
                crop={crop}
                onChange={setCrop}
                onComplete={setCompletedCrop}
              >
                <img
                  src={cropImageSrc}
                  onLoad={onImageLoad}
                  alt="Crop source"
                  style={{ maxWidth: "100%", maxHeight: "70vh" }}
                />
              </ReactCrop>
            )}
          </CropContainer>
          <CropCaptionText>
            Kéo các góc hoặc cạnh để chọn vùng ảnh. Bạn có thể tự do điều chỉnh khung cắt theo ý muốn.
          </CropCaptionText>
        </DialogContent>
      </CustomDialog>

      <ImageCropperDialog
        open={cropperOpen}
        onClose={handleCropperClose}
        imageSrc={cropperImageSrc}
        onCropComplete={handleCropperComplete}
        aspect={16/9}
        exportScale={2}
      />

      {/* Dialog Upload File */}
      <FileDialog
        open={fileDialogOpen}
        onClose={handleCloseFileDialog}
      >
        <DialogTitle>Chèn tài liệu (PDF, DOCX, ...)</DialogTitle>
        <DialogContentStyled>
          <StyledFormGroup>
            <FileDialogSectionTitle variant="subtitle2">
              1. Tải file lên từ máy tính
            </FileDialogSectionTitle>
            <ImageUploadBox
              onClick={handleFileUploadBoxClick}
              onDragOver={handleImageDragOver}
              onDrop={handleDocDrop}
            >
              <ImageIconStyled />
              <FileDialogHelperText>
                {fileUrl ? `Đã chọn: ${fileDisplayName}` : "Nhấp hoặc kéo thả file vào đây để tải lên"}
              </FileDialogHelperText>
              <FileDialogHelperText isCaption>
                (Hỗ trợ PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, ZIP, RAR, 7Z,... Tối đa 200MB)
              </FileDialogHelperText>
            </ImageUploadBox>
          </StyledFormGroup>

          <StyledFormGroup>
            <FileDialogSectionTitle variant="subtitle2">
              2. Hoặc dán link trực tiếp
            </FileDialogSectionTitle>
            <TextField
              fullWidth
              size="small"
              placeholder="https://example.com/document.pdf"
              value={fileUrl}
              onChange={handleFileUrlChange}
              label="URL tài liệu"
            />
          </StyledFormGroup>

          <StyledFormGroup>
            <FileDialogSectionTitle variant="subtitle2">
              Tên hiển thị (Tùy chọn)
            </FileDialogSectionTitle>
            <TextField
              fullWidth
              size="small"
              placeholder="Ví dụ: Báo cáo quy hoạch 2024"
              value={fileDisplayName}
              onChange={handleFileDisplayNameChange}
            />
          </StyledFormGroup>
        </DialogContentStyled>
        <DialogActionsStyled>
          <Button onClick={handleCloseFileDialog}>Hủy</Button>
          <Button
            onClick={handleInsertFileLink}
            variant="contained"
            disabled={!fileUrl?.trim()}
          >
            Chèn vào bài viết
          </Button>
        </DialogActionsStyled>
      </FileDialog>

      {/* Input ẩn cho upload tài liệu */}
      <input
        type="file"
        ref={documentUploadInputRef}
        style={{ display: "none" }}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z,.tar,.gz,.bz2,.xz,.tgz,.tbz2,.iso"
        onChange={handleUploadDocFile}
      />
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

export default withSharedComponents(ViewNews);