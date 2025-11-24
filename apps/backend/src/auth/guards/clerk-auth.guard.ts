import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClerkService } from '../clerk.service';

@Injectable()
export class ClerkAuthGuard extends AuthGuard('jwt') {
  constructor(private clerkService: ClerkService) {
    super();
  }

  async canActivate(context: any) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('No authorization header');
    }

    try {
      const user = await this.clerkService.getUserFromAuthHeader(authHeader);
      if (user) {
        request.user = user;
        return true;
      }
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }

    return false;
  }
}