import { styled, keyframes } from '@mui/material/styles';
import { Box, Checkbox, Popover, TextField } from '@mui/material';
import { Search, FilterAlt, Tune } from '@mui/icons-material';
import { SkyBox, SkyButton, SkyTypography } from '@styles/SkyStyles';

export const Container = styled(SkyBox, {
	shouldForwardProp: (prop) => prop !== 'isFullScreen',
})(({ theme, isFullScreen }) => ({
	display: 'flex',
	flexDirection: 'column',
	height: isFullScreen ? '100vh' : 'auto',
	width: isFullScreen ? '100vw' : '100%',
	position: isFullScreen ? 'fixed !important' : 'relative',
	top: 0,
	left: 0,
	right: 0,
	bottom: 0,
	zIndex: isFullScreen ? '2147483647 !important' : 0,
	border: `1px solid ${theme.palette.divider}`,
	background: theme.palette.background.paper,
	maxWidth: isFullScreen ? '100vw' : '100%',
	fontFamily: '"Segoe UI", sans-serif',
	fontSize: '13px',
	color: theme.palette.text.primary,
	overflow: isFullScreen ? 'hidden' : 'visible',
	[theme.breakpoints.down('md')]: {
		fontSize: '12px',
		border: 'none',
	},
}));

export const Toolbar = styled(SkyBox)(({ theme }) => ({
	display: 'flex',
	justifyContent: 'space-between',
	alignItems: 'center',
	padding: '10px 15px',
	background: theme.palette.background.paper,
	borderBottom: `1px solid ${theme.palette.divider}`,
	flexWrap: 'wrap',
	gap: '10px',
}));

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const SearchBarWrapper = styled(SkyBox)({
	display: 'flex',
	alignItems: 'center',
	gap: '10px',
	flexWrap: 'wrap',
});

const InputGroup = styled(SkyBox)(({ theme }) => ({
	display: 'flex',
	alignItems: 'center',
	border: `1px solid ${theme.palette.divider}`,
	borderRadius: '4px',
	background: theme.palette.background.paper,
	height: '38px',
	width: '400px',
	maxWidth: '400px',
	minWidth: '100px',
	position: 'relative',
	'@media (max-width: 600px)': {
		width: '100%',
	},
}));

const StyledInput = styled('input')(({ theme }) => ({
	flex: 1,
	border: 'none',
	outline: 'none',
	background: 'transparent',
	padding: '0 10px',
	color: theme.palette.text.primary,
	fontSize: '13px',
	height: '100%',
	'&::placeholder': {
		color: theme.palette.text.secondary,
	},
}));

const InputIcon = styled(SkyBox, {
	shouldForwardProp: (prop) => prop !== '$active',
})(({ theme, $active }) => ({
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	padding: '0 10px',
	cursor: 'pointer',
	color: $active ? theme.palette.primary.main : theme.palette.text.secondary,
	borderLeft: `1px solid ${theme.palette.divider}`,
	height: '24px',
	'&:hover': {
		color: theme.palette.primary.main,
	},
}));

const StyledTune = styled(Tune)({
	fontSize: '20px',
});

const SearchButtonAttached = styled(SkyButton)(({ theme }) => ({
	height: '100%',
	minWidth: '40px',
	padding: '0 10px',
	background: theme.palette.primary.main,
	color: theme.palette.primary.contrastText,
	borderRadius: '0 4px 4px 0',
	borderTopLeftRadius: 0,
	borderBottomLeftRadius: 0,
	'&:hover': { background: theme.palette.primary.dark },
}));

const FilterButton = styled(SkyButton)(({ theme }) => ({
	height: '38px',
	background: theme.palette.primary.main,
	color: theme.palette.primary.contrastText,
	borderRadius: '4px',
	padding: '0 15px',
	display: 'flex',
	alignItems: 'center',
	gap: '5px',
	whiteSpace: 'nowrap',
	'&:hover': { background: theme.palette.primary.dark },
}));

// ===== SEARCH BAR (SearchSection pattern) =====
const UnifiedSearchGroup = styled(SkyBox)(({ theme }) => ({
	display: 'flex',
	alignItems: 'center',
	backgroundColor: theme.palette.mode === 'light' ? '#fff' : theme.palette.background.paper,
	border: `1px solid ${theme.palette.divider}`,
	borderRadius: '12px',
	height: '40px',
	flexGrow: 1,
	minWidth: 400,
	maxWidth: 600,
	transition: 'all 0.2s ease-in-out',
	'&:focus-within': {
		borderColor: theme.palette.primary.main,
		boxShadow: `0 0 0 1px ${theme.palette.primary.main}`,
	},
	'@media (max-width: 600px)': {
		minWidth: 'unset',
		maxWidth: '100%',
	},
}));

const FilterTrigger = styled(SkyBox)(({ theme }) => ({
	display: 'flex',
	alignItems: 'center',
	gap: '8px',
	cursor: 'pointer',
	padding: '0 16px',
	borderRight: `1px solid ${theme.palette.divider}`,
	color: theme.palette.text.primary,
	height: '100%',
	flexShrink: 0,
	borderTopLeftRadius: 'inherit',
	borderBottomLeftRadius: 'inherit',
	'& span': {
		fontSize: '14px',
		fontWeight: 600,
		whiteSpace: 'nowrap',
	},
	'& svg': {
		fontSize: '20px',
		color: theme.palette.mode === 'light' ? '#31383F' : theme.palette.text.secondary,
	},
	'&:hover': {
		backgroundColor: theme.palette.action.hover,
	},
}));

