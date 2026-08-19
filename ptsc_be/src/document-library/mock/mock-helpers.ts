// src/document-library/mock/mock-helpers.ts
export const OWNERS = [
  'Văn thư Tổng công ty',
  'Văn thư phòng ABC',
  'Phòng Kế hoạch',
  'Phòng CNTT',
];

export const randomOwner = (index = 0) =>
  OWNERS[index % OWNERS.length];

export const randomDate = (offset = 0) => {
  const base = new Date('2025-12-24T09:40:00');
  base.setMinutes(base.getMinutes() + offset * 7);

  return base
    .toLocaleString('vi-VN', { hour12: false })
    .replace(',', ' -');
};
