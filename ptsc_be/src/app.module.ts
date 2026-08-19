import { MiddlewareConsumer, Module, NestModule, OnModuleInit } from '@nestjs/common';
import { DiscoveryModule, APP_INTERCEPTOR } from '@nestjs/core';
import { RequestContextInterceptor } from './common/interceptors/request-context.interceptor';
import { CacheModule } from '@nestjs/cache-manager';
import { TypeOrmModule, InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GroupUsersModule } from './group-users/group-users.module';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import * as https from 'https';
import { CommonSourceModule } from './common-source/common-source.module';
import * as dns from 'dns';
import * as net from 'net';
import { promisify } from 'util';
import { customLookup } from './database/dns-lookup';
import { recreateMssqlPoolProvider } from './database/database.provider';
import { resetMssqlPool } from './database/mssql.pool';
import * as sql from 'mssql';
const lookupAsync = promisify(dns.lookup);

const checkPort = (host: string, port: number): Promise<boolean> => {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const timeout = 1000;
        socket.setTimeout(timeout);
        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });
        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });
        socket.on('error', () => {
            socket.destroy();
            resolve(false);
        });
        socket.connect(port, host);
    });
};

const checkDbLogicalState = async (ipAddress: string, tcpPort: number, configService: ConfigService): Promise<boolean> => {
    const hasPort = await checkPort(ipAddress, tcpPort);
    if (!hasPort) return false;

    const user = process.env.SQLSERVER_USER || configService.get<string>('SQLSERVER_USER');
    const password = process.env.SQLSERVER_PASSWORD || configService.get<string>('SQLSERVER_PASSWORD');
    const database = process.env.SQLSERVER_DATABASE || configService.get<string>('SQLSERVER_DATABASE');

    if (!user || !password || !database) {
        return true;
    }

    const encrypt = process.env.SQLSERVER_ENCRYPT === 'true';
    const trustServerCertificate = (process.env.SQLSERVER_TRUST_SERVER_CERTIFICATE || '').trim().toLowerCase() !== 'false';


    // console.log(`[checkDbLogicalState] trustServerCertificate = ${trustServerCertificate} cho IP ${ipAddress}`);

    const tempPool = new sql.ConnectionPool({
        server: ipAddress,
        port: tcpPort,
        user,
        password,
        database,
        connectionTimeout: 2000,
        requestTimeout: 2000,
        options: {
            encrypt,
            trustServerCertificate,
            enableArithAbort: true,
            multiSubnetFailover: true,
            cryptoCredentialsDetails: {
                minVersion: 'TLSv1',
            },
        } as any,
    });

    try {
        await tempPool.connect();
        const result = await tempPool.query(`SELECT DATABASEPROPERTYEX('${database}', 'Updateability') AS updateability`);
        const updateability = result.recordset?.[0]?.updateability;
        return updateability === 'READ_WRITE';
    } catch (err: any) {
        console.warn(`[FailoverMonitor] Lỗi kết nối logic tới IP '${ipAddress}': ${err.message}`);
        return false;
    } finally {
        try { await tempPool.close(); } catch (e) { }
    }
};
const startFailoverMonitor = (
    host: string,
    port: number,
    dataSource: DataSource,
    configService: ConfigService
) => {
    if (net.isIP(host) !== 0) {
        console.log(`[FailoverMonitor] Host là IP (${host}), bỏ qua monitor.`);
        return;
    }

    console.log(`[FailoverMonitor] Khởi động giám sát failover cho DNS: ${host}`);

    setInterval(async () => {
        try {
            // 1. Phân giải DNS
            const res = await lookupAsync(host, { all: true }).catch(() => [] as any[]);
            const ips: string[] = res.map((addr: any) => addr.address);

            if (ips.length === 0) {
                console.warn(`[FailoverMonitor] Không resolve được IP nào cho ${host}`);
                return;
            }

            const currentActiveIp = process.env.SQLSERVER_ACTIVE_IP || ips[0];

            // 2. Kiểm tra IP hiện tại có khỏe không
            const currentHealthy = await checkDbLogicalState(currentActiveIp, port, configService);

            if (currentHealthy) {
                // IP hiện tại vẫn tốt → không làm gì
                return;
            }

            console.warn(`[FailoverMonitor] IP hiện tại (${currentActiveIp}) không khỏe. Bắt đầu failover...`);

            let newActiveIp: string | null = null;

            // 3. Tìm IP mới (ưu tiên PRIMARY)
            for (const ip of ips) {
                if (ip === currentActiveIp) continue;

                const portOk = await checkPort(ip, port);
                if (!portOk) continue;

                const isPrimary = await checkDbLogicalState(ip, port, configService);
                if (isPrimary) {
                    newActiveIp = ip;
                    break;
                }
            }

            // 4. Nếu không có PRIMARY, lấy IP có port mở làm fallback
            if (!newActiveIp) {
                for (const ip of ips) {
                    if (ip === currentActiveIp) continue;
                    if (await checkPort(ip, port)) {
                        newActiveIp = ip;
                        console.warn(`[FailoverMonitor] Sử dụng fallback IP (port mở): ${newActiveIp}`);
                        break;
                    }
                }
            }

            // 5. Nếu tìm thấy IP mới → thực hiện chuyển đổi
            if (newActiveIp && newActiveIp !== currentActiveIp) {
                console.log(`[FailoverMonitor] 🚀 FAILOVER SUCCESS: ${currentActiveIp} → ${newActiveIp}`);

                process.env.SQLSERVER_ACTIVE_IP = newActiveIp;

                // === CHỈ recreate Pool, KHÔNG destroy DataSource trừ khi thật sự cần ===
                await Promise.allSettled([
                    recreateMssqlPoolProvider(configService),
                    resetMssqlPool(configService),
                ]);

                // Chỉ destroy DataSource khi nó thực sự hỏng
                if (dataSource && (!dataSource.isInitialized || !(await isDataSourceHealthy(dataSource)))) {
                    console.log(`[FailoverMonitor] Reinitializing TypeORM DataSource...`);
                    try {
                        await dataSource.destroy();
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Chờ 1s
                        await dataSource.initialize();
                    } catch (err: any) {
                        console.error(`[FailoverMonitor] Lỗi reinitialize DataSource: ${err.message}`);
                    }
                }
            }
        } catch (error: any) {
            console.error(`[FailoverMonitor] Lỗi trong vòng lặp monitor: ${error.message}`);
        }
    }, 4000); // 4 giây một lần là hợp lý
};