const FilterTriggerBox = styled(Box)(() => ({
	position: 'relative',
	display: 'flex',
	alignItems: 'center',
	height: '100%',
}));

const UnifiedInput = styled(TextField)(({ theme }) => ({
	flexGrow: 1,
	height: '100%',
	'& .MuiOutlinedInput-root': {
		height: '100%',
		padding: 0,
		backgroundColor: 'transparent',
		'& fieldset': {
			border: 'none !important',
		},
		'& input': {
			padding: '0 12px',
			height: '100%',
			fontSize: '14px',
			color: theme.palette.text.primary,
			'&::placeholder': {
				color: theme.palette.text.secondary,
				opacity: 0.8,
			},
		},
	},
}));

const TuneIconBox = styled(SkyBox)(({ theme }) => ({
	width: 32,
	height: 32,
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	backgroundColor: theme.palette.mode === 'light' ? '#fff' : theme.palette.background.paper,
	border: `1px solid ${theme.palette.mode === 'light' ? '#DDE0E4' : theme.palette.divider}`,
	borderRadius: '10px',
	cursor: 'pointer',
	transition: 'all 0.2s ease-in-out',
	'&:hover': {
		backgroundColor: theme.palette.mode === 'light' ? '#F8F9FA' : theme.palette.action.hover,
		borderColor: theme.palette.primary.main,
	},
	'& svg': {
		fontSize: '18px',
		color: theme.palette.mode === 'light' ? '#161A1D' : theme.palette.text.primary,
	},
}));

const TuneTriggerContainer = styled(Box)(() => ({
	position: 'relative',
	display: 'flex',
	alignItems: 'center',
	marginRight: '4px',
}));

const ClearIconButton = styled('button')(({ theme }) => ({
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	width: 26,
	height: 26,
	borderRadius: '50%',
	border: 'none',
	background: 'transparent',
	cursor: 'pointer',
	padding: 0,
	color: theme.palette.text.secondary,
	'&:hover': {
		backgroundColor: theme.palette.action.hover,
		color: theme.palette.text.primary,
	},
	'& svg': {
		fontSize: '17px',
	},
}));

const SearchAdornmentStack = styled(SkyBox)(({ theme }) => ({
	display: 'flex',
	flexDirection: 'row',
	alignItems: 'center',
	gap: theme.spacing(0.5),
	paddingRight: '4px',
}));

const SearchButton = styled(SkyButton)(({ theme }) => ({
	height: 40,
	width: 40,
	minWidth: '40px !important',
	padding: 0,
	backgroundColor: theme.palette.primary.main,
	color: '#fff',
	borderRadius: '12px',
	boxShadow: 'none',
	flexShrink: 0,
	'& svg': {
		fontSize: '20px',
	},
	'&:hover': {
		backgroundColor: theme.palette.primary.dark,
		boxShadow: 'none',
	},
}));
// ===== END SEARCH BAR =====

const ActionsGroup = styled(SkyBox)({
	display: 'flex',
	gap: '10px',
});

const RelativeBox = styled(Box)({
	position: 'relative',
});

const IconButtonBlue = styled('button')(({ theme }) => ({
	background: theme.palette.primary.main,
	border: 'none',
	height: '38px',
	width: '38px',
	borderRadius: '4px',
	cursor: 'pointer',
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	color: theme.palette.primary.contrastText,
	'&:hover': {
		background: theme.palette.primary.dark || theme.palette.primary.main,
		opacity: 0.9,
	},
}));

const FilterBox = styled(SkyBox)(({ theme }) => ({
	position: 'absolute',
	top: '45px',
	right: '0',
	marginTop: '5px',
	background: theme.palette.background.paper,
	boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
	borderRadius: '12px',
	padding: '20px',
	zIndex: 100,
	minWidth: '350px',
	border: `1px solid ${theme.palette.divider}`,
}));

const StyleBoxActionDropDown = styled(SkyBox)(({ theme }) => ({
	display: 'flex',
	alignItems: 'center',
	gap: '8px',
	marginBottom: '15px',
	fontSize: '16px',
	fontWeight: 700,
	color: theme.palette.text.primary,
	borderBottom: 'none',
	paddingBottom: '0',
}));

const SearchIconBlue = styled(Search)(({ theme }) => ({
	color: theme.palette.primary.main,
	fontSize: '20px !important',
}));

const StyleActionAllCheckBox = styled(SkyBox)({
	marginBottom: '5px',
	width: '100%',
});

const StyleActionCellCheckBox = styled(SkyBox)({
	display: 'grid',
	gridTemplateColumns: '1fr 1fr',
	gap: '12px',
	marginBottom: '20px',
	marginTop: '10px',
});

const StyledCheckbox = styled(Checkbox)(({ theme }) => ({
	'&.Mui-checked': {
		color: theme.palette.primary.main,
	},
	'&.MuiCheckbox-indeterminate': {
		color: theme.palette.primary.main,
	},
}));

