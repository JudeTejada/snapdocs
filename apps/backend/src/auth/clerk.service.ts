import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { ClerkClient, createClerkClient, verifyToken } from "@clerk/backend";

export interface ClerkUser {
  clerkId: string;
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  sessionId?: string;
}

@Injectable()
export class ClerkService {
  private clerk: ClerkClient;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService
  ) {
    this.clerk = createClerkClient({
      secretKey: this.configService.get<string>('CLERK_SECRET_KEY'),
    });
  }

  async verifyAuthToken(token: string): Promise<ClerkUser> {
    try {
      // Use Clerk's verifyToken function
      const payload = await verifyToken(token, {
        secretKey: this.configService.get<string>('CLERK_SECRET_KEY'),
      });

      return {
        clerkId: payload.sub || '',
        userId: payload.sub || '',
        email: (payload.email as string) || (payload.email_addresses?.[0]?.email_address as string) || '',
        firstName: payload.given_name as string | undefined,
        lastName: payload.family_name as string | undefined,
        sessionId: (payload as any).sid as string | undefined,
      };
    } catch (error) {
      throw new UnauthorizedException(`Invalid token: ${error.message}`);
    }
  }

  async verifyToken(token: string): Promise<any> {
    try {
      return await verifyToken(token, {
        secretKey: this.configService.get<string>('CLERK_SECRET_KEY'),
      });
    } catch (error) {
      throw new UnauthorizedException(`Invalid token: ${error.message}`);
    }
  }

  async createJwtToken(user: ClerkUser): Promise<string> {
    return this.jwtService.sign({
      clerkId: user.clerkId,
      userId: user.userId,
      email: user.email,
      sessionId: user.sessionId,
    });
  }

  async verifyJwtToken(token: string): Promise<any> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException(`Invalid JWT token: ${error.message}`);
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

  async getCurrentUser(request: any): Promise<ClerkUser | null> {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
      }

      const token = authHeader.substring(7);
      return this.verifyAuthToken(token);
    } catch (error) {
      return null;
    }
  }
}
