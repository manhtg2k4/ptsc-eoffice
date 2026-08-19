import React from 'react';
import { RegistryProvider, defaultRegistry, FormAdd } from "@builder-form/index";

export default function LazyFormAdd({ fnCode }) {
    return (
        <RegistryProvider registry={defaultRegistry}>
            <FormAdd fnCode={fnCode} />
        </RegistryProvider>
    );
}
