import { usePermissionsStore } from '../store/permissionsStore';

export const usePermission = (module) => {
  const { getAccessLevel, loaded } = usePermissionsStore();
  const access = getAccessLevel(module);

  return {
    canView:   access !== 'No Access',
    canCreate: access === 'Full Access',
    canEdit:   access === 'Full Access',
    canDelete: access === 'Full Access',
    isReadOnly: access === 'Read',
    isFull:    access === 'Full Access',
    accessLevel: access,
    loaded,
  };
};
