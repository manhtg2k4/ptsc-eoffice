
import React, { useCallback, memo, useState } from "react";
import { useSelector } from "react-redux";
import PropTypes from "prop-types";
import { styled } from "@mui/material/styles";
import {
  Table,
  TableBody,
  Paper,
  Tooltip,
  Menu,
  MenuItem,
  ListItemText,
  // Dialog,
  // DialogTitle,
  // DialogContent,
  // DialogContentText,
  // DialogActions,
  Typography,
  IconButton,
  Checkbox,
} from "@mui/material";
import {
  Create as CreateIcon,
  Delete as DeleteIcon,
  GetApp as DownloadIcon,
  EditNote,
  RemoveRedEye,
  Dehaze,
  CloudDownload as CloudDownloadIcon,
  VerifiedUser as VerifiedUserIcon,
} from "@mui/icons-material";
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
const StyledRemoveRedEye = styled(RemoveRedEye)({ fontSize: 26 });
const StyledCreateIcon = styled(DriveFileRenameOutlineIcon)({ fontSize: 26 });
const StyledCloudDownload = styled(DownloadIcon)({ fontSize: 26 });
const StyledCloudDownloadIcon = styled(CloudDownloadIcon)({ fontSize: 22, color: "#1976d2" });
const StyledEditNote = styled(EditNote)({ fontSize: 26 });
const StyledDeleteIcon = styled(DeleteIcon)({ fontSize: 26 });
const VerifiedIcon = styled(VerifiedUserIcon)({ fontSize: 24, color: "#4caf50" });

// Import các Styled Component gốc (GIỮ NGUYÊN)
import {
  ActionCellBoxGiveNumber,
  FileNameCellGiveNumber,
  FileNameWrapper,
  SignedCheckIcon,
  SignedChip,
  // StyledButtonGiveNumber,
  StyledColumnSttTableHeaderCellGiveNumber,
  StyledIconButtonGiveNumber,
  StyledTableCellActionGiveNumber,
  StyledTableCellGiveNumber,
  StyledTableContainerGiveNumber,
  StyledTableHeaderCellAction,
  StyledTableHeaderCellGiveNumber,
  StyledTableHeadGiveNumber,
  StyledTableRowBodyGiveNumber,
  StyledTableRowGiveNumber,
} from "@styles/UploadFile/UploadFile.style";
import {
  // URL_TOOL_EDIT,
} from "@EnvironmentFile/constants/urlConfig";
// import api from "@services/api";
// import CustomButton from "@components/CustomButton";

// =============================================================================
// --- STYLED COMPONENT WRAPPERS ---
// =============================================================================
const ExtraColumnHeader = styled(StyledTableHeaderCellGiveNumber, {
  shouldForwardProp: (prop) => prop !== "colWidth" && prop !== "customStyles",
})(({ colWidth, customStyles }) => ({
  width: colWidth || "auto",
  ...customStyles,
}));

const ExtraColumnCell = styled(StyledTableCellGiveNumber, {
  shouldForwardProp: (prop) => prop !== "customStyles",
})(({ customStyles }) => ({
  ...customStyles,
}));

const FileNameText = styled(Typography)(({ theme }) => ({
  color: theme.palette.primary.main,
  textDecoration: "none",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: "450px", // Giới hạn chiều rộng để hiển thị dấu ...
  display: "block",
  flex: 1, // Để chiếm phần còn lại của flex wrapper
  minWidth: 0, // Quan trọng để ellipsis hoạt động trong flexbox
  cursor: "pointer",
  "&:hover": {
    textDecoration: "underline",
  },
}));

const CompactAwareExtraHeader = styled(ExtraColumnHeader, {
  shouldForwardProp: (prop) => prop !== "isCompact",
})(({ isCompact }) => ({
  ...(isCompact && {
    padding: "4px !important",
    fontSize: "12px",
    minWidth: "80px",
  }),
}));

const CompactAwareExtraCell = styled(ExtraColumnCell, {
  shouldForwardProp: (prop) => prop !== "isCompact",
})(({ isCompact }) => ({
  ...(isCompact && {
    padding: "4px !important",
    minWidth: "80px",
  }),
}));

const CompactFileNameText = styled(FileNameText, {
  shouldForwardProp: (prop) => prop !== "isCompact",
})(({ isCompact }) => ({
  ...(isCompact && {
    fontSize: "13px",
  }),
}));

const CompactAwareSTTHeaderCell = styled(StyledColumnSttTableHeaderCellGiveNumber, {
  shouldForwardProp: (prop) => prop !== "isCompact",
})(({ isCompact }) => ({
  ...(isCompact && {
    padding: "4px !important",
    width: "40px !important",
    minWidth: "40px !important",
  }),
}));

