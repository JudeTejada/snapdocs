"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export async function syncRepositories() {
  const { getToken } = await auth();
  const token = await getToken();

  if (!token) {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/github/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (result.success) {
      // Revalidate both settings and dashboard pages
      revalidatePath("/dashboard/settings");
      revalidatePath("/dashboard");

      return {
        success: true,
        message: result.message || "Repositories synced successfully",
      };
    } else {
      return {
        success: false,
        error: result.error || "Failed to sync repositories",
      };
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to sync repositories",
    };
  }
}
