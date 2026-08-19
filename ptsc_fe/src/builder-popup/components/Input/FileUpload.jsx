import React, { useEffect, useState, useCallback } from "react";
import { Box, Tooltip, Grid, IconButton } from "@mui/material";
import {
  API_GETDETAIL_FILE,
  API_GET_LIST_PARAMETER_SYSTEM_MANAGERMANT,
  APP_BASE,
} from "@EnvironmentFile/constants/urlConfig";
// import CustomDialog from "@components/CustomDialog/CustomDialog";
 
import api, { callApi } from "@services/api";
import PropTypes from "prop-types";
import { useToast } from "@components/common/ToastProvider";
import {
  FileUploadContainer,
  StyledDebouncedInput,
  TitleTypography,
  UploadIconButton,
  StyledUploadIcon,
  UploadHelperText,
  FileNameContainer,
  StyledAttachFileIcon,
  FileNameTypography,
  FileActionsContainer,
  StyledPreviewIcon,
  StyledDeleteIcon,
  PreviewImage,
  PreviewIframe,
  PreviewDialog,
  PreviewDialogContent,
  PreviewGrid,
  PreviewGridFile,
} from "./FileUpload.styles";

async function fetchFileAsObject(url, fileName = "downloaded-file") {
  const response = await api.get(url, { responseType: "blob" });
  const blob = response.data;
  const file = new File([blob], fileName, { type: blob.type });
  const objectUrl = URL.createObjectURL(file);
  return { file, objectUrl };
}

