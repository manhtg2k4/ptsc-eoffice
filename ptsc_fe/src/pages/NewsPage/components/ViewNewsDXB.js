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
  IconButton,
  styled,
} from "@mui/material";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/vi";

dayjs.extend(relativeTime);
dayjs.locale("vi");
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
  API_GET_LIST_UNIT,
} from "@EnvironmentFile/constants/urlConfig";
import { withFormWrapper, FormItem } from "@components/common/FormWrapper";

// Import TipTap
import {
  useEditor,
  EditorContent,
  NodeViewWrapper,
  NodeViewContent,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import { Node, mergeAttributes } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import { Link } from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { CustomResizableImage } from "@utils/tiptapExtensions";
import CustomInputTag from "@components/CustomInput/CustomInputTag";
import CustomSwipper from "@components/Swipper/BaseSwiper";
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
import CampaignIcon from "@mui/icons-material/Campaign";
import LoadingDialog from "@components/LoadingDialog";
import { StyledDialogContent } from "@styles/CustomDialog.styles";
import {
  FormContainer,
  MainCard,
  SectionTitle,
  UploadIcon,
  UploadText,
  UploadSwitch,
  HiddenFileInput,
  SubSectionTitle,
  FieldLabelText,
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
  InteractionItem,
  InteractionCount,
  // StyledUserListDrawer,
  UserListDrawerHeader,
  UserListDrawerTitleBox,
  TitleIndicator,
  // UserListDialogTitle,
  UserListDialogContent,
  UserListContainer,
  UserListItem,
  // UserAvatar,
  UserInfo,
  UserName,
  UserActionTime,
  UserActionStatus,
  EmptyDataBox,
  LoadingText,
  NoDataText,
  UserListDialogActions,
  FeedbackContent,
  FeedbackBubble,
  CloseIconDrawer,
  // CloseDrawerButton,
  UnitFilterBox,
  UserAvatarIcon,
  PageLayoutWrapper,
  MainContentArea,
  SidePanelContainer,
  UserMetaRow,
} from "./NewsStyles.styles";

// Schema validation
const newsSchema = yup.object().shape({
  title: yup.string().required("Tiêu đề là bắt buộc"),
  summary: yup.string().required("Tóm tắt tin tức là bắt buộc"),
  createdDate: yup.date().required("Ngày tạo là bắt buộc").nullable(),
  publishedAt: yup.date().nullable(),
  reviewerName: yup.string(),
  topic: yup.string().required("Chủ đề là bắt buộc"),
  tags: yup.array(),
  featuredImage: yup.mixed().nullable(),
  imageTitle: yup.string(),
  content: yup.string().required("Nội dung chính là bắt buộc"),
  isComment: yup.boolean(),
});

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
    color: theme?.palette?.mode === "dark" ? theme?.palette?.grey?.[400] : theme?.palette?.grey?.[600],
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

const isEditorReady = (editor) => !!editor && !editor.isDestroyed;

// Menu Bar Component
function EditorMenuBar({ editor: tiptapEditor, onImageClick, onLinkClick, onSloganClick }) {
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

      <MenuButton onClick={onSloganClick} title="Chèn khẩu hiệu, phương châm">
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

function ViewNewsDXB({ open, onClose, sharedComponents, newsId }) {
  const {
    InputComponents: BaseInput,
    DateTimePicker: BaseDateTimePicker,
    toast,
  } = sharedComponents;

  const [isEditMode, setIsEditMode] = useState(false);
  const isView = !isEditMode;

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
  const [, setImageFile] = useState(null);
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

  // State cho khẩu hiệu & phương châm
  const [sloganDialogOpen, setSloganDialogOpen] = useState(false);
  const [sloganValue, setSloganValue] = useState("");
  const [mottoValue, setMottoValue] = useState("");

  const [isSaving, ] = useState(false);

  const [interaction, setInteraction] = useState({
    views: 0,
    likes: 0,
    comments: 0,
    feedbackCount: 0,
  });

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
        const res = response?.data || response;
        if (res) {
          const rawOptions = res.data || res.items || res;
          // Loại bỏ các đơn vị trùng tên để dropdown không bị trùng lặp và lỗi key
          const uniqueUnits = [];
          const seenNames = new Set();
          rawOptions.forEach(unit => {
            if (!seenNames.has(unit.name)) {
              seenNames.add(unit.name);
              uniqueUnits.push(unit);
            }
          });

          const options = uniqueUnits.map((unit) => ({
            ...unit,
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
      publishedAt: null,
      reviewerName: "",
      topic: "",
      tags: "",
      featuredImage: null,
      imageTitle: "",
      content: "",
      isComment: true,
    }),
    []
  );

  const {
    control,
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
            createdDate: data.publishedAt
              ? dayjs(data.publishedAt, "YYYY-MM-DD")
              : dayjs(),
            publishedAt: data.publishedAt
              ? dayjs(data.publishedAt, "YYYY-MM-DD")
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
          } // === THÊM PHẦN TƯƠNG TÁC TẠI ĐÂY ===
          setInteraction({
            views: data.viewCount || 0,
            likes: data.likeCount || 0,
            comments: data.commentCount || 0,
            feedbackCount: data.feedbackCount || 0,
          });

          reset(mappedData);
          setDetailData(data);

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
          feedbackCount: 0,
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
          feedbackCount: 0,
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
        if (!isEditorReady(editor)) return;
        editor.chain().focus().setLink({ href: url, target: "_blank" }).run();
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

  const handleOpenUserList = useCallback(
    async (type) => {
      if (!newsId) return;

      const titleMap = {
        views: "Danh sách lượt xem",
        likes: "Danh sách lượt thích",
        feedbackNews: "Danh sách góp ý"
      };
      const title = titleMap[type] || "Danh sách";
      const endpoint = type === "views" ? "viewers" : "likes";

      setUserListDialog((prev) => ({
        ...prev,
        open: true,
        title: title,
        loading: true,
        data: [],
      }));

      try {
        const response = await axiosInstance.get(
          type === "feedbackNews" 
            ? `${API_NEWS_MANAGEMENT}/${newsId}/comments?type=feedbackNews`
            : `${API_NEWS_MANAGEMENT}/${newsId}/${endpoint}`
        );
        
        let resultData = [];
        const rawData = response?.data || response;
        
        if (type === "likes") {
          // Cấu trúc cho likes: data { likes: [...] }
          resultData = rawData?.data?.likes || rawData?.likes || (Array.isArray(rawData?.data) ? rawData.data : []);
        } else if (type === "feedbackNews") {
          // Cấu trúc cho feedbackNews theo user mô tả: data [...]
          resultData = Array.isArray(rawData?.data) ? rawData.data : (Array.isArray(rawData) ? rawData : []);
        } else {
          // Cấu trúc cho viewers: data [...]
          resultData = Array.isArray(rawData?.data) ? rawData.data : (Array.isArray(rawData) ? rawData : []);
        }

        setUserListDialog((prev) => ({
          ...prev,
          data: resultData,
          loading: false,
        }));
      } catch (error) {
        logger.error(`Lỗi khi lấy danh sách ${type}:`, error);
        toast(`Không thể tải danh sách ${type}`, "error");
        setUserListDialog((prev) => ({ ...prev, loading: false }));
      }
    },
    [newsId, toast]
  );

  const handleCloseUserList = useCallback(() => {
    setUserListDialog((prev) => ({ ...prev, open: false }));
  }, []);

  const handleUnitFilterChange = useCallback((e) => {
    const val = e?.target ? e.target.value : e;
    setUserListDialog((p) => ({ ...p, unitFilter: val }));
  }, []);

  const handleOpenViewsList = useCallback(() => {
    handleOpenUserList("views");
  }, [handleOpenUserList]);

  const handleOpenLikesList = useCallback(() => {
    handleOpenUserList("likes");
  }, [handleOpenUserList]);

  const handleOpenFeedbackList = useCallback(() => {
    handleOpenUserList("feedbackNews");
  }, [handleOpenUserList]);

  // const handleOpenCommentsList = useCallback(() => {
  //   handleOpenUserList("comments");
  // }, [handleOpenUserList]);

  const handleCloseSloganDialog = useCallback(() => {
    setSloganDialogOpen(false);
  }, []);

  const handleInsertSlogan = useCallback(() => {
    if (sloganValue.trim() && isEditorReady(editor)) {
      const sloganHtml = `<div class="slogan-container"><div class="slogan-text">“${sloganValue.trim()}”</div>${
        mottoValue.trim() ? `<div class="slogan-motto">${mottoValue.trim()}</div>` : ""
      }</div>`;
      editor.chain().focus().insertContent(sloganHtml).run();
      handleCloseSloganDialog();
      toast("Đã chèn khẩu hiệu thành công", "success");
    }
  }, [editor, sloganValue, mottoValue, handleCloseSloganDialog, toast]);

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

  const renderTitleField = useCallback(
    ({ field }) => (
      <InputComponents
        label="TIÊU ĐỀ"
        placeholder="Nhập tiêu đề tin tức..."
        multiline
        rows={5.5}
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
        label="TÓM TẮT"
        placeholder="Nhập tóm tắt tin tức..."
        multiline
        rows={5.5}
        required
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

  const renderScheduledPublishAtField = useCallback(
    ({ field }) => (
      <DateTimePicker
        label="NGÀY XUẤT BẢN"
        value={field.value}
        onChange={field.onChange}
        showTime={false}
        disabled={!isEditMode}
        error={!!errors?.publishedAt}
        helperText={errors?.publishedAt?.message}
      />
    ),
    [errors?.publishedAt, isEditMode]
  );

  const renderTopicField = useCallback(
    ({ field }) => (
      <InputComponents
        select
        label="CHỦ ĐỀ"
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

  const renderReviewerNameField = useCallback(
    ({ field }) => (
      <InputComponents
        label="NGƯỜI KIỂM DUYỆT"
        placeholder="Nhập tên người kiểm duyệt..."
        disabled={!isEditMode}
        error={!!errors?.reviewerName}
        helperText={errors?.reviewerName?.message}
        {...field}
      />
    ),
    [errors?.reviewerName, isEditMode]
  );

  const handleSwitchChange = useCallback(
    (field) => (e) => {
      field.onChange(e.target.checked);
    },
    []
  );

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

  const renderImportantField = useCallback(
    ({ field }) => (
      <FormItem label="TIN QUAN TRỌNG" isView={false}>
        <RadioGroup {...field} row>
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
    [isEditMode]
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
          {isEditorReady(editor) && (
            <EditorMenuBar
              editor={editor}
              onImageClick={handleOpenImageDialog}
              onLinkClick={handleOpenLinkDialog}
              onSloganClick={handleOpenSloganDialog}
            />
          )}
          <EditorContentWrapper onClick={handleArticleClick}>
            {isEditorReady(editor) && <EditorContent editor={editor} />}
          </EditorContentWrapper>
        </EditorWrapper>
        {errors?.content && <ErrorText>{errors.content.message}</ErrorText>}
      </Box>
    ),
    [editor, errors?.content, handleOpenImageDialog, handleOpenLinkDialog, handleOpenSloganDialog, handleArticleClick]
  );

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
      hideBackdrop
    >
      <PageLayoutWrapper>
        <MainContentArea>
          <FormContainer>
        <DisabledInputWrapper>
              <MainCard>
                <SectionTitle>THÔNG TIN CƠ BẢN</SectionTitle>
                <Grid container spacing={4}>
                  {/* LEFT COLUMN - 8/12 */}
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

                      {/* Tags & Options Row */}
                      <Grid item xs={12} container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Controller
                            name="tags"
                            control={control}
                            render={renderTagsField}
                          />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <FormItem label="BÌNH LUẬN" isView={false}>
                            <Controller
                              name="isComment"
                              control={control}
                              render={renderCommentSwitch}
                            />
                          </FormItem>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Controller
                            name="isImportant"
                            control={control}
                            render={renderImportantField}
                          />
                        </Grid>
                      </Grid>

                      {/* Interaction Row */}
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

                          <InteractionItem>
                            <CommentIcon />
                            <InteractionCount>{interaction.comments}</InteractionCount>
                          </InteractionItem>
                        </div>
                      </Grid>
                    </Grid>
                  </Grid>

                  {/* RIGHT COLUMN - 4/12 */}
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

                      {/* Người kiểm duyệt */}
                      <Grid item xs={12}>
                        <Controller
                          name="reviewerName"
                          control={control}
                          render={renderReviewerNameField}
                        />
                      </Grid>

                      {/* Ngày xuất bản */}
                      <Grid item xs={12}>
                        <Controller
                          name="publishedAt"
                          control={control}
                          render={renderScheduledPublishAtField}
                        />
                      </Grid>

                      {/* Hình ảnh đại diện */}
                      <Grid item xs={12}>
                        <FormItem label="ẢNH BÌA" required isView={false}>
                          <Grid container spacing={1}>
                            <Grid item xs={12}>
                              <UploadAreaStyled
                                onClick={isEditMode ? handleImageUploadClick : undefined}
                                onDragOver={handleImageDragOver}
                                onDrop={handleImageDrop}
                              >
                                {previewImage ? (
                                  <PreviewImageStyledContainer
                                    component={AuthImage}
                                    src={previewImage}
                                    alt="Preview"
                                  />
                                ) : (
                                  <UploadPlaceholder>
                                    <UploadIcon>
                                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" />
                                      </svg>
                                    </UploadIcon>
                                    <UploadText>
                                      {isEditMode ? "Kéo thả hoặc nhấp để tải hình ảnh" : "Ảnh bìa"}
                                    </UploadText>
                                  </UploadPlaceholder>
                                )}
                              </UploadAreaStyled>
                              {isEditMode && (
                                <HiddenFileInput
                                  ref={fileInputRef}
                                  type="file"
                                  accept="image/*"
                                  onChange={handleImageChange}
                                />
                              )}
                            </Grid>
                            <Grid item xs={12}>
                              <Controller
                                name="imageTitle"
                                control={control}
                                render={renderImageTitleField}
                              />
                            </Grid>
                          </Grid>
                        </FormItem>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </MainCard>

              {/* NỘI DUNG CHÍNH SECTION */}
              <MainCard>
                <SectionTitle>NỘI DUNG CHÍNH</SectionTitle>
                <Controller
                  name="content"
                  control={control}
                  render={renderContentField}
                />
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

          {/* Unit Filter */}
          <UnitFilterBox>
            <InputComponents
              select
              label="Đơn vị"
              placeholder="Tất cả đơn vị"
              size="small"
              options={unitOptions}
              value={userListDialog.unitFilter}
              onChange={handleUnitFilterChange}
              isView={false}
            />
          </UnitFilterBox>

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
          <Button onClick={handleCloseImageDialog} variant="outlined">
            Hủy
          </Button>
          <Button
            onClick={handleInsertImageUrl}
            variant="contained"
            disabled={!imageUrl.trim()}
          >
            Chèn
          </Button>
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

      {/* Dialog Slogan */}
      <Dialog
        open={sloganDialogOpen}
        onClose={handleCloseSloganDialog}
        PaperProps={{ sx: { minWidth: "500px" } }}
      >
        <DialogTitle>Chèn khẩu hiệu, phương châm</DialogTitle>
        <DialogContentStyled>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FieldLabelText>Nội dung khẩu hiệu</FieldLabelText>
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="Nhập nội dung khẩu hiệu..."
                value={sloganValue}
                onChange={handleSloganValueChange}
              />
            </Grid>
            <Grid item xs={12}>
              <FieldLabelText>Phương châm (Tùy chọn)</FieldLabelText>
              <TextField
                fullWidth
                placeholder="Nhập phương châm hoặc tên tác giả..."
                value={mottoValue}
                onChange={handleMottoValueChange}
              />
            </Grid>
          </Grid>
        </DialogContentStyled>
        <DialogActionsStyled>
          <Button onClick={handleCloseSloganDialog} variant="outlined">
            Hủy
          </Button>
          <Button
            onClick={handleInsertSlogan}
            variant="contained"
            disabled={!sloganValue.trim()}
          >
            Chèn
          </Button>
        </DialogActionsStyled>
      </Dialog>

      {/* Loading Dialog */}
      <LoadingDialog open={isSaving}>
        <StyledDialogContent>
          Đang cập nhật tin tức, vui lòng chờ trong giây lát...
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

export default withSharedComponents(ViewNewsDXB);