import React, { useState, useEffect, useRef, useCallback } from "react";
import { Typography, CircularProgress, Button, Grid } from "@mui/material";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import withSharedComponents from "@components/WrapperComponent";
import {
  StyledImage,
  StyledIframe,
  StyledContentArea,
  StyledDialogContentBox,
  StyledLoadingBox,
  StyledErrorBox,
} from "@styles/UploadFile/UploadFile.style";
import { useDispatch } from "react-redux";
import { useToast } from "@components/common/ToastProvider";
import { postSimpleNext } from "@redux/slices/IncomingDocument/IncommingDocSlice";
import PropTypes from "prop-types";
import { getExampleFileByKey } from "@services/ExampleFile";
import { APP_BASE } from "@EnvironmentFile/constants/urlConfig";
import { SaveButton } from "@styles/CustomDialog.styles";

const PopupCreateCertifiedCopyReport = ({
	open,
	onClose,
	onConfirm,
	isLoading = false,
	documentDetailFull,
	selectedFileForCertifiedCopy,
	sharedComponents,
}) => {
	const dispatch = useDispatch();
	const toast = useToast();
	const { InputComponents } = sharedComponents || {};

	const [processedFileUrl, setProcessedFileUrl] = useState(null);
	const [detectedFileType, setDetectedFileType] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [zoomLevel, setZoomLevel] = useState(100);
	const [previewUnsupported, setPreviewUnsupported] = useState(false);

	// States for editing recipients
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [recipientsText, setRecipientsText] = useState("");
	const [tempRecipientsText, setTempRecipientsText] = useState("");
	const [isSavingRecipients, setIsSavingRecipients] = useState(false);

	const isMountedRef = useRef(true);

	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	// ==================== API: FETCH FILE ====================
	const handleCreateCertifiedCopyReport = useCallback(async (currentRecipientsText) => {
		try {
			setLoading(true);
			setError(null);
			setZoomLevel(100);
			setPreviewUnsupported(false);

			const mapRole =
				documentDetailFull?.availableActions?.find(
					(item) => item.type === "createFileCopy"
				) ?? null;
			const docId = documentDetailFull?.document?.documentId;
			const workItemId = documentDetailFull?.workItem?.id;
			const fileExample = await getExampleFileByKey("SAO_Y_TEMPLATE");
			const urlTemplateFile = `${APP_BASE}/api/files/download/${fileExample?.id}?public=true`;

			const body = {
				roles: mapRole?.targetRole || "",
				actionCode: mapRole?.code || "",
				fileOrigin: selectedFileForCertifiedCopy?.id,
				fileExample: urlTemplateFile,
			};

			if (currentRecipientsText !== undefined && currentRecipientsText !== null && currentRecipientsText !== "") {
				body.recipientsText = currentRecipientsText;
			}

			// Call API postSimpleNext - response đã có file blob
			const res = await dispatch(
				postSimpleNext({ docId: docId, workItemId: workItemId, body })
			).unwrap();

			if (!isMountedRef.current) return;

			// Xử lý file từ response
			const blob = res?.data || res;
			if (!blob || (blob instanceof Blob && blob.size === 0)) {
				setError("File trống hoặc không hợp lệ");
				setLoading(false);
				return;
			}

			// Detect file type from blob
			let type = blob?.type || "application/pdf";

			let detected = "other";
			if (type === "application/pdf") detected = "pdf";
			else if (type?.includes("image/")) detected = "image";
			else if (type?.includes("officedocument") || type?.includes("msword"))
				detected = "office";

			if (isMountedRef.current) setDetectedFileType(detected);
			if (detected === "office" || detected === "other") {
				if (isMountedRef.current) setPreviewUnsupported(true);
			}

			// Tạo blob URL
			const blobUrl = URL.createObjectURL(
				blob instanceof Blob ? blob : new Blob([blob], { type })
			);

			// Revoke previous URL to avoid memory leaks
			setProcessedFileUrl((prevUrl) => {
				if (prevUrl) {
					URL.revokeObjectURL(prevUrl);
				}
				return blobUrl;
			});

			setLoading(false);
		} catch (error) {
			if (isMountedRef.current) {
				let messageError = 
					(typeof error === "string" ? error : null) ||
					error?.response?.data?.message ||
					error?.message ||
					error?.error?.message ||
					"Lỗi khi tạo biên bản sao y!";

				if (typeof messageError === "object" && messageError !== null) {
					if (Array.isArray(messageError)) {
						messageError = messageError.join(", ");
					} else {
						messageError = JSON.stringify(messageError);
					}
				}

				logger.log("Lỗi khi tạo biên bản sao y:", error);
				setError("Không thể tải file từ server");
				toast(messageError, "error");
				setLoading(false);
				throw error; // Rethrow so the save handler knows it failed
			}
		}
	}, [dispatch, documentDetailFull, selectedFileForCertifiedCopy, toast]);

	// ==================== EFFECT: INITIAL LOAD ====================
	useEffect(() => {
		if (!open) {
			setProcessedFileUrl((prevUrl) => {
				if (prevUrl) {
					URL.revokeObjectURL(prevUrl);
				}
				return null;
			});
			setLoading(false);
			setRecipientsText("");
			return;
		}

		const initialRecipientsText = documentDetailFull?.document?.recipientsText || "";
		setRecipientsText(initialRecipientsText);
		handleCreateCertifiedCopyReport(initialRecipientsText).catch((err) => {
			logger.log("Lỗi tải báo cáo ban đầu:", err);
		});

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]); // ✅ Chỉ phụ thuộc open

	// ==================== EFFECT: CLEANUP URL ON UNMOUNT ====================
	useEffect(() => {
		return () => {
			if (processedFileUrl) {
				URL.revokeObjectURL(processedFileUrl);
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [processedFileUrl]);

  const handleDownload = () => {
    if (!processedFileUrl) return;
    const a = document.createElement("a");
    a.href = processedFileUrl;
    a.download = "bien-ban-sao-y.pdf";
    a.click();
  };

	const handleImageError = () => setError("Không thể tải hình ảnh.");
	const handlePdfLoadError = () => setError("Không thể tải file PDF.");
	const handleLoadSuccess = () => { };

	// Edit recipients handlers
	const handleOpenEdit = useCallback(() => {
		setTempRecipientsText(recipientsText || "");
		setIsEditOpen(true);
	}, [recipientsText]);

	const handleCloseEdit = useCallback(() => {
		setIsEditOpen(false);
	}, []);

	const handleChangeTempRecipientsText = useCallback((e) => {
		setTempRecipientsText(e.target.value);
	}, []);

	const handleSaveRecipients = useCallback(async () => {
		setIsSavingRecipients(true);
		try {
			// Cập nhật state recipientsText
			setRecipientsText(tempRecipientsText);
			// Gọi lại API/generator thông qua handleCreateCertifiedCopyReport
			await handleCreateCertifiedCopyReport(tempRecipientsText);
			// Sau khi dữ liệu Biên bản sao y đã được cập nhật thành công: Đóng popup chỉnh sửa
			setIsEditOpen(false);
		} catch (error) {
			logger.error("Lỗi khi lưu nơi nhận:", error);
		} finally {
			setIsSavingRecipients(false);
		}
	}, [tempRecipientsText, handleCreateCertifiedCopyReport]);

  const isIframeType = detectedFileType === "pdf";

	return (
		<CustomDialog
			open={open}
			onClose={onClose}
			onSave={onConfirm}
			size="lg"
			fullWidth
			isLoading={isLoading}
			title={"BIÊN BẢN KÝ SAO Y"}
			leftButtons={
				<SaveButton
					onClick={handleOpenEdit}
					disabled={loading || isLoading}
				>
					Chỉnh sửa nơi nhận
				</SaveButton>
			}
		>
			<StyledDialogContentBox>
				<StyledContentArea>
					{loading && (
						<StyledLoadingBox>
							<CircularProgress />
							<Typography>Đang tải file...</Typography>
						</StyledLoadingBox>
					)}

          {error && (
            <StyledErrorBox>
              <Typography variant="body2">{error}</Typography>
              {processedFileUrl && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleDownload}
                >
                  Tải xuống file
                </Button>
              )}
            </StyledErrorBox>
          )}

          {!error && previewUnsupported && (
            <StyledErrorBox>
              <Typography variant="body2">
                File này không hỗ trợ xem trước. Vui lòng tải xuống để xem nội
                dung.
              </Typography>
              {processedFileUrl && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleDownload}
                >
                  Tải xuống file
                </Button>
              )}
            </StyledErrorBox>
          )}

          {!loading && !error && processedFileUrl && (
            <>
              {isIframeType && (
                <StyledIframe
                  src={processedFileUrl}
                  title="Biên bản sao y"
                  onError={handlePdfLoadError}
                  onLoad={handleLoadSuccess}
                />
              )}

							{detectedFileType === "image" && (
								<StyledImage
									src={processedFileUrl}
									alt="Biên bản sao y"
									onError={handleImageError}
									onLoad={handleLoadSuccess}
									zoomlevel={zoomLevel}
								/>
							)}
						</>
					)}
				</StyledContentArea>
			</StyledDialogContentBox>

			{/* Popup chỉnh sửa nơi nhận */}
			<CustomDialog
				open={isEditOpen}
				onClose={handleCloseEdit}
				onSave={handleSaveRecipients}
				size="sm"
				isLoading={isSavingRecipients}
				title={"CHỈNH SỬA NƠI NHẬN"}
				titleButton="LƯU"
				cancelButtonText="HỦY"
			>
				<Grid container spacing={2}>
					<Grid item xs={12}>
						<InputComponents
							label="Nơi nhận"
							placeholder="Nhập nơi nhận..."
							value={tempRecipientsText}
							onChange={handleChangeTempRecipientsText}
							multiline
							rows={4}
							fullWidth
						/>
					</Grid>
				</Grid>
			</CustomDialog>
		</CustomDialog>
	);
};

PopupCreateCertifiedCopyReport.propTypes = {
	open: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	onConfirm: PropTypes.func.isRequired,
	isLoading: PropTypes.bool,
	documentDetailFull: PropTypes.object,
	selectedFileForCertifiedCopy: PropTypes.object,
	sharedComponents: PropTypes.object,
};

export default withSharedComponents(PopupCreateCertifiedCopyReport);
