# GitHub App Uninstall - Soft Delete Implementation Plan

## Overview

This document outlines the implementation plan for handling GitHub App disconnections using a **soft delete approach** (Option 1). This approach preserves user data while marking it as archived/inactive, allowing for potential reconnection and maintaining historical context.

## Current Issues

1. **Data Leakage**: Current disconnect only clears `githubId` field but leaves all repository, PR, and documentation data intact
2. **No Webhook Handling**: External uninstalls from GitHub are not handled
3. **No Data Archival**: No way to distinguish active vs disconnected data
4. **Inconsistent State**: Repositories retain `installId` pointing to disconnected installations

## Implementation Goals

- ✅ Preserve user-generated content (documentation, summaries)
- ✅ Mark data as archived/inactive on disconnect
- ✅ Handle both user-initiated and external uninstalls
- ✅ Allow clean reconnection without data loss
- ✅ Maintain data integrity and relationships
- ✅ Provide audit trail for disconnections

## Database Schema Changes

### 1. Add Archive Fields to Models

```prisma
// Add to schema.prisma

model Repo {
  // ... existing fields ...
  isActive        Boolean   @default(true)
  disconnectedAt  DateTime?
  installId       String?   // Make optional to allow clearing
}

model PullRequest {
  // ... existing fields ...
  isActive        Boolean   @default(true)
  archivedAt      DateTime?
}

model Documentation {
  // ... existing fields ...
  isActive        Boolean   @default(true)
  archivedAt      DateTime?
}

model User {
  // ... existing fields ...
  githubDisconnectedAt DateTime?
}
```

### 2. Migration Strategy

```sql
-- Migration SQL
ALTER TABLE "repos" 
ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "disconnected_at" TIMESTAMP(3),
ALTER COLUMN "install_id" DROP NOT NULL;

ALTER TABLE "pull_requests" 
ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "archived_at" TIMESTAMP(3);

ALTER TABLE "documentation" 
ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "archived_at" TIMESTAMP(3);

ALTER TABLE "users" 
ADD COLUMN "github_disconnected_at" TIMESTAMP(3);
```

## Implementation Plan

### Phase 1: Database Updates

#### 1.1 Update Prisma Schema
- [ ] Add archive fields to all relevant models
- [ ] Make `installId` optional in `Repo` model
- [ ] Generate and apply migration
- [ ] Update Prisma client types

#### 1.2 Repository Layer Updates

**File**: `src/users/users.repository.ts`

```typescript
// Add new methods

async archiveGitHubData(clerkId: string) {
  const user = await this.prisma.user.findUnique({
    where: { clerkId },
    include: {
      repos: {
        include: {
          prs: {
            include: { docs: true }
          }
        }
      }
    }
  });

  if (!user) return;

  const now = new Date();

  // Archive all documentation
  for (const repo of user.repos) {
    for (const pr of repo.prs) {
      if (pr.docs) {
        await this.prisma.documentation.update({
          where: { id: pr.docs.id },
          data: {
            isActive: false,
            archivedAt: now,
          }
        });
      }
      
      // Archive pull requests
      await this.prisma.pullRequest.update({
        where: { id: pr.id },
        data: {
          isActive: false,
          archivedAt: now,
        }
      });
    }
    
    // Archive repositories
    await this.prisma.repo.update({
      where: { id: repo.id },
      data: {
        isActive: false,
        disconnectedAt: now,
        installId: null, // Clear installation reference
        lastSyncAt: null, // Clear sync timestamp
      }
    });
  }

  // Update user disconnection timestamp
  await this.prisma.user.update({
    where: { clerkId },
    data: {
      githubDisconnectedAt: now,
    }
  });
}

async findByGitHubInstallationId(installationId: string) {
  return this.prisma.user.findFirst({
    where: { 
      githubId: installationId,
      githubDisconnectedAt: null // Only active connections
    }
  });
}

async reactivateGitHubData(clerkId: string, newInstallationId: string) {
  const user = await this.prisma.user.findUnique({
    where: { clerkId },
    include: {
      repos: {
        where: { isActive: false },
        include: {
          prs: {
            where: { isActive: false },
            include: { docs: true }
          }
        }
      }
    }
  });

  if (!user) return;

  // Reactivate all archived data
  for (const repo of user.repos) {
    // Reactivate pull requests
    for (const pr of repo.prs) {
      if (pr.docs) {
        await this.prisma.documentation.update({
          where: { id: pr.docs.id },
          data: {
            isActive: true,
            archivedAt: null,
          }
        });
      }
      
      await this.prisma.pullRequest.update({
        where: { id: pr.id },
        data: {
          isActive: true,
          archivedAt: null,
        }
      });
    }
    
    // Reactivate repository
    await this.prisma.repo.update({
      where: { id: repo.id },
      data: {
        isActive: true,
        disconnectedAt: null,
        installId: newInstallationId,
        lastSyncAt: new Date(),
      }
    });
  }

  // Clear user disconnection timestamp
  await this.prisma.user.update({
    where: { clerkId },
    data: {
      githubDisconnectedAt: null,
    }
  });
}
```

