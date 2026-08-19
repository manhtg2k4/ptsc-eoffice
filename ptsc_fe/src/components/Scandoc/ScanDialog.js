import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import PropTypes from 'prop-types';
import { styled } from '@mui/material/styles'; // Import quan trọng
import {
    DialogContent,
    TextField,
    MenuItem,
    Typography,
    Box,
    IconButton,
    Stack,
    Paper
} from '@mui/material';
import withSharedComponents from "@components/WrapperComponent";
import { StyledDialog, StyledDialogContent } from "@styles/CustomDialog.styles";
import {
  StyledDialogTitle,
  StyledTitleText,
  StyleBoxFoodterEnd,
  StyledRowBox,
} from "@styles/DialogDirective";
import {
    Menu as MenuIcon,
    Delete,
    Visibility,
    Close as CloseIcon
} from '@mui/icons-material';

// API imports
import { getDevice, scan } from '@utils/api/scanners';

// Libraries
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { jsPDF } from "jspdf";

// Logger placeholder
const logger = console;

const A4_PAPER_DIMENSIONS = {
    width: 210,
    height: 297,
};

// ----------------------------------------------------------------------
// STYLED COMPONENTS (Định nghĩa Style bên ngoài)
// ----------------------------------------------------------------------

// 4. Stack chứa nội dung chính
const StyledContentStack = styled(Stack)(({ theme }) => ({
    marginTop: theme.spacing(1)
}));

// 5. Box chứa khu vực kéo thả (Drop Zone)
const StyledDropZone = styled(Box)(({ theme }) => ({
    minHeight: 200,
    border: '1px dashed #ccc',
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(1),
    backgroundColor: theme.components?.MuiTableHead?.styleOverrides?.root?.backgroundColor || theme.palette.background.paper,
}));


// 7. Item sau khi scan (Xử lý logic đổi màu khi Drag ở đây)
// `shouldForwardProp` dùng để chặn prop 'isDragging' truyền xuống DOM element gây warning
const StyledScanItemPaper = styled(Paper, {
    shouldForwardProp: (prop) => prop !== 'isDragging',
})(({ theme, isDragging }) => ({
    padding: theme.spacing(1),
    marginBottom: theme.spacing(1),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: isDragging 
        ? (theme.palette.mode === 'dark' ? 'rgba(33, 150, 243, 0.24)' : '#e3f2fd') 
        : 'linear-gradient(to right, #2196F3, #00BCD4)',
    color: isDragging ? theme.palette.text.primary : 'white'
}));

// 8. Các container nhỏ (Flex row)
const StyledFlexBox = styled(Box)({
    display: 'flex',
    alignItems: 'center'
});

// 9. Icon menu kéo thả
const StyledDragIcon = styled(MenuIcon)(({ theme }) => ({
    marginRight: theme.spacing(1),
    cursor: 'grab'
}));

// 10. Icon button hành động (xóa/xem)
const StyledActionIconButton = styled(IconButton)({
    color: 'inherit'
});

// 11. Text trạng thái (đang kết nối...)
const StyledStatusText = styled(Typography)(({ theme }) => ({
    fontStyle: 'italic',
    color: theme.palette.primary.main
}));

// 12. Vùng chứa ảnh preview (background tối)
const StyledPreviewContent = styled(DialogContent)({
    display: 'flex',
    justifyContent: 'center',
    backgroundColor: '#333'
});

// 13. Ảnh preview
const StyledPreviewImage = styled('img')({
    maxWidth: '100%',
    maxHeight: '80vh',
    objectFit: 'contain'
});

// 14. Nút đóng popup
const StyledCloseIconButton = styled(IconButton)(({ theme }) => ({
    position: 'absolute',
    right: 8,
    color: theme.palette.text.secondary
}));

// 15. Content của Scan Dialog
const StyledDialogContentCustom = styled(StyledDialogContent)({
    paddingTop: '24px',
    overflowY: 'auto',
    flex: 1
});

