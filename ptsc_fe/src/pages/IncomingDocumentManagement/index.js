/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useSelector } from "react-redux";
import {
  Container,
  Header,
} from "@styles/QualificationManagement.styles";
import { useToast } from "@components/common/ToastProvider";
import CustomTabsWithBadge from "@components/CustomTabs/index";
import Reception from "./Tab/Reception/Reception";
import MainProcessing from "./Tab/MainProcessing/MainProcessing";
import Combination from "./Tab/Combination/Combination";
import Recognize from "./Tab/Recognize/Recognize";
import Lookup from "./Tab/Lookup/Lookup";
import StatisticalLookup from "./Tab/StatisticalLookup/StatisticalLookup";
import withSharedComponents from "@components/WrapperComponent";

import { API_DETAIL_VANBANDEN_DHVB } from "@EnvironmentFile/constants/urlConfig";

import axiosInstance from "@utils/axiosInstance";
import FormButton from "@components/FormButton";

const IncomingDocumentManagement = (props) => {
  const { sharedComponents } = props;
  const { Dialog } = sharedComponents;
  const [tabValue, setTabValue] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);
  const toast = useToast();
  const { tabPermissions, loading } = useSelector((state) => state.permissions);
  const { dataUser: authUser } = useSelector((state) => state.auth || {});
  const [dataDetail, setDataDetail] = useState([]);
  const [openDialog, setOpenDialog] = useState({});
  const [reloadData, setReloadData] = useState(null);
  const panelContainerRef = useRef(null);
 

  useEffect(() => {
    const fetchDetail = async (id) => {
      // Lấy userId từ Redux
      const userId = authUser?._id;

      try {
        const url = API_DETAIL_VANBANDEN_DHVB(id);
        const response = await axiosInstance.get(url, {
          params: { userId },
        });
        setDataDetail(response);
      } catch (error) {
        logger.error("❌ [Fetch Detail] Error:", error);
        toast("Có lỗi xảy ra khi lấy chi tiết văn bản", "error");
        setDataDetail([]);
      }
    };

    if (selectedIds.length === 1) {
      fetchDetail(selectedIds[0]);
    } else {
      setDataDetail([]);
    }
  }, [selectedIds, toast, authUser]);



  const tabs = useMemo(() => {
    const baseTabs = [
      { key: "tiepNhan", label: "TIẾP NHẬN", count: 8 },
      { key: "xuLyChinh", label: "XỬ LÝ CHÍNH" },
      { key: "phoiHop", label: "PHỐI HỢP", count: 170 },
      { key: "nhanDeBiet", label: "NHẬN ĐỂ BIẾT" },
      { key: "traCuu", label: "TRA CỨU" },
      { key: "thongKe", label: "TRA CỨU THỐNG KÊ" },
    ];

    if (!tabPermissions || tabPermissions.length === 0) {
      return [];
    }

    return baseTabs.filter((tab) => tabPermissions.includes(tab.key));
  }, [tabPermissions]);


  useEffect(() => {
    if (tabPermissions && tabPermissions.length === 0) {
      toast("Bạn không có quyền hiển thị bất kỳ tab nào", "warning");
    }
  }, [tabPermissions]);


  // const availableActions = useMemo(() => {
  //   return dataDetail?.availableActions || [];
  // }, [dataDetail]);

  // const transferActions = useMemo(() => {
  //   return availableActions.filter(
  //     (action) => action.type === "transfer" && action.canExecute
  //   );
  // }, [availableActions]);

  const handleTabChange = useCallback((e, v) => {
    setTabValue(v);
    setSelectedIds([]);
  }, []);

  const handleApproveProposal = useCallback(
    (ids) => {
      toast(`Duyệt đề xuất: ${ids}`, "info");
    },
    [toast]
  );

  const handleProcessProposal = useCallback(
    (ids) => {
      toast(`Đề xuất xử lý: ${ids}`, "info");
    },
    [toast]
  );

  const handleTransferProcessing = useCallback(
    (ids) => {
      toast(`Chuyển xử lý: ${ids}`, "info");
    },
    [toast]
  );

  const handleReturnDocument = useCallback(
    (ids) => {
      toast(`Trả lại: ${ids}`, "info");
    },
    [toast]
	);
	
  const handleRecallDocument = useCallback(
    (ids) => {
      toast(`Thu hồi: ${ids}`, "info");
    },
    [toast]
  );

  const handleSaveBook = useCallback(
    (ids) => {
      toast(`Lưu sổ: ${ids}`, "info");
    },
    [toast]
  );


  const handleCloseDialog = useCallback((dialogKey) => {
    setOpenDialog((prev) => ({
      ...prev,
      [dialogKey]: false,
      id: null,
      selectedAction: null,
    }));
  }, []);



  const closeLuuSo = useCallback(() => {
    handleCloseDialog("Luuso");
  }, [handleCloseDialog]);

  const renderIncomingDocumentActions = useCallback(
    (selectedIds) => {
      if (selectedIds.length === 0) return null;
      return (
        <>
          <FormButton
            dataDetail={dataDetail}
            selectedIds={selectedIds}
            setReloadData={setReloadData}
            panelContainerRef={panelContainerRef}
          />
        </>
      );
    },
    [dataDetail]
  );

  const commonTabProps = useMemo(
    () => ({
      selection: selectedIds,
      onSelectionChange: setSelectedIds,
      panelContainerRef,
      onApproveProposal: handleApproveProposal,
      onProcessProposal: handleProcessProposal,
      onTransferProcessing: handleTransferProcessing,
			onReturnDocument: handleReturnDocument,
			onRecallDocument: handleRecallDocument,
      onSaveBook: handleSaveBook,
      renderCustomActions: renderIncomingDocumentActions,

    }),
    [
      selectedIds,
      handleApproveProposal,
      handleProcessProposal,
      handleTransferProcessing,
			handleReturnDocument,
			handleRecallDocument,
      handleSaveBook,
      renderIncomingDocumentActions,
    ]
  );

  // ✅ THAY ĐỔI: Sửa case "xuLyChinh" thành "xulichinh"
  const renderTabContent = useCallback(() => {
    switch (tabs[tabValue]?.key) {
      case "tiepNhan":
        return <Reception setDataDetail={setDataDetail} dataReload={reloadData} {...commonTabProps}  />;
      case "xuLyChinh":
        return <MainProcessing  dataReload={reloadData} {...commonTabProps}   />;
      case "phoiHop":
        return <Combination dataReload={reloadData} {...commonTabProps}   />;
      case "nhanDeBiet":
        return <Recognize {...commonTabProps} setDataDetail={setDataDetail} />;
      case "traCuu":
        return <Lookup {...commonTabProps} />;
      case "thongKe":
        return <StatisticalLookup {...commonTabProps} />;
      default:
        return null;
    }
  }, [tabs, tabValue, commonTabProps,reloadData ]);

  if (loading) return <div>Đang tải quyền hiển thị tab...</div>;

  return (
    <>
      <Container>
        <Header>
          <CustomTabsWithBadge
            tabs={tabs}
            value={tabValue}
            onChange={handleTabChange}
          />
        </Header>

        {renderTabContent()}
      </Container>


      {/* Dialog for "Lưu sổ" */}
      <Dialog
        open={openDialog.Luuso ?? false}
        onClose={closeLuuSo}
        title="Lưu sổ"
        // onSave={} // Placeholder for actual save logic
        type="save" // Assuming a save type dialog
      >
        {/* <Typography>Bạn có chắc chắn muốn lưu sổ các văn bản đã chọn không?</Typography> */}
      </Dialog>
    </>
  );
};

export default withSharedComponents(IncomingDocumentManagement);
