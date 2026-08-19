import React, { memo, useCallback, useEffect, useState } from "react";
import sharedComponents from "@components/WrapperComponent";
import {
    PanelHeader,
    StyleBoxContainer,
    StyleBoxFoodterEnd,
    StyleContainer,
    StyledContainer,
    StyledDialogContentMobile,
    StyledDialogTitle,
    StyledRowBox,
    StyledTitleText,
} from "@styles/DialogDirective";
import { StyledDialog, StyledDialogContent } from "@styles/CustomDialog.styles";
import RenderTableTree from "./RenderTableTree";
import axiosInstance from "@utils/axiosInstance";
import { API_BOOK_LIST, API_SAVE_BOOK } from "@EnvironmentFile/constants/ulrConfigNew";

function SaveBookModel(props) {
	const {
		sharedComponents,
		open = false,
		label,
		onClose = () => { },
		onCloseAppBar = () => { },
		onCloseDialog = () => { },
		selectedIds,
		setReloadData,
		size,
		dataDetail
	} = props;
	const { Button, LoadingDialog, toast } = sharedComponents;
	const [bookData, setBookData] = useState([]);
	const [loading, setLoading] = useState(false);
	const [selectedBookId, setSelectedBookId] = useState(null);
	const isIncoming = dataDetail?.document?.isIncomming || dataDetail?.isIncomming;
	const documentId = dataDetail?.document?.documentId || dataDetail?.documentId;

	const fetchData = useCallback(async () => {
		setLoading(true);
		try {
			const response = await axiosInstance.get(`${API_BOOK_LIST}?type_document=${isIncoming ? "IncommingDocument" : "OutGoingDocument"}&active=1`)
			setBookData(response.items)
			setLoading(false);

		} catch (error) {
			logger.error("Lỗi khi load dữ liệu:", error);
			toast("Lỗi khi lấy dữ liệu dữ liệu", "error");
		}
	}, [isIncoming, toast]);

	useEffect(() => {
		if (open) {
			fetchData();
		}
	}, [open, fetchData]);

	const isChecked = useCallback(
		(item) => {
			return selectedBookId === item.bookDocumentId;
		},
		[selectedBookId]
	);

	const handleCheckboxChange = useCallback((item, type, checked) => {
		setSelectedBookId(checked ? item.bookDocumentId : null);
	}, []);

	// Auto-select when only one book is available
	useEffect(() => {
		if (bookData && bookData.length === 1) {
			setSelectedBookId(bookData[0]?.bookDocumentId);
		} else if (bookData.length > 1) {
  		const defaultItem = bookData.find(item => item.isDefault === true);

  		if (defaultItem) {
  		  setSelectedBookId(defaultItem?.bookDocumentId); // hoặc field bạn dùng
  		} else {
  		  setSelectedBookId(null);
  		}
		}
	}, [bookData]);

	const onSubmit = useCallback(async () => {
		try {
			const body = {
				documentIds: selectedIds ? selectedIds : [documentId],
				bookDocumentId: selectedBookId,
			};
			logger.log("Body:", body);

			// TODO: Uncomment when ready to call API
			await axiosInstance.post(
				`${API_SAVE_BOOK}`,
				body
			);
			setSelectedBookId(null);
			onCloseDialog();
			onCloseAppBar();
			onClose();
			setReloadData(new Date() * 1);
			toast("Lưu sổ thành công", "success");
		} catch (error) {
			toast(`${error?.response?.data?.message}` || "Có lỗi xảy ra", "error");
		}
	}, [selectedBookId, onCloseDialog, onCloseAppBar, onClose, setReloadData, toast, documentId, selectedIds]);

	const handleClose = () => {
		onCloseDialog();
		setSelectedBookId(null);
	};


	return (
		<>
			<StyledDialog open={open} onClose={onClose} dialogSize={size}>
				<StyleContainer>
					<StyleBoxContainer>
						<StyledDialogTitle>
							<StyledTitleText component="span">{label}</StyledTitleText>
						</StyledDialogTitle>
						<StyledDialogContentMobile>
							<StyledContainer>
								<PanelHeader>
									<RenderTableTree
										data={bookData}
										isChecked={isChecked}
										handleCheckboxChange={handleCheckboxChange}
									/>
									<br />

								</PanelHeader>
							</StyledContainer>
						</StyledDialogContentMobile>
					</StyleBoxContainer>
				</StyleContainer>
				<StyleBoxFoodterEnd>
					<StyledRowBox>
						<Button
							variant="primary"
							onClick={onSubmit}
							disabled={!selectedBookId}
						>
							Gửi
						</Button>
						&emsp;
						<Button variant="error" onClick={handleClose}>Đóng</Button>
					</StyledRowBox>
				</StyleBoxFoodterEnd>
			</StyledDialog>

			<LoadingDialog open={loading}>
				<StyledDialogContent>
					Đang tải dữ liệu, vui lòng chờ trong giây lát...
				</StyledDialogContent>
			</LoadingDialog>
		</>
	);
}

SaveBookModel.displayName = "SaveBookModel";

export default memo(sharedComponents(SaveBookModel));
