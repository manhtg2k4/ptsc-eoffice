// // system-log-task.module.ts
// import { Module } from '@nestjs/common';
// import { MongooseModule } from '@nestjs/mongoose';
// import { SystemLogTask, SystemLogTaskSchema } from './system-log.schema';
// ;

// @Module({
//   imports: [
//     MongooseModule.forFeature([
//       { name: SystemLogTask.name, schema: SystemLogTaskSchema },
//     ]),
//   ],
//   exports: [
//     MongooseModule, // 👈 cho module khác dùng model
//   ],
// })
// export class SystemLogTaskModule {}
