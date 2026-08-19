/* eslint-disable react-hooks/exhaustive-deps */
import withSharedComponents from "@components/WrapperComponent";
import React, { useCallback, useState, useEffect, useMemo, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import GeneralInformation from "./AddIncommingDoc/components/GeneralInformation";
import UploadFile from "@components/UploadFile";
// import ProposedTreatment from "./AddIncommingDoc/components/ProposedTreatment";

import { CircularProgress } from "@mui/material";
import { StyledLoadingPopupSignDigital } from "@styles/UploadFile/UploadFile.style";

import FormButton from "@components/FormButton";
import SuggestTransferProcess from "@components/SuggestTransferProcess/indexV2";
import ViewJobToDocument from "@pages/WorkManagement/components/ViewJobToDocument";
import { MAX_DEPTH_LEVEL } from "@variable";
import axiosInstance from "@utils/axiosInstance";
import {
  API_DETAIL_VANBANDEN_DHVB,
  APP_BASE,
  API_REPLACE_VB,
  API_RELATED_COUNTS
} from "@EnvironmentFile/constants/urlConfig";
import { useToast } from "@components/common/ToastProvider";
import CustomTable from "@components/CustomTable/CustomTable";
// import CustomTableStatic from "@components/CustomTable/CustomTableStatic";
import CustomTableTreeStatic from "@components/CustomTableTreeStatic";
import RefuseIncomingTextDialog from "./RefuseIncomingTextDialog";
import { useDispatch, useSelector } from "react-redux";
import { fetchDataJobProfile as fetchDataJobProfileThunk } from "@redux/slices/IncomingDocument/JobProfileSlice";
import { mappedColumns } from "./constantsInDoc";
import { getListOutGoingByIncoming } from "@redux/slices/IncomingDocument/IncommingDocSlice";
import api from "@services/api";
import ViewDialog from "@pages/TextAway/Tab/SigningSubmissionTab/ViewDialog";
import DynamicExportDialog from "@components/DynamicExportDialog";
import ActionButtons from "./ActionButtons";
import { verifyFilesSignature } from "@redux/slices/DigitalSignatureFileSlice/DigitalSignatureFileSlice";
import CustomSwipper from "@components/Swipper/BaseSwiper";


const DATA_COLUMN_CONFIG = [
  { label: "Tên công việc", row: 'name', name: "Tên công việc", width: "400px" },
  { label: "Tiến độ", row: "progressView", name: "Tiến độ", width: "180px", margin: "center" },
  { label: "Bắt đầu", row: "startDate", name: "Bắt đầu", width: "120px", margin: "center" },
  { label: "Hạn kết thúc", row: "endDate", name: "Hạn kết thúc", width: "120px", margin: "center" },
  { label: "Người giao", row: "assigner", name: "Người giao", width: "180px" },
  { label: "Người chủ trì", row: "director", name: "Người chủ trì", width: "180px" },
  { label: "Trạng thái", row: "processStatusUi", name: "Trạng thái", width: "150px", margin: "center" },
];

const COLUMNS_REPLACED_DOC = [
  {
    name: "Tệp đính kèm",
    row: "files",
    width: "200px",
    accessor: (row) => {
      const files = row?.files || [];
      return Array.isArray(files) && files.length > 0
        ? files.map((f) => f.fileName || f.name).join(", ")
        : "-";
    },
  },
  { name: "Số văn bản", row: "documentNumber", width: "150px" },
  { name: "Phương thức nhận", row: "receiveMethodName", width: "150px" },
  { name: "Sổ văn bản đến", row: "bookInName", width: "150px" },
  { name: "Cơ quan gửi", row: "senderUnitName", width: "200px" },
  { name: "Trích yếu", row: "summary", width: "250px" },
  { name: "Ngày trên văn bản", row: "documentDate", width: "120px", margin: "center" },
  { name: "Số đến", row: "receiveNumber", width: "100px", margin: "center" },
];

const TABLE_ITEM_PROPS = { 
  id: "meeting_tasks_table",
  props: { 
    isShowSTT: false, 
    hideCheckbox: true, 
    configs: [
      {
        id: "view-job-detail",
        config: {
          icon: "Visibility",
          displayName: "Xem chi tiết",
          actionType: "view",
          color: "primary",
        },
      },
    ],
  } 
};


const COLUMNS_OUTGOING = [
  { name: "Số đi", row: "number" },
  { name: "Trích yếu", row: "abstract" },
  { name: "Ngày ban hành", row: "issuedDate" },
];

const FILTERS = [
  { name: "Ngày trên VB", code: "documentDate" },
  { name: "Số văn bản", code: "toBook" },
  { name: "Cơ quan gửi", code: "senderUnit" },
];

const COLUMNS_REPLACED_DOC_MAPPED = mappedColumns(COLUMNS_REPLACED_DOC, ["documentDate"]);

const JOB_FILTER_CONFIG = [{ name: "Tên công việc", code: "name" }];

const SEARCHABLE_FIELDS_REPLACED_DOC = [
  { name: "documentType", label: "Loại văn bản", type: "select", options: [
    { label: "Tất cả loại văn bản", value: "" },
    { label: "Tờ trình đến", value: "TotrinhDen" },
    { label: "Kế hoạch của cơ quan cấp trên", value: "KeHoachCapTren" },
    { label: "Văn bản của Hải quan, Cảng vụ", value: "HaiQuanCangVu" },
    { label: "Công văn của Quân bưu", value: "CongVanQuanBuu" },
    { label: "Hồ sơ pháp lý (phòng pháp chế)", value: "HoSoPhapLy" },
    { label: "Thông báo đến", value: "ThongbaoDen" },
    { label: "Hợp đồng/Phụ lục hợp đồng từ", value: "HopDongDoiTac" },
    { label: "Biên bản (làm việc, kiểm tra, nghiệm)", value: "BienBan" },
    { label: "Giấy mời họp", value: "GiayMoiHop" },
    { label: "Đề nghị/Đơn từ từ khách hàng", value: "DeNghiDonTu" },
    { label: "Công văn đến", value: "CongvanDen" },
    { label: "Quyết định đến", value: "QuyetdinhDen" },
    { label: "Giấy giới thiệu", value: "GiayGioiThieu" },
    { label: "Chỉ thị", value: "ChiThi" },
    { label: "Báo cáo đến", value: "BaocaoDen" }
  ] },
  { name: "receiveDate", label: "Ngày đến", type: "dateRange" },
  { name: "isStar", label: "Loại văn bản quan trọng", type: "star" }
];const TabPanel = React.memo(({ children, value, index, visited }) => {
  if (!visited) return null;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`incomming-doc-tabpanel-${index}`}
      aria-labelledby={`incomming-doc-tab-${index}`}
      style={{ display: value === index ? "block" : "none" }}
    >
      {children}
    </div>
  );
});

