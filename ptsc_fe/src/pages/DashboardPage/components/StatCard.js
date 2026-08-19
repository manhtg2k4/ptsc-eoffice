import React, { memo } from "react";
import PropTypes from "prop-types";
import TrendChip from "./TrendChip";
import InsightBox from "./InsightBox";
import StatDetails from "./StatDetails";
import { getIconComponent } from "./SectionCard";
import {
  StatCardWrapper,
  StatCardContent,
  StatCardHeader,
  StatCardHeaderMeta,
  StatCardLabelGroup,
  StatCardLabel,
  StatCardValueBox,
  StatCardValue,
  DashboardIconBox,
  getColorValue,
} from "@styles/DashboardPage.styles";
import {
  MediumChip,
  MediumChipRow,
  MediumDot,
  MediumKpiCard,
  MediumKpiFooter,
  MediumKpiFooterText,
  MediumKpiStat,
  MediumKpiSubText,
  MediumKpiSuffix,
  MediumKpiTrend,
  MediumKpiValue,
} from "@styles/DashboardPageMedium.styles";
import {
	HeaderCard,
  PremiumKpiIconBox,
  PremiumKpiLabel,
  PremiumKpiTag,
  PremiumKpiTagRow,
  PremiumKpiValue,
  PremiumStatCard,
} from "@styles/DashboardPagePremium.styles";

import { Box, Tooltip } from "@mui/material";
import { styled } from "@mui/material/styles";

const MediumKpiValueRow = styled(Box)({
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 10,
  marginBottom: 8,
});

const MediumKpiValueInline = styled(MediumKpiValue)({
  marginBottom: 0,
});

const MediumKpiSubTextInline = styled(MediumKpiSubText)({
	fontSize: 12,
	color: "#171A1C",
	fontWeight: 700,
  marginBottom: 2,
  textAlign: "right",
  maxWidth: "50%",
});

const ClickablePremiumKpiValue = styled(PremiumKpiValue, {
  shouldForwardProp: (prop) => prop !== "isClickable",
})(({ isClickable }) => ({
  cursor: isClickable ? "pointer" : "default",
}));

const ClickablePremiumKpiTag = styled(PremiumKpiTag, {
  shouldForwardProp: (prop) => prop !== "isClickable",
})(({ isClickable }) => ({
  cursor: isClickable ? "pointer" : "default",
}));

const ClickableMediumKpiValueInline = styled(MediumKpiValueInline, {
  shouldForwardProp: (prop) => prop !== "isClickable",
})(({ isClickable }) => ({
  cursor: isClickable ? "pointer" : "default",
}));

const ClickableMediumChip = styled(MediumChip, {
  shouldForwardProp: (prop) => prop !== "isClickable",
})(({ isClickable }) => ({
  cursor: isClickable ? "pointer" : "default",
}));

const ClickableMediumKpiStat = styled(MediumKpiStat, {
  shouldForwardProp: (prop) => prop !== "isClickable",
})(({ isClickable }) => ({
  cursor: isClickable ? "pointer" : "default",
}));

const ClickableStatCardValueBox = styled(StatCardValueBox, {
  shouldForwardProp: (prop) => prop !== "isClickable",
})(({ isClickable }) => ({
  cursor: isClickable ? "pointer" : "default",
}));

