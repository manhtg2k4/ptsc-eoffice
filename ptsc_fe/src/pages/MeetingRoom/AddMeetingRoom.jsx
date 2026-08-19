import React, { useState, useCallback, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import { useSelector } from 'react-redux';
import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { createMeetingRoom, updateMeetingRoom, getAllAmenities } from '@services/meetingRoomService';
import { apiUploadFile } from '@services/FileUpload/fileUpload';

// --- SHARED COMPONENTS ---
import withSharedComponents from '@components/WrapperComponent'; // Mock path
import { useToast } from '@components/common/ToastProvider'; // Mock path
import Button from '@components/CustomButton'; // Mock path
import { DEFAULT_VALUES } from './constant';

// --- SUB-COMPONENTS ---
import RoomInfoSection from './components/RoomInfoSection';
import RoomLayoutSection from './components/RoomLayoutSection';
import { SkyBox } from '@styles/SkyStyles';

// --- STYLED COMPONENTS ---
// const MainContainer = styled(SkyBox)(({ theme }) => ({
//     backgroundColor: theme.palette.background.paper,
//     border: `1px solid ${theme.palette.divider}`,
//     borderRadius: theme.shape.borderRadius,
//     padding: theme.spacing(2),
//     width: '100%',
//     display: 'flex',
//     flexDirection: 'column',
//     alignItems: 'stretch',
//     gap: theme.spacing(3),
// }));



// const RightSidebar = styled(SkyBox)(() => ({
//     display: 'none',
// }));

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

const ContentCard = styled(SkyBox)(({ theme }) => ({
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(2),
    width: '100%',
}));
// --- VALIDATION SCHEMA ---
const schema = yup.object().shape({
    roomName: yup.string().required('Vui lòng nhập tên phòng họp'),
    location: yup.string().required('Vui lòng nhập địa điểm'),
    capacity: yup.number()
        .transform((value) => (isNaN(value) ? undefined : value))
        .required('Nhập sức chứa')
        .min(1, 'Tối thiểu 1 người')
        .test('validate-capacity', 'Sức chứa phải lớn hơn hoặc bằng tổng số ghế', function (value) {
            const { layoutItems } = this.parent;
            const totalSeats = Array.isArray(layoutItems) ? layoutItems.filter(item => item.itemType === 'CHAIR').length : 0;
            return Number(value) >= totalSeats;
        }),

    layoutRows: yup.number().required('Nhập số hàng').min(1),
    layoutCols: yup.number().required('Nhập số cột').min(1),
    id: yup.string().nullable(), // Dành cho Edit, Add thì để trống
    availableFrom: yup.string().nullable(), // Kiểu date string ISO
    stage: yup.number().nullable().transform((value, originalValue) => {
        return originalValue === "" ? null : value;
    }).required('Vui lòng chọn Trạng thái sử dụng').default(DEFAULT_VALUES.STAGE),
    layoutItems: yup.array().nullable(),
    // Amenities validation
    amenities: yup.array().of(
        yup.object().shape({
            id: yup.string().nullable(), // ID của tiện ích
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

const AddMeetingRoom = ({ sharedComponents, onClose, setReloadData }) => {
		const { BaseSwipper } = sharedComponents;
    const toast = useToast();
    const [isLoading, setIsLoading] = useState(false);
    // State riêng cho hiển thị ảnh preview
    const [layoutImagePreview, setLayoutImagePreview] = useState(null);
    const [imageFile, setImageFile] = useState(null); // File object để gửi lên server

    // Fetch Status Options from Redux
    const { crmSource } = useSelector((state) => state.config);
    const stageOptions = Array.isArray(crmSource) ? crmSource.find((item) => item.code === "TRANGTHAISUDUNGPHONGHOP")?.data || [] : [];

    // --- FORM SETUP ---
    const { control, handleSubmit, formState: { errors }, setValue } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            id: null,
            roomName: '',
            location: '',
            capacity: '',
            stage: DEFAULT_VALUES.STAGE, // Add stage default
            availableFrom: new Date().toISOString(),
            layoutRows: 8,
            layoutCols: 10,
            layoutItems: [],
            amenities: [], // Clear default amenities for Add
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

    // --- FETCH AMENITIES ---
    const [amenityOptions, setAmenityOptions] = useState([]);
    useEffect(() => {
        const fetchAmenities = async () => {
            try {
                const response = await getAllAmenities();
                // Handle new API structure: { items: [...] }
                // Also support potential axios response nesting: response.data.items
                const items = response?.items || response?.data?.items || response?.data || [];

                if (Array.isArray(items)) {
                    // Map API data to options { value: id, label: name }
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

    // --- HANDLERS ---
    const handleImageChange = useCallback((file) => {
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                toast("Vui lòng chỉ tải lên định dạng ảnh (JPG, PNG, GIF,...)", "warning");
                return;
            }

            setImageFile(file); // Lưu file để upload
            const objectUrl = URL.createObjectURL(file);
            setLayoutImagePreview(objectUrl); // Lưu URL để preview

            // Clean up memory khi component unmount
            return () => URL.revokeObjectURL(objectUrl);
        }
    }, [toast]);

    const handleImageRemove = useCallback(() => {
        setImageFile(null);
        setLayoutImagePreview(null);
    }, []);

    const onSubmit = useCallback(async (data) => {
        setIsLoading(true);
        try {
            // Updated to use JSON payload as requested
            const payload = {
                name: data.roomName,
                location: data.location,
                capacity: Number(data.capacity),
                availableFrom: data.availableFrom,
                stage: data.stage, // Add stage to payload

                // Layout config
                layoutRows: Number(data.layoutRows),
                layoutCols: Number(data.layoutCols),
                layoutItems: data.layoutItems || [],
                totalSeating: (data.layoutItems || []).filter(item => item.itemType === 'CHAIR').length,

                // Amenities - Send as array of objects with amenityId
                amenities: data.amenities.map(item => ({
                    amenityId: item.name,
                    quantity: Number(item.quantity)
                })),
                order: (data.order !== "" && data.order !== null && data.order !== undefined) ? Number(data.order) : 1,
            };

            // 1. Create Record
            const response = await createMeetingRoom(payload);
            const newRoomId = response?.data?.id || response?.data?._id || response?.id;

            // 2. Upload Image if exists
            if (imageFile && newRoomId) {
                try {
                    // Using generic 'meeting_room' objectType, adjust if backend requires specific type
                    const uploadResp = await apiUploadFile(imageFile, 'meeting_room', newRoomId);

                    // 3. Update Record with Image ID
                    // Based on user request to save image ID as string
                    const imageId = uploadResp?.id;
                    if (imageId) {
                        await updateMeetingRoom(newRoomId, { image: String(imageId) });
                    }
                } catch (uploadError) {
                    console.error("Image upload failed:", uploadError); // eslint-disable-line no-console

                    toast(JSON.stringify(uploadError), 'warning');
                }
            }

            toast("Thêm mới phòng họp thành công!", 'success');
            onClose();
            // Trigger auto reload list if needed, prop setReloadData might be passed
            if (typeof setReloadData === 'function') {
                setReloadData((prev) => !prev);
            }
        } catch (error) {
            console.error(error); // eslint-disable-line no-console
            const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra, vui lòng thử lại.";
            toast(errorMessage, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [imageFile, toast, onClose, setReloadData]);

    const handleSave = useCallback(() => {
        handleSubmit(onSubmit, (formErrors) => {
            const firstError = Object.values(formErrors)[0];
            toast(firstError?.message || "Vui lòng kiểm tra lại thông tin nhập", "error");
        })();
    }, [handleSubmit, onSubmit, toast]);

    return (
        <BaseSwipper
            title="Thêm mới phòng họp"
            open
            onClose={onClose}
            onSave={handleSave}
            type="add"
            hideBackdrop
            isLoading={isLoading}
            moreActions={
                <ActionButtonBox>
                    <Button variant="primary" onClick={handleSave}>LƯU</Button>
                </ActionButtonBox>
            }
        >
            <SwipperContentBox>
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
                        fields={fields}
                        onRemoveEquipment={remove}
                    />

                    <ConstrainedLayoutBox >
                        <RoomLayoutSection
                            sharedComponents={sharedComponents}
                            control={control}
                            setValue={setValue}
                        />
                    </ConstrainedLayoutBox>
                </ContentCard>
            </SwipperContentBox>
        </BaseSwipper>
    );
};

export default withSharedComponents(AddMeetingRoom);