const CheckboxLabel = styled('span')({
	fontSize: '14px',
});

const StyleActionButton = styled(SkyBox)({
	display: 'flex',
	justifyContent: 'flex-end',
	gap: '10px',
	marginTop: '10px',
	paddingTop: '10px',
});

const ButtonCancel = styled(SkyButton)(({ theme }) => ({
	background: theme.palette.error,
	color: theme.palette.text.primary,
	border: `1px solid ${theme.palette.divider}`,
	padding: '6px 16px',
	borderRadius: '6px',
	cursor: 'pointer',
	fontWeight: 500,
	fontSize: '13px',
	'&:hover': {
		background: theme.palette.action.hover,
	},
}));

const ButtonReset = styled(ButtonCancel)(({ theme }) => ({
	border: '1px solid #ddd',
	padding: '8px 16px',
	background: theme.palette.background.default,
	color: theme.palette.text.primary,
}));

const ButtonCancelModal = styled(ButtonCancel)(({ theme }) => ({
	marginRight: '10px',
	padding: '8px 16px',
	background: theme.palette.background.default,
	color: theme.palette.text.primary,
}));

const ButtonApply = styled(SkyButton)(() => ({
	background: '#0056b3',
	color: '#fff',
	border: 'none',
	padding: '6px 16px',
	borderRadius: '6px',
	cursor: 'pointer',
	fontWeight: 500,
	fontSize: '13px',
	boxShadow: '0 2px 4px rgba(0,86,179,0.3)',
	'&:hover': {
		background: '#004494',
	},
}));

const ButtonApplyModal = styled(ButtonApply)({
	padding: '8px 16px',
});

const NavBar = styled(SkyBox)(({ theme }) => ({
	padding: '10px 15px',
	background: theme.palette.background.paper,
	borderBottom: `1px solid ${theme.palette.divider}`,
	borderTop: `1px solid ${theme.palette.divider}`,
	display: 'flex',
	justifyContent: 'space-between',
	alignItems: 'center',
	flexShrink: 0,
	'@media (max-width: 768px)': {
		flexWrap: 'wrap',
		padding: '8px 10px',
		gap: '8px',
	},
}));

const NavLeft = styled(SkyBox)(() => ({
	display: 'flex',
	alignItems: 'center',
	gap: '8px',
	'@media (max-width: 768px)': {
		gap: '4px',
	},
}));

const NavWeekBox = styled(SkyBox)(({ theme }) => ({
	display: 'flex',
	alignItems: 'center',
	border: `1px solid ${theme.palette.divider}`,
	borderRadius: '6px',
	overflow: 'hidden',
	height: '32px',
}));

const TodayButton = styled(SkyButton)(({ theme }) => ({
	background: theme.palette.primary.main,
	color: theme.palette.primary.contrastText,
	border: 'none',
	padding: '6px 12px',
	cursor: 'pointer',
	borderRadius: '10px',
	marginRight: '5px',
	fontWeight: 500,
	'&:hover': {
		opacity: 0.9,
	},
	'@media (max-width: 768px)': {
		padding: '5px 8px',
		fontSize: '11px',
		marginRight: '3px',
	},
}));

const NavArrowButton = styled(SkyButton)(({ theme }) => ({
	cursor: 'pointer',
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	width: '32px',
	height: '100%',
	color: theme.palette.text.secondary,
	background: 'transparent',
	borderRight: `1px solid ${theme.palette.divider}`,
	borderTopRightRadius: 0,
	borderBottomRightRadius: 0,
	'&:last-of-type': {
		borderRight: 'none',
		borderLeft: `1px solid ${theme.palette.divider}`,
		borderTopLeftRadius: 0,
		borderBottomLeftRadius: 0,
	},
	'&:hover': {
		background: theme.palette.action.hover,
	},
	'@media (max-width: 768px)': {
		width: '28px',
	},
}));

const NavWeekLabel = styled('span')(({ theme }) => ({
	padding: '0 14px',
	fontSize: '13px',
	fontWeight: 500,
	color: theme.palette.primary.main,
	whiteSpace: 'nowrap',
	userSelect: 'none',
}));

const CurrentLabel = styled('span')(({ theme }) => ({
	margin: '0 10px',
	textAlign: 'center',
	fontSize: '14px',
	fontWeight: 600,
	color: theme.palette.text.primary,
	whiteSpace: 'nowrap',
	'@media (max-width: 768px)': {
		margin: '0 8px',
		fontSize: '12px',
	},
}));

const ViewSwitcher = styled(SkyBox)(({ theme }) => ({
	display: 'flex',
	height: '32px',
	border: `1px solid ${theme.palette.divider}`,
	borderRadius: '6px',
	overflow: 'hidden',
	'@media (max-width: 768px)': {
		width: '100%',
		justifyContent: 'center',
	},
}));

const ViewSwitchButton = styled(SkyButton, {
	shouldForwardProp: (prop) => prop !== '$active',
})(({ theme, $active }) => ({
	color: theme.palette.text.primary,
	background: 'transparent',
	border: 'none',
	borderRight: `1px solid ${theme.palette.divider}`,
	padding: '0 16px',
	height: '100%',
	cursor: 'pointer',
	borderRadius: 0,
	fontSize: '13px',
	fontWeight: $active ? 700 : 400,
	transition: 'background 0.15s',
	'&:last-of-type': {
		borderRight: 'none',
	},
	'&:hover': {
		background: theme.palette.action.hover,
	},
	'@media (max-width: 768px)': {
		padding: '0 10px',
		fontSize: '11px',
		flex: 1,
	},
}));