const StatCard = ({ data, variant = "normal", dragHandleNode, onStatBlockClick }) => {
  const IconComp = getIconComponent(data.icon);
  const mediumTitle = data.title || data.subText || data.label;
  const mediumSubText = data.subText;
  const isClickable = typeof onStatBlockClick === "function";

  const handleMainValueClick = (e) => {
    if (isClickable) {
      e.stopPropagation();
      onStatBlockClick(
        {
          id: data.id || "main",
          key: data.key || "main",
          label: data.label || data.title || "Tổng số",
          value: data.value,
          parentCard: data,
        },
        data
      );
    }
  };

  const handleBlockClick = (block) => (e) => {
    if (isClickable) {
      e.stopPropagation();
      onStatBlockClick({ ...block, parentCard: data }, data);
    }
  };

  if (variant === "premium") {
    return (
      <PremiumStatCard accentColor={data.color}>
        <HeaderCard>
          {dragHandleNode}
          <Tooltip title={data.label} arrow placement="top">
            <PremiumKpiLabel>{data.label}</PremiumKpiLabel>
          </Tooltip>
          <PremiumKpiIconBox accentColor={data.color}>{data.variantIcon}</PremiumKpiIconBox>
        </HeaderCard>
        <ClickablePremiumKpiValue
          accentColor={data.colorLabel}
          onClick={handleMainValueClick}
          isClickable={isClickable}
        >
          {data.value}
        </ClickablePremiumKpiValue>
        {data.premiumTags?.length ? (
          <PremiumKpiTagRow singleLine={data.premiumTags.length > 1 ? 1 : 0}>
            {data.premiumTags.map((tag) => (
              <ClickablePremiumKpiTag
                key={tag.id}
                tagType={tag.type}
                onClick={handleBlockClick(tag)}
                isClickable={isClickable}
              >
                {tag.label}
              </ClickablePremiumKpiTag>
            ))}
          </PremiumKpiTagRow>
        ) : null}
      </PremiumStatCard>
    );
  }

  if (variant === "medium") {
    return (
      <MediumKpiCard accentColor={data.color}>
        <HeaderCard>
          {dragHandleNode}
          <Tooltip title={mediumTitle} arrow placement="top">
            <PremiumKpiLabel>{mediumTitle}</PremiumKpiLabel>
          </Tooltip>
          <PremiumKpiIconBox accentColor={data.color}>
            <IconComp />
          </PremiumKpiIconBox>
        </HeaderCard>
        <MediumKpiValueRow>
          <ClickableMediumKpiValueInline
            accentColor={data.colorLabel}
            onClick={handleMainValueClick}
            isClickable={isClickable}
          >
            {data.value}
            {data.suffix ? <MediumKpiSuffix>{data.suffix}</MediumKpiSuffix> : null}
          </ClickableMediumKpiValueInline>
          {mediumSubText ? (
            <Tooltip title={mediumSubText} arrow placement="top">
              <MediumKpiSubTextInline>{mediumSubText}</MediumKpiSubTextInline>
            </Tooltip>
          ) : null}
        </MediumKpiValueRow>
        {data.trend ? (
          <MediumKpiTrend trendType={data.trend.type}>
            {data.trend.type === "down" ? "▼" : "▲"} {data.trend.text}
          </MediumKpiTrend>
        ) : null}
        {data.chips?.length ? (
          <MediumChipRow>
            {data.chips.map((chip) => (
              <ClickableMediumChip
                key={chip.id}
                chipColor={chip.color}
                onClick={handleBlockClick(chip)}
                isClickable={isClickable}
              >
                {chip.label}
              </ClickableMediumChip>
            ))}
          </MediumChipRow>
        ) : null}
        {data.footerStats?.length ? (
          <MediumKpiFooter>
            {data.footerStats.map((item) => (
              <ClickableMediumKpiStat
                key={item.id}
                onClick={handleBlockClick(item)}
                isClickable={isClickable}
              >
                <MediumDot dotColor={item.color} />
                <MediumKpiFooterText
                  textColor={item.color === "red" ? "red" : undefined}
                >
                  {item.text}
                </MediumKpiFooterText>
              </ClickableMediumKpiStat>
            ))}
          </MediumKpiFooter>
        ) : null}
      </MediumKpiCard>
    );
  }

  return (
    <StatCardWrapper cardColor={data.color}>
      <StatCardContent>
        <StatCardHeader>
          <StatCardLabelGroup>
            {dragHandleNode}
            <Tooltip title={data.label} arrow placement="top">
              <StatCardLabel>{data.label}</StatCardLabel>
            </Tooltip>
          </StatCardLabelGroup>

          <StatCardHeaderMeta>
            <DashboardIconBox
              styledColor={getColorValue(data.color)}
              styledFontSize={20}
            >
              <IconComp />
            </DashboardIconBox>
          </StatCardHeaderMeta>
        </StatCardHeader>

        <ClickableStatCardValueBox
          onClick={handleMainValueClick}
          isClickable={isClickable}
        >
          <StatCardValue valueColor={data.colorValue}>{data.value}</StatCardValue>
          {data.trend ? (
            <TrendChip type={data.trend.type} value={data.trend.value} />
          ) : null}
        </ClickableStatCardValueBox>

        {data.insight ? (
          <InsightBox type={data.insight.type} text={data.insight.text} />
        ) : null}

        {data.details?.length ? (
          <StatDetails
            details={data.details}
            onStatBlockClick={onStatBlockClick}
            parentData={data}
          />
        ) : null}
      </StatCardContent>
    </StatCardWrapper>
  );
};

StatCard.propTypes = {
  variant: PropTypes.oneOf(["normal", "medium", "premium"]),
  onStatBlockClick: PropTypes.func,
  data: PropTypes.shape({
    id: PropTypes.string,
    icon: PropTypes.string,
    color: PropTypes.string,
    variantIcon: PropTypes.string,
    label: PropTypes.string,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    suffix: PropTypes.string,
    title: PropTypes.string,
    subText: PropTypes.string,
    premiumTags: PropTypes.array,
    trend: PropTypes.shape({
      type: PropTypes.string,
      value: PropTypes.string,
      text: PropTypes.string,
    }),
    chips: PropTypes.array,
    footerStats: PropTypes.array,
    insight: PropTypes.shape({
      type: PropTypes.string,
      text: PropTypes.string,
    }),
    details: PropTypes.array,
  }).isRequired,
  dragHandleNode: PropTypes.node,
};

export default memo(StatCard);
