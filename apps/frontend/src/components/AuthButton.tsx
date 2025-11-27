"use client";

import { useEffect, useState } from "react";
import { useUser, useAuth, SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { apiService } from "@/services/api";
import { Button } from "@/components/ui/button";

export default function AuthButton() {
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    async function syncUser() {
      if (isSignedIn && user) {
        try {
          setIsLoading(true);
          const token = await getToken();
          const response = await apiService.syncUserIfNeeded(token || undefined);
          
          if (!response.success) {
            setSyncError(response.error || "Failed to sync user");
          } else {
            setSyncError(null);
          }
        } catch (error) {
          setSyncError("Failed to sync user");
        } finally {
          setIsLoading(false);
        }
      }
    }

    syncUser();
  }, [isSignedIn, user, getToken]);

  return (
    <div className="flex items-center gap-4">
      <SignedOut>
        <SignInButton mode="modal">
          <Button disabled={isLoading}>
            {isLoading ? "Syncing..." : "Sign In"}
          </Button>
        </SignInButton>
      </SignedOut>
      
      <SignedIn>
        {isLoading && (
          <div className="text-sm text-muted-foreground">
            Syncing...
          </div>
        )}
        
        {syncError && (
          <div className="text-sm text-destructive">
            {syncError}
          </div>
        )}
        
        <UserButton 
          appearance={{
            elements: {
              avatarBox: "w-8 h-8"
            }
          }}
        />
      </SignedIn>
    </div>
  );
}
