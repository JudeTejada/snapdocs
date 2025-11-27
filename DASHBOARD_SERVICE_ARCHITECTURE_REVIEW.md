# Dashboard Service Architecture Review

## Current Architecture Analysis

### Location
`apps/backend/src/dashboard/dashboard.service.ts`

### Current Problems

#### 1. Performance Issues
- **Every dashboard query triggers full GitHub API calls**
- No caching or staleness checks - redundant API calls
- Slow user experience with loading states on every visit
- Potential GitHub API rate limit issues

#### 2. Architectural Concerns
- **Tight Coupling**: Business logic mixed with data synchronization
- **Responsiveness**: Synchronous operations block user requests
- **Resource Waste**: GitHub API quota consumed unnecessarily

### Current Code Pattern
```typescript
async getUserRepos(clerkId: string): Promise<RepositorySummary[]> {
  // First sync repositories from GitHub to database
  await this.syncRepositoriesFromGitHub(clerkId);
  return this.dashboardRepository.findUserReposWithPRs(clerkId);
}
```

## Recommended Solutions

### 1. Background Sync (Recommended) ✅
**Use your existing BullMQ setup for periodic sync**

```typescript
@Injectable()
export class DashboardService {
  async getUserRepos(clerkId: string): Promise<RepositorySummary[]> {
    // Dashboard reads from fresh database immediately - no blocking sync
    return this.dashboardRepository.findUserReposWithPRs(clerkId);
  }

  async getUserPRs(clerkId: string): Promise<PRSummary[]> {
    return this.dashboardRepository.findUserPRs(clerkId);
  }

  async getUserStats(clerkId: string): Promise<UserStats> {
    return this.dashboardRepository.getUserStats(clerkId);
  }

  async refreshData(clerkId: string): Promise<void> {
    await this.bullQueueService.addSyncRepositoriesJob({ clerkId });
  }
}
```

**Benefits:**
- Fast API responses (no GitHub API calls)
- Background sync via BullMQ workers
- Better separation of concerns
- Improved user experience

### 2. Staleness-Based Sync
```typescript
async getUserRepos(clerkId: string): Promise<RepositorySummary[]> {
  const isStale = await this.isDataStale(clerkId);
  if (isStale) {
    this.syncRepositoriesFromGitHub(clerkId); // Fire and forget
  }
  return this.dashboardRepository.findUserReposWithPRs(clerkId);
}
```

### 3. Manual Refresh
```typescript
async getUserRepos(clerkId: string): Promise<RepositorySummary[]> {
  return this.dashboardRepository.findUserReposWithPRs(clerkId);
}

async refreshData(clerkId: string): Promise<void> {
  await this.syncRepositoriesFromGitHub(clerkId);
}
```

## Implementation Plan

### Phase 1: BullMQ Integration
1. **Extend BullQueueService**
```typescript
// Add to apps/backend/src/bullmq/bullmq.service.ts
@InjectQueue('syncRepositories') private readonly syncRepositoriesQueue: Queue,

async addSyncRepositoriesJob(data: { clerkId: string }) {
  return this.syncRepositoriesQueue.add('syncRepositories', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  });
}
```

### Phase 2: Worker Implementation
2. **Create Sync Worker**
```typescript
// apps/backend/src/workers/sync-worker.service.ts
@Processor('syncRepositories')
export class SyncWorkerService {
  async process(job: Job<{ clerkId: string }>) {
    await this.syncRepositoriesFromGitHub(job.data.clerkId);
  }
}
```

### Phase 3: Cron Job
3. **Periodic Sync**
```typescript
// Use @nestjs/schedule for cron jobs
@Cron('0 */30 * * * *') // Every 30 minutes
async handlePeriodicSync() {
  const allUsers = await this.usersService.getAllConnectedUsers();
  for (const user of allUsers) {
    await this.bullQueueService.addSyncRepositoriesJob({ clerkId: user.clerkId });
  }
}
```

### Phase 4: Dashboard Service Refactor
4. **Clean Dashboard Methods**
```typescript
async getUserRepos(clerkId: string): Promise<RepositorySummary[]> {
  return this.dashboardRepository.findUserReposWithPRs(clerkId);
}

async getUserPRs(clerkId: string): Promise<PRSummary[]> {
  return this.dashboardRepository.findUserPRs(clerkId);
}

async getUserStats(clerkId: string): Promise<UserStats> {
  return this.dashboardRepository.getUserStats(clerkId);
}

async refreshData(clerkId: string): Promise<void> {
  await this.bullQueueService.addSyncRepositoriesJob({ clerkId });
}
```

## Migration Strategy

### 1. Zero-Downtime Migration
1. Deploy new worker alongside existing sync logic
2. Gradually shift to background sync
3. Keep manual refresh option for development/debugging

### 2. Database Schema Updates
- Add `lastSyncAt` field to `User` model
- Add `lastSyncAt` field to `Repo` model for incremental sync

### 3. API Enhancements
- Add `GET /dashboard/last-sync` endpoint
- Add `POST /dashboard/refresh` endpoint
- Add "Last updated" timestamp to UI

## Benefits Summary

### Performance Improvements
- **95%+ faster API responses** (no GitHub API calls)
- **Reduced GitHub API usage** (sync every 30min vs every request)
- **Better scalability** (distributed sync workers)

### Architectural Improvements
- **Separation of concerns** (sync logic isolated)
- **Better error handling** (retry logic, dead letter queues)
- **Monitoring** (job metrics, sync health)

### User Experience
- **Instant dashboard loads**
- **Manual refresh option** when needed
- **Background updates** without user intervention

## Monitoring & Alerts

### Key Metrics
- Sync job success/failure rates
- GitHub API usage per hour
- Average sync duration
- Dashboard response times

### Alert Conditions
- Sync job failure rates > 10%
- GitHub API rate limit warnings
- Dashboard response times > 2s

## Timeline

- **Phase 1-2**: 1-2 days (BullMQ integration)
- **Phase 3**: 1 day (Worker + Cron setup)
- **Phase 4**: 1 day (Dashboard refactor)
- **Testing & Migration**: 2-3 days

**Total: ~5-7 days**

## Next Steps

1. ✅ Review and approve this approach
2. 🔄 Implement BullMQ sync job
3. 🔄 Create sync worker
4. 🔄 Add cron scheduling
5. 🔄 Refactor dashboard service
6. 🔄 Deploy and monitor

---

*Generated by Senior Engineer Review - Nov 27, 2025*
