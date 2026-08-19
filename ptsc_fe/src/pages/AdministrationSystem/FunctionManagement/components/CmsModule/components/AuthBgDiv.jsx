import React from 'react';
import useAuthBlobUrl from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/hooks/useAuthBlobUrl';

export default function AuthBgDiv({ bgSrc, customStyle, customClassName, children, ...props }) {
    const blobUrl = useAuthBlobUrl(bgSrc);
    
    const mergedStyle = {
        ...customStyle,
        backgroundImage: blobUrl ? `url(${blobUrl})` : customStyle?.backgroundImage,
    };

    return (
        <div style={mergedStyle} className={customClassName} {...props}>
            {children}
        </div>
    );
}
