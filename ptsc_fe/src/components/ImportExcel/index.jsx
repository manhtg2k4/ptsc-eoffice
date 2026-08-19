import React, { useState, useRef, useCallback, useMemo } from "react";

import * as XLSX from "xlsx";
import api from "@services/api";
import axiosInstance from "@utils/axiosInstance";
import { getExampleFileByKey } from "@services/ExampleFile";
import { APP_BASE } from "@EnvironmentFile/constants/urlConfig";
import { useToast } from "@components/common/ToastProvider";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { SkyTableBody } from "@styles/SkyStyles";
import LoadingDialog from "@components/LoadingDialog";
import Swipper from "@components/Swipper";

import TableHeaderImport from "@pages/ImportPage/TableHeaderImport";
import TableBodyImport from "@pages/ImportPage/TableBodyImport";
import DescriptionIcon from "@mui/icons-material/Description";

// Import standard step styles from ImportPage styles
import {
  ImportPageWrapper,
  ImportStepCard,
  ImportStepWrapper,
  ImportStepRow,
  ImportStepHeader,
  ImportStepContent,
  StepConnectorLine,
  StepBadge,
  StepTitle,
  StepDescription,
  DownloadTemplateButton,
  BackButton,
  NextButton,
  ImportButton,
  ViewErrorButton,
  ButtonRowWrapper,
  FileInputWrapper,
  FileNameDisplay,
  ChooseFileButton,
  HiddenFileInput,
  ImportTableContainer,
  ImportTable,
  ErrorTableContainer,
  ErrorTable,
  ErrorTableHead,
  ErrorTableRow,
  ErrorHeaderCell,
  ErrorTableCell,
} from "@styles/ImportPage/ImportPage.styles";

const STEP_COUNT = 3;

const STEPS = [
  {
    label: "Bước 1: Tải về file dưới đây sau đó thêm / cập nhật dữ liệu của bạn",
    description: "Bạn click vào nút dưới đây để tải file Excel mẫu xuống",
  },
  {
    label: "Bước 2: Tải lên các tập tin từ bước 1 để hoàn thành cập nhật bổ sung dữ liệu của bạn",
    description: "Vui lòng chọn file định dạng .xlsx để tiếp tục bước tiếp theo",
  },
  {
    label: "Bước 3: Hiển kết quả tải tệp excel ở bước 2, lọc danh sách cần thêm và thực hiện tải",
    description: "",
  },
];

// Build column map động từ fields (hỗ trợ chữ thường và các aliases)
const buildColumnMap = (fields = []) => {
  const map = {};
  fields.forEach(({ label, name, aliases = [] }) => {
    if (!label || !name) return;
    const allLabels = [label, ...aliases];
    allLabels.forEach(lbl => {
      const trimmed = lbl.trim().toLowerCase();
      map[trimmed] = name;
      map[trimmed + "*"] = name;
      map[trimmed + " *"] = name;
      map[trimmed.replace(/\*$/, "").trim()] = name;
    });
  });
  return map;
};

// Chuyển Excel Date object thành dd/mm/yyyy hoặc dd/mm/yyyy HH:mm
// Nhận diện định dạng tệp (isXls) để dùng đúng hàm UTC (cho XLSX) hoặc Local (cho XLS)
const formatCellValue = (value) => {
  if (value instanceof Date) {
    // Làm tròn đến phút gần nhất để loại bỏ sai số dấu phẩy động
    const roundedDate = new Date(Math.round(value.getTime() / 60000) * 60000);

    // Luôn sử dụng Local Time để hiển thị đúng ngày giờ của file Excel trên máy người dùng
    const hours = roundedDate.getHours();
    const minutes = roundedDate.getMinutes();
    const d = String(roundedDate.getDate()).padStart(2, '0');
    const m = String(roundedDate.getMonth() + 1).padStart(2, '0');
    const y = roundedDate.getFullYear();
    
    if (hours === 0 && minutes === 0) {
      return `${d}/${m}/${y}`;
    } else {
      const H = String(hours).padStart(2, '0');
      const M = String(minutes).padStart(2, '0');
      return `${d}/${m}/${y} ${H}:${M}`;
    }
  }
  return value !== undefined && value !== null ? String(value) : '';
};

