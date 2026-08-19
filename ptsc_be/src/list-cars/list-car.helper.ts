
export const VEHICLE_STATE_LABEL: Record<string, string> = {
  SAN_SANG: 'Sẵn sàng',
  DANG_SU_DUNG: 'Đang sử dụng',
  BAO_DUONG: 'Bảo dưỡng',
};
export function getCarStateLabel(code?: string | number): string {
  if (!code) return 'Không xác định';
  return VEHICLE_STATE_LABEL[String(code)] || 'Không xác định';
}
const VEHICLE_STATUS_STYLE: Record<string, string> = {
  'Sẵn sàng': 'border:1px solid #BAB046;background: #FEF9C2;color: #FFA600;',
  'Đang sử dụng': 'border:1px solid #6EB884;background: #D0FFDE;color: #007222;',
  'Bảo dưỡng': 'border:1px solid #828282;background: #D1D1D1;color: #555555;',
};
function renderCarStatusHtml(status: string): string {

  const base = `
    display:flex;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
    align-items:center;
    justify-content:center;
    width:100%;
    height:30px;
    padding:0 16px;
    font-weight:600;
    font-size:14px;
    border-radius:15px;
  `;

  const style = VEHICLE_STATUS_STYLE[status] || 'background:#f5f5f5;color:#666;';

  return `<div style="${base}${style}">${status}</div>`;
}
export function mapDriverVehicelState(code?: string | number): string {
  const label = getCarStateLabel(code);
  return renderCarStatusHtml(label);
}
export function mapDriverVehicelStateExport(code?: string | number): string {
  return getCarStateLabel(code);
}
