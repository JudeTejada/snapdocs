"use client";

import { useAuth } from "@clerk/nextjs";
import SyncStatus from "@/components/SyncStatus";

export default function SyncStatusWrapper() {
  const { getToken } = useAuth();

  return <SyncStatus getToken={getToken} />;
}