TabPanel.displayName = "TabPanel";

const InlineTransferTransition = React.memo(({ children, resetKey }) => {
  const [transitionOpen, setTransitionOpen] = useState(false);

  useEffect(() => {
    setTransitionOpen(false);

    const frameId = requestAnimationFrame(() => {
      setTransitionOpen(true);
    });

    return () => cancelAnimationFrame(frameId);
  }, [resetKey]);

  return children(transitionOpen);
});

InlineTransferTransition.displayName = "InlineTransferTransition";


const ViewIncommingDoc = ({
  open,
  onClose,
  documentId,
  sharedComponents,
  setReloadData,
  isAuthority,
}) => {
  const {
    // CustomSwipper,
    CustomTabsWithBadge
  } = sharedComponents;
	const toast = useToast();
	const dispatch = useDispatch();
  const panelContainerRef = useRef(null);
  const [dataDetail, setDataDetail] = useState(null);
  const [openRejectDialog, setOpenRejectDialog] = useState(false);
  const [openFollowDialog, setOpenFollowDialog] = useState(true);
	const [openViewDetail, setOpenViewDetail] = useState({
		openJobDetail: false,
		openRecalled: false,
		openOutgoing: false,
	});
	const [selectedJobData, setSelectedJobData] = useState(null);
	const [selectedOutgoingData, setSelectedOutgoingData] = useState(null);
	// logger.log('selectedJobData', selectedJobData)
  const { control, reset, setValue, getValues } = useForm();
  const [tabValue, setTabValue] = useState(0);
  const [visitedTabs, setVisitedTabs] = useState({ 0: true });

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev[tabValue]) return prev;
      return { ...prev, [tabValue]: true };
    });
  }, [tabValue]);

  const [columnsOutgoingConfig, setColumnsOutgoingConfig] = useState([]);
  const [reloadDoc, setReloadDoc] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  // lấy file ký sao y
  const [signedCopyFiles, setSignedCopyFiles] = useState(null);
  const calledRef = useRef(null);
  const lastReloadDocRef = useRef(reloadDoc);
  const verifiedFilesRef = useRef([]);
  // const lastFetchedCountsKeyRef = useRef(null);
  
  const [tabCounts, setTabCounts] = useState({
    files: 0,
    jobs: 0,
    outgoing: 0,
    replaced: 0
  });
  const { dataUser } = useSelector((state) => state.auth);
  const userData = dataUser
  const groupCodes = userData?.groupCodes

  // State for dynamic form export
  const [openDialogExport, setOpenDialogExport] = useState(false);
  const [suggestionConfig, setSuggestionConfig] = useState(null);
  const [transferConfig, setTransferConfig] = useState(null);

  const handleOpenInlineTransfer = useCallback((config) => {
    const normalizedType =
      config?.availableActionsType ||
      config?.actionType ||
      config?.typeAction ||
      config?.subActionType ||
      (typeof config?.codeAvailableActions === "string" &&
      /confirm[_-]?propose/i.test(config.codeAvailableActions)
        ? "confirmPropose"
        : null);

    setTransferConfig({
      ...config,
      availableActionsType: normalizedType,
    });
  }, []);
	
	const [docStack, setDocStack] = useState([]);
	const currentDocumentId = useMemo(() => {
  	return docStack[docStack.length - 1] || documentId;
	}, [docStack, documentId]);
  const isViewingRecalledDetail = docStack.length > 1;

  const handleCloseSuggestion = useCallback(() => {
    setSuggestionConfig(null);
  }, []);
  const handleCloseTransfer = useCallback(() => {
    setTransferConfig(null);
  }, []);
  const handleCloseInlinePanel = useCallback(() => {
    handleCloseSuggestion();
    handleCloseTransfer();
  }, [handleCloseSuggestion, handleCloseTransfer]);
  const handleReloadAll = useCallback(
    () => {
      setReloadDoc((prev) => prev + 1);
      if (setReloadData) {
        setReloadData((prev) => (typeof prev === "number" ? prev + 1 : !prev));
      }
    },
    [setReloadData]
  );

  // Callback khi chuyển xử lý thành công từ inline panel
  const handleTransferSuccessAndClose = useCallback(() => {
    setSuggestionConfig(null);
    setTransferConfig(null);
    handleReloadAll();
  }, [handleReloadAll]);

	// khi mở dialog, khởi tạo stack = [documentId gốc]
	useEffect(() => {
  	if (open && documentId) setDocStack([documentId]);
  	if (!open) setDocStack([]);
	}, [open, documentId]);

  useEffect(() => {
    const viewConfig = localStorage.getItem("viewConfig");
    if (viewConfig) {
      try {
        const parsedConfig = JSON.parse(viewConfig);
        const configOutgoing = Array.isArray(parsedConfig)
          ? parsedConfig.find((item) => item.code === "OutGoing")
					: null;
        if (configOutgoing?.field) {
          const cols = configOutgoing.field
            .filter((item) => item.showInList)
            .map((item) => ({
              name: item.label,
              row: item.name,
            }));
          setColumnsOutgoingConfig(cols);
        }
      } catch (error) {
        // console.error("Error parsing viewConfig", error);
      }
    }
  }, []);


  // Hàm map lại dữ liệu chi tiết từ API sang primitive cho form
  const mapDetailToFormValues = (doc) => {
    if (!doc) return {};
    const bookId = (doc.bookDocumentId && typeof doc.bookDocumentId === 'object')
      ? (doc.bookDocumentId.book_document_id || doc.bookDocumentId.id || doc.bookDocumentId._id)
      : doc.bookDocumentId;
    return {
      ...doc,
      senderUnit: doc.senderUnit?._id || "",
      receiverUnit: doc.receiverUnit?._id || "",
      receiveMethod: doc.receiveMethod?.value || "",
      privateLevel: doc.privateLevel?.value || "",
      urgencyLevel: doc.urgencyLevel?.value || "",
      documentType: doc.documentType?.value || "",
      documentField: doc.documentField?.value || "",
      bookDocumentId: bookId,
      receiveDate: doc.receiveDate ? new Date(doc.receiveDate) : null,
      documentDate: doc.documentDate ? new Date(doc.documentDate) : null,
      resolutionDeadline: doc.resolutionDeadline ? new Date(doc.resolutionDeadline) : null,
      deadline: doc.deadline ? new Date(doc.deadline) : null,
    };
  };

  useEffect(() => {
    // const fetchDetailNew = async () => {
    //   if (open && documentId) {
    //     try {
    //       let url = API_DETAIL_VANBANDEN_DHVB(documentId);
    //       if (isAuthority) {
    //         url += "?isAuthority=true";
    //       }
    //       const response = await axiosInstance.get(url);
    //       setDataDetail(response);
    //       reset(response?.document || {});
    //     } catch (error) {
    //       toast("Có lỗi xảy ra khi lấy chi tiết văn bản", "error");
    //     }
    //   }
    // };
    // fetchDetailNew();
		if (!open) {
			calledRef.current = null;
			return;
		}

		const isReload = reloadDoc !== lastReloadDocRef.current;
		lastReloadDocRef.current = reloadDoc;

		if (!isReload && calledRef.current === currentDocumentId) return;
		calledRef.current = currentDocumentId;

		const fetchDetail = async () => {
			if (open && currentDocumentId) {
        try {
          setIsLoading(true);
          // 1. Lấy chi tiết văn bản
					let url = API_DETAIL_VANBANDEN_DHVB(currentDocumentId);
          if (isAuthority) {
            url += "?isAuthority=true";
          }
          const response = await axiosInstance.get(url);
          const docData = response?.document || {};
          setOpenFollowDialog(docData?.isFollow);

          // Render ngay lập tức các nút xử lý nghiệp vụ bằng cách set dataDetail thô
          setDataDetail(response);

          // Trì hoãn việc mapping file và reset form (phần nặng nhất) sang tick tiếp theo để ưu tiên render nút
          setTimeout(() => {
            const filesFromDetail = docData.files || [];
            const initialFileList = filesFromDetail.map((file) => ({
              _id: file._id || file.id || file.fileId || Math.random().toString(),
              fileId: file.fileId || file._id || file.id,
              name: file.fileName || file.file_name || file.name || "",
              fileName: file.fileName || file.file_name || file.name || "",
              path: file.filePath || file.file_path || file.path || "",
              size: file.fileSize || file.file_size || file.size || 0,
              mimetype: file.mimeType || file.mime_type || file.mimetype || "",
              createdAt: file.createdAt || file.created_at || new Date().toISOString(),
              isCertifiedCopy: Boolean(file.isCertifiedCopy ?? file.is_certified_copy ?? false),
              isImportant: Boolean(file.isImportant ?? file.is_important ?? false),
            }));

            setDataDetail((prev) => {
              if (!prev) return prev;
              return { ...prev, files: initialFileList };
            });

            reset({
              ...mapDetailToFormValues(docData),
              fileids: initialFileList,
            });
          }, 0);

          // 2. Lấy danh sách file từ API mới chạy ngầm (background)
          const fetchFilesListBackground = async () => {
            try {
              const objectType = "incommingdocument";
              const filesApiUrl = `${APP_BASE}/api/files/by-object?object_type=${objectType}&object_id=${currentDocumentId}`;
              const filesResponse = await axiosInstance.get(filesApiUrl);
              const filesData = Array.isArray(filesResponse)
                ? filesResponse
                : filesResponse.data || [];

              if (Array.isArray(filesData)) {
                const filesFromDetail = docData.files || [];
                const fileList = filesData.map((file) => {
                  const currentName = file.file_name || "";
                  const foundInDetail = filesFromDetail.find((df) => {
                    const detailName = df.fileName || df.file_name || "";
                    return (
                      currentName === detailName ||
                      currentName.endsWith(detailName) ||
                      detailName.endsWith(currentName)
                    );
                  });
                  return {
                    _id: file.id,
                    fileId: foundInDetail?.fileId || file.id,
                    name: file.file_name,
                    fileName: file.file_name,
                    path: file.file_path,
                    size: file.file_size,
                    mimetype: file.mime_type,
                    createdAt: file.created_at,
                    isCertifiedCopy: Boolean(
                      file.isCertifiedCopy ??
                      file.is_certified_copy ??
                      false
                    ),
                    isImportant: Boolean(
                      file.isImportant ??
                      file.is_important ??
                      false
                    ),
                  };
                });

                fileList.sort(
                  (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
                );

                // Cập nhật lại danh sách file mà không chặn render các nút nghiệp vụ
                setDataDetail((prev) => {
                  if (!prev) return prev;
                  return { ...prev, files: fileList };
                });
                setValue("fileids", fileList);
              }
            } catch (err) {
              logger.error("Lỗi lấy danh sách file đính kèm:", err);
            }
          };

          fetchFilesListBackground();

				} catch (error) {
					const messageError = error?.response?.data?.message || error?.message || "Có lỗi xảy ra khi lấy chi tiết văn bản";
          logger.error(messageError);
          toast(messageError, "error");
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchDetail();
		// }, [open, documentId, reset, toast, isAuthority]);
		 }, [open, currentDocumentId, reset, toast, isAuthority, reloadDoc]);

	useEffect(() => {
		const filesFromDetail = dataDetail?.files || dataDetail?.document?.files || [];
		if (open && filesFromDetail.length > 0) {
			const pdfFileIds = filesFromDetail
				.filter((file) => {
					const fileName = file.fileName || file.file_name || "";
					return fileName.toLowerCase().endsWith(".pdf");
				})
				.map((file) => file.fileId)
				.filter(Boolean);

			// Remove duplicates
			const uniqueFileIds = [...new Set(pdfFileIds)];

			const isSame = uniqueFileIds.length === verifiedFilesRef.current.length &&
				uniqueFileIds.every((id) => verifiedFilesRef.current.includes(id));

			if (uniqueFileIds.length > 0 && !isSame) {
				verifiedFilesRef.current = uniqueFileIds;
				dispatch(verifyFilesSignature(uniqueFileIds));
			}
		}
	}, [open, dataDetail, dispatch]);


	const handleOpenRecalledDetail = useCallback((rowData) => {
  	const nextId =
			rowData?.documentId ||
			rowData?.document_id ||
    	rowData?._id ||
    	rowData?.id;

  	if (!nextId) return;
		
  	setDocStack((prev) => {
  	  const cur = prev[prev.length - 1];
  	  if (String(cur) === String(nextId)) return prev; // tránh push trùng
  	  return [...prev, nextId];
  	});
	
  	// optional: về tab 0 cho dễ hiểu
  	setTabValue(0);
	}, []);

  // Cung cấp dữ liệu form hiện tại cho TransferProcess để cập nhật bookDocumentId khi Chuyển xử lý
  const getFormDataForUpdate = useCallback(() => {
    const currentData = getValues();
    const detailDoc = dataDetail?.document || dataDetail;
    let normalizedFileIds = "";

    if (Array.isArray(currentData?.fileids)) {
      const ids = currentData.fileids
        .map((file) => file?._id || file?.id)
        .filter(Boolean);
      normalizedFileIds = ids.join(",");
    } else if (typeof currentData?.fileids === "string") {
      normalizedFileIds = currentData.fileids;
    }

    const normalizedToBookCode =
      currentData?.toBookCode !== null && currentData?.toBookCode !== undefined
        ? String(currentData.toBookCode)
        : "";

    const originalBookDocumentId = detailDoc?.bookDocumentId && typeof detailDoc.bookDocumentId === 'object'
      ? (detailDoc.bookDocumentId.book_document_id || detailDoc.bookDocumentId.id || detailDoc.bookDocumentId._id)
      : detailDoc?.bookDocumentId;

    const currentBookDocumentId = currentData?.bookDocumentId;
    const hasChanged =
      currentBookDocumentId !== null &&
      currentBookDocumentId !== undefined &&
      String(currentBookDocumentId) !== String(originalBookDocumentId ?? "");

    return {
      body: {
        ...currentData,
        toBookCode: normalizedToBookCode,
        fileids: normalizedFileIds,
        documentId: currentDocumentId,
      },
      hasChanged,
    };
	}, [getValues, dataDetail, currentDocumentId]);
	
  const handleOpenRejectDialog = useCallback(() => {
    setOpenRejectDialog(true);
  }, []);
  const handleCloseRejectDialog = useCallback(() => {
    setOpenRejectDialog(false);
  }, []);
  const handleRejectSuccess = useCallback(() => {
    handleCloseRejectDialog();
    handleReloadAll();
  }, [handleCloseRejectDialog, handleReloadAll]);
  // Filter out the 'recallText' action from dataDetail.availableActions
  // const filteredAvailableActions = useMemo(() => {
  //   if (!dataDetail?.availableActions) return [];
  //   return dataDetail.availableActions.filter(
  //     (action) => action.type !== "recallText"
  //   );
  // }, [dataDetail?.availableActions]);

  const handleTabChange = useCallback((event, newValue) => {
    setTabValue(newValue);
  }, []);


  const fetchDataJobProfileForDoc = useCallback(
		async ({ page, limit, query, sort, ...rest }) => {
			if (!page || !limit) {
				return { data: [], total: 0 };
			}
			try {
				const isAuthorityParam = dataDetail?.document?.isAuthority;
				const response = await dispatch(
          fetchDataJobProfileThunk({ 
            page, 
            limit: limit || 25, 
            sort, 
            ...rest,
						// docId: documentId, 
						docId: currentDocumentId,
            query,
            ...(isAuthorityParam && { isAuthority: isAuthorityParam })
          })
				).unwrap();
				return {
					data: response.data || [],
					total: response.total || response.length || 0,
				};
			} catch (error) {
				return { data: [], total: 0 };
			}
		},
		// [dispatch, documentId, dataDetail?.document?.isAuthority]
		[dispatch, currentDocumentId, dataDetail?.document?.isAuthority]
	);


  const fetchDataOutGoingByIncoming = useCallback(
		async ({ page, limit, query, sort }) => {
			if (!page || !limit) {
				return { data: [], total: 0 };
			}
			try {
				const isAuthorityParam = dataDetail?.document?.isAuthority;
				const response = await dispatch(
          getListOutGoingByIncoming({ 
            page, 
            limit, 
            sort, 
						// docId: documentId, 
						docId: currentDocumentId,
            query,
            // ...(startDate && endDate && { startDate, endDate }),
            ...(isAuthorityParam && { isAuthority: isAuthorityParam })
          })
				).unwrap();
				return {
					data: response.data || [],
					total: response.total || response.length || 0,
				};
			} catch (error) {
				return { data: [], total: 0 };
			}
		},
		// [dispatch, documentId, dataDetail?.document?.isAuthority]
		[dispatch, currentDocumentId, dataDetail?.document?.isAuthority]
	);

  const fetchDataReplacedDoc = useCallback(
    async ({ page, limit, sort, startDate, endDate, query, code, ...advancedValues }) => {
      if (!page || !limit || !currentDocumentId) {
        return { data: [], total: 0 };
      }
      try {
        const isAuthorityParam = dataDetail?.document?.isAuthority;
        
        // Xây dựng params cho API
        const params = {
          page,
          limit,
          sort,
          ...(startDate && endDate && { startDate, endDate }),
          ...(isAuthorityParam && { isAuthority: isAuthorityParam }),
          ...advancedValues,
        };
        
        if (query && code) {
          const fields = Array.isArray(code) ? code : [code];
          fields.forEach(field => {
            if (field) {
              params[`filter[${field}]`] = query;
            }
          });
        }

        const response = await axiosInstance.get(`${API_REPLACE_VB}/${currentDocumentId}`, {
          params
        });

        // Kiểm tra cấu trúc trả về của API
        const responseData = response?.data?.items || response?.items || response?.data?.data || response?.data || response || [];
        const total = response?.data?.total || response?.total || responseData?.total || (Array.isArray(responseData) ? responseData.length : 0);
        
        return {
          data: Array.isArray(responseData) ? responseData : (responseData?.items || []),
          total: total,
        };
      } catch (error) {
        return { data: [], total: 0 };
      }
    },
    [currentDocumentId, dataDetail?.document?.isAuthority]
  );


  // Update files count separately when dataDetail changes
  useEffect(() => {
    if (dataDetail?.files) {
      setTabCounts((prev) => ({
        ...prev,
        files: dataDetail.files.length
      }));
    }
  }, [dataDetail?.files]);

  // Fetch related counts for tabs (VB ĐI, CV PHÁT SINH, VĂN BẢN THAY THẾ)
  useEffect(() => {
    const fetchRelatedCounts = async () => {
      if (!open || !currentDocumentId) return;
      try {
        const response = await axiosInstance.get(`${API_RELATED_COUNTS}/${currentDocumentId}`);
        const data = response?.data?.data || response?.data || {};
        setTabCounts((prev) => ({
          ...prev,
          outgoing: data.VBDI || 0,
          jobs: data.CVPS || 0,
          replaced: data.VBTT || 0
        }));
      } catch (error) {
        logger.error("Error fetching related counts:", error);
      }
    };

    fetchRelatedCounts();
  }, [open, currentDocumentId, reloadDoc]);



  const handleExportInDetailRecall = useCallback(
    async (params) => {
      if (!documentId) return null;

      try {
        const response = await api.get(`${APP_BASE}/api/data-export/list`, {
          params: {
            viewConfigCode: 'Incomming',
            recordId: documentId,
            ...params,
          },
          responseType: "blob",
        });

        return response.data;
      } catch (error) {
        toast("Có lỗi xảy ra khi xuất file.", "error");
        return null;
      }
    },
    [documentId, toast]
  );


  const handleExportInDetailOutGoing = useCallback(
    async (params) => {
      if (!currentDocumentId) return null;

      try {
        const response = await api.get(`${APP_BASE}/api/data-export/list`, {
          params: {
            viewConfigCode: 'OutGoing',
            recordId: currentDocumentId,
            ...params,
          },
          responseType: "blob",
        });

        return response.data;
      } catch (error) {
        toast("Có lỗi xảy ra khi xuất file.", "error");
        return null;
      }
    },
    [currentDocumentId, toast]
  );

  const handleOpenExportDialog = useCallback(() => {
    setOpenDialogExport(true);
  }, []);

  const handleCloseExport = useCallback(() => {
    setOpenDialogExport(false);
  }, []);

	const handleOpenJobDetail = useCallback((id, rowData) => {
		const dataToUse = rowData || id;
		const nextId = dataToUse?.documentId || dataToUse?.id || dataToUse;
    setSelectedJobData(nextId);
    setOpenViewDetail((prev) => ({ ...prev, openJobDetail: true }));
	}, []);

	const handleOpenOutgoingDetail = useCallback((id, rowData) => {
		const nextId = rowData?.documentId || id;
    setSelectedOutgoingData(nextId);
    setOpenViewDetail((prev) => ({ ...prev, openOutgoing: true }));
	}, []);

	const handleCloseSwipper = useCallback(() => {
  	setDocStack((prev) => {
  	  if (prev.length > 1) {
  	    // đang xem B -> back về A
  	    return prev.slice(0, -1);
  	  }
  	  // đang ở A -> đóng thật
  	  onClose();
  	  return [];
  	});
	}, [onClose]);

  const handleTaskAction = useCallback((action, row) => {
    if (action.id === "view-job-detail") {
      handleOpenJobDetail(row?.id, row);
    }
  }, [handleOpenJobDetail]);


  const handleFollowDialog = useCallback(async () => {
    try {
      const body = {
        documentId: dataDetail?.document?.documentId,
        isFollow: openFollowDialog
			}
			const isAuthority = dataDetail?.document?.isAuthority;
			const params = isAuthority ? { isAuthority } : {};
      const response = await axiosInstance.post(`${APP_BASE}/api/documents/follow`, body, { params });
      if (response) {
        toast(openFollowDialog ? "Theo dõi thành công" : "Bỏ theo dõi thành công", "success");
        setOpenFollowDialog(!openFollowDialog)
      }
    } catch (error) {
      logger.log('error', error)
      toast(error?.response?.data?.message || "Có lỗi xảy ra", "error");

    }
  }, [openFollowDialog, setOpenFollowDialog, toast, dataDetail?.document?.documentId])
	
  // const handleOpenRecallDetail = useCallback((rowData) => {
  //   setSelectedRecalledData(rowData);
  //   setOpenViewDetail((prev) => ({ ...prev, openRecalled: true }));
  // }, []);

  const handleCloseViewDetail = useCallback(() => {
    setOpenViewDetail((prev) => ({ ...prev, openJobDetail: false, openRecalled: false, openOutgoing: false }));
		setSelectedJobData(null);
		setSelectedOutgoingData(null);
  }, []);

  const handleJobDetailSuccess = useCallback(() => {
    setReloadData((prev) => prev + 1);
    handleCloseViewDetail();
  }, [setReloadData, handleCloseViewDetail]);

  // Memoized tab contents to avoid expensive re-renders on parent state updates
  const tabUploadContent = useMemo(() => {
    return (
      <Controller
        name="fileids"
        control={control}
        defaultValue={[]}
        render={({ field }) => (
          <UploadFile
            id="doc-upload-file-tab"
            label="VĂN BẢN ĐÍNH KÈM"
            value={field.value}
            onChange={field.onChange}
            isView
            objectType="incommingdocument"
            objectId={currentDocumentId || null}
            setSignedCopyFiles={setSignedCopyFiles}
            sharedComponents={sharedComponents}
            manualUpload={!currentDocumentId}
            documentDetail={dataDetail}
            documentDetailFull={dataDetail}
            isColumnOfTextToCopy
            hiddenUploadAndScan
            noneBorder
            setReloadDoc={setReloadDoc}
            showDownloadAll={!isViewingRecalledDetail}
            hideLabelWhenClosed
            hiddenTitle
            hiddenToggleIcon
            disableActions={isViewingRecalledDetail}
            hiddenDownload={isViewingRecalledDetail}
            hiddenPreview
            showSignatureIcon
            hiddenNeedCertifiedSign={(dataDetail?.document?.bpmnVersion =='PHUC_DAP_DV_CON' || dataDetail?.bpmnVersion =='PHUC_DAP_DV_CON')}
          />
        )}
      />
    );
  }, [control, currentDocumentId, dataDetail, sharedComponents, isViewingRecalledDetail]);

  const tabOutgoingContent = useMemo(() => {
    return (
      <CustomTable
        fetchData={fetchDataOutGoingByIncoming}
        columns={columnsOutgoingConfig.length > 0 ? columnsOutgoingConfig : COLUMNS_OUTGOING}
        filter={FILTERS}
        disableAdd
        disableDelete
        disableDeletePQ
        disableEdit
        disableSynchronize
        onView={handleOpenOutgoingDetail}
        isExportInDetail
        onExportInDetail={handleExportInDetailOutGoing}
        fileName="Danh sách văn bản"
        autoHeight
      />
    );
  }, [fetchDataOutGoingByIncoming, columnsOutgoingConfig, handleOpenOutgoingDetail, handleExportInDetailOutGoing]);

  const tabJobsContent = useMemo(() => {
    return (
      <CustomTableTreeStatic
        fetchData={fetchDataJobProfileForDoc}
        type="meeting_tasks_tree"
        item={TABLE_ITEM_PROPS}
        columns={DATA_COLUMN_CONFIG}
        onAction={handleTaskAction}
        disableEdit
        disableDelete
        disableAdd
        filter={JOB_FILTER_CONFIG}
        onSelectView={handleOpenJobDetail}
        onView={handleOpenJobDetail}
        autoHeight
      />
    );
  }, [fetchDataJobProfileForDoc, handleTaskAction, handleOpenJobDetail]);

  const tabReplacedContent = useMemo(() => {
    return (
      <CustomTable
        fetchData={fetchDataReplacedDoc}
        columns={COLUMNS_REPLACED_DOC_MAPPED}
        filter={FILTERS}
        searchableFields={SEARCHABLE_FIELDS_REPLACED_DOC}
        disableAdd
        disableDeletePQ
        disableEdit
        anableSTT
        disableBL
        isSetting
        codeModule="Incomming"
        isExportInDetail
        disableSynchronize
        onView={handleOpenRecalledDetail}
        onExportInDetail={handleExportInDetailRecall}
        fileName="Danh sách văn bản bị thay thế"
        autoHeight
      />
    );
  }, [fetchDataReplacedDoc, handleOpenRecalledDetail, handleExportInDetailRecall]);

  return (
    <>
      <CustomSwipper
				open={open}
				onClose={handleCloseSwipper}
        // onClose={onClose}
        title="Chi tiết văn bản tiếp nhận"
        type="view"
        hideBackdrop
        forceDesktopActions
        setReloadData={setReloadData}
        moreActions={
          <>
            {/* <sharedComponents.ButtonOutline
              onClick={handleOpenExportDialog}
              variant="outlined"
            >
              XUẤT BIỂU MẪU
            </sharedComponents.ButtonOutline> */}

            {dataDetail?.flags?.canReject && (
              <sharedComponents.ButtonOutline
                onClick={handleOpenRejectDialog}
                variant="outlined"
              >
                TỪ CHỐI
              </sharedComponents.ButtonOutline>
            )}
          
          
            <FormButton
              dataDetail={dataDetail}
              setReloadData={handleReloadAll}
              isView
              getFormDataForUpdate={getFormDataForUpdate}
              signedCopyFiles={signedCopyFiles}
              panelContainerRef={panelContainerRef}
              onOpenSuggestion={setSuggestionConfig}
              onOpenInlineTransfer={handleOpenInlineTransfer}
              onCloseInlinePanel={handleCloseInlinePanel}
            />
            <sharedComponents.ButtonOutline
              onClick={handleFollowDialog}
              variant="primary"
              // startIcon={<RssFeedIcon />}
            >
              {openFollowDialog ? 'THEO DÕI' : 'BỎ THEO DÕI'}
            </sharedComponents.ButtonOutline>

            <ActionButtons
              dataDetail={dataDetail?.document}
              handleOpenExportDialog={handleOpenExportDialog}
              groupCodes={groupCodes}
              onCloseInlinePanel={handleCloseInlinePanel}
            />
          </>
        }
      >
        {isLoading && (
          <StyledLoadingPopupSignDigital>
            <CircularProgress />
          </StyledLoadingPopupSignDigital>
        )}

        {/* <CustomTabsWithBadge
          tabs={[{ label: "Thông tin chung" }, { label: "Văn bản bị thu hồi" }, { label: "Hồ sơ công việc" }, { label: "Văn bản đi" }]}
          value={tabValue}
          onChange={handleTabChange}
        /> */}
        <GeneralInformation
          control={control}
          isView
          setValue={setValue}
          dataDetail={dataDetail}
          dataDetailFull={dataDetail}
          disableReceiverUnitTreeView
          documentId={documentId}
          isColumnOfTextToCopy
					setReloadDoc={setReloadDoc}
          panelContainerRef={panelContainerRef}
          isSuggestionOpen={!!suggestionConfig || !!transferConfig}
          suggestionInterface={
            suggestionConfig ? (
              <InlineTransferTransition resetKey={suggestionConfig}>
                {(transitionOpen) => (
                  <SuggestTransferProcess 
                    {...suggestionConfig}
                    open={transitionOpen}
                    inline
                    onClose={handleCloseSuggestion}
                    onCloseDialog={handleCloseSuggestion}
                    onCloseAppBar={handleTransferSuccessAndClose}
                    maxDepthLevel={MAX_DEPTH_LEVEL}
                  />
                )}
              </InlineTransferTransition>
            ) : transferConfig ? (
              <React.Suspense fallback={null}>
                <InlineTransferTransition resetKey={transferConfig}>
                  {(transitionOpen) => React.createElement(
                    transferConfig.secType === 'suggestionHandling'
                      ? sharedComponents.SubmitProposal
                      : sharedComponents.TransferProcess,
                    {
                      ...transferConfig,
                      open: transitionOpen,
                      inline: true,
                      onClose: handleCloseTransfer,
                      onCloseDialog: handleCloseTransfer,
                      onCloseAppBar: handleTransferSuccessAndClose,
                      getFormDataForUpdate: getFormDataForUpdate,
                      availableActionsType:
                        transferConfig?.availableActionsType ||
                        transferConfig?.actionType ||
                        transferConfig?.typeAction ||
                        null,
                    }
                  )}
                </InlineTransferTransition>
              </React.Suspense>
            ) : null
          }
        >
          <div style={{ padding: "0" }}>
            <div style={{ marginLeft: '45px' }}>
              <CustomTabsWithBadge
                tabs={[
                  { 
                    label: `VB ĐÍNH KÈM ${tabCounts.files > 0 ? `(${tabCounts.files})` : ""}`
                  },
                  { 
                    label: `VB ĐI ${tabCounts.outgoing > 0 ? `(${String(tabCounts.outgoing).padStart(2, '0')})` : ""}`
                  },
                   { 
                    label: `CV PHÁT SINH ${tabCounts.jobs > 0 ? `(${String(tabCounts.jobs).padStart(2, '0')})` : ""}`
                  },
                  { 
                    label: `VĂN BẢN THAY THẾ ${tabCounts.replaced > 0 ? `(${tabCounts.replaced})` : ""}`
                  }
                ]}
                value={tabValue}
                onChange={handleTabChange}
              />
            </div>
            <div style={{ marginTop: "8px" }}>
              <TabPanel value={tabValue} index={0} visited={visitedTabs[0]}>
                {tabUploadContent}
              </TabPanel>

              <TabPanel value={tabValue} index={1} visited={visitedTabs[1]}>
                {tabOutgoingContent}
              </TabPanel>

              <TabPanel value={tabValue} index={2} visited={visitedTabs[2]}>
                {tabJobsContent}
              </TabPanel>

              <TabPanel value={tabValue} index={3} visited={visitedTabs[3]}>
                {tabReplacedContent}
              </TabPanel>
            </div>
          </div>
        </GeneralInformation>
      </CustomSwipper>
      <RefuseIncomingTextDialog
        open={openRejectDialog}
        onClose={handleCloseRejectDialog}
        onSuccess={handleRejectSuccess}
        docIds={documentId} // Pass the documentId to the dialog
        documentData={dataDetail?.document}
      />
      <ViewJobToDocument
        open={openViewDetail.openJobDetail}
        onClose={handleCloseViewDetail}
        onSuccess={handleJobDetailSuccess}
        documentId={selectedJobData}
        setReloadData={setReloadData}
			/>
			
    {selectedOutgoingData && (
        <ViewDialog
            open={openViewDetail.openOutgoing}
            onClose={handleCloseViewDetail}
            documentId={
                typeof selectedOutgoingData === 'object' 
                    ? (selectedOutgoingData?.documentId || selectedOutgoingData?.id || selectedOutgoingData?._id)
                    : selectedOutgoingData
            }
            setReloadData={setReloadData}
        />
    )}

      <DynamicExportDialog
        open={openDialogExport}
        onClose={handleCloseExport}
        documentId={currentDocumentId}
        typeDocument="IncommingDocument"
        isAuthority={isAuthority}
      />
    </>
  );
};

export default withSharedComponents(ViewIncommingDoc);
