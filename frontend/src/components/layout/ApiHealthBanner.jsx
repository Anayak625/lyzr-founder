import { useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import apiClient from '@/api/apiClient';

const checkApiHealth = async () => {
    const { data } = await apiClient.get('/health/lyzr-api-status/');
    return data;
}

const ApiHealthBanner = () => {
    const { data: healthStatus } = useQuery({
        queryKey: ['apiHealth'],
        queryFn: checkApiHealth,
        refetchInterval: 3600000, 
        staleTime: 3550000,
    });

    if (healthStatus?.status === 'healthy') {
        return null;
    }

    if (healthStatus?.status === 'error' || healthStatus?.status === 'degraded') {
        return (
            <div className="bg-destructive/10 text-destructive-foreground text-center p-2 text-sm flex items-center justify-center gap-2">
                <AlertCircle className="h-4 w-4" />
                We are experiencing issues with our AI provider. Agent responses may be delayed or unavailable. We are working on it.
            </div>
        );
    }

    return null;
};

export default ApiHealthBanner;