const ActionMappingMenuItem = memo(({ action, cfg, onCloseMenu }) => {
  const handleClick = useCallback(() => {
    onCloseMenu();
    cfg.onClick();
  }, [onCloseMenu, cfg]);

  return (
    <MenuItem onClick={handleClick}>
      <ListItemText>{action.label}</ListItemText>
    </MenuItem>
  );
});
ActionMappingMenuItem.displayName = "ActionMappingMenuItem";

const CompactAwareActionHeaderCell = styled(StyledTableHeaderCellAction, {
  shouldForwardProp: (prop) => prop !== "isCompact",
})(({ isCompact }) => ({
  ...(isCompact && {
    padding: "4px 2px !important",
    width: "80px !important",
    minWidth: "80px !important",
  }),
}));

const CompactAwareTableCell = styled(StyledTableCellGiveNumber, {
  shouldForwardProp: (prop) => prop !== "isCompact",
})(({ isCompact }) => ({
  ...(isCompact && {
    padding: "4px 2px !important",
  }),
}));

const CompactAwareActionCell = styled(StyledTableCellActionGiveNumber, {
  shouldForwardProp: (prop) => prop !== "isCompact",
})(({ isCompact }) => ({
  ...(isCompact && {
    padding: "4px 2px !important",
    width: "80px !important",
    minWidth: "80px !important",
  }),
}));

const CompactAwareTableHeaderCell = styled(StyledTableHeaderCellGiveNumber, {
  shouldForwardProp: (prop) => prop !== "isCompact",
})(({ isCompact }) => ({
  ...(isCompact && {
    padding: "4px !important",
    fontSize: "13px",
  }),
}));

const StyledTableHeaderTênFile = styled("div")({
  display: "flex",
  alignItems: "center",
  gap: "8px",
});

const HeaderTextEllipsis = styled("div", {
  shouldForwardProp: (prop) => prop !== "styleTextAlign",
})(({ styleTextAlign }) => ({
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  display: "block",
  width: "100%",
  textAlign: styleTextAlign || "inherit",
}));

// =============================================================================
// --- HELPER ---
// =============================================================================
const truncateFileName = (name, length = 25) => {
  if (!name || name.length <= length) return name;
  return name.substring(0, length) + "......";
};

const formatFileSize = (bytes) => {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const getFileTypeLabel = (fileName) => {
  if (!fileName) return "Unknown";
  const ext = fileName.split('.').pop().toLowerCase();
  switch (ext) {
    case 'pdf': return 'Adobe PDF';
    case 'doc':
    case 'docx': return 'Word Document';
    case 'xls':
    case 'xlsx': return 'Excel Spreadsheet';
    case 'ppt':
    case 'pptx': return 'PowerPoint';
    case 'png':
    case 'jpg':
    case 'jpeg': return 'Image';
    default: return ext.toUpperCase() + ' File';
  }
};

const normalizeFlag = (value) => {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }
  return false;
};

