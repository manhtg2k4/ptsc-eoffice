import React from "react";
import { Rating } from "@mui/material";
import { styled } from "@mui/material/styles";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import dayjs from "dayjs";
import { SkyFlexGap8, SkyBox, SkyTypography, SkyGrid } from '@styles/SkyStyles';
import DOMPurify from "dompurify";
const TitleContainer = styled(SkyFlexGap8)(() => ({
  color: '#2364B0',
  width: '100%',
  justifyContent: 'center',
}));

const DialogContentContainer = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(1, 0),
}));

const InfoRow = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  marginBottom: theme.spacing(1.5),
  '&:last-child': {
    marginBottom: 0,
  },
  gap: theme.spacing(6),
}));

const InfoLabel = styled(SkyTypography)(({ theme }) => ({
  fontWeight: 200,
  width: '120px',
  minWidth: '120px',
  color: theme.palette.text.secondary,
  fontSize: '0.875rem',
}));

const InfoValue = styled(SkyTypography)(() => ({
  fontSize: '0.875rem',
  color: '#334155',
  fontWeight: 'bold',
  wordBreak: 'break-word',
  whiteSpace: 'pre-wrap',
}));

const InfoValueMarginTop = styled(InfoValue)(({ theme }) => ({
  marginTop: theme.spacing(1),
}));

const RedText = styled(SkyTypography)(() => ({
  color: '#d32f2f',
  fontSize: '0.875rem',
  fontWeight: 500,
}));

const OverdueText = styled(RedText)(() => ({
  fontWeight: 400,
  marginLeft: '8px'
}));

const DividerBox = styled(SkyBox)(({ theme }) => ({
  height: '1px',
  backgroundColor: theme.palette.divider,
  margin: theme.spacing(1, 0),
}));

const FlexAlignCenterBox = styled(SkyBox)(() => ({
  display: "flex",
  alignItems: "center"
}));

const OverdueWrapper = styled(SkyBox)(() => ({
  display: 'flex',
  alignItems: 'center'
}));

const RatingLabel = styled(SkyTypography)(({ theme }) => ({
  fontSize: '0.875rem',
  fontWeight: 600,
  color: theme.palette.text.secondary,
  marginRight: theme.spacing(2),
}));

const ViewEvaluationRecommendationDialog = ({
  open,
  onClose,
  data,
  recommendationTypeOptions = []
}) => {
  const deadlineVal = data?.deadlineHighlight || data?.deadline;

  // Map types value to title
  const typesTitle = recommendationTypeOptions.find(opt => opt.value === data?.types)?.title || data?.types || "";
 
  // Map satisfaction value to text
  const getSatisfactionText = (val) => {
    if (!val) return "";
    const options = [
      { value: 1, title: "Rất hài lòng" },
      { value: 2, title: "Hài lòng" },
      { value: 3, title: "Bình thường" },
      { value: 4, title: "Không hài lòng" },
      { value: 5, title: "Rất tệ" }
    ];
    return options.find(opt => String(opt.value) === String(val))?.title || val || "";
  };
 
  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      title={
        <TitleContainer>
          Đánh giá kết quả xử lý
        </TitleContainer>
      }
      disableSave
      size="md"
    >
      <DialogContentContainer>
        <SkyGrid container spacing={2}>
          <SkyGrid item xs={12}>
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
              <OverdueWrapper>
                <RedText>
                  {deadlineVal?.includes('<') ? (
                    <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(deadlineVal) }} />
                  ) : (
                    deadlineVal ? (dayjs(deadlineVal).isValid() ? dayjs(deadlineVal).format("DD/MM/YYYY HH:mm") : deadlineVal) : ""
                  )}
                </RedText>
                {data?.overdueDays > 0 && (
                  <OverdueText>(Quá hạn {data.overdueDays} ngày)</OverdueText>
                )}
              </OverdueWrapper>
            </InfoRow>
          </SkyGrid>

          <SkyGrid item xs={12}>
            <DividerBox />
          </SkyGrid>

          <SkyGrid item xs={12} md={6}>
            <FlexAlignCenterBox>
              <InfoLabel>Mức độ hài lòng</InfoLabel>
              <InfoValue>{getSatisfactionText(data?.satisfactionLevel)}</InfoValue>
            </FlexAlignCenterBox>
          </SkyGrid>
          <SkyGrid item xs={12} md={6}>
            <FlexAlignCenterBox>
              <RatingLabel>Đánh giá phản ánh</RatingLabel>
              <Rating value={Number(data?.rating) || 0} readOnly />
            </FlexAlignCenterBox>
          </SkyGrid>
          <SkyGrid item xs={12}>
        <SkyBox mt={1}>
          <InfoLabel>Ý kiến đánh giá</InfoLabel>
          <InfoValueMarginTop>{data?.ratingComment || ""}</InfoValueMarginTop>
        </SkyBox>
          </SkyGrid>
        </SkyGrid>
      </DialogContentContainer>
    </CustomDialog>
  );
};

export default ViewEvaluationRecommendationDialog;
