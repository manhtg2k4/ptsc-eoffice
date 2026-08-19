
import React, { memo, useCallback, useMemo, useRef, useState } from "react";
import { APP_BASE } from "@EnvironmentFile/constants/urlConfig";
import * as XLSX from "xlsx";

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
import CustomDialog from "@components/CustomDialog/CustomDialog";
import TableHeaderImport from "@pages/ImportPage/TableHeaderImport";
import TableBodyImport from "@pages/ImportPage/TableBodyImport";
import { useSelector } from "react-redux";
import axiosInstance from "@utils/axiosInstance";
import { useToast } from "@components/common/ToastProvider";
import LoadingDialog from "@components/LoadingDialog";
import { SkyTableBody } from "@styles/SkyStyles";
import { Description } from "@mui/icons-material";
import Swipper from "@components/Swipper";
import { getExampleFileByKey } from "@services/ExampleFile";




const STEP_COUNT = 3;

const STEPS = [
  {
    label: "Bước 1: Tải về file dưới đây sau đó thêm / cập nhật dữ liệu của bạn",
    description: "Bạn click vào nút dưới đây để tải file Excel mẫu xuống",
  },
  {
    label: "Bước 2: Tải lên các tập tin từ bước 1 để hoàn thành cập nhật bổ sung dữ liệu của bạn",
    description: "Vui lòng chọn file định dạng .xlsx .xls để tiếp tục bước tiếp theo",
  },
  {
    label: "Bước 3: Hiển kết quả tải tệp excel ở bước 2, lọc danh sách cần thêm và thực hiện tải",
    description: "",
  },
];

// Build column map động từ viewConfig fields
const buildColumnMap = (fields = []) => {
  const map = {};
  fields.forEach(({ label, name }) => {
    if (!label || !name) return;
    const trimmed = label.trim();
    map[trimmed] = name;
    map[trimmed + "*"] = name;
    map[trimmed.replace(/\*$/, "").trim()] = name;
  });
  return map;
};

// Parse file Excel, dùng columnMap để map header → field name
const parseExcelFile = (file, columnMap) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const rawRows = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: "",
        });

        const HEADER_ROW_INDEX = 2;

        if (!rawRows || rawRows.length <= HEADER_ROW_INDEX) {
          resolve([]);
          return;
        }

        const headers = rawRows[HEADER_ROW_INDEX];
        const dataRows = rawRows.slice(HEADER_ROW_INDEX + 1);

        const mapped = dataRows
          .filter((row) => row.some((cell) => cell !== ""))
          .map((row) => {
            const obj = {};
            headers.forEach((header, colIndex) => {
              const trimmedHeader = String(header).trim();
              const key = columnMap[trimmedHeader] || trimmedHeader;
              obj[key] = row[colIndex] !== undefined ? String(row[colIndex]) : "";
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

const ImportPage = (props) => {
  const { open, onClose, setReloadData } = props;
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

  const { dataViewConfig } = useSelector((state) => state.viewConfig);
  const viewConfig = useMemo(() => {
    if (!dataViewConfig) return null;
    return dataViewConfig.find((c) => c.code === "importProject");
  }, [dataViewConfig]);

  const importColumns = useMemo(() => viewConfig?.field || [], [viewConfig]);
  const columnMap = useMemo(() => buildColumnMap(importColumns), [importColumns]);

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const fileExample = await getExampleFileByKey('IMPORT_PROJECT_TEMPLATE');
      const urlTemplateFile = `${APP_BASE}/api/files/download/${fileExample?.id}?public=true`;
      const response = await axiosInstance.get(`${urlTemplateFile}`, {
        responseType: "blob",
      });

      const blob = response instanceof Blob ? response : new Blob([response], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "template_import_du_an_cong_viec.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast("Tải file biểu mẫu thành công!", "success");
    } catch (error) {
      toast(error?.response?.data?.message || "Tải file biểu mẫu thất bại!", "error");
    }
  }, [toast]);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const isValidExtension = ['xlsx', 'xls', 'csv'].includes(fileExtension);

    if (!isValidExtension) {
      setErrorList([{ row: "-", message: "Vui lòng chọn file có định dạng .xlsx, .xls hoặc .csv" }]);
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
      } catch {
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

  // Handler cập nhật giá trị từng cell trong bảng
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
      // Lấy data từ DOM (theo cách B - giống temple.js)
      const rows = [...document.querySelectorAll('.tbl_Value')];

      const selectedRows = rows
        .filter((row) => {
          const checkbox = row.querySelector("input[type='checkbox']");
          return checkbox && checkbox.checked;
        })
        .map((row) => {
          const rowData = {};
          const inputs = row.querySelectorAll("td input[type='text']");
          const values = Array.from(inputs).map(input => input.value);

          values.forEach((value, index) => {
            if (importColumns[index]) {
              rowData[importColumns[index].name] = value;
            }
          });

          return rowData;
        });

      const requestBody = { data: selectedRows };
      logger.log("Request body for import:", requestBody);

      const response = await axiosInstance.post(
        `${APP_BASE}/api/tasks/import-project-task-excel`,
        requestBody,

      );

      const result = response?.data || response;

      // API trả valid: false → có lỗi validate
      if (result?.valid === false) {
        setErrorList(result.errors || [{ row: "-", message: "Dữ liệu không hợp lệ" }]);
        setOpenErrorDialog(true);
        return;
      }

      // valid: true → import thành công
      toast('Import thành công!', 'success');
      setSelectedFile(null);
      setImportRows([]);
      setCheckedRows({});
      setActiveStep(1);
      setReloadData(new Date().getTime());

    } catch (error) {
      // Server trả 4xx/5xx
      const errData = error.response?.data;
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
  }, [selectedFile, toast, importColumns]);

  const handleOpenErrorDialog = useCallback(() => setOpenErrorDialog(true), []);
  const handleCloseErrorDialog = useCallback(() => setOpenErrorDialog(false), []);

  const renderStep1Content = () => (
    <ImportStepContent>

      <StepDescription>{STEPS[0].description}</StepDescription>
      <DownloadTemplateButton startIcon={<Description />} onClick={handleDownloadTemplate}>
        Tải xuống file excel mẫu
      </DownloadTemplateButton>
      <ButtonRowWrapper>
        <BackButton onClick={closeDialogImport}>Trở lại</BackButton>
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
        <ChooseFileButton htmlFor="import-file-input">Chọn tập tin</ChooseFileButton>
        <HiddenFileInput
          id="import-file-input"
          type="file"
          accept=".xlsx,.xls"
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

  const closeDialogImport = useCallback(() => {
    if (onClose) {
      onClose();
    }
    setSelectedFile(null);
    setImportRows([]);
  }, [setSelectedFile, setImportRows, onClose]);


  return (
    <Swipper
      title="Import dự án"
      open={open}
      onClose={closeDialogImport}>
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
        <LoadingDialog open={isImporting} >
          Đang tải dữ liệu, vui lòng đợi...
        </LoadingDialog>
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
              <SkyTableBody>  {/* ← đang thiếu cái này */}
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

export default memo(ImportPage);