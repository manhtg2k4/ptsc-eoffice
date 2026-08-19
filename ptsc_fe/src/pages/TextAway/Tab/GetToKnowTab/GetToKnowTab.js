import React, { useCallback, useMemo, useState } from "react";
// import { useDispatch } from "react-redux";
// import { Box } from "@mui/material";
import CustomTable from "@components/CustomTable/CustomTable";
import {
  columnsSigningSubmission,
  filtersSigningSubmission,
} from "./constants";
import { useNavigate } from "react-router-dom";
import { useToast } from "@components/common/ToastProvider";
// import { useModuleCode } from "@utils/Common/Common";
import {
  PageContainer,
  TabsWrapper,
  TabsContainer,
  StyledTab,
  TabLabel,
  TableWrapper,
} from "@styles/SigningSubmissionTab.styles";
import axiosInstance from "@utils/axiosInstance";
import { API_DS_VANBANDI_DHVB } from "@EnvironmentFile/constants/urlConfig";

const GetToKnowTab = () => {
  // const dispatch = useDispatch();
  const toast = useToast();
  const navigate = useNavigate();
  // const moduleCode = useModuleCode();

  const [currentTab, setCurrentTab] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [setSelectedIds] = useState([]);

  // Tabs data
  const tabs = [
    { label: "CHƯA XỬ LÝ", value: "draft", },
    { label: "ĐÃ XỬ LÝ", value: "submitted",},
  ];


  // Columns từ localStorage
  const columns = useMemo(() => {
    try {
      const viewConfigStr = localStorage.getItem("viewConfig");

      if (!viewConfigStr) return columnsSigningSubmission;

      const viewConfigData = JSON.parse(viewConfigStr);
      const configArray = Array.isArray(viewConfigData)
        ? viewConfigData
        : viewConfigData?.data;

      const outgoingDocConfig = Array.isArray(configArray)
        ? configArray.find((config) => config.code === "OutgoingDocument")
        : null;

      if (outgoingDocConfig && Array.isArray(outgoingDocConfig.field)) {
        const dynamicColumns = outgoingDocConfig.field
          .filter((f) => f.checked === true)
          .map((f) => ({
            name: f.title,
            row: f.name,
            width: f.width || "150px",
          }));

        if (dynamicColumns.length > 0) {
          return dynamicColumns;
        }
      }
    } catch (error) {
      logger.error("Lỗi khi đọc hoặc phân tích cấu hình cột:", error);
    }
    return columnsSigningSubmission;
  }, []);

  // Fetch data từ API
  const getDataSigningFromApi = useCallback(
    async ({ page, limit, query, code, sort }) => {
      try {
        const params = {
          limit: limit || 100,
          sort: sort || "-updatedAt",
          "filter[stage]": "receive",
          "filter[createdBy]": "62346aa9da4d530f61bbbefd",
          "filter[checkRole]": true,
          codeStatus: "new",
          page: page || 1,
        };

        if (query && code && Array.isArray(code)) {
          code.forEach((c) => {
            params[`filter[${c}]`] = query;
          });
        }

        const response = await axiosInstance.get(API_DS_VANBANDI_DHVB, {
          params,
        });
        if (response) {
          return {
            data:
              response.map((item) => ({
                deadlineReply: item.deadlineReply || item.deadline,
                draftDocumentSymbol:
                  item.draftDocumentSymbol || item.documentNumber,
                abstractNote: item.abstractNote || item.extract,
                documentStatus: item.documentStatus, // Lấy trực tiếp giá trị
                urgencyLevel: item.urgencyLevel, // Lấy trực tiếp giá trị
                privateLevel: item.privateLevel, // Lấy trực tiếp giá trị
                reportDocumentSymbol: item.reportDocumentSymbol,
                docSenderUnit: item.docSenderUnit,
                documentType: item.documentType, // Lấy trực tiếp giá trị
                signer: item.signer, // Lấy trực tiếp giá trị
                createdAt: item.createdAt,
                toBookTextSymbols: item.toBookTextSymbols,
                documentField: item.documentField, // Lấy trực tiếp giá trị
                internalReceivingUnit: item.internalReceivingUnit,
                incommingDocument: item.incommingDocument,
                tasks: item.tasks,
                autoReleaseCheck: item.autoReleaseCheck ? "Có" : "Không",
                caSignCheck: item.caSignCheck ? "Có" : "Không",
                completeStatus: item.completeStatus,
                createdBy: item.createdBy,
                drafter: item.drafter, // Lấy trực tiếp giá trị
                listRecipientsOutSystem: item.listRecipientsOutSystem,
                _id: item._id,
              })) || [],
            total: response.length || 0,
          };
        }

        return { data: [], total: 0 };
      } catch (error) {
        logger.error("Lỗi khi gọi API:", error);
        toast("Đã xảy ra lỗi khi tải dữ liệu!", "error");
        return { data: [], total: 0 };
      }
    },
    [toast]
  );

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    setSelectedIds([]);
  };

  // Handle delete
  const handleDelete = async (ids) => {
    setIsLoading(true);
    try {
      if (!ids?.length) {
        toast("Vui lòng chọn ít nhất một dòng để xóa!", "warning");
        return;
      }

      // Thay thế bằng API call thực tế
      // await dispatch(deleteSigningSubmission({ ids })).unwrap();

      toast(`Đã xóa ${ids.length} bản ghi thành công!`, "success");
      setSelectedIds([]);
    } catch (error) {
      toast("Đã xảy ra lỗi khi xóa!", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle edit
  const handleEdit = (id) => {
    navigate(`/signing-submission/${id}`, {
      state: { id, view: "update" },
    });
  };

  // Handle view
  const handleView = (id) => {
    navigate(`/signing-submission/view/${id}`, {
      state: { id, view: "view" },
    });
  };

  // Handle add
  const handleAdd = () => {
    navigate(`/signing-submission/add`, {
      state: { view: "add" },
    });
  };

  return (
    <PageContainer>
      {/* Tabs ở vị trí bên phải */}
      <TabsWrapper>
        <TabsContainer
          value={currentTab}
          onChange={handleTabChange}
          variant="standard"
        >
          {tabs.map((tab) => (
            <StyledTab
              key={tab.value}
              label={
                <TabLabel>
                  {tab.label}
                  {/* {tab.badge > 0 && (
                    <TabBadge badgeContent={tab.badge} color="primary" />
                  )} */}
                </TabLabel>
              }
            />
          ))}
        </TabsContainer>
      </TabsWrapper>

      {/* CustomTable */}
      <TableWrapper>
        <CustomTable
					codeModule={"OutGoingDoc_GetToKnow"}
          fetchData={getDataSigningFromApi}
          columns={columns}
          key={currentTab}
          disableSynchronize
          filter={filtersSigningSubmission}
          reload={isLoading}
          onAdd={handleAdd}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onView={handleView}
					encodeHtml
        />
      </TableWrapper>
    </PageContainer>
  );
};

export default GetToKnowTab;