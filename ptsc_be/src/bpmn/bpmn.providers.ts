import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RuntimeDbService } from './runtime-dbmssql.service';
import { MSSQL_REPO } from '../database/database.provider';
import { SQLSVRepository } from '../database/sqlsvRepo';
import { BpmnEngineService } from './bpmn-engine.service';
import { ServiceTaskExecutorService } from 'src/service-task/service-task-executor.service';
import { IntegrationSignatureService } from 'src/Intergration-signature/intergration-signature.service';
import { UsersService } from 'src/users/users.service';
import { GroupUserService } from 'src/group-users/group-users.service';
import { GroupUserInDocumentService } from 'src/group-users/group-users-in-document.service';
import { NotificationService } from 'src/notifycation/notification.service';
import { CrmSourcesService } from 'src/crmsource/crmsource.service';
import { ConcurrentStageOrchestrator } from './concurrent-stage.orchestrator';

export const BPMN_RUNTIME: Provider = {
  provide: 'BPMN_RUNTIME',
  useFactory: (
    configService: ConfigService,
    mysqlRepo: any,
    sqlsvRepo: SQLSVRepository,
    bpmnEngine: BpmnEngineService,
    serviceTaskExecutor: ServiceTaskExecutorService,
    integrationSignatureService: IntegrationSignatureService,
    usersService: UsersService,
    groupUserService: GroupUserService,
    groupUserInDocumentService: GroupUserInDocumentService,
    notificationService: NotificationService,
    crmSourcesService: CrmSourcesService,
    concurrentStageOrchestrator: ConcurrentStageOrchestrator,
  ) => {
    const persistence = configService.get<string>('PERSISTENCE') || 'mongo';
    // let repo = sqlsvRepo;

    // if (persistence === 'mysql') {
    //   if (!mysqlRepo) throw new Error('MySQL repo không có sẵn');
    //   repo = mysqlRepo;
    //   console.log('Using MySQL persistence for BPMN runtime.');
    // } else {
    //   if (!sqlsvRepo) throw new Error('Mongo repo không có sẵn');
    //   repo = sqlsvRepo;
    //   console.log('Using MongoDB persistence for BPMN runtime.');
    // }

    return new RuntimeDbService(
      bpmnEngine,
      mysqlRepo,
      sqlsvRepo,
      serviceTaskExecutor,
      integrationSignatureService,
      usersService,
      groupUserService,
      groupUserInDocumentService,
      notificationService,
      crmSourcesService,
      concurrentStageOrchestrator,
    );
  },
  inject: [
    ConfigService,
    MSSQL_REPO,
    SQLSVRepository,
    BpmnEngineService,
    ServiceTaskExecutorService,
    IntegrationSignatureService,
    UsersService,
    GroupUserService,
    GroupUserInDocumentService,
    NotificationService,
    CrmSourcesService,
    ConcurrentStageOrchestrator,
  ],
};
  
