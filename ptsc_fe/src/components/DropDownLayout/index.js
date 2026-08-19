import dayjs from 'dayjs';
import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Grid, Select, MenuItem } from '@mui/material';
import { Add, Remove } from '@mui/icons-material';
// import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import useMediaQuery from '@mui/material/useMediaQuery';
import CustomDatePicker from './DatePicker';
import {
    ContentWrapper,
    HeaderBox,
    LayoutWrapper, SelectedContentTypeTypography, StyledSelect, HeaderContentBox,
    ToggleIconButton
} from '@styles/DropDownLayout.styles';

const ContentType = ({ data, onChangeContent }) => {
    const [selectedValue, setSelectedValue] = useState(data[0]?.contentType || '');

    const handleChange = (e) => {
        const contentType = e.target.value;
        const selectedItem = data.find((c) => c.contentType === contentType);
        if (selectedItem) {
            setSelectedValue(contentType);
            onChangeContent({ contentType, contentName: selectedItem.contentName });
        }
    };

    const stopPropagation = useCallback((e) => {
        e.stopPropagation();
    }, []);

    return (
        <Select
            value={selectedValue}
            onChange={handleChange}
            // onClick={(e) => e.stopPropagation()}
            onClick={stopPropagation}
            size="small"    
            disableUnderline
        >
            {data.map((item, idx) => (
                <MenuItem key={idx} value={item.contentType}>
                    {selectedValue === item.contentType ? (
                        <SelectedContentTypeTypography>
                            {item.contentName}
                        </SelectedContentTypeTypography>
                    ) : (
                        item.contentName
                    )}
                </MenuItem>
            ))}
        </Select>
    );
};

ContentType.propTypes = {
    data: PropTypes.arrayOf(
        PropTypes.shape({
            contentType: PropTypes.string.isRequired,
            contentName: PropTypes.string.isRequired,
        })
    ).isRequired,
    onChangeContent: PropTypes.func.isRequired,
};