const ContentArea = styled(SkyBox, {
	shouldForwardProp: (prop) => !['isLoading', 'isFullScreen'].includes(prop),
})(({ theme, isLoading, isFullScreen }) => ({
	flex: isFullScreen ? '1 1 auto' : 'none',
	height: isFullScreen ? 'auto' : 'calc(100vh - 455px)',
	minHeight: 0,
	overflow: 'auto',
	padding: '15px',
	position: 'relative',
	borderBottom: `1px solid ${theme.palette.divider}`,
	background: theme.palette.background.paper,
	opacity: isLoading ? 0.6 : 1,
	pointerEvents: isLoading ? 'none' : 'auto',
	transition: 'opacity 0.3s',
	'@media (max-width: 768px)': {
		height: isFullScreen ? 'auto' : 'calc(60vh - 20px)',
		padding: '10px',
	},
	'@media (max-width: 1024px) and (min-width: 768px)': {
		height: isFullScreen ? 'auto' : 'calc(500px - 20px)',
	},
}));

const DayViewContainer = styled(SkyBox)({});
const DayViewHeader = styled(SkyBox)({
	display: 'flex',
	alignItems: 'center',
	gap: '15px',
	marginBottom: '15px',
});

const HeaderCircle = styled(SkyBox)(({ theme }) => ({
	width: '50px',
	height: '50px',
	backgroundColor: theme.palette.primary.main,
	borderRadius: '50%',
	color: theme.palette.primary.contrastText,
	display: 'flex',
	flexDirection: 'column',
	alignItems: 'center',
	justifyContent: 'center',
	lineHeight: 1.1,
	boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
}));

const DaySummaryBar = styled(SkyBox)(({ theme }) => ({
	backgroundColor: theme.palette.action.hover,
	color: theme.palette.primary.main,
	padding: '8px 20px',
	borderRadius: '4px',
	marginBottom: '20px',
	fontSize: '13px',
	fontWeight: 500,
}));

const DayViewBody = styled(SkyBox)({ display: 'flex', position: 'relative' });
const TimeAxis = styled(SkyBox)(({ theme }) => ({ width: '60px', borderRight: `1px solid ${theme.palette.divider}`, flexShrink: 0, background: theme.palette.background.paper }));
const TimeLabel = styled(SkyBox)(({ theme }) => ({ height: '60px', borderBottom: '1px solid transparent', textAlign: 'right', paddingRight: '15px', fontSize: '12px', color: theme.palette.text.secondary, position: 'relative', top: -5 }));
const EventsTrack = styled(SkyBox)(({ theme }) => ({ flex: 1, position: 'relative', background: theme.palette.background.paper }));
const GridLine = styled(SkyBox)(() => ({ height: '60px', boxSizing: 'border-box', borderBottom: 'none' }));

const MEETING_STATUS_STYLES = {
	DU_KIEN: { label: 'Dự kiến', color: '#1e40af', background: '#dbeafe' },
	CHUAN_BI: { label: 'Chuẩn bị', color: '#15803d', background: '#dcfce7' },
	DANG_HOP: { label: 'Đang họp', color: '#ffa600', background: '#fff3dd' },
	BAT_DAU: { label: 'Đang họp', color: '#ffa600', background: '#fff3dd' },
	DA_KET_THUC: { label: 'Kết thúc', color: '#4b5563', background: '#f3f4f6' },
	KET_THUC: { label: 'Kết thúc', color: '#4b5563', background: '#f3f4f6' },
	DA_HUY: { label: 'Hủy', color: '#991b1b', background: '#fee2e2' },
	DRAFT: { label: 'Dự kiến', color: '#1e40af', background: '#dbeafe' },
	CANCEL: { label: 'Hủy', color: '#991b1b', background: '#fee2e2' },
	1: { label: 'Dự kiến', color: '#2196f3', background: '#e3f2fd' },
	2: { label: 'Chuẩn bị', color: '#0077C8', background: '#e1f5fe' },
	3: { label: 'Đang họp', color: '#4caf50', background: '#e8f5e9' },
	4: { label: 'Kết thúc', color: '#26A69A', background: '#e0f2f1' },
	5: { label: 'Hủy', color: '#D64545', background: '#ffebee' },
};

const DEFAULT_STATUS_STYLE = { label: 'Dự thảo', color: '#6b7280', background: '#f9fafb' };

const EventBox = styled(SkyBox, {
	shouldForwardProp: (prop) => !['posTop', 'posHeight', 'status', 'meetingState'].includes(prop),
})(({ theme, posTop, posHeight, status, meetingState }) => {
	const style = meetingState && meetingState.color && meetingState.background
		? { bg: meetingState.background, border: meetingState.color }
		: { bg: (MEETING_STATUS_STYLES[status] || DEFAULT_STATUS_STYLE).background, border: (MEETING_STATUS_STYLES[status] || DEFAULT_STATUS_STYLE).color };
	return {
		position: 'absolute', left: '10px', right: '10px', top: posTop, height: posHeight, minHeight: '40px', borderRadius: '6px',
		padding: '5px 15px', fontSize: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex',
		flexDirection: 'column', justifyContent: 'center', zIndex: 10, cursor: 'pointer', backgroundColor: style.bg,
		borderLeft: `4px solid ${style.border}`, color: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.87)' : theme.palette.text.primary,
		'&:hover': { filter: 'brightness(0.98)' },
	};
});

