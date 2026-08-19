import React from 'react';

// const SubmitProposal = React.lazy(() => import('@components/SubmitProposal'));
const TransferProcess = React.lazy(() => import('@components/TransferProcess/indexCXLV2'));

export default {
	name: 'ConfirmPropose',
	component: TransferProcess,

	mapProps: (openDialog, allProps) => {
		const {
			dataDetail,
			setReloadData,
			onClose,
			documentId,
			actionCode,
			isView,
			isUpdate,
			selectedIds,
			getFormDataForUpdate,
			flags,
			allSelectedData,
			onTransferSuccess,
		} = allProps;

		const handleClose = () => {
			if (allProps.handleCloseDialog) {
				allProps.handleCloseDialog('ConfirmPropose');
			}
			if (onClose) onClose();
		};

		return {
			open: openDialog?.ConfirmPropose || false,
			docId: documentId,
			onCloseDialog: handleClose,
			label: "Chuyển xử lý",
			isNhanDeBiet: openDialog?.label?.toUpperCase()?.includes("NHẬN ĐỂ BIẾT"),
			dataDetail: dataDetail,
			actionCode: openDialog?.actionCode || actionCode,
			subActionType: openDialog?.subActionType,
			targetRole: openDialog?.targetRole,
			codeAvailableActions: openDialog?.codeAvailableActions,
			setReloadData: setReloadData,
			actionsCodeSubTab: openDialog?.actionsCodeSubTab,
			onCloseAppBar: handleClose,
			canTransferRooms: openDialog?.canTransferRooms,
			canTransferRoomProcessor: openDialog?.canTransferRoomProcessor,
			canTransferRoomSupporter: openDialog?.canTransferRoomSupporter,
			canTransferRoomViewer: openDialog?.canTransferRoomViewer,
			canSetProcessor: openDialog?.canSetProcessor,
			canSetSupporter: openDialog?.canSetSupporter,
			canSetViewer: openDialog?.canSetViewer,
			isUpdate: isUpdate,
			isView: isView,
			viewAndSupport: openDialog?.viewAndSupport,
			canTransferOption: openDialog?.canTransferOption,
			getFormDataForUpdate: getFormDataForUpdate,
			canProcessSupport: flags.canProcessSupport,
			onTransferSuccess: onTransferSuccess,
			chiDao: openDialog?.chiDao,
			actionsBySub: openDialog?.actionsBySub,
			docIds: selectedIds,
			selectedFullRows: allSelectedData,
			typeSe: openDialog?.typeSe,
			availableActionsType: allProps.availableActionsType,
			canConfirmPropose: dataDetail?.flags?.canConfirmPropose,
		};
	},


};