// 16. Label cho các form input
const StyledLabelTypography = styled(Typography)(({ theme }) => ({
    fontWeight: 'bold',
    color: theme.palette.mode === 'dark' ? theme.palette.text.secondary : '#555',
    marginBottom: '8px',
    textTransform: 'uppercase'
}));

// 17. Styled TextField cho Select
const StyledSelectField = styled(TextField)({
    '& .MuiOutlinedInput-root': {
        borderRadius: '8px'
    }
});

// 18. Wrapper để xóa border của Button
const NoBorderButtonWrapper = styled('div')({
    display: 'inline-block',
    '& button': {
        border: 'none !important'
    }
});

// ----------------------------------------------------------------------
// HELPER FUNCTIONS
// ----------------------------------------------------------------------

function dataURLtoFile(dataurl, filename) {
    try {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);

        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }

        return new File([u8arr], filename, { type: mime });
    } catch (error) {
        logger.error("Error converting dataURL to file:", error);
        return null;
    }
}

// ----------------------------------------------------------------------
// SUB-COMPONENT (ScanItem)
// ----------------------------------------------------------------------

const ScanItem = memo(({ item, index, provided, snapshot, onPreview, onDelete }) => {
    const handlePreview = useCallback(() => {
        onPreview(item);
    }, [onPreview, item]);

    const handleDelete = useCallback(() => {
        onDelete(index);
    }, [onDelete, index]);

    return (
        <StyledScanItemPaper
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            elevation={snapshot.isDragging ? 3 : 1}
            isDragging={snapshot.isDragging} // Truyền prop custom vào styled component
        >
            <StyledFlexBox>
                <StyledDragIcon />
                <Typography variant="body2">Trang {index + 1}</Typography>
            </StyledFlexBox>
            <Box>
                <StyledActionIconButton
                    size="small"
                    onClick={handlePreview}
                >
                    <Visibility  />
                </StyledActionIconButton>
                <StyledActionIconButton
                    size="small"
                    onClick={handleDelete}
                >
                    <Delete  />
                </StyledActionIconButton>
            </Box>
        </StyledScanItemPaper>
    );
});

ScanItem.propTypes = {
    item: PropTypes.object.isRequired,
    index: PropTypes.number.isRequired,
    provided: PropTypes.object.isRequired,
    snapshot: PropTypes.object.isRequired,
    onPreview: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
};
ScanItem.displayName = 'ScanItem';

// ----------------------------------------------------------------------
// MAIN COMPONENT
// ----------------------------------------------------------------------

