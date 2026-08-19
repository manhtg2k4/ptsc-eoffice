import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  // Typography,
  Tooltip,
  Grid,
  // FormHelperText,
} from "@mui/material";
import {
  StyledPaper,
  StyledDebouncedInput,
  TitleTypography,
  UploadIconButton,
  UploadIcon,
  FileListGrid,
  AttachmentIcon,
  FileNameTypography,
  SignStatusTypography,
  ActionIcon,
  PrimaryActionIcon,
  DownloadActionIcon,
  PreviewActionIcon,
  DeleteActionIcon,
  PreviewDialog,
  PreviewBox,
  StyledFormHelperText,
  ActionGrid,
  ActionTypography,
  ActionGridCenter,
  ActionBox,
} from "./FileUpload.styles";
import {
  API_DOC_TO_PDF,
  API_GETDETAIL_FILE,
  API_GET_FILE,
  API_GET_LIST_PARAMETER_SYSTEM_MANAGERMANT,
  API_SIGN_BY_ID,
  // API_SINGED,
} from "@EnvironmentFile/constants/urlConfig";
 
import PropTypes from "prop-types";
import { useToast } from "@components/common/ToastProvider";
// import { setIsFormHasSignture } from "@redux/slices/FormDesign/formDesignSlice";
// import { useDispatch, useSelector } from "react-redux";
import { useFormContext } from "react-hook-form";
import api, { callApi } from "@services/api";

