import React, { useState, useCallback } from "react";
import PropTypes from "prop-types";

import withSharedComponents from "@components/WrapperComponent";
import {
  StyledDialog,
  StyledDialogActions,
  StyledDialogTitle,
  ContentWrapper,
  CountText,
  SubTitle,
} from "@styles/CustomPopup.styles";

function SaveForReference({
  open,
  onClose,
  onConfirm,
  count = 0,
  dataDetail,
  sharedComponents,
}) {
  const { Input, LoadingDialog, Button } = sharedComponents;

  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleContentChange = useCallback((e) => {
    setContent(e.target.value);
  }, []);

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    try {
      await onConfirm?.(content);
    } finally {
      setLoading(false);
    }
  }, [onConfirm, content]);

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  return (
    <>
      <StyledDialog open={open} onClose={handleClose} dialogSize="md">
        <StyledDialogTitle>
          Bạn đang chuẩn bị lưu tra cứu {count} văn bản, trong đó có:
        </StyledDialogTitle>

        <ContentWrapper>
          <CountText variant="body1">
            • <b>{count}</b> văn bản <span>{dataDetail?.type}</span>
          </CountText>

          <SubTitle variant="body2">Nội dung xử lý</SubTitle>

          <Input
            multiline
            rows={4}
            fullWidth
            placeholder="Nhập nội dung xử lý"
            value={content}
            onChange={handleContentChange}
          />

          <SubTitle variant="body2">
            Bạn có chắc chắn muốn tiếp tục lưu tra cứu không?
          </SubTitle>
        </ContentWrapper>

        <StyledDialogActions>
          <Button variant="primary" onClick={handleSubmit}>
            ĐỒNG Ý
          </Button>
          <Button variant="error" onClick={handleClose}>
            ĐÓNG
          </Button>
        </StyledDialogActions>
      </StyledDialog>

      <LoadingDialog open={loading} />
    </>
  );
}

SaveForReference.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onConfirm: PropTypes.func,
  count: PropTypes.number,
  typeLabel: PropTypes.string,
  sharedComponents: PropTypes.object,
};

const Wrapped = withSharedComponents(SaveForReference);

export default React.memo(Wrapped);
