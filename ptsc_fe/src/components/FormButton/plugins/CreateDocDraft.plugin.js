 

import React from 'react';
 
 
const AddDialog = React.lazy(() => import('@pages/TextAway/Tab/SigningSubmissionTab/AddDialog'));
 
export default {
  name: 'CreateDocDraft',
  component: AddDialog,
 
  mapProps: (openDialog, allProps) => {
    const { 
      dataDetail, 
      setReloadData, 
      onClose, 
      documentId, 
      workItem, 
      userId,
      actionCode,
    } = allProps;

    return {
      open: openDialog?.CreateDocDraft || false,
      onClose: () => {
        if (allProps.handleCloseDialog) {
          allProps.handleCloseDialog('CreateDocDraft');
        }
      },
      
      // Truyền data cần thiết
      actionCode,
      dataDetail,
      documentId,
      workItem,
      userId,
      setReloadData,
      onCloseAppBar: onClose,
    };
  },
  
  
};
