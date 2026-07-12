import { useQuery } from '@tanstack/react-query';
import { vehiclesApi } from '../api';

export const useVehicleStats = () =>
  useQuery({
    queryKey: ['vehicle-stats'],
    queryFn: () => vehiclesApi.getStats().then((r) => r.data),
    refetchInterval: 60_000,
  });
