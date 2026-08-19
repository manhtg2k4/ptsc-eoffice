import React, { useState, useCallback } from "react";
import PropTypes from "prop-types";
import { Chip, Button } from "@mui/material";
import { styled } from "@mui/material/styles";
// import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CustomDialog from "@components/CustomDialog/CustomDialog";
import CustomTableFolder from "@components/CustomTable/CustomTableFolder";
import { API_GET_LIST_DOCUMENT_NOT_OPEN } from "@EnvironmentFile/constants/urlConfig";
import api from "@services/api";

import { useToast } from "@components/common/ToastProvider";
import { SkyBox } from "@styles/SkyStyles";
import DOMPurify from "dompurify";
import { encodeHTML } from "@/utils/securityUtils";
const StyledDialogContent = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(2),
}));


// const StyledTitleContainer = styled(SkyBox)(({ theme }) => ({
//     display: 'flex',
//     alignItems: 'center',
//     gap: theme.spacing(1),
// }));

const StyledCancelButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.error.main,
  color: theme.palette.common.white,
  textTransform: 'none',
  padding: '6px 16px',
  '&:hover': {
    backgroundColor: theme.palette.error.dark,
  }
}));

const StyledConfirmButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.common.white,
  textTransform: 'none',
  padding: '6px 16px',
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  }
}));

// const StyledFolderIcon = styled(FolderOpenIcon)(() => ({
//     color: '#ffca28',
// }));

const StyledStatusChip = styled(Chip)(({ type }) => ({
    backgroundColor: type === 'opened' ? '#e8f5e9' : '#f5f5f5',
    color: type === 'opened' ? '#2e7d32' : '#757575',
    borderRadius: '4px',
    minWidth: '80px'
}));

const StyledFooterBox = styled(SkyBox)(({ theme }) => ({
    display: 'flex',
    gap: theme.spacing(1),
    justifyContent: 'flex-end',
    padding: theme.spacing(2),
}));


const FolderSelectionDialog = ({
  open,
  onClose,
  onSave,
}) => {
  const [selection, setSelection] = useState([]);
  const toast = useToast();

  const fetchData = useCallback(async (tableParams) => {
      const { page, limit, query, code, sort, ...rest } = tableParams;
    try {
      const params = {
        page,
        limit,
        ...sort,
        ...rest
      };

      if (query) {
        const searchFields = code && code.length > 0 ? code : ['documentTitle'];
        searchFields.forEach(field => {
          params[`filter[${field}]`] = query;
        });
      }
      const response = await api.get(`${API_GET_LIST_DOCUMENT_NOT_OPEN}`, { params });
      const resData = response.data;
      
      let actualData = Array.isArray(resData.data) ? resData.data : (resData.data?.data || []);
      const actualTotal = typeof resData.total === 'number' ? resData.total : (resData.data?.total || 0);

      // Client-side fallback filtering
      actualData = actualData.filter(item => item.status == 0);

      return {
        data: actualData,
        total: actualTotal,
      };
    } catch (error) {
      toast("Không thể tải danh sách danh mục hồ sơ!", "error");
      return { data: [], total: 0 };
    }
  }, [toast]);

  const handleSelectionChange = useCallback((newSelection) => {
    // Single selection logic
    if (newSelection.length > 1) {
      setSelection([newSelection[newSelection.length - 1]]);
    } else {
      setSelection(newSelection);
    }
  }, []);

  const handleConfirm = () => {
    if (selection.length > 0) {
      onSave(selection[0]);
      onClose();
    } else {
      toast("Vui lòng chọn hồ sơ", "error");
    }
  };

  const columns = [
    {
      name: "Danh mục năm",
      row: "year",
      // width: "120px",
    },
    {
      name: "Đề mục hồ sơ",
      row: "folderTitle",
      // width: "200px",
    },
    {
        name: "Tên hồ sơ phòng",
        row: "fileTitle",
        // width: "200px",
    },
    {
      name: "Số và ký hiệu hồ sơ",
      row: "documentSymbol",
      // width: "180px",
    },
    {
      name: "Tiêu đề hồ sơ",
      row: "documentTitle",
      // width: "100px",
      isFolder: true,
      render: (value) => {
        const title = value || "";
        const hasHtml = /<[^>]+>/.test(title);
        
        if (hasHtml) {
            return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(`<p>${encodeHTML(title)}</p>`) }} />;
        }

        return title;
      },
    },
    {
      name: "Trạng thái",
      row: "statusLabel",
      // width: "120px",
      render: (value, row) => {
        if (value && value.includes('<')) {
          return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(`<p>${value}</p>`) }} />;
        }
        const statusMap = {
          "0": "Chưa mở",
          "1": "Đã mở",
          "2": "Đã lưu trữ"
        };
        const label = statusMap[row.status] || "Chưa mở";
        const isOpened = row.status === "1" || row.status === "2";
        
        return (
          <StyledStatusChip
            label={label}
            size="small"
            type={isOpened ? 'opened' : 'closed'}
          />
        );
      },
    },
  ];

  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      title="CHỌN HỒ SƠ"
      size="lg"
      hideFooter
    >
      <StyledDialogContent>
        <CustomTableFolder
          fetchData={fetchData}
          columns={columns}
          selection={selection}
          onSelectionChange={handleSelectionChange}
          rowKey="id"
          filter={[
             { name: "Danh mục năm", code: "year" },
             { name: "Đề mục hồ sơ", code: "folderTitle" },
             { name: "Tên hồ sơ phòng", code: "fileTitle" },
            { name: "Tiêu đề hồ sơ", code: "documentTitle" },
            { name: "Số và ký hiệu hồ sơ", code: "documentSymbol" },
          ]}
          headerTableProps={{
              placeholder: "Tìm kiếm theo Tiêu đề hồ sơ, và Số ký hiệu hồ sơ",
          }}
          disableAct
          onlyTable={false}
          autoHeight
          disableAdd
          disableDeletePQ
          disableSynchronize
          selectionReturns="object"
          anableSTT={false}
        />
      </StyledDialogContent>
      <StyledFooterBox>
        <StyledConfirmButton onClick={handleConfirm} variant="contained">
          XÁC NHẬN
        </StyledConfirmButton>
        <StyledCancelButton onClick={onClose} variant="contained">
          HUỶ
        </StyledCancelButton>
      </StyledFooterBox>
    </CustomDialog>
  );
};

FolderSelectionDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default FolderSelectionDialog;
