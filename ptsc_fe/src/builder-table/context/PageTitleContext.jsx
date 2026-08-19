import { createContext, useContext } from 'react';

export const PageTitleContext = createContext({
  hideTitle: false,
  setHideTitle: () => {},
});

export const usePageTitle = () => useContext(PageTitleContext);
