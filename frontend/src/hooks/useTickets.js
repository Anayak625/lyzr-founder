import { useQuery } from '@tanstack/react-query';
import { fetchTickets } from '@/api';

export const useTickets = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['tickets'],
    queryFn: fetchTickets,
  });

  return { 
    tickets: data?.results || [], 
    isLoading, 
    error 
  };
};