// ✅ Convert DOC to PDF using external API
export const convertDocToPdf = async (file) => {
  logger.log("🚀 ~ convertDocToPdf ~ file:", file)
  const formData = new FormData();
  formData.append("file", file);

  try {
    // Gọi đúng cú pháp: method, url, data, config
    const response = await callApi(
      "post",
      API_DOC_TO_PDF,
      formData,
      { responseType: "blob" }
    );

    // response là blob PDF trả về từ server
    const pdfBlob = new Blob([response], { type: "application/pdf" });
    return URL.createObjectURL(pdfBlob);
  } catch (error) {
    logger.error("Error converting DOC to PDF:", error);
    throw new Error("Không thể chuyển đổi DOC sang PDF.");
  }
};
const FileUpload = ({
  onChange,
  value,
  disabled,
  item,
  mode,
  onPropChange,
  required,
  // error,
  // helperText,
  // setError,
  // clearErrors
}) => {
  logger.log("🚀 ~ FileUpload ~ item:", item)
  const { allowSign } = item.props;
  logger.log("🚀 ~ FileUpload ~ allowSign:", allowSign)
  const [open, setOpen] = useState(false);

  // const { setError, clearErrors, formState: { errors, isDirty } } = useFormContext() || {};
  const { setError, clearErrors, formState: { errors } } = useFormContext() || {};
  const fieldName = item?.props?.field;
  const fieldError = fieldName ? errors?.[fieldName] : null;
  const error = !!fieldError;
  const helperText = fieldError?.value?.message || fieldError?.message || "";

  const [fileDocument, setFileDocument] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [fileList, setFileList] = useState([]);
  const [signStatus, setSignStatus] = useState("Chưa ký số");
  const toast = useToast();
  const [uploadConfig, setUploadConfig] = useState({
    maxSize: 20, // Giá trị mặc định
    extensions: ".doc,.docx,.pdf,.jpg,.jpeg,.png", // Có thể mở rộng sau này
  });

  // Lấy cấu hình dung lượng upload từ API
  useEffect(() => {
    const fetchUploadConfig = async () => {
      try {
        const response = await callApi("get", API_GET_LIST_PARAMETER_SYSTEM_MANAGERMANT);
        const fileConfig = response.data?.data?.find(item => item.type === 'file');
        if (fileConfig && fileConfig.value) {
          setUploadConfig(prev => ({ ...prev, maxSize: Number(fileConfig.value) }));
        }
      } catch (error) {
        logger.error("Lỗi khi lấy cấu hình upload:", error);
      }
    };
    fetchUploadConfig();
  }, []);

  // ✅ Fetch file from API and handle DOC to PDF if needed
  const fetchFile = useCallback(async () => {
    if (!value || value instanceof File) return;

    try {
      const response = await api.get(`${API_GETDETAIL_FILE}/${value}`, {
        headers: { Accept: "application/json" },
      });

      const fileData = response.data?.data;
      setFileDocument(fileData);

      if (fileData?._id) {
        const url = `${API_GET_FILE}/${fileData._id}`;

        const res = await api.get(url, { responseType: "blob" });
        const blob = res.data;
        const file = new File([blob], fileData.name || "file", {
          type: blob.type,
        });

        let preview;
        const extension = file.name.split(".").pop().toLowerCase();

        if (extension === "doc" || extension === "docx") {
          preview = await convertDocToPdf(file);
        } else {
          preview = URL.createObjectURL(file);
        }

        const newFile = {
          ...fileData,
          previewUrl: preview,
          originalFile: file,
        };

        setPreviewUrl(preview);
        setFileList([newFile]);
      }
    } catch (error) {
      logger.error("Error fetching file:", error);
    }
  }, [value]);

  useEffect(() => {
    fetchFile();
  }, [fetchFile, value]);

  useEffect(() => {
    if (allowSign) {
      if (fileDocument?.isSigned || !value) {
        setSignStatus("Đã ký số");
        clearErrors?.(fieldName);
      } else {
        setError?.(fieldName, {
          type: 'manual',
          message: 'Chưa ký số'
        })
        setSignStatus("Chưa ký số");
      }
    }
  }, [fileDocument, allowSign, clearErrors, setError, fieldName, value]);

  // ✅ Handle file input (upload)
  const handleFileChange = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const fileSizeInMB = file.size / 1024 / 1024;
        if (fileSizeInMB > uploadConfig.maxSize) {
          toast(`Kích thước tệp không được vượt quá ${uploadConfig.maxSize}MB.`, "error");
          e.target.value = null;
          return;
        }

        try {
          const extension = file.name.split(".").pop().toLowerCase();
          let preview;

          if (extension === "doc" || extension === "docx") {
            // logger.log("🚀 ~ FileUpload ~ file:", file)
            preview = await convertDocToPdf(file);
          } else {
            preview = URL.createObjectURL(file);
          }

          onChange?.(file);

          const newFile = {
            _id: Date.now(),
            name: file.name,
            previewUrl: preview,
            originalFile: file,
          };

          setFileDocument(newFile);
          setFileList([newFile]);
          setPreviewUrl(preview);
        } catch (err) {
          if (allowSign) {
            setError?.(fieldName, {
              type: 'manual',
              message: 'Chưa ký số'
            })
            setSignStatus("Chưa ký số");
          }
          toast("Không thể xử lý tệp DOC.", "error");
          logger.error(err);
        }
      }
    },
    [onChange, toast, uploadConfig, allowSign, fieldName, setError, setSignStatus]
  );

  const handleOpenPreview = (id) => {
    const f = fileList.find((f) => f._id === id);
    if (f) {
      setPreviewUrl(f.previewUrl);
      setOpen(true);
    }
  };

  const handleDeleteFile = (id) => {
    setFileList((prev) => prev.filter((f) => f._id !== id));
    setFileDocument(null);
    if (allowSign) {
      setError?.(item?.props?.field, {
        type: 'manual',
        message: 'Chưa ký số'
      })
      setSignStatus("Chưa ký số");
    }
    onChange?.(null);
  };

  const handleDownloadFile = (fileToDownload) => {
    if (!fileToDownload) return;

    let downloadUrl = "";
    // Giải mã tên tệp để xử lý đúng các ký tự đặc biệt (VD: tiếng Việt có dấu)
    // Có thể tên tệp đã được mã hóa ở đâu đó trước khi đến đây.
    // decodeURIComponent sẽ đảm bảo chúng ta có chuỗi gốc.
    const fileName = fileToDownload.name
      ? decodeURIComponent(fileToDownload.name)
      : "download";

    if (fileToDownload._id && typeof fileToDownload._id === "string") {
      downloadUrl = `${API_GET_FILE}/${fileToDownload._id}`;
    } else if (
      fileToDownload.previewUrl &&
      fileToDownload.previewUrl.startsWith("blob:")
    ) {
      downloadUrl = fileToDownload.previewUrl;
    }

    if (downloadUrl) {
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = fileName;
      a.click();
    }
  };

  const handleSignFile = async (fileToSign) => {
    logger.log("🚀 ~ Bắt đầu ký file:", fileToSign);
    if (!fileToSign || !fileToSign._id) {
      logger.error("Không có file hoặc file ID để ký.");
      return;
    }

    // Giả sử API_SIGN_BY_ID là '/api/pdf/sign-existing'
    // const API_SIGN_BY_ID = '/api/pdf/sign-existing';

    try {
      // Truyền ID trong một object JSON, đúng với yêu cầu của backend
      const response = await callApi('post', API_SIGN_BY_ID, { id: fileToSign._id });
      logger.log("✅ ~ Ký file thành công:", response);

      // Cập nhật trạng thái trên UI sau khi ký thành công
      if (response.success) {
        if (allowSign) {
          setSignStatus("Đã ký số");
        }
        // Cập nhật lại fileDocument để đồng bộ trạng thái isSigned
        setFileDocument(prev => ({ ...prev, isSigned: true }));
        // Gọi lại fetchFile để cập nhật previewUrl với file đã ký
        fetchFile();

        // Bạn có thể cập nhật thêm các thông tin khác từ `response.data` nếu cần
      }

    } catch (error) {
      logger.error("❌ ~ Lỗi khi ký file:", error);
      // Có thể hiển thị thông báo lỗi cho người dùng ở đây
    }
  }


  const renderFilePreview = () => {
    if (!previewUrl) return null;

    const fileExtension = fileDocument?.name?.split(".").pop()?.toLowerCase();
    const isImage = ["jpg", "jpeg", "png", "gif"].includes(fileExtension);
    const isPdf =
      previewUrl.includes("blob:") ||
      fileExtension === "pdf" ||
      previewUrl.endsWith(".pdf");

    if (isImage) {
      return (
        <img
          src={previewUrl}
          alt="File preview"
          style={{ maxWidth: "100%", objectFit: "contain" }}
        />
      );
    }

    if (isPdf) {
      return (
        <iframe
          src={previewUrl}
          title="File Preview"
          style={{ width: "100%", height: "100%", border: "none" }}
        />
      );
    }

    return (
      <iframe
        src={`https://docs.google.com/gview?url=${encodeURIComponent(
          previewUrl
        )}&embedded=true`}
        title="File Preview"
        style={{ width: "100%", height: "60vh", border: "none" }}
      />
    );
  };

  const handleTitleFileChange = useCallback((val) => {
    onPropChange?.(item.id, "titleFile", val);
  }, [onPropChange, item.id]);

  const createSignFileHandler = (file) => () => {
    handleSignFile(file);
  };

  const createDownloadFileHandler = (file) => () => {
    handleDownloadFile(file);
  };

  const createOpenPreviewHandler = (fileId) => () => {
    handleOpenPreview(fileId);
  };

  const createDeleteFileHandler = (fileId) => () => {
    handleDeleteFile(fileId);
  };

  const handleClosePreview = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <StyledPaper>
      <Box>
        {mode === "builder" ? (
          <StyledDebouncedInput
            onChange={handleTitleFileChange}
            value={item?.props.titleFile || "Tệp đính kèm"}
            delay={400}
            fullWidth
            fontSizeTextInput={12}
            disabled={mode !== "builder"}
          />
        ) : (
          <TitleTypography>
            {item?.props.titleFile || "Tệp đính kèm"}{" "}
            {required && <span style={{ color: "red" }}>*</span>}
          </TitleTypography>
        )}
        {error && <StyledFormHelperText error>{helperText}</StyledFormHelperText>}

        <input
          type="file"
          accept={uploadConfig.extensions}
          style={{ display: "none" }}
          id={`upload-file-${item?.id}`}
          onChange={handleFileChange}
          disabled={disabled}
        />
        <label htmlFor={`upload-file-${item?.id}`}>
          <ActionGrid 
          // display="flex" alignItems="center" gap={2}
          >
            <Tooltip title="Tải file">
              <UploadIconButton component="span">
                <UploadIcon />
              </UploadIconButton>
            </Tooltip>
            <Grid>
              <ActionTypography variant="body2">
                Tải file đính kèm
              </ActionTypography>
              <ActionTypography variant="body2">
                Tối đa {uploadConfig.maxSize}MB. Hỗ trợ:{" "}
                {uploadConfig.extensions.replace(/,/g, ", ")}
              </ActionTypography>
            </Grid>
          </ActionGrid>
        </label>

        {/* File List */}
        {fileList?.length > 0 && (
          <FileListGrid container direction="column" spacing={2}>
            {fileList.map((file) => (
              <Grid item key={file._id}>
                <ActionGridCenter container>
                  <Grid item>
                    <ActionBox>
                      <AttachmentIcon />
                      <FileNameTypography variant="body2">{file.name}</FileNameTypography>
                      {(allowSign || signStatus === "Đã ký số") && (
                        <SignStatusTypography
                          variant="body2"
                          isSigned={signStatus === "Đã ký số"}
                        >
                          ({signStatus})
                        </SignStatusTypography>
                      )}
                    </ActionBox>
                  </Grid>
                  <Grid item>
                    <ActionBox>
                      {allowSign && (
                        <Tooltip title="Ký số" placement="top">
                          <ActionIcon onClick={createSignFileHandler(file)}>
                            <PrimaryActionIcon />
                          </ActionIcon>
                        </Tooltip>
                      )}

                      <Tooltip title="Tải xuống" placement="top">
                        <ActionIcon onClick={createDownloadFileHandler(file)}>
                          <DownloadActionIcon />
                        </ActionIcon>
                      </Tooltip>

                      <Tooltip title="Xem file" placement="top">
                        <ActionIcon onClick={createOpenPreviewHandler(file._id)}>
                          <PreviewActionIcon />
                        </ActionIcon>
                      </Tooltip>

                      {!disabled && (
                        <Tooltip title="Xóa file" placement="top">
                          <ActionIcon onClick={createDeleteFileHandler(file._id)}>
                            <DeleteActionIcon />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </ActionBox>
                  </Grid>
                </ActionGridCenter>
              </Grid>
            ))}
          </FileListGrid>
        )}
      </Box>

      {/* Preview Dialog */}
      <PreviewDialog
        title={"Xem nội dung tài liệu"}
        open={open}
        onClose={handleClosePreview}
        size="xl"
        fullWidth
        // maxWidth="sm"
        // height="100%"
        disableSave
      >
        <PreviewBox>
          {renderFilePreview()}
        </PreviewBox>
      </PreviewDialog>
    </StyledPaper>
  );
};

FileUpload.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.any,
  disabled: PropTypes.bool,
  item: PropTypes.object,
  mode: PropTypes.string,
  onPropChange: PropTypes.func,
  required: PropTypes.bool,
  error: PropTypes.bool,
  helperText: PropTypes.string,
};

export default FileUpload;
