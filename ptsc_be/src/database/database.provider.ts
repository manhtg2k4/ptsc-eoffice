// src/database/database.provider.ts

import { ConfigService } from '@nestjs/config';
import { MongoClient } from 'mongodb';
import { customLookup } from './dns-lookup';
import * as sql from 'mssql';
import { MSSQLRepository } from './sqlRepo.mssql';
import { SQLSVRepository } from './sqlsvRepo';
import { Provider } from '@nestjs/common';
import BpmnEngineService from 'src/bpmn/bpmn-engine.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity';
import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';
import { AgencyEntity } from 'src/orgationies/agencies.entity';
import { CrmSourcesService } from 'src/crmsource/crmsource.service';
import { Repository } from 'typeorm';
import { ModuleRef } from '@nestjs/core';

// export const MONGO_CLIENT = 'MONGO_CLIENT';
export const MSSQL_POOL = 'MSSQL_POOL';
export const MONGO_REPO = 'MONGO_REPO';
export const MSSQL_REPO = 'MSSQL_REPO';

export let mssqlPoolInstance: sql.ConnectionPool | null = null;

export async function recreateMssqlPoolProvider(configService: ConfigService): Promise<sql.ConnectionPool> {
    let host = process.env.SQLSERVER_HOST || configService.get<string>('SQLSERVER_HOST') || '';
    let port = Number(configService.get<string>('SQLSERVER_PORT') ?? 1433);
    const user = configService.get<string>('SQLSERVER_USER');
    const password = configService.get<string>('SQLSERVER_PASSWORD');
    const database = configService.get<string>('SQLSERVER_DATABASE');

    if (!host || !user || !password || !database) {
        throw new Error('❌ Missing SQL Server configuration');
    }

    if (host.includes(':')) {
        const parts = host.split(':');
        host = parts[0];
        port = Number(parts[1]) || port;
        console.log(`ℹ️ [database.provider] Auto-extracted Host: ${host} and Port: ${port}`);
    }

    const pool = new sql.ConnectionPool({
        server: host,
        port,
        user,
        password,
        database,
        connectionTimeout: 30000,
        options: {
            encrypt: process.env.SQLSERVER_ENCRYPT === 'true',
            trustServerCertificate: (process.env.SQLSERVER_TRUST_SERVER_CERTIFICATE || '').trim().toLowerCase() !== 'false',
            enableArithAbort: process.env.SQLSERVER_ENABLE_ARITH_ABORT === 'true',
            multiSubnetFailover: process.env.SQLSERVER_MULTI_SUBNET_FAILOVER === 'true',
            cryptoCredentialsDetails: {
                minVersion: 'TLSv1',
            },
            connectionTimeout: 30000,
            appName: 'DiOffice_Backend_App_database_provider',
            lookup: customLookup,
        } as any,
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 3000,
        },
    });

    pool.on('error', err => {
        console.error('❌ MSSQL Pool error:', err);
    });

    // 1️⃣ Bắt tay kết nối Pool mới TRƯỚC (Không làm ảnh hưởng mssqlPoolInstance cũ)
    await pool.connect();

    // 2️⃣ Swap instance và đóng Pool cũ sau khi kết nối mới đã hoàn thành (Hot Swap)
    const oldPool = mssqlPoolInstance;
    mssqlPoolInstance = pool;
    console.log('[database.provider] MSSQL_POOL successfully hot-swapped');

    if (oldPool) {
        try {
            console.log('[database.provider] Closing old MSSQL_POOL in background...');
            // Đóng ở background để tránh chặn tiến trình khôi phục
            oldPool.close().catch(e => {
                console.error('[database.provider] Error closing old MSSQL_POOL:', e.message);
            });
        } catch (e: any) {
            console.error('[database.provider] Error starting close for old MSSQL_POOL:', e.message);
        }
    }

    return mssqlPoolInstance;
}

export const databaseProviders: Provider[] = [
    // 1. MongoDB Client
    // {
    //     provide: MONGO_CLIENT,
    //     useFactory: async (config: ConfigService): Promise<MongoClient> => {

    //         const uri = config.get<string>('MONGO_URI');
    //         if (!uri) {
    //             throw new Error('MONGO_HOST is not configured.');
    //         }
    //         const client = new MongoClient(uri);
    //         await client.connect();
    //         console.log('MongoDB connected via provider.');
    //         return client;
    //     },
    //     inject: [ConfigService],
    // },

    // 2. MSSQL Pool wrapped in a Proxy
    {
        provide: MSSQL_POOL,
        useFactory: async (configService: ConfigService): Promise<sql.ConnectionPool> => {
            await recreateMssqlPoolProvider(configService);

            return new Proxy({} as sql.ConnectionPool, {
                get(target, prop) {
                    if (!mssqlPoolInstance) {
                        throw new Error('MSSQL_POOL is not initialized');
                    }
                    const val = Reflect.get(mssqlPoolInstance, prop);
                    if (typeof val === 'function') {
                        return val.bind(mssqlPoolInstance);
                    }
                    return val;
                },
                set(target, prop, value) {
                    if (!mssqlPoolInstance) {
                        throw new Error('MSSQL_POOL is not initialized');
                    }
                    return Reflect.set(mssqlPoolInstance, prop, value);
                }
            });
        },
        inject: [ConfigService],
    },
    // 3. MongoRepository (cần client)
    // {
    //     provide: MONGO_REPO,
    //     useFactory: (client: MongoClient): SQLSVRepository => {
    //         return new SQLSVRepository(client);
    //     },
    //     inject: [MONGO_CLIENT],
    // },

    // 4. MSSQLRepository (cần configService và các repositories)
    {
        provide: MSSQL_REPO,
        useFactory: async (
            configService: ConfigService,
            moduleRef: ModuleRef,
            userRepository: Repository<UserEntity>,
            organizationUnitRepository: Repository<OrganizationUnitEntity>,
            roleFeatureRepository: Repository<RoleFeatureEntity>,
            featureManagementRepository: Repository<FeatureManagementEntity>,
            agencyRepository: Repository<AgencyEntity>,
        ): Promise<MSSQLRepository | null> => {
            // Lazy inject BpmnEngineService và SQLSVRepository để tránh circular dependency
            const bpmnEngine = moduleRef.get(BpmnEngineService, { strict: false });
            const mongoRepo = moduleRef.get(SQLSVRepository, { strict: false });

            return new MSSQLRepository(
                configService,
                bpmnEngine,
                mongoRepo,
                userRepository,
                organizationUnitRepository,
                roleFeatureRepository,
                featureManagementRepository,
                agencyRepository,
                moduleRef,
            );
        },
        inject: [ConfigService, ModuleRef, getRepositoryToken(UserEntity, 'mssqlConnection'), getRepositoryToken(OrganizationUnitEntity, 'mssqlConnection'), getRepositoryToken(RoleFeatureEntity, 'mssqlConnection'), getRepositoryToken(FeatureManagementEntity, 'mssqlConnection'), getRepositoryToken(AgencyEntity, 'mssqlConnection')],
    },
];