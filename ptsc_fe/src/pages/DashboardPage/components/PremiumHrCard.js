import React, { memo } from "react";
import PropTypes from "prop-types";
import PremiumPanelCard from "./PremiumPanelCard";
import ProgressBar from "./ProgressBar";
import {
  PremiumFlexContentBody,
  PremiumHrDeptBarWrap,
  PremiumHrDeptCount,
  PremiumHrDeptName,
  PremiumHrDeptRow,
  PremiumHrGrid,
  PremiumHrStat,
  PremiumHrStatLabel,
  PremiumHrStatValue,
  PremiumSectionTitle,
  PremiumNestedScrollArea,
  NoDataContainer,
  NoDataTypography,
} from "@styles/DashboardPagePremium.styles";

const getTone = (tone) => tone;

const PremiumHrCard = ({ data, onItemClick, onActionClick, dragHandleNode }) => {
  return (
    <PremiumPanelCard title="Nhân sự toàn Công ty" actionText="Chi tiết →" onActionClick={onActionClick} dragHandleNode={dragHandleNode}>
      <PremiumFlexContentBody>
        {(!data?.stats || data.stats.length === 0) && (!data?.departments || data.departments.length === 0) ? (
          <NoDataContainer>
            <NoDataTypography>Chưa có dữ liệu hiển thị</NoDataTypography>
          </NoDataContainer>
        ) : (
          <>
            <PremiumHrGrid>
              {data?.stats?.map((item) => (
                <PremiumHrStat 
                  key={item.id}
                  onClick={onItemClick ? onItemClick("hrOverview", item) : undefined}
                  styleCursor={ onItemClick}
                >
                  <PremiumHrStatValue tone={getTone(item.tone)}>{item.value}</PremiumHrStatValue>
                  <PremiumHrStatLabel>{item.label}</PremiumHrStatLabel>
                </PremiumHrStat>
              ))}
            </PremiumHrGrid>

            <PremiumSectionTitle>Phân bổ theo đơn vị</PremiumSectionTitle>
            <PremiumNestedScrollArea>
              {(Array.isArray(data?.departments) ? data.departments : []).map((item) => (
                <PremiumHrDeptRow 
                  key={item.id}
                  onClick={onItemClick ? onItemClick("hrOverview", item) : undefined}
                  styleCursor={ onItemClick}
                >
                  <PremiumHrDeptName>{item.name}</PremiumHrDeptName>
                  <PremiumHrDeptBarWrap>
                    <ProgressBar value={(item.count / data.totalEmployees) * 100} fillColor="#0052CC" styledHeight={4} />
                  </PremiumHrDeptBarWrap>
                  <PremiumHrDeptCount>{item.count.toLocaleString()}</PremiumHrDeptCount>
                </PremiumHrDeptRow>
              ))}
            </PremiumNestedScrollArea>
          </>
        )}
      </PremiumFlexContentBody>
    </PremiumPanelCard>
  );
};

PremiumHrCard.propTypes = {
  data: PropTypes.object.isRequired,
  onItemClick: PropTypes.func,
  onActionClick: PropTypes.func,
  dragHandleNode: PropTypes.node,
};

export default memo(PremiumHrCard);
