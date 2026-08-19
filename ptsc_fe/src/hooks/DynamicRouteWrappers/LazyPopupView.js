import React from 'react';
import { RegistryProviderPopup, Popup, defaultRegistryPopup } from "@builder-popup/index";

export default function LazyPopupView({ fnCode }) {
    return (
        <RegistryProviderPopup registry={defaultRegistryPopup}>
            <Popup code={fnCode} />
        </RegistryProviderPopup>
    );
}
