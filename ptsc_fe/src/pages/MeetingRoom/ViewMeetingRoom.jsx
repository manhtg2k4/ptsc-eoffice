import React, { useState, useEffect, useCallback } from 'react';
import { Box, InputBase, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useForm } from 'react-hook-form';
import SearchIcon from '@mui/icons-material/Search';

// --- SHARED COMPONENTS ---
import withSharedComponents from '@components/WrapperComponent';
// import Swipper from '@components/Swipper';
import Button from '@components/CustomButton';

// --- SUB-COMPONENTS ---
import RoomInfoSectionForView from './components/RoomInfoSectionForView';
import RoomLayoutSection from './components/RoomLayoutSection';
import RoomScheduleCalendar from '@components/CustomCalendar/RoomScheduleCalendar';
import EditMeetingRoom from './EditMeetingRoom';
import DeletePopupMeetingRoom from './DeletePopupMeetingRoom';
import { SkyBox, SkyTypography } from '@styles/SkyStyles';
// import { SectionHeaderIcon } from '@styles/ThemeConfig.styles';

// --- SERVICES ---
import { getMeetingRoomById, getAllAmenities } from '@services/meetingRoomService';
import { API_VIEW_FILE } from '@EnvironmentFile/constants/urlConfig';
import Loading from '@components/Loading/Loading';
import { CancelButton } from "@styles/CustomDialog.styles";


// --- STYLED COMPONENTS (MAIN WRAPPERS) ---
const MainContainer = styled(SkyBox)(({ theme }) => ({
	display: 'flex',
	gap: theme.spacing(3),
	alignItems: 'stretch',
	'@media (max-width: 1190px)': {
		flexDirection: 'column',
		alignItems: 'stretch',
		gap: theme.spacing(2)
	},
}));

const SectionHeaderRow = styled(SkyBox)(({ theme }) => ({
	display: 'grid',
	gridTemplateColumns: 'minmax(0, 1fr) 350px',
	columnGap: theme.spacing(3),
	alignItems: 'center',
	marginBottom: theme.spacing(2),
	[theme.breakpoints.down(1190)]: {
		gridTemplateColumns: '1fr',
		rowGap: theme.spacing(1),
	},
}));

const SectionHeaderLeft = styled(SkyBox)(() => ({
	display: 'flex',
	alignItems: 'center',
	gap: 8,
	minWidth: 0,
}));

const SectionHeaderTitle = styled(SkyTypography)(({ theme }) => ({
	fontSize: '20px',
	fontWeight: 700,
	color: theme.palette.text.primary,
	textTransform: 'uppercase',
	letterSpacing: '0.02em',
}));

const SectionHeaderRight = styled(SkyTypography)(({ theme }) => ({
	fontSize: '20px',
	fontWeight: 700,
	color: theme.palette.text.primary,
	textTransform: 'uppercase',
	letterSpacing: '0.02em',
	justifySelf: 'start',
}));

const UnifiedPanel = styled(SkyBox)(({ theme }) => ({
	backgroundColor: theme.palette.background.paper,
	// border: `1px solid ${theme.palette.divider}`,
	borderRadius: '6px',
	padding: theme.spacing(2),
	boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
	display: 'flex',
	flexDirection: 'column',
	gap: '40px',
	width: '100%',
}));

const LeftContent = styled(SkyBox)(() => ({
	flex: 2,
	width: '100%',
	display: 'flex',
	flexDirection: 'column',
	gap: '24px',
	minWidth: 0,
}));

const RightSidebar = styled(SkyBox)(() => ({
	flex: 1,
	minWidth: '220px',
	maxWidth: '350px',
	alignSelf: 'stretch',
	display: 'flex',
	flexDirection: 'column',
	height: '100%',
	// top: theme.spacing(2),
	'@media (max-width: 1190px)': {
		width: '100%',
		maxWidth: 'none',
		position: 'static',
	},
}));

const SwipperContentBox = styled(Box, {
	shouldForwardProp: (prop) => prop !== 'value',
})(() => ({
	// padding: value === 0 ? theme.spacing(3) : 0,
	padding: 0,
	overflowY: 'auto'
}));


