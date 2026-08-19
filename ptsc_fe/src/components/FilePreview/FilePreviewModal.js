import React from "react";
import PropTypes from "prop-types";
import { CircularProgress } from "@mui/material";
import FilePreviewDialog from "@components/UploadFile/components/FilePreviewDialog";
import {
	StyledLoadingPopupSignDigital,
} from "@styles/UploadFile/UploadFile.style";

export default function FilePreviewModal({
	open,
	onClose,
	fileName,
	url,
	loading,
	verificationResult = null,
	showSignatureIcon = true,
	hiddenDownload = false,
}) {
	return (
		<>
			<FilePreviewDialog
				open={open}
				onClose={onClose}
				fileName={fileName}
				url={url}
				hiddenDownload={hiddenDownload}
				verificationResult={verificationResult}
				showSignatureIcon={showSignatureIcon}
			/>
			{loading && (
				<StyledLoadingPopupSignDigital>
					<CircularProgress />
				</StyledLoadingPopupSignDigital>
			)}
		</>
	);
}

FilePreviewModal.propTypes = {
	open: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	fileName: PropTypes.string,
	url: PropTypes.string,
	loading: PropTypes.bool,
	verificationResult: PropTypes.object,
	showSignatureIcon: PropTypes.bool,
	hiddenDownload: PropTypes.bool,
};
