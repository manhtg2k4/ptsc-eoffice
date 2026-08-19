import React from 'react';
import { ViewTable, RegistryProviderTable, defaultRegistryTable } from "@builder-table/index";

export default function LazyTableView({ fnCode }) {
    return (
        <RegistryProviderTable registry={defaultRegistryTable}>
            <ViewTable fnCode={fnCode} />
        </RegistryProviderTable>
    );
}
