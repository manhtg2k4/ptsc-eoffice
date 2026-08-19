import sharedComponents from "@components/WrapperComponent";
import React, { useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { Stack } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import {
  BoxLayout,
  FooterLayout,
  FullWidthGrid,
} from "@styles/IncomingDocument/IncomingDocument.style";

import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { incomingDocumentSchema } from "./constant";

function ImcommingDocumment({ sharedComponents }) {
  const { Input, Autocomplete, DatePicker, Button } = sharedComponents;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(incomingDocumentSchema),
    defaultValues: {
      soVBDen: "",
      soDen: "",
      hanTraLoi: "",
      doKhan: "Thuong",
      trichYeu: "",
      soVanBan: "",
      ngayVB: null,
      donViGui: null,
      ngayNhanVB: null,
      phuongThucNhan: null,
      linhVuc: null,
      donViNhan: "VĂN PHÒNG CÔNG TY",
      ngayVaoSo: null,
      doMat: null,
      nguoiKy: "",
      soPhu: "",
    },
  });

  const optionsDonVi = useMemo(
    () => [
      { label: "Văn phòng công ty", value: "vpct" },
      { label: "Phòng HCNS", value: "hcns" },
    ],
    []
  );

  const optionsEnum = useMemo(
    () => [
      { label: "Thường", value: "Thuong" },
      { label: "Khẩn", value: "Khan" },
      { label: "Hỏa tốc", value: "HoaToc" },
    ],
    []
  );

  const optionsDoMat = useMemo(
    () => [
      { label: "Bình thường", value: "BT" },
      { label: "Mật", value: "Mat" },
      { label: "Tuyệt mật", value: "TuyetMat" },
    ],
    []
  );

  const optionsPhuongThucNhan = useMemo(
    () => [
      { label: "Công văn giấy", value: "giay" },
      { label: "Email", value: "email" },
    ],
    []
  );

  const optionsLinhVuc = useMemo(
    () => [
      { label: "Văn bản quy phạm pháp luật", value: "vbqppL" },
      { label: "Nội bộ", value: "noibo" },
    ],
    []
  );

  const handleSave = (data) => {
    logger.log("✅ Dữ liệu hợp lệ:", data);
  };

  const handleChuyenXuLy = () => {
    logger.log("➡️ Chuyển xử lý");
  };

  const handleAutocompleteChange = useCallback(
    (onChange) => (_, value) => {
      onChange(value);
    },
    []
  );

  const handleAutocompleteValueChange = useCallback(
    (onChange) => (_, value) => {
      onChange(value?.value || "");
    },
    []
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <form onSubmit={handleSubmit(handleSave)}>
        <BoxLayout>
          <Controller
            name="soVBDen"
            control={control}
            render={({ field }) => (
              <Input {...field} label="Số VB đến" placeholder="Số 2025" />
            )}
          />

          <Controller
            name="soVanBan"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                label="Số văn bản"
                required
                placeholder="Nhập số văn bản"
                error={!!errors.soVanBan}
                helperText={errors.soVanBan?.message}
              />
            )}
          />

          <Controller
            name="soDen"
            control={control}
            render={({ field }) => (
              <Input {...field} label="Số đến" placeholder="938" />
            )}
          />

          <Controller
            name="hanTraLoi"
            control={control}
            render={({ field }) => (
              <DatePicker {...field} label="Hạn trả lời" />
            )}
          />

          <Controller
            name="ngayVB"
            control={control}
            render={({ field }) => (
              <DatePicker
                {...field}
                label="Ngày VB"
                required
                value={field.value}
                // onChange={(v) => field.onChange(v)}
                onChange={field.onChange}
                error={!!errors.ngayVB}
                helperText={errors.ngayVB?.message}
              />
            )}
          />

          <Controller
            name="donViGui"
            control={control}
            render={({ field }) => (
              <Autocomplete
                {...field}
                label="Đơn vị gửi"
                required
                options={optionsDonVi}
                value={field.value}
                // onChange={(_, v) => field.onChange(v)}
                onChange={handleAutocompleteChange(field.onChange)}
                error={!!errors.donViGui}
                helperText={errors.donViGui?.message}
              />
            )}
          />

          <Controller
            name="soPhu"
            control={control}
            render={({ field }) => <Input {...field} label="Số phụ" />}
          />

          <Controller
            name="ngayNhanVB"
            control={control}
            render={({ field }) => (
              <DatePicker
                {...field}
                label="Ngày nhận văn bản"
                required
                value={field.value}
                // onChange={(v) => field.onChange(v)}
                onChange={field.onChange}
                error={!!errors.ngayNhanVB}
                helperText={errors.ngayNhanVB?.message}
              />
            )}
          />

          <Controller
            name="phuongThucNhan"
            control={control}
            render={({ field }) => (
              <Autocomplete
                {...field}
                label="Phương thức nhận"
                options={optionsPhuongThucNhan}
                value={field.value}
                // onChange={(_, v) => field.onChange(v)}
                onChange={handleAutocompleteChange(field.onChange)}
              />
            )}
          />

          <Controller
            name="linhVuc"
            control={control}
            render={({ field }) => (
              <Autocomplete
                {...field}
                label="Lĩnh vực"
                options={optionsLinhVuc}
                value={field.value}
                // onChange={(_, v) => field.onChange(v)}
                onChange={handleAutocompleteChange(field.onChange)}
              />
            )}
          />

          <Input label="Đơn vị nhận" value="VĂN PHÒNG CÔNG TY" disabled />

          <Controller
            name="ngayVaoSo"
            control={control}
            render={({ field }) => (
              <DatePicker
                {...field}
                label="Ngày vào sổ"
                required
                value={field.value}
                // onChange={(v) => field.onChange(v)}
                onChange={field.onChange}
                error={!!errors.ngayVaoSo}
                helperText={errors.ngayVaoSo?.message}
              />
            )}
          />

          <Controller
            name="doMat"
            control={control}
            render={({ field }) => (
              <Autocomplete
                {...field}
                label="Độ mật"
                options={optionsDoMat}
                value={field.value}
                // onChange={(_, v) => field.onChange(v)}
                onChange={handleAutocompleteChange(field.onChange)}
              />
            )}
          />

          <Controller
            name="doKhan"
            control={control}
            render={({ field }) => (
              <Autocomplete
                {...field}
                label="Độ khẩn"
                options={optionsEnum}
                value={optionsEnum.find((o) => o.value === field.value) || null}
                // onChange={(_, v) => field.onChange(v?.value || "")}
                onChange={handleAutocompleteValueChange(field.onChange)}
              />
            )}
          />

          <Controller
            name="nguoiKy"
            control={control}
            render={({ field }) => <Input {...field} label="Người ký" />}
          />

          <FullWidthGrid>
            <Controller
              name="trichYeu"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Trích yếu"
                  required
                  multiline
                  minRows={4}
                  error={!!errors.trichYeu}
                  helperText={errors.trichYeu?.message}
                />
              )}
            />
          </FullWidthGrid>

          <FullWidthGrid>
            <Stack direction="row" spacing={2}>
              <Button type="button">TỆP ĐÍNH KÈM</Button>
              <Button type="button" variant="outlined">
                QUÉT VĂN BẢN
              </Button>
            </Stack>
          </FullWidthGrid>

          <FooterLayout>
            <Button variant="outlined" type="button" onClick={handleChuyenXuLy}>
              Chuyển xử lý
            </Button>
            <Button variant="contained" type="submit">
              Lưu
            </Button>
          </FooterLayout>
        </BoxLayout>
      </form>
    </LocalizationProvider>
  );
}

ImcommingDocumment.propTypes = {
  sharedComponents: PropTypes.object.isRequired,
};

export default sharedComponents(ImcommingDocumment);
