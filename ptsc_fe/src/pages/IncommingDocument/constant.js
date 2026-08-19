// constants/validation.js
import * as yup from "yup";

export const incomingDocumentSchema = yup.object().shape({
  soVanBan: yup.string().trim().required("Không được để trống Số văn bản"),
  donViGui: yup.mixed().nullable().required("Không được để trống Đơn vị gửi"),
  ngayVB: yup.mixed().nullable().required("Không được để trống Ngày VB"),
  ngayNhanVB: yup
    .mixed()
    .nullable()
    .required("Không được để trống Ngày nhận văn bản"),
  ngayVaoSo: yup.mixed().nullable().required("Không được để trống Ngày vào sổ"),
  trichYeu: yup.string().trim().required("Không được để trống Trích yếu"),
});