const WeekViewContainer = styled(SkyBox)(({ theme }) => ({ display: 'flex', flexDirection: 'column', height: '100%', minWidth: '800px', background: theme.palette.background.paper, '@media (max-width: 768px)': { minWidth: '100%', overflowX: 'auto' } }));
const WeekHeaderRow = styled(SkyBox)(({ theme }) => ({ display: 'flex', borderBottom: `1px solid ${theme.palette.divider}`, paddingLeft: '60px', position: 'relative', background: theme.palette.background.paper, height: '60px', '@media (max-width: 768px)': { paddingLeft: '40px' } }));
const WeekHeaderTimeLabel = styled(SkyBox)(({ theme }) => ({ width: '60px', textAlign: 'center', fontWeight: 'normal', color: theme.palette.text.secondary, position: 'absolute', left: '0px', top: '0px', bottom: '0px', display: 'flex', justifyContent: 'center', alignItems: 'center', '@media (max-width: 768px)': { width: '40px', fontSize: '11px' } }));
const DayColHeader = styled(SkyBox, { shouldForwardProp: (prop) => !['isToday', 'isWeekend'].includes(prop) })(({ theme, isWeekend }) => ({ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: `1px solid ${theme.palette.divider}`, background: isWeekend ? theme.palette.action.hover : theme.palette.background.paper, color: theme.palette.text.primary, gap: '5px', '@media (max-width: 768px)': { fontSize: '11px', minWidth: '60px' } }));
const DayNameText = styled('span')(({ theme, isToday }) => ({ fontSize: '11px', textTransform: 'uppercase', color: isToday ? theme.palette.primary.main : theme.palette.text.secondary, fontWeight: isToday ? 'bold' : 'normal' }));
const WeekDateNumber = styled(SkyBox, { shouldForwardProp: (prop) => prop !== 'isToday' })(({ theme, isToday }) => ({ fontSize: '16px', fontWeight: '500', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', backgroundColor: isToday ? theme.palette.primary.main : 'transparent', color: isToday ? theme.palette.primary.contrastText : 'inherit' }));
const WeekBody = styled(SkyBox)(({ theme }) => ({ display: 'flex', position: 'relative', backgroundColor: theme.palette.background.paper }));
const TimeColumn = styled(SkyBox)(({ theme }) => ({ width: '60px', borderRight: `1px solid ${theme.palette.divider}`, flexShrink: 0, background: theme.palette.background.paper, '@media (max-width: 768px)': { width: '40px' } }));
const TimeSlot = styled(SkyBox)(({ theme }) => ({ height: '60px', borderBottom: 'none', textAlign: 'center', fontSize: '11px', color: theme.palette.text.secondary, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', background: theme.palette.background.paper, '@media (max-width: 768px)': { fontSize: '10px', paddingRight: '3px', height: '60px' } }));
const DayColumn = styled(SkyBox, { shouldForwardProp: (prop) => prop !== 'isWeekend' })(({ theme, isWeekend }) => ({ flex: 1, borderRight: `1px solid ${theme.palette.divider}`, position: 'relative', minWidth: '60px', background: isWeekend ? theme.palette.action.hover : theme.palette.background.paper, '@media (max-width: 768px)': { minWidth: '60px' } }));

const WeekEventChip = styled(SkyBox, { shouldForwardProp: (prop) => !['posTop', 'posHeight', 'status', 'meetingState'].includes(prop) })(({ theme, posTop, posHeight, status, meetingState }) => {
	const style = meetingState && meetingState.color && meetingState.background
		? { bg: meetingState.background, border: meetingState.color }
		: { bg: (MEETING_STATUS_STYLES[status] || DEFAULT_STATUS_STYLE).background, border: (MEETING_STATUS_STYLES[status] || DEFAULT_STATUS_STYLE).color };
	return { position: 'absolute', width: '90%', left: '5%', top: posTop, height: posHeight, borderRadius: '4px', padding: '2px 4px', minHeight: '40px', fontSize: '11px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', zIndex: 10, cursor: 'pointer', backgroundColor: style.bg, borderLeft: `3px solid ${style.border}`, color: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.87)' : theme.palette.text.primary, display: 'flex', flexDirection: 'column', gap: '2px' };
});

const ChipTitle = styled(SkyTypography)({ fontWeight: 'bold', fontSize: '11px', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' });
const ChipText = styled(SkyTypography)(() => ({ fontSize: '10px', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'inherit' }));

const MonthViewContainer = styled(SkyBox)(({ theme }) => ({ display: 'flex', flexDirection: 'column', height: '100%', background: theme.palette.background.paper }));
const MonthHeader = styled(SkyBox)(({ theme }) => ({ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', borderBottom: `1px solid ${theme.palette.divider}`, background: theme.palette.background.paper }));
const MonthHeaderItem = styled(SkyBox, { shouldForwardProp: (prop) => prop !== 'isToday' })(({ theme, isToday }) => ({ padding: '10px', textAlign: 'left', paddingLeft: '15px', fontWeight: '500', borderRight: `1px solid ${theme.palette.divider}`, color: isToday ? theme.palette.primary.main : theme.palette.text.primary, background: theme.palette.background.paper, '@media (max-width: 768px)': { fontSize: '11px', padding: '5px' } }));
const MonthGrid = styled(SkyBox)(({ theme }) => ({ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', flex: 1, borderLeft: `1px solid ${theme.palette.divider}` }));
const MonthCell = styled(SkyBox, { shouldForwardProp: (prop) => !['isEmpty', 'isWeekend'].includes(prop) })(({ theme, isEmpty, isWeekend }) => ({ borderRight: `1px solid ${theme.palette.divider}`, borderBottom: `1px solid ${theme.palette.divider}`, minHeight: '100px', minWidth: '0px', padding: '8px', background: isEmpty ? theme.palette.action.disabledBackground : isWeekend ? theme.palette.action.hover : theme.palette.background.paper, position: 'relative', overflow: 'hidden', '@media (max-width: 768px)': { minHeight: '80px', padding: '3px' } }));
const DateNumber = styled(SkyBox, { shouldForwardProp: (prop) => !['isToday', 'isOtherMonth'].includes(prop) })(({ theme, isToday, isOtherMonth }) => ({ fontWeight: '500', marginBottom: '5px', cursor: 'pointer', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isToday ? theme.palette.primary.contrastText : isOtherMonth ? theme.palette.text.secondary : theme.palette.text.primary, backgroundColor: isToday ? theme.palette.primary.main : 'transparent', opacity: isOtherMonth ? 0.6 : 1, '&:hover': { color: isToday ? theme.palette.primary.contrastText : theme.palette.primary.main } }));

const MonthEventChip = styled(SkyBox, { shouldForwardProp: (prop) => !['status', 'meetingState'].includes(prop) })(({ theme, status, meetingState }) => {
	const style = meetingState && meetingState.color && meetingState.background
		? { bg: meetingState.background, border: meetingState.color }
		: { bg: (MEETING_STATUS_STYLES[status] || DEFAULT_STATUS_STYLE).background, border: (MEETING_STATUS_STYLES[status] || DEFAULT_STATUS_STYLE).color };
	return { fontSize: '11px', marginBottom: '3px', padding: '3px 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer', color: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.87)' : theme.palette.text.primary, borderRadius: '4px', backgroundColor: style.bg, borderLeft: `3px solid ${style.border}`, '@media (max-width: 768px)': { fontSize: '9px', padding: '1px 2px', marginBottom: '1px', maxWidth: '100%' } };
});

const MoreEventsIndicator = styled(SkyBox)(({ theme }) => ({ fontSize: '11px', color: theme.palette.text.secondary, textAlign: 'left', paddingLeft: '5px', marginTop: '5px', cursor: 'pointer', '&:hover': { color: theme.palette.primary.main, textDecoration: 'underline' }, '@media (max-width: 768px)': { fontSize: '8px', padding: '1px' } }));

const Footer = styled(SkyBox)(({ theme }) => ({ padding: '4px', display: 'flex', justifyContent: 'space-between', backgroundColor: theme.palette.background.paper, borderTop: `1px solid ${theme.palette.divider}`, flexShrink: 0, '@media (max-width: 768px)': { flexDirection: 'column', gap: '15px', padding: '12px 10px' } }));
const FooterSection = styled(SkyBox)(({ theme }) => ({ display: 'flex', flexDirection: 'column', gap: '8px', color: theme.palette.text.primary, '@media (max-width: 768px)': { gap: '6px' } }));
const LegendGrid = styled(SkyBox)(() => ({ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', '@media (max-width: 768px)': { gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' } }));
const LegendItem = styled(SkyBox)(({ theme }) => ({ display: 'flex', alignItems: 'center', fontSize: '13px', color: theme.palette.text.primary }));
const LegendBox = styled(SkyBox, { shouldForwardProp: (prop) => !['fillColor', 'edgeColor'].includes(prop) })(({ theme, fillColor, edgeColor }) => ({ width: '25px', height: '14px', marginRight: '8px', borderRadius: '3px', backgroundColor: fillColor, borderLeft: `4px solid ${edgeColor}`, color: theme.palette.text.primary }));

const Overlay = styled(SkyBox)({ position: 'fixed', top: '0px', left: '0px', right: '0px', bottom: '0px', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, animation: `${fadeIn} 0.2s ease-out` });
const PopupContainer = styled(SkyBox)(({ theme }) => ({ background: theme.palette.background.paper, color: theme.palette.text.primary, borderRadius: '12px', boxShadow: theme.palette.mode === 'dark' ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 30px rgba(0,0,0,0.2)', padding: '24px', position: 'relative', width: '400px', '@media (max-width: 768px)': { width: '95vw', maxWidth: '95vw', padding: '16px', borderRadius: '8px', maxHeight: '90vh', overflowY: 'auto' }, '@media (max-width: 1024px) and (min-width: 768px)': { width: '90vw', maxWidth: '400px' } }));
const PopupContainerDetail = styled(PopupContainer)(() => ({ maxWidth: '500px', '@media (max-width: 768px)': { width: '95vw' } }));
const StyledPopover = styled(Popover)({ pointerEvents: 'none' });
const HoverDetailContainer = styled(PopupContainerDetail)({ margin: 0, boxShadow: 'none', border: 'none', width: 'auto', minWidth: '300px' });

const FilterDropdownContainer = styled(SkyBox)(({ theme }) => ({ position: 'absolute', top: '45px', left: '0', background: theme.palette.background.paper, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', borderRadius: '16px', padding: '24px', zIndex: 100, width: '600px', border: `1px solid ${theme.palette.divider}`, '@media (max-width: 768px)': { width: 'calc(100vw - 30px)', left: '-15px' } }));
const FilterRowGrid = styled(SkyBox)({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px', alignItems: 'flex-start' });
const StyledSelectCustom = styled('select')(({ theme }) => ({ padding: '10px 12px', border: `1px solid ${theme.palette.divider}`, borderRadius: '6px', outline: 'none', width: '100%', background: theme.palette.background.paper, color: theme.palette.text.primary, fontSize: '14px', marginTop: '8px', '&:focus': { borderColor: '#0056b3' } }));
const FilterLabel = styled('label')(({ theme }) => ({ fontWeight: '600', fontSize: '14px', color: theme.palette.text.primary, marginBottom: '5px', display: 'block' }));
const PopupContainerDaySummary = styled(PopupContainer)(() => ({ width: '320px', padding: '0px', overflow: 'hidden', '@media (max-width: 768px)': { width: '95vw', maxWidth: '350px' } }));
const PopupHeader = styled(SkyBox)({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' });
const FilterPopupHeader = styled(PopupHeader)({ marginBottom: '10px' });
const CloseButton = styled('button')(({ theme }) => ({ background: 'none', border: 'none', cursor: 'pointer', color: theme.palette.text.secondary, padding: '0px', '&:hover': { color: theme.palette.text.primary } }));
const AbsoluteCloseButton = styled(CloseButton)({ position: 'absolute', right: '15px', top: '15px' });
const DetailRow = styled(SkyBox)(({ theme }) => ({ display: 'flex', fontSize: '14px', marginBottom: '12px', alignItems: 'flex-start', lineHeight: 1.5, color: theme.palette.text.primary }));
const DetailRowCentered = styled(DetailRow)({ alignItems: 'center' });
const DetailLabel = styled('span')(({ theme }) => ({ width: '140px', fontWeight: 700, color: theme.palette.text.secondary }));
const DetailValue = styled('span')(({ theme }) => ({ flex: 1, color: theme.palette.text.primary }));
const FilterGroup = styled(SkyBox)(({ theme }) => ({ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px', '& label': { fontWeight: 'bold', fontSize: '13px', color: theme.palette.text.secondary } }));
const EventTitle = styled(SkyBox)(() => ({ fontWeight: 'bold', marginBottom: '3px', color: 'inherit' }));
const EventTime = styled(SkyBox)(() => ({ fontSize: '11px', color: 'inherit' }));
const FlexRowGap8 = styled(SkyBox)({ display: 'flex', alignItems: 'center', gap: '8px' });
const FlexColumnGap10 = styled(SkyBox)({ display: 'flex', flexDirection: 'column', gap: '5px' });
const PopupTitle = styled('h3')(({ theme }) => ({ margin: '0px', color: theme.palette.text.primary, fontSize: '18px', fontWeight: 500 }));
const FilterPopupTitle = styled(PopupTitle)({ fontWeight: 'bold', fontSize: '18px' });
const FilterIconBlue = styled(FilterAlt)(({ theme }) => ({ color: theme.palette.primary.main, fontSize: '22px !important' }));
const PopupTitleLarge = styled('h2')(({ theme }) => ({ margin: '0px', color: theme.palette.text.primary, fontSize: '20px', fontWeight: 600 }));
const DayViewTitle = styled('h2')(({ theme }) => ({ margin: '0px', fontSize: '18px', fontWeight: 'normal', color: theme.palette.text.primary }));
const DayViewSubTitle = styled('span')(({ theme }) => ({ fontSize: '12px', color: theme.palette.text.secondary, fontWeight: 'normal', textTransform: 'uppercase' }));
const DateCircleText = styled('span')(({ theme }) => ({ fontSize: '20px', fontWeight: 'bold', color: theme.palette.primary.contrastText }));
const DaySummaryHeader = styled(SkyBox)(({ theme }) => ({ background: theme.palette.background.paper, padding: '20px', textAlign: 'center', borderBottom: `1px solid ${theme.palette.divider}`, position: 'relative' }));
const DaySummaryDate = styled(SkyBox)(({ theme }) => ({ width: '36px', height: '36px', background: theme.palette.primary.main, color: theme.palette.primary.contrastText, borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 5px', fontWeight: 'bold' }));
const DaySummaryDayName = styled(SkyBox)(({ theme }) => ({ color: theme.palette.primary.main, fontWeight: 'bold' }));
const DaySummaryList = styled(SkyBox)({ padding: '10px', maxHeight: '350px', overflowY: 'auto' });
const DaySummaryItem = styled(SkyBox, { shouldForwardProp: (prop) => !['status', 'meetingState'].includes(prop) })(({ theme, status, meetingState }) => {
	const style = meetingState && meetingState.color && meetingState.background
		? { bg: meetingState.background, border: meetingState.color }
		: { bg: (MEETING_STATUS_STYLES[status] || DEFAULT_STATUS_STYLE).background, border: (MEETING_STATUS_STYLES[status] || DEFAULT_STATUS_STYLE).color };
	return { padding: '10px 12px', marginBottom: '8px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', background: style.bg, borderLeft: `4px solid ${style.border}`, color: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.87)' : theme.palette.text.primary };
});

const DaySummaryEmpty = styled(SkyBox)(({ theme }) => ({ textAlign: 'center', padding: '10px', color: theme.palette.text.disabled }));
const StatsText = styled(SkyBox)(({ theme }) => ({ fontWeight: 'bold', marginBottom: '5px', color: theme.palette.text.primary }));
const StatValueBlue = styled('b')({ color: '#0056b3' });
const StatValueGreen = styled('b')({ color: '#2e7d32' });
const StatValueRed = styled('b')({ color: '#d32f2f' });
const FilterFooter = styled(SkyBox)({ display: 'flex', justifyContent: 'space-between', marginTop: '20px' });
const FilterFooterStyled = styled(FilterFooter)({ marginTop: '30px', alignItems: 'center' });
const FilterFooterRight = styled(SkyBox)({ display: 'flex', gap: '10px' });
const StatsGrid = styled(SkyBox)({ display: 'flex', alignItems: 'center', gap: '20px' });
const StatsColumn = styled(SkyBox)({ display: 'flex', flexDirection: 'column', gap: '5px' });
const StatsDivider = styled(SkyBox)(({ theme }) => ({ width: '1px', height: '40px', backgroundColor: theme.palette.divider }));
const StatItem = styled(SkyBox)({ display: 'flex', alignItems: 'center', fontSize: '13px', whiteSpace: 'nowrap' });

export {
	SearchBarWrapper,
	UnifiedSearchGroup,
	FilterTrigger,
	FilterTriggerBox,
	UnifiedInput,
	TuneIconBox,
	TuneTriggerContainer,
	ClearIconButton,
	SearchAdornmentStack,
	SearchButton,
	InputGroup,
	StyledInput,
	InputIcon,
	StyledTune,
	SearchButtonAttached,
	FilterButton,
	ActionsGroup,
	RelativeBox,
	IconButtonBlue,
	FilterBox,
	StyleBoxActionDropDown,
	SearchIconBlue,
	StyleActionAllCheckBox,
	StyleActionCellCheckBox,
	StyledCheckbox,
	CheckboxLabel,
	StyleActionButton,
	ButtonCancel,
	ButtonReset,
	ButtonCancelModal,
	ButtonApply,
	ButtonApplyModal,
	NavBar,
	NavLeft,
	NavWeekBox,
	TodayButton,
	NavArrowButton,
	NavWeekLabel,
	CurrentLabel,
	ViewSwitcher,
	ViewSwitchButton,
	ContentArea,
	DayViewContainer,
	DayViewHeader,
	HeaderCircle,
	DaySummaryBar,
	DayViewBody,
	TimeAxis,
	TimeLabel,
	EventsTrack,
	GridLine,
	EventBox,
	WeekViewContainer,
	WeekHeaderRow,
	WeekHeaderTimeLabel,
	DayColHeader,
	DayNameText,
	WeekDateNumber,
	WeekBody,
	TimeColumn,
	TimeSlot,
	DayColumn,
	MEETING_STATUS_STYLES,
	DEFAULT_STATUS_STYLE,
	WeekEventChip,
	ChipTitle,
	ChipText,
	MonthViewContainer,
	MonthHeader,
	MonthHeaderItem,
	MonthGrid,
	MonthCell,
	DateNumber,
	MonthEventChip,
	MoreEventsIndicator,
	Footer,
	FooterSection,
	LegendGrid,
	LegendItem,
	LegendBox,
	Overlay,
	PopupContainer,
	PopupContainerDetail,
	StyledPopover,
	HoverDetailContainer,
	FilterDropdownContainer,
	FilterRowGrid,
	StyledSelectCustom,
	FilterLabel,
	PopupContainerDaySummary,
	PopupHeader,
	FilterPopupHeader,
	CloseButton,
	AbsoluteCloseButton,
	DetailRow,
	DetailRowCentered,
	DetailLabel,
	DetailValue,
	FilterGroup,
	EventTitle,
	EventTime,
	FlexRowGap8,
	FlexColumnGap10,
	PopupTitle,
	FilterPopupTitle,
	FilterIconBlue,
	PopupTitleLarge,
	DayViewTitle,
	DayViewSubTitle,
	DateCircleText,
	DaySummaryHeader,
	DaySummaryDate,
	DaySummaryDayName,
	DaySummaryList,
	DaySummaryItem,
	DaySummaryEmpty,
	StatsText,
	StatValueBlue,
	StatValueGreen,
	StatValueRed,
	FilterFooter,
	FilterFooterStyled,
	FilterFooterRight,
	StatsGrid,
	StatsColumn,
	StatsDivider,
	StatItem,
};