### Phase 2: Service Layer Updates

#### 2.1 Users Service
**File**: `src/users/users.service.ts`

```typescript
async archiveGitHubData(clerkId: string) {
  return this.usersRepository.archiveGitHubData(clerkId);
}

async reactivateGitHubData(clerkId: string, newInstallationId: string) {
  return this.usersRepository.reactivateGitHubData(clerkId, newInstallationId);
}

async findByGitHubInstallationId(installationId: string) {
  return this.usersRepository.findByGitHubInstallationId(installationId);
}
```

#### 2.2 Enhanced Disconnect Logic
**File**: `src/auth/auth.controller.ts`

```typescript
@Post("github/disconnect")
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: "Disconnect GitHub account with data archival" })
async disconnectGitHub(@GetClerkUser() user: any) {
  const githubStatus = await this.usersService.getGitHubStatus(user.clerkId);

  if (!githubStatus.connected) {
    return { message: "User not connected to GitHub" };
  }

  try {
    // Step 1: Archive all GitHub-related data
    this.logger.log(`Archiving GitHub data for user ${user.clerkId}`);
    await this.usersService.archiveGitHubData(user.clerkId);

    // Step 2: Uninstall from GitHub (this can fail if already uninstalled)
    try {
      await this.githubService.uninstallAppInstallation(
        githubStatus.installationId,
      );
      this.logger.log(`Successfully uninstalled GitHub App ${githubStatus.installationId}`);
    } catch (error) {
      // GitHub might already be uninstalled, continue with local cleanup
      this.logger.warn(`GitHub uninstall failed for ${githubStatus.installationId}, continuing with local cleanup`);
      
      // Check if it's a 404 (already uninstalled) or actual error
      if (error.status !== 404) {
        this.logger.error('Unexpected error during GitHub uninstall', error);
        // Continue with local cleanup even if GitHub call fails
      }
    }

    // Step 3: Clear user GitHub connection
    await this.usersService.disconnectGitHub(user.clerkId);

    return {
      success: true,
      message: "GitHub disconnected successfully - data has been archived",
      installationId: githubStatus.installationId,
      dataRetained: "archived",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    this.logger.error("Error disconnecting GitHub:", error);
    
    return {
      success: false,
      error: "Failed to disconnect GitHub account",
      message: "Please try again or contact support if the issue persists",
    };
  }
}
```

### Phase 3: Webhook Handling

#### 3.1 Update Webhook Controller
**File**: `src/webhooks/webhooks.controller.ts`

```typescript
@Post("github")
@HttpCode(200)
async handleGitHubWebhook(
  @Body() payload,
  @Headers("x-hub-signature-256") signature: string,
  @Headers("x-github-event") event: string,
  @Headers("x-github-delivery") delivery: string,
): Promise<WebhookResponseDto> {
  try {
    this.logger.log(
      `Received GitHub webhook: ${event} (delivery: ${delivery})`,
    );

    // Verify webhook signature
    const rawPayload = JSON.stringify(payload);
    const isValidSignature = this.githubService.verifyWebhookSignature(
      rawPayload,
      signature,
    );

    if (!isValidSignature) {
      this.logger.warn("Invalid signature for webhook delivery: ", delivery);
      return {
        success: false,
        message: "Invalid signature",
      };
    }

    // Handle installation deletion (external uninstall)
    if (event === "installation" && payload.action === "deleted") {
      const installationId = payload.installation.id.toString();
      
      this.logger.log(`Processing external uninstall for installation ${installationId}`);
      
      // Find user by installation ID
      const user = await this.usersService.findByGitHubInstallationId(installationId);
      
      if (user) {
        try {
          // Archive user data
          await this.usersService.archiveGitHubData(user.clerkId);
          
          // Clear user connection
          await this.usersService.disconnectGitHub(user.clerkId);
          
          this.logger.log(`Successfully processed external uninstall for user ${user.clerkId}`);
          
          return {
            success: true,
            message: "External uninstall processed successfully",
            data: {
              installationId,
              userId: user.clerkId,
              action: "external_uninstall",
            },
          };
        } catch (error) {
          this.logger.error("Error processing external uninstall", error);
          return {
            success: false,
            message: "Failed to process external uninstall",
          };
        }
      } else {
        this.logger.warn(`No user found for installation ${installationId}`);
        return {
          success: true,
          message: "Installation not found in database",
          data: { installationId },
        };
      }
    }

    // Handle existing pull_request events
    if (event === "pull_request") {
      // ... existing pull_request handling code ...
    }

    this.logger.log(
      `Ignoring webhook event: ${event} with action: ${payload.action}`,
    );
    return {
      success: true,
      message: "Event ignored",
      data: {
        event,
        action: payload.action,
      },
    };
  } catch (error) {
    this.logger.error("Error processing GitHub webhook", error);
    return {
      success: false,
      message: "Internal server error",
    };
  }
}
```

### Phase 4: Query Updates

#### 4.1 Update Repository Queries
**File**: `src/dashboard/dashboard.repository.ts`

