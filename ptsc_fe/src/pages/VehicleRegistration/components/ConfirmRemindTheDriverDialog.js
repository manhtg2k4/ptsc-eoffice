import React, { useCallback, useState, useEffect } from "react";
import { CustomDialog } from "@components/CustomDialog";
import { useToast } from "@components/common/ToastProvider";
import api from "@services/api";
import { API_VEHICLE_REQUEST } from "@EnvironmentFile/constants/urlConfig";
import {
  ConfirmDialogContent,
  ConfirmInfoRow,
  ConfirmInfoLabel,
  ConfirmInfoValue,
  CoordinatedSummaryMini,
  // SummaryVehicleStats,
  // StatItem,
  // VehicleSectionTitle as JobSectionTitle,
  SelectionTable,
  TableWrapper,
  ReasonInputArea,
} from "@pages/VehicleRegistration/componentStyle/VehicleRequest.styles";
import { SkyBox as Box } from "@styles/SkyStyles";
import { 
  StyledHeaderContent,
} from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import { useSelector } from "react-redux";

/**
 * Dialog xác nhận điều phối yêu cầu đăng ký xe.
 *
 * Props:
 *  - open, onClose
 *  - formValues: { requestType, priority, isImportantGuest, departureTime, returnTime,
 *                  departurePoint, destination, passengerCount }
 *  - selectedCars: array of car objects từ API_CARS_LIST
 *  - selectedDriverMap: { [carId]: driverObj } – tài xế thay thế đã chọn
 *  - noteDetail: lý do điều phối
 *  - actionCode: string
 *  - workItem: object
 *  - vehicleRegistrationId: string
 *  - requestTypeOptions, priorityOptions: lookup arrays
 */
