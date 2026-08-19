/* eslint-disable no-console */
import dayjs from "dayjs";
import quarterOfYear from "dayjs/plugin/quarterOfYear";
// import api from "api";
 import api from "@services/api";
import { API_LOG_DHVBTC, API_USER_LOGS } from "@EnvironmentFile/constants/urlConfig";

// startOf/endOf("quarter") chỉ hoạt động khi đã extend plugin quarterOfYear
dayjs.extend(quarterOfYear);

const normalizeDateFieldToken = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");

const getDateFieldGroupToken = (field = {}) => {
  const rawName = field?.name || field?.key || "";
  const normalizedName = normalizeDateFieldToken(rawName).replace(/(from|to)$/, "");
  if (normalizedName) return normalizedName;

  return normalizeDateFieldToken(field?.label || "");
};

export const getDefaultDatePresetSourceField = (field, fields = []) => {
  if (!field || field.type !== "date" || !Array.isArray(fields) || fields.length === 0) {
    return null;
  }

  if (field.timeDeafultValue && field.defaultTimePreset) {
    return field;
  }

  const fieldLabel = normalizeDateFieldToken(field.label || "");
  const fieldToken = getDateFieldGroupToken(field);

  return (
    fields.find((candidate) => {
      if (
        !candidate ||
        candidate.type !== "date" ||
        !candidate.timeDeafultValue ||
        !candidate.defaultTimePreset
      ) {
        return false;
      }

      const candidateLabel = normalizeDateFieldToken(candidate.label || "");
      const candidateToken = getDateFieldGroupToken(candidate);

      if (fieldToken && candidateToken && fieldToken === candidateToken) {
        return true;
      }

      if (fieldLabel && candidateLabel && fieldLabel === candidateLabel) {
        return true;
      }

      return false;
    }) || null
  );
};

/**
 * Tính khoảng ngày mặc định từ loại preset (dùng cho cấu hình "Tìm kiếm thời gian mặc định").
 * - week/quarter/year: đầu mốc -> cuối mốc theo lịch dương.
 * - month: từ ngày này của tháng trước -> hôm nay.
 * - last2Months: từ đầu tháng trước -> hôm nay (tính ngược theo ngày hiện tại).
 * - beforeAfter2Months: từ ngày này của 2 tháng trước -> ngày này của 2 tháng sau.
 * @param {string} preset
 * @returns {{startDate: string, endDate: string} | null} chuỗi YYYY-MM-DD, hoặc null nếu preset không hợp lệ.
 */
export const getDefaultTimeRangeFromPreset = (preset) => {
  const now = dayjs();

  if (preset === "month") {
    return {
      startDate: now.subtract(1, "month").format("YYYY-MM-DD"),
      endDate: now.format("YYYY-MM-DD"),
    };
  }

  if (preset === "last2Months") {
    return {
      startDate: now.subtract(1, "month").startOf("month").format("YYYY-MM-DD"),
      endDate: now.format("YYYY-MM-DD"),
    };
  }

  if (preset === "beforeAfter2Months") {
    return {
      startDate: now.subtract(2, "month").format("YYYY-MM-DD"),
      endDate: now.add(2, "month").format("YYYY-MM-DD"),
    };
  }

  const unitMap = { week: "week", month: "month", quarter: "quarter", year: "year" };
  const unit = unitMap[preset];
  if (!unit) return null;
  return {
    startDate: now.startOf(unit).format("YYYY-MM-DD"),
    endDate: now.endOf(unit).format("YYYY-MM-DD"),
  };
};
 /**
 * Xuất dữ liệu thành tệp XLSX (Excel).
 *
 * @function exportToXLSX
 * @param {Array} data - Dữ liệu cần xuất, phải là một mảng các đối tượng.
 * @param {string} fileName - Tên tệp sẽ được lưu, bao gồm phần mở rộng `.xls`.
 * @param {number} totalPage - Tổng số trang.
 * @param {string} columns - Tiêu đề cột (nếu không có dữ liệu )
 * @param {string} sheetName - Tên sheetName.
  */



