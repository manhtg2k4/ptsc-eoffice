import React from 'react';
import PropTypes from 'prop-types';

export const RegistryContext = React.createContext({});

export const useRegistry = () => React.useContext(RegistryContext);

export const RegistryProvider = ({ registry, children }) => (
  <RegistryContext.Provider value={registry}>
    {children}
  </RegistryContext.Provider>
);

RegistryProvider.propTypes = {
  registry: PropTypes.object.isRequired,
  children: PropTypes.node.isRequired,
};
