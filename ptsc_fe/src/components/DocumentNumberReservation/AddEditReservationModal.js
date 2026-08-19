import React, { useState, useEffect, useCallback, useContext } from "react";
import PropTypes from "prop-types";
import { CustomDialog } from "@components/CustomDialog";
import { AuthContext } from "@AuthContext/AuthProvider";
import {
  Grid,
  Box,
  Typography,
  styled,
} from "@mui/material";
import CustomInput from "@components/CustomInput/CustomInput";
import AsyncAutoComplete from "@components/CustomAsyncAutoCompleted";
import axiosInstance from "@utils/axiosInstance";
import { useToast } from "@components/common/ToastProvider";
import { API_GET_LIST_USERS, APP_BASE } from "@EnvironmentFile/constants/urlConfig";

const FieldLabel = styled(Typography)({
  fontSize: "14px",
  fontWeight: 600,
  marginBottom: "8px",
  color: "#333333",
});

const RequiredStar = styled("span")({
  color: "red",
  marginLeft: "2px",
});

const ModalContentContainer = styled(Box)({
  padding: "16px",
});

const AddEditReservationModal = ({ open, onClose, onSuccess, initialData }) => {
  const toast = useToast();
  const isEdit = Boolean(initialData && initialData.id);

  const [selectedBook, setSelectedBook] = useState(null);
  const [bookCode, setBookCode] = useState("");
  const [reservedNumber, setReservedNumber] = useState("");
  const [note, setNote] = useState("");
  const [selectedUsers, setSelectedUsers] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const { user: authUser } = useContext(AuthContext);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setReservedNumber(initialData.reservedNumber || "");
        setNote(initialData.note || "");
        if (initialData.bookDocument) {
          setSelectedBook(initialData.bookDocument);
          setBookCode(
            initialData.bookDocument.toBookCode ||
              initialData.bookDocument.to_book_code ||
              initialData.bookDocument.code ||
              initialData.bookDocument.book_code ||
              initialData.bookDocument.order ||
              ""
          );
        }
        if (initialData.subscribers) {
          const subUsers = initialData.subscribers.map((s) => s.user).filter(Boolean);
          setSelectedUsers(subUsers[0] || null);
        }
      } else {
        setSelectedBook(null);
        setBookCode("");
        setReservedNumber("");
        setNote("");
        setSelectedUsers(authUser?.user ? {
          _id: authUser.user._id || authUser.user.id,
          id: authUser.user._id || authUser.user.id,
          name: authUser.user.name || authUser.user.fullName,
        } : null);
      }
    }
  }, [open, initialData, authUser]);

  const handleBookChange = useCallback((newValue) => {
    setSelectedBook(newValue);
    if (newValue) {
      setBookCode(
        newValue.toBookCode ||
          newValue.to_book_code ||
          newValue.code ||
          newValue.book_code ||
          newValue.order ||
          ""
      );
    } else {
      setBookCode("");
    }
  }, []);

  const handleUserChange = useCallback((newValue) => {
    setSelectedUsers(newValue || null);
  }, []);

  const handleReservedNumberChange = useCallback((e) => {
    const val = e.target.value;
    if (val === "" || /^\d+$/.test(val)) {
      setReservedNumber(val);
    }
  }, []);

  const handleNoteChange = useCallback((e) => {
    setNote(e.target.value);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedBook) {
      toast("Vui lòng chọn Sổ văn bản đi", "error");
      return;
    }

    const subscriberUserIds = selectedUsers ? [selectedUsers.id || selectedUsers._id].filter(Boolean) : [];

    if (subscriberUserIds.length === 0) {
      toast("Vui lòng chọn Người đăng ký giữ số", "error");
      return;
    }

    if (!reservedNumber) {
      toast("Vui lòng nhập Số giữ", "error");
      return;
    }

    setIsLoading(true);
    try {
      const bookDocId = selectedBook.bookDocumentId || selectedBook.book_document_id || selectedBook.id;

      const payload = {
        bookDocumentId: Number(bookDocId),
        note,
        subscriberUserIds,
      };

      if (reservedNumber) {
        payload.reservedNumber = Number(reservedNumber);
      }

      if (isEdit) {
        await axiosInstance.patch(`/api/document-number-reservations/${initialData.id}`, {
          note,
          subscriberUserIds,
        });
        toast("Cập nhật giữ số văn bản thành công", "success");
      } else {
        await axiosInstance.post("/api/document-number-reservations", payload);
        toast("Tạo mới giữ số văn bản thành công", "success");
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      const msg = error.response?.data?.message || "Có lỗi xảy ra khi lưu giữ số văn bản";
      toast(msg, "error");
    } finally {
      setIsLoading(false);
    }
  }, [selectedBook, reservedNumber, note, selectedUsers, isEdit, initialData, toast, onSuccess, onClose]);

  const bookDocumentUrl = `${APP_BASE}/api/book-documents/list?processFn=SoVBDi&type_document=OutGoingDocument`;
  const userListUrl = `${API_GET_LIST_USERS}/principals`;

  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      onSave={handleSubmit}
      title={isEdit ? "CẬP NHẬT GIỮ SỐ VĂN BẢN" : "THÊM MỚI GIỮ SỐ VĂN BẢN"}
      fullWidth
      cancelButtonText="HỦY"
      titleButton="LƯU"
      isLoading={isLoading}
    >
      <ModalContentContainer>
        <Grid container spacing={3}>
          {/* Hàng 1: Sổ văn bản đi & Mã số văn bản đi */}
          <Grid item xs={12} sm={6}>
            <FieldLabel variant="subtitle2">
              Sổ văn bản đi <RequiredStar>*</RequiredStar>
            </FieldLabel>
            <AsyncAutoComplete
              fullWidth
              placeholder="Tìm kiếm sổ văn bản..."
              url={bookDocumentUrl}
              method="GET"
              queryParam="filter[name]"
              optionLabel="name"
              optionValue="bookDocumentId"
              value={selectedBook}
              onChange={handleBookChange}
              returnObject
              disabled={isEdit}
              required
              size="small"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FieldLabel variant="subtitle2">Mã sổ văn bản đi</FieldLabel>
            <CustomInput
              fullWidth
              size="small"
              value={bookCode}
              disabled
            />
          </Grid>

          {/* Hàng 2: Người đăng ký giữ số & Số giữ */}
          <Grid item xs={12} sm={6}>
            <FieldLabel variant="subtitle2">
              Người đăng ký giữ số <RequiredStar>*</RequiredStar>
            </FieldLabel>
            <AsyncAutoComplete
              fullWidth
              placeholder="Tìm kiếm cá nhân..."
              url={userListUrl}
              method="GET"
              queryParam="name"
              optionLabel="name"
              optionValue="id"
              value={selectedUsers}
              onChange={handleUserChange}
              returnObject
              required
              size="small"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FieldLabel variant="subtitle2">
              Số giữ <RequiredStar>*</RequiredStar>
            </FieldLabel>
            <CustomInput
              fullWidth
              size="small"
              value={reservedNumber}
              onChange={handleReservedNumberChange}
              placeholder="Nhập số"
              disabled={isEdit}
            />
          </Grid>

          {/* Hàng 3: Ghi chú */}
          <Grid item xs={12}>
            <FieldLabel variant="subtitle2">Ghi chú</FieldLabel>
            <CustomInput
              fullWidth
              multiline
              rows={4}
              placeholder="Nhập ghi chú chi tiết tại đây..."
              value={note}
              onChange={handleNoteChange}
            />
          </Grid>
        </Grid>
      </ModalContentContainer>
    </CustomDialog>
  );
};

AddEditReservationModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  initialData: PropTypes.object,
};

export default AddEditReservationModal;
