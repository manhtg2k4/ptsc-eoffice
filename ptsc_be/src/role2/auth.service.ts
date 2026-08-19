import { Injectable, Inject } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
// import { MongoRepository } from 'src/database/mongoRepo';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity';

@Injectable()
export class AuthService {
  constructor(
    // private readonly mongoRepo: MongoRepository,
    @InjectRepository(RoleFeatureEntity, 'mssqlConnection')
    private readonly roleFeatureRepository: Repository<RoleFeatureEntity>,
  ) { }

  async getRoleFeatures(token: string, requestUserId?: string) {
    // Ưu tiên userId đã được JwtStrategy xác thực và inject vào req.user
    // Fallback: decode token để lấy sub (Keycloak UUID)
    let userId = requestUserId;

    if (!userId) {
      const decoded = jwt.decode(token);
      if (!decoded) {
        throw new Error('Invalid token');
      }
      // Keycloak token dùng 'sub', token nội bộ cũ dùng 'user'
      userId = decoded['sub'] || decoded['user'];
    }

    if (!userId) {
      throw new Error('Invalid token');
    }

    const internalUserId = requestUserId || userId; // DB internal ID từ JwtStrategy


    // Lấy toàn bộ features
    const features = await this.roleFeatureRepository.find();

    // Lấy roles_by_process của user (bao gồm quyền cá nhân và quyền từ group)
    let userRolesByProcess: any[] = [];
    try {
      const userResult = await this.roleFeatureRepository.manager.query(
        `SELECT CAST(roles_by_process AS NVARCHAR(MAX)) AS rolesByProcess FROM users WHERE id = '${internalUserId.replace(/'/g, "''")}'`
      );
      if (userResult && userResult.length > 0 && userResult[0].rolesByProcess) {
        userRolesByProcess = JSON.parse(userResult[0].rolesByProcess);
      }
    } catch (error) {
      console.error('Error fetching user roles_by_process:', error);
    }

    const userRoleMap = new Map<string, Set<string>>();
    for (const p of userRolesByProcess) {
      if (!userRoleMap.has(p.processKey)) {
        userRoleMap.set(p.processKey, new Set<string>());
      }
      if (Array.isArray(p.roles)) {
        for (const r of p.roles) {
          if (r.roleCode) userRoleMap.get(p.processKey)!.add(r.roleCode);
        }
      }
    }

    const resultMap = new Map();

    for (const feature of features) {
      let firstRoleCode: string | null = null;
      const userPermissions: any[] = [];
      const processKey = feature.processKey;
      const allowedRolesForUser = userRoleMap.get(processKey);

      let hasPermissionInProcess = false;

      if (feature.roles) {
        for (const role of feature.roles) {
          const isExplicitlyAssigned = Array.isArray(role.users) && role.users.some(id => String(id) === String(internalUserId));
          const isGroupAssigned = allowedRolesForUser && allowedRolesForUser.has(role.roleCode);

          if (isExplicitlyAssigned || isGroupAssigned) {
            hasPermissionInProcess = true;
            if (!firstRoleCode) firstRoleCode = role.roleCode;
            if (role.permissions) userPermissions.push(...role.permissions);
          }
        }
      }

      if (hasPermissionInProcess) {
        const existing = resultMap.get(feature.processKey) || {
          permissions: [],
          roleCode: firstRoleCode,
        };

        const all = [...new Set([...existing.permissions, ...userPermissions])];

        resultMap.set(feature.processKey, {
          permissions: all,
          roleCode: existing.roleCode || firstRoleCode,
        });
      }
    }

    return Array.from(resultMap, ([key, value]) => ({
      [key]: value.permissions,
      roleCode: value.roleCode,
    }));
  }
}