const ConfirmRemindTheDriverDialog = ({
  open,
  onClose,
  formValues = {},
  // selectedCars = [],
  // selectedDriverMap = {},
  noteDetail = "",
  // actionCode = "",
  // workItem = {},
  vehicleRegistrationId,
  documentId,
  requestTypeOptions: propsRequestTypeOptions = [],
  priorityOptions: propsPriorityOptions = [],
}) => {
  const toast = useToast();
  const { crmSource = [] } = useSelector((state) => state.config || {});

  const requestTypeOptions = propsRequestTypeOptions.length > 0 
    ? propsRequestTypeOptions 
    : (crmSource.find((item) => item.code === "LYCDKX")?.data || []);

  const priorityOptions = propsPriorityOptions.length > 0
    ? propsPriorityOptions
    : (crmSource.find((item) => item.code === "DOUUTIENDATXE")?.data || []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unconfirmedDrivers, setUnconfirmedDrivers] = useState([]);
  const [note, setNote] = useState("");
  const [coordinatedData, setCoordinatedData] = useState(null);

  const finalId = vehicleRegistrationId || documentId || formValues.id || formValues._id;

  // Fetch unconfirmed drivers when dialog opens
  useEffect(() => {
    if (open && finalId) {
      const fetchData = async () => {
        try {
          const res = await api.get(
            `${API_VEHICLE_REQUEST}/${finalId}/unconfirmed-drivers`
          );
          if (res.data) {
            setUnconfirmedDrivers(res.data.coordinationInformation || res.data.unconfirmedDrivers || []);
            setCoordinatedData(res.data);
          }
        } catch (error) {
          logger.error("Error fetching unconfirmed drivers:", error);
        }
      };
      fetchData();
    }
  }, [open, finalId]);

  const displayData = coordinatedData || formValues;

  useEffect(() => {
    if (open) {
      setNote(noteDetail || "");
    }
  }, [open, noteDetail]);

  // --- Helper: lookup label ---
  const getLabel = useCallback((options, value) => {
    return options.find((o) => o.value === value)?.title || value || "—";
  }, []);

  const formatDateTime = useCallback((dt) => {
    if (!dt) return "—";
    try {
      return new Date(dt).toLocaleString("vi-VN", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return dt;
    }
  }, []);

  // Tổng số ghế từ danh sách xe đã chọn
  // const totalSeats = selectedCars.reduce((sum, c) => sum + (Number(c.seat_count) || 0), 0);

  // --- API call ---
  const handleConfirm = useCallback(async () => {
    if (!finalId) {
      toast("Thiếu ID yêu cầu!", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        noteDetail: note,
      };

      await api.post(
        `${API_VEHICLE_REQUEST}/${finalId}/remind-drivers`,
        payload
      );

      toast("Nhắc nhở tài xế thành công!", "success");
      onClose();
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Có lỗi xảy ra khi gửi điều phối!";
      toast(message, "error");
      logger.error("Error submitting coordination:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    finalId, note, toast, onClose,
  ]);

  const handleNoteChange = useCallback((e) => {
    setNote(e.target.value);
  }, []);

  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      onSave={handleConfirm}
      title="Nhắc nhở tài xế"
      titleButton="Xác nhận"
      size="md"
      isLoading={isSubmitting}
    >
      <ConfirmDialogContent>
        {/* ── Thông tin yêu cầu ── */}
        <ConfirmInfoRow>
          <ConfirmInfoLabel>Loại yêu cầu:</ConfirmInfoLabel>
          <ConfirmInfoValue>
            {getLabel(requestTypeOptions, displayData.requestType)}
          </ConfirmInfoValue>
        </ConfirmInfoRow>
        <ConfirmInfoRow>
          <ConfirmInfoLabel>Mức độ ưu tiên:</ConfirmInfoLabel>
          <ConfirmInfoValue>
            {getLabel(priorityOptions, displayData.priority)}
          </ConfirmInfoValue>
        </ConfirmInfoRow>
        <ConfirmInfoRow>
          <ConfirmInfoLabel>Tiếp khách quan trọng:</ConfirmInfoLabel>
          <ConfirmInfoValue>
            {(displayData.importantGuest === "co" || displayData.isImportantGuest === "co") ? "Có" : "Không"}
          </ConfirmInfoValue>
        </ConfirmInfoRow>
        <ConfirmInfoRow>
          <ConfirmInfoLabel>Thời gian đi – Thời gian về:</ConfirmInfoLabel>
          <ConfirmInfoValue>
            {formatDateTime(displayData.departureTime)} –{" "}
            {formatDateTime(displayData.returnTime)}
          </ConfirmInfoValue>
        </ConfirmInfoRow>
        <ConfirmInfoRow>
          <ConfirmInfoLabel>Nơi xuất phát:</ConfirmInfoLabel>
          <ConfirmInfoValue>{displayData.departurePoint || "—"}</ConfirmInfoValue>
        </ConfirmInfoRow>
        <ConfirmInfoRow>
          <ConfirmInfoLabel>Nơi đến:</ConfirmInfoLabel>
          <ConfirmInfoValue>{displayData.destination || "—"}</ConfirmInfoValue>
        </ConfirmInfoRow>
        <ConfirmInfoRow>
          <ConfirmInfoLabel>Số lượng người đi:</ConfirmInfoLabel>
          <ConfirmInfoValue>{displayData.passengerCount || "—"}</ConfirmInfoValue>
        </ConfirmInfoRow>

        {/* ── Kết quả điều phối ── */}
        <CoordinatedSummaryMini>
          <StyledHeaderContent variant="h6" mb={0}>
            CẢNH BÁO ĐIỀU PHỐI
          </StyledHeaderContent>
        </CoordinatedSummaryMini>

        <TableWrapper>
          <SelectionTable>
            <thead>
              <tr>
                <th>STT</th>
                <th>Loại xe</th>
                <th>Hãng xe</th>
                <th>Biển số xe</th>
                <th>Tài xế</th>
                <th>Trạng thái tiếp nhận</th>
              </tr>
            </thead>
            <tbody>
              {unconfirmedDrivers.map((item, index) => {
                return (
                  <tr key={item.carId || index}>
                    <td>{index + 1}</td>
                    <td>{item.carType || "—"}</td>
                    <td>{item.brand || "—"}</td>
                    <td>{item.carName || item.licensePlate || "—"}</td>
                    <td>{item.driverName || "—"}</td>
                    <td>
                      <span style={{ color: "#1976d2", fontWeight: 500 }}>
                        {item.confirmed}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {unconfirmedDrivers.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center" }}>
                    Không có danh sách tài xế chưa tiếp nhận
                  </td>
                </tr>
              )}
            </tbody>
          </SelectionTable>
        </TableWrapper>

        <Box mt={3}>
            <StyledHeaderContent variant="h6" mb={1}>
                Ghi chú:
            </StyledHeaderContent>
            <ReasonInputArea
                placeholder="Nhập ghi chú cảnh bảo"
                rows={4}
                value={note}
                onChange={handleNoteChange}
            />
        </Box>
      </ConfirmDialogContent>
    </CustomDialog>
  );
};

export default ConfirmRemindTheDriverDialog;
