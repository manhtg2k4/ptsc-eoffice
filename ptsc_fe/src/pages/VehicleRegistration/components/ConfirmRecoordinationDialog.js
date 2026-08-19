import React, { useCallback } from "react";
import { CustomDialog } from "@components/CustomDialog";
import { useToast } from "@components/common/ToastProvider";
import api from "@services/api";
import { API_VEHICLE_REQUEST } from "@EnvironmentFile/constants/urlConfig";
import {
  // JobSectionTitle,
  // ConfirmButton,
  // RedCancelButton,
  ConfirmDialogContent,
  ConfirmInfoRow,
  ConfirmInfoLabel,
  ConfirmInfoValue,
  CoordinatedSummaryMini,
  SummaryVehicleStats,
  StatItem,
  // StyledDirectionsCarIcon,
  // StyledEventSeatIcon,
  // StyledPhoneIcon,
  SelectionTable,
  TableWrapper,
  ReasonInputArea,
} from "@pages/VehicleRegistration/componentStyle/VehicleRequest.styles";
import { Box } from "@mui/material";
import { 
  StyledHeaderContent,
} from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
const ConfirmRecoordinationDialog = ({
  open,
  onClose,
  onSuccess,
  formValues = {},
  selectedCars = [],
  selectedDriverMap = {},
  noteDetail = "",
  actionCode = "",
  workItem = {},
  vehicleRegistrationId,
  documentId,
  requestTypeOptions = [],
  priorityOptions = [],
  coordinationData = { items: [] } // For display if still using it
}) => {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
   const [reason, setReason] = React.useState("");

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

  const handleConfirm = useCallback(async () => {
    const requestId = vehicleRegistrationId || documentId;
    if (!requestId) {
      toast("Thiếu ID yêu cầu!", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      const itemsToMap = selectedCars.length > 0 ? selectedCars : (coordinationData.items || []);
      const coordinationInformation = itemsToMap.map((item) => ({
        carId: item.carId || item.id,
        driverId: selectedCars.length > 0 
          ? (selectedDriverMap[item.id]?.driverId || selectedDriverMap[item.id]?.id || item.manager?.id || item.driver_id || null)
          : (item.driver?.driverId || item.driverId || item.driver?.id || null),
      }));

      const payload = {
        actionCode,
        workItem,
        coordinationInformation,
        noteDetail: reason || noteDetail,
      };

      await api.patch(
        `${API_VEHICLE_REQUEST}/${requestId}/coordination-information`,
        payload
      );

      toast("Điều phối thành công!", "success");
      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Có lỗi xảy ra khi gửi điều phối!";
      toast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    vehicleRegistrationId, selectedCars, selectedDriverMap,
    actionCode, workItem, noteDetail, toast, onClose, onSuccess, reason, coordinationData.items, documentId
  ]);
    const handleReasonChange = React.useCallback((e) => {
      setReason(e.target.value);
    }, []);

  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      onSave={handleConfirm}
      title="Xác nhận điều phối lại"
      titleButton="Xác nhận"
      size="md"
      isLoading={isSubmitting}
   
    >
      <ConfirmDialogContent>
        <ConfirmInfoRow>
          <ConfirmInfoLabel>Loại yêu cầu:</ConfirmInfoLabel>
          <ConfirmInfoValue>
            {getLabel(requestTypeOptions, formValues.requestType)}
          </ConfirmInfoValue>
        </ConfirmInfoRow>
        <ConfirmInfoRow>
          <ConfirmInfoLabel>Mức độ ưu tiên:</ConfirmInfoLabel>
          <ConfirmInfoValue>
            {getLabel(priorityOptions, formValues.priority)}
          </ConfirmInfoValue>
        </ConfirmInfoRow>
        <ConfirmInfoRow>
          <ConfirmInfoLabel>Tiếp khách quan trọng:</ConfirmInfoLabel>
          <ConfirmInfoValue>
            {formValues.isImportantGuest === "co" ? "Có" : "Không"}
          </ConfirmInfoValue>
        </ConfirmInfoRow>
        <ConfirmInfoRow>
          <ConfirmInfoLabel>Thời gian đi - Thời gian về:</ConfirmInfoLabel>
          <ConfirmInfoValue>
            {formatDateTime(formValues.departureTime)} - {formatDateTime(formValues.returnTime)}
          </ConfirmInfoValue>
        </ConfirmInfoRow>
        <ConfirmInfoRow>
          <ConfirmInfoLabel>Nơi xuất phát:</ConfirmInfoLabel>
          <ConfirmInfoValue>{formValues.departurePoint || "—"}</ConfirmInfoValue>
        </ConfirmInfoRow>
        <ConfirmInfoRow>
          <ConfirmInfoLabel>Nơi đến:</ConfirmInfoLabel>
          <ConfirmInfoValue>{formValues.destination || "—"}</ConfirmInfoValue>
        </ConfirmInfoRow>
        <ConfirmInfoRow>
          <ConfirmInfoLabel>Số lượng người đi:</ConfirmInfoLabel>
          <ConfirmInfoValue>{formValues.passengerCount || "—"}</ConfirmInfoValue>
        </ConfirmInfoRow>

        <CoordinatedSummaryMini>
          <StyledHeaderContent variant="h6" mb={0}>
            KẾT QUẢ ĐIỀU PHỐI LẠI
          </StyledHeaderContent>
          <SummaryVehicleStats>
            <StatItem>
              <svg width="21" height="15" viewBox="0 0 21 15" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M20.5425 6.06001L15.525 3.90751L13.62 0.652507L13.56 0.562507C13.4196 0.387102 13.2415 0.245489 13.039 0.148128C12.8365 0.0507678 12.6147 0.000147842 12.39 7.42626e-06H6.39C6.14235 -0.000771769 5.89836 0.0597779 5.67981 0.176251C5.46126 0.292725 5.27495 0.461499 5.1375 0.667508L2.595 4.50001H0.75C0.551088 4.50001 0.360322 4.57903 0.21967 4.71968C0.0790176 4.86033 0 5.0511 0 5.25001V12C0 12.1989 0.0790176 12.3897 0.21967 12.5303C0.360322 12.671 0.551088 12.75 0.75 12.75H2.355C2.52771 13.3855 2.90475 13.9466 3.42795 14.3466C3.95114 14.7465 4.59142 14.9633 5.25 14.9633C5.90858 14.9633 6.54886 14.7465 7.07205 14.3466C7.59525 13.9466 7.97229 13.3855 8.145 12.75H12.855C13.0277 13.3855 13.4048 13.9466 13.9279 14.3466C14.4511 14.7465 15.0914 14.9633 15.75 14.9633C16.4086 14.9633 17.0489 14.7465 17.5721 14.3466C18.0952 13.9466 18.4723 13.3855 18.645 12.75H20.25C20.4489 12.75 20.6397 12.671 20.7803 12.5303C20.921 12.3897 21 12.1989 21 12V6.75001C20.9999 6.60279 20.9564 6.45886 20.8751 6.33616C20.7937 6.21346 20.6781 6.11742 20.5425 6.06001ZM5.25 13.5C4.95333 13.5 4.66332 13.412 4.41665 13.2472C4.16997 13.0824 3.97771 12.8481 3.86418 12.574C3.75065 12.2999 3.72094 11.9983 3.77882 11.7074C3.8367 11.4164 3.97956 11.1491 4.18934 10.9393C4.39912 10.7296 4.66639 10.5867 4.95736 10.5288C5.24834 10.471 5.54994 10.5007 5.82403 10.6142C6.09811 10.7277 6.33238 10.92 6.4972 11.1667C6.66203 11.4133 6.75 11.7033 6.75 12C6.75 12.3978 6.59196 12.7794 6.31066 13.0607C6.02936 13.342 5.64782 13.5 5.25 13.5ZM15.75 13.5C15.4533 13.5 15.1633 13.412 14.9166 13.2472C14.67 13.0824 14.4777 12.8481 14.3642 12.574C14.2506 12.2999 14.2209 11.9983 14.2788 11.7074C14.3367 11.4164 14.4796 11.1491 14.6893 10.9393C14.8991 10.7296 15.1664 10.5867 15.4574 10.5288C15.7483 10.471 16.0499 10.5007 16.324 10.6142C16.5981 10.7277 16.8324 10.92 16.9972 11.1667C17.162 11.4133 17.25 11.7033 17.25 12C17.25 12.3978 17.092 12.7794 16.8107 13.0607C16.5294 13.342 16.1478 13.5 15.75 13.5ZM19.5 11.25H18.645C18.4723 10.6145 18.0952 10.0534 17.5721 9.65346C17.0489 9.25347 16.4086 9.03676 15.75 9.03676C15.0914 9.03676 14.4511 9.25347 13.9279 9.65346C13.4048 10.0534 13.0277 10.6145 12.855 11.25H8.145C7.97229 10.6145 7.59525 10.0534 7.07205 9.65346C6.54886 9.25347 5.90858 9.03676 5.25 9.03676C4.59142 9.03676 3.95114 9.25347 3.42795 9.65346C2.90475 10.0534 2.52771 10.6145 2.355 11.25H1.5V6.00001H3C3.12353 5.99937 3.24499 5.96823 3.35359 5.90935C3.46219 5.85047 3.55456 5.76568 3.6225 5.66251L6.405 1.50001H12.405L14.3775 4.87501C14.458 5.01526 14.5816 5.12575 14.73 5.19001L19.5 7.24501V11.25Z" fill="black"/>
</svg>
 Xe: {coordinationData.vehicleCount || 0}
            </StatItem>
            <StatItem>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M14 14.5C14 14.6326 13.9473 14.7598 13.8535 14.8535C13.7598 14.9473 13.6326 15 13.5 15H6.99998C6.86737 15 6.7402 14.9473 6.64643 14.8535C6.55266 14.7598 6.49998 14.6326 6.49998 14.5C6.49998 14.3674 6.55266 14.2402 6.64643 14.1464C6.7402 14.0527 6.86737 14 6.99998 14H13.5C13.6326 14 13.7598 14.0527 13.8535 14.1464C13.9473 14.2402 14 14.3674 14 14.5ZM13 8.99999H8.98623L6.99998 4.99999L7.88686 3.35499C7.88952 3.35061 7.89182 3.34601 7.89373 3.34124C8.01224 3.10411 8.03174 2.82962 7.94794 2.57811C7.86415 2.32661 7.68391 2.11866 7.44686 1.99999L7.41748 1.98624L5.31248 1.09812C5.07612 0.985236 4.80491 0.969596 4.55714 1.05456C4.30937 1.13953 4.10483 1.31832 3.98748 1.55249L2.60498 4.30249C2.53593 4.44156 2.5 4.59473 2.5 4.74999C2.5 4.90526 2.53593 5.05843 2.60498 5.19749L6.23686 12.4475C6.31959 12.614 6.44727 12.7539 6.60544 12.8516C6.76362 12.9492 6.94597 13.0006 7.13186 13H13C13.2652 13 13.5196 12.8946 13.7071 12.7071C13.8946 12.5196 14 12.2652 14 12V9.99999C14 9.73478 13.8946 9.48042 13.7071 9.29289C13.5196 9.10535 13.2652 8.99999 13 8.99999Z" fill="black"/>
</svg>
 Ghế: {coordinationData.seatCount || 0}
            </StatItem>
          </SummaryVehicleStats>
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
              </tr>
            </thead>
            <tbody>
              {selectedCars.length > 0 ? (
                selectedCars.map((car, index) => {
                  const driver = selectedDriverMap[car.id];
                  const driverName = driver?.fullName || driver?.full_name || car.manager.name || "—";
                  return (
                    <tr key={car.id}>
                      <td>{index + 1}</td>
                      <td>{car.carType || "—"}</td>
                      <td>{car.brand || "—"}</td>
                      <td>{car.licensePlate || "—"}</td>
                      <td>{driverName}</td>
                    </tr>
                  );
                })
              ) : (
                coordinationData.items.map((item, index) => (
                  <tr key={item.carId || index}>
                    <td>{index + 1}</td>
                    <td>{item.car?.carType || item.carType || item.capacity || "—"}</td>
                    <td>{item.car?.brand || item.brand || "—"}</td>
                    <td>{item.car?.licensePlate || item.licensePlate || item.plate || "—"}</td>
                    <td>{item.driver?.fullName || item.driver?.full_name || item.driverName || item.driver || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </SelectionTable>
        </TableWrapper>
        <Box mt={3}>
                 <StyledHeaderContent variant="h6" mb={1}>
                  Lý do điều phối lại
                </StyledHeaderContent>
                <ReasonInputArea
                  placeholder="Nhập lý do ..." 
                  value={reason}
                  onChange={handleReasonChange}
                />
              </Box>
      </ConfirmDialogContent>
    </CustomDialog>
  );
};

export default ConfirmRecoordinationDialog;