// =============================================================================
// --- FILE ROW ---
// =============================================================================
const FileRow = memo(function FileRow({
  file,
  index,
  onPreview,
  onDownload,
  onDelete,
  // onEdit,
  onOpenIframe,
  onGiveNumber,
  onDigitalSign,
  onSignDraft,
  onSignCertificate,
  // onSignDigital,
  // onSignInitial,
  // allowSignDigital,
  // allowSignInitial,
  // canDigitalSign,
  // canSignDraft,
  // canSignCertificate,
  isView,
  editFile,
  canGiveNumber,
  canCreateFileCopy,
  canNotDeleteFile,
  objectType,
  // objectId,
  // onShowDownloadTool,
  extraColumns = [],
  // setReloadDoc,
  documentDetail,
  documentDetailFull,
  onCreateCertifiedCopyReport,
  isFileCopy,
  isCompact = false,
  hiddenDownload = false,
  hiddenPreview = false,
  isActionMenu = false,
  disableActions = false,
  isVanThu = false,
  useSecondaryLayout = false,
  hiddenTypeAndSize = false,
  allowMultipleDelete = false,
  selectedDeleteKeys = [],
  onToggleSelectDelete,
}) {
  const { verificationResultsMap } = useSelector((state) => state.digitalSignatureFile);
  
  // Lấy fileId từ chi tiết bản ghi (ưu tiên fileId dạng số từ API chi tiết)
  const detailFiles = documentDetail?.document?.files || documentDetail?.files || [];
  const currentFileName = file.fileName || file.name || file.file_name;
  const foundFile = detailFiles.find(f => (f.fileName || f.file_name) === currentFileName);
  
  const fileId = foundFile?.fileId || file.fileId || file.id || file._id;
  const isDigitalSigned = verificationResultsMap?.[fileId]?.isDigitalSigned;

  const isSaved = !!(file._id || file.id);  

  const [editMenuAnchor, setEditMenuAnchor] = useState(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [downloadMenuAnchor, setDownloadMenuAnchor] = useState(null);
  const openEditMenu = Boolean(editMenuAnchor);
  const openActionMenu = Boolean(actionMenuAnchor);
  const openDownloadMenu = Boolean(downloadMenuAnchor);

  const handleOpenEditMenu = useCallback((event) => {
    event.stopPropagation();
    setEditMenuAnchor(event.currentTarget);
  }, []);

  const handleCloseEditMenu = useCallback(() => {
    setEditMenuAnchor(null);
  }, []);
  const handleCloseActionMenu = useCallback(() => {
    setActionMenuAnchor(null);
  }, []);

  const handleOpenActionMenu = useCallback((event) => {
    event.stopPropagation();
    setActionMenuAnchor(event.currentTarget);
  }, []);

  const handleCloseDownloadMenu = useCallback(() => {
    setDownloadMenuAnchor(null);
  }, []);

  const handlePreview = useCallback(() => {
    if (onPreview) onPreview(file);
  }, [onPreview, file]);

  const handleDownload = useCallback((event) => {
    // const fileName = file.name || file.fileName || file.file_name || "";
    // const isPdf = fileName.toLowerCase().endsWith(".pdf");

    if ((objectType === "incommingdocument" || objectType === "docDraft") && String(isVanThu) === "true") {
      event.stopPropagation();
      setDownloadMenuAnchor(event.currentTarget);
    } else {
      if (onDownload) onDownload(file, null, isVanThu);
    }
  }, [onDownload, file, objectType, isVanThu]);

  const handleDownloadWithType = useCallback((type) => {
    handleCloseDownloadMenu();
    if (onDownload) onDownload(file, type, isVanThu);
  }, [onDownload, file, isVanThu, handleCloseDownloadMenu]);

  const handleDownloadNoWatermark = useCallback(() => handleDownloadWithType("no-watermark"), [handleDownloadWithType]);
  const handleDownloadNoStamp = useCallback(() => handleDownloadWithType("no-stamp"), [handleDownloadWithType]);
  const handleDownloadWithWatermark = useCallback(() => handleDownloadWithType("with-watermark"), [handleDownloadWithType]);

  const handleDelete = useCallback(() => {
    if (onDelete) onDelete(index, file);
  }, [onDelete, index, file]);

  const handleGiveNumber = useCallback(() => {
    if (onGiveNumber) onGiveNumber(file);
  }, [onGiveNumber, file]);

  const handleCreateCertifiedCopyReport = useCallback(() => {
    if (onCreateCertifiedCopyReport) onCreateCertifiedCopyReport(file);
  }, [onCreateCertifiedCopyReport, file]);

  const handleOpenDigitalSignatureFile = () => {
    if (onDigitalSign) onDigitalSign(file);
  };

  const handleOpenSignDraftFile = () => {
    if (onSignDraft) onSignDraft(file);
  };

  const handleOpenSignCertificateFile = () => {
    if (onSignCertificate) onSignCertificate(file);
  };

  const handleSelectOnline = () => {
    handleCloseEditMenu();
    if (onOpenIframe) onOpenIframe(file);
  };

  const handleMenuPreview = useCallback(() => {
    handleCloseActionMenu();
    handlePreview();
  }, [handleCloseActionMenu, handlePreview]);

  const handleMenuDownload = useCallback(() => {
    handleCloseActionMenu();
    handleDownload();
  }, [handleCloseActionMenu, handleDownload]);

  const handleMenuDelete = useCallback(() => {
    handleCloseActionMenu();
    handleDelete();
  }, [handleCloseActionMenu, handleDelete]);

  const handleMenuGiveNumber = useCallback(() => {
    handleCloseActionMenu();
    handleGiveNumber();
  }, [handleCloseActionMenu, handleGiveNumber]);

  const handleMenuCreateCertifiedCopyReport = useCallback(() => {
    handleCloseActionMenu();
    handleCreateCertifiedCopyReport();
  }, [handleCloseActionMenu, handleCreateCertifiedCopyReport]);

  const handleMenuOpenEdit = useCallback((e) => {
    handleCloseActionMenu();
    handleOpenEditMenu(e);
  }, [handleCloseActionMenu, handleOpenEditMenu]);

  // const handleSelectWord = async () => {
  //   handleCloseEditMenu();

  //   const fileName = file.fileName || file.name || file.file_name || "";
  //   const isOffice = /\.(doc|docx|xls|xlsx|ppt|pptx)$/i.test(fileName);

  //   if (!isOffice) {
  //     onEdit?.(file, objectType, objectId);
  //     return;
  //   }
  //   try {
  //     const response = await fetch(URL_TOOL_EDIT, {
  //       method: "GET",
  //       credentials: "omit",
  //     });
  //     if (!response.ok) throw new Error(`Tool error: ${response.status}`);
  //     onEdit?.(file, objectType, objectId);
  //     setReloadDoc?.(Date.now());
  //   } catch (error) {
  //     onShowDownloadTool?.();
  //   }
  // };

  const flagSign =
    documentDetail?.flags?.canSignContentDraft ||
    documentDetail?.flags?.canSignFormatDraft ||
    documentDetail?.flags?.canReportSigner ||
    documentDetail?.flags?.canStampDoc ||
    documentDetail?.flags?.canSignCopy ||
    documentDetail?.flags?.canOfficialSigner1 ||
    documentDetail?.flags?.canOfficialSigner2 ||
    documentDetail?.flags?.canOfficialSigner3 ;
  const isCertifiedChecked = normalizeFlag(file?.isCertifiedCopy);
  const canShowSignActions = flagSign && file?.canSign === true;
  const shouldShowSignAction = (actionType) => {
    if (actionType !== "signCopy") return true;
    return isCertifiedChecked;
  };
  const actionMap = {
    signContentDraft: {
      onClick: handleOpenDigitalSignatureFile,
      icon: <CreateIcon />,
    },
    signFormatDraft: {
      onClick: handleOpenSignCertificateFile,
      icon: <CreateIcon />,
    },
    reportSigner: {
      onClick: handleOpenSignDraftFile,
      icon: <CreateIcon />,
    },
    stampDoc: {
      onClick: handleOpenSignCertificateFile,
      icon: <CreateIcon />,
    },
    signCopy: {
      onClick: handleOpenSignDraftFile,
      icon: <CreateIcon />,
    },
    officialSigner1: {
      onClick: handleOpenDigitalSignatureFile,
      icon: <CreateIcon />,
    },
    officialSigner2: {
      onClick: handleOpenDigitalSignatureFile,
      icon: <CreateIcon />,
    },
    officialSigner3: {
      onClick: handleOpenDigitalSignatureFile,
      icon: <CreateIcon />,
    },
  };

  const fileUniqueKey = file?._id || file?.id || file?.fileId || `temp-${index}`;

  const handleToggleCheckbox = useCallback((e) => {
    onToggleSelectDelete?.(fileUniqueKey, e.target.checked);
  }, [fileUniqueKey, onToggleSelectDelete]);

  return (
    <StyledTableRowBodyGiveNumber hover>
      {allowMultipleDelete && (
        <CompactAwareTableCell
          styleTextAlign="center"
          styleWidth="40px"
          styleMinWidth="40px"
          isCompact={isCompact}
        >
          <Checkbox
            checked={selectedDeleteKeys.includes(fileUniqueKey)}
            onChange={handleToggleCheckbox}
            size="small"
          />
        </CompactAwareTableCell>
      )}

      <CompactAwareTableCell
        styleTextAlign="center"
        styleFontWeight={600}
        styleWidth={isCompact ? "40px" : "60px"}
        styleMinWidth={isCompact ? "40px" : "60px"}
        isCompact={isCompact}
      >
        {index + 1}
      </CompactAwareTableCell>

      <FileNameCellGiveNumber
        onClick={handlePreview}
        title={file.name || file.fileName || file.file_name}
      >
        <FileNameWrapper>
          <CompactFileNameText isCompact={isCompact}>
            {isCompact 
              ? truncateFileName(file.name || file.fileName || file.file_name || "Không tên")
              : (file.name || file.fileName || file.file_name || "Không tên")
            }
          </CompactFileNameText>
          {file.hasError && (
            <span style={{ marginLeft: 8, fontWeight: 600, color: "#d94b4b", fontSize: "0.75rem" }}>
              (Tải lên thất bại)
            </span>
          )}
          {file.isSignedFile === 1 && (
            <SignedChip icon={<SignedCheckIcon />} label="Đã ký" size="small" />
          )}
        </FileNameWrapper>
      </FileNameCellGiveNumber>

      {useSecondaryLayout && !hiddenTypeAndSize && (
        <>
          <StyledTableCellGiveNumber align="left">
            {getFileTypeLabel(file.name || file.fileName || file.file_name)}
          </StyledTableCellGiveNumber>
          <StyledTableCellGiveNumber align="left">
            {formatFileSize(file.size)}
          </StyledTableCellGiveNumber>
        </>
      )}

      {extraColumns.map((col, idx) => (
        <CompactAwareExtraCell
          key={col.key || col.header || `extra-cell-${idx}`}
          align={col.align || "left"}
          customStyles={col.styleCell}
          isCompact={isCompact}
        >
          {col.render ? col.render(file, index) : null}
        </CompactAwareExtraCell>
      ))}

			{!disableActions && (
				<CompactAwareActionCell 
        	styleAlignItems="center"
        	isCompact={isCompact}
      	>
        	<ActionCellBoxGiveNumber>
        	  {!isActionMenu ? (
        	    <>
                {/* Hiển thị icon xác thực nếu file đã được ký số */}
                  {isDigitalSigned && (
                    <Tooltip title="Văn bản đã được ký số">
                      <StyledIconButtonGiveNumber size="small">
                        <VerifiedIcon />
                      </StyledIconButtonGiveNumber>
                    </Tooltip>
                  )}

        	      {!isCompact && !hiddenPreview && (
        	        <Tooltip title="Xem file">
        	          <StyledIconButtonGiveNumber size="small" onClick={handlePreview}>
        	            <StyledRemoveRedEye />
        	          </StyledIconButtonGiveNumber>
        	        </Tooltip>
        	      )}

        	      {canGiveNumber && (
        	        <Tooltip title={file?.isNumbered === 1 ? "Cập nhật số" : "Cho số"}>
        	          <StyledIconButtonGiveNumber size="small" onClick={handleGiveNumber}>
        	            <StyledCreateIcon />
        	          </StyledIconButtonGiveNumber>
        	        </Tooltip>
        	      )}

                {canShowSignActions &&
        	        (() => {
        	          const available = documentDetail?.availableActions || [];
        	          const seenTypes = new Set();
        	          const uniqueActions = available.filter((action) => {
        	            if (!action?.type || seenTypes.has(action.type)) return false;
        	            seenTypes.add(action.type);
        	            return true;
        	          });
        	          return uniqueActions.map((action) => {
        	            const cfg = actionMap[action.type];
        	            if (!cfg || !shouldShowSignAction(action.secType)) return null;
        	            return (
        	              <Tooltip key={action.type} title={action.label}>
        	                <StyledIconButtonGiveNumber size="small" onClick={cfg.onClick}>
        	                  <StyledCreateIcon />
        	                </StyledIconButtonGiveNumber>
        	              </Tooltip>
        	            );
        	          });
        	        })()}

        	      {!hiddenDownload && (
        	        <Tooltip title="Tải xuống">
        	          <StyledIconButtonGiveNumber size="small" onClick={handleDownload}>
        	            <StyledCloudDownload />
        	          </StyledIconButtonGiveNumber>
        	        </Tooltip>
        	      )}

        	      {isFileCopy && canCreateFileCopy && 
        	        documentDetailFull?.availableActions?.filter(i => i.type === "createFileCopy").map(i => (
        	          <Tooltip key={i.code} title={i.label}>
        	            <StyledIconButtonGiveNumber size="small" onClick={handleCreateCertifiedCopyReport}>
        	              <StyledEditNote />
        	            </StyledIconButtonGiveNumber>
        	          </Tooltip>
        	        ))
        	      }

        	      {!isView && (
        	        <>
        	          {editFile && isSaved && (
        	            <Tooltip title="Chỉnh sửa">
        	              <StyledIconButtonGiveNumber size="small" onClick={handleOpenEditMenu}>
        	                <StyledEditNote />
        	              </StyledIconButtonGiveNumber>
        	            </Tooltip>
        	          )}
        	          {!canNotDeleteFile && (
        	            <Tooltip title="Xóa">
        	              <StyledIconButtonGiveNumber size="small" onClick={handleDelete}>
        	                <StyledDeleteIcon />
        	              </StyledIconButtonGiveNumber>
        	            </Tooltip>
        	          )}
        	        </>
        	      )}
        	    </>
        	  ) : (
        	    <>
                {/* Hiển thị icon xác thực nếu file đã được ký số */}
                  {isDigitalSigned && (
                    <Tooltip title="Văn bản đã được ký số">
                      <StyledIconButtonGiveNumber size="small">
                        <VerifiedIcon />
                      </StyledIconButtonGiveNumber>
                    </Tooltip>
                  )}
        	      <Tooltip title="Thao tác">
        	        <StyledIconButtonGiveNumber size="small" onClick={handleOpenActionMenu}>
        	          <Dehaze />
        	        </StyledIconButtonGiveNumber>
        	      </Tooltip>

        	      <Menu
        	        anchorEl={actionMenuAnchor}
        	        open={openActionMenu}
        	        onClose={handleCloseActionMenu}
        	        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        	        transformOrigin={{ vertical: "top", horizontal: "left" }}
        	      >
        	        {!hiddenPreview && (
        	          <MenuItem onClick={handleMenuPreview}>
        	            <ListItemText>Xem file</ListItemText>
        	          </MenuItem>
        	        )}

        	        {canGiveNumber && (
        	          <MenuItem onClick={handleMenuGiveNumber}>
        	            <ListItemText>{file?.isNumbered === 1 ? "Cập nhật số" : "Cho số"}</ListItemText>
        	          </MenuItem>
        	        )}

                  {canShowSignActions &&
        	          (() => {
        	            const available = documentDetail?.availableActions || [];
        	            const seenTypes = new Set();
        	            const uniqueActions = available.filter((action) => {
        	              if (!action?.type || seenTypes.has(action.type)) return false;
        	              seenTypes.add(action.type);
        	              return true;
        	            });
        	            return uniqueActions.map((action) => {
        	              const cfg = actionMap[action.type];
        	              if (!cfg || !shouldShowSignAction(action.secType)) return null;
        	              return (
        	                <ActionMappingMenuItem
        	                  key={action.type}
        	                  action={action}
        	                  cfg={cfg}
        	                  onCloseMenu={handleCloseActionMenu}
        	                />
        	              );
        	            });
        	          })()}

        	        {!hiddenDownload && (
        	          <MenuItem onClick={handleMenuDownload}>
        	            <ListItemText>Tải xuống</ListItemText>
        	          </MenuItem>
        	        )}

        	        {isFileCopy && canCreateFileCopy && 
        	          documentDetailFull?.availableActions?.filter(i => i.type === "createFileCopy").map(i => (
        	            <MenuItem key={i.code} onClick={handleMenuCreateCertifiedCopyReport}>
        	              <ListItemText>{i.label}</ListItemText>
        	            </MenuItem>
        	          ))
        	        }

        	        {!isView && (
        	          <>
        	            {editFile && isSaved && (
        	              <MenuItem onClick={handleMenuOpenEdit}>
        	                <ListItemText>Chỉnh sửa</ListItemText>
        	              </MenuItem>
        	            )}
        	            {!canNotDeleteFile && (
        	              <MenuItem onClick={handleMenuDelete}>
        	                <ListItemText>Xóa</ListItemText>
        	              </MenuItem>
        	            )}
        	          </>
        	        )}
        	      </Menu>
        	    </>
        	  )}

        	  <Menu
        	    anchorEl={editMenuAnchor}
        	    open={openEditMenu}
        	    onClose={handleCloseEditMenu}
        	    anchorOrigin={{
        	      vertical: "top",
        	      horizontal: "right",
        	    }}
        	    transformOrigin={{
        	      vertical: "top",
        	      horizontal: "left",
        	    }}
        	  >
        	    <MenuItem onClick={handleSelectOnline}>
        	      <ListItemText>Sửa trực tuyến</ListItemText>
        	    </MenuItem>
        	    {/* <MenuItem onClick={handleSelectWord}>
        	      <ListItemText>Sửa file (Word/Excel...)</ListItemText>
        	    </MenuItem> */}
        	  </Menu>

            <Menu
              anchorEl={downloadMenuAnchor}
              open={openDownloadMenu}
              onClose={handleCloseDownloadMenu}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
            >
              <MenuItem onClick={handleDownloadNoWatermark}>
                <ListItemText>Tải xuống và in không có watermark</ListItemText>
              </MenuItem>
              <MenuItem onClick={handleDownloadNoStamp}>
                <ListItemText>Tải xuống và in không có dấu mộc</ListItemText>
              </MenuItem>
              <MenuItem onClick={handleDownloadWithWatermark}>
                <ListItemText>Tải xuống và in có watermark</ListItemText>
              </MenuItem>
            </Menu>
        	</ActionCellBoxGiveNumber>
      </CompactAwareActionCell>
			)}
    </StyledTableRowBodyGiveNumber>
  );
});

const StyledIconButton = styled(IconButton)({
  padding: 0,
});

const FileTableInPopup = ({
  files = [],
  onPreview,
  onDownload,
  onDelete,
  onEdit,
  onOpenIframe,
  onGiveNumber,
  onDigitalSign,
  onSignDraft,
  onSignCertificate,
  // onSignDigital,
  // onSignInitial,
  // allowSignDigital = false,
  // allowSignInitial = false,
  // canDigitalSign = false, //Ký số chèn ảnh và key word
  // canSignDraft = false, //Ký nháy chèn ảnh và key word
  // canSignCertificate = false, //Ký số chỉ có chứng chỉ (ko chèn ảnh và key word)
  isView = false,
  editFile = false,
  canGiveNumber = false,
  canCreateFileCopy = false,
  canNotDeleteFile = false,
  objectType,
  objectId,
  // onDownloadTool,
  extraColumns = [],
  setReloadDoc,
  documentDetail,
  documentDetailFull,
  onCreateCertifiedCopyReport,
  selectedFileCopyKey,
  isCompact = false,
  hiddenDownload = false,
  hiddenPreview = false,
  isActionMenu = false,
  onDownloadAll,
	showDownloadAll,
	disableActions = false,
  isVanThu = false,
  useSecondaryLayout = false,
  hiddenTypeAndSize = false,
  allowMultipleDelete = false,
  selectedDeleteKeys = [],
  onToggleSelectDelete,
  onSelectAllDelete,
}) => {
  // const [openToolPopup, setOpenToolPopup] = useState(false);

  // const handleOpenToolPopup = useCallback(() => setOpenToolPopup(true), []);
  // const handleCloseToolPopup = useCallback(() => setOpenToolPopup(false), []);

  // const handleDownloadToolClick = useCallback(() => {
  //   setOpenToolPopup(false);
  //   if (onDownloadTool) {
  //     onDownloadTool();
  //   } else {
  //     const link = document.createElement("a");
  //     link.href = URL_DOWLOAD_EDIT_WORD;
  //     link.download = "";
  //     document.body.appendChild(link);
  //     link.click();
  //     document.body.removeChild(link);
  //   }
  // }, [onDownloadTool]);

  // const handleDownloadToolClickMac = useCallback(() => {
  //   setOpenToolPopup(false);
  //   if (onDownloadTool) {
  //     onDownloadTool();
  //   } else {
  //     const link = document.createElement("a");
  //     link.href = URL_DOWLOAD_EDIT_WORD_MAC;
  //     link.download = "";
  //     document.body.appendChild(link);
  //     link.click();
  //     document.body.removeChild(link);
  //   }
  // }, [onDownloadTool]);

  const handleSelectAllCheckbox = useCallback((e) => {
    onSelectAllDelete?.(e.target.checked);
  }, [onSelectAllDelete]);

  return (
    <>
      <StyledTableContainerGiveNumber component={Paper} elevation={0}>
        <Table>
          <StyledTableHeadGiveNumber>
            <StyledTableRowGiveNumber>
               {allowMultipleDelete && (
                 <CompactAwareSTTHeaderCell
                   styleAlignItems="center"
                   styleWidth="40px"
                   styleMinWidth="40px"
                   isCompact={isCompact}
                 >
                   <Checkbox
                     indeterminate={
                       selectedDeleteKeys.length > 0 &&
                       selectedDeleteKeys.length < files.length
                     }
                     checked={files.length > 0 && selectedDeleteKeys.length === files.length}
                     onChange={handleSelectAllCheckbox}
                     size="small"
                   />
                 </CompactAwareSTTHeaderCell>
               )}
              <CompactAwareSTTHeaderCell
                styleAlignItems="center"
                styleWidth={isCompact ? "40px" : "60px"}
                styleMinWidth={isCompact ? "40px" : "60px"}
                isCompact={isCompact}
              >
                STT
              </CompactAwareSTTHeaderCell>
              <CompactAwareTableHeaderCell isCompact={isCompact}>
                <StyledTableHeaderTênFile>
                  <span>TÊN TỆP TIN</span>
                  {showDownloadAll && files.length > 0 && (
                    <Tooltip title="Tải xuống tất cả">
                      <StyledIconButton 
                        size="small" 
                        onClick={onDownloadAll}
                      >
                        <StyledCloudDownloadIcon />
                      </StyledIconButton>
                    </Tooltip>
                  )}
                </StyledTableHeaderTênFile>
              </CompactAwareTableHeaderCell>

              {useSecondaryLayout && !hiddenTypeAndSize && (
                <>
                  <CompactAwareTableHeaderCell align="left" isCompact={isCompact}>
                    LOẠI
                  </CompactAwareTableHeaderCell>
                  <CompactAwareTableHeaderCell align="left" isCompact={isCompact}>
                    DUNG LƯỢNG
                  </CompactAwareTableHeaderCell>
                </>
              )}

              {extraColumns.map((col, idx) => (
                <CompactAwareExtraHeader
                  key={col.key || col.header || `extra-head-${idx}`}
                  align={col.align || "left"}
                  colWidth={col.width}
                  customStyles={{
                    ...col.styleHeader,
                    minWidth: col.width || "100px"
                  }}
                  isCompact={isCompact}
                >
                  <Tooltip title={typeof col.header === "string" ? col.header : ""}>
                    <HeaderTextEllipsis styleTextAlign={col.align || "left"}>
                      {col.header}
                    </HeaderTextEllipsis>
                  </Tooltip>
                </CompactAwareExtraHeader>
              ))}

              {!disableActions && (
                <CompactAwareActionHeaderCell
                  styleAlignItems="center"
                  styleWidth={isCompact ? "80px" : "150px"}
                  styleMinWidth={isCompact ? "80px" : "100px"}
                  isCompact={isCompact}
                >
                  {!isCompact && (
                    <Tooltip title={useSecondaryLayout ? "THAO TÁC" : "Hành động"}>
                      <HeaderTextEllipsis styleTextAlign="center">
                        {useSecondaryLayout ? "THAO TÁC" : "Hành động"}
                      </HeaderTextEllipsis>
                    </Tooltip>
                  )}
                </CompactAwareActionHeaderCell>
              )}
            </StyledTableRowGiveNumber>
          </StyledTableHeadGiveNumber>
          <TableBody>
            {files.map((file, index) => {
              const rowKey =
                file?._id || file?.id || file?.fileId || `temp-${index}`;
              const isFileCopyForRow =
                selectedFileCopyKey != null && selectedFileCopyKey === rowKey;

              return (
                <FileRow
                  key={rowKey}
                  file={file}
                  index={index}
                  onPreview={onPreview}
                  onDownload={onDownload}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onOpenIframe={onOpenIframe}
                  onGiveNumber={onGiveNumber}
                  onDigitalSign={onDigitalSign}
                  onSignDraft={onSignDraft}
                  onSignCertificate={onSignCertificate}
                  isView={isView}
                  editFile={editFile}
                  canGiveNumber={canGiveNumber}
                  canCreateFileCopy={canCreateFileCopy}
                  canNotDeleteFile={canNotDeleteFile}
                  objectType={objectType}
                  objectId={objectId}
                  // onShowDownloadTool={handleOpenToolPopup}
                  extraColumns={extraColumns}
                  setReloadDoc={setReloadDoc}
                  documentDetail={documentDetail}
                  documentDetailFull={documentDetailFull}
                  onCreateCertifiedCopyReport={onCreateCertifiedCopyReport}
                  isFileCopy={isFileCopyForRow}
                  isCompact={isCompact}
                  hiddenDownload={hiddenDownload}
                  hiddenPreview={hiddenPreview}
                  isActionMenu={isActionMenu}
                  disableActions={disableActions}
                  isVanThu={isVanThu}
                  useSecondaryLayout={useSecondaryLayout}
                  hiddenTypeAndSize={hiddenTypeAndSize}
                  allowMultipleDelete={allowMultipleDelete}
                  selectedDeleteKeys={selectedDeleteKeys}
                  onToggleSelectDelete={onToggleSelectDelete}
                />
              );
            })}
          </TableBody>
        </Table>
      </StyledTableContainerGiveNumber>

      {/* <Dialog
        open={openToolPopup}
        onClose={handleCloseToolPopup}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Yêu cầu công cụ hỗ trợ"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Chúng tôi không tìm thấy công cụ chỉnh sửa văn bản trên máy của bạn.
            <br />
            <br />
            Vui lòng tải xuống và cài đặt ứng dụng hỗ trợ để sử dụng tính năng
            chỉnh sửa trực tiếp bằng Word/Excel/PowerPoint.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <CustomButton onClick={handleCloseToolPopup}>Đóng</CustomButton>
          <CustomButton
            onClick={handleDownloadToolClick}
            variant="contained"
            autoFocus
            startIcon={<DownloadIcon />}
          >
            Tải xuống ngay (Windows)
          </CustomButton>
          <CustomButton
            onClick={handleDownloadToolClickMac}
            variant="contained"
            autoFocus
            startIcon={<DownloadIcon />}
          >
            Tải xuống ngay (Mac)
          </CustomButton>
        </DialogActions>
      </Dialog> */}
    </>
  );
};

FileTableInPopup.propTypes = {
  files: PropTypes.arrayOf(PropTypes.object),
  onPreview: PropTypes.func,
  onDownload: PropTypes.func,
  onDelete: PropTypes.func,
  onEdit: PropTypes.func,
  onOpenIframe: PropTypes.func,
  onGiveNumber: PropTypes.func,
  onDigitalSign: PropTypes.func,
  onSignDraft: PropTypes.func,
  onSignCertificate: PropTypes.func,
  onSignDigital: PropTypes.func,
  onSignInitial: PropTypes.func,
  allowSignDigital: PropTypes.bool,
  allowSignInitial: PropTypes.bool,
  onDownloadTool: PropTypes.func,
  isView: PropTypes.bool,
  editFile: PropTypes.bool,
  canGiveNumber: PropTypes.bool,
  canNotDeleteFile: PropTypes.bool,
  objectType: PropTypes.string,
  objectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  selectedFileCopyKey: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]),
  extraColumns: PropTypes.arrayOf(
    PropTypes.shape({
      header: PropTypes.node,
      width: PropTypes.string,
      align: PropTypes.oneOf(["left", "center", "right"]),
      render: PropTypes.func,
      styleHeader: PropTypes.object,
      styleCell: PropTypes.object,
    })
  ),
  hiddenPreview: PropTypes.bool,
  isActionMenu: PropTypes.bool,
  onDownloadAll: PropTypes.func,
	showDownloadAll: PropTypes.bool,
	disableActions: PropTypes.bool,
  isVanThu: PropTypes.bool,
  useSecondaryLayout: PropTypes.bool,
  allowMultipleDelete: PropTypes.bool,
  selectedDeleteKeys: PropTypes.array,
  onToggleSelectDelete: PropTypes.func,
  onSelectAllDelete: PropTypes.func,
};

export default FileTableInPopup;
