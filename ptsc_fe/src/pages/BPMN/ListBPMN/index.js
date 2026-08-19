import React, { useCallback, useState } from "react";

// import CustomTable from "@components/CustomTable/CustomTableClone_1";

import {
	useDispatch,
	//  useSelector
} from "react-redux";

import { columnTable, filters } from "./constants";
// import { getDetailBusiness } from "@redux/slices/CitizenBusinessInfo/businessInfoSlice";

import { useToast } from "@components/common/ToastProvider";
import { fetchListFormBpmn, addFormBpmn, deleteBpmn } from "@redux/slices/BPMN/BpmnSlice";
import FormBpmn from "./FormBpmn";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import DeleteDialog from "./DeleteDialog";
import CustomTable from "@components/CustomTable/CustomTable";

function ListBPMN() {
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const [selectedIds, setSelectedIds] = useState();
	const [isLoading, setIsLoading] = useState(false);


	// const { businessDetail } = useSelector((state) => state.businessInfoSlice);
	const toast = useToast();

	const [openDialogs, setOpenDialogs] = useState({
		delete: false,
		view: false,
		add: false,
		edit: false,
	});

	const [refreshTrigger, setRefreshTrigger] = useState(0);

	const {
		control,
		//   reset,
		getValues,
		//   trigger,
		formState: { errors },
		// setError
	} = useForm({
		//   resolver: yupResolver(docTypeDynamicMetadataSchema),
		//   defaultValues: defaultFormValuesDocTypeDynamicMetadata,
	});

	// const [latestUpdatedId, setLatestUpdatedId] = useState(null);

	// logger.log(businessDetail);

	// const handleOpenDialog = (dialogKey, idsOrRecord = null) => {
	// 	// if (idsOrRecord) {
	// 	//   dispatch(getDetailBusiness({ id: idsOrRecord }));
	// 	// }
	// 	setSelectedIds(idsOrRecord);
	// 	setOpenDialogs((prev) => ({ ...prev, [dialogKey]: true }));
	// };

	// const handleCloseDialog = (dialogKey) => {
	// 	setOpenDialogs((prev) => ({ ...prev, [dialogKey]: false }));
	// };

	const handleOpenDialog = useCallback((dialogKey, idsOrRecord = null) => {
		setSelectedIds(idsOrRecord);
		setOpenDialogs((prev) => ({ ...prev, [dialogKey]: true }));
	}, []);

	const handleCloseDialog = useCallback((dialogKey) => {
		setOpenDialogs((prev) => ({ ...prev, [dialogKey]: false }));
	}, []);

	const fetchDataFromApi = useCallback(
		async ({ page, limit, query, code, sort }) => {
		  if (!page || !limit) {
			return { data: [], total: 0 };
		  }
		  try {
			const params = {
			  page,
			  limit,
			};
	
			// Chỉ thêm query và code khi có giá trị
			if (query && query.trim() !== "") {
			  params.query = query.trim();
			  if (code && Array.isArray(code) && code.length > 0) {
				params.code = code;
			  }
			}
	
			if (sort) {
			  params.sort = sort;
			}
	
			const response = await dispatch(fetchListFormBpmn(params)).unwrap();
			return {
			  data: response.data || [],
			  total: response.total || response.length || 0,
			};
		  } catch (error) {
			toast("Lỗi khi tải dữ liệu!", "error");
			return { data: [], total: 0 };
		  }
		},
		[dispatch, toast]
	);
	const onAdd = async (data) => {
		// logger.log(data);
		try {
			// const result = await dispatch(addFormBpmn(data)).unwrap();
			await dispatch(addFormBpmn(data)).unwrap();
			handleCloseDialog("add");
			setRefreshTrigger((prev) => prev + 1);
			toast(`Thêm mới thành công`, "success");
		} catch (error) {
			toast(`Lỗi khi thêm mới`, "error");
		}
	};

	const handleDelete = async () => {
		setIsLoading(true);
		// Chuyển đổi selectedIds thành mảng nếu nó là một chuỗi
		const idsToDelete = Array.isArray(selectedIds) ? selectedIds : [selectedIds];

		if (!idsToDelete.length || !idsToDelete[0]) {
			toast("Vui lòng chọn ít nhất một dòng để xóa!", "warning");
			setIsLoading(false);
			return;
		}

		try {
			await Promise.all(idsToDelete.map((id) => dispatch(deleteBpmn({ ids: id }))));
			handleCloseDialog("delete");
			setSelectedIds(null); // Reset về null
			setRefreshTrigger((prev) => prev + 1);
			setIsLoading(false);
			toast(`Đã xóa ${idsToDelete.length} bản ghi thành công!`, "success");
		} catch (error) {
			toast("Đã xảy ra lỗi khi xóa!", "error");
			setIsLoading(false);
		}
	};

	const handleDeleteClick = useCallback((ids) => {
		handleOpenDialog("delete", ids);
	}, [handleOpenDialog]);

	const handleAddClick = useCallback(() => navigate('/list-bpmn/add'), [navigate]);
	const handleEditClick = useCallback((id) => navigate(`/list-bpmn/${id}`), [navigate]);

	const handleCloseAddDialog = useCallback(() => handleCloseDialog("add"), [handleCloseDialog]);
	const handleCloseDeleteDialog = useCallback(() => handleCloseDialog("delete"), [handleCloseDialog]);

	return (
		<>
			<CustomTable
				codeModule="BPMN"
				showCustomDeleteButton
				fetchData={fetchDataFromApi}
				columns={columnTable}
				filter={filters}
				disableMore
				disableSynchronize
				disableDetail
				// onDelete={(ids) => handleOpenDialog("delete", ids)}
				onDelete={handleDeleteClick}
				// onView={(id) => handleOpenDialog("view", id)}
				// onAdd={(id) => handleOpenDialog("add", id)}
				// onAdd={() => navigate(`/list-bpmn/add`)}
				// onEdit={(id) => navigate(`/list-bpmn/${id}`)}
				onAdd={handleAddClick}
				onEdit={handleEditClick}
				refreshTrigger={refreshTrigger}
				keyField="_id"
				isCheckTitle
				styledMaxHeight={120}
				footerGap={10}
				hidePaginationWhenEmpty
				filterPopupAlignLeft
				encodeHtml
				// latestUpdatedId={latestUpdatedId}
				>
				<FormBpmn
					title="Thêm mới biểu mẫu quy trình"
					open={openDialogs.add}
					control={control}
					getValues={getValues}
					// onClose={() => handleCloseDialog("add")}
					onClose={handleCloseAddDialog}
					onSave={onAdd}
					errors={errors}
				/>
			</CustomTable>

			<DeleteDialog
				open={openDialogs.delete}
				// onClose={() => handleCloseDialog("delete")}
				onClose={handleCloseDeleteDialog}
				onSave={handleDelete}
				selectedIds={selectedIds}
				isLoading={isLoading} // Truyền isLoading để disable button và hiển thị loading
			/>
		</>
	);
}

export default ListBPMN;
