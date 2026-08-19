import React, { useState, useCallback, useEffect } from "react";
import {
  FormControl,
  Select,
  MenuItem,
  InputLabel,
} from "@mui/material";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { useToast } from "@components/common/ToastProvider";
import api from "@services/api";
import {
  API_DYNAMIC,
  API_EXPORT_BODY,
  API_EXPORT_TEMPLATE_URL_EXCEL,
  API_EXPORT_TEMPLATE_URL_WORD,
  APP_BASE,
} from "@EnvironmentFile/constants/urlConfig";

const DynamicExportDialog = ({
  open,
  onClose,
  documentId,
  typeDocument,
  isAuthority,
}) => {
  const toast = useToast();
  const [multiFormOptions, setMultiFormOptions] = useState([]);
  const [selectedFormCodes, setSelectedFormCodes] = useState([]);
  const [exportFormat, setExportFormat] = useState("docx");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      const fetchForms = async () => {
        try {
          setIsLoading(true);
          const res = await api.get(API_DYNAMIC, {
            params: { limit: 9999 },
          });
          const allForms = res?.data?.data || [];
          setMultiFormOptions(allForms);
          if (allForms.length > 0) {
            setSelectedFormCodes([allForms[0].code]);
          }
          setExportFormat("docx");
        } catch (err) {
          logger.error("Error fetching form data:", err);
          toast("Không thể lấy danh sách biểu mẫu.", "error");
        } finally {
          setIsLoading(false);
        }
      };
      fetchForms();
    }
  }, [open, toast]);

  const handleFormSelectionChange = useCallback((event) => {
    const code = event.target.value;
    setSelectedFormCodes([code]);
    const form = multiFormOptions.find(f => f.code === code);
    if (form && form.fileName) {
      const lowerName = form.fileName.toLowerCase();
      if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
        setExportFormat('excel');
      } else if (lowerName.endsWith('.docx') || lowerName.endsWith('.doc')) {
        setExportFormat(prev => (prev === 'docx' || prev === 'pdf' ? prev : 'pdf'));
      }
    }
  }, [multiFormOptions]);

  const handleExportFormatChange = useCallback((event) => {
    const format = event.target.value;
    setExportFormat(format);
    if (format === 'excel') {
      const excelForm = multiFormOptions.find(f => f.fileName && (f.fileName.toLowerCase().endsWith('.xlsx') || f.fileName.toLowerCase().endsWith('.xls')));
      if (excelForm) setSelectedFormCodes([excelForm.code]);
    } else if (format === 'docx' || format === 'pdf') {
      const docForm = multiFormOptions.find(f => f.fileName && (f.fileName.toLowerCase().endsWith('.docx') || f.fileName.toLowerCase().endsWith('.doc')));
      if (docForm) setSelectedFormCodes([docForm.code]);
    }
  }, [multiFormOptions]);

  const handleExport = useCallback(async () => {
    if (!documentId) {
      toast("Không tìm thấy ID tài liệu để xuất.", "error");
      return;
    }

    const selectedFormCode = selectedFormCodes[0];
    const selectedForm = multiFormOptions.find((f) => f.code === selectedFormCode);

    if (!selectedForm || !selectedForm.file) {
      toast("Không tìm thấy file template để xuất", "error");
      return;
    }

    const fileUrl = selectedForm.file;

    try {
      setIsLoading(true);

      const { data: bodyData } = await api.post(
        API_EXPORT_BODY,
        {
          documentId,
          typeDocument,
        },
        {
          params: isAuthority ? { isAuthority: true } : undefined,
        }
      );

      const backendHost = new URL(APP_BASE).origin;
      const correctedFileUrl = fileUrl.replace(
        /http:\/\/localhost(:\d+)?/,
        backendHost
      );
      const authenticatedFileUrl = correctedFileUrl;

      if (exportFormat === "excel") {
        const response = await api.post(
          `${API_EXPORT_TEMPLATE_URL_EXCEL}?excelUrl=${encodeURIComponent(
            authenticatedFileUrl
          )}&resultType=${exportFormat}`,
          bodyData,
          {
            headers: { "Content-Type": "application/json" },
            responseType: "blob",
          }
        );

        const blob = new Blob([response.data], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${selectedForm.name || "Biểu mẫu"}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast("Xuất biểu mẫu Excel thành công", "success");
      } else {
        const response = await api.post(
          `${API_EXPORT_TEMPLATE_URL_WORD}?docUrl=${encodeURIComponent(
            authenticatedFileUrl
          )}&resultType=${exportFormat}`,
          bodyData,
          {
            headers: { "Content-Type": "application/json" },
            responseType: "blob",
          }
        );

        const blob = new Blob([response.data], {
          type:
            exportFormat === "pdf"
              ? "application/pdf"
              : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${selectedForm.name || "Biểu mẫu"}.${exportFormat}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast(`Xuất biểu mẫu ${exportFormat.toUpperCase()} thành công`, "success");
      }
      onClose();
    } catch (error) {
      logger.error("Error exporting file:", error);
      toast(error.response?.data?.message || "Xuất biểu mẫu thất bại!", "error");
    } finally {
      setIsLoading(false);
    }
  }, [
    documentId,
    exportFormat,
    multiFormOptions,
    selectedFormCodes,
    toast,
    isAuthority,
    typeDocument,
    onClose,
  ]);

  return (
    <CustomDialog
      size="lg"
      onClose={onClose}
      onSave={handleExport}
      open={open}
      title={"Xuất biểu mẫu"}
      titleButton="In biểu mẫu"
      isLoading={isLoading}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <FormControl fullWidth>
          <InputLabel id="dynamic-export-form-label">Biểu mẫu</InputLabel>
          <Select
            labelId="dynamic-export-form-label"
            value={selectedFormCodes[0] || ""}
            label="Biểu mẫu"
            onChange={handleFormSelectionChange}
          >
            {multiFormOptions.map((form) => (
              <MenuItem key={form.code} value={form.code}>
                {form.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel id="dynamic-export-format-label">Định dạng file</InputLabel>
          <Select
            labelId="dynamic-export-format-label"
            value={exportFormat}
            label="Định dạng file"
            onChange={handleExportFormatChange}
          >
            <MenuItem value="docx">DOCX</MenuItem>
            <MenuItem value="pdf">PDF</MenuItem>
            <MenuItem value="excel">EXCEL</MenuItem>
          </Select>
        </FormControl>
      </div>
    </CustomDialog>
  );
};

export default DynamicExportDialog;
