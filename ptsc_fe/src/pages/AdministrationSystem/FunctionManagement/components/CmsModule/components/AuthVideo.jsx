import React, { forwardRef } from 'react';
import useAuthBlobUrl from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/hooks/useAuthBlobUrl';

const AuthVideo = forwardRef(({ src, poster, children, customClassName, customStyle, ...props }, ref) => {
    const videoUrl = useAuthBlobUrl(src);
    const posterUrl = useAuthBlobUrl(poster);

    return (
        <video 
            ref={ref} 
            src={videoUrl} 
            poster={posterUrl} 
            className={customClassName}
            style={customStyle}
            {...props}
        >
            {children}
        </video>
    );
});

AuthVideo.displayName = 'AuthVideo';

export default AuthVideo;
