import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

const Link = ({ href, children, ...props }) => {
    const toPath = typeof href === 'object' && href.pathname ? href.pathname : href;
    return <RouterLink to={toPath || "#"} {...props}>{children}</RouterLink>;
};

export default Link;
