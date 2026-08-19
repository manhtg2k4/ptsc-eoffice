// File: src/components/AddNews/index.jsx
import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  Grid,
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  FormControlLabel,
  styled,
  Checkbox,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import dayjs from "dayjs";
import AuthImage from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimImage';
import withSharedComponents from "@components/WrapperComponent";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import axiosInstance from "@utils/axiosInstance";
import api from "@services/api";
import {
  API_NEWS_MANAGEMENT,
  API_UPLOAD_FILESS,
  APP_BASE,
} from "@EnvironmentFile/constants/urlConfig";
import CustomAsyncAutoComplete from "@components/CustomAsyncAutoComplete";
import { withFormWrapper, FormItem } from "@components/common/FormWrapper";

const API_NEWS_SUBMIT = `${APP_BASE}/api/news/submit`;
import CustomSwipper from "@components/Swipper/BaseSwiper";

// Import TipTap
import {
  useEditor,
  EditorContent,
  NodeViewWrapper,
  NodeViewContent,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Node, mergeAttributes } from "@tiptap/core";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import { Link } from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { CustomResizableImage } from "@utils/tiptapExtensions";
import { ReactCrop, centerCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import DOMPurify from "dompurify";
import { useFilePreview } from "@components/FilePreview/useFilePreview";
import FilePreviewModal from "@components/FilePreview/FilePreviewModal";
import { useAttachmentClick } from "@hooks/useAttachmentClick";
import ImageCropperDialog from "@components/ImageCropperDialog";
import {
  handleCompressedFileDownload,
  handleDefaultFileClick,
} from "@services/FileUpload/fileUpload";
// Tiptap slogan extensions
const StyledSloganWrapper = styled(NodeViewWrapper)(({ selected, theme }) => ({
  cursor: "text",
  display: "block",
  float: "left",
  maxWidth: "45%",
  backgroundColor: selected
    ? theme?.palette?.mode === "dark"
      ? "rgba(30, 58, 138, 0.4)"
      : "#e3f2fd"
    : theme?.palette?.mode === "dark"
      ? "rgba(30, 58, 138, 0.2)"
      : "#f0f7ff",
  borderRadius: "16px",
  padding: "20px 24px",
  margin: "4px 20px 12px 0",
  border: selected ? `2px solid #0066CC !important` : "2px solid transparent",
  outline: "none !important",
  boxShadow: selected ? "0 0 0 2px rgba(0, 102, 204, 0.2)" : "none",
  transition: "all 0.2s",

  "& .slogan-text": {
    background: "linear-gradient(to right, #47A1FF, #0066CC)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    fontSize: "18px",
    fontWeight: 600,
    fontStyle: "italic",
    marginBottom: "12px",
    lineHeight: "1.6",
  },
  "& .slogan-motto": {
    color: theme?.palette?.mode === "dark" ? theme.palette.grey[400] : theme.palette.grey[600],
    fontSize: "13px",
    fontWeight: 600,
    fontStyle: "italic",
    display: "block",
    marginTop: "8px",
  },
}));

const SloganNodeView = ({ selected, editor, getPos }) => {
  const handleDoubleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = getPos();
    if (isEditorReady(editor)) {
      editor.commands.setNodeSelection(pos);
    }
  };

  return (
    <StyledSloganWrapper onDoubleClick={handleDoubleClick} selected={selected}>
      <NodeViewContent />
    </StyledSloganWrapper>
  );
};

const Slogan = Node.create({
  name: "slogan",
  group: "block",
  content: "sloganText sloganMotto?",
  selectable: true,
  draggable: true,
  parseHTML() {
    return [
      {
        tag: "div.slogan-container",
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "slogan-container" }), 0];
  },
  addNodeView() {
    return ReactNodeViewRenderer(SloganNodeView);
  },
});

const SloganText = Node.create({
  name: "sloganText",
  group: "block",
  content: "inline*",
  parseHTML() {
    return [
      {
        tag: "div.slogan-text",
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
        tag: "div.slogan-motto",
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "slogan-motto" }), 0];
  },
});

// Slogan content is now handled via attributes in the Slogan node


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
  LinkDialog,
  SloganDialog,
  BasicInfoCard,
} from "./NewsForm.styles";

