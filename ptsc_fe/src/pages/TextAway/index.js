import React, { useState } from "react";
import { Container } from "@styles/QualificationManagement.styles";
import CustomTabsWithBadge from "@components/CustomTabs/index"; // Import component

// Import các tab components
import SigningSubmissionTab from "@pages/TextAway/Tab/SigningSubmissionTab/SigningSubmissionTab";
import HandleTab from "@pages/TextAway/Tab/HandleTab/HandleTab";
import PromulgateTab from "@pages/TextAway/Tab/PromulgateTab/PromulgateTab";
import OpinionTab from "@pages/TextAway/Tab/OpinionTab/OpinionTab";
import GetToKnowTab from "@pages/TextAway/Tab/GetToKnowTab/GetToKnowTab";
import LookUpTab from "@pages/TextAway/Tab/LookUpTab/LookUpTab";
import LookUpStatisticsTab from "@pages/TextAway/Tab/LookUpStatisticsTab/LookUpStatisticsTab";

const QualificationManagement = () => {
  const [tabValue, setTabValue] = useState(0);

  // Định nghĩa danh sách tabs
  const tabs = [
    { label: "TRÌNH KÝ", count: 8 },
    { label: "XỬ LÝ" },
    { label: "BAN HÀNH", count: 170 },
    { label: "Ý KIẾN" },
    { label: "NHẬN ĐỂ BIẾT" },
    { label: "TRA CỨU" },
    { label: "TRA CỨU THỐNG KÊ" },
  ];

  const renderTabContent = () => {
    switch (tabValue) {
      case 0:
        return <SigningSubmissionTab />;
      case 1:
        return <HandleTab />;
      case 2:
        return <PromulgateTab />;
      case 3:
        return <OpinionTab />;
      case 4:
        return <GetToKnowTab />;
      case 5:
        return <LookUpTab />;
      case 6:
        return <LookUpStatisticsTab />;
      default:
        return null;
    }
  };

  const handleChangeTab = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Container>
      {/* Thay thế phần Header + StyledTabs bằng CustomTabsWithBadge */}
      <CustomTabsWithBadge
        tabs={tabs}
        value={tabValue}
        onChange={handleChangeTab}
      />

      {renderTabContent()}
    </Container>
  );
};

export default QualificationManagement;