const ScanDialog = (props) => {
    const { onSave, scanDialog, setScanDialog, sharedComponents } = props;
    const { Button, Input } = sharedComponents;

    const [scanDevices, setScanDevices] = useState([]);
    const [name, setName] = useState('Tài liệu');
    const [selectedDevice, setSelectedDevice] = useState('');
    const [spinning, setSpinning] = useState(false);
    const [findingScan, setFindingScan] = useState(false);
    const [uploadedImages, setUploadedImages] = useState([]);
    const [previewImage, setPreviewImage] = useState(null);

    const page = useRef(0);

    const onGetDevice = useCallback(() => {
        getDevice({
            onGetMessage: (res) => {
                if (res && res.data) {
                    try {
                        const arr = JSON.parse(res.data.replace(/\\/g, '\\'));
                        if (Array.isArray(arr)) {
                            setScanDevices(arr);
                            if (arr.length > 0) {
                                setSelectedDevice(arr[0].Id);
                            }
                        }
                    } catch (e) {
                        logger.error("Error parsing device list", e);
                    }
                }
            },
            onGetError: () => {}
        });
    }, []);

    useEffect(() => {
        if (scanDialog) {
            page.current = 0;
            onGetDevice();
            setUploadedImages([]);
            setSpinning(false);
            setFindingScan(false);
        }
    }, [scanDialog, onGetDevice]);

    const onScan = useCallback(() => {
        if (!selectedDevice) return;

        setSpinning(true);
        setFindingScan(true);

        scan({
            body: {
                "DeviceId": selectedDevice,
                "ImgType": "JPEG"
            },
            onGetMessage: (res) => {
                if (res && res.data && res.data.length > 100) {
                    page.current = page.current + 1;
                    const base64 = res.data;
                    const imgName = `${page.current}.jpg`;

                    setUploadedImages(prev => [...prev, { name: imgName, base64 }]);
                    setSpinning(false);
                    setFindingScan(false);
                }
            },
            onGetError: (err) => {
                logger.log("Scan Error", err);
                setSpinning(false);
                setFindingScan(false);
            }
        });

        setTimeout(() => {
            if (findingScan) setFindingScan(false);
        }, 5000);

        setTimeout(() => {
            setSpinning(false);
        }, 15000);
    }, [selectedDevice, findingScan]);

    const reloadDevices = useCallback(() => {
        setScanDevices([]);
        onGetDevice();
    }, [onGetDevice]);

    const handleDeviceChange = useCallback((e) => {
        setSelectedDevice(e.target.value);
    }, []);

    const handleNameChange = useCallback((e) => {
        setName(e.target.value);
    }, []);

    const handleClose = useCallback(() => {
        setScanDialog(null);
    }, [setScanDialog]);

    const handlePreviewOpen = useCallback((item) => {
        setPreviewImage(item);
    }, []);

    const handlePreviewClose = useCallback(() => {
        setPreviewImage(null);
    }, []);

    const handleDeleteImage = useCallback((indexToDelete) => {
        setUploadedImages(prev => prev.filter((_, i) => i !== indexToDelete));
    }, []);

    const onDragEnd = useCallback((result) => {
        if (!result.destination) return;

        setUploadedImages(prev => {
            const items = Array.from(prev);
            const [reorderedItem] = items.splice(result.source.index, 1);
            items.splice(result.destination.index, 0, reorderedItem);
            return items;
        });
    }, []);

    const onUpload = useCallback(() => {
        if (uploadedImages.length === 0) return;
        setSpinning(true);

        const files = uploadedImages.map((e, idx) =>
            dataURLtoFile(
                `data:image/jpg;base64,${e.base64}`,
                idx > 0 ? `${name}_trang_${idx + 1}.jpg` : `${name}.jpg`
            )
        ).filter(Boolean);

        onSave(files);

        setTimeout(() => {
            setSpinning(false);
        }, 500);
    }, [uploadedImages, name, onSave]);

    const onUploadPDF = useCallback(() => {
        if (uploadedImages.length === 0) return;
        setSpinning(true);

        setTimeout(() => {
            try {
                const doc = new jsPDF();
                uploadedImages.forEach((image, index) => {
                    if (index > 0) {
                        doc.addPage();
                    }
                    doc.addImage(
                        `data:image/jpg;base64,${image.base64}`,
                        'JPEG',
                        0,
                        0,
                        A4_PAPER_DIMENSIONS.width,
                        A4_PAPER_DIMENSIONS.height
                    );
                });

                const pdfBlob = doc.output("blob");
                const pdfFile = new File([pdfBlob], `${name}.pdf`, { type: "application/pdf" });

                onSave(pdfFile);
            } catch (e) {
                logger.error("Error creating PDF", e);
            } finally {
                setSpinning(false);
            }
        }, 100);
    }, [uploadedImages, name, onSave]);

    return (
        <>
            {/* Dialog Chính: Sử dụng Styled Component */}
            <StyledDialog
                open={!!scanDialog}
                onClose={handleClose}
                fullWidth
            >
                <StyledDialogTitle>
                    <StyledTitleText component="span">Quét văn bản</StyledTitleText>
                    <StyledCloseIconButton onClick={handleClose}>
                        <CloseIcon />
                    </StyledCloseIconButton>
                </StyledDialogTitle>

                <StyledDialogContentCustom>
                    <StyledContentStack spacing={2}>
                        <Box>
                            <StyledLabelTypography variant="subtitle2">Chọn máy quét</StyledLabelTypography>
                            <StyledSelectField
                                select
                                variant="outlined"
                                fullWidth
                                value={selectedDevice || ''}
                                onChange={handleDeviceChange}
                                size="small"
                            >
                                {scanDevices.length > 0 ? (
                                    scanDevices.map((item) => (
                                        <MenuItem key={item.Id} value={item.Id}>
                                            {item.Name}
                                        </MenuItem>
                                    ))
                                ) : (
                                    <MenuItem value="" disabled>
                                        Không tìm thấy thiết bị
                                    </MenuItem>
                                )}
                            </StyledSelectField>
                        </Box>

                        <Box>
                            <StyledLabelTypography variant="subtitle2">Tên mặc định</StyledLabelTypography>
                            <Input
                                fullWidth
                                value={name}
                                onChange={handleNameChange}
                                size="small"
                                placeholder="Nhập tên mặc định"
                            />
                        </Box>

                        {scanDevices.length === 0 && (
                            <Typography variant="caption" >
                                Không tìm thấy phần mềm hoặc máy quét!
                            </Typography>
                        )}

                        {findingScan && (
                            <StyledStatusText variant="body2">
                                Đang kết nối máy quét...
                            </StyledStatusText>
                        )}

                        {uploadedImages.length > 0 && (
                            <StyledDropZone>
                                <DragDropContext onDragEnd={onDragEnd}>
                                    <Droppable droppableId="scan-droppable" direction="vertical">
                                        {(provided) => (
                                            <div ref={provided.innerRef} {...provided.droppableProps}>
                                                {uploadedImages.map((item, index) => (
                                                    <Draggable
                                                        key={item.name}
                                                        draggableId={`item-${index}`}
                                                        index={index}
                                                    >
                                                        {(draggableProvided, snapshot) => (
                                                            <ScanItem
                                                                provided={draggableProvided}
                                                                snapshot={snapshot}
                                                                item={item}
                                                                index={index}
                                                                onPreview={handlePreviewOpen}
                                                                onDelete={handleDeleteImage}
                                                            />
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </DragDropContext>
                            </StyledDropZone>
                        )}


                    </StyledContentStack>
                </StyledDialogContentCustom>

                <StyleBoxFoodterEnd>
                    <StyledRowBox>
                        <NoBorderButtonWrapper>
                            <Button 
                                variant="error" 
                                onClick={handleClose}
                            >
                                Đóng
                            </Button>
                        </NoBorderButtonWrapper>
                        &emsp;
                        <Button 
                            variant="outlined" 
                            onClick={reloadDevices}
                        >
                            Tìm máy quét
                        </Button>
                        &emsp;
                        <Button
                            onClick={onScan}
                            variant="primary"
                            disabled={spinning || !selectedDevice}
                        >
                            {spinning ? 'Đang quét...' : 'Quét văn bản'}
                        </Button>
                        {uploadedImages.length > 0 && (
                            <>
                                &emsp;
                                <Button
                                    onClick={onUploadPDF}
                                    variant="primary"
                                    disabled={spinning}
                                >
                                    Lưu PDF
                                </Button>
                                &emsp;
                                <Button
                                    onClick={onUpload}
                                    variant="primary"
                                    disabled={spinning}
                                >
                                    Lưu Ảnh
                                </Button>
                            </>
                        )}
                    </StyledRowBox>
                </StyleBoxFoodterEnd>
            </StyledDialog>

            {/* Dialog Xem trước: Sử dụng Styled Component */}
            <StyledDialog
                open={!!previewImage}
                onClose={handlePreviewClose}
                fullWidth
            >
                <StyledDialogTitle >
                    <StyledTitleText component="span">Xem trước</StyledTitleText>
                    <StyledCloseIconButton onClick={handlePreviewClose}>
                        <CloseIcon />
                    </StyledCloseIconButton>
                </StyledDialogTitle>
                
                <StyledPreviewContent>
                    {previewImage && (
                        <StyledPreviewImage
                            alt="Scan Preview"
                            src={`data:image/jpg;base64,${previewImage.base64}`}
                        />
                    )}
                </StyledPreviewContent>
            </StyledDialog>
        </>
    );
};

ScanDialog.propTypes = {
    onSave: PropTypes.func.isRequired,
    scanDialog: PropTypes.any,
    setScanDialog: PropTypes.func.isRequired,
    sharedComponents: PropTypes.object
};

export default withSharedComponents(ScanDialog);