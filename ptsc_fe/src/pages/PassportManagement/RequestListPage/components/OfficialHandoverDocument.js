import React, { useState, useMemo, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import withSharedComponents from "@components/WrapperComponent";
import CustomTableDocument from "@components/CustomTable/CustomTableDocument";
import { useDispatch, useSelector } from "react-redux";
import { EditableCellInput } from "@styles/CustomTableDocument.styles";
import { StyledLoadingPopupSignDigital } from "@styles/UploadFile/UploadFile.style";
import { CircularProgress } from "@mui/material";
import {
  StyledHeaderSectionContent,
} from "@styles/PassportManagement.styles";
import { StyledBoxContainerContent } from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import {
  getDataDelegationItems,
  postPassportVouchers,
} from "@redux/slices/PassportManagement/PassportManagementSlice";
import { useToast } from "@components/common/ToastProvider";
import PassportVouchersDialog from "./PassportVouchersDialog";

const OfficialHandoverDocument = (props) => {
  const {
    open,
    onClose,
    sharedComponents,
    title,
    id,
    onSuccess,
    // setReloadData,
    data,
  } = props;
  const { CustomSwipper, ButtonOutline } = sharedComponents;
  const dispatch = useDispatch();
  const toast = useToast();
  const { dataUser } = useSelector((state) => state.auth);
  const { dataDelegationItems } = useSelector(
    (state) => state.passportManagement
  );
  // logger.log("dataDelegationItems", dataDelegationItems);
  // logger.log("data", data);
  // logger.log("dataUser", dataUser);
  const [isLoading, setIsLoading] = useState(false);
  const [openConfirmSign, setOpenConfirmSign] = useState(false);

  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        await dispatch(getDataDelegationItems(id)).unwrap();
      } catch (error) {
        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          "Lấy danh sách đoàn ra thất bại!";
        logger.log("Lỗi khi lấy dữ liệu:", error);
        toast(errorMessage, "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dispatch, id, open, toast]);

  const [notes, setNotes] = useState({});

  const handleOpenConfirmSignDialog = () => {
    setOpenConfirmSign(true);
  };

  const handleCloseConfirmSignDialog = () => {
    setOpenConfirmSign(false);
  };

  const handleChangeNote = useCallback((rowIndex) => (e) => {
    const value = e.target.value;
    setNotes((prev) => ({
      ...prev,
      [rowIndex]: value,
    }));
  }, []);

  // Merge data với notes
  const dataWithNotes = useMemo(() => {
    // Ưu tiên dataDelegationItems, nếu không có thì dùng data từ props
    const sourceData =
      dataDelegationItems && dataDelegationItems?.data?.length > 0
        ? dataDelegationItems?.data
        : data?.listOfOrganizations || [];

    if (!sourceData) return [];
    return sourceData?.map((row, idx) => ({
      ...row,
      note: notes[idx] !== undefined ? notes[idx] : row.note || "",
    }));
  }, [data, dataDelegationItems, notes]);

  // logger.log("dataWithNotes", dataWithNotes);

  const columns = useMemo(
    () => [
      // { name: "stt", title: "STT", width: "50px", alignCenter: true },
      { name: "fullName", title: "Họ và tên", width: "200px", alignCenter: true },
      {
        name: "passportNumber",
        title: "Số hộ chiếu",
      width: "100px",
      alignCenter: true,
    },
    {
      name: "passportType",
      title: "Loại hộ chiếu",
      width: "150px",
      alignCenter: true,
      renderCell: (row) => {
        return typeof row?.passportType === "object"
          ? row?.passportType?.title
          : row?.passportType;
      },
    },
    {
      name: "expiryDate",
      title: "Giá trị sử dụng",
      width: "150px",
      alignCenter: true,
    },
    {
      name: "note",
      title: "Ghi chú",
      width: "200px",
      renderCell: (row, rowIndex) => (
        <EditableCellInput
          placeholder="Ghi chú:"
          value={row.note || ""}
          onChange={handleChangeNote(rowIndex)}
        />
      ),
    },
  ], [handleChangeNote]);

  const handleConfirmSign = async () => {
    try {
      setIsLoading(true);
      const itemNotes = dataWithNotes.reduce((acc, item) => {
        acc[item.id] = item.note;
        return acc;
      }, {});
      const body = {
        voucherType: "HANDOVER",
        receiverId: data?.requesterId, //Id người nhận
        receiverName: data?.requesterInfo?.name, //Tên người nhận
        fromName: dataUser?.name, //Tên người bàn giao
        requestId: id, //Id yêu cầu,
        itemNotes,
      };
      await dispatch(postPassportVouchers(body)).unwrap();
      toast("Ký biên bản bàn giao thành công!", "success");
      if (onSuccess) {
        await Promise.resolve(onSuccess());
      }
      handleCloseConfirmSignDialog();
      onClose({ signed: true });
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Ký biên bản bàn giao thất bại!";
      toast(errorMessage, "error");
      logger.log("Lỗi khi ký biên bản bàn giao:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CustomSwipper
      title={title || "Xem chi tiết yêu cầu"}
      open={open}
      onClose={onClose}
      type="view"
      hideBackdrop
      isLoading={isLoading}
      moreActions={
        <>
          <ButtonOutline
            onClick={handleOpenConfirmSignDialog}
            // disabled={isReloadingDetail}
            variant="outlined"
          >
            Ký & lập biên bản
          </ButtonOutline>
        </>
      }
    >
      <>
        {isLoading && (
          <StyledLoadingPopupSignDigital>
            <CircularProgress />
          </StyledLoadingPopupSignDigital>
        )}
        <StyledBoxContainerContent styledMarginTop>
          <StyledHeaderSectionContent variant="h6" noWrap>
            Danh sách bàn giao hộ chiếu
          </StyledHeaderSectionContent>
          <CustomTableDocument
            data={dataWithNotes}
            columns={columns}
            total={{
              all: dataWithNotes?.length,
              diplomatic: dataDelegationItems?.totalDiplomaticPassports, //Ngoại giao
              official: dataDelegationItems?.totalServicePassports, //Công vụ
              normal: dataDelegationItems?.totalOrdinaryPassports, //Phổ thông
            }}
						disableCheckbox
            // dateText="ngày 02 tháng 03 năm 2026"
            // receiver={{ name: "Nguyễn Văn A", date: "02/03/2026" }}
            // sender={{ name: "Trần Văn B", date: "02/03/2026" }}
            onlyTable
          />
				</StyledBoxContainerContent>
				
        <PassportVouchersDialog
          open={openConfirmSign}
          onClose={handleCloseConfirmSignDialog}
          onSave={handleConfirmSign}
          titleButton={"Xác nhận ký"}
          title={"Xác nhận ký bàn giao"}
          disableSave={false}
          size="md"
					cancelButtonText="Hủy"
					isLoading={isLoading}
					data={data}
					typeDialog="createMinutes"
        />
      </>
    </CustomSwipper>
  );
};

OfficialHandoverDocument.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  id: PropTypes.string.isRequired,
  onSuccess: PropTypes.func,
  setReloadData: PropTypes.func,
  data: PropTypes.object,
};

export default withSharedComponents(OfficialHandoverDocument);
