"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    X,
    ArrowLeft,
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    List,
    ListOrdered,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Code,
    Link as LinkIcon,
    Image as ImageIcon,
    RotateCcw,
    RotateCw,
    Upload,
    Calendar,
    ChevronDown,
    Save,
} from "lucide-react";
import moment from "moment";

// Import TipTap
import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import { Link } from "@tiptap/extension-link";
import { Image } from "@tiptap/extension-image";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { API_VIEW_IMAGE, API_COMMENT } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/EnvironmentFile/urlConfig";
import axiosClient from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/hooks/axiosClient";
import { toast } from "react-toastify";
import * as S from "./EditNewsModal.styles";
import AuthImage from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimImage';


const isEditorReady = (editor) => !!editor && !editor.isDestroyed;

// Simple Toolbar Button Component
const ToolbarButton = ({ onClick, active, children, title }) => {
    let btnClass = "toolbar-btn";
    if (active) btnClass += " active";
    return (
        <button
            className={btnClass}
            onClick={onClick}
            title={title}
            type="button"
        >
            {children}
        </button>
    );
};

function EditNewsModalContent({ isOpen, onClose, data, onSuccess }) {
    const [formData, setFormData] = useState({
        title: "",
        summary: "",
        reviewerName: "",
        createdDate: moment().format("YYYY-MM-DD"),
        isComment: true,
        topic: "",
        tags: [],
        content: "",
        imageTitle: ""
    });

    const [previewImage, setPreviewImage] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize Editor
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
            Image,
            TextStyle,
            Color,
        ],
        content: "",
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            if (!isEditorReady(editor)) return;
            setFormData(prev => ({ ...prev, content: editor.getHTML() }));
        },
    });

    useEffect(() => {
        const fetchDetail = async () => {
            if (!data || !isOpen) return;

            const recordId = data.data?.id || data.id;
            if (!recordId) return;

            try {
                // Fetch fresh details from server
                const response = await axiosClient.get(`${API_COMMENT}/${recordId}`);
                const rawData = response.data || response;
                const innerData = rawData.data || rawData;

                const initialContent = innerData.content || "";

                // Handle tags
                let tagArray = [];
                if (Array.isArray(innerData.tags)) {
                    tagArray = innerData.tags;
                } else if (typeof innerData.tags === 'string' && innerData.tags.trim() !== '') {
                    tagArray = innerData.tags.split(',').map(t => t.trim());
                }

                setFormData({
                    title: innerData.title || "",
                    summary: innerData.summary || innerData.description || "",
                    reviewerName: innerData.reviewerName || innerData.authorName || "",
                    createdDate: moment(innerData.publishedAt || innerData.createdAt, ["DD/MM/YYYY", "YYYY-MM-DD", moment.ISO_8601]).isValid()
                        ? moment(innerData.publishedAt || innerData.createdAt, ["DD/MM/YYYY", "YYYY-MM-DD", moment.ISO_8601]).format("YYYY-MM-DD")
                        : "",
                    isComment: innerData.isComment ?? true,
                    topic: innerData.topic || (innerData.topicEntity ? innerData.topicEntity.name : ""),
                    tags: tagArray,
                    content: initialContent,
                    imageTitle: innerData.nameThumbnail || innerData.imageTitle || ""
                });

                if (isEditorReady(editor)) {
                    editor.commands.setContent(initialContent);
                }

                // Image URL
                const imageId = innerData.sizeMedium?.id || innerData.thumbnail?.id || innerData.id;
                if (imageId) {
                    setPreviewImage(`${API_VIEW_IMAGE}/${imageId}`);
                } else {
                    const imgFallback = innerData.sizeMedium?.url || innerData.thumbnail?.url || innerData.thumbnail || innerData.image;
                    if (imgFallback) {
                        setPreviewImage(imgFallback.startsWith('http') ? imgFallback : `${API_VIEW_IMAGE}${imgFallback}`);
                    }
                }
            } catch (error) {
                // Silently handle or use a better logger
            }
        };

        if (isOpen) {
            fetchDetail();
        } else {
            if (isEditorReady(editor)) editor.commands.setContent("");
        }
    }, [data, isOpen, editor]);

    const handleSave = useCallback(async () => {
        if (!isEditorReady(editor) || !data) return;

        setIsSubmitting(true);
        try {
            const recordId = data.data?.id || data.id;

            // Construct payload as requested
            const payload = {
                title: String(formData.title || "").trim(),
                summary: String(formData.summary || "").trim(),
                content: String(editor.getHTML() || "").trim(),
                isComment: formData.isComment === true,
                topic: String(formData.topic || "").trim(),
                tags: Array.isArray(formData.tags) ? formData.tags.join(", ") : String(formData.tags || "").trim(),
                publishedAt: moment(formData.createdDate).format("YYYY-MM-DD"),
                reviewerName: String(formData.reviewerName || "").trim(),
            };

            await axiosClient.patch(`${API_COMMENT}/${recordId}`, payload);
            toast.success("Đã cập nhật nội dung tin tức thành công!");
            if (onSuccess) onSuccess(); // Signal parent to refresh data
            onClose(); // Close modal after success
        } catch (error) {
            toast.error("Có lỗi xảy ra khi cập nhật tin tức. Vui lòng thử lại!");
        } finally {
            setIsSubmitting(false);
        }
    }, [editor, data, formData.title, formData.summary, formData.isComment, formData.topic, formData.tags, formData.createdDate, formData.reviewerName, onSuccess, onClose]);

    const handleAddLink = useCallback(() => {
        const url = window.prompt("Nhập URL liên kết:");
        if (url && isEditorReady(editor)) {
            editor.chain().focus().setLink({ href: url }).run();
        }
    }, [editor]);

    const handleAddImage = useCallback(() => {
        const url = window.prompt("Nhập URL hình ảnh:");
        if (url && isEditorReady(editor)) {
            editor.chain().focus().setImage({ src: url }).run();
        }
    }, [editor]);

    // Top-level editor commands
    const toggleBold = useCallback(() => isEditorReady(editor) && editor.chain().focus().toggleBold().run(), [editor]);
    const toggleItalic = useCallback(() => isEditorReady(editor) && editor.chain().focus().toggleItalic().run(), [editor]);
    const toggleUnderline = useCallback(() => isEditorReady(editor) && editor.chain().focus().toggleUnderline().run(), [editor]);
    const toggleStrike = useCallback(() => isEditorReady(editor) && editor.chain().focus().toggleStrike().run(), [editor]);
    const setBlockH1 = useCallback(() => isEditorReady(editor) && editor.chain().focus().toggleHeading({ level: 1 }).run(), [editor]);
    const setBlockH2 = useCallback(() => isEditorReady(editor) && editor.chain().focus().toggleHeading({ level: 2 }).run(), [editor]);
    const setBlockH3 = useCallback(() => isEditorReady(editor) && editor.chain().focus().toggleHeading({ level: 3 }).run(), [editor]);
    const toggleBulletList = useCallback(() => isEditorReady(editor) && editor.chain().focus().toggleBulletList().run(), [editor]);
    const toggleOrderedList = useCallback(() => isEditorReady(editor) && editor.chain().focus().toggleOrderedList().run(), [editor]);
    const setAlignLeft = useCallback(() => isEditorReady(editor) && editor.chain().focus().setTextAlign("left").run(), [editor]);
    const setAlignCenter = useCallback(() => isEditorReady(editor) && editor.chain().focus().setTextAlign("center").run(), [editor]);
    const setAlignRight = useCallback(() => isEditorReady(editor) && editor.chain().focus().setTextAlign("right").run(), [editor]);
    const toggleCode = useCallback(() => isEditorReady(editor) && editor.chain().focus().toggleCode().run(), [editor]);
    const undo = useCallback(() => isEditorReady(editor) && editor.chain().focus().undo().run(), [editor]);
    const redo = useCallback(() => isEditorReady(editor) && editor.chain().focus().redo().run(), [editor]);

    const handleImageTitleChange = useCallback((e) => {
        setFormData(prev => ({ ...prev, imageTitle: e.target.value }));
    }, []);

    const toggleClass = formData.isComment ? "enm-toggle active" : "enm-toggle";

    return (
        <S.ModalWrapper>
            <div className="enm-overlay">
            <div className="enm-container">
                {/* HEADER */}
                <div className="enm-header">
                    <div className="enm-header-left">
                        <button className="enm-back-btn" onClick={onClose}>
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="enm-header-title">Chỉnh sửa tin tức</h1>
                    </div>
                    <div className="enm-header-actions">
                        <button className="enm-btn enm-btn-save" onClick={handleSave} disabled={isSubmitting}>
                            <Save size={16} /> Lưu
                        </button>
                    </div>
                </div>

                {/* BODY */}
                <div className="enm-body">

                    {/* LEFT: BASIC INFO */}
                    <div className="enm-col enm-col-left">
                        <h2 className="enm-main-title">Thông tin cơ bản</h2>
                        <div className="enm-card">
                            <div className="enm-field outlining">
                                <label className="enm-label-floating">Tiêu đề <span>*</span></label>
                                <div className="enm-input-box enm-readonly">
                                    <textarea
                                        className="enm-textarea enm-title-input"
                                        value={formData.title}
                                        readOnly
                                    />
                                </div>
                            </div>

                            <div className="enm-field outlining">
                                <label className="enm-label-floating">Tóm tắt <span>*</span></label>
                                <div className="enm-input-box enm-readonly">
                                    <textarea
                                        className="enm-textarea enm-summary-input"
                                        placeholder="Nhập tóm tắt tin tức..."
                                        value={formData.summary}
                                        readOnly
                                    />
                                </div>
                            </div>

                            <div className="enm-form-row">
                                <div className="enm-field flex-2 outlining">
                                    <label className="enm-label-floating">Người kiểm duyệt</label>
                                    <div className="enm-input-box enm-readonly">
                                        <input
                                            type="text"
                                            className="enm-input"
                                            placeholder="Nhập tên người kiểm duyệt..."
                                            value={formData.reviewerName}
                                            readOnly
                                        />
                                    </div>
                                </div>
                                <div className="enm-field flex-1 outlining">
                                    <label className="enm-label-floating">Ngày tạo <span>*</span></label>
                                    <div className="enm-input-icon-box enm-readonly">
                                        <input
                                            type="date"
                                            className="enm-input"
                                            value={formData.createdDate}
                                            readOnly
                                        />
                                        <span className="abs-icon">
                                            <Calendar size={16} />
                                        </span>
                                    </div>
                                </div>
                                <div className="enm-field enm-centered">
                                    <label className="enm-label-fixed">Bình luận</label>
                                    <div
                                        className={toggleClass}
                                    >
                                        <div className="enm-toggle-thumb"></div>
                                    </div>
                                </div>
                            </div>

                            <div className="enm-form-row mt-24">
                                <div className="enm-field flex-1 outlining">
                                    <label className="enm-label-floating">Chủ đề <span>*</span></label>
                                    <div className="enm-select-box enm-readonly">
                                        <select
                                            className="enm-select"
                                            value={formData.topic}
                                            disabled
                                        >
                                            <option value="">Chọn chủ đề...</option>
                                            <option value="Tin tức xã hội">Tin tức xã hội</option>
                                            <option value="Tin tức thể thao">Tin tức thể thao</option>
                                            <option value="Sản xuất kinh doanh">Sản xuất kinh doanh</option>
                                        </select>
                                        <span className="abs-icon">
                                            <ChevronDown size={18} />
                                        </span>
                                    </div>
                                </div>
                                <div className="enm-field flex-1 outlining">
                                    <label className="enm-label-floating">Tags <span>*</span></label>
                                    <div className="enm-tags-box enm-readonly">
                                        {formData.tags.map((tag) => (
                                            <span key={tag} className="enm-tag">#{tag} <span className="close-tag"><X size={12} /></span></span>
                                        ))}
                                        <input type="text" placeholder="Thêm tag..." className="enm-tag-ghost-input" readOnly />
                                    </div>
                                </div>
                            </div>

                            <div className="enm-img-section">
                                <h3 className="enm-sub-title">Hình ảnh đại diện</h3>
                                <p className="enm-sub-desc">Tải lên hình ảnh cho tin tức</p>
                                <div className="enm-img-grid">
                                    <div className="enm-upload-zone">
                                        {previewImage ? (
                                            <AuthImage src={previewImage} alt="Feature" customClassName="enm-img-preview" />
                                        ) : (
                                            <div className="enm-upload-cta">
                                                <div className="icon-circle upload-icon">
                                                    <Upload size={24} />
                                                </div>
                                                <p className="cta-main-text">Kéo thả hoặc nhấp để tải hình ảnh cho tin tức</p>
                                                <span className="cta-sub-text">PNG, JPG, GIF (tối đa 5MB)</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="enm-field enm-img-meta outlining">
                                        <label className="enm-label-floating">Tên ảnh</label>
                                        <div className="enm-input-box">
                                            <input
                                                type="text"
                                                className="enm-input"
                                                placeholder="Nhập tên ảnh..."
                                                value={formData.imageTitle}
                                                onChange={handleImageTitleChange}
                                                readOnly
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: MAIN CONTENT */}
                    <div className="enm-col enm-col-right">
                        <h2 className="enm-main-title">Nội dung chính</h2>
                        <div className="enm-card enm-card-editor">
                            <div className="enm-tiptap-container">
                                {editor && (
                                    <div className="enm-tiptap-toolbar">
                                        <div className="t-group">
                                            <ToolbarButton onClick={toggleBold} active={editor.isActive("bold")} title="Đậm"><Bold size={18} /></ToolbarButton>
                                            <ToolbarButton onClick={toggleItalic} active={editor.isActive("italic")} title="Nghiêng"><Italic size={18} /></ToolbarButton>
                                            <ToolbarButton onClick={toggleUnderline} active={editor.isActive("underline")} title="Gạch chân"><UnderlineIcon size={18} /></ToolbarButton>
                                            <ToolbarButton onClick={toggleStrike} active={editor.isActive("strike")} title="Gạch ngang"><Strikethrough size={18} /></ToolbarButton>
                                        </div>
                                        <div className="t-divider"></div>
                                        <div className="t-group">
                                            <ToolbarButton onClick={setBlockH1} active={editor.isActive("heading", { level: 1 })}><span className="t-h">H1</span></ToolbarButton>
                                            <ToolbarButton onClick={setBlockH2} active={editor.isActive("heading", { level: 2 })}><span className="t-h">H2</span></ToolbarButton>
                                            <ToolbarButton onClick={setBlockH3} active={editor.isActive("heading", { level: 3 })}><span className="t-h">H3</span></ToolbarButton>
                                        </div>
                                        <div className="t-divider"></div>
                                        <div className="t-group">
                                            <ToolbarButton onClick={toggleBulletList} active={editor.isActive("bulletList")}><List size={18} /></ToolbarButton>
                                            <ToolbarButton onClick={toggleOrderedList} active={editor.isActive("orderedList")}><ListOrdered size={18} /></ToolbarButton>
                                        </div>
                                        <div className="t-divider"></div>
                                        <div className="t-group">
                                            <ToolbarButton onClick={setAlignLeft} active={editor.isActive({ textAlign: "left" })}><AlignLeft size={18} /></ToolbarButton>
                                            <ToolbarButton onClick={setAlignCenter} active={editor.isActive({ textAlign: "center" })}><AlignCenter size={18} /></ToolbarButton>
                                            <ToolbarButton onClick={setAlignRight} active={editor.isActive({ textAlign: "right" })}><AlignRight size={18} /></ToolbarButton>
                                        </div>
                                        <div className="t-divider"></div>
                                        <div className="t-group">
                                            <ToolbarButton onClick={toggleCode} active={editor.isActive("code")}><Code size={18} /></ToolbarButton>
                                            <ToolbarButton onClick={handleAddLink} active={editor.isActive("link")}><LinkIcon size={18} /></ToolbarButton>
                                            <ToolbarButton onClick={handleAddImage}><ImageIcon size={18} /></ToolbarButton>
                                        </div>
                                        <div className="t-divider"></div>
                                        <div className="t-group">
                                            <ToolbarButton onClick={undo}><RotateCcw size={18} /></ToolbarButton>
                                            <ToolbarButton onClick={redo}><RotateCw size={18} /></ToolbarButton>
                                        </div>
                                    </div>
                                )}
                                <div className="enm-tiptap-content">
                                    {isEditorReady(editor) && <EditorContent editor={editor} />}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            </div>
        </S.ModalWrapper>
    );
}

export default function EditNewsModal({ isOpen, onClose, data, onSuccess }) {
    if (!isOpen) return null;
    return <EditNewsModalContent isOpen={isOpen} onClose={onClose} data={data} onSuccess={onSuccess} />;
}
