import React, { useState } from 'react';
import CustomInput from '@components/CustomInput/CustomInput';
import { 
  SearchContainer, 
  SearchButton, 
  ButtonContainer,
  FormGrid,
  GridItemLarge,
  GridItemSmall
} from '@styles/LookUpTab.styles';

const StatisticalLookup = () => {
  const [formData, setFormData] = useState({
    timKiem: '',
    tuNgay: '',
    denNgay: '',
    hanXuLy: '',
    doKhan: '',
    donViSoanThao: '',
    loaiVanBan: '',
    nguoiKyDuThao: '',
    ngayBanHanh: '',
    linhVuc: '',
    doMat: '',
    noiNhanDeBiet: '',
    phucDapVanBan: '',
    congViecLienQuan: '',
    donViNhan: '',
  });

  // Dữ liệu mẫu cho các dropdown
  const optionsDoKhan = [
    { _id: '1', name: 'Thường' },
    { _id: '2', name: 'Khẩn' },
    { _id: '3', name: 'Hỏa tốc' },
  ];

  const optionsLoaiVanBan = [
    { _id: '1', name: 'Công văn' },
    { _id: '2', name: 'Quyết định' },
    { _id: '3', name: 'Thông báo' },
    { _id: '4', name: 'Báo cáo' },
  ];

  const optionsDoMat = [
    { _id: '1', name: 'Thường' },
    { _id: '2', name: 'Mật' },
    { _id: '3', name: 'Tối mật' },
  ];

  const optionsLinhVuc = [
    { _id: '1', name: 'Hành chính' },
    { _id: '2', name: 'Tài chính' },
    { _id: '3', name: 'Nhân sự' },
  ];

  const optionsHanXuLy = [
    { _id: '1', name: 'Trong hạn' },
    { _id: '2', name: 'Quá hạn' },
  ];

  const handleChange = (field) => (value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSearch = () => {
    logger.log('Tìm kiếm với dữ liệu:', formData);
    // Xử lý logic tìm kiếm ở đây
  };

  return (
    <SearchContainer elevation={0}>
      <FormGrid container spacing={2}>
        {/* Row 1 */}
        <GridItemLarge item>
          <CustomInput
            placeholder="Tìm kiếm ..."
            value={formData.timKiem}
            onChange={handleChange('timKiem')}
            size="small"
          />
        </GridItemLarge>

        <GridItemSmall item>
          <CustomInput
            label="Từ ngày"
            type="date"
            value={formData.tuNgay}
            onChange={handleChange('tuNgay')}
            size="small"
          />
        </GridItemSmall>

        <GridItemSmall item>
          <CustomInput
            label="Đến ngày"
            type="date"
            value={formData.denNgay}
            onChange={handleChange('denNgay')}
            size="small"
          />
        </GridItemSmall>

        <GridItemSmall item>
          <CustomInput
            label="Hạn xử lý"
            select
            value={formData.hanXuLy}
            onChange={handleChange('hanXuLy')}
            options={optionsHanXuLy}
            customLabel="name"
            customValue="_id"
            placeholder="Tìm kiếm"
            size="small"
          />
        </GridItemSmall>

        <GridItemSmall item>
          <CustomInput
            label="Độ khẩn"
            select
            value={formData.doKhan}
            onChange={handleChange('doKhan')}
            options={optionsDoKhan}
            customLabel="name"
            customValue="_id"
            placeholder="Tìm kiếm"
            size="small"
          />
        </GridItemSmall>

        {/* Row 2 */}
        <GridItemLarge item>
          <CustomInput
            label="Loại văn bản"
            select
            value={formData.loaiVanBan}
            onChange={handleChange('loaiVanBan')}
            options={optionsLoaiVanBan}
            customLabel="name"
            customValue="_id"
            placeholder="Tìm kiếm"
            size="small"
          />
        </GridItemLarge>

        <GridItemSmall item>
          <CustomInput
            label="Người ký dự thảo"
            select
            value={formData.nguoiKyDuThao}
            onChange={handleChange('nguoiKyDuThao')}
            options={[]}
            placeholder="Tìm kiếm"
            size="small"
          />
        </GridItemSmall>

        <GridItemSmall item>
          <CustomInput
            label="Ngày ban hành"
            type="date"
            value={formData.ngayBanHanh}
            onChange={handleChange('ngayBanHanh')}
            size="small"
          />
        </GridItemSmall>

        <GridItemSmall item>
          <CustomInput
            label="Lĩnh vực"
            select
            value={formData.linhVuc}
            onChange={handleChange('linhVuc')}
            options={optionsLinhVuc}
            customLabel="name"
            customValue="_id"
            placeholder="Tìm kiếm"
            size="small"
          />
        </GridItemSmall>

        <GridItemSmall item>
          <CustomInput
            label="Độ mật"
            select
            value={formData.doMat}
            onChange={handleChange('doMat')}
            options={optionsDoMat}
            customLabel="name"
            customValue="_id"
            placeholder="Tìm kiếm"
            size="small"
          />
        </GridItemSmall>

        {/* Row 3 */}
        <GridItemLarge item>
          <CustomInput
            label="Phúc đáp văn bản"
            select
            value={formData.phucDapVanBan}
            onChange={handleChange('phucDapVanBan')}
            options={[]}
            placeholder="Tìm kiếm"
            size="small"
          />
        </GridItemLarge>

        <GridItemSmall item>
          <CustomInput
            label="Công việc liên quan"
            select
            value={formData.congViecLienQuan}
            onChange={handleChange('congViecLienQuan')}
            options={[]}
            placeholder="Tìm kiếm"
            size="small"
          />
        </GridItemSmall>

        <GridItemSmall item>
          <CustomInput
            label="Đơn vị nhận"
            select
            value={formData.donViNhan}
            onChange={handleChange('donViNhan')}
            options={[]}
            placeholder="Tìm kiếm"
            size="small"
          />
        </GridItemSmall>

        <GridItemSmall item>
          <CustomInput
            label="Đơn vị soạn thảo"
            select
            value={formData.donViSoanThao}
            onChange={handleChange('donViSoanThao')}
            options={[]}
            placeholder="Tìm kiếm"
            size="small"
          />
        </GridItemSmall>

        <GridItemSmall item>
          <CustomInput
            label="Nơi nhận để biết"
            select
            value={formData.noiNhanDeBiet}
            onChange={handleChange('noiNhanDeBiet')}
            options={[]}
            placeholder="Tìm kiếm"
            size="small"
          />
        </GridItemSmall>
      </FormGrid>

      <ButtonContainer>
        <SearchButton onClick={handleSearch}>
          TRA CỨU
        </SearchButton>
      </ButtonContainer>
    </SearchContainer>
  );
};

export default StatisticalLookup;