import { Injectable, UnauthorizedException, ExecutionContext, CanActivate } from '@nestjs/common';
import { ClerkService } from '../clerk.service';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private clerkService: ClerkService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException('No authorization header provided');
    }

    try {
      const token = authHeader.substring(7);
      const user = await this.clerkService.verifyAuthToken(token);
      
      if (user) {
        request.user = user;
        return true;
      }
    } catch (error) {
      throw new UnauthorizedException(`Authentication failed: ${error.message}`);
    }

    throw new UnauthorizedException('Authentication failed');
  }
}
