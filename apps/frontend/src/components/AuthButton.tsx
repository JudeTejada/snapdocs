"use client";

import { useEffect, useState } from "react";
import { useUser, useAuth, SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { apiService } from "@/services/api";

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
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? "Syncing..." : "Sign In"}
          </button>
        </SignInButton>
      </SignedOut>
      
      <SignedIn>
        {isLoading && (
          <div className="text-sm text-gray-500">
            Syncing user...
          </div>
        )}
        
        {syncError && (
          <div className="text-sm text-red-500">
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