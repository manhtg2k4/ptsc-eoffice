import React, { useState, useCallback } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { Box, Typography } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

import withSharedComponents from "@components/WrapperComponent";
import Comment from "@components/Comment";
import {
  addCommentToDocument,
  replyToCommentInDocument,
} from "@redux/slices/SharedCategory/managementUnitSlice";

import {
  OpinionButton,
  OpinionForm,
  OpinionHeader,
  OpinionTitle,
  SeeMoreButton,
  SubmitOpinionButton,
  RecursiveCommentContainer,
} from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";

const OpinionSection = ({ documentId, comments, sharedComponents }) => {
  const { InputComponents } = sharedComponents;
  const dispatch = useDispatch();
  const { dataUser } = useSelector((state) => state.auth);

  const [showOpinionInput, setShowOpinionInput] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [opinionText, setOpinionText] = useState("");

  const handleOpinionTextChange = useCallback((event) => {
    setOpinionText(event.target.value);
  }, []);

  const handleToggleOpinionInput = () => setShowOpinionInput((prev) => !prev);
  const handleToggleExpand = () => setIsExpanded((prev) => !prev);

  const formatVietnameseDate = (isoString) => {
    if (!isoString) return "";
    try {
      return new Date(isoString).toLocaleString("vi-VN");
    } catch (error) {
      return isoString;
    }
  };

  const handleSubmitOpinion = async (e) => {
    e.preventDefault();
    if (!opinionText.trim() || !documentId) return;

    try {
    if (!dataUser) return;

      const commentData = {
        userId: dataUser?.user?._id || dataUser?._id,
        userName: dataUser?.user?.name || dataUser?.name,
        content: opinionText,
      };

      await dispatch(addCommentToDocument({ documentId, commentData })).unwrap();
      setOpinionText("");
      setShowOpinionInput(false);
    } catch (error) {
      logger.error("Lỗi khi gửi ý kiến:", error);
    }
  };

  const handleReplyComment = async (rootCommentId, parentId, replyText) => {
    if (!replyText.trim() || !documentId) return;

    try {
    if (!dataUser) return;

      const replyData = {
        userId: dataUser?.user?._id || dataUser?._id,
        userName: dataUser?.user?.name || dataUser?.name,
        content: replyText,
      };

      await dispatch(
        replyToCommentInDocument({
          documentId,
          commentId: parentId || rootCommentId,
          replyData,
        })
      ).unwrap();
    } catch (error) {
      logger.error("Lỗi khi gửi trả lời:", error);
    }
  };

  const RecursiveComment = ({ comment, rootCommentId, level = 0, isLast }) => {
    const MAX_LEVEL = 2;
    const onReply = useCallback((replyText, parentId) => {
      handleReplyComment(rootCommentId, parentId, replyText);
    }, [rootCommentId]);

    const replies = Array.isArray(comment.replies) ? comment.replies : [];

    return (
      <RecursiveCommentContainer key={comment.id} level={level}>
        <Comment
          username={comment.userName}
          content={<Typography variant="body2">{comment.content}</Typography>}
          time={formatVietnameseDate(comment.createdAt)}
          onReply={onReply}
          commentId={comment.id}
          rootCommentId={rootCommentId}
          isLast={isLast}
          isReply={level > 0}
          hasReplies={replies.length > 0}
        />
        {level < MAX_LEVEL &&
          replies.length > 0 &&
          [...replies]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map((reply, index) => (
              <RecursiveComment 
                key={reply.id} 
                comment={reply} 
                rootCommentId={rootCommentId} 
                level={level + 1} 
                isLast={isLast && index === replies.length - 1}
              />
            ))}
      </RecursiveCommentContainer>
    );
  };

  return (
    <Box>
      <OpinionHeader>
        <OpinionTitle>Ý KIẾN XỬ LÝ</OpinionTitle>
        <OpinionButton onClick={handleToggleOpinionInput} size="small">Ý KIẾN</OpinionButton>
      </OpinionHeader>

      {showOpinionInput && (
        <OpinionForm component="form" onSubmit={handleSubmitOpinion}>
          <InputComponents fullWidth placeholder="Nhập ý kiến của bạn..." value={opinionText} onChange={handleOpinionTextChange} />
          <SubmitOpinionButton type="submit" variant="contained" size="small">Gửi</SubmitOpinionButton>
        </OpinionForm>
      )}

      {Array.isArray(comments) && (() => {
        const list = [...comments]
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, isExpanded ? comments.length : 1);
        return list.map((comment, index) => (
          <RecursiveComment 
            key={comment.id} 
            comment={comment} 
            rootCommentId={comment.id} 
            isLast={index === list.length - 1}
          />
        ));
      })()}

      {Array.isArray(comments) && comments.length > 1 && (
        <SeeMoreButton onClick={handleToggleExpand} size="small">
          {isExpanded ? "Thu gọn" : "Xem thêm"}
          {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
        </SeeMoreButton>
      )}
    </Box>
  );
};

OpinionSection.propTypes = {
  documentId: PropTypes.string,
  comments: PropTypes.array.isRequired,
  sharedComponents: PropTypes.object.isRequired,
};

export default withSharedComponents(OpinionSection);
