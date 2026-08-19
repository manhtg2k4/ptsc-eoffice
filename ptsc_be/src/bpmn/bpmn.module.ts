import { forwardRef, Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { BpmnEngineService } from './bpmn-engine.service';
import { BPMN_RUNTIME } from './bpmn.providers';
import { BPMN_ENGINE_SERVICE } from 'src/variable/CONST_STATUS';
import { RuntimeDbService } from './runtime-dbmssql.service';
import { ConcurrentStageOrchestrator } from './concurrent-stage.orchestrator';
import { ServiceTaskModule } from 'src/service-task/service-task.module';
import { IntergrationSignatureModule } from 'src/Intergration-signature/intergration-signature.module';
import { UsersModule } from 'src/users/users.module';
import { GroupUsersModule } from 'src/group-users/group-users.module';
import { NotificationModule } from 'src/notifycation/notification.module';
import { CrmsourceModule } from 'src/crmsource/crmsource.module';

import { RedisModule } from 'src/redis/redis.module';

@Module({
    // imports: [DatabaseModule, forwardRef(() => NotificationModule)],
    imports: [DatabaseModule, forwardRef(() => ServiceTaskModule),
        forwardRef(() => IntergrationSignatureModule),
        forwardRef(() => UsersModule),
        forwardRef(() => GroupUsersModule),
        forwardRef(() => NotificationModule),
        forwardRef(() => CrmsourceModule),
        ServiceTaskModule,
        RedisModule,
        NotificationModule
    ],
    providers: [
        BpmnEngineService,
        {
            provide: BPMN_ENGINE_SERVICE,
            useExisting: BpmnEngineService,
        },
        ConcurrentStageOrchestrator,
        BPMN_RUNTIME,
        RuntimeDbService, // ← thêm provider
    ],
    exports: [BpmnEngineService, BPMN_RUNTIME, BPMN_ENGINE_SERVICE, RuntimeDbService, ConcurrentStageOrchestrator], // ← export để module khác dùng
})
export class BpmnModule { }
