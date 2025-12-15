'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { RefreshCw, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface SyncStatusProps {
  getToken: () => Promise<string | null>;
  onRefresh?: () => void;
}

export default function SyncStatus({ getToken, onRefresh }: SyncStatusProps) {
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchSyncStatus = useCallback(async () => {
    try {
      const token = getToken ? await getToken() : null;
      const response = await apiService.getSyncStatus(token || undefined);
      if (response.success && response.data?.syncStatus) {
        setSyncStatus(response.data.syncStatus);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    }
  }, [getToken]);

  useEffect(() => {
    fetchSyncStatus();
  }, [fetchSyncStatus]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const token = getToken ? await getToken() : null;
      const response = await apiService.refreshData(token || undefined);
      if (response.success) {
        // Wait a moment for the sync to start, then refresh status
        setTimeout(() => {
          fetchSyncStatus();
          if (onRefresh) {
            onRefresh();
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return `${Math.floor(minutes / 1440)}d ago`;
  };

  const isStale = syncStatus?.isStale ?? true;
  const lastSyncAt = syncStatus?.lastSyncAt ? new Date(syncStatus.lastSyncAt) : null;

  return (
    <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border">
      <div className="flex items-center space-x-3">
        {isStale ? (
          <AlertCircle className="h-4 w-4 text-yellow-500" />
        ) : (
          <CheckCircle className="h-4 w-4 text-green-500" />
        )}
        <div>
          <p className="text-sm font-medium">
            {isStale ? 'Data may be outdated' : 'Data is up to date'}
          </p>
          <p className="text-xs text-muted-foreground">
            Last synced: {formatLastSync(lastSyncAt)}
          </p>
        </div>
      </div>
      
      <Button
        onClick={handleRefresh}
        disabled={isRefreshing}
        variant="outline"
        size="sm"
        className="ml-4"
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
        {isRefreshing ? 'Refreshing...' : 'Refresh'}
      </Button>
    </div>
  );
}