const FileUpload = ({
  onChange,
  value,
  disabled,
  item,
  mode,
  onPropChange,
}) => {
  const [open, setOpen] = useState(false);
  const [fileDocument, setFileDocument] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [fileList, setFileList] = useState([]);
  const toast = useToast();
  const [uploadConfig, setUploadConfig] = useState({
    maxSize: 20, // Giá trị mặc định
    extensions: ".jpg,.jpeg,.png,.pdf,.xls,.xlsx", // Có thể mở rộng sau này
  });

  // Lấy cấu hình dung lượng upload từ API
  useEffect(() => {
    const fetchUploadConfig = async () => {
      try {
        const response = await callApi("get", API_GET_LIST_PARAMETER_SYSTEM_MANAGERMANT);
        logger.log("Cấu hình upload:", response);
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

  // Fetch file details
  const fetchFile = useCallback(async () => {
    if (!value || value instanceof File) return;

    try {
      const response = await api.get(`${API_GETDETAIL_FILE}/${value}`, {
        headers: { Accept: "application/json" },
      });
      const fileData = response.data?.data;
      setFileDocument(fileData);

      if (fileData?._id) {
        const url = `${APP_BASE}/api/file/download/${fileData._id}`;
        try {
          const { objectUrl } = await fetchFileAsObject(
            url,
            fileData.name || "file"
          );
          setPreviewUrl(objectUrl);
          setFileList([{ ...fileData, previewUrl: objectUrl }]);
        } catch (err) {
          // eslint-disable-next-line no-console
          logger.error("Error fetching file object:", err);
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      logger.error("Error fetching file details:", error);
    }
  }, [value]);

  useEffect(() => {
    fetchFile();
  }, [fetchFile, value]);

  const handleFileChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const fileSizeInMB = file.size / 1024 / 1024;
        if (fileSizeInMB > uploadConfig.maxSize) {
          toast(`Kích thước tệp không được vượt quá ${uploadConfig.maxSize}MB.`, "error");
          e.target.value = null; // Reset the input
          return;
        }
        onChange?.(file);
        const preview = URL.createObjectURL(file);
        setPreviewUrl(preview);
        const newFile = {
          _id: Date.now(),
          name: file.name,
          previewUrl: preview,
        };
        setFileDocument(newFile);
        setFileList([newFile]);
      }
    },
    [onChange, toast, uploadConfig]
  );

  const handleOpenPreview = (id) => {
    const f = fileList.find((f) => f._id === id);
    if (f) {
      setPreviewUrl(f.previewUrl);
      setOpen(true);
    }
  };

  const getPreviewHandler = (fileId) => () => {
    handleOpenPreview(fileId);
  };

  const handleDeleteFile = (id) => {
    setFileList((prev) => prev.filter((f) => f._id !== id));
    setFileDocument(null);
    onChange?.(null);
  };

  const getDeleteHandler = (fileId) => () => {
    handleDeleteFile(fileId);
  };

  // Render preview inside dialog
  const renderFilePreview = () => {
    if (!previewUrl) return null;

    const fileExtension = fileDocument?.name?.split(".").pop()?.toLowerCase();
    const isImage = ["jpg", "jpeg", "png", "gif"].includes(fileExtension);
    const isPdf = fileExtension === "pdf";

    if (isImage) {
      return <PreviewImage src={previewUrl} alt="File preview" />;
    }

    if (isPdf) {
      return <PreviewIframe src={previewUrl} title="File Preview" />;
    }

    return (
      <iframe
        src={`https://docs.google.com/gview?url=${encodeURIComponent(previewUrl)}&embedded=true`}
        title="File Preview"
        style={{ width: "100%", height: "60vh", border: "none" }}
      />
    );
  };

  const handleTitleChange = (val) => {
    onPropChange?.(item.id, "titleFile", val);
  };
  const handleClose = () => {
    setOpen(false);
  };

  return (
    <FileUploadContainer elevation={0}>
      <Box>
        {mode === "builder" ? (
          <StyledDebouncedInput
            onChange={handleTitleChange}
            value={item?.props.titleFile || "Tệp đính kèm"}
            delay={400}
            fullWidth
            fontSizeTextInput={12}
            disabled={mode !== "builder"}
          />
        ) : (
          <TitleTypography>
            {item?.props.titleFile || "Tệp đính kèm"}
          </TitleTypography>
        )}

        {/* Upload Button */}
        <input
          type="file"
          accept={uploadConfig.extensions}
          style={{ display: "none" }}
          id={`upload-file-${item?.id}`}
          onChange={handleFileChange}
          disabled={disabled}
        />
        <label htmlFor={`upload-file-${item?.id}`}>
          <PreviewGrid>
            <Tooltip title="Tải file">
              <UploadIconButton component="span">
                <StyledUploadIcon />
              </UploadIconButton>
            </Tooltip>
            <Grid>
              <UploadHelperText variant="body2">
                Tải file đính kèm
              </UploadHelperText>
              <UploadHelperText variant="body2">
                Tối đa {uploadConfig.maxSize}MB. Hỗ trợ:{" "}
                {uploadConfig.extensions.replace(/,/g, ", ")}
              </UploadHelperText>
            </Grid>
          </PreviewGrid>
        </label>

        {/* File List */}
        {fileList?.length > 0 && (
          <Grid container direction="column" spacing={2}>
            {fileList.map((file) => {
              const fileExtension = file.name?.split(".").pop()?.toLowerCase();
              const isDoc = fileExtension === "doc";

              return (
                <Grid item key={file._id}>
                  <PreviewGridFile
                    container
                    // alignItems="center"
                    // justifyContent="space-between"
                  >
                    <Grid item>
                      <FileNameContainer>
                        <StyledAttachFileIcon />
                        <FileNameTypography variant="body2">
                          {file.name}
                        </FileNameTypography>
                      </FileNameContainer>
                    </Grid>
                    <Grid item>
                      <FileActionsContainer>
                        {isDoc ? (
                          <Tooltip title="Phần mềm chưa hỗ trợ xem file doc" placement="top">
                            <span>
                              <IconButton size="small" disabled><StyledPreviewIcon /></IconButton>
                            </span>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Xem file" placement="top">
                            <IconButton onClick={getPreviewHandler(file._id)} size="small">
                              <StyledPreviewIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Xóa file" placement="top">
                          <IconButton onClick={getDeleteHandler(file._id)} size="small">
                            <StyledDeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </FileActionsContainer>
                    </Grid>
                  </PreviewGridFile>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>

      {/* Preview Dialog */}
      <PreviewDialog
        open={open}
        onClose={handleClose}
        size="xl"
        fullWidth
        // maxWidth="sm"
        // height="100%"
        disableSave
      >
        <PreviewDialogContent>
          {renderFilePreview()}
        </PreviewDialogContent>
      </PreviewDialog>
    </FileUploadContainer>
  );
};

FileUpload.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.any,
  disabled: PropTypes.bool,
  item: PropTypes.object,
  mode: PropTypes.string,
  onPropChange: PropTypes.func,
};

export default FileUpload;
