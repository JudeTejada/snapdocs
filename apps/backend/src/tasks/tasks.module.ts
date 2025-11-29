import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ScheduledTasksService } from './scheduled-tasks.service';
import { DashboardModule } from '../dashboard/dashboard.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DashboardModule,
    UsersModule,
  ],
  providers: [ScheduledTasksService],
})
export class TasksModule {}