// Parse file Excel, dùng columnMap để map header → field name
const parseExcelFile = (file, columnMap) =>
  new Promise((resolve, reject) => {

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const rawRows = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: "",
        });

        if (!rawRows || rawRows.length === 0) {
          resolve([]);
          return;
        }

        // Tự động tìm dòng header phù hợp nhất
        let headerRowIndex = 0;
        let maxMatches = 0;
        const scanLimit = Math.min(rawRows.length, 10);
        for (let i = 0; i < scanLimit; i++) {
          const row = rawRows[i];
          if (!row || !Array.isArray(row)) continue;
          let matches = 0;
          row.forEach((cell) => {
            const trimmed = String(cell || "").trim().toLowerCase();
            if (columnMap[trimmed] || columnMap[trimmed.replace(/\*$/, "").trim()]) {
              matches++;
            }
          });
          if (matches > maxMatches) {
            maxMatches = matches;
            headerRowIndex = i;
          }
        }

        const headers = rawRows[headerRowIndex];
        const dataRows = rawRows.slice(headerRowIndex + 1);

        const mapped = dataRows
          .filter((row) => row.some((cell) => cell !== ""))
          .map((row) => {
            const obj = {};
            headers.forEach((header, colIndex) => {
              if (!header) return;
              const trimmedHeader = String(header).trim().toLowerCase();
              const key = columnMap[trimmedHeader] || columnMap[trimmedHeader.replace(/\*$/, "").trim()] || header;
              obj[key] = row[colIndex] !== undefined ? formatCellValue(row[colIndex]) : "";
            });
            return obj;
          });

        resolve(mapped);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });


