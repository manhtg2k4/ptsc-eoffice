import { styled } from "@mui/material/styles";
import { InputBase, Table, TableCell, TableRow } from "@mui/material";
import {
  ConfigSectionSubheader,
  MarginControlBox,
  PageContainer,
  PageTitle,
} from "./ThemeConfig.styles";

export const EditableCellInput = styled(InputBase)(({ theme }) => ({
  width: "100%",
  fontSize: "0.875rem",
  padding: "4px 8px",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 4,
  "& .MuiInputBase-input": {
    padding: 0,
  },
  "&:hover": {
    borderColor: theme.palette.text.secondary,
  },
  "&.Mui-focused": {
    borderColor: theme.palette.primary.main,
  },
}));

export const OfficialHandoverDocContainer = styled(PageContainer)(
  ({ theme }) => ({
    padding: theme.spacing(0.25),
    display: "unset",
    justifyContent: "unset",
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
  })
);

export const OfficialHandoverDocHeader = styled(PageContainer)(() => ({
  padding: "unset",
  justifyContent: "space-between",
}));

export const HeaderLeft = styled(PageContainer)(() => ({
  padding: "unset",
  display: "unset",
  justifyContent: "unset",
  textAlign: "center",
}));

export const HeaderRight = styled(PageContainer)(() => ({
  textAlign: "center",
  padding: "unset",
  display: "unset",
  justifyContent: "unset",
}));

export const DocTitle = styled(ConfigSectionSubheader)(() => ({
  textAlign: "center",
  marginTop: 24,
  marginBottom: 16,
	textTransform: "uppercase",
}));

export const DocDescription = styled(ConfigSectionSubheader)(() => ({
  marginBottom: 16,
  fontWeight: "unset",
}));

export const StyledTable = styled(Table)(() => ({
  borderCollapse: "collapse",
  border: "1px solid #000",
  "& .MuiTableCell-root": {
    border: "1px solid #000",
    padding: "8px",
    position: "static !important",
  },
  "& .MuiTableHead-root": {
    position: "static !important",
  },
  "& .MuiTableHead-root .MuiTableCell-root": {
    position: "static !important",
  },
}));

export const StyledHeaderRow = styled(TableRow)(() => ({
  borderTop: "1px solid #000",
}));

export const StyledHeaderCell = styled(TableCell, {
  shouldForwardProp: (prop) => prop !== "colWidth",
})(({ colWidth }) => ({
  fontWeight: 600,
  width: colWidth || "auto",
}));

export const StyledTotalCell = styled(TableCell)(() => ({
  fontWeight: 600,
}));

export const StyledEditableCell = styled(TableCell)(() => ({
  padding: "4px",
}));

export const SummaryBox = styled(PageContainer)(() => ({
  marginTop: 16,
  padding: "unset",
  display: "unset",
  justifyContent: "unset",
}));

export const SignatureWrapper = styled(PageContainer)(({ theme }) => ({
  justifyContent: "space-between",
  // marginTop: 48,
  marginTop: theme.spacing(6),
  padding: "unset",
}));

export const SignatureBox = styled(MarginControlBox)(() => ({
  width: "45%",
  textAlign: "center",
  border: "1px dashed #999",
  padding: 24,
}));

export const BoldText = styled(ConfigSectionSubheader)(() => ({
  // fontWeight: "bold",
}));

export const ErrorText = styled(PageTitle)(({ theme }) => ({
  color: theme.palette.error.main,
}));

export const ItalicText = styled(ConfigSectionSubheader)(() => ({
  fontStyle: "italic",
  fontWeight: "unset",
}));

export const SignatureTitle = styled(ConfigSectionSubheader)(() => ({}));

export const SignatureNameReceiver = styled(ConfigSectionSubheader)(() => ({
  marginTop: 32,
  fontWeight: "unset",
}));

export const SignatureNameSender = styled(PageTitle)(({ theme }) => ({
  marginTop: 32,
  color: theme.palette.error.main,
}));