Update all queries to filter by `isActive: true`:

```typescript
// Update getUserRepositories
async getUserRepositories(clerkId: string) {
  return this.prisma.repo.findMany({
    where: {
      user: { clerkId },
      isActive: true, // Only active repositories
    },
    include: {
      prs: {
        where: { isActive: true }, // Only active PRs
        include: {
          docs: {
            where: { isActive: true } // Only active docs
          }
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });
}

// Update getUserStats
async getUserStats(clerkId: string): Promise<UserStats> {
  const [totalRepos, totalPRs, totalDocs] = await Promise.all([
    this.prisma.repo.count({
      where: {
        user: { clerkId },
        isActive: true, // Only active repos
      },
    }),
    this.prisma.pullRequest.count({
      where: {
        repo: {
          user: { clerkId },
          isActive: true, // Only active repos
        },
        isActive: true, // Only active PRs
      },
    }),
    this.prisma.documentation.count({
      where: {
        pr: {
          repo: {
            user: { clerkId },
            isActive: true, // Only active repos
          },
          isActive: true, // Only active PRs
        },
        isActive: true, // Only active docs
      },
    }),
  ]);

  return {
    totalRepos,
    totalPRs,
    totalDocs,
    docsGenerated: totalDocs,
    pendingDocs: totalPRs - totalDocs,
  };
}
```

### Phase 5: Reconnection Handling

#### 5.1 Update Connect Logic
**File**: `src/auth/auth.controller.ts`

```typescript
@Post("github/connect")
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: "Connect GitHub account with reactivation support" })
async connectGitHub(
  @GetClerkUser() user: any,
  @Body() connectGitHubDto: ConnectGitHubDto,
) {
  // Check if user has archived data
  const existingUser = await this.usersService.getUserByClerkId(user.clerkId);
  
  if (existingUser?.githubDisconnectedAt) {
    // User is reconnecting - reactivate archived data
    this.logger.log(`Reactivating archived GitHub data for user ${user.clerkId}`);
    await this.usersService.reactivateGitHubData(user.clerkId, connectGitHubDto.installationId);
  } else {
    // New connection
    await this.usersService.connectGitHub(
      user.clerkId,
      connectGitHubDto.installationId,
    );
  }

  return { 
    message: existingUser?.githubDisconnectedAt 
      ? "GitHub reconnected successfully - archived data restored" 
      : "GitHub connected successfully",
    reconnected: !!existingUser?.githubDisconnectedAt
  };
}
```

## Testing Strategy

### Unit Tests
- [ ] Test data archival logic
- [ ] Test data reactivation logic
- [ ] Test webhook handling for external uninstalls
- [ ] Test query filtering for active data

### Integration Tests
- [ ] Test complete disconnect/reconnect flow
- [ ] Test external uninstall webhook processing
- [ ] Test data integrity during archival/reactivation
- [ ] Test concurrent operations

### Manual Testing Checklist
- [ ] Connect GitHub account
- [ ] Generate some documentation
- [ ] Disconnect GitHub account
- [ ] Verify data is archived (not deleted)
- [ ] Reconnect GitHub account
- [ ] Verify archived data is restored
- [ ] Test external uninstall from GitHub
- [ ] Verify archived data is accessible

## Rollback Plan

1. **Database Rollback**: Keep migration files for easy rollback
2. **Feature Flags**: Implement feature flags for gradual rollout
3. **Backup Strategy**: Backup database before deployment
4. **Monitoring**: Add extensive logging for troubleshooting

## Security Considerations

1. **Data Privacy**: Ensure archived data respects user privacy settings
2. **Access Control**: Archived data should not be accessible via API
3. **Audit Trail**: Maintain audit logs for all archival/reactivation operations
4. **Rate Limiting**: Implement rate limiting for disconnect/reconnect operations

## Performance Impact

1. **Query Performance**: Add database indexes on `isActive` fields
2. **Storage**: Archived data will increase storage requirements
3. **Caching**: Consider caching strategies for filtered queries
4. **Background Jobs**: Large archival operations should be handled in background jobs

## Monitoring and Alerting

1. **Disconnect Metrics**: Track successful vs failed disconnections
2. **Data Size**: Monitor archived data growth
3. **Reconnection Rate**: Track how often users reconnect
4. **Error Rates**: Monitor webhook processing errors

## Future Enhancements

1. **Data Export**: Allow users to export their archived data
2. **Selective Archival**: Let users choose what data to archive
3. **Retention Policies**: Implement automatic cleanup of old archived data
4. **Analytics**: Provide insights into archived vs active data

## Deployment Checklist

- [ ] Update database schema
- [ ] Deploy new repository methods
- [ ] Update service layer
- [ ] Deploy webhook handling
- [ ] Update dashboard queries
- [ ] Test in staging environment
- [ ] Monitor deployment metrics
- [ ] Verify data integrity
- [ ] Update documentation

This plan provides a robust, user-friendly approach to handling GitHub disconnections while preserving valuable user data and maintaining system integrity.