import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessTemplateController } from './process-template.controller';
import { ProcessTemplateService } from './process-template.service';
import { ProcessTemplateEntity } from './entities/process-template.entity';
import { ProcessTemplateTaskEntity } from './entities/process-template-task.entity';
import { UserEntity } from '../users/entities/user.entity';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';

@Module({
    imports: [
        TypeOrmModule.forFeature(
            [ProcessTemplateEntity, ProcessTemplateTaskEntity, UserEntity],
            'mssqlConnection'
        ),
        forwardRef(() => SystemLogSqlModule),
    ],
    controllers: [ProcessTemplateController],
    providers: [ProcessTemplateService],
    exports: [ProcessTemplateService],
})
export class ProcessTemplateModule { }
