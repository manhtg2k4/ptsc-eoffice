import React, { useState, useCallback, useEffect } from "react";
import { Rating } from "@mui/material";
import { styled } from "@mui/material/styles";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import dayjs from "dayjs";
import { SkyFlexGap8, SkyBox, SkyTypography, SkyGrid } from "@styles/SkyStyles";
import DOMPurify from "dompurify";

const TitleContainer = styled(SkyFlexGap8)(() => ({
  color: "#2364B0",
  width: "100%",
  justifyContent: "center",
}));

const DialogContentContainer = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(1, 0),
}));

const InfoSection = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1.25),
  "& > div:nth-of-type(even)": {
    backgroundColor: "#F4F6F8",
  },
}));

const InfoRow = styled(SkyBox)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "170px 1fr",
  alignItems: "center",
  columnGap: theme.spacing(3),
  padding: theme.spacing(1.5, 2),
  backgroundColor: "transparent", 
  borderRadius: theme.spacing(0.5),
  [theme.breakpoints.down("sm")]: {
    gridTemplateColumns: "1fr",
    rowGap: theme.spacing(0.75),
  },
}));

const InfoLabel = styled(SkyTypography)(() => ({
  fontWeight: 700,
  color: "#1F2937",
  fontSize: "0.95rem",
}));

const InfoValue = styled(SkyTypography)(() => ({
  fontSize: "0.95rem",
  color: "#1F2937",
  fontWeight: 500,
  wordBreak: "break-word",
  whiteSpace: "pre-wrap",
}));

const DeadlineValue = styled(InfoValue)(() => ({
  color: "#EF4444",
  fontWeight: 700,
}));

const BottomSection = styled(SkyGrid)(({ theme }) => ({
  marginTop: theme.spacing(3),
}));

const FormField = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
}));

const FieldLabel = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.85rem",
  fontWeight: 700,
  color: "#5B6472",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  "& .required": {
    color: theme.palette.error.main,
    marginLeft: theme.spacing(0.25),
  },
}));

const RatingBlock = styled(SkyBox)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));

const RatingLabel = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.85rem",
  fontWeight: 700,
  color: "#5B6472",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: theme.spacing(1),
}));

const StyledRating = styled(Rating)(() => ({
  "& .MuiRating-iconFilled": {
    color: "#2364B0",
  },
  "& .MuiRating-iconEmpty": {
    color: "#2364B0",
  },
}));

const EvaluationRecommendationDialog = ({
  open,
  onClose,
  onConfirm,
  data,
  isLoading,
  sharedComponents,
  recommendationTypeOptions = [],
}) => {
  const deadlineVal = data?.deadlineHighlight || data?.deadline;
  const { InputComponents } = sharedComponents;
  const [rating, setRating] = useState(0);
  const [satisfaction, setSatisfaction] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (open) {
      setRating(0);
      setSatisfaction("");
      setComment("");
    }
  }, [open]);

  const handleSatisfactionChange = useCallback((e) => {
    const val = e?.target ? e.target.value : e;
    setSatisfaction(val || "");
    if (val) {
      setRating(6 - Number(val));
    } else {
      setRating(0);
    }
  }, []);

  const handleCommentChange = useCallback((e) => {
    const val = e?.target ? e.target.value : e;
    setComment(val);
  }, []);

  const handleConfirm = () => {
    onConfirm({
      rating,
      satisfaction,
      satisfactionLevel: String(satisfaction),
      comment,
    });
  };

  const typesTitle = recommendationTypeOptions.find((opt) => opt.value === data?.types)?.title || data?.types || "";

  const renderDeadline = () => {
    if (deadlineVal?.includes("<")) {
      return <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(deadlineVal) }} />;
    }

    const formattedDeadline = deadlineVal
      ? dayjs(deadlineVal).isValid()
        ? dayjs(deadlineVal).format("DD/MM/YYYY HH:mm")
        : deadlineVal
      : "";

    if (!formattedDeadline) {
      return "";
    }

    if (data?.overdueDays > 0) {
      return `${formattedDeadline} (Quá hạn ${data.overdueDays} ngày)`;
    }

    return formattedDeadline;
  };

  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      onSave={handleConfirm}
      title={
        <TitleContainer>
          Đánh giá phản ánh kiến nghị
        </TitleContainer>
      }
      isLoading={isLoading}
      titleButton={isLoading ? "Đang xử lý..." : "Gửi đánh giá"}
      disabledSave={!satisfaction || !comment?.trim() || isLoading}
      size="md"
    >
      <DialogContentContainer>
        <InfoSection>
          <InfoRow>
            <InfoLabel>Loại phản ánh</InfoLabel>
            <InfoValue>{typesTitle || ""}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>Tiêu đề</InfoLabel>
            <InfoValue>{data?.title || ""}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>Nội dung</InfoLabel>
            <InfoValue>{data?.content || ""}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>Đơn vị xử lý</InfoLabel>
            <InfoValue>{data?.unitName || ""}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>Người xử lý</InfoLabel>
            <InfoValue>{data?.processorName || ""}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>Hạn xử lý</InfoLabel>
            <DeadlineValue>{renderDeadline()}</DeadlineValue>
          </InfoRow>
        </InfoSection>

        <BottomSection container spacing={2.5}>
          <SkyGrid item xs={12} md={4}>
            <FormField>
              <FieldLabel>
                Mức độ hài lòng <span className="required">*</span>
              </FieldLabel>
              <InputComponents
                select
                placeholder="Chọn mức độ"
                value={satisfaction}
                onChange={handleSatisfactionChange}
                options={[
                  { value: 1, title: "Rất hài lòng" },
                  { value: 2, title: "Hài lòng" },
                  { value: 3, title: "Bình thường" },
                  { value: 4, title: "Không hài lòng" },
                  { value: 5, title: "Rất tệ" },
                ]}
                fullWidth
              />
            </FormField>

            <RatingBlock>
              <RatingLabel>Đánh giá phản ánh</RatingLabel>
              <StyledRating value={rating} readOnly />
            </RatingBlock>
          </SkyGrid>

          <SkyGrid item xs={12} md={8}>
            <FormField>
              <FieldLabel>
                Ý kiến đánh giá <span className="required">*</span>
              </FieldLabel>
              <InputComponents
                placeholder="Nhập ý kiến đánh giá"
                multiline
                rows={5}
                value={comment}
                onChange={handleCommentChange}
                fullWidth
              />
            </FormField>
          </SkyGrid>
        </BottomSection>
      </DialogContentContainer>
    </CustomDialog>
  );
};

export default EvaluationRecommendationDialog;
