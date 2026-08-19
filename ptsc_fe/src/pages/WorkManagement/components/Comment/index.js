import CustomInput from '@components/CustomInput/CustomInputBase';
import {   SendOutlined } from '@mui/icons-material';
import { SkyFlexGap8, SkyGrid } from '@styles/SkyStyles';
import React, { memo, useState, useCallback} from 'react'
import dayjs from 'dayjs';
import {
    StyledBoxContainerContent,
    JobSectionTitle,
    JobCommentSection,
    JobCommentItem,
    JobCommentAvatar,
    JobCommentBody,
    JobCommentBox,
    JobCommentHeader,
    JobCommentUserInfo,
    JobCommentUserName,
    JobCommentTime,
    JobCommentMenuIcon,
    JobCommentContent,
    JobCommentActions,
    JobCommentActionsLeft,
    JobCommentActionText,
    JobCommentEditedText,
    JobCommentInputContainer,
    JobCommentLikeContainer,
    JobLike,
    JobLikeCount,
    JobLikeIcon,
    // JobCommentReplyToggleContainer,
    // JobCommentReplyToggle,
    // JobExpandMoreIcon,
    // JobExpandLessIcon,
    JobCommentSendIconButton,
    JobLikePopoverPaperProps,
    JobLikePopover,
    JobLikeListItem,
    JobLikeListItemDense,
    JobLikeAvatar,
    StytedChatBubbleIcon
} from '@pages/WorkManagement/components/Job.styles';
import { IconButton, List, ListItemText as MuiListItemText} from '@mui/material';
import { StyledIconWrapper } from '@pages/ProjectManager/components/AddProject.styles';

