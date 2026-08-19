import { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { useToast } from '@components/common/ToastProvider';
import { API_DETAIL_VANBANDEN_DHVB } from '@EnvironmentFile/constants/urlConfig';
import ViewIncommingDoc from '@pages/IncomingDocumentManagement/components/ViewIncommingDoc';
import axiosInstance from '@utils/axiosInstance';


/**
 * Custom Hook để quản lý dialog xem chi tiết văn bản đến.
 * Đóng gói logic gọi API, quản lý state và render dialog.
 * @param {Array} tableData - Dữ liệu của bảng hiện tại, dùng để tìm kiếm fallback.
 * @returns {{
 *   handleView: (record: object | string | number) => void,
 *   ViewDialog: () => JSX.Element
 * }}
 */
export const useDocumentViewDialog = (props) => {
  const {
    setReload,
  } = props
  const { control, reset } = useForm();
  const toast = useToast();
  const { dataUser: authUser } = useSelector((state) => state.auth || {});

  const [open, setOpen] = useState(false);
  const [dataDetail, setDataDetail] = useState(null);
  const [documentFlags, setDocumentFlags] = useState(null);

  const handleClose = useCallback(() => {
    setOpen(false);
    reset({});
    setDataDetail(null);
    setDocumentFlags(null);
  }, [reset]);

  const handleView = useCallback(async (record) => {
    try {
      const userId = authUser?._id;

      let docId = null;
      if (record && typeof record === 'object') {
        docId = record._id || record.documentId || record.id;
      } else if (record) { // string or number
        docId = record;
      }

      if (!docId) {
        toast("Không tìm thấy ID văn bản!", "error");
        return;
      }

      const url = API_DETAIL_VANBANDEN_DHVB(docId);
      const detailData = await axiosInstance.get(url, { params: { userId } });

      const doc = detailData?.document || detailData?.items?.[0]?.document || {};
      reset(doc);

      setDocumentFlags(detailData?.flags || null);
      setDataDetail(detailData);
      setOpen(true);

    } catch (error) {
      logger.error("Lỗi khi lấy chi tiết văn bản:", error);
      toast("Không thể lấy chi tiết văn bản!", "error");
      reset(record && typeof record === 'object' ? record : {});
    }
  }, [reset, toast, authUser]);

  const ViewDialog = useCallback(() => (
    <ViewIncommingDoc
      open={open}
      onClose={handleClose}
      control={control}
      dataDetail={dataDetail}
      documentFlags={documentFlags}
      setReload={setReload}
    />
  ), [open, handleClose, control, dataDetail, documentFlags,setReload]);

  return { handleView, ViewDialog };
};
