import React, { useCallback, useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { Box, Typography, IconButton, styled, Grid, Button } from "@mui/material";
import SendIcon from '@mui/icons-material/Send';
import { SkyFlexGap8, SkyTypography } from "@styles/SkyStyles";
import { API_VIEW_FILE } from "@EnvironmentFile/constants/urlConfig";
import axiosInstance from "@utils/axiosInstance";
import CustomInput from "@components/CustomInput/CustomInputBase";
import { UserInitialAvatar } from "@styles/Navbar.styles";

const CommentContainer = styled(Box, {
	shouldForwardProp: (prop) => prop !== 'isReply' && prop !== 'opinionFlow',
})(({ theme, isReply, opinionFlow }) => ({
	display: 'flex',
	position: 'relative',
	marginBottom: opinionFlow ? theme.spacing(1.5) : theme.spacing(2),
	marginLeft: isReply ? '44px' : '0px',
	alignItems: 'flex-start',
	overflow: 'visible',   // ← quan trọng: cho phép đường kẻ xuyên ra ngoài
}));

const TimelineLine = styled(Box, {
	shouldForwardProp: (prop) => prop !== 'opinionFlow',
})(({ theme, opinionFlow }) => ({
	position: 'absolute',
	left: 17,        // center của avatar 35px
	top: 35,         // bắt đầu dưới avatar
	bottom: opinionFlow ? -14 : -16,
	width: opinionFlow ? 2 : 2,
	borderRadius: 2,
	backgroundColor: opinionFlow ? '#DDE3EA' : theme.palette.divider,
	zIndex: 0,
}))

// Đường thẳng đứng bên trái (nối lên cha)
const ConnectorVertical = styled(Box, {
	shouldForwardProp: (prop) => prop !== 'isLast' && prop !== 'hasReplies',
})(({ theme, isLast, hasReplies }) => ({
	position: 'absolute',
	left: -44,
	top: -16,            // Bắt đầu từ mép trên của khoảng cách (margin-bottom: 16px)
	...(isLast && !hasReplies ? {
		height: 33,        // Dừng chính xác ở tâm avatar con (17px từ top + 16px khoảng trống)
	} : {
		bottom: -16,       // Nếu không phải cuối, kéo xuống hết card + khoảng trống
	}),
	width: 2,
	backgroundColor: theme.palette.divider,
	zIndex: 0,
	pointerEvents: 'none',
}));

// Đường ngang nối vào avatar con
const ConnectorHorizontal = styled(Box, {
	shouldForwardProp: (prop) => prop !== 'opinionFlow',
})(({ theme, opinionFlow }) => ({
	position: 'absolute',
	left: -44,
	top: 17,             // center avatar con
	width: 44,
	height: 2,
	backgroundColor: opinionFlow ? '#DDE3EA' : theme.palette.divider,
	zIndex: 0,
	pointerEvents: 'none',
}));

const AvatarContainer = styled(Box)(() => ({
	position: 'relative',
	zIndex: 1,
}));

const StyledUserInitialAvatar = styled(UserInitialAvatar, {
	shouldForwardProp: (prop) => prop !== 'opinionFlow',
})(({ theme, opinionFlow, imageUrl }) => ({
	...(opinionFlow && {
		backgroundColor: imageUrl ? '#f0f0f0' : '#F44336',
		color: theme.palette.common.white,
		fontSize: '19px',
		fontWeight: 700,
	}),
}));

const CommentCard = styled(Box, {
	shouldForwardProp: (prop) => prop !== 'opinionFlow',
})(({ theme, opinionFlow }) => ({
	flex: 1,
	backgroundColor: theme.palette.background.paper,
	borderRadius: opinionFlow ? 10 : theme.spacing(1.5),
	border: `1px solid ${opinionFlow ? '#E3E7EC' : theme.palette.divider}`,
	padding: opinionFlow ? theme.spacing(1.25, 1.75) : theme.spacing(1.5, 2),
	marginLeft: "-4px",
	boxShadow: opinionFlow ? 'none' : '0px 1px 2px rgba(0, 0, 0, 0.05)',
	minWidth: 0,
}));

const CommentHeader = styled(Box, {
	shouldForwardProp: (prop) => prop !== 'opinionFlow',
})(({ theme, opinionFlow }) => ({
	display: "flex",
	justifyContent: "space-between",
	alignItems: opinionFlow ? "flex-start" : "center",
	gap: theme.spacing(1),
	marginBottom: opinionFlow ? theme.spacing(0.75) : theme.spacing(1),
	...(!opinionFlow ? {
		[theme.breakpoints.down('xl')]: {
			flexDirection: "column",
			gap: "2px",
			alignItems: "flex-start",
		},
	} : {
		[theme.breakpoints.down(1220)]: {
			flexDirection: "column",
			gap: "4px",
			alignItems: "flex-start",
		},
	}),
}));

const UserInfo = styled(Box)({
	display: 'flex',
	flexDirection: 'column',
	minWidth: 0,
});

const UserLine = styled(Box)({
	display: 'flex',
	alignItems: 'baseline',
	gap: 4,
	flexWrap: 'wrap',
	minWidth: 0,
});

const UsernameTypography = styled(Typography, {
	shouldForwardProp: (prop) => prop !== 'opinionFlow',
})(({ theme, opinionFlow }) => ({
	fontWeight: 600,
	fontSize: opinionFlow ? '13px' : '14px', // 13px
	color: theme.palette.text.primary,
	wordBreak: 'break-word',
	overflowWrap: 'break-word',
}));

// const RoleTypography = styled(Typography, {
//   shouldForwardProp: (prop) => prop !== 'opinionFlow',
// })(({ theme, opinionFlow }) => ({
//   fontSize: '12px', // 11.2px
//   color: opinionFlow ? theme.palette.text.primary : theme.palette.text.secondary,
//   marginTop: opinionFlow ? 0 : '1px',
//   maxWidth: opinionFlow ? 'none' : '200px',
//   whiteSpace: opinionFlow ? 'nowrap' : 'normal',
// }));

const TimeTypography = styled(Typography, {
	shouldForwardProp: (prop) => prop !== 'opinionFlow',
})(({ theme, opinionFlow }) => ({
	fontSize: '12px', // 11.2px
	color: theme.palette.text.secondary,
	flexShrink: 0,
	whiteSpace: 'nowrap',
	marginTop: opinionFlow ? 1 : 0,
}));

const CommentBody = styled(Box, {
	shouldForwardProp: (prop) => prop !== 'isExpanded' && prop !== 'opinionFlow',
})(({ theme, isExpanded, opinionFlow }) => ({
	fontSize: opinionFlow ? '13px' : '14px',
	color: theme.palette.text.primary,
	lineHeight: opinionFlow ? 1.8 : 2,
	overflowWrap: 'break-word',
	whiteSpace: 'pre-wrap',
	marginBottom: opinionFlow ? '4px' : '10px',
	marginTop: opinionFlow ? '6px' : '10px',
	display: 'block',
	...(!isExpanded && {
		display: '-webkit-box',
		WebkitLineClamp: 4,
		WebkitBoxOrient: 'vertical',
		overflow: 'hidden',
	}),
}));

const TagContainer = styled(Box, {
	shouldForwardProp: (prop) => prop !== 'opinionFlow',
})(({ theme, opinionFlow }) => ({
	display: 'flex',
	gap: theme.spacing(1),
	flexWrap: 'wrap',
	maxWidth: opinionFlow ? '100%' : '200px',
	marginTop: opinionFlow ? theme.spacing(0.75) : 0,
	marginBottom: opinionFlow ? theme.spacing(0.5) : 0,
}));

const StyledTag = styled(Box, {
	shouldForwardProp: (prop) => prop !== 'opinionFlow',
})(({ theme, opinionFlow }) => ({
	backgroundColor: opinionFlow ? '#F2F4F7' : theme.palette.action.selected,
	color: opinionFlow ? theme.palette.text.primary : theme.palette.text.secondary,
	padding: theme.spacing(0.25, 1.25),
	borderRadius: 12,
	fontSize: '12px',
	fontWeight: 500,
	border: opinionFlow ? 'none' : '1px solid #eeeeee',
}));

// const CommentFooter = styled(Box)(({ theme }) => ({
// 	// marginTop: theme.spacing(1),
// 	display: "flex",
// 	alignItems: "center",
// 	gap: theme.spacing(2),
// 	color: "#2364B0",
// 	padding: theme.spacing(0.25, 1.25),
// 	borderRadius: 12,
// }));

const ReplyFormContainer = styled(Box)(({ theme }) => ({
	width: '100%',
	marginTop: theme.spacing(1),
	paddingLeft: 0,
}));

const StyledGridContainer = styled(Grid)({
	display: 'flex',
	alignItems: 'center',
});

const StyledSendGridItem = styled(Grid)({
	display: 'flex',
	justifyContent: 'center',
	alignItems: 'center',
});

const SendButton = styled(IconButton)(({ theme }) => ({
	color: theme.palette.primary.main,
}));

const ReplyToggleButton = styled(Button, {
	shouldForwardProp: (prop) => prop !== 'opinionFlow',
})(({ opinionFlow }) => ({
	textTransform: 'none',
	color: opinionFlow ? '#28556E' : '#2364B0',
	padding: opinionFlow ? '4px 12px' : '3px 12px',
	borderRadius: '20px',
	border: opinionFlow ? '1px solid #E0E8EF' : '1px solid rgba(35, 100, 176, 0.2)',
	minWidth: 'auto',
	fontWeight: opinionFlow ? 500 : '600',
	fontSize: '12px',
	display: 'inline-flex',
	marginLeft: '12px',
	verticalAlign: 'middle',
	'&:hover': {
		backgroundColor: 'rgba(35, 100, 176, 0.05)',
		borderColor: 'rgba(35, 100, 176, 0.4)',
	},
}));

const ReadMoreLink = styled(SkyTypography)(({ theme }) => ({
	cursor: 'pointer',
	display: 'inline-block',
	fontWeight: 'normal',
	color: theme.palette.primary.main,
	'&:hover': {
		textDecoration: 'underline',
	},
	marginLeft: theme.spacing(1),
	fontSize: '12px',
}));


const ReadMoreContainer = styled(Box)(() => ({
	display: 'flex',
	justifyContent: 'flex-end',
	marginTop: '-8px',
	marginBottom: '8px',
}));

const SkyBoxFooter = styled(SkyFlexGap8, {
	shouldForwardProp: (prop) => prop !== 'opinionFlow',
})(({ opinionFlow }) => ({
	justifyContent: opinionFlow ? 'flex-end' : 'space-between',
	marginTop: opinionFlow ? 4 : 0,
}));


const CommentFlexWrapper = styled(Box)({
	display: "flex",
	justifyContent: "space-between",
	alignItems: "flex-end",
	width: "100%",
});

const CommentTextWrapper = styled(Box)({
	flex: 1,
	minWidth: 0,
});

const InlineReplyToggleButton = styled(ReplyToggleButton)({
	flexShrink: 0,
	marginBottom: '4px',
	marginLeft: '12px',
});


const Comment = ({
	isReply,
	isLast,
	hasReplies,
	dataComment,
	username,
	// role,
	tags,
	content,
	time,
	onReply,
	commentId,
	rootCommentId,
	variant
}) => {
	const opinionFlow = variant === 'opinionFlow';
	// const [open, setOpen] = useState(false);
	const [isReplying, setIsReplying] = useState(false);
	const [comment, setComment] = useState('');

	const [avatarUrl, setAvatarUrl] = useState(null);

	useEffect(() => {
		const avatarId = dataComment?.avatar?.id;
		// logger.log('avatarId', avatarId)
		if (!avatarId) return;

		let objectUrl = null;

		const fetchAvatar = async () => {
			try {
				const response = await axiosInstance.get(`${API_VIEW_FILE}/${avatarId}`, {
					responseType: 'blob',
				});
				logger.log('urlll', `${API_VIEW_FILE}/${avatarId}`)
				objectUrl = URL.createObjectURL(response.data);
				setAvatarUrl(objectUrl);
			} catch (error) {
				logger.error('Lấy avatar thất bại:', error);
			}
		};

		fetchAvatar();

		// Cleanup blob URL khi unmount tránh memory leak
		return () => {
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [dataComment?.avatar?.id]);

	const handleSendReply = useCallback(async () => {
		if (!comment.trim()) return;

		try {
			// Gọi hàm onReply (là async từ CustomComment)
			await onReply(comment, commentId, rootCommentId);

			// Thành công → reset + đóng form
			setComment('');
			setIsReplying(false); // Đây chính là dòng bạn cần: TỰ ĐỘNG ẨN FORM
		} catch (error) {
			// Nếu lỗi thì vẫn giữ form mở để người dùng thử lại
			logger.error("Gửi trả lời thất bại:", error);

		}
	}, [comment, commentId, rootCommentId, onReply]);

	// const handleKeyDown = (event) => {

	//   if (event.key === 'Enter' && !event.shiftKey) {
	//     event.preventDefault(); 
	//     if (comment.trim()) { 
	//       onReply(comment, commentId, rootCommentId);
	//       setComment('');
	//       setReplyRows(0);
	//     }
	//   }
	// };
	const handleKeyDown = useCallback((event) => {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleSendReply();
		}
	}, [handleSendReply]);

	// const handleToggleReply = useCallback(() => {
	//   setOpen((prev) => !prev);
	//   // Reset khi đóng form trả lời
	//   if (open) {
	//     setComment('');
	//     setReplyRows(0);
	//   }
	// }, [open]);
	const handleToggleReply = useCallback(() => {
		setIsReplying(prev => !prev);
		if (!isReplying) {
			setComment('');
		}
	}, [isReplying]);

	const handleCommentChange = useCallback((e) => {
		setComment(e.target.value);
	}, []);

	// const handleSendReply = useCallback(() => {
	//   if (comment.trim()) {
	//     onReply(comment, commentId, rootCommentId);
	//     setComment('');
	//     setReplyRows(0);
	//   }
	// }, [comment, commentId, rootCommentId, onReply]);


	const [isExpanded, setIsExpanded] = useState(false);
	const [isLongComment, setIsLongComment] = useState(false);
	const contentRef = useRef(null);

	const toggleExpand = useCallback(() => {
		setIsExpanded(prev => !prev);
	}, []);

	useEffect(() => {
		const checkOverflow = () => {
			if (contentRef.current && !isExpanded) {
				const hasOverflow = contentRef.current.scrollHeight > contentRef.current.clientHeight;
				setIsLongComment(hasOverflow);
			}
		};

		// Run check after render and when fonts/layout are fully ready
		const timeoutId = setTimeout(checkOverflow, 50);

		window.addEventListener('resize', checkOverflow);
		return () => {
			clearTimeout(timeoutId);
			window.removeEventListener('resize', checkOverflow);
		};
	}, [content, isExpanded]);

	const showTimelineLine = opinionFlow
		? hasReplies || (!isReply && !isLast)
		: (!isLast || hasReplies) && !isReply;

	return (
		<CommentContainer isReply={isReply} opinionFlow={opinionFlow}>
			{/* Đường thẳng đứng: hiện ở comment gốc nếu không phải cuối hoặc có bình luận con */}
			{showTimelineLine && <TimelineLine opinionFlow={opinionFlow} />}

			{isReply && (
				<>
					{!opinionFlow && <ConnectorVertical isLast={isLast} hasReplies={hasReplies} />}
					<ConnectorHorizontal opinionFlow={opinionFlow} />
				</>
			)}

			<AvatarContainer>
				{/* <StyledAvatar src={avatarUrl}>
          { dataComment?.userName?.charAt(0).toUpperCase()}
        </StyledAvatar> */}
				<StyledUserInitialAvatar
					alt={dataComment?.userName}
					imageUrl={avatarUrl}
					opinionFlow={opinionFlow}
					size="35px"
				>
					{dataComment?.userName?.charAt(0).toUpperCase()}
				</StyledUserInitialAvatar>
			</AvatarContainer>

			<CommentCard opinionFlow={opinionFlow}>
				<CommentHeader opinionFlow={opinionFlow}>
					<UserInfo>
						{opinionFlow ? (
							<UserLine>
								<UsernameTypography opinionFlow={opinionFlow}>{username}</UsernameTypography>
								{/* {role && <RoleTypography opinionFlow={opinionFlow}>- {role}</RoleTypography>} */}
							</UserLine>
						) : (
							<>
								<UsernameTypography>{username}</UsernameTypography>
								{/* {role && <RoleTypography>{role}</RoleTypography>} */}
							</>
						)}
						{/* {opinionFlow && tags && tags.length > 0 && (
              <TagContainer opinionFlow={opinionFlow}>
                {tags.map((tag) => (
                  <StyledTag key={tag} opinionFlow={opinionFlow}>{tag}</StyledTag>
                ))}
              </TagContainer>
            )} */}
					</UserInfo>
					<TimeTypography opinionFlow={opinionFlow}>{time}</TimeTypography>
				</CommentHeader>

				<CommentBody ref={contentRef} isExpanded={isExpanded} opinionFlow={opinionFlow}>
					{!isLongComment || isExpanded ? (
						<CommentFlexWrapper>
							<CommentTextWrapper>
								{content}
							</CommentTextWrapper>
							<InlineReplyToggleButton
								size="small"
								onClick={handleToggleReply}
								opinionFlow={opinionFlow}
							>
								Trả lời
							</InlineReplyToggleButton>
						</CommentFlexWrapper>
					) : (
						content
					)}
				</CommentBody>
				{isLongComment && (
					<ReadMoreContainer>
						<ReadMoreLink onClick={toggleExpand}>
							{isExpanded ? 'Thu gọn' : 'Xem thêm'}
						</ReadMoreLink>
						{!isExpanded && (
							<ReplyToggleButton
								size="small"
								onClick={handleToggleReply}
								opinionFlow={opinionFlow}
							>
								Trả lời
							</ReplyToggleButton>
						)}
					</ReadMoreContainer>
				)}
				{!opinionFlow && tags && tags.length > 0 && (
					<SkyBoxFooter opinionFlow={opinionFlow}>
						<TagContainer>
							{tags.map((tag) => (
								<StyledTag key={tag}>{tag}</StyledTag>
							))}
						</TagContainer>
					</SkyBoxFooter>
				)}

				{isReplying && (
					<ReplyFormContainer>
						<StyledGridContainer container spacing={1}>
							<Grid item xs={11}>
								<CustomInput
									size="small"
									fullWidth
									onChange={handleCommentChange}
									value={comment}
									onKeyDown={handleKeyDown}
									multiline
									minRows={1}
									maxRows={2}
									placeholder="Nhập trả lời..."
								/>
							</Grid>
							<StyledSendGridItem item xs={1}>
								<SendButton onClick={handleSendReply}>
									<SendIcon />
								</SendButton>
							</StyledSendGridItem>
						</StyledGridContainer>
					</ReplyFormContainer>
				)}
			</CommentCard>
		</CommentContainer>
	);
};

Comment.propTypes = {
	dataComment: PropTypes.object,
	username: PropTypes.string,
	content: PropTypes.node,
	time: PropTypes.string,
	role: PropTypes.string,
	tags: PropTypes.array,
	onReply: PropTypes.func,
	commentId: PropTypes.string,
	rootCommentId: PropTypes.string,
	InputComponents: PropTypes.elementType.isRequired,
	variant: PropTypes.string,
};


export default Comment;