const Comment = (props) => {
    const {
        organizedComments,
        createOpenCommentMenuHandler,
        formatCommentContent,
        createLikeCommentHandler,
        createReplyCommentHandler,
        commentText,
        handleCommentChange,
        handleCommentKeyPress,
        textareaRef,
        isCommentMultiline,
        handleSendComment,
        fixedHeight,
        hideInput=true,
        readOnly = false,
        emptyText,
        customHeader
    } = props;

    const [likeAnchorEl, setLikeAnchorEl] = useState(null);
    const [selectedLikes, setSelectedLikes] = useState([]);

    // ── [TẮT] Logic phân cấp comment (giữ lại để dùng sau nếu cần) ──
    // const [expandedIds, setExpandedIds] = useState(new Set());
    //
    // const toggleExpand = useCallback((id) => {
    //     setExpandedIds((prev) => {
    //         const next = new Set(prev);
    //         if (next.has(id)) {
    //             next.delete(id);
    //         } else {
    //             next.add(id);
    //         }
    //         return next;
    //     });
    // }, []);
    //
    // const createToggleExpandHandler = useCallback((id) => () => toggleExpand(id), [toggleExpand]);
    //
    // const visibleComments = useMemo(() => {
    //     let currentHiddenLevel = 999;
    //     return organizedComments.filter((cmt) => {
    //         if (cmt.level > currentHiddenLevel) return false;
    //         currentHiddenLevel = 999;
    //         const cmtId = cmt.id || cmt._id;
    //         if (!expandedIds.has(cmtId) && cmt.children?.length > 0) {
    //             currentHiddenLevel = cmt.level;
    //         }
    //         return true;
    //     });
    // }, [organizedComments, expandedIds]);
    // ────────────────────────────────────────────────────────────────

    const handleOpenLikes = useCallback((event, likes) => {
        if (!likes || likes.length === 0) return;
        setLikeAnchorEl(event.currentTarget);
        setSelectedLikes(likes);
    }, []);

    const createOpenLikesHandler = useCallback((likes) => (e) => handleOpenLikes(e, likes), [handleOpenLikes]);

    const handleCloseLikes = useCallback(() => {
        setLikeAnchorEl(null);
    }, []);

    const getReplyTarget = useCallback((comment) => {
        if (comment.level <= 1) return comment;
        // Find the closest preceding comment in organizedComments with level === 1
        const index = organizedComments.findIndex(c => (c.id || c._id) === (comment.id || comment._id));
        if (index === -1) return comment;
        for (let i = index - 1; i >= 0; i--) {
            if (organizedComments[i].level === 1) {
                return organizedComments[i];
            }
        }
        return comment;
    }, [organizedComments]);

    const handleReplyClick = useCallback((cmt) => () => {
        const target = getReplyTarget(cmt);
        const handler = createReplyCommentHandler(target);
        if (typeof handler === 'function') {
            handler();
        }
    }, [getReplyTarget, createReplyCommentHandler]);

    return (
        <>
            <SkyGrid item xs={12} md={6}>
                {customHeader ? customHeader : (
                    <SkyFlexGap8 mb={1.5}>
                        <StyledIconWrapper noBg>
                            <StytedChatBubbleIcon />
                        </StyledIconWrapper>
                        <JobSectionTitle variant="h6" mt={0} mb={0}>
                            Thảo luận & Bình luận
                        </JobSectionTitle>
                    </SkyFlexGap8>
                )}

                {/* fixedHeight truyền vào giúp cột BÌNH LUẬN cùng chiều cao với cột LỊCH SỬ */}
                <StyledBoxContainerContent fixedHeight={fixedHeight}>

                    <JobCommentSection>
                        {organizedComments.map((cmt, i) => {
                            const currentLevel = Math.min(cmt.level || 0, 1);
                            return (
                                <JobCommentItem key={cmt.id || cmt._id || i} level={currentLevel}>
                                    <JobCommentBox level={currentLevel}>
                                    {/* Avatar nằm TRONG background */}
                                    <JobCommentAvatar>
                                        {cmt.userName ? cmt.userName.charAt(0).toUpperCase() : "U"}
                                    </JobCommentAvatar>

                                    {/* Khung comment */}
                                    <JobCommentBody>
                                        <JobCommentHeader>
                                            <JobCommentUserInfo>
                                                <JobCommentUserName variant="subtitle2">
                                                    {cmt.userName}
                                                </JobCommentUserName>
                                                <JobCommentTime variant="caption">
                                                    {cmt.createdAt
                                                        ? dayjs(cmt.createdAt).format("DD/MM/YYYY HH:mm")
                                                        : ""}
                                                </JobCommentTime>
                                            </JobCommentUserInfo>
                                        </JobCommentHeader>

                                        <JobCommentContent
                                            variant="body2"
                                            dangerouslySetInnerHTML={{ __html: formatCommentContent(cmt.content)}}
                                        />

                                        <JobCommentActions>
                                            {/* Bên trái: Thích, Trả lời, Đã chỉnh sửa */}
                                            <JobCommentActionsLeft>
                                                <JobCommentActionText
                                                    variant="caption"
                                                    onClick={createLikeCommentHandler(cmt)}
                                                    userLiked={cmt.userLiked}
                                                >
                                                    {cmt.userLiked ? "Bỏ thích" : "Thích"}
                                                </JobCommentActionText>

                                                {!readOnly && (
                                                    <JobCommentActionText
                                                        variant="caption"
                                                        onClick={handleReplyClick(cmt)}
                                                    >
                                                        Trả lời
                                                    </JobCommentActionText>
                                                )}

                                                {(cmt.likeCount > 0 || cmt.userLiked) && (
                                                    <JobCommentLikeContainer
                                                        userLiked={cmt.userLiked}
                                                        onMouseEnter={createOpenLikesHandler(cmt.likedUsers || [])}
                                                        onMouseLeave={handleCloseLikes}
                                                        onClick={createOpenLikesHandler(cmt.likedUsers || [])}
                                                    >
                                                        {/* Số like nằm TRÁI icon */}
                                                        {cmt.likeCount > 0 && (
                                                            <JobLikeCount variant="caption">
                                                                {cmt.likeCount}
                                                            </JobLikeCount>
                                                        )}

                                                        <JobLike userLiked={cmt.userLiked}>
                                                            <JobLikeIcon />
                                                        </JobLike>
                                                    </JobCommentLikeContainer>
                                                )}

                                                {/* Hiển thị "Đã chỉnh sửa" nếu comment được edit */}
                                                {cmt?.isEdited && (
                                                    <JobCommentEditedText variant="caption">
                                                        Đã chỉnh sửa
                                                    </JobCommentEditedText>
                                                )}
                                            </JobCommentActionsLeft>

                                            {/* Bên phải: Nút menu tùy chỉnh */}
                                            <SkyFlexGap8>
                                                {cmt?.isCreated && (
                                                    <IconButton size="small" onClick={createOpenCommentMenuHandler(cmt)}>
                                                        <JobCommentMenuIcon />
                                                    </IconButton>
                                                )}
                                            </SkyFlexGap8>
                                        </JobCommentActions>
                                    </JobCommentBody>
                                </JobCommentBox>

                                {/* ── [TẮT] Nút Xem/Ẩn phản hồi - bật lại nếu cần phân cấp ──
                                {cmt.children?.length > 0 && (
                                    <JobCommentReplyToggleContainer>
                                        <JobCommentReplyToggle
                                            variant="caption"
                                            onClick={createToggleExpandHandler(cmt.id || cmt._id)}
                                        >
                                            {expandedIds.has(cmt.id || cmt._id) ?
                                                <><JobExpandLessIcon /> Ẩn phản hồi</> :
                                                <><JobExpandMoreIcon /> Xem {cmt.children.length} phản hồi</>
                                            }
                                        </JobCommentReplyToggle>
                                    </JobCommentReplyToggleContainer>
                                )}
                                ── */}
                            </JobCommentItem>
                        )})}
                        {organizedComments.length === 0 && emptyText && (
                            <div style={{ padding: '16px', textAlign: 'center', color: '#666' }}>
                                {emptyText}
                            </div>
                        )}
                    </JobCommentSection>

                    {hideInput && !readOnly && <JobCommentInputContainer>
                        <CustomInput
                            fullWidth
                            placeholder="Nhập bình luận của bạn..."
                            size="small"
                            value={commentText}
                            onChange={handleCommentChange}
                            onKeyPress={handleCommentKeyPress}
                            inputRef={textareaRef}
                            multiline={isCommentMultiline}
                            rows={isCommentMultiline ? 2 : 1}
                            InputProps={{
                                endAdornment: (
                                    <JobCommentSendIconButton size="small" onClick={handleSendComment}>
                                        <SendOutlined />
                                    </JobCommentSendIconButton>
                                )
                            }}
                        />
                    </JobCommentInputContainer>}

                    {/* Popover hiển thị danh sách người thích */}
                    <JobLikePopover
                        open={Boolean(likeAnchorEl)}
                        anchorEl={likeAnchorEl}
                        onClose={handleCloseLikes}
                        anchorOrigin={{
                            vertical: 'top',
                            horizontal: 'center',
                        }}
                        transformOrigin={{
                            vertical: 'bottom',
                            horizontal: 'center',
                        }}
                        PaperProps={{
                            ...JobLikePopoverPaperProps,
                            style: {
                                ...JobLikePopoverPaperProps.style,
                                pointerEvents: 'none',
                                marginBottom: 10,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                borderRadius: 8
                            }
                        }}
                        disableRestoreFocus
                    >
                        <List size="small">
                            <JobLikeListItem>
                                <MuiListItemText
                                    primary="Người đã thích"
                                    primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
                                />
                            </JobLikeListItem>
                            {selectedLikes.map((user, idx) => (
                                <JobLikeListItemDense key={user.userId || `like-${idx}`}>
                                    <JobLikeAvatar>
                                        {user.userName ? user.userName.charAt(0).toUpperCase() : "U"}
                                    </JobLikeAvatar>
                                    <MuiListItemText
                                        primary={user.userName}
                                        primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 500 }}
                                    />
                                </JobLikeListItemDense>
                            ))}
                        </List>
                    </JobLikePopover>
                </StyledBoxContainerContent>
            </SkyGrid>
        </>
    )
}

export default memo(Comment)