import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ClerkUser } from '../clerk.service';

export const GetClerkUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ClerkUser | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);