const AmenitiesCard = styled(SkyBox)(({ theme }) => ({
	borderRadius: '4px',
	border: `1px solid ${theme.palette.divider}`,
	boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
	display: 'flex',
	flexDirection: 'column',
	flex: 1,
	height: '100%',
	minHeight: 0,
	maxHeight: '750px',
	backgroundColor: theme.palette.background.paper,
	overflow: 'hidden',
}));

// --- UPDATED SEARCH BAR STYLES ---
const SearchContainer = styled(SkyBox)(({ theme }) => ({
	padding: theme.spacing(1.5, 2.5, 1.5, 2.5),
	display: 'flex',
	alignItems: 'center',
}));

const SearchWrapper = styled(SkyBox)(({ theme }) => ({
	display: 'flex',
	alignItems: 'center',
	width: '100%',
	border: `1px solid ${theme.palette.divider}`,
	borderRadius: '4px',
	overflow: 'hidden',
	backgroundColor: theme.palette.background.paper,
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
	flex: 1,
	fontSize: '0.85rem',
	padding: theme.spacing(0, 1.5), // Add padding to input container
}));

const SearchButton = styled(SkyBox)(({ theme }) => ({
	backgroundColor: theme.palette.primary.main,
	color: '#fff',
	padding: theme.spacing(0.8),
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	cursor: 'pointer',
	'&:hover': {
		backgroundColor: theme.palette.primary.main,
	},
	minWidth: '32px',
	height: '100%',
}));

const SearchIconStyled = styled(SearchIcon)(() => ({
	fontSize: 18,
	color: '#fff',
}));

// --- UPDATED GRID LAYOUT ---
const GridContainer = styled(SkyBox)(({ theme }) => ({
	display: 'grid',
	gridTemplateColumns: 'minmax(0, 1fr) 90px',
	alignItems: 'center',
	padding: theme.spacing(1, 2.5),
}));

const TableHeader = styled(GridContainer)(({ theme }) => ({
	borderTop: `1px solid ${theme.palette.divider}`,
	borderBottom: `1px solid ${theme.palette.divider}`, // border bottom for header
	backgroundColor: theme.palette.background.paper,
}));

const HeaderLabel = styled(SkyTypography)(() => ({
	fontWeight: 'bold',
	fontSize: '0.8rem',
}));

const CenteredHeaderLabel = styled(HeaderLabel)({
	textAlign: 'center',
	display: 'block',
});

const ScrollList = styled(SkyBox)(() => ({
	flex: 1,
	minHeight: 0,
	overflowY: 'auto',
	'&::-webkit-scrollbar': { width: '8px' },
	'&::-webkit-scrollbar-track': { backgroundColor: '#f1f1f1' },
	'&::-webkit-scrollbar-thumb': {
		backgroundColor: '#c1c1c1',
		borderRadius: '4px',
		'&:hover': {
			backgroundColor: '#a8a8a8',
		},
	},
}));

// const RowItem = styled(GridContainer)(({ theme, index }) => ({
//     backgroundColor: index % 2 !== 0 ? theme.palette.mode === 'dark' ? theme.palette.background.paper : theme.palette.background.default : theme.palette.mode === 'dark' ? theme.palette.background.paper : theme.palette.background.default,
//     borderBottom: `1px solid ${theme.palette.divider}`,
//     color: theme.palette.mode === 'dark' ? theme.palette.text.primary : theme.palette.text.secondary,
//     padding: '10px 20px', // Match GridContainer padding override if needed, but GridContainer uses spacing(1.2, 2.5) ~ 9.6px 20px
//     '&:hover': {
//         backgroundColor: theme.palette.action.hover,
//     },
// }));
const RowItem = styled(SkyBox)(({ theme }) => ({
	display: 'grid',
	gridTemplateColumns: 'minmax(0, 1fr) 90px',
	alignItems: 'center',
	padding: theme.spacing(1.2, 2.5),
	fontSize: '0.9rem',
	color: theme.palette.text.secondary,
	'&:nth-of-type(odd)': {
		backgroundColor: theme.palette.table?.rowEven || theme.palette.action.hover,
	},
	'&:nth-of-type(even)': {
		backgroundColor: theme.palette.background.paper,
	},
}));

const AmenityQuantity = styled(SkyTypography)({
	fontWeight: 500,
	fontSize: '0.85rem',
	textAlign: 'center',
	display: 'block',
});

