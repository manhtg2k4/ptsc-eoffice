
import React, { useRef, useState, useEffect } from "react";
import Form from "./index";
 
import {
  API_ADD_FIELD_BPMN,
  API_FUNCTIONMANAGEMANT_BY_ID,
} from "@EnvironmentFile/constants/urlConfig";
import { useToast } from "@components/common/ToastProvider";
import { useNavigate } from "react-router-dom";
import {
  // AppBar,
  // Toolbar,
  // Button,
  CircularProgress,
  // IconButton,
} from "@mui/material";
// import CloseIcon from "@mui/icons-material/Close";
import CustomDrawer from "@components/DynamicForm/CustomDrawer";
import { LoadingContainer } from "./FormAdd.styles";
import api from "@services/api";

export default function FormAdd(props) {
  const { fnCode } = props;
  const toast = useToast();
  // const { id } = useParams();
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [formName, setFormName] = useState("");
  const [loading, setLoading] = useState(true);
  // const [openDialog, setOpenDialog] = useState(false);
  const [, setOpenDialog] = useState(false);

  useEffect(() => {
    const fetchFormDetails = async () => {
      if (fnCode) {
        try {
          setLoading(true);
          const { data: res } = await api.get(
            `${API_FUNCTIONMANAGEMANT_BY_ID}/find-by-code/${fnCode}`
          );
          setFormName(res?.data?.name || "Tiếp nhận hồ sơ");
        } catch (error) {
          logger.error("Lỗi khi tải chi tiết form:", error);
          setFormName("Tiếp nhận hồ sơ");
          toast("Không thể tải được tên của biểu mẫu", "error");
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
        setFormName("Tiếp nhận hồ sơ");
      }
    };
    fetchFormDetails();
  }, [fnCode, toast]);

  useEffect(() => {
    const idTimeout = setTimeout(() => setOpenDialog(true), 50);
    return () => clearTimeout(idTimeout);
  }, []);

  const onSubmit = async (data, payload) => {
    try {
      await api.post(`${API_ADD_FIELD_BPMN}/start/${fnCode}`, payload);
      toast("Thêm mới dữ liệu thành công!", "success");
      navigate(-1);
    } catch (error) {
      toast("Khởi tạo quy trình thất bại", "error");
    }
  };

  const handleSave = () => {
    if (formRef.current) {
      formRef.current.submitForm();
    }
  };

  const handleClose = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <LoadingContainer>
        <CircularProgress />
      </LoadingContainer>
    );
  }

  return (
    <CustomDrawer
      open
      title={formName}
      actions={[{ label: 'Thêm mới', onClick: handleSave }]}
      onClose={handleClose}
    >
      <Form ref={formRef} code={fnCode} onData={onSubmit} disabledSave />
    </CustomDrawer>
  );
}