// Hàm hỗ trợ kiểm tra DataSource
async function isDataSourceHealthy(dataSource: DataSource): Promise<boolean> {
    try {
        if (!dataSource.isInitialized) return false;
        await dataSource.query('SELECT 1 AS healthy');
        return true;
    } catch {
        return false;
    }
}

import { FeatureManagementModule } from './feature-management/feature-management.module';
import { RoleModule } from './role/role.module';
import { RoleGroupModule } from './role-group/role-group.module';
import { BpmnDesignsModule } from './bpmn-designs/bpmn-designs.module';
import { ConfigurationModule } from './view-config/configuration.module';
import { MenuManagerModule } from './menu-manager/menu-manager.module';
import { TaskFeatureModule } from './task-feature/task.feature.module';
import { AuthModule } from './auth-sso/auth-sso.module';
import { DynamicFormModule } from './dynamic-form/dynamic-form.module';
import { RoleFeatureModule } from './role-feature/role-feature.module';
import { ListRoleModule } from './list-role/list-role.module';
import { CamundaWorkerModule } from './camunda-worker/camunda-worker.module';
import { AuthBasicModule } from './auth/auth.module';
import { AuthConfigModule } from './auth-config/auth-config.module';
import { ThemeConfigModule } from './theme-config/theme-config.module';
import { AuthKeycloakModule } from './auth-keycloak/auth-keycloak.module';
import { Wso2UserSyncModule } from './wso2-user-sync/wso2-user-sync.module';
import { UserSyncModule } from './user-sync/user-sync.module';
import { HrmSyncModule } from './user-sync/hrm-sync.module';
import { HrmModule } from './hrm/hrm.module';
import { DatabaseModule } from './database/database.module';