function DropDownLayout({
    time,
    select,
    dataSelect,
    autoScroll,
    // height,
    // maxHeight,
    display,
    children,
    effectData,
    contentTypes,
    moreContent,
    onDateChange
}) {
    const [open, setOpen] = useState(true);
    const downLg = useMediaQuery('(max-width:1750px)');

    const initialStartDate = dayjs().startOf('month');
    const initialEndDate = dayjs();

    const [dataEventRight, setDataEventRight] = useState({
        startDate: initialStartDate,
        endDate: initialEndDate,
        ...(dataSelect?.name && dataSelect?.render?.[0] ? { [dataSelect.name]: dataSelect.render[0].value } : {}),
        ...(Array.isArray(contentTypes) && contentTypes.length > 0
            ? { contentType: contentTypes[0].contentType }
            : {})
    });

    const handleToggle = () => setOpen((prev) => !prev);

    const updateDate = (key, newDate, compareDate, compareOp) => {
        if (!newDate || compareOp(newDate, compareDate)) {
            setDataEventRight((prev) => ({ ...prev, [key]: dayjs(compareDate) }));
        } else {
            setDataEventRight((prev) => ({ ...prev, [key]: dayjs(newDate) }));
        }
    };

    const handleStartDateChange = (date) => {
        updateDate('startDate', date, dataEventRight.endDate, (a, b) => a.isSame(b, 'day') || a.isAfter(b));
    };

    const handleEndDateChange = (date) => {
        updateDate('endDate', date, dataEventRight.startDate, (a, b) => a.isSame(b, 'day') || a.isBefore(b));
    };

    const handleContentChange = ({ contentType }) => {
        setDataEventRight((prev) => ({ ...prev, contentType }));
    };

    const handleSelectChange = (event) => {
        setDataEventRight((prev) => ({
            ...prev,
            [dataSelect.name]: event.target.value
        }));
    };

    // useEffect(() => {
    //     if (effectData) {
    //         effectData(dataEventRight);
    //     }
    //     // Truyền giá trị ngày tháng lên component cha nếu có callback onDateChange
    //     // Điều này đảm bảo Dashboard nhận được ngày mặc định ngay khi component được tải
    //     if (onDateChange) {
    //         onDateChange({
    //             fromDate: dataEventRight.startDate,
    //             toDate: dataEventRight.endDate,
    //         });
    //     }
    // }, [
    //     dataEventRight.startDate, 
    //     dataEventRight.endDate, 
    //     dataEventRight.contentType, 
    //     dataEventRight[dataSelect?.name], 
    //     effectData, 
    //     onDateChange
    // ]);

    useEffect(() => {
    if (effectData) {
        effectData(dataEventRight);
    }
    if (onDateChange) {
        onDateChange({
            fromDate: dataEventRight.startDate,
            toDate: dataEventRight.endDate,
        });
    }
}, [dataEventRight, effectData, onDateChange]);


    const stopPropagation = useCallback((e) => {
        e.stopPropagation();
    }, []);

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            {/* <LayoutWrapper $maxHeight={maxHeight}> */}
            <LayoutWrapper>
                <HeaderBox isMobile={downLg} onClick={handleToggle}>
                    <HeaderContentBox>
                        <ToggleIconButton>
                            {open ? <Remove /> : <Add />}
                        </ToggleIconButton>
                        {contentTypes ? (
                            <ContentType data={contentTypes} onChangeContent={handleContentChange} />
                        ) : (
                            display
                        )}
                    </HeaderContentBox>

                    {/* <HeaderContentBox onClick={(e) => e.stopPropagation()}> */}
                    <HeaderContentBox onClick={stopPropagation}>
                        {time && (
                            <Grid container spacing={1}>
                                <Grid item>
                                    <CustomDatePicker
                                        required
                                        slotProps={{
                                            textField: {
                                                variant: 'outlined',
                                                size: 'small',
                                                label: 'Từ ngày',
                                            },
                                        }}
                                        format="DD-MM-YYYY"
                                        value={dataEventRight.startDate}
                                        onChange={handleStartDateChange}
                                    />
                                </Grid>
                                <Grid item>
                                    <CustomDatePicker
                                        required
                                        slotProps={{
                                            textField: {
                                                variant: 'outlined',
                                                size: 'small',
                                                label: 'Đến ngày',
                                            },
                                        }}
                                        format="DD-MM-YYYY"
                                        value={dataEventRight.endDate}
                                        onChange={handleEndDateChange}
                                    />
                                </Grid>
                            </Grid>
                        )}

                        {select && (
                            <StyledSelect
                                // onClick={(e) => e.stopPropagation()}
                                onClick={stopPropagation}
                                value={dataEventRight[dataSelect?.name] || ''}
                                onChange={handleSelectChange}
                                name={dataSelect?.name}
                                disableUnderline
                                size="small"
                            >
                                {dataSelect?.render?.map((r, idx) => (
                                    <MenuItem key={idx} value={r.value}>
                                        {r.title}
                                    </MenuItem>
                                ))}
                            </StyledSelect>
                        )}

                        {open && moreContent && moreContent()}
                    </HeaderContentBox>
                </HeaderBox>

                {open && (
                    <ContentWrapper autoScroll={autoScroll}>
                        {children}
                    </ContentWrapper>
                )}
            </LayoutWrapper>
        </LocalizationProvider>
    );
}

DropDownLayout.propTypes = {
    time: PropTypes.bool,
    select: PropTypes.bool,
    dataSelect: PropTypes.shape({
        name: PropTypes.string,
        render: PropTypes.arrayOf(
            PropTypes.shape({
                value: PropTypes.any,
                title: PropTypes.string,
            })
        ),
    }),
    autoScroll: PropTypes.bool,
    height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    maxHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    display: PropTypes.node,
    children: PropTypes.node,
    effectData: PropTypes.func,
    contentTypes: PropTypes.arrayOf(
        PropTypes.shape({
            contentType: PropTypes.string,
            contentName: PropTypes.string,
        })
    ),
    moreContent: PropTypes.func,
    onDateChange: PropTypes.func,
};

export default DropDownLayout;