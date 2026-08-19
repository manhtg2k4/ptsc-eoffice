import React from 'react';
import { COMPONENT_MAP } from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/config/componentMapping';
import { useCMS } from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/context/CMSContext';
import { SkeletonBox, EmptyContainer } from './CustomWrapper.styles';

export const CustomWrapper = ({ componentType, id, loading: blockLoading, height, ...props }) => {
  const { isLoading } = useCMS();
  const loading = blockLoading || isLoading;

  // Use 'componentType' to avoid conflict with generic 'component' prop if any
  const Comp = componentType && COMPONENT_MAP[componentType] ? COMPONENT_MAP[componentType].component : null;

  if (loading) {
    return <SkeletonBox $h={height} />;
  }

  if (!Comp) {
    return (
      <EmptyContainer>
        Vui lòng chọn component trong settings
      </EmptyContainer>
    );
  }

  return <Comp id={id} {...props} />;
};
