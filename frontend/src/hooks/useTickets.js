// src/hooks/useTickets.js
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/apiClient';

const fetchTickets = async () => {
  const { data } = await apiClient.get('/tickets/');
  return data;
};

export const useTickets = () => {
  const { data: tickets, isLoading, error } = useQuery({
    queryKey: ['tickets'],
    queryFn: fetchTickets,
  });

  return { tickets, isLoading, error };
};