const TableFooter = styled(SkyBox)(({ theme }) => ({
	padding: theme.spacing(1.25, 2.5),
	textAlign: 'right',
	color: theme.palette.text.secondary,
	fontWeight: 500,
	fontSize: '0.8rem',
	backgroundColor: theme.palette.background.paper,
	borderTop: `1px solid ${theme.palette.divider}`,
}));

// const LegendPaper = styled(SkyBox)(({ theme }) => ({
//     backgroundColor: theme.palette.background.paper,
//     padding: theme.spacing(2.5),
//     borderRadius: '4px',
//     boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
//     marginTop: theme.spacing(2.5),
//     border: `1px solid ${theme.palette.divider}`,
// }));

// const LegendTitle = styled(Typography)(({ theme }) => ({
//     color: theme.palette.primary.main, 
//     marginBottom: '16px',
//     fontWeight: 'bold',
//     fontSize: '0.9rem',
// }));

// const LegendItemBox = styled(SkyBox)({
//     display: 'flex', 
//     alignItems: 'center', 
//     gap: '12px',
//     marginBottom: '12px',
// });

// const DescriptionText = styled(Typography)(({ theme }) => ({
//     color: theme.palette.text.secondary,
//     fontSize: '0.85rem',
// }));

// const StatusDot = styled(SkyBox)(({ dotcolor }) => ({
//     width: 10, 
//     height: 10, 
//     borderRadius: '50%', 
//     backgroundColor: dotcolor,
// }));

const SchedulerContainer = styled(SkyBox)(({ theme }) => ({
	backgroundColor: theme.palette.background.paper,
	borderRadius: '4px',
}));

const NoResultBox = styled(SkyBox)(({ theme }) => ({
	padding: theme.spacing(2),
	textAlign: 'center',
	color: theme.palette.text.secondary,
}));

const BoxContainerLoad = styled(SkyBox)(() => ({
	display: 'flex',
	justifyContent: 'center',
	p: 2
}));

const ViewMeetingRoom = ({ sharedComponents, onClose, data }) => {
	const {
		BaseSwipper,
		CustomTabsWithBadge,
		ButtonOutline
	} = sharedComponents;
	const recordId = data?.id;
	const [isLoading, setIsLoading] = useState(false);
	const [tabValue, setTabValue] = useState(0);
	const [roomData, setRoomData] = useState({});
	const [openEditModal, setOpenEditModal] = useState(false); // NEW: State for edit modal
	const [openDeleteModal, setOpenDeleteModal] = useState(false);
	const [reloadTrigger, setReloadTrigger] = useState(0); // Trigger for reloading data

	const { control, reset } = useForm({
		defaultValues: roomData
	});


	// Fetch amenities for name lookup
	// --- DATA FETCHING ---
	useEffect(() => {
		const loadAllData = async () => {
			if (!recordId) return;

			setIsLoading(true);
			try {
				// 1. Fetch Amenities first (or in parallel) to ensure we have options for mapping
				const amenitiesRes = await getAllAmenities();
				const amenitiesItems = amenitiesRes?.items || amenitiesRes?.data?.items || amenitiesRes?.data || [];
				let currentAmenityOptions = [];

				if (Array.isArray(amenitiesItems)) {
					currentAmenityOptions = amenitiesItems.map(item => ({
						value: item.id,
						label: item.name
					}));
				}

				// 2. Fetch Room Data
				const response = await getMeetingRoomById(recordId);

				// Handle potentially nested data structure (response.data.data or response.data)
				if (response && response.data) {
					const roomDataRes = response.data.data || response.data;
					const formattedData = {
						...roomDataRes,
						roomName: roomDataRes.name || roomDataRes.roomName,
						layoutType: roomDataRes.layoutType,
						layoutRows: roomDataRes.layoutRows,
						layoutSeats: roomDataRes.layoutSeats,
						layoutBlocks: roomDataRes.layoutBlocks,
						// Update mapping for amenityLinks using locally fetched options
						amenities: Array.isArray(roomDataRes.amenities)
							? roomDataRes.amenities.map((item) => ({
								id: item.id,
								name: item.name || currentAmenityOptions.find(o => o.value === item.id)?.label || 'Tiện ích',
								quantity: item.quantity || 1
							}))
							: Array.isArray(roomDataRes.amenityLinks)
								? roomDataRes.amenityLinks.map(link => {
									const amenityId = link.amenity?.id || link.amenityId;
									const matchedOption = currentAmenityOptions.find(opt => opt.value === amenityId);

									return {
										id: link.id,
										name: link.amenity?.name || matchedOption?.label || 'Tiện ích',
										quantity: link.quantity || 1
									};
								})
								: [],
						image: (roomDataRes.imageUrl || roomDataRes.image) && !String(roomDataRes.imageUrl || roomDataRes.image).startsWith('http')
							? `${API_VIEW_FILE}/${roomDataRes.imageUrl || roomDataRes.image}`
							: (roomDataRes.imageUrl || roomDataRes.image)
					};
					setRoomData(formattedData);
					reset(formattedData);
				}
			} catch (error) {
				logger.warn('Error fetching data:', error);
				// Fallback using props data if available or empty
				if (data && data.amenities) {
					const mockWithIds = data.amenities.map((a, i) => ({ ...a, id: i }));
					setRoomData({ ...data, amenities: mockWithIds });
					reset({ ...data, amenities: mockWithIds });
				}
			} finally {
				setIsLoading(false);
			}
		};

		loadAllData();
	}, [recordId, reset, reloadTrigger, data]); // Added amenityOptions and reloadTrigger dependency

	const handleTabChange = useCallback((event, newValue) => {
		setTabValue(newValue);
	}, []);

	const handleClose = useCallback(() => {
		if (onClose) onClose();
	}, [onClose]);

	const [searchInputValue, setSearchInputValue] = useState('');
	const [searchTerm, setSearchTerm] = useState('');
	const [isSearching, setIsSearching] = useState(false);

	const handleSearchChange = (e) => {
		setSearchInputValue(e.target.value);
	};

	const handleSearchSubmit = useCallback(() => {
		setIsSearching(true);
		// Simulate loading delay for visual feedback as requested
		setTimeout(() => {
			setSearchTerm(searchInputValue.trim());
			setIsSearching(false);
		}, 500);
	}, [searchInputValue]);

	const filteredAmenities = (roomData.amenities || []).filter(item =>
		item.name.toLowerCase().includes(searchTerm.toLowerCase())
	);

	const handleEventClick = useCallback((event) => {
		logger.log('Event clicked:', event);
		// Có thể mở dialog xem chi tiết event ở đây
	}, []);

	// NEW: Handler to open edit modal
	const handleOpenEdit = useCallback(() => {
		setOpenEditModal(true);
	}, []);

	// NEW: Handler to close edit modal
	const handleCloseEdit = useCallback(() => {
		setOpenEditModal(false);
	}, []);

	// Handler to open delete modal
	const handleDelete = useCallback(() => {
		setOpenDeleteModal(true);
	}, []);

	const handleCloseDelete = useCallback(() => {
		setOpenDeleteModal(false);
	}, []);

	const tabs = [
		{ label: 'Thông tin phòng', value: 0 },
		{ label: 'Lịch sử dụng phòng', value: 1 },
	];

	const handleKeyDown = useCallback((e) => {
		if (e.key === 'Enter') handleSearchSubmit();
	}, [handleSearchSubmit]);

	return (
		<>
			<BaseSwipper
				title={`Chi tiết phòng họp`}
				open
				onClose={handleClose}
				type="view"
				hideBackdrop
				moreActions={
					<>
						{data?.flags?.view ? null : <ButtonOutline variant="outlined" onClick={handleOpenEdit}>CHỈNH SỬA</ButtonOutline>}
						{data?.flags?.view ? null : <CancelButton variant="contained" onClick={handleDelete}>XÓA</CancelButton>}
					</>
				}
				bodyVariant='calendar'

			>
				{isLoading ? (
					<Loading size={24} />
				) : (
					<>
						<CustomTabsWithBadge
							tabs={tabs}
							value={tabValue}
							onChange={handleTabChange}
						/>

						<SwipperContentBox value={tabValue}>
							{tabValue === 0 ? (
								<UnifiedPanel>
									<SectionHeaderRow>
										<SectionHeaderLeft>
											{/* <SectionHeaderIcon /> */}
											<SectionHeaderTitle>Thông tin phòng họp</SectionHeaderTitle>
										</SectionHeaderLeft>
										<SectionHeaderRight>Tiện ích phòng</SectionHeaderRight>
									</SectionHeaderRow>

									<MainContainer>
											<LeftContent>
												<RoomInfoSectionForView data={roomData} hideTitle />
											</LeftContent>

											<RightSidebar>
												<AmenitiesCard>
													<SearchContainer>

														<SearchWrapper>
															<StyledInputBase
																placeholder="Tìm kiếm..."
																value={searchInputValue}
																onChange={handleSearchChange}
																onKeyDown={handleKeyDown}
															/>
															<SearchButton onClick={handleSearchSubmit}>
																<SearchIconStyled />
															</SearchButton>
														</SearchWrapper>
													</SearchContainer>

													<TableHeader>
														<HeaderLabel variant="caption">Tên thiết bị</HeaderLabel>
														<CenteredHeaderLabel variant="caption">Số lượng</CenteredHeaderLabel>
													</TableHeader>
													<ScrollList>
														{isSearching ? (
															<BoxContainerLoad>
																<CircularProgress size={24} />
															</BoxContainerLoad>
														) : filteredAmenities.length > 0 ? (
															filteredAmenities.map((item, index) => (
																<RowItem
																	key={`amenity-item-${item.id}`}
																	index={index}
																>
																	<SkyTypography variant="body2" noWrap title={item.name}>
																		{item.name}
																	</SkyTypography>
																	<AmenityQuantity variant="body2">{item.quantity}</AmenityQuantity>
																</RowItem>
															))
														) : (
															<NoResultBox>
																<SkyTypography variant="body2">
																	{searchTerm ? 'Không tìm thấy thiết bị' : 'Chưa có thiết bị nào'}
																</SkyTypography>
															</NoResultBox>
														)}
													</ScrollList>
													<TableFooter>
														Tổng: {roomData.amenities?.reduce((sum, i) => sum + (parseInt(i.quantity, 10) || 0), 0) || 0} thiết bị
													</TableFooter>
												</AmenitiesCard>

												{/* <LegendPaper>
                                <LegendTitle variant="subtitle2">Chú thích sơ đồ</LegendTitle>
                                <Box>
                                    <LegendItemBox>
                                        <StatusDot dotcolor="#e0e0e0" />
                                        <DescriptionText variant="body2">Đang trống</DescriptionText>
                                    </LegendItemBox>
                                    <LegendItemBox>
                                        <StatusDot dotcolor="#ffeb3b" />
                                        <DescriptionText variant="body2">Đã đặt</DescriptionText>
                                    </LegendItemBox>
                                    <LegendItemBox>
                                        <StatusDot dotcolor="#4caf50" />
                                        <DescriptionText variant="body2">Đang họp</DescriptionText>
                                    </LegendItemBox>
                                    <LegendItemBox>
                                        <StatusDot dotcolor="#f44336" />
                                        <DescriptionText variant="body2">Bảo trì</DescriptionText>
                                    </LegendItemBox>
                                </Box>
                            </LegendPaper> */}
											</RightSidebar>
									</MainContainer>

										<RoomLayoutSection
											sharedComponents={sharedComponents}
											control={control}
											readOnly
											layoutRows={roomData.layoutRows}
											layoutCols={roomData.layoutCols}
											isViewMode
											data={roomData}
										/>
								</UnifiedPanel>
							) : (
								<SchedulerContainer>
									<RoomScheduleCalendar
										roomId={recordId}
										onEventClick={handleEventClick}
									/>
								</SchedulerContainer>
							)}
						</SwipperContentBox>
					</>
				)}

			</BaseSwipper>

			{/* Edit Meeting Room Modal */}
			{openEditModal && (
				<EditMeetingRoom
					sharedComponents={{ Button, InputComponents: sharedComponents.InputComponents }}
					onClose={handleCloseEdit}
					data={roomData}
					setReloadData={() => setReloadTrigger(prev => prev + 1)}
				/>
			)}

			{/* Delete Meeting Room Modal */}
			{openDeleteModal && (
				<DeletePopupMeetingRoom
					open={openDeleteModal}
					onClose={handleCloseDelete}
					data={roomData}
					setReloadData={() => {
						handleClose();
					}}
					sharedComponents={sharedComponents}
				/>
			)}
		</>
	);
};

export default withSharedComponents(ViewMeetingRoom);