// Import Material Icons
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";
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
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CampaignIcon from "@mui/icons-material/Campaign";
import CustomInputTag from "@components/CustomInput/CustomInputTag";
import LoadingDialog from "@components/LoadingDialog";
import ApproveNewsDialog from "./ApproveNewsDialog";
import { FlexGrowBox, FooterActions } from "@styles/BaseSwiper/BaseSwiper.style";
import {
  CancelButton,
  StyledDialogContent,
  SaveButton,
} from "@styles/CustomDialog.styles";

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
  topic: yup.string().required("Chủ đề là bắt buộc"),
  tags: yup.array().nullable(),
  featuredImage: yup.mixed().nullable(),
  imageTitle: yup.string().max(100, "Tên ảnh không được vượt quá 100 ký tự"),
  content: yup
    .string()
    .test("is-empty", "Nội dung chính là bắt buộc", (value) => !isHtmlEmpty(value))
    .required("Nội dung chính là bắt buộc"),
  isComment: yup.boolean(),
  isImportant: yup.string().required("Vui lòng chọn tính chất tin"),
});

const isEditorReady = (editor) => !!editor && !editor.isDestroyed;

// Menu Bar Component
function EditorMenuBar({ editor, onImageClick, onLinkClick, onFileClick, onSloganClick }) {
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

  const handleAddFile = useCallback(() => {
    onFileClick?.();
  }, [onFileClick]);

  const handleAddSlogan = useCallback(() => {
    onSloganClick?.();
  }, [onSloganClick]);

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

      <MenuButton onClick={handleAddFile} title="Insert File (PDF, DOC, ...)">
        <AttachFileIcon />
      </MenuButton>

      <MenuButton onClick={handleAddSlogan} title="Chèn khẩu hiệu, phương châm">
        <CampaignIcon />
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

function AddNews({ open, onClose, onSuccess, sharedComponents, isView = false, onFileClick }) {
  const { Dialog: CustomDialog, ButtonOutline, InputComponents: BaseInput, DateTimePicker: BaseDateTimePicker, toast } =
    sharedComponents;

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
    (params) => handleDefaultFileClick({ ...params, handlePreview, onFileClick }),
    [onFileClick, handlePreview]
  );

  const handleArticleClick = useAttachmentClick(handleFileClick);

  // State để lưu newsId sau khi tạo thành công
  const [newNewsId, setNewNewsId] = useState(null);
  const isReadOnly = isView || !!newNewsId;

  // Wrapper components to move labels above inputs
  const InputComponents = useMemo(() => {
    const Wrapped = withFormWrapper(BaseInput, "input");
    const Component = (props) => <Wrapped {...props} isView={isView} disabled={isReadOnly || props.disabled} />;
    Component.displayName = "InputComponents";
    return Component;
  }, [isView, isReadOnly, BaseInput]);

  const DateTimePicker = useMemo(() => {
    const Wrapped = withFormWrapper(BaseDateTimePicker, "date");
    const Component = (props) => <Wrapped {...props} isView={isView} disabled={isReadOnly || props.disabled} />;
    Component.displayName = "DateTimePicker";
    return Component;
  }, [isView, isReadOnly, BaseDateTimePicker]);

  const AsyncAutoCompletes = useMemo(() => {
    const Wrapped = withFormWrapper(CustomAsyncAutoComplete, "asyncSelect");
    const Component = (props) => <Wrapped {...props} isView={isView} disabled={isReadOnly || props.disabled} />;
    Component.displayName = "AsyncAutoCompletes";
    return Component;
  }, [isView, isReadOnly]);

  const InputTag = useMemo(() => {
    const Wrapped = withFormWrapper(CustomInputTag, "input");
    const Component = (props) => <Wrapped {...props} isView={isView} disabled={isReadOnly || props.disabled} />;
    Component.displayName = "InputTag";
    return Component;
  }, [isView, isReadOnly]);

  const [isReady, setIsReady] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [isFeaturedImageDragActive, setIsFeaturedImageDragActive] = useState(false);
  const [, setImageName] = useState("");
  const fileInputRef = React.useRef(null);
  const handleUploadImageFileRef = React.useRef(null);

  const [, setCurrentNewsData] = useState(null);

  // State cho dialog upload ảnh
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const imageUploadInputRef = React.useRef(null);
  const [editorImageFiles, setEditorImageFiles] = useState([]); // Lưu các ảnh upload từ editor
  const [editorImageTitle, setEditorImageTitle] = useState(""); // Tên ảnh cho editor

  // State cho dialog upload file (docs, pdf...)
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [fileUrl, setFileUrl] = useState("");
  const [fileDisplayName, setFileDisplayName] = useState("");
  const documentUploadInputRef = React.useRef(null);

  // State cho dialog insert link
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [linkUrlError, setLinkUrlError] = useState("");

  // State cho dialog preview
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewType, setPreviewType] = useState("preview"); // "preview" hoặc "draft"

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingNews, setIsSubmittingNews] = useState(false);
  const [isPublishingNews] = useState(false);
  const [openConfirmBrowse, setOpenConfirmConfirmBrowse] = useState(false);
  const [openApproveDialog, setOpenApproveDialog] = useState(false);

  // State cho khẩu hiệu & phương châm
  const [sloganDialogOpen, setSloganDialogOpen] = useState(false);
  const [sloganValue, setSloganValue] = useState("");
  const [mottoValue, setMottoValue] = useState("");

  // States cho cropping
  const [cropImageSrc, setCropImageSrc] = useState("");
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState();
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [cropTarget, setCropTarget] = useState(null); // "featured" hoặc "editor"
  const imgRef = React.useRef(null);

  // States cho ImageCropperDialog (Hình ảnh đại diện)
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState(null);

  // Quyền thao tác tin tức
  const [canSubmitNews, setCanSubmitNews] = useState(false);
  const [canPublishDirectly, setCanPublishDirectly] = useState(false);
  const [canPublished, setCanPublished] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    if (open) {
      axiosInstance.get(`${API_NEWS_MANAGEMENT}/user-role`)
        .then((response) => {
          // Trích xuất cực kỳ an toàn để tương thích với mọi loại Axios interceptor
          const resData = response?.data || response;
          const role = resData?.data?.role || resData?.role || response?.role;
          setUserRole(role);
        })
        .catch((error) => {
          logger.error("Lỗi khi lấy vai trò tài khoản trong luồng tin tức:", error);
          setUserRole(null);
        });
    } else {
      setUserRole(null);
    }
  }, [open]);


  const defaultFormValues = useMemo(
    () => ({
      title: "",
      summary: "",
      createdDate: dayjs(),
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
  });

  const contentValue = watch("content");

  // TipTap Editor
  const handleCloseDrawer = useCallback(() => {
    if (newNewsId) {
      onSuccess?.();
    }
    onClose();
  }, [newNewsId, onSuccess, onClose]);

  const handleEditorUpdate = useCallback(
    ({ editor }) => {
      if (!isEditorReady(editor)) return;
      setValue("content", editor.getHTML(), { shouldValidate: true });
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

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.setEditable(!isReadOnly);
    }
  }, [editor, isReadOnly]);

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
      setEditorImageFiles([]);
      setNewNewsId(null);
      setCanSubmitNews(false);
      setCanPublishDirectly(false);
      setCanPublished(false);
      if (isEditorReady(editor)) {
        editor.commands.setContent("");
      }
    }
  }, [open, reset, defaultFormValues, editor]);

  // Hàm tạo mới tin tức (dùng chung cho Lưu nháp và Trình duyệt)
  const createNewsItem = useCallback(
    async (data) => {
      if (!data.title?.trim()) throw new Error("Tiêu đề không được để trống");
      if (isHtmlEmpty(data.content))
        throw new Error("Nội dung không được để trống");
      if (!data.topic?.trim()) throw new Error("Chủ đề không được để chọn");

      // Tags là array, check length thay vì trim
      // const tagsArray = Array.isArray(data.tags) ? data.tags : [];
      // if (tagsArray.length === 0) {
      //   throw new Error("Vui lòng thêm ít nhất 1 tag");
      // }

      // 1. Gửi raw JSON tạo tin tức trước để lấy ID
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
      };

      // Thêm tên ảnh đại diện nếu có
      if (data.imageTitle?.trim()) {
        payload.nameThumbnail = String(data.imageTitle || "").trim();
      }

      const createResponse = await axiosInstance.post(
        API_NEWS_MANAGEMENT,
        payload,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      const newsId =
        createResponse.data?.document?.id ||
        createResponse.data?.data?.id ||
        createResponse.data?.data?._id ||
        createResponse.data?.id ||
        createResponse.data?._id ||
        createResponse.document?.id ||
        createResponse.id ||
        createResponse._id;

      if (!newsId) {
        throw new Error("Không lấy được ID tin tức từ server");
      }

      logger.log("Tin tức được tạo với ID:", newsId);

      // 2. Chuẩn bị upload ảnh đại diện (ảnh gốc + 3 size) và ảnh từ editor
      const uploadPromises = [];

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
        const formData = new FormData();
        formData.append("file", file); // Luôn gửi key là "file"
        formData.append("object_type", "news");
        formData.append("object_id", targetId);

        // Nếu có truyền typeSize (sizeSmall, sizeMedium, sizeBig) thì gửi kèm
        if (typeSize) {
          formData.append("typeSize", typeSize);
        }

        await api.post(API_UPLOAD_FILESS, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      };

      // Nếu có ảnh đại diện, thêm vào hàng đợi upload
      if (imageFile) {
        uploadPromises.push(
          (async () => {
            try {
              // Resize đồng thời
              const [fSmall, fMedium, fBig] = await Promise.all([
                resizeImage(imageFile, 480),
                resizeImage(imageFile, 1024),
                resizeImage(imageFile, 1920),
              ]);

              // Upload từng cái song song (Gốc + 3 size)
              await Promise.all([
                uploadVersion(imageFile, null, newsId), // Ảnh gốc (không truyền typeSize)
                uploadVersion(fSmall, "sizeSmall", newsId),
                uploadVersion(fMedium, "sizeMedium", newsId),
                uploadVersion(fBig, "sizeBig", newsId),
              ]);
            } catch (err) {
              logger.error("Lỗi upload bộ ảnh đại diện:", err);
            }
          })()
        );
      }

      // Upload các ảnh từ editor bằng vòng lặp
      if (editorImageFiles.length > 0 && newsId) {
        editorImageFiles.forEach((file) => {
          uploadPromises.push(
            (async () => {
              try {
                const formData = new FormData();
                formData.append("file", file.rawFile);
                formData.append("object_type", "news");
                formData.append("object_id", newsId);

                await api.post(API_UPLOAD_FILESS, formData, {
                  headers: { "Content-Type": "multipart/form-data" },
                });
              } catch (uploadError) {
                logger.error("Upload editor image error:", uploadError);
              }
            })()
          );
        });
      }

      // Chạy tất cả upload song song bằng Promise.all
      if (uploadPromises.length > 0) {
        await Promise.all(uploadPromises);
      }

      return newsId;
    },
    [imageFile, editorImageFiles]
  );

  // Hàm Lưu nháp - tạo tin tức và giữ nguyên dialog
  const onSubmitForm = useCallback(
    async (data) => {
      // Prevent multiple submit
      if (isSubmitting) return;

      try {
        setIsSubmitting(true);
        const newsId = await createNewsItem(data);
        setNewNewsId(newsId);
        setEditorImageFiles([]);
        toast("Lưu nháp tin tức thành công!", "success");

        // Sau khi lưu nháp thành công, fetch lại chi tiết để lấy quyền canSubmitNews, canPublished
        try {
          const detailResponse = await axiosInstance.get(
            `${API_NEWS_MANAGEMENT}/${newsId}`
          );
          const detailData =
            detailResponse.data?.document ||
            detailResponse.data?.data ||
            detailResponse.data ||
            detailResponse;

          if (detailData) {
            const flags = detailData.actionFlags || {};
            setCanSubmitNews(flags.canSubmitNews === true);
            setCanPublishDirectly(flags.canPublishDirectly === true);
            setCanPublished(flags.canPublished === true);
            setCurrentNewsData(detailData);
          }
        } catch (detailError) {
          logger.error("Lỗi khi fetch chi tiết sau lưu nháp:", detailError);
        }

        // KHÔNG CLOSE DIALOG - giữ nguyên để người dùng có thể dùng nút Trình duyệt
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
        setIsSubmitting(false);
      }
    },
    [toast, isSubmitting, createNewsItem]
  );

  // Hàm Trình duyệt - gọi API detail và submit
  const handleBrowseNews = useCallback(async () => {
    // Prevent multiple submit
    if (isSubmittingNews || !newNewsId) return;

    try {
      setIsSubmittingNews(true);

      // Gọi API lấy chi tiết tin tức vừa tạo
      const detailResponse = await axiosInstance.get(
        `${API_NEWS_MANAGEMENT}/${newNewsId}`,
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
        ids: [newNewsId],
        roleCode: roleCode,
        processKey: processKey,
        note: "Đề nghị phê duyệt tin tức này",
      };

      await axiosInstance.post(
        `${API_NEWS_SUBMIT}/${currentWorkItem.id}`,
        submitPayload,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      toast("Trình duyệt tin tức thành công!", "success");

      // Reset và close dialog sau khi submit thành công
      setNewNewsId(null);
      setCurrentNewsData(null);
      reset(defaultFormValues);
      setPreviewImage(null);
      setImageFile(null);
      setEditorImageFiles([]);
      if (isEditorReady(editor)) {
        editor.commands.setContent("");
      }
      onSuccess();
      onClose();
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
    newNewsId,
    toast,
    onSuccess,
    onClose,
    reset,
    defaultFormValues,
    editor,
  ],
  );

  const handleConfirmBrowse = useCallback(() => {
    setOpenConfirmConfirmBrowse(false);
    handleBrowseNews();
  }, [handleBrowseNews]);

  const handleCloseConfirmBrowse = useCallback(() => {
    setOpenConfirmConfirmBrowse(false);
  }, []);

  const handleFormError = useCallback(
    (errs) => {
      const firstError = Object.values(errs)[0];
      toast(firstError?.message || "Vui lòng kiểm tra lại thông tin!", "error");
    },
    [toast]
  );

  // Xử lý click nút Lưu nháp
  const handleSaveDraftClick = useCallback(() => {
    handleSubmit(onSubmitForm, handleFormError)();
  }, [handleSubmit, onSubmitForm, handleFormError]);

  // Xử lý click nút Trình duyệt
  const handleBrowseClick = useCallback(() => {
    if (!newNewsId) {
      toast("Vui lòng lưu nháp trước khi trình duyệt", "warning");
      return;
    }
    setOpenConfirmConfirmBrowse(true);
  }, [newNewsId, toast]);

  // Xử lý click nút Xuất bản
  const handlePublishClick = useCallback(() => {
    if (!newNewsId) {
      toast("Vui lòng lưu nháp trước khi xuất bản", "warning");
      return;
    }
    setOpenApproveDialog(true);
  }, [newNewsId, toast]);

  const handleApproveSuccess = useCallback(() => {
    onSuccess?.();
    onClose?.();
  }, [onSuccess, onClose]);

  const handleCloseApproveDialog = useCallback(() => {
    setOpenApproveDialog(false);
  }, []);

  const handleImageUploadClick = useCallback(() => {
    if (isReadOnly) return;
    fileInputRef.current?.click();
  }, [isReadOnly]);

  const handleImageChange = useCallback(
    (event) => {
      if (isReadOnly) return;
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
    [toast, isReadOnly]
  );

  const handleFeaturedImageDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsFeaturedImageDragActive(false);
      if (isReadOnly) return;
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
    [toast, isReadOnly]
  );

  const handleCropperComplete = useCallback((croppedFile, objectUrl) => {
    setImageFile(croppedFile);
    setImageName(croppedFile.name);
    setPreviewImage(objectUrl);
    setValue("featuredImage", croppedFile, { shouldValidate: true });
    toast("Đã cắt và thêm ảnh đại diện thành công", "success");
  }, [setValue, toast]);

  const handleCropperClose = useCallback(() => {
    setCropperOpen(false);
  }, []);

  const handleRemoveFeaturedImage = useCallback(
    (e) => {
      e?.stopPropagation();
      setPreviewImage(null);
      setImageFile(null);
      setImageName("");
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
      setImageName(fileName);
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

  const handleCloseCropDialog = useCallback(() => {
    setIsCropDialogOpen(false);
    setCropImageSrc("");
    setCropTarget(null);
  }, []);

  const handleImageDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFeaturedImageDragActive(true);
  }, []);

  const handleImageDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFeaturedImageDragActive(true);
  }, []);

  const handleImageDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFeaturedImageDragActive(false);
  }, []);

  const handleInsertImageUrl = useCallback(() => {
    if (imageUrl.trim() && isEditorReady(editor)) {
      const title = editorImageTitle.trim();
      let htmlContent = `<img src="${imageUrl}" alt="${title || "image"}" title="${title || "image"}" />`;
      if (title) {
        htmlContent += `<p style="text-align: center"><em>${title}</em></p>`;
      }
      editor.chain().focus().insertContent(htmlContent).run();
      toast("Chèn ảnh thành công", "success");
      handleCloseImageDialog();
    }
  }, [editor, imageUrl, handleCloseImageDialog, toast, editorImageTitle]);

  const handleImageUploadBoxClick = useCallback(() => {
    imageUploadInputRef.current?.click();
  }, []);

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

  const handleCloseLinkDialog = useCallback(() => {
    setLinkDialogOpen(false);
    setLinkUrl("");
    setLinkText("");
    setLinkUrlError("");
  }, []);

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

  const handleLinkTextChangeCallback = useCallback((e) => {
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

  const handleSloganValueChange = useCallback((e) => {
    setSloganValue(e.target.value);
  }, []);

  const handleMottoValueChange = useCallback((e) => {
    setMottoValue(e.target.value);
  }, []);

  // Xử lý upload file tài liệu vào editor
  const handleOpenFileDialog = useCallback(() => {
    setFileDialogOpen(true);
    setFileUrl("");
    setFileDisplayName("");
  }, []);

  const handleCloseFileDialog = useCallback(() => {
    setFileDialogOpen(false);
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
          logger.log("Error uploading document:", error);
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

      // Ép trình duyệt tải về bằng cách dùng hàm downloadFile (fetch blob)
      // Dùng link tiêu chuẩn kèm data-type để bắt sự kiện click tải về bằng JS
      const htmlContent = `<a href="${fileUrl}" data-type="attachment" class="file-attachment-link" target="_blank" rel="noopener noreferrer">${name}</a> `;

      editor.chain().focus().insertContent(htmlContent).run();
      toast("Chèn file thành công", "success");
      handleCloseFileDialog();
    }
  }, [editor, fileUrl, fileDisplayName, handleCloseFileDialog, toast]);

  const handleOpenSloganDialog = useCallback(() => {
    setSloganDialogOpen(true);
    setSloganValue("");
    setMottoValue("");
  }, []);

  const handleCloseSloganDialog = useCallback(() => {
    setSloganDialogOpen(false);
  }, []);

  const handleInsertSlogan = useCallback(() => {
    if (sloganValue.trim() && isEditorReady(editor)) {
      const sloganHtml = `<div class="slogan-container"><div class="slogan-text">“${sloganValue.trim()}”</div>${mottoValue.trim() ? `<div class="slogan-motto">${mottoValue.trim()}</div>` : ""}</div>`;
      editor.chain().focus().insertContent(sloganHtml).run();
      handleCloseSloganDialog();
      toast("Đã chèn khẩu hiệu thành công", "success");
    }
  }, [editor, sloganValue, mottoValue, handleCloseSloganDialog, toast]);

  const handleFileUploadBoxClick = useCallback(() => {
    documentUploadInputRef.current?.click();
  }, []);

  const handleOpenPreviewDialog = useCallback((type) => {
    setPreviewType(type);
    setPreviewDialogOpen(true);
  }, []);

  const handleClosePreviewDialog = useCallback(() => {
    setPreviewDialogOpen(false);
  }, []);

  const handlePreviewClick = useCallback(() => {
    handleOpenPreviewDialog("preview");
  }, [handleOpenPreviewDialog]);

  const renderTitleField = useCallback(
    ({ field }) => (
      <InputComponents
        label="Tiêu đề"
        placeholder="Nhập tiêu đề tin tức..."
        required
        error={!!errors?.title}
        helperText={errors?.title?.message}
        {...field}
      />
    ),
    [errors?.title, InputComponents]
  );

  const renderSummaryField = useCallback(
    ({ field }) => (
      <InputComponents
        label="Tóm tắt"
        placeholder="Nhập tóm tắt tin tức..."
        multiline
        rows={3.5}
        error={!!errors?.summary}
        helperText={errors?.summary?.message}
        {...field}
      />
    ),
    [errors?.summary, InputComponents]
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
    [errors?.createdDate, DateTimePicker]
  );

  const renderTopicField = useCallback(
    ({ field }) => (
      <AsyncAutoCompletes
        url={`${APP_BASE}/api/topic`}
        label="Chủ đề"
        placeholder="Tìm kiếm chủ đề..."
        queryParam="name"
        optionLabel="name"
        optionValue="id"
        required
        returnObject={false}
        filterOptions={(options) => options.filter((opt) => opt.status?.includes("Hoạt động"))}
        error={!!errors?.topic}
        helperText={errors?.topic?.message}
        {...field}
      />
    ),
    [errors?.topic, AsyncAutoCompletes]
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
          name="tags"
        />
      );
    },
    [errors?.tags, handleTagsChange, InputTag]
  );

  const handleSwitchChange = useCallback(
    (field) => (e) => {
      field.onChange(e.target.checked);
    },
    []
  );

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
            disabled={isReadOnly}
          />
        }
        label="Bình luận"
      />
    ),
    [isReadOnly, handleSwitchChange]
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
            disabled={isReadOnly}
          />
        }
        label="Tin quan trọng"
      />
    ),
    [isReadOnly, handleImportantChange]
  );

  const renderImageTitleField = useCallback(
    ({ field }) => (
      <InputComponents
        placeholder="Nhập tên ảnh..."
        error={!!errors?.imageTitle}
        helperText={errors?.imageTitle?.message}
        {...field}
      />
    ),
    [errors?.imageTitle, InputComponents]
  );

  const handleEditorContentClick = useCallback(
    (event) => {
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
            return;
          }

          if (fileId) {
            event.preventDefault();
            event.stopPropagation();
            handlePreviewRef.current({ id: fileId, fileName, href });
          } else if (href) {
            event.preventDefault();
            event.stopPropagation();
            window.open(href, "_blank", "noopener,noreferrer");
          }
        }
      }
    },
    []
  );

  const renderContentField = useCallback(
    () => (
      <Box>
        <EditorWrapper>
          {!isReadOnly && (
            <EditorMenuBar
              editor={editor}
              onImageClick={handleOpenImageDialog}
              onLinkClick={handleOpenLinkDialog}
              onFileClick={handleOpenFileDialog}
              onSloganClick={handleOpenSloganDialog}
            />
          )}
          <EditorContentWrapper onClick={handleEditorContentClick}>
            {isEditorReady(editor) && <EditorContent editor={editor} />}
          </EditorContentWrapper>
        </EditorWrapper>
        {errors?.content && <ErrorText>{errors.content.message}</ErrorText>}
      </Box>
    ),
    [editor, errors?.content, handleOpenImageDialog, handleOpenLinkDialog, handleOpenFileDialog, handleOpenSloganDialog, isReadOnly, handleEditorContentClick]
  );

  return (
    <CustomSwipper
      key={open ? "add-news-open" : "add-news-closed"}
      open={open && isReady}
      onClose={handleCloseDrawer}
      title="Soạn tin"
      type="add"
      screenType="news"
      footer={
        <>
          <FlexGrowBox />
          <FooterActions>
            <ButtonActionBox>
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
              <ButtonOutline
                type="button"
                onClick={handlePreviewClick}
                variant="outlined"
                disabled={isSubmitting}
              >
                XEM TRƯỚC
              </ButtonOutline>
              <ButtonOutline
                type="button"
                onClick={handleSaveDraftClick}
                variant="outlined"
                disabled={isSubmitting || !!newNewsId}
              >
                {newNewsId ? "ĐÃ LƯU NHÁP" : "LƯU NHÁP"}
              </ButtonOutline>
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
                  <Grid item xs={12} sm={userRole === "NGUOI_PHE_DUYET" ? 6 : 12}>
                    <Controller
                      name="tags"
                      control={control}
                      render={renderTagsField}
                    />
                  </Grid>
                  {userRole === "NGUOI_PHE_DUYET" && (
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
                  <FormItem label="Ảnh bìa" isView={isReadOnly}>
                    <Grid container spacing={1}>
                      <Grid item xs={12}>
                        <Controller
                          name="imageTitle"
                          control={control}
                          render={renderImageTitleField}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <UploadArea
                          onClick={handleImageUploadClick}
                          onDragEnter={handleImageDragEnter}
                          onDragOver={handleImageDragOver}
                          onDragLeave={handleImageDragLeave}
                          onDrop={handleFeaturedImageDrop}
                          isError={!!errors?.featuredImage}
                          isDragActive={isFeaturedImageDragActive}
                        >
                          {previewImage ? (
                            <>
                              <PreviewImageBox
                                component={AuthImage}
                                src={previewImage}
                                alt="Preview"
                              />
                              {!isReadOnly && (
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
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" />
                                </svg>
                              </UploadIcon>
                              <UploadText>
                                Kéo thả hoặc nhấp để tải hình ảnh
                              </UploadText>
                              <UploadSubText>
                                WEBP, PNG, JPG, GIF (tối đa 200MB)
                              </UploadSubText>
                            </>
                          )}
                        </UploadArea>
                        <HiddenFileInput
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                        />
                        {errors?.featuredImage && (
                          <ErrorText>{errors.featuredImage.message}</ErrorText>
                        )}
                      </Grid>
                    </Grid>
                  </FormItem>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </BasicInfoCard>

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

      {/* Dialog Insert Link */}
      <LinkDialog
        open={linkDialogOpen}
        onClose={handleCloseLinkDialog}
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
            onChange={handleLinkTextChangeCallback}
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
      </LinkDialog>

      {/* Dialog Insert Slogan */}
      <SloganDialog
        open={sloganDialogOpen}
        onClose={handleCloseSloganDialog}
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
      </SloganDialog>

      {/* Dialog Preview */}
      <PreviewDialog
        open={previewDialogOpen}
        onClose={handleClosePreviewDialog}
      >
        <PreviewDialogTitle>
          {previewType === "preview" ? "Xem trước tin tức" : "Xem nháp tin tức"}
        </PreviewDialogTitle>
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
              <PreviewImage src={previewImage} alt="Preview" />
              {watch("imageTitle") && (
                <PreviewImageCaption>{watch("imageTitle")}</PreviewImageCaption>
              )}
            </PreviewImageSection>
          )}

          {/* Summary */}
          {watch("summary") && (
            <FieldLabelText>
              {watch("summary")}
            </FieldLabelText>
          )}

          {/* Main Content */}
          <PreviewContentBox
            onClick={handleArticleClick}
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(watch("content") || "<p>Nội dung chưa được nhập</p>"),
            }}
          />
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

      {/* Dialog Xác nhận Duyệt & Xuất bản */}
      <ApproveNewsDialog
        open={openApproveDialog}
        onClose={handleCloseApproveDialog}
        onSuccess={handleApproveSuccess}
        newsId={newNewsId}
        toast={toast}
      />

      {/* Loading Dialog - Hiển thị khi đang lưu nháp */}
      <LoadingDialog open={isSubmitting || isSubmittingNews || isPublishingNews}>
        <StyledDialogContent>
          {isSubmittingNews
            ? "Đang trình duyệt tin tức, vui lòng chờ trong giây lát..."
            : isPublishingNews
              ? "Đang xuất bản tin tức, vui lòng chờ trong giây lát..."
              : "Đang lưu nháp tin tức, vui lòng chờ trong giây lát..."}
        </StyledDialogContent>
      </LoadingDialog>

      <CustomDialog
        open={openConfirmBrowse}
        onClose={handleCloseConfirmBrowse}
        title="Xác nhận trình duyệt"
        onSave={handleConfirmBrowse}
        titleButton="Trình duyệt"
      >
        Bạn có chắc chắn muốn trình duyệt tin tức này không? Sau khi trình duyệt, bạn sẽ không thể chỉnh sửa cho đến khi được xử lý.
      </CustomDialog>

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
      <ImageCropperDialog
        open={cropperOpen}
        onClose={handleCropperClose}
        imageSrc={cropperImageSrc}
        onCropComplete={handleCropperComplete}
        aspect={16 / 9}
        exportScale={2}
      />
    </CustomSwipper>
  );
}

export default withSharedComponents(AddNews);
