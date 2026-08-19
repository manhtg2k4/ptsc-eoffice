import React from 'react';
import { StyledFooter, FooterText } from '@styles/Footer.styles';

const Footer = () => {
    return (
        <StyledFooter>
            <FooterText>
                © {new Date().getFullYear()} LifeteX. All rights reserved.
            </FooterText>
        </StyledFooter>
    );
};

export default Footer;