const ImportExcel = ({
  open,
  onClose,
  endpoint,
  title,
  templateKey,
  setReloadData,
  customColumns,
  isClientSide,
  onImportSuccess,
}) => {
  const [activeStep, setActiveStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importRows, setImportRows] = useState([]);
  const [checkedRows, setCheckedRows] = useState({});
  const [errorList, setErrorList] = useState([]);
  const [openErrorDialog, setOpenErrorDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef(null);
  const toast = useToast();

  const importColumns = useMemo(() => {
    if (Array.isArray(customColumns) && customColumns.length > 0) {
      return customColumns;
    }
    if (templateKey === "IMPORT_LEADERSHIP_DUTY_ROSTER_TEMPLATE") {
      return [
        { label: "Tiêu đề lịch", name: "title", required: true, aliases: ["tiêu đề lịch *", "tiêu đề", "tiêu đề lịch trực"] },
        { label: "Năm", name: "year", required: true, aliases: ["năm *"] },
        { label: "Tuần", name: "week", required: true, aliases: ["tuần *"] },
        { label: "Ngày trực", name: "dutyDate", required: true, aliases: ["ngày trực *", "ngày"] },
        { label: "Tên lãnh đạo trực", name: "leader", required: true, aliases: ["tên lãnh đạo trực *", "lãnh đạo trực", "lãnh đạo"] },
        { label: "Ghi chú", name: "notes", required: false }
      ];
    }
    else if (templateKey === "template_import_hslt") {
      return [
        { label: "STT", name: "stt", required: true, aliases: ["stt", "stt *", "số thứ tự", "số thứ tự *"] },
        { label: "Năm", name: "formationYear", required: true, aliases: ["năm", "năm *"] },
        { label: "Đề mục", name: "folderTitle", required: true, aliases: ["đề mục", "đề mục *", "tiêu đề mục hồ sơ", "tiêu đề mục hồ sơ *"] },
        { label: "Số và ký hiệu phòng", name: "relatedDepartment", required: true, aliases: ["số và ký hiệu phòng", "số và ký hiệu phòng *", "ký hiệu phòng"] },
        { label: "Hồ sơ phòng", name: "fileTitle", required: true, aliases: ["hồ sơ phòng", "hồ sơ phòng *", "tên hồ sơ phòng", "tên hồ sơ phòng *"] },
        { label: "Số và ký hiệu hồ sơ", name: "fileCode", required: true, aliases: ["số và ký hiệu hồ sơ", "số và ký hiệu hồ sơ *", "ký hiệu hồ sơ", "ký hiệu hồ sơ *"] },
        { label: "Tiêu đề hồ sơ", name: "title", required: true, aliases: ["tiêu đề hồ sơ", "tiêu đề hồ sơ *", "tên hồ sơ", "tên hồ sơ *"] },
        { label: "Thời hạn bảo quản", name: "retentionPeriod", required: true, aliases: ["thời hạn bảo quản", "thời hạn bảo quản *", "thời gian bảo quản"] },
      ];
    }
    else if (templateKey === "template_import_doanvao") {
      return [
        { label: "Họ và tên", name: "hoTen", required: true, aliases: ["họ và tên *", "họ tên", "họ và tên", "họ tên *"] },
        { label: "Vai trò/Chức vụ", name: "vaiTro", required: false, aliases: ["vai trò", "chức vụ", "chức danh", "vai trò/chức vụ"] },
        { label: "Quốc tịch", name: "nationality", required: false, aliases: ["quốc tịch", "quốc tịch *"] },
        { label: "Số CCCD/Hộ chiếu", name: "identityCard", required: false, aliases: ["số cccd/hộ chiếu", "số hộ chiếu", "số cccd", "cmnd/cccd", "số giấy tờ"] }
      ];
    }
    else {
      // Default / IMPORT_TRAVEL_WORK_TEMPLATE
      return [
        { label: "Mã lịch công tác", name: "code", required: true, aliases: ["mã lịch công tác *", "mã lịch", "mã lịch công tác"] },
        { label: "Lãnh đạo công tác", name: "leader", required: true, aliases: ["lãnh đạo công tác *", "lãnh đạo", "mã lãnh đạo"] },
        { label: "Loại công tác", name: "scheduleType", required: true, aliases: ["loại công tác *", "loại lịch trình"] },
        { label: "Công tác ngày", name: "workDate", required: false, aliases: ["công tác ngày *", "ngày"] },
        { label: "Công tác từ ngày", name: "fromDate", required: false, aliases: ["công tác từ ngày *", "từ ngày"] },
        { label: "Đến ngày", name: "toDate", required: false, aliases: ["đến ngày *"] },
        { label: "Lịch trình công tác", name: "travelSchedule", required: false, aliases: ["lịch trình công tác *", "lịch trình"] },
        { label: "Stt lịch trình", name: "subStt", required: false, aliases: ["stt lịch trình"] },
        { label: "Số ngày lịch trình", name: "subNumDays", required: false, aliases: ["số ngày lịch trình *"] },
        { label: "Hình thức lịch trình", name: "subFormat", required: false, aliases: ["hình thức lịch trình *", "hình thức", "hình thức lịch"] },
        { label: "Ngày lịch trình", name: "subDate", required: false, aliases: ["ngày lịch trình *"] },
        { label: "Từ ngày lịch trình", name: "subFromDate", required: false, aliases: ["từ ngày lịch trình *"] },
        { label: "Đến ngày lịch trình", name: "subToDate", required: false, aliases: ["đến ngày lịch trình *"] },
        { label: "Địa điểm cả ngày/nhiều ngày", name: "location", required: false, aliases: ["địa điểm cả ngày/nhiều ngày"] },
        { label: "Nội dung cả ngày/nhiều ngày", name: "content", required: false, aliases: ["nội dung cả ngày/nhiều ngày"] },
        { label: "Địa điểm buổi sáng", name: "morningLocation", required: false, aliases: ["địa điểm buổi sáng", "địa điểm sáng"] },
        { label: "Nội dung buổi sáng", name: "morningContent", required: false, aliases: ["nội dung buổi sáng", "nội dung sáng"] },
        { label: "Địa điểm buổi chiều", name: "afternoonLocation", required: false, aliases: ["địa điểm buổi chiều", "địa điểm chiều"] },
        { label: "Nội dung buổi chiều", name: "afternoonContent", required: false, aliases: ["nội dung buổi chiều", "nội dung chiều"] }
      ];
    }
  }, [customColumns, templateKey]);

  const columnMap = useMemo(() => buildColumnMap(importColumns), [importColumns]);

  const handleDownloadTemplate = useCallback(async () => {
    if (templateKey) {
      try {
        const fileExample = await getExampleFileByKey(templateKey);
        if (fileExample && fileExample.id) {
          const urlTemplateFile = `${APP_BASE}/api/files/download/${fileExample.id}?public=true`;
          const response = await axiosInstance.get(`${urlTemplateFile}`, {
            responseType: "blob",
          });

          const blob = response instanceof Blob ? response : new Blob([response], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          });
          const downloadUrl = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = downloadUrl;
          const fileName = fileExample.file_name;
          link.download = fileName;

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(downloadUrl);
          toast("Tải file biểu mẫu thành công!", "success");
          return;
        }
      } catch (error) {
        // Fallback sang tự động sinh file client-side bên dưới nếu gọi API gặp lỗi
      }
    }

    if (importColumns && importColumns.length > 0) {
      try {
        const headers = importColumns.map((col) => col.label + (col.required ? " *" : ""));
        const worksheet = XLSX.utils.aoa_to_sheet([headers]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
        XLSX.writeFile(workbook, `${title || "File_Mau"}.xlsx`);
        toast("Tải file biểu mẫu thành công!", "success");
      } catch (err) {
        toast("Tải file biểu mẫu thất bại!", "error");
      }
    } else {
      toast("Không tìm thấy file biểu mẫu cấu hình trên hệ thống", "error");
    }
  }, [templateKey, importColumns, title, toast]);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (fileExtension !== 'xlsx') {
      setErrorList([{ row: "-", message: "Vui lòng chọn file Excel định dạng .xlsx" }]);
      setOpenErrorDialog(true);
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrorList([{ row: "-", message: "File không được vượt quá 10MB" }]);
      setOpenErrorDialog(true);
      return;
    }

    setSelectedFile(file);
    setImportRows([]);
    setCheckedRows({});
    setErrorList([]);
  }, []);

  const handleNextStep = useCallback(async () => {
    if (activeStep === 2 && selectedFile) {
      setIsParsing(true);
      try {
        const rows = await parseExcelFile(selectedFile, columnMap);
        const initChecked = {};
        rows.forEach((_, i) => { initChecked[i] = true; });
        setImportRows(rows);
        setCheckedRows(initChecked);
        setActiveStep((prev) => Math.min(prev + 1, STEP_COUNT));
      } catch (err) {
        setErrorList([{ row: "-", message: "Không thể đọc file Excel. Vui lòng kiểm tra lại định dạng file." }]);
        setOpenErrorDialog(true);
      } finally {
        setIsParsing(false);
      }
    } else {
      setActiveStep((prev) => Math.min(prev + 1, STEP_COUNT));
    }
  }, [activeStep, selectedFile, columnMap]);

  const handleBackStep = useCallback(() => {
    setActiveStep((prev) => Math.max(prev - 1, 1));
  }, []);

  const handleToggleRow = useCallback((index) => {
    setCheckedRows((prev) => ({ ...prev, [index]: !prev[index] }));
  }, []);

  const handleCheckAll = useCallback(
    (checked) => {
      const next = {};
      importRows.forEach((_, i) => { next[i] = checked; });
      setCheckedRows(next);
    },
    [importRows]
  );

  const handleChangeRow = useCallback((rowIndex, fieldName, value) => {
    setImportRows((prev) => {
      const updated = [...prev];
      updated[rowIndex] = { ...updated[rowIndex], [fieldName]: value };
      return updated;
    });
  }, []);

  const allChecked =
    importRows.length > 0 && importRows.every((_, i) => !!checkedRows[i]);

  const handleImport = useCallback(async () => {
    if (!selectedFile) {
      setErrorList([{ row: "-", message: "Vui lòng chọn file trước khi import" }]);
      setOpenErrorDialog(true);
      return;
    }

    setIsImporting(true);
    try {
      // Đọc trực tiếp các hàng được checked từ giao diện DOM (tương ứng với các class và tr .tbl_Value)
      const rowsElements = [...document.querySelectorAll('.tbl_Value')];

      const selectedRows = rowsElements
        .filter((rowEl) => {
          const checkbox = rowEl.querySelector("input[type='checkbox']");
          return checkbox && checkbox.checked;
        })
        .map((rowEl) => {
          const rowData = {};
          const inputs = rowEl.querySelectorAll("td input[type='text']");
          const values = Array.from(inputs).map(input => input.value);

          values.forEach((value, index) => {
            if (importColumns[index]) {
              rowData[importColumns[index].name] = value;
            }
          });

          return rowData;
        });

      if (selectedRows.length === 0) {
        setErrorList([{ row: "-", message: "Vui lòng chọn ít nhất 1 dòng để import" }]);
        setOpenErrorDialog(true);
        return;
      }

      if (isClientSide || (!endpoint && onImportSuccess)) {
        if (onImportSuccess) {
          onImportSuccess(selectedRows);
        }
        toast('Import thành công!', 'success');
        setSelectedFile(null);
        setImportRows([]);
        setCheckedRows({});
        setActiveStep(1);
        onClose();
        return;
      }

      const requestBody = { data: selectedRows };

      const response = await api.post(endpoint, requestBody);
      const result = response?.data || response;

      if (result?.valid === false || result?.success === false) {
        setErrorList(result.errors || [{ row: "-", message: result.message || "Dữ liệu không hợp lệ" }]);
        setOpenErrorDialog(true);
        return;
      }

      toast('Import thành công!', 'success');
      setSelectedFile(null);
      setImportRows([]);
      setCheckedRows({});
      setActiveStep(1);
      if (setReloadData) {
        setReloadData(new Date().getTime());
      }
      onClose();
    } catch (error) {
      const errData = error.response?.data || error;
      if (errData?.errors?.length > 0) {
        setErrorList(errData.errors);
        setOpenErrorDialog(true);
      } else {
        setErrorList([{
          row: "-",
          message: errData?.message || error.message || 'Đã xảy ra lỗi khi import'
        }]);
        setOpenErrorDialog(true);
      }
    } finally {
      setIsImporting(false);
    }
  }, [selectedFile, isClientSide, endpoint, onImportSuccess, importColumns, toast, setReloadData, onClose]);

  const handleCloseDialog = useCallback(() => {
    setSelectedFile(null);
    setImportRows([]);
    setCheckedRows({});
    setErrorList([]);
    setActiveStep(1);
    onClose();
  }, [onClose]);

  const handleOpenErrorDialog = useCallback(() => {
    setOpenErrorDialog(true);
  }, []);

  const handleCloseErrorDialog = useCallback(() => {
    setOpenErrorDialog(false);
  }, []);

  const renderStep1Content = () => (
    <ImportStepContent>
      <StepDescription>{STEPS[0].description}</StepDescription>
      {(templateKey || (customColumns && customColumns.length > 0)) && (
        <DownloadTemplateButton startIcon={<DescriptionIcon />} onClick={handleDownloadTemplate}>
          Tải xuống file excel mẫu
        </DownloadTemplateButton>
      )}
      <ButtonRowWrapper>
        <BackButton onClick={handleCloseDialog}>Trở lại</BackButton>
        <NextButton onClick={handleNextStep}>Tiếp theo</NextButton>
      </ButtonRowWrapper>
    </ImportStepContent>
  );

  const renderStep2Content = () => (
    <ImportStepContent>
      <StepDescription>{STEPS[1].description}</StepDescription>
      <FileInputWrapper>
        <FileNameDisplay>
          {selectedFile ? selectedFile.name : "Chưa chọn file"}
        </FileNameDisplay>
        <ChooseFileButton htmlFor="excel-import-file-input">Chọn tập tin</ChooseFileButton>
        <HiddenFileInput
          id="excel-import-file-input"
          type="file"
          accept=".xlsx"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
      </FileInputWrapper>
      <ButtonRowWrapper>
        <BackButton onClick={handleBackStep}>Trở lại</BackButton>
        <NextButton disabled={!selectedFile || isParsing} onClick={handleNextStep}>
          {isParsing ? "Đang đọc file..." : "Tiếp theo"}
        </NextButton>
      </ButtonRowWrapper>
    </ImportStepContent>
  );

  const renderStep3Content = () => (
    <ImportStepContent>
      <ImportTableContainer>
        <ImportTable stickyHeader>
          <TableHeaderImport
            columns={importColumns}
            allChecked={allChecked}
            onCheckAll={handleCheckAll}
          />
          <TableBodyImport
            columns={importColumns}
            rows={importRows}
            checkedRows={checkedRows}
            onToggleRow={handleToggleRow}
            onChangeRow={handleChangeRow}
          />
        </ImportTable>
      </ImportTableContainer>
      <ButtonRowWrapper>
        <BackButton onClick={handleBackStep}>Trở lại</BackButton>
        <ImportButton onClick={handleImport} disabled={isImporting}>
          Tiến hành import
        </ImportButton>
        {errorList.length > 0 && (
          <ViewErrorButton onClick={handleOpenErrorDialog}>Xem lại lỗi</ViewErrorButton>
        )}
      </ButtonRowWrapper>
    </ImportStepContent>
  );

  return (
    <Swipper
      title={title}
      open={open}
      onClose={handleCloseDialog}
    >
      <ImportPageWrapper>
        <ImportStepCard>
          <ImportStepWrapper>
            {Array.from({ length: STEP_COUNT }).map((_, index) => {
              const stepNumber = index + 1;
              const isActive = activeStep === stepNumber;
              return (
                <ImportStepRow key={stepNumber}>
                  <ImportStepHeader>
                    <StepBadge isActive={isActive}>{stepNumber}</StepBadge>
                    <StepTitle isActive={isActive}>{STEPS[index].label}</StepTitle>
                  </ImportStepHeader>
                  {isActive && (
                    <>
                      {stepNumber === 1 && renderStep1Content()}
                      {stepNumber === 2 && renderStep2Content()}
                      {stepNumber === 3 && renderStep3Content()}
                    </>
                  )}
                  {stepNumber < STEP_COUNT && <StepConnectorLine />}
                </ImportStepRow>
              );
            })}
          </ImportStepWrapper>
        </ImportStepCard>
        
        <LoadingDialog open={isImporting}>
          Đang tải dữ liệu, vui lòng đợi...
        </LoadingDialog>

        {/* Lỗi hiển thị Dialog giống ImportPage */}
        <CustomDialog
          open={openErrorDialog}
          onClose={handleCloseErrorDialog}
          title="Lỗi import từ file Excel"
          size="md"
          disableSave
          cancelButtonText="Đóng"
        >
          <ErrorTableContainer>
            <ErrorTable>
              <ErrorTableHead>
                <ErrorTableRow>
                  <ErrorHeaderCell>Dòng</ErrorHeaderCell>
                  <ErrorHeaderCell>Lỗi</ErrorHeaderCell>
                </ErrorTableRow>
              </ErrorTableHead>
              <SkyTableBody>
                {errorList.map((err) => (
                  <ErrorTableRow key={`${err.row}-${err.message}`}>
                    <ErrorTableCell>{err.row}</ErrorTableCell>
                    <ErrorTableCell>{err.message}</ErrorTableCell>
                  </ErrorTableRow>
                ))}
              </SkyTableBody>
            </ErrorTable>
          </ErrorTableContainer>
        </CustomDialog>
      </ImportPageWrapper>
    </Swipper>
  );
};

export default ImportExcel;
