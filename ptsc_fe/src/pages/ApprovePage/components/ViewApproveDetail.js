import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  Grid,
  Typography,
  // Box,
  // Radio,
  // RadioGroup,
  FormControlLabel,
  // FormControl,
  Button,
  IconButton,
  Checkbox,
  styled,
} from "@mui/material";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";
import DeleteIcon from "@mui/icons-material/Delete";
import dayjs from "dayjs";
import withSharedComponents from "@components/WrapperComponent";
import ImageCropperDialog from "@components/ImageCropperDialog";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import AuthImage from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimImage';
import * as yup from "yup";
import axiosInstance from "@utils/axiosInstance";
import api from "@services/api";
import {
  API_NEWS_MANAGEMENT,
  APP_BASE,
  API_GET_LIST_UNIT,
  API_UPLOAD_FILESS,
} from "@EnvironmentFile/constants/urlConfig";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/vi";

dayjs.extend(relativeTime);
dayjs.locale("vi");
import CustomInputTag from "@components/CustomInput/CustomInputTag";
// import FeedbackOutlinedIcon from "@mui/icons-material/FeedbackOutlined";

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
import CustomDialog from "@components/CustomDialog/CustomDialog";
import LoadingDialog from "@components/LoadingDialog";
import { StyledDialogContent, SaveButton } from "@styles/CustomDialog.styles";
// import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
// import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import CustomSwipper from "@components/Swipper/BaseSwiper";
import { useFilePreview } from "@components/FilePreview/useFilePreview";
import FilePreviewModal from "@components/FilePreview/FilePreviewModal";
import { ReactCrop, centerCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { useAttachmentClick } from "@hooks/useAttachmentClick";
import {
  handleDefaultFileClick,
} from "@services/FileUpload/fileUpload";

// Import Material Icons for editor menu
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
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";

const RecallMuiButton = styled(Button)(() => ({
  backgroundColor: '#ffffff !important',
  color: '#d32f2f !important',
  borderColor: '#d32f2f !important',
  borderWidth: '1px !important',
  borderStyle: 'solid !important',
  '&:hover': {
    backgroundColor: '#ffebee !important',
    borderColor: '#b71c1c !important',
    color: '#b71c1c !important',
  },
}));

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


// ── Styled Components ──
import {
  FormContainer,
  MainCard,
  SectionTitle,
  // UploadIcon,
  // UploadText,
  UploadSubText,
  // UploadSwitch,
  HiddenFileInput,
  // ApproveButton,
  // ReturnButton,
  // CancelButton,
  ModalTextField,
  // FieldLabel,
  // FieldBox,
  // EditorWrapper,
  // EditorContentWrapper,
  // FlexColumnGapBox,
  ErrorText,
  DisabledInputWrapper,
  // ImageTitleBoxStyled,
  // SpacingBox,
  // InteractionBoxContainer,
  // InteractionItem,
  // InteractionCount,
  // SecondaryText,
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
  FeedbackContent,
  // FeedbackBubble,
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
  UserListTitleText,
  FeedbackContentBox,
  AlignedGridContainer,
  InteractionItem,
  InteractionCount,
} from "./ViewApprove.styles";
import DOMPurify from "dompurify";
import {
  PreviewDialogTitle,
  PreviewDialogContentStyled,
  PreviewContentBox,
  PreviewImageSection,
  PreviewImage,
  PreviewImageCaption,
  PreviewDialog,
  PreviewTitleText,
  FieldLabelText,
  DialogActionsStyled,
  ButtonDanger,
  CheckboxGridItem,
  UploadArea,
  PreviewImageBox,
  UploadIcon,
  UploadText,
  RemoveImageIconButton,
  MenuBar,
  MenuButton,
  HeadingButton,
  ToolbarDivider,
  DialogContentStyled,
  ImageIconStyled,
  InputWrapper,
  LinkDialogContentStyled,
  LinkDialogActionsStyled,
  CropContainer,
  CropCaptionText,
  FileDialog,
  FileDialogSectionTitle,
  FileDialogHelperText,
  StyledFormGroup,
  ImageUploadBox,
  SubSectionTitle,
  DialogPreviewImage,
  EditorWrapper,
  EditorContentWrapper,
} from "@pages/NewsPage/components/NewsForm.styles";
import withFormWrapper from "@components/common/FormWrapper";
import { FlexGrowBox, FooterActions } from "@styles/BaseSwiper/BaseSwiper.style";


const isEditorReady = (editor) => !!editor && !editor.isDestroyed;

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
  tags: yup.array(),
  featuredImage: yup.mixed().nullable(),
  imageTitle: yup.string(),
  content: yup
    .string()
    .test("is-empty", "Nội dung chính là bắt buộc", (value) => !isHtmlEmpty(value))
    .required("Nội dung chính là bắt buộc"),
  isComment: yup.boolean(),
  isImportant: yup.string().required("Vui lòng chọn tính chất tin"),
});
function ViewApproveDetail({ open, onClose, onSuccess, sharedComponents, newsId }) {
  const {
    InputComponents: BaseInput,
    DateTimePicker: BaseDateTimePicker,
    toast,
    ButtonOutline,
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
  const [isFeaturedImageDragActive, setIsFeaturedImageDragActive] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [detailData, setDetailData] = useState({});
  const [currentUserWorkItem, setCurrentUserWorkItem] = useState(null);
  const fileInputRef = React.useRef(null);

  const [isEditMode, setIsEditMode] = useState(false);

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

  // State cho dialog insert link
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [linkUrlError, setLinkUrlError] = useState("");

  // States cho cropping
  const [cropImageSrc, setCropImageSrc] = useState("");
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState();
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [cropTarget, setCropTarget] = useState(null); // "featured" hoặc "editor"
  const imgRef = React.useRef(null);

  const handleUploadImageFileRef = React.useRef(null);

  const [topicOptions, setTopicOptions] = useState([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // State cho chức năng Chỉnh sửa / Cập nhật tin đã xuất bản
  const [isSaving, setIsSaving] = useState(false);
  // States cho ImageCropperDialog (Hình ảnh đại diện)
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  // State cho dữ liệu người trình
  const [submitterName, setSubmitterName] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [department, setDepartment] = useState("");
  const [authorDepartment, setAuthorDepartment] = useState("");
  const [submittedAt, setSubmittedAt] = useState(null);
  const [approvedAt, setApprovedAt] = useState(null);
  const [, setShowSubmittedAt] = useState(false);

  // State cho modal Lý do trả lại
  const [openReturnModal, setOpenReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState("");

  // State cho modal Lý do hủy tin
  const [openCancelModal, setOpenCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // State cho modal Lý do thu hồi tin
  const [openRecallModal, setOpenRecallModal] = useState(false);
  const [recallReason, setRecallReason] = useState("");

  // State cho modal Duyệt tin
  const [openApproveModal, setOpenApproveModal] = useState(false);

  // State cho dữ liệu tương tác
  const [interaction, setInteraction] = useState({
    views: 0,
    likes: 0,
    comments: 0,
    feedbackCount: 0,
  });

  // State cho actionFlags
  const [actionFlags, setActionFlags] = useState({
    canApproveNews: false,
    canRejectNews: false,
    canCancelNews: false,
    canRecallNews: false,
    canUpdatePublished: false,
  });

  const [userListDialog, setUserListDialog] = useState({
    open: false,
    title: "",
    data: [],
    loading: false,
    unitFilter: "",
  });

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
    formState: { errors },
    reset,
    setValue,
    watch,
    handleSubmit,
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
    },
  });

  // useEffect: Cập nhật trạng thái editable của editor khi isEditMode thay đổi
  useEffect(() => {
    if (isEditorReady(editor)) {
      editor.setEditable(isEditMode);
    }
  }, [editor, isEditMode]);

  // Hàm lấy chi tiết tin tức - tách riêng để có thể gọi lại (khi Hủy chỉnh sửa hoặc sau khi Lưu thành công)
  const getNewsDetail = useCallback(async () => {
    if (!newsId) return;
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
      } else {
        setPreviewImage(null);
      }

      reset(mappedData);
      setDetailData(data);
      setCurrentUserWorkItem(data.currentUserWorkItem);
      setSubmitterName(data.submitterName || "");
      setAuthorName(data.authorName || "");
      setDepartment(data.department || "");
      setAuthorDepartment(data.authorDepartment || "");
      setSubmittedAt(data.submittedAt ? dayjs(data.submittedAt, "YYYY-MM-DD") : null);
      setApprovedAt(data.approvedAt ? dayjs(data.approvedAt, "YYYY-MM-DD") : null);
      setShowSubmittedAt(data.showSubmittedAt ?? false);

      // 4. Set actionFlags từ response
      setActionFlags({
        canApproveNews: data.actionFlags?.canApproveNews ?? false,
        canRejectNews: data.actionFlags?.canRejectNews ?? false,
        canCancelNews: data.actionFlags?.canCancelNews ?? false,
        canRecallNews: data.actionFlags?.canRecallNews ?? false,
        canUpdatePublished: data.flags?.canUpdatePublished ?? data.canUpdatePublished ?? false,
      });

      // 5. Set dữ liệu tương tác
      setInteraction({
        views: data.viewCount || 0,
        likes: data.likeCount || 0,
        comments: data.commentCount || 0,
        feedbackCount: data.feedbackCount || 0,
      });

      setIsReady(true);
      setIsEditMode(false);
      setImageFile(null);
    } catch (error) {
      const messageError =
        error?.response?.data?.message ||
        error.message || "Có lỗi xảy ra khi tải thông tin tin tức";
      logger.error("Lỗi lấy chi tiết tin tức:", messageError);
      toast(messageError, "error");
      onClose();
    }
  }, [newsId, reset, toast, onClose]);

  // useEffect: Fetch chi tiết tin tức khi có newsId
  useEffect(() => {
    if (open && newsId) {
      getNewsDetail();
    } else if (open && !newsId) {
      // Trường hợp thêm mới
      setSubmitterName("");
      setAuthorName("");
      setDepartment("");
      setAuthorDepartment("");
      setSubmittedAt(null);
      setApprovedAt(null);
      setShowSubmittedAt(false);
      setIsReady(true);
      setIsEditMode(false);
    } else {
      setIsReady(false);
      setDetailData({});
      setCurrentUserWorkItem(null);
      setSubmitterName("");
      setAuthorName("");
      setDepartment("");
      setAuthorDepartment("");
      setSubmittedAt(null);
      setApprovedAt(null);
      setShowSubmittedAt(false);
      setPreviewImage(null);
      setImageFile(null);
      setActionFlags({
        canApproveNews: false,
        canRejectNews: false,
        canCancelNews: false,
        canRecallNews: false,
        canUpdatePublished: false,
      });
      setInteraction({
        views: 0,
        likes: 0,
        comments: 0,
      });
    }
  }, [open, newsId, getNewsDetail]);

  // useEffect: Đẩy nội dung vào editor khi editor sẵn sàng hoặc detailData thay đổi
  // (tách riêng để tránh việc editor chuyển từ null -> instance làm effect fetch
  // chạy thêm 1 lần nữa)
  useEffect(() => {
    if (isEditorReady(editor) && detailData) {
      editor.commands.setContent(detailData.content || "");
    }
  }, [editor, detailData]);
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

  // const handleOpenLikesList = useCallback(() => {
  //   handleOpenUserList("likes");
  // }, [handleOpenLikesList]);

  const handleOpenFeedbackList = useCallback(() => {
    handleOpenUserList("feedbackNews");
  }, [handleOpenUserList]);

  const handleCloseRecallModal = useCallback(() => {
    setOpenRecallModal(false);
    setRecallReason("");
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

  const handleCloseCropDialog = useCallback(() => {
    setIsCropDialogOpen(false);
    setCropImageSrc("");
    setCropTarget(null);
  }, []);

  const handleOpenImageDialog = useCallback(() => {
    setImageDialogOpen(true);
    setImageUrl("");
  }, []);

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
            editor
              .chain()
              .focus()
              .insertContent(`<a href="${finalUrl}" target="_blank" rel="noopener noreferrer">${finalText}</a>`)
              .run();
          } else {
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

  const handleInsertSlogan = useCallback(() => {
    if (sloganValue.trim() && isEditorReady(editor)) {
      const sloganHtml = `
        <div class="slogan-container">
          <div class="slogan-text">“${sloganValue.trim()}”</div>
          ${mottoValue.trim() ? `<div class="slogan-motto">${mottoValue.trim()}</div>` : ""}
        </div>
      `;
      editor.chain().focus().insertContent(sloganHtml).run();
      handleCloseSloganDialog();
      toast("Đã chèn khẩu hiệu thành công", "success");
    }
  }, [editor, sloganValue, mottoValue, toast, handleCloseSloganDialog]);

  // useEffect: Reset form khi thêm mới
  useEffect(() => {
    if (open && !newsId) {
      reset(defaultFormValues);
      setPreviewImage(null);
      if (isEditorReady(editor)) {
        editor.commands.setContent("");
      }
    }
  }, [open, newsId, reset, defaultFormValues, editor]);

  const handleImageUploadClick = useCallback(() => {
    fileInputRef.current?.click();
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

  const handleCropperComplete = useCallback((croppedFile, objectUrl) => {
    setImageFile(croppedFile);
    setPreviewImage(objectUrl);
    setValue("featuredImage", croppedFile, { shouldValidate: true });
    toast("Đã cắt và thêm ảnh đại diện thành công", "success");
  }, [setValue, toast]);

  const handleCropperClose = useCallback(() => {
    setCropperOpen(false);
  }, []);

  // Hàm submit cập nhật thông tin tin tức đã xuất bản (giống logic bên ViewNews.js)
  const onSubmitForm = useCallback(
    async (data) => {
      if (isSaving || !newsId) return;
      try {
        setIsSaving(true);

        if (!data.title?.trim()) throw new Error("Tiêu đề không được để trống");
        if (isHtmlEmpty(data.content))
          throw new Error("Nội dung không được để trống");
        if (!data.topic?.trim()) throw new Error("Chủ đề không được để chọn");

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

        // Cập nhật tin tức
        await axiosInstance.patch(`${API_NEWS_MANAGEMENT}/${newsId}`, payload, {
          headers: { "Content-Type": "application/json" },
        });

        // Upload ảnh đại diện nếu có file mới
        if (imageFile) {
          try {
            const formData = new FormData();
            formData.append("file", imageFile);
            formData.append("object_type", "news");
            formData.append("object_id", newsId);

            await api.post(API_UPLOAD_FILESS, formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });
          } catch (uploadError) {
            logger.error("Upload thumbnail error:", uploadError);
            // Không throw error, vì tin tức đã cập nhật xong
          }
        }

        toast("Cập nhật tin tức thành công!", "success");

        // Sau khi cập nhật thành công → quay về chế độ Chi tiết (view mode) và tải lại dữ liệu mới nhất
        await getNewsDetail();
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
    [isSaving, newsId, imageFile, toast, getNewsDetail, onSuccess]
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

  // Bật chế độ chỉnh sửa (chỉ khi actionFlags.canUpdatePublished === true)
  const handleEditClick = useCallback(() => {
    if (!actionFlags.canUpdatePublished) {
      toast("Bạn không có quyền chỉnh sửa tin tức này", "warning");
      return;
    }
    setIsEditMode(true);
  }, [actionFlags.canUpdatePublished, toast]);

  // Hủy chỉnh sửa: tải lại dữ liệu gốc và thoát edit mode
  // const handleCancelEditClick = useCallback(() => {
  //   getNewsDetail();
  //   setIsEditMode(false);
  // }, [getNewsDetail]);

  const handleOpenPreviewDialog = useCallback(() => {
    setPreviewDialogOpen(true);
  }, []);

  const handleClosePreviewDialog = useCallback(() => {
    setPreviewDialogOpen(false);
  }, []);

  const renderTitleField = useCallback(
    ({ field }) => (
      <InputComponents
        label="Tiêu đề"
        placeholder="Nhập tiêu đề tin tức..."
        required
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
          label="Tag"
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

  const handleImportantChange = useCallback(
    (field) => (e) => {
      field.onChange(e.target.checked ? "true" : "false");
    },
    []
  );

  const handleSwitchChange = useCallback(
    (field) => (e) => {
      field.onChange(e.target.checked);
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

  // Handler mở modal duyệt tin
  const handleApproveClick = useCallback(() => {
    if (!actionFlags.canApproveNews) {
      toast("Bạn không có quyền duyệt tin tức này", "warning");
      return;
    }

    if (!currentUserWorkItem) {
      toast("Không tìm thấy thông tin công việc", "error");
      return;
    }
    setOpenApproveModal(true);
  }, [actionFlags.canApproveNews, currentUserWorkItem, toast]);

  // Handler đóng modal duyệt tin
  const handleCloseApproveModal = useCallback(() => {
    setOpenApproveModal(false);
  }, []);

  // Handler xác nhận duyệt tin
  const handleConfirmApprove = useCallback(async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const payload = {
        workItemId: currentUserWorkItem.id,
        roleCode: currentUserWorkItem.role,
        processKey: currentUserWorkItem.bpmnVersion,
        note: "Phê duyệt và xuất bản ngay",
      };

      await axiosInstance.post(
        `${API_NEWS_MANAGEMENT}/${newsId}/approve`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      toast("Duyệt tin tức thành công!", "success");
      handleCloseApproveModal();
      onSuccess?.();
      await getNewsDetail();
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
  }, [isSubmitting, currentUserWorkItem, newsId, toast, onSuccess, getNewsDetail, handleCloseApproveModal]);

  // Handler cho return button
  const handleReturnClick = useCallback(() => {
    if (!actionFlags.canRejectNews) {
      toast("Bạn không có quyền trả lại tin tức này", "warning");
      return;
    }
    setOpenReturnModal(true);
  }, [actionFlags.canRejectNews, toast]);

  // Handler đóng modal trả lại
  const handleCloseReturnModal = useCallback(() => {
    setOpenReturnModal(false);
    setReturnReason("");
  }, []);

  // Handler xác nhận trả lại
  const handleConfirmReturn = useCallback(async () => {
    if (isSubmitting) return;
    if (!returnReason.trim()) {
      toast("Vui lòng nhập lý do trả lại", "error");
      return;
    }

    if (!currentUserWorkItem) {
      toast("Không tìm thấy thông tin công việc", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        workItemId: currentUserWorkItem.id,
        roleCode: currentUserWorkItem.role,
        reason: returnReason.trim(),
        note: "Vui lòng thêm số liệu và nguồn tham khảo",
      };

      await axiosInstance.post(
        `${API_NEWS_MANAGEMENT}/${newsId}/reject`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      toast("Trả lại tin tức thành công!", "success");
      handleCloseReturnModal();
      onSuccess?.();
      await getNewsDetail();
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
  }, [returnReason, currentUserWorkItem, newsId, toast, handleCloseReturnModal, getNewsDetail, onSuccess, isSubmitting]);

  // Handler thay đổi return reason
  const handleReturnReasonChange = useCallback((e) => {
    setReturnReason(e.target.value);
  }, []);

  // Handler cho cancel button
  const handleCancelNewsClick = useCallback(() => {
    if (!actionFlags.canCancelNews) {
      toast("Bạn không có quyền hủy tin tức này", "warning");
      return;
    }
    setOpenCancelModal(true);
  }, [actionFlags.canCancelNews, toast]);

  // Handler đóng modal hủy tin
  const handleCloseCancelModal = useCallback(() => {
    setOpenCancelModal(false);
    setCancelReason("");
  }, []);

  // Handler xác nhận hủy tin
  const handleConfirmCancel = useCallback(async () => {
    if (isSubmitting) return;
    if (!cancelReason.trim()) {
      toast("Vui lòng nhập lý do hủy tin", "error");
      return;
    }

    if (!currentUserWorkItem) {
      toast("Không tìm thấy thông tin công việc", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        workItemId: currentUserWorkItem.id,
        roleCode: currentUserWorkItem.role,
        reason: cancelReason.trim(),
        note: "Hủy do thay đổi chính sách",
      };

      await axiosInstance.post(
        `${API_NEWS_MANAGEMENT}/${newsId}/cancel`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      toast("Hủy tin tức thành công!", "success");
      handleCloseCancelModal();
      onSuccess?.();
      await getNewsDetail();
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
  }, [cancelReason, currentUserWorkItem, newsId, toast, handleCloseCancelModal, getNewsDetail, onSuccess, isSubmitting]);

  // Handler thay đổi cancel reason
  const handleCancelReasonChange = useCallback((e) => {
    setCancelReason(e.target.value);
  }, []);

  // --- Interaction Icon Components ---
  const EyeIcon = () => (
    <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.31807 13.8808C2.22438 13.6284 2.22438 13.3508 2.31807 13.0984C3.23056 10.8858 4.77945 8.99407 6.76839 7.6629C8.75733 6.33173 11.0967 5.62109 13.49 5.62109C15.8833 5.62109 18.2228 6.33173 20.2117 7.6629C22.2006 8.99407 23.7495 10.8858 24.662 13.0984C24.7557 13.3508 24.7557 13.6284 24.662 13.8808C23.7495 16.0933 22.2006 17.9851 20.2117 19.3162C18.2228 20.6474 15.8833 21.358 13.49 21.358C11.0967 21.358 8.75733 20.6474 6.76839 19.3162C4.77945 17.9851 3.23056 16.0933 2.31807 13.8808Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.4899 16.8622C15.3525 16.8622 16.8624 15.3523 16.8624 13.4897C16.8624 11.6271 15.3525 10.1172 13.4899 10.1172C11.6274 10.1172 10.1174 11.6271 10.1174 13.4897C10.1174 15.3523 11.6274 16.8622 13.4899 16.8622Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const HeartIcon = () => (
    <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.24829 10.6776C4.24831 9.42667 4.6278 8.20513 5.33663 7.17436C6.04547 6.14359 7.0503 5.35208 8.21841 4.90437C9.38652 4.45666 10.663 4.37381 11.8792 4.66677C13.0953 4.95973 14.194 5.61471 15.0302 6.5452C15.0891 6.60817 15.1603 6.65837 15.2394 6.69269C15.3184 6.72701 15.4037 6.74472 15.49 6.74472C15.5762 6.74472 15.6615 6.72701 15.7406 6.69269C15.8197 6.65837 15.8909 6.60817 15.9497 6.5452C16.7832 5.60866 17.8822 4.94817 19.1004 4.65166C20.3185 4.35514 21.5981 4.43665 22.7688 4.88535C23.9395 5.33405 24.9458 6.12864 25.6537 7.16338C26.3616 8.19812 26.7376 9.42392 26.7316 10.6776C26.7316 13.252 25.0454 15.1743 23.3591 16.8606L17.1852 22.8333C16.9757 23.0738 16.7175 23.2671 16.4276 23.4002C16.1377 23.5333 15.8228 23.6031 15.5038 23.6052C15.1848 23.6072 14.869 23.5413 14.5775 23.4119C14.2859 23.2825 14.0252 23.0925 13.8127 22.8546L7.62079 16.8606C5.93454 15.1743 4.24829 13.2632 4.24829 10.6776Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const FeedbackIcon = () => (
    <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.99667 13.99L0.5 27.48L27.48 13.99L0.5 0.5L4.99667 13.99ZM4.99667 13.99H13.99" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const CommentIcon = () => (
    <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.2413 3.62109C9.66264 3.98124 8.19343 4.71493 6.95705 5.76052C5.72068 6.8061 4.75323 8.13309 4.13592 9.63003C3.51862 11.127 3.2695 12.7502 3.40947 14.3633C3.54945 15.9765 4.07443 17.5326 4.94035 18.9008L3.37214 23.6055L8.07678 22.0372C9.44502 22.9031 11.001 23.4281 12.6142 23.568C14.2274 23.708 15.8506 23.4589 17.3475 22.8416C18.8444 22.2242 20.1715 21.2568 21.217 20.0205C22.2626 18.7841 22.9963 17.3149 23.3565 15.7362M23.3565 11.2396C22.9319 9.38154 21.9918 7.68099 20.6442 6.33333C19.2965 4.98566 17.5959 4.04557 15.738 3.62109M19.1105 13.4879C19.1105 11.9972 18.5183 10.5675 17.4642 9.51337C16.4101 8.45927 14.9804 7.86707 13.4896 7.86707M14.6138 13.4879C14.6138 13.1898 14.4954 12.9038 14.2845 12.693C14.0737 12.4822 13.7878 12.3637 13.4896 12.3637" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const handleConfirmRecall = useCallback(async () => {
    if (isSubmitting) return;
    if (!recallReason.trim()) {
      toast("Vui lòng nhập lý do thu hồi tin", "error");
      return;
    }
    if (!currentUserWorkItem) {
      toast("Không tìm thấy thông tin công việc", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        workItemId: currentUserWorkItem.id,
        roleCode: currentUserWorkItem.role,
        reason: recallReason.trim(),
        note: "Thu hồi để chỉnh sửa thông tin",
      };

      await axiosInstance.post(
        `${API_NEWS_MANAGEMENT}/${newsId}/recall`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      toast("Thu hồi tin tức thành công!", "success");
      handleCloseRecallModal();
      onSuccess?.();
      await getNewsDetail();
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
  }, [recallReason, currentUserWorkItem, newsId, toast, handleCloseRecallModal, getNewsDetail, onSuccess, isSubmitting]);
  const handleRecallReasonChange = useCallback((e) => {
    setRecallReason(e.target.value);
  }, []);
  const handleRecallClick = useCallback(() => {
    if (!actionFlags.canRecallNews) {
      toast("Bạn không có quyền thu hồi tin tức này", "warning");
      return;
    }
    setOpenRecallModal(true);
  }, [actionFlags.canRecallNews, toast]);
  const handleOpenLikesList = useCallback(() => {
    handleOpenUserList("likes");
  }, [handleOpenUserList]);


  const handleCloseUserList = useCallback(() => {
    setUserListDialog((prev) => ({ ...prev, open: false }));
  }, []);

  const handleUnitFilterChange = useCallback((e) => {
    const val = e?.target ? e.target.value : e;
    setUserListDialog((p) => ({ ...p, unitFilter: val }));
  }, []);

  const displayDepartmentName = useMemo(() => {
    if (!authorDepartment) return "";
    if (typeof authorDepartment === "object") return authorDepartment.name;
    return authorDepartment;
  }, [authorDepartment]);


  return (
    <>
      {/* Modal Xác nhận duyệt tin */}
      <CustomDialog
        open={openApproveModal}
        onClose={handleCloseApproveModal}
        title="Xác nhận duyệt tin"
        onSave={handleConfirmApprove}
        titleButton="Đồng ý"
        isLoading={isSubmitting}
        size="sm"
      >
        <Typography>
          Bạn có chắc chắn muốn duyệt tin tức này không?
        </Typography>
      </CustomDialog>

      {/* Modal Lý do trả lại */}
      <CustomDialog
        open={openReturnModal}
        onClose={handleCloseReturnModal}
        title="Lý do trả lại"
        onSave={handleConfirmReturn}
        titleButton="Trả lại"
        isLoading={isSubmitting}
        size="sm"
      >
        <ModalTextField
          fullWidth
          rows={4}
          placeholder="Lý do trả lại..."
          value={returnReason}
          onChange={handleReturnReasonChange}
          variant="outlined"
        />
      </CustomDialog>

      {/* Modal Lý do hủy tin */}
      <CustomDialog
        open={openCancelModal}
        onClose={handleCloseCancelModal}
        title="Lý do hủy tin"
        onSave={handleConfirmCancel}
        titleButton="Hủy tin"
        isLoading={isSubmitting}
        size="sm"
      >
        <ModalTextField
          fullWidth
          rows={4}
          placeholder="Lý do hủy tin..."
          value={cancelReason}
          onChange={handleCancelReasonChange}
          variant="outlined"
        />
      </CustomDialog>

      {/* Modal Lý do thu hồi tin */}
      <CustomDialog
        open={openRecallModal}
        onClose={handleCloseRecallModal}
        title="Lý do thu hồi tin"
        onSave={handleConfirmRecall}
        titleButton="Thu hồi"
        isLoading={isSubmitting}
        size="sm"
      >
        <ModalTextField
          fullWidth
          rows={4}
          placeholder="Lý do thu hồi tin..."
          value={recallReason}
          onChange={handleRecallReasonChange}
          variant="outlined"
        />
      </CustomDialog>

      {/* Main Form */}
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
        footer={
          // Hiển thị các button dựa trên quyền hạn từ actionFlags
          <>
            <FlexGrowBox />
            <FooterActions>
              {isEditMode ? (
                <>
                  <ButtonOutline
                    type="button"
                    onClick={handleOpenPreviewDialog}
                    variant="outlined"
                    disabled={isSaving}
                  >
                    XEM TRƯỚC
                  </ButtonOutline>
                  <ButtonOutline
                    onClick={handleSaveClick}
                    disabled={isSaving}
                    variant="outlined"
                  >
                    LƯU
                  </ButtonOutline>
                </>
              ) : (
                <>
                  {actionFlags.canUpdatePublished && (
                    <Button
                      onClick={handleEditClick}
                      variant="outlined"
                      size="medium"
                    >
                      CHỈNH SỬA
                    </Button>
                  )}
                  {actionFlags.canApproveNews && (
                    <Button
                      onClick={handleApproveClick}
                      variant="outlined"
                      size="medium"
                      disabled={isSubmitting}
                    >
                      DUYỆT TIN
                    </Button>
                  )}
                  {actionFlags.canRejectNews && (
                    <Button
                      onClick={handleReturnClick}
                      variant="outlined"
                      size="medium"
                      disabled={isSubmitting}
                    >
                      TRẢ LẠI
                    </Button>
                  )}
                  {actionFlags.canCancelNews && (
                    <Button
                      onClick={handleCancelNewsClick}
                      variant="outlined"
                      size="medium"
                      disabled={isSubmitting}
                    >
                      HỦY TIN
                    </Button>
                  )}
                  {actionFlags.canRecallNews && (
                    <RecallMuiButton
                      onClick={handleRecallClick}
                      variant="outlined"
                      size="medium"
                      disabled={isSubmitting}
                    >
                      THU HỒI TIN
                    </RecallMuiButton>
                  )}
                </>
              )}
            </FooterActions>
          </>
        }
        hideBackdrop
      >
        <PageLayoutWrapper>
          <MainContentArea>
            <FormContainer>
              <DisabledInputWrapper>
                <MainCard>
                  <Grid container spacing={4}>
                    {/* THÔNG TIN NGƯỜI TRÌNH - Ẩn khi đang ở chế độ chỉnh sửa */}
                    {!isEditMode && (
                      <Grid item xs={12}>
                        <SectionTitle>THÔNG TIN NGƯỜI TRÌNH</SectionTitle>
                        <Grid container spacing={3}>
                          <Grid item xs={12} md={6}>
                            <InputComponents
                              label="Người soạn tin"
                              placeholder="Nhập tiêu đề cho album"
                              value={submitterName || authorName}
                              disabled
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <InputComponents
                              label="Người duyệt"
                              placeholder="Nhập tiêu đề cho album"
                              value={watch('reviewerName')}
                              disabled
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <InputComponents
                              label="Phòng ban"
                              value={department || displayDepartmentName || ""}
                              disabled
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <InputComponents
                              label="Ngày trình"
                              value={submittedAt && dayjs(submittedAt).isValid() ? dayjs(submittedAt).format("DD/MM/YYYY") : ""}
                              disabled
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <InputComponents
                              label="Ngày duyệt"
                              value={approvedAt && dayjs(approvedAt).isValid() ? dayjs(approvedAt).format("DD/MM/YYYY") : ""}
                              disabled
                            />
                          </Grid>
                        </Grid>
                      </Grid>
                    )}

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

                                <InteractionItem >
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
                              <Grid container spacing={1}>
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
                                  <UploadArea
                                    onClick={isEditMode ? handleImageUploadClick : undefined}
                                    onDragEnter={isEditMode ? handleImageDragEnter : undefined}
                                    onDragOver={isEditMode ? handleImageDragOver : undefined}
                                    onDragLeave={isEditMode ? handleImageDragLeave : undefined}
                                    onDrop={isEditMode ? (e) => {
                                      e.preventDefault();
                                      setIsFeaturedImageDragActive(false);
                                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                        handleImageChange({ target: { files: e.dataTransfer.files } });
                                      }
                                    } : undefined}
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
                                          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" />
                                          </svg>
                                        </UploadIcon>
                                        <UploadText>
                                          {isEditMode
                                            ? "Kéo thả hoặc nhấp để tải hình ảnh cho tin tức"
                                            : "Ảnh bìa"}
                                        </UploadText>
                                        {isEditMode && (
                                          <UploadSubText>PNG, JPG, GIF (tối đa 200MB)</UploadSubText>
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
                    </Grid>

                    {/* NỘI DUNG CHÍNH */}
                    <Grid item xs={12}>
                      <SectionTitle>NỘI DUNG CHÍNH</SectionTitle>
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
                      {errors?.content && (
                        <ErrorText>{errors.content.message}</ErrorText>
                      )}
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
                <UserListTitleText>
                  {userListDialog.title || "Danh sách"}
                </UserListTitleText>
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
                          <FeedbackContentBox>
                            <FeedbackContent variant="body2">
                              {user.content}
                            </FeedbackContent>
                          </FeedbackContentBox>
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

        <LoadingDialog open={isSubmitting || isSaving}>
          <StyledDialogContent>
            {isSaving
              ? "Đang cập nhật tin tức, vui lòng chờ trong giây lát..."
              : openReturnModal
                ? "Đang trả lại tin tức, vui lòng chờ trong giây lát..."
                : openCancelModal
                  ? "Đang hủy tin tức, vui lòng chờ trong giây lát..."
                  : openRecallModal
                    ? "Đang thu hồi tin tức, vui lòng chờ trong giây lát..."
                    : "Đang xử lý, vui lòng chờ trong giây lát..."}
          </StyledDialogContent>
        </LoadingDialog>

        <ImageCropperDialog
          open={cropperOpen}
          onClose={handleCropperClose}
          imageSrc={cropperImageSrc}
          onCropComplete={handleCropperComplete}
          aspect={16 / 9}
          exportScale={2}
        />

        {/* Dialog Upload Hình Ảnh vào Editor */}
        <Dialog open={imageDialogOpen} onClose={handleCloseImageDialog}>
          <DialogTitle>Chèn hình ảnh</DialogTitle>
          <DialogContentStyled>
            <Grid container spacing={2}>
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
            <Button onClick={handleCloseImageDialog}>
              Hủy
            </Button>
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

        {/* Input ẩn cho upload ảnh editor */}
        <input
          type="file"
          ref={imageUploadInputRef}
          style={{ display: "none" }}
          accept="image/*"
          onChange={handleUploadImageFile}
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
    </>
  );
}

export default withSharedComponents(ViewApproveDetail);