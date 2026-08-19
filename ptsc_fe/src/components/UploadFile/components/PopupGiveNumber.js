import React, { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { CustomDialog } from "@components/CustomDialog";
import { Box, CircularProgress, Grid } from "@mui/material";
import CustomInput from "@components/CustomInput/CustomInput";
import { FullWidthGridItem } from "@styles/FormList.styles";
import { Controller } from "react-hook-form";

import CustomDatePicker from "@components/CustomDatePicker";
import { useDispatch, useSelector } from "react-redux";
import { getListBookDocuments } from "@redux/slices/GiveNumber/GiveNumberSlice";
import dayjs from "dayjs";
import { StyledLoadingPopupSignDigital } from "@styles/UploadFile/UploadFile.style";

const PopupGiveNumber = ({
  open,
  onClose,
  onSave,
  control,
  handleSubmit,
  onSubmit,
  errors,
  isLoading,
  setValue,
  // files = [],
  // handlePreview,
  // handlePreviewGiveNumber,
  // handleDownload,
  draftSymbol,
}) => {
  // Lưu giá trị base của releaseNo (không có phần toBook appended)
  const [releaseNoBase, setReleaseNoBase] = useState("");

  const dispatch = useDispatch();
  useEffect(() => {
    if (open) {
      setValue("releaseDate", dayjs());
      dispatch(getListBookDocuments());

      // Set giá trị mặc định cho tọa độ
      setValue("texts.day.x", 425);
      setValue("texts.day.y", 143);
      setValue("texts.day.fontSize", 13);

      setValue("texts.month.x", 476);
      setValue("texts.month.y", 143);
      setValue("texts.month.fontSize", 13);

      setValue("texts.year.x", 520);
      setValue("texts.year.y", 143);
      setValue("texts.year.fontSize", 13);

      setValue("texts.docNumber.x", 139);
      setValue("texts.docNumber.y", 143);
      setValue("texts.docNumber.fontSize", 13);
    }
    if (open && draftSymbol) {
      setValue("textSymbols", draftSymbol);
    }
  }, [open, dispatch, setValue, draftSymbol]);

  const { listBookDocuments, optionsSoVbDi } = useSelector(
    (state) => state.giveNumber
  );

  // Tự động chọn item đầu tiên khi có dữ liệu
  useEffect(() => {
    if (open && listBookDocuments && listBookDocuments.length > 0) {
      const firstBookDocument = listBookDocuments[0];
      if (firstBookDocument) {
        // Cập nhật trường select "Số văn bản đi"
        setValue("bookDocumentId", firstBookDocument.bookDocumentId, {
          shouldValidate: true,
        });

        // Lưu base code và set toBook, releaseNo
        const baseCode = firstBookDocument.toBookCode || "";
        setReleaseNoBase(baseCode);

        const countValue = firstBookDocument.count || "";
        setValue("toBook", countValue, { shouldValidate: true });

        const newRelease = countValue ? `${baseCode}/${countValue}` : baseCode;
        setValue("releaseNo", newRelease, { shouldValidate: true });
      }
    }
  }, [open, listBookDocuments, setValue]);

  const handleSelectBook = (fieldOnChange) => (event) => {
    fieldOnChange(event);
    const selectedBookDocument = listBookDocuments.find(
      (doc) => doc.bookDocumentId === event
    );
    const baseCode = selectedBookDocument?.toBookCode || "";
    setReleaseNoBase(baseCode);

    const countValue = selectedBookDocument?.count || "";
    setValue("toBook", countValue);
    const newRelease = countValue ? `${baseCode}/${countValue}` : baseCode;
    setValue("releaseNo", newRelease || "");
  };

  // Hàm nối giá trị method vào toBookCode
  const handleMethodChange = useCallback(
    (fieldOnChange) => (event) => {
      const newMethodValue = event.target.value;
      fieldOnChange(newMethodValue);

      // Dùng releaseNoBase (không có phần toBook) để rebuild releaseNo
      if (newMethodValue) {
        const newRelease = releaseNoBase
          ? `${releaseNoBase}/${newMethodValue}`
          : `${newMethodValue}`;
        setValue("releaseNo", newRelease);
      } else {
        setValue("releaseNo", releaseNoBase);
      }
    },
    [releaseNoBase, setValue]
  );

  // Handle auto checkbox changes
  // const handleAutoCheckChange = useCallback(
  //   (fieldName, fieldOnChange) => (event) => {
  //     fieldOnChange(event.target.checked);
  //     if (event.target.checked && fieldName !== "auto.tuDongNhap") {
  //       setValue("auto.tuDongNhap", false);
  //     }
  //   },
  //   [setValue]
  // );

  // Handle tuDongNhap checkbox change
  // const handleTuDongNhapChange = useCallback(
  //   (fieldOnChange) => (event) => {
  //     fieldOnChange(event.target.checked);
  //     if (event.target.checked) {
  //       setValue("auto.docNumber", false);
  //       setValue("auto.day", false);
  //       setValue("auto.month", false);
  //       setValue("auto.year", false);
  //     }
  //   },
  //   [setValue]
  // );
//   const autoChecks = {
//     docNumber: useWatch({ control, name: "auto.docNumber" }) || false,
//     day: useWatch({ control, name: "auto.day" }) || false,
//     month: useWatch({ control, name: "auto.month" }) || false,
//     year: useWatch({ control, name: "auto.year" }) || false,
//     tuDongNhap: useWatch({ control, name: "auto.tuDongNhap" }) !== false,
//   };

//   const optionsSoVb = [
//     { value: "SO-001", label: "Công văn giấy" },
//     { value: "SO-002", label: "Công văn điện tử" },
// 	];
	
// 	const createPreviewHandler = useCallback(
//   (type) => {
//     return () => {
//       handlePreviewGiveNumber(type);
//     };
//   },
//   [handlePreviewGiveNumber]
// );


  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      onSave={onSave}
      title="Nhập số văn bản"
      isLoading={isLoading}
      titleButton="Nhập số"
    >
      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={2}>
          <FullWidthGridItem item>
            <Controller
              name="bookDocumentId"
              control={control}
              render={({ field }) => (
                <CustomInput
                  select
                  options={optionsSoVbDi}
                  label="Số văn bản đi"
                  {...field}
                  onChange={handleSelectBook(field.onChange)}
                  error={!!errors.bookDocumentId}
                  helperText={errors.bookDocumentId?.message}
                  required
                />
              )}
            />
          </FullWidthGridItem>
          <FullWidthGridItem item>
            <Controller
              name="releaseNo"
              control={control}
              render={({ field }) => (
                <CustomInput label="Số văn bản đi" {...field} disabled />
              )}
            />
          </FullWidthGridItem>
          <Grid item xs={12} md={4}>
            <Controller
              name="toBook"
              control={control}
              render={({ field, fieldState }) => (
                <CustomInput
                  {...field}
                  label="Số văn bản"
                  fullWidth
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  required
                  onChange={handleMethodChange(field.onChange)}
                />
              )}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Controller
              control={control}
              name="textSymbols"
              render={({ field }) => (
                <CustomInput
                  label="Ký hiệu văn bản"
                  {...field}
                  error={!!errors.textSymbols}
                  helperText={errors.textSymbols?.message}
                  required
                />
              )}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Controller
              name="releaseDate"
              control={control}
              render={({ field, fieldState }) => (
                <CustomDatePicker
                  {...field}
                  label="Ngày văn bản"
                  fullWidth
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  required
                />
              )}
            />
          </Grid>
          {/* <Grid item xs={12}>
            <StyledDivider>
              <StyledTitlePopup>TỰ ĐỘNG NHẬP</StyledTitlePopup>
            </StyledDivider>
          </Grid>
          <Grid item xs={12}>
            <StyledBox>
              {[
                { name: "auto.docNumber", label: "SỐ VĂN BẢN" },
                { name: "auto.day", label: "NGÀY" },
                { name: "auto.month", label: "THÁNG" },
                { name: "auto.year", label: "NĂM" },
                {
                  name: "auto.tuDongNhap",
                  label: "TỰ ĐỘNG NHẬP",
                  color: "error",
                },
              ].map((item) => (
                <Controller
                  key={item.name}
                  name={item.name}
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <StyledCheckbox
                          {...field}
                          checked={!!field.value}
                          styleColor={item.color || "default"}
                          onChange={
                            item.name === "auto.tuDongNhap"
                              ? handleTuDongNhapChange(field.onChange)
                              : handleAutoCheckChange(item.name, field.onChange)
                          }
                        />
                      }
                      label={item.label}
                    />
                  )}
                />
              ))}
            </StyledBox>
          </Grid>{" "} */}
          {/* HIỆN THỊ KHI CÓ CHECKBOX ĐƯỢC TÍCH */}
          {/* {(autoChecks.docNumber ||
            autoChecks.day ||
            autoChecks.month ||
            autoChecks.year) && (
            <>
              <Grid item xs={12}>
                <StyledTitlePopup gutterBottom>
                  VĂN BẢN DỰ THẢO
                </StyledTitlePopup>
                <FileTableInPopup
                  files={files}
                  onPreview={handlePreview}
                  onDownload={handleDownload}
                  canNotDeleteFile
                />
              </Grid>
              <Grid item xs={12}>
                {autoChecks.docNumber && (
                  <CoordRow
                    control={control}
                    prefix="texts.docNumber"
                    label="Số VB:"
										options={optionsSoVb}
										handlePreviewGiveNumber={createPreviewHandler("docNumber")}
                  />
                )}
                {autoChecks.day && (
                  <CoordRow
                    control={control}
                    prefix="texts.day"
                    label="Ngày:"
										options={optionsSoVb}
										handlePreviewGiveNumber={createPreviewHandler("day")}
                  />
                )}
                {autoChecks.month && (
                  <CoordRow
                    control={control}
                    prefix="texts.month"
                    label="Tháng:"
										options={optionsSoVb}
										handlePreviewGiveNumber={createPreviewHandler("month")}
                  />
                )}
                {autoChecks.year && (
                  <CoordRow
                    control={control}
                    prefix="texts.year"
                    label="Năm:"
										options={optionsSoVb}
										handlePreviewGiveNumber={createPreviewHandler("year")}
                  />
                )}
              </Grid>
            </>
          )} */}
        </Grid>
      </Box>
      {isLoading && (
        <StyledLoadingPopupSignDigital>
          <CircularProgress />
        </StyledLoadingPopupSignDigital>
      )}
    </CustomDialog>
  );
};

PopupGiveNumber.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onSave: PropTypes.func,
  handleSubmit: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  control: PropTypes.object,
  errors: PropTypes.object,
  isLoading: PropTypes.bool,
  setValue: PropTypes.func,
  watch: PropTypes.func,
  files: PropTypes.array,
  handlePreview: PropTypes.func,
  handleDownload: PropTypes.func,
  draftSymbol: PropTypes.string,
};

export default PopupGiveNumber;