export const exportToXLSX = (data, fileName, totalPage, columns, sheetName = 'W3C Example Table') => {
    //  if (!Array.isArray(data) || !data.length) return;
     // Cắt bỏ phần đuôi ".xlsx" nếu có
    const displayFileName = fileName.replace(/(\.xlsx|\.xls)$/, '');
    const template = (fileName, tableHtml) => `
     <html xmlns:o="urn:schemas-microsoft-com:office:office"
           xmlns:x="urn:schemas-microsoft-com:office:excel"
           xmlns="http://www.w3.org/TR/REC-html40">
       <head>
       <!--[if gte mso 9]>
       <xml>
       <x:ExcelWorkbook>
       <x:ExcelWorksheets>
       <x:ExcelWorksheet>
        <x:Name>${sheetName}</x:Name>
       <x:WorksheetOptions>
       <x:DisplayGridlines/>
       </x:WorksheetOptions>
       </x:ExcelWorksheet>
       </x:ExcelWorksheets>
       </x:ExcelWorkbook></xml>
       <![endif]-->
       <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
       </head>
       <body>
          
           ${tableHtml}
              
       </body></html>`;
    function base64(s) {
        return window.btoa(unescape(encodeURIComponent(s)));
    }

    function format(s, c) {
        return s.replace(/{(\w+)}/g, (m, p) => c[p]);
    }

    const uri = 'data:application/vnd.ms-excel;base64,';

    // Chuyển đổi dữ liệu json thành bảng html
    const generateTableHtml = (data) => {
        let tableHtml = '<table><thead><tr>';
        const headers = columns.map(c => c.row); // field keys
        const headerNames = columns.map(c => c.name); // display names
        logger.log("🚀 ~ generateTableHtml ~ columns:", columns,data)
        headerNames.forEach((name) => {
            tableHtml += `<th>${name}</th>`;
        });
    
        tableHtml += '</tr></thead><tbody>';
    
        data.forEach((row) => {
            tableHtml += '<tr>';
            headers.forEach((key) => {
                // let cell = row[key] ?? '';

                // // Định dạng ngày tháng cho các trường 'submissionDate' và 'completionDate'
                // if ((key === 'submissionDate' || key === 'completionDate') && cell) {
                //     cell = dayjs(cell).format('DD/MM/YYYY');
                // }
                tableHtml += `<td>${row[key] ?? ''}</td>`;
            });
            tableHtml += '</tr>';
        });
    
        tableHtml += '</tbody></table>';
        return tableHtml;
    };
    

    const tableHtml = generateTableHtml(data);
    const ctx = { worksheet: displayFileName || 'Worksheet', table: tableHtml };

    const a = document.createElement('a');
    a.href = uri + base64(format(template(displayFileName, tableHtml), ctx));
    a.download = `${fileName}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

/**
* Xuất dữ liệu thành tệp PDF.
* @param {Array} data - Dữ liệu cần xuất, phải là một mảng các đối tượng.
* @param {string} fileName - Tên tệp sẽ được lưu, bao gồm phần mở rộng `.pdf`.
* @param {Array} columns - Các cột dữ liệu, mỗi cột là một đối tượng với các thuộc tính như `name`, `row`, `accessor`.
 */
export const exportToPDF = async (data, fileName,columns) => {
logger.log("🚀 ~ exportToPDF ~ columns:", columns)

    const displayFileName = fileName.replace(/(\.pdf)$/, '');


    // Mở tab mới để hiển thị nội dung
    const newTab = window.open('', '_blank');
    if (!newTab) {
        logger.error('Không thể mở tab mới.');
        return;
    }

    // Khởi tạo nội dung HTML
    let htmlContent = `
         <html>
         <head>
             <title>${displayFileName}</title>
             <style>
                 body { 
                     font-family: Arial, sans-serif; 
                     padding: 0; 
                     margin: 0; 
                     width: 100%;
                 }
                 table { 
                     width: 100%; 
                     border-collapse: collapse; 
                     margin: 0; 
                 }
                 th, td { 
                     border: 1px solid black; 
                     padding: 8px; 
                     text-align: center; 
                 }
                 th { 
                     background-color: #f2f2f2; 
                 }
                 tr { 
                     break-inside: avoid; 
                 }
             </style>
         </head>
         <body>
             <div style="text-align: center; margin: 10px 0;">
                 <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">${displayFileName}</h3>
                 <p style="text-align: start; margin-bottom: 10px;">Ngày xuất báo cáo: ${dayjs().format('DD/MM/YYYY')}</p>
             </div>
     `;

    // Tạo bảng HTML cho toàn bộ dữ liệu
    const tableElement = createTableElement(data,columns);
    htmlContent += tableElement.outerHTML;

    // Kết thúc nội dung HTML
    htmlContent += `
             </body>
             <script>
                 window.onload = function() {
                     window.print();
                 }
             </script>
         </html>
     `;

    newTab.document.open();
    newTab.document.write(htmlContent);
    newTab.document.close();

    newTab.focus();
};

// Hàm tạo bảng HTML để hiển thị dữ liệu
const createTableElement = (data, columns) => {
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.backgroundColor = '#ffffff';
    table.style.tableLayout = 'fixed';

    const headers = columns.map(col => col.name);
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    headers.forEach((header) => {
        const th = document.createElement('th');
        th.style.border = '1px solid rgb(185 185 185)';
        th.style.padding = '8px';
        th.style.textAlign = 'center';
        th.style.wordWrap = 'break-word';
        th.style.whiteSpace = 'normal';
        if (header === 'STT') th.style.width = '40px';
        th.innerText = header;
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    data.forEach((row) => {
        const tr = document.createElement('tr');
        tr.style.breakInside = 'avoid';
        headers.forEach((header) => {
            const column = columns.find(col => col.name === header);
            const td = document.createElement('td');
            td.style.border = '1px solid rgb(185 185 185)';
            td.style.padding = '8px';
            td.style.textAlign = 'start';
            td.style.wordWrap = 'break-word';
            td.style.whiteSpace = 'normal';

            let cellValue = row[column?.row] ?? '';
            if (column?.accessor) {
                cellValue = column.accessor(row) ?? '';
            }

            td.innerHTML = cellValue;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    return table;
};

export const createdLog = (data) => {
    const logData = {
        ...data,
    };

    api.post(API_USER_LOGS, logData)
        .catch(err => logger.error("Lỗi khi gửi log:", err));
};

export function generateUniqueId() {
  const timestamp = Date.now().toString(); // số mili giây
  const randomPart = Array.from({ length: 24 - timestamp.length }, () => 
    Math.floor(Math.random() * 10)
  ).join("");
  return timestamp + randomPart;
}

export async function updateVariables(apiUrl, processInstanceId, variables) {
  try {
    const mappedVariables = Object.entries(variables).reduce((acc, [key, value]) => {
      acc[key] = { value };
      return acc;
    }, {});

    const payload = {
      processInstanceId,
      variables: mappedVariables,
    };

    const response = await api.put(apiUrl, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.data;
  } catch (error) {
    logger.error("Error updating variables:", error.response?.data || error.message);
    throw error;
  }
}

export const createAuditLog = async ({
  action,
  details,
  method = 'GET',
  status = 'success',
}) => {
  try {
    // 1. Lấy thông tin người dùng từ localStorage
    const storedUser = localStorage.getItem('userData');
    const user = storedUser ? JSON.parse(storedUser) : {};
    const userInfoPayload = {
      fullName: user?.user?.name || user?.username || '',
      userName: user?.user?.username || '',
      organization: user?.user?.organizationName || '',
      ipAddress: '192.168.0.1', // IP sẽ được backend tự điền
    };

    // 3. Tạo payload
    const logPayload = {
      action,
      details,
      method,
      status,
      type: 'DHVBTC',
      subType: 'DHVBTC',
      userInfo: userInfoPayload,
      timestamp: new Date().toISOString(),
    };

    // Gửi log
    await api.post(API_LOG_DHVBTC, logPayload);

  } catch (error) {
    console.error('Lỗi khi gửi audit log:', error.response?.data || error.message);
    // Không ném lỗi ra ngoài để không ảnh hưởng đến luồng chính của ứng dụng
  }
};

export const formatSingleDateValue = (val) => {
  if (!val) return val;
  if (typeof val === "string") {
    const d = dayjs(val);
    return d.isValid() ? d.format("YYYY-MM-DD") : val;
  }
  if (dayjs.isDayjs(val)) {
    return val.format("YYYY-MM-DD");
  }
  if (val instanceof Date) {
    return dayjs(val).format("YYYY-MM-DD");
  }
  if (typeof val === "object" && val.startDate) {
    const d = dayjs(val.startDate);
    return d.isValid() ? d.format("YYYY-MM-DD") : val.startDate;
  }
  return val;
};
