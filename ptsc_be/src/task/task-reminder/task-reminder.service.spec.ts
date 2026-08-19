import { Test, TestingModule } from '@nestjs/testing';
import { TaskReminderService } from './task-reminder.service';

describe('TaskReminderService', () => {
  let service: TaskReminderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TaskReminderService],
    }).compile();

    service = module.get<TaskReminderService>(TaskReminderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
