import React, { useState, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { API_VIEW_FILE } from '@EnvironmentFile/constants/urlConfig';
import { styled } from '@mui/material/styles';
import { useForm, useWatch, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { DEFAULT_VALUES } from './constant';

// --- SHARED COMPONENTS ---
import withSharedComponents from '@components/WrapperComponent';
import { useToast } from '@components/common/ToastProvider';
import Button from '@components/CustomButton';

// --- SUB-COMPONENTS ---
import RoomInfoSection from './components/RoomInfoSection';
import RoomLayoutSection from './components/RoomLayoutSection';
import PopupWarningDelete from './components/PopupWarningDelete';

// --- SERVICES ---
import { updateMeetingRoom, getMeetingRoomById, getAllAmenities, checkMeetingRoomAvailability } from '@services/meetingRoomService';
import { apiUploadFile } from '@services/FileUpload/fileUpload';
import { SkyBox } from '@styles/SkyStyles';

// --- UTILS ---
const logger = console;

// --- STYLED COMPONENTS (Matched with AddMeetingRoom) ---
// const MainContainer = styled(SkyBox)(({ theme }) => ({
//     width: '100%',
//     display: 'flex',
//     flexDirection: 'column',
//     minWidth: 0,
// }));

const ContentCard = styled(SkyBox)(({ theme }) => ({
    backgroundColor: theme.palette.background.paper,
    // border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(2),
    width: '100%',
}));

const SwipperContentBox = styled(SkyBox)(() => ({
    minHeight: '100vh',
    // paddingTop: theme.spacing(1)
}));

const ActionButtonBox = styled(SkyBox)(({ theme }) => ({
    display: 'flex',
    gap: theme.spacing(1),
    [theme.breakpoints.down('sm')]: {
        width: '100%',
        justifyContent: 'flex-end',
        '& button': {
            flex: 1,
            maxWidth: '120px'
        }
    }
}));

const ConstrainedLayoutBox = styled(SkyBox)(() => ({
    maxWidth: '100%',
    overflow: 'hidden',
    marginTop: 3,
}));



// --- VALIDATION SCHEMA ---
const schema = yup.object().shape({
    roomName: yup.string().required('Vui lòng nhập tên phòng họp'),
    location: yup.string().required('Vui lòng nhập địa điểm'),
    capacity: yup.number()
        .transform((value) => (isNaN(value) ? undefined : value))
        .required('Nhập sức chứa')
        .min(1, 'Tối thiểu 1 người')
        .test('capacity-check', 'Sức chứa phải lớn hơn hoặc bằng tổng số ghế', function (value) {
            const { layoutItems } = this.parent;
            const totalSeats = Array.isArray(layoutItems) ? layoutItems.filter(item => item.itemType === 'CHAIR').length : 0;
            return value >= totalSeats;
        }),
    layoutRows: yup.number().required('Vui lòng nhập số hàng').min(1, 'Tối thiểu 1 hàng').max(40, 'Tối đa 40 hàng'),
    layoutCols: yup.number().required('Vui lòng nhập số cột').min(1, 'Tối thiểu 1 cột').max(40, 'Tối đa 40 cột'),
    id: yup.string().nullable(),
    availableFrom: yup.string().nullable(),
    stage: yup.number().nullable().transform((value, originalValue) => {
        return originalValue === "" ? null : value;
    }).required('Vui lòng chọn Trạng thái sử dụng').default(DEFAULT_VALUES.STAGE),
    layoutItems: yup.array().nullable(),
    amenities: yup.array().of(
        yup.object().shape({
            id: yup.string().nullable(),
            name: yup.string().required('Chọn thiết bị'),
            quantity: yup.number().min(1, 'SL >= 1')
        })
    ),
    order: yup.number()
        .transform((value, originalValue) => {
            if (originalValue === "" || originalValue === null || originalValue === undefined) {
                return 1;
            }
            const parsed = Number(originalValue);
            return isNaN(parsed) ? 1 : parsed;
        })
        .min(0, 'Thứ tự phải >= 0')
        .default(1),
});

const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index} style={{ height: '100%' }}>
        {value === index && children}
    </div>
);



const EditMeetingRoom = ({ sharedComponents, onClose, setReloadData, data }) => {
		const { BaseSwipper } = sharedComponents;
    const recordId = data?.id;
    const toast = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [layoutImagePreview, setLayoutImagePreview] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [existingImageId, setExistingImageId] = useState(null);
    const [openWarning, setOpenWarning] = useState(false);
    const [hasActiveMeetings, setHasActiveMeetings] = useState(false);

    // Fetch Status Options from Redux
    const { crmSource } = useSelector((state) => state.config);
    const stageOptions = Array.isArray(crmSource) ? crmSource.find((item) => item.code === "TRANGTHAISUDUNGPHONGHOP")?.data || [] : [];



    // --- FORM SETUP ---
    const { control, handleSubmit, formState: { errors }, setValue, reset } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            id: recordId,
            roomName: '',
            location: '',
            capacity: 0,
            stage: DEFAULT_VALUES.STAGE,
            availableFrom: new Date().toISOString(),
            layoutRows: 8,
            layoutCols: 10,
            layoutItems: [],
            amenities: [],
            order: 1,
        }
    });

    const { fields, append, remove, update } = useFieldArray({
        control,
        name: "amenities"
    });

    // Custom handler to merge duplicates
    const handleAddEquipment = useCallback((newItem) => {
        const existingIndex = fields.findIndex(item => item.name === newItem.name);
        if (existingIndex !== -1) {
            // Update existing
            const currentItem = fields[existingIndex];
            update(existingIndex, {
                ...currentItem,
                quantity: Number(currentItem.quantity) + Number(newItem.quantity)
            });
        } else {
            // Append new
            append(newItem);
        }
    }, [fields, append, update]);

    // --- WATCH VALUES ---
    // Watch fields to pass to child components
    const watchedValues = useWatch({
        control,
        name: ['layoutRows', 'layoutSeats', 'layoutBlocks', 'layoutType', 'layoutColWing', 'layoutRowBottom']
    });

    // --- FETCH AMENITIES ---
    const [amenityOptions, setAmenityOptions] = useState([]);
    useEffect(() => {
        const fetchAmenities = async () => {
            try {
                const response = await getAllAmenities();
                // Handle new API structure: { items: [...] }
                const items = response?.items || response?.data?.items || response?.data || [];

                if (Array.isArray(items)) {
                    const options = items.map(item => ({
                        value: item.id,
                        label: item.name
                    }));
                    setAmenityOptions(options);
                }
            } catch (error) {
                logger.error("Error fetching amenities:", error);
            }
        };
        fetchAmenities();
    }, []);

    // --- DATA FETCHING ---
    useEffect(() => {
        const loadData = async () => {
            if (!recordId) return;

            try {
                setIsLoading(true);
                const response = await getMeetingRoomById(recordId);

                if (response && response.data) {
                    const roomData = response.data;
                    setHasActiveMeetings(!!roomData.hasActiveMeetings);

                    // Optimize: Pre-populate amenity options from existing room data for instant display
                    if (Array.isArray(roomData.amenities) || Array.isArray(roomData.amenityLinks)) {
                        const currentItems = Array.isArray(roomData.amenities)
                            ? roomData.amenities
                            : roomData.amenityLinks.map(l => ({ id: l.amenity?.id, name: l.amenity?.name }));

                        const initialOptions = currentItems
                            .filter(i => i && i.id && i.name)
                            .map(i => ({ value: i.id, label: i.name }));

                        setAmenityOptions(prev => {
                            const existing = new Map(prev.map(p => [p.value, p]));
                            initialOptions.forEach(i => existing.set(i.value, i));
                            return Array.from(existing.values());
                        });
                    }

                    // Map API data to Form fields
                    reset({
                        id: recordId,
                        roomName: roomData.name || roomData.roomName || '',
                        location: roomData.location || '',
                        capacity: roomData.capacity || 0,
                        stage: roomData.stage || DEFAULT_VALUES.STAGE, // Initialize stage, fallback to status
                        availableFrom: roomData.availableFrom || new Date().toISOString(),
                        layoutRows: roomData.layoutRows || 8,
                        layoutCols: roomData.layoutCols || 10,
                        layoutItems: roomData.layoutItems || [],
                        amenities: Array.isArray(roomData.amenities)
                            ? roomData.amenities.map(item => ({
                                amenityLinkId: null,
                                name: item.id,
                                quantity: item.quantity || 1
                            }))
                            : Array.isArray(roomData.amenityLinks)
                                ? roomData.amenityLinks.map(link => ({
                                    amenityLinkId: link.id || null,
                                    name: link.amenity?.id || '',
                                    quantity: link.quantity || 1
                                }))
                                : [],
                        order: roomData.order ?? 1,
                    });

                    // Set Image Preview using API_VIEW_FILE if it's an ID
                    if (roomData.imageUrl || roomData.image) {
                        const img = roomData.imageUrl || roomData.image;
                        setExistingImageId(roomData.image || roomData.imageUrl);
                        setLayoutImagePreview(
                            img && !String(img).startsWith('http')
                                ? `${API_VIEW_FILE}/${img}`
                                : img
                        );
                    }
                }
            } catch (error) {
                logger.error('Error fetching room data:', error);
                toast('Không thể tải thông tin phòng họp', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [recordId, reset, toast]);

    // --- HANDLERS ---

    const handleImageChange = useCallback((file) => {
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                toast("Vui lòng chỉ tải lên định dạng ảnh (JPG, PNG, GIF,...)", "warning");
                return;
            }

            setImageFile(file);
            const objectUrl = URL.createObjectURL(file);
            setLayoutImagePreview(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        }
    }, [toast]);

    const handleImageRemove = useCallback(() => {
        setImageFile(null);
        setLayoutImagePreview(null);
        setExistingImageId(null);
    }, []);

    const handleClose = useCallback(() => {
        if (onClose) onClose();
    }, [onClose]);

    const onSubmit = useCallback(async (data) => {
        // Validation for Status Change is now handled in RoomInfoSection's onChange
        // So we just proceed with saving
        setIsLoading(true);
        try {
            let imageId = undefined;

            // 1. Upload Image if exists
            if (imageFile) {
                try {
                    const uploadResp = await apiUploadFile(imageFile, 'meeting_room', recordId);
                    imageId = uploadResp?.id ? String(uploadResp.id) : undefined;
                } catch (uploadError) {
                    logger.error("Image upload failed:", uploadError);
                    toast("Tải ảnh thất bại, vui lòng thử lại.", 'warning');
                }
            }

            // 2. Payload construction (JSON)
            const payload = {
                id: recordId,
                name: data.roomName,
                location: data.location,
                capacity: data.capacity,
                availableFrom: data.availableFrom,
                stage: data.stage,
                layoutRows: Number(data.layoutRows),
                layoutCols: Number(data.layoutCols),
                layoutItems: data.layoutItems || [],
                totalSeating: (data.layoutItems || []).filter(item => item.itemType === 'CHAIR').length,

                amenities: data.amenities.map(item => ({
                    id: item.amenityLinkId || undefined,
                    amenityId: item.name,
                    quantity: Number(item.quantity)
                })),
                image: imageId || existingImageId || null,
                order: (data.order !== "" && data.order !== null && data.order !== undefined) ? Number(data.order) : 1,
            };

            await updateMeetingRoom(recordId, payload);

            toast("Cập nhật phòng họp thành công!", 'success');
            if (onClose) {
                onClose(true);
                setReloadData && setReloadData(new Date() * 1);
            }
        } catch (error) {
            logger.error('Error updating room:', error);
            const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra khi cập nhật, vui lòng thử lại.";
            toast(errorMessage, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [imageFile, existingImageId, toast, onClose, recordId, setReloadData]);


    const handleSave = useCallback(() => {
        handleSubmit(onSubmit, (formErrors) => {
            const firstError = Object.values(formErrors)[0];
            toast(firstError?.message || "Vui lòng kiểm tra lại thông tin nhập", "error");
        })();
    }, [handleSubmit, onSubmit, toast]);

    const handleCloseWarning = useCallback(() => {
        setOpenWarning(false);
    }, []);

    const handleShowWarning = useCallback(() => {
        setOpenWarning(true);
    }, []);

    // NEW: On-demand availability check
    const handleValidateAvailability = useCallback(async () => {
        if (!recordId) return false;
        try {
            if (hasActiveMeetings) {
                return false;
            }

            const res = await checkMeetingRoomAvailability(recordId);
            // Robust check: data might be in res.data or res itself
            const data = res?.data || res;

            if (data && typeof data.available !== 'undefined') {
                // Explicitly check for false
                if (data.available === false) {
                    return false;
                }
                return true;
            }

            // Fallback if structure is unknown, but assume safe if call starts
            return true;
        } catch (error) {
            logger.error("Check availability failed", error);
            // On error, safest to maybe block or allow? 
            // User requirement: block if BUSY. If error, assume busy or free? 
            // Usually if error, we shouldn't block user from working unless critical.
            // Let's return false (block) to be safe or true to unblock?
            // Returning false triggers Popup. 
            return false;
        }
    }, [recordId, hasActiveMeetings]);

    const headerActions = (
        <ActionButtonBox>
            <Button variant="primary" onClick={handleSave} disabled={isLoading}>LƯU</Button>
        </ActionButtonBox>
    );

    return (
        <BaseSwipper
            title="Chỉnh sửa phòng họp"
            open
            onClose={handleClose}
            onSave={handleSave}
            type="edit"
            hideBackdrop
            isLoading={isLoading}
            moreActions={headerActions}
        >

            <SwipperContentBox>
                {/* Tab 1: Thông tin phòng họp */}
                <TabPanel>
                    <ContentCard>
                        <RoomInfoSection
                            sharedComponents={sharedComponents}
                            control={control}
                            errors={errors}
                            layoutImagePreview={layoutImagePreview}
                            onImageChange={handleImageChange}
                            onImageRemove={handleImageRemove}
                            amenityOptions={amenityOptions}
                            onAddEquipment={handleAddEquipment}
                            stageOptions={stageOptions}
                            currentStage={data?.stage}
                            onShowWarning={handleShowWarning}
                            isEditMode
                            onValidateAvailability={handleValidateAvailability}
                            fields={fields}
                            onRemoveEquipment={remove}
                        />
                        <ConstrainedLayoutBox >
                            <RoomLayoutSection
                                sharedComponents={sharedComponents}
                                control={control}
                                setValue={setValue}
                                layoutRows={watchedValues[0]}
                                layoutSeats={watchedValues[1]}
                                layoutBlocks={watchedValues[2]}
                                layoutType={watchedValues[3]}
                                layoutColWing={watchedValues[4]}
                                layoutRowBottom={watchedValues[5]}
                            />
                        </ConstrainedLayoutBox>
                    </ContentCard>
                </TabPanel>


            </SwipperContentBox>
            <PopupWarningDelete
                open={openWarning}
                onClose={handleCloseWarning}
            />
        </BaseSwipper>
    );
};

export default withSharedComponents(EditMeetingRoom);