import { BpmnModule } from './bpmn/bpmn.module';
import { CommentsModule } from './comments/comments.module';
import { WorkItemsModule } from './work-items/work-items.module';
import { BookDocumentsModule } from './book-documents/book-documents.module';
import { DocumentsModule } from './documents/documents.module';
import { DemoModule } from './demo/demo.module';
import { Role2Module } from './role2/auth.module';
import { ApiExplorerModule } from './api-explorer.module';
import { HealthCheckModule } from './health-check/health-check.module';
import { FilesManagementModule } from './files-managerment/files-management.module';
import { ProxyModule } from './proxy/proxy.module';
import { CrmsourceModule } from './crmsource/crmsource.module';
import { OutgoingDocumentsModule } from './outgoing-documents/outgoing-documents.module';
import { NetworkAdministrationModule } from './networkAdministration/network-administration.module';
import { IpBlockMiddleware } from './ip-block.middleware';
import { AuthorityModule } from './authority-process/authority-process.module';
import { NotificationModule } from './notifycation/notification.module';
import { NotificationConfigModule } from './notifycation/notification-config/notification-config.module';
import { IncomingModule } from './documents/incomming-document/incoming.module';
import { OrganizationUnitSqlModule } from './organization-unit/organization-unit_sql/organization-unit-sql.module';
import { OrganizationUnitEntity } from './organization-unit/organization-unit_sql/organization-unit.entity';
import { FeatureManagementSqlModule } from './feature-management/feature-management-sql/feature-management-sql.module';
import { RoleFeatureSqlModule } from './role-feature/role-feature-sql/role-feature-sql.module';
import { SettingClearLogModule } from './settingClearLog/setting-clear-log.module';
import { SystemLogSqlModule } from './systemLogManagement/system-log.module';
import { SystemLogEntity } from './systemLogManagement/system-log.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { UsersModule } from './users/users.module';
import { ChatModule } from './chat/chat.module';
import { MessagesModule } from './messages/messages.module';
import { ConversationsModule } from './conversations/conversations.module';
import { DynamicForm } from './dynamic-form/dynamic-form.entity';
import { TaskModule } from './task/task.module';
import { ProfileStorageModule } from './profile-storage/profile-storage.module';
import { ArchivesManagementModule } from './archives-management/archives-management.module';
import { DestroyRecordsModule } from './destroy-record/destroy-records.module';
import { OauthModule } from './oauth/oauth.module';
import { AgenciesModule } from './orgationies/agencies.module';
import { RecordExploitationModule } from './record-exploitation/record-exploitation.module';
import { StorageConfigModule } from './storage-config/storage-config.module';
import { MeetingModule } from './meeting/meeting.module';
import { MeetingRoomModule } from './meeting-rooms/meeting-rooms.module';
import { MeetingScheduleModule } from './meeting-schedule/meeting-schedule.module';
import { BlocksModule } from './block/block.module';
import { IntergrationSignatureModule } from './Intergration-signature/intergration-signature.module';
import { DocumentFollowModule } from './notifycation/document-unfollows/document-unfollow.module';
import { BannerModule } from './banner/banner.module';
import { WopiModule } from './wopi/wopi.module';
import { AmenitiesModule } from './meeting-room-amenities/amenities.module';
import { AlbumImagesModule } from './album-images/album-images.module';
import { VideosModule } from './videos/videos.module';
import { LeadershipDutyScheduleModule } from './leadership-duty-schedule/leadership-duty-schedule.module';
import { TravelWorkScheduleModule } from './travel-work-schedules/travel-work-schedules.module';
import { DataExportModule } from './data-export';
import { NewsCalendarModule } from './news-calendar/news-calendar.module';
import { NewsStatisticsModule } from './news-statistics/news-statistics.module';
import { MailModule } from './mail/mail.module';
import { MediaGaleryModule } from './media-galery/media-galery.module';
import { PortalSearchModule } from './portal-search/portal-search.module';
import { RecordCatalogModule } from './record-catalog/record-catalog.module';
import { ProcessTemplateModule } from './process-template/process-template.module';
import { ArchiveRecordModule } from './archive-records/archive-record.module';
import { VehicleRegistrationModule } from './vehicle-registration/vehicle-registration.module';
import { FeedbackSuggestionsModule } from './feedback-suggestions/feedback-suggestions.module';
import { PassportsModule } from './passports/passports.module';
import { PassportRequestsModule } from './passport-requests/passport-requests.module';
import { PassportVouchersModule } from './passport-vouchers/passport-vouchers.module';
import { PassportReturnRequestsModule } from './passport-return-requests/passport-return-requests.module';
import { ProjectStatisticsModule } from './project-statistics/project-statistics.module';
import { PassportStatisticsModule } from './passport-statistics/passport-statistics.module';
import { GlobalCountModule } from './global-count/global-count.module';

