import {
    // Checkbox,
    // FormControlLabel,
    // FormGroup,
    // Typography,
    Box
} from "@mui/material";
import React, {
    useContext,
    // useMemo
} from "react";
// import DebouncedInput from "@components/DynamicForm/DebouncedInput";
import PropTypes from "prop-types";
import CustomInput from "@components/CustomInput/CustomInput";
import { AuthContext } from "@AuthContext/AuthProvider";

const ExtractUserFinput = (
    {
        // value = "[]",
        // onChange,
        // item,
        // disabled,
        // mode,
        // onPropChange,
        label
    }
) => {

    const { user } = useContext(AuthContext);
    logger.log("🚀 ~ ExtractUserFinput ~ user:", user)
    return (
        <Box>
            <CustomInput label={label} value={user.user.username} disabled />
        </Box>
    );
};

ExtractUserFinput.propTypes = {
    value: PropTypes.any,
    onChange: PropTypes.func,
    item: PropTypes.object,
    disabled: PropTypes.bool,
    mode: PropTypes.string,
    onPropChange: PropTypes.func,
    label: PropTypes.string,
};

export default ExtractUserFinput;
