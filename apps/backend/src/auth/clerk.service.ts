import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createClerkClient } from "@clerk/backend";

export interface ClerkUser {
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

@Injectable()
export class ClerkService {
  private clerk;

  constructor(private jwtService: JwtService) {
    this.clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });
  }

  async verifyAuthToken(token: string): Promise<ClerkUser> {
    try {
      const payload = await this.clerk.verifyToken(token);
      
      return {
        clerkId: payload.sub,
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
      };
    } catch (error) {
      throw new Error(`Invalid token: ${error.message}`);
    }
  }

  async createJwtToken(user: ClerkUser): Promise<string> {
    return this.jwtService.sign({
      clerkId: user.clerkId,
      email: user.email,
    });
  }

  async verifyJwtToken(token: string): Promise<any> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new Error(`Invalid JWT token: ${error.message}`);
    }
  }

  async getUserFromAuthHeader(authHeader: string): Promise<ClerkUser | null> {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.substring(7);
    return this.verifyAuthToken(token);
  }

  async getUser(clerkId: string) {
    try {
      return await this.clerk.users.getUser(clerkId);
    } catch (error) {
      throw new Error(`Failed to get user: ${error.message}`);
    }
  }
}