import { DocumentLibraryModule } from './document-library/document-library.module';
import { RedisModule } from './redis/redis.module';
import { VehicleCronModule } from './vehicle-registration/cron/vehicle-registration.module';
import { TaskDocumentLinkModule } from './task-document-link/task-document-link.module';
import { SignOtpModule } from './sign-otp/sign-otp.module';
import { DashboardConfigModule } from './dashboard-config/dashboard-config.module';
import { BullModule } from '@nestjs/bull';
import { CustomSenderUnitModule } from './custom-sender-unit/custom-sender-unit.module';
import { CustomSenderUnitEntity } from './custom-sender-unit/custom-sender-unit.entity';
import { MobileConfigModule } from './mobile-config/mobile-config.module';

@Module({
    imports: [
        GlobalCountModule,
        MailModule,
        TaskModule, // ✅ Commented - module deleted
        BpmnDesignsModule,
        BannerModule,
        AlbumImagesModule,
        VideosModule,
        ConfigurationModule,
        MobileConfigModule,
        NotificationModule,
        NotificationConfigModule,
        MeetingModule,
        BlocksModule,
        ScheduleModule.forRoot(),
        AgenciesModule,
        SettingClearLogModule,
        NetworkAdministrationModule,
        StorageConfigModule,
        DatabaseModule,
        ConversationsModule,
        ProfileStorageModule,
        MessagesModule,
        ChatModule,
        BpmnModule,
        CommentsModule,
        WorkItemsModule,
        UsersModule,
        Role2Module,
        BookDocumentsModule,
        DocumentsModule,
        FeatureManagementModule,
        IncomingModule,
        RoleFeatureSqlModule,
        FeatureManagementSqlModule,
        DemoModule,
        IntergrationSignatureModule,
        ArchiveRecordModule,
        HttpModule.register({
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        }),
        VehicleCronModule,
        DiscoveryModule,
        ConfigModule.forRoot({
            isGlobal: true,
        }),

        TypeOrmModule.forRootAsync({
            name: 'mssqlConnection',
            useFactory: async (configService: ConfigService) => {
                let host = process.env.SQLSERVER_HOST || configService.get<string>('SQLSERVER_HOST') || '';
                let port = Number(process.env.SQLSERVER_PORT || 1433);

                if (host.includes(':')) {
                    const parts = host.split(':');
                    host = parts[0];
                    port = Number(parts[1]) || port;
                }

                const resolvedHost = process.env.SQLSERVER_ACTIVE_IP || host;

                console.log(`[TypeORM] Khởi tạo với Host: ${host} | Resolved Host: ${resolvedHost}`);
                console.log(`[TypeORM DEBUG] SQLSERVER_TRUST_SERVER_CERTIFICATE:`, JSON.stringify(process.env.SQLSERVER_TRUST_SERVER_CERTIFICATE));
                console.log(`[TypeORM DEBUG] configService.get('SQLSERVER_TRUST_SERVER_CERTIFICATE'):`, JSON.stringify(configService.get('SQLSERVER_TRUST_SERVER_CERTIFICATE')));
                console.log(`[TypeORM DEBUG] trustServerCertificate value:`, (process.env.SQLSERVER_TRUST_SERVER_CERTIFICATE || '').trim().toLowerCase() !== 'false');

                return {
                    type: 'mssql',
                    host: host,                    // Giữ nguyên DNS (không đổi sang IP)
                    port: port,
                    username: configService.get<string>('SQLSERVER_USER'),
                    password: configService.get<string>('SQLSERVER_PASSWORD'),
                    database: configService.get<string>('SQLSERVER_DATABASE'),

                    synchronize: false,
                    autoLoadEntities: true,

                    entities: [
                        OrganizationUnitEntity,
                        SystemLogEntity,
                        DynamicForm,
                        CustomSenderUnitEntity,
                    ],

                    options: {
                        encrypt: process.env.SQLSERVER_ENCRYPT === 'true',
                        trustServerCertificate: (process.env.SQLSERVER_TRUST_SERVER_CERTIFICATE || '').trim().toLowerCase() !== 'false',
                        enableArithAbort: true,
                        appName: 'DiOffice_Backend_App_app_module',
                        useUTC: false,

                        multiSubnetFailover: process.env.SQLSERVER_MULTI_SUBNET_FAILOVER === 'true',
                        keepAlive: true,
                        connectTimeout: 15000,
                        requestTimeout: 30000,

                        lookup: customLookup,
                    } as any,

                    extra: {
                        pool: {
                            max: 15,
                            min: 2,
                            idleTimeoutMillis: 30000,
                            acquireTimeoutMillis: 25000,
                        },
                    },
                };
            },
            inject: [ConfigService],
        }),
        FeedbackSuggestionsModule,
        AuthBasicModule,
        NewsCalendarModule,
        NewsStatisticsModule,
        DestroyRecordsModule,
        OutgoingDocumentsModule,
        AuthorityModule,
        FilesManagementModule,
        ProxyModule,
        AuthModule,
        OauthModule,
        GroupUsersModule,
        SystemLogSqlModule,
        OrganizationUnitSqlModule,
        MenuManagerModule,
        CommonSourceModule,
        RoleModule,
        RoleGroupModule,
        TaskFeatureModule,
        DynamicFormModule,
        RoleFeatureModule,
        ListRoleModule,
        UserSyncModule,
        HrmSyncModule,
        HrmModule,
        CamundaWorkerModule,

        ThemeConfigModule,
        AuthConfigModule,
        AuthKeycloakModule,
        Wso2UserSyncModule,
        CrmsourceModule,
        ApiExplorerModule,
        HealthCheckModule,
        RecordExploitationModule,
        ArchivesManagementModule,
        MeetingRoomModule,
        MeetingScheduleModule,
        DocumentFollowModule,
        WopiModule,
        AmenitiesModule,
        LeadershipDutyScheduleModule,
        TravelWorkScheduleModule,
        DataExportModule,
        MediaGaleryModule,
        PortalSearchModule,
        RecordCatalogModule,
        VehicleRegistrationModule,
        ProcessTemplateModule,
        DocumentLibraryModule,
        PassportsModule,
        PassportRequestsModule,
        PassportVouchersModule,
        PassportReturnRequestsModule,
        ProjectStatisticsModule,
        PassportStatisticsModule,
        TaskDocumentLinkModule,
        DashboardConfigModule,
        RedisModule,
        BullModule.forRoot({
            redis: {
                host: process.env.REDIS_HOST || 'localhost',
                port: Number(process.env.REDIS_PORT || 6379),
                password: process.env.REDIS_PASSWORD || undefined,
            },
        }),
        SignOtpModule,
        CustomSenderUnitModule,
        CacheModule.register({
            // store: redisStore as any,
            // host: 'localhost',
            // port: 6379,
            ttl: 60, // cache 60s
            isGlobal: true,
        }),
    ],
    providers: [
        {
            provide: APP_INTERCEPTOR,
            useClass: RequestContextInterceptor,
        },
    ],
})
export class AppModule implements NestModule, OnModuleInit {
    constructor(
        @InjectDataSource('mssqlConnection') private readonly dataSource: DataSource,
        private readonly configService: ConfigService,
    ) { }

    configure(consumer: MiddlewareConsumer) {
        /*
        consumer
          .apply(IpBlockMiddleware)
          .forRoutes('*');
        */
    }

    async onModuleInit() {
        let host = process.env.SQLSERVER_HOST || this.configService.get<string>('SQLSERVER_HOST') || '';
        let port = Number(this.configService.get<string>('SQLSERVER_PORT') || 1433);
        if (host.includes(':')) {
            const parts = host.split(':');
            host = parts[0];
            port = Number(parts[1]) || port;
        }
        startFailoverMonitor(host, port, this.dataSource, this.configService);
    }
}

export async function waitForDb(dataSource, retry = 10) {
    while (retry > 0) {
        try {
            if (!dataSource.isInitialized) {
                await dataSource.initialize();
            }
            await dataSource.query('SELECT 1');
            return;
        } catch (e) {
            retry--;
            await new Promise(r => setTimeout(r, 3000));
        }
    }
    throw new Error('DB init failed');
}

export async function safeQuery(dataSource, query, params) {
    try {
        return await dataSource.query(query, params);
    } catch (err) {

        await dataSource.destroy();
        await dataSource.initialize();

        return await dataSource.query(query, params);
    }
}
