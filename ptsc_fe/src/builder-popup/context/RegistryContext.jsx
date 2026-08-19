import React from 'react';
import PropTypes from 'prop-types';

export const RegistryContext = React.createContext({});

export const useRegistry = () => React.useContext(RegistryContext);

export const RegistryProviderPopup = ({ registry, children }) => (
  <RegistryContext.Provider value={registry}>
    {children}
  </RegistryContext.Provider>
);

RegistryProviderPopup.propTypes = {
  registry: PropTypes.object.isRequired,
  children: PropTypes.node.isRequired,
};
