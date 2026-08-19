import React, { Suspense, useEffect, useState } from "react";
import { Box, CircularProgress } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useNavigate, useParams } from "react-router-dom";
// import axiosInstance from "@utils/axiosInstance";
// import { API_FILE_INFO } from "@EnvironmentFile/constants/urlConfig";
import Loading from "@components/Loading/Loading";
import withSharedComponents from "@components/WrapperComponent";
import { getComponentByKey } from "@builder-table/components/componentRegistry";

const LoadingContainer = styled(Box)(({ theme }) => ({
  minHeight: "70vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: theme.spacing(1),
}));

const ViewOR = ({ sharedComponents }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const toast = sharedComponents?.toast;
 
  const [activeComponent, setActiveComponent] = useState(null);
  const handleGoBack = () => navigate(-1);

  const openByRegistry = (data) => {
    if (!data?.key || !data?.recordId) {
      toast?.("Không tìm thấy thông tin tài liệu để mở.", "error");
      return;
    }
    const componentInfo = getComponentByKey(data.key);
    if (!componentInfo) {
      toast?.("Không tìm thấy màn hình hiển thị phù hợp.", "error");
      return;
    }

    setActiveComponent({
      Component: componentInfo.component,
      props: {
        ...componentInfo.defaultProps,
        open: true,
        title: componentInfo.title,
        titlePopup: componentInfo.title,
        popupName: componentInfo.title,
        headerTitle: componentInfo.title,
        onClose: handleGoBack,
        goBack: handleGoBack,
        onBack: handleGoBack,
        documentId: data.recordId,
        meetingId: data.recordId,
        vehicleRegistrationId: data.recordId,
        passportRequestId: data.recordId,
        newsId: data.recordId,
        id: data.recordId,
      },
    });
  };

  useEffect(() => {
    let isMounted = true;

    const fetchDocumentInfo = async () => {
      if (!id) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        const response ={
    "id": id,
    "recipientId":id,
    "key": "VIEW_OUTCOMING_DOC",
    "recordId": id,
    "category": "Văn bản đi",
    "abstractNote": ""
}

        if (!isMounted) return;

        openByRegistry(response);
      } catch (err) {
        if (isMounted) {
          toast?.(err?.response?.data?.message || "Không thể tải thông tin tài liệu.", "error");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDocumentInfo();

    return () => {
      isMounted = false;
    };
  }, [id, toast]);

  return (
    <Box >
      {/* <Typography variant="h6" gutterBottom>
        View QR Document
      </Typography> */}

      {loading && (
        <LoadingContainer>
          <CircularProgress size={24} />
        </LoadingContainer>
      )}


      {activeComponent && (
        <Suspense fallback={<Loading />}>
          <activeComponent.Component
            {...activeComponent.props}
            sharedComponents={sharedComponents}
          />
        </Suspense>
      )}
    </Box>
  );
};

export default withSharedComponents(ViewOR);
