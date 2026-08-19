// Sửa phần lấy code và token với keycloak
import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import axios from 'axios';
import * as https from 'https';
import { sign, decode, SignOptions } from 'jsonwebtoken';
import { UserEntity } from 'src/users/entities/user.entity';
import { TokenResponseDto } from './dto/token.response.dto';
import { STATUS } from 'src/variables/CONST_STATUS';
import { GroupUserEntity } from 'src/group-users/entities/group-users.entity';
import { AuthConfigEntity } from 'src/auth-config/entities/auth-config.entity';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { NotificationConfigService } from 'src/notifycation/notification-config/notification-config.service';
@Injectable()
export class AuthKeycloakService {
  private readonly logger = new Logger(AuthKeycloakService.name);
  private userInfoUrl = '/realms/master/protocol/openid-connect/userinfo';
  private expiresIn: string = process.env.EXPIRES_IN_TOKEN || '7h';

  constructor(
    private readonly jwtService: JwtService,
    private readonly httpService: HttpService,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(GroupUserEntity, 'mssqlConnection')
    private readonly groupUserRepository: Repository<GroupUserEntity>,
    @InjectRepository(AuthConfigEntity, 'mssqlConnection')
    private readonly authConfigRepository: Repository<AuthConfigEntity>,
    private readonly notificationConfigService: NotificationConfigService,
  ) {}

  /**
   * Lấy cấu hình Keycloak hiệu dụng (Ưu tiên biến môi trường, sau đó đến DB)
   */
  async getEffectiveConfig(dbConfig?: any) {
    const useEnvOnly = process.env.KEYCLOAK_USE_ENV_ONLY === 'true';

    // Nếu không truyền dbConfig, thử tìm bản ghi đang active
    if (!dbConfig && !useEnvOnly) {
      const authConfig = await this.authConfigRepository.findOne({
        where: { authType: 'keycloak', isActive: true, status: 1 },
      });
      dbConfig = authConfig?.config || {};
    }

    if (useEnvOnly) {
      return {
        issuer: process.env.KEYCLOAK_ISSUER,
        baseUrl: process.env.KEYCLOAK_BASE_URL,
        clientId: process.env.KEYCLOAK_CLIENT_ID,
        clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
        redirectUri: process.env.KEYCLOAK_REDIRECT_URI,
        scope: process.env.KEYCLOAK_SCOPE || 'openid',
        domainFe: process.env.KEYCLOAK_DOMAIN_FE || process.env.REDIRECT_URI_FE,
      };
    }

    return {
      issuer: process.env.KEYCLOAK_ISSUER || dbConfig?.issuer,
      baseUrl: process.env.KEYCLOAK_BASE_URL || dbConfig?.baseUrl,
      clientId: process.env.KEYCLOAK_CLIENT_ID || dbConfig?.clientId,
      clientSecret:
        process.env.KEYCLOAK_CLIENT_SECRET || dbConfig?.clientSecret,
      redirectUri: process.env.KEYCLOAK_REDIRECT_URI || dbConfig?.redirectUri,
      scope: process.env.KEYCLOAK_SCOPE || dbConfig?.scope || 'openid',
      domainFe:
        process.env.KEYCLOAK_DOMAIN_FE ||
        dbConfig?.domainFe ||
        process.env.REDIRECT_URI_FE,
    };
  }

  /**
   * B1. Nhận "code" từ Keycloak → gọi /token → lấy access_token
   */
  async getToken(
    code: string,
    redirectUriOverride?: string,
  ): Promise<TokenResponseDto> {
    try {
      const config = await this.getEffectiveConfig();
      if (!config.issuer || !config.baseUrl || !config.clientId) {
        throw new HttpException(
          'Chưa cấu hình Keycloak (Issuer/BaseURL/ClientID) trong cả ENV và DB.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      const { clientId, clientSecret, redirectUri, issuer } = config;
      const finalRedirectUri = redirectUriOverride || redirectUri;
      const tokenUrl = `${issuer}/protocol/openid-connect/token`;

      // STEP 1: Đổi code lấy access token
      const params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('client_id', clientId);

      if (clientSecret) {
        params.append('client_secret', clientSecret);
      }

      params.append('code', code);
      params.append('redirect_uri', finalRedirectUri);

      const agent = new https.Agent({ rejectUnauthorized: false });

      const res = await axios.post(tokenUrl, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        httpsAgent: agent,
      });

      const accessToken = res.data.access_token;

      if (!accessToken) {
        throw new HttpException('Không lấy được access token', 401);
      }

      // ✅ Tiếp tục lấy thông tin user và đồng bộ DB
      const data = await this.callbackLifeSSO(res.data, issuer, clientSecret);

      return { ...res.data, ...data };
    } catch (err) {
      if (err.response) {
        this.logger.error(
          `❌ getToken failed: Status=${err.response.status} - ${JSON.stringify(err.response.data)}`,
        );
        this.logger.error(
          `[KC_TOKEN_REQUEST] ${this.redactTokenRequestData(err.config?.data)}`,
        );
      } else if (err.code) {
        this.logger.error(
          `❌ getToken failed (Network/SSL): code=${err.code} - ${err.message}`,
        );
      } else {
        this.logger.error(`❌ getToken failed: ${err.message}`);
      }
      throw new HttpException(
        `Không lấy được token từ Keycloak: ${err.response?.data?.error_description || err.message}`,
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  /**
   * B1.2 Làm mới access_token bằng refresh_token
   */
  async refreshAccessToken(refreshToken: string): Promise<any> {
    try {
      const config = await this.getEffectiveConfig();
      const { clientId, clientSecret, issuer } = config;
      const tokenUrl = `${issuer}/protocol/openid-connect/token`;

      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('client_id', clientId);
      if (clientSecret) {
        params.append('client_secret', clientSecret);
      }
      params.append('refresh_token', refreshToken);
      // params.append('scope', config.scope || 'openid profile email');

      const agent = new https.Agent({ rejectUnauthorized: false });
      const res = await axios.post(tokenUrl, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        httpsAgent: agent,
      });

      return res.data;
    } catch (err) {
      if (err.response) {
        this.logger.error(
          `❌ refreshAccessToken failed: Status=${err.response.status} - ${JSON.stringify(err.response.data)}`,
        );
        this.logger.error(
          `[KC_REFRESH_REQUEST] ${this.redactTokenRequestData(err.config?.data)}`,
        );
      } else if (err.code) {
        this.logger.error(
          `❌ refreshAccessToken failed (Network/SSL): code=${err.code} - ${err.message}`,
        );
      } else {
        this.logger.error(`❌ refreshAccessToken failed: ${err.message}`);
      }
      throw new HttpException(
        `Không thể làm mới token từ Keycloak: ${err.response?.data?.error_description || err.message}`,
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  /**
   * B2. Lấy thông tin user từ access_token hoặc id_token
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async callbackLifeSSOv1(resData: any, issuer: string, realm: string) {
    try {
      const accessToken = resData.access_token;
      const idToken = resData.id_token;
      if (!accessToken) {
        throw new HttpException('No token', HttpStatus.UNAUTHORIZED);
      }

      // ✅ Giải mã token (chỉ decode, không verify)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const decoded: any = decode(idToken || accessToken);
      if (!decoded) {
        throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
      }

      // ✅ In log ra nếu cần debug

      // ✅ Lấy thông tin user từ Keycloak userinfo
      const agent = new https.Agent({ rejectUnauthorized: false });
      const userInfoUrl = decodeURIComponent(this.userInfoUrl);

      const userInfoRes = await axios.get(userInfoUrl, {
        httpsAgent: agent,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const userInfo = userInfoRes.data;

      // 🟢 Trích xuất thông tin cơ bản
      const email = userInfo.email || decoded.email;
      const username =
        userInfo.preferred_username || decoded.preferred_username;
      const fullName =
        userInfo.name ||
        `${decoded.given_name || ''} ${decoded.family_name || ''}`;

      // 🟢 Kiểm tra user trong MongoDB
      let userRecord = await this.userRepository.findOne({
        where: { emailUser: email },
      });
      if (!userRecord) {
        userRecord = this.userRepository.create({
          emailUser: email,
          username: username,
          name: fullName,
          createdAt: new Date(),
        });
        await this.userRepository.save(userRecord);
      }

      const tokenPayload = {
        user: userRecord.id,
        username: userRecord.username,
        email: userRecord.emailUser,
      };

      // Tự động tạo/bổ sung cấu hình notification cho user
      await this.notificationConfigService.checkAndInitDataForUser(userRecord.id);

      return {
        success: true,
        message: 'Login successful',
        token: accessToken, // Dùng thẳng Keycloak Access Token
        user: tokenPayload,
      };
    } catch (error) {
      this.logger.error(`Error in callbackLifeSSO: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to process user information',
          error: error.message,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  async callbackLifeSSO(resData: any, issuer: string, clientSecret: string) {
    try {
      // this.logger.log('\\n🔍 [callbackLifeSSO] Đang xử lý token...');

      const accessToken = resData.access_token;
      const idToken = resData.id_token;

      // this.logger.log('\\n--- TOKEN NHẬN ĐƯỢC TỪ KEYCLOAK ---');
      // this.logger.log(`access_token (bị cắt ngắn): ${accessToken ? accessToken.substring(0, 30) + '...' : 'KHÔNG CÓ'}`);
      // this.logger.log(`id_token: ${idToken ? idToken.substring(0, 30) + '...' : 'KHÔNG CÓ'}`);

      if (!accessToken) {
        throw new HttpException('No token', HttpStatus.UNAUTHORIZED);
      }

      // Decode token
      const decoded: any = decode(idToken || accessToken);
      if (!decoded) {
        throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
      }

      // this.logger.log('\\n--- PAYLOAD ĐÃ DECODE ---');
      // this.logger.log(JSON.stringify(decoded, null, 2));

      // const userUrl = `${authConfig?.config?.baseUrl}/${this.userInfoUrl}`;
      // Request userinfo
      const agent = new https.Agent({ rejectUnauthorized: false });
      // const userInfoRes = await axios.get(userUrl, {
      //   httpsAgent: agent,
      //   headers: { Authorization: `Bearer ${accessToken}` },
      // });

      // const userInfo = userInfoRes.data;

      const email = decoded.email || null;
      const username = decoded.preferred_username;
      const fullName =
        `${decoded.given_name || ''} ${decoded.family_name || ''}`.trim();
      const keycloakUserId = decoded.sub;

      // this.logger.log('\\n--- THÔNG TIN USER TRÍCH XUẤT ĐƯỢC ---');
      // this.logger.log(`- username: ${username}`);
      // this.logger.log(`- email: ${email}`);
      // this.logger.log(`- sub (keycloakUserId): ${keycloakUserId}`);
      // this.logger.log(`- fullName: ${fullName}`);

      if (!username) {
        throw new Error('Username not found in token or userinfo');
      }

      // this.logger.log('\\n✅ [callbackLifeSSO] Trích xuất username thành công!');

      // ======================================================
      // 🚀 CÁCH 2: GỌI API KEYCLOAK ĐỂ LẤY GROUP (Dùng Admin Token)
      // ======================================================

      const realm = issuer.split('/').pop(); // lấy "master"
      const keycloakBaseUrl = issuer.replace(/\/realms\/[^/]+$/, '');

      let keycloakGroups: string[] = [];

      try {
        const adminToken = await this.getAdminToken();

        if (adminToken) {
          const groupsRes = await axios.get(
            `${keycloakBaseUrl}/admin/realms/${realm}/users/${decoded.sub}/groups`,
            {
              httpsAgent: agent,
              headers: { Authorization: `Bearer ${adminToken}` },
            },
          );
          keycloakGroups = (groupsRes.data || []).map((g: any) => g.name);
        } else {
          throw new Error('Không lấy được Admin Token');
        }
      } catch (err) {
        keycloakGroups = decoded.groups || decoded.realm_access?.roles || [];
      }

      // const isInAdminTancang =
      //   Array.isArray(keycloakGroups) &&
      //   keycloakGroups.includes('/ADMIN_TANCANG');

      // this.logger.log(`User ${username} ADMIN_TANCANG = ${isInAdminTancang}`);

      // ======================================================
      // TẠO HOẶC CẬP NHẬT USER TRONG MONGO
      // ======================================================

      // Ưu tiên tìm bằng UUID của Keycloak để đảm bảo tính định danh tuyệt đối
      let user = await this.userRepository.findOne({
        where: { keycloakUserId: keycloakUserId },
      });

      // Nếu là lần đầu user đăng nhập sau khi đồng bộ lên Keycloak nhưng DB chưa lưu kịp ID, fallback sang username
      if (!user && username) {
        user = await this.userRepository.findOne({
          where: { username: username },
        });
      }

      // 3. Nếu vẫn không thấy, thử tìm theo Email
      if (!user && email) {
        user = await this.userRepository.findOne({
          where: { emailUser: email },
        });
      }

      // Chuẩn bị data update/create
      const updateData: Partial<UserEntity> = {
        username: username,
        emailUser: email,
        keycloakUserId: keycloakUserId,
        status: STATUS.ACTIVED,
        // Thêm các trường khác nếu cần
      };

      if (!user) {
        const hashedPassword = await bcrypt.hash('12345678', 10); // Cân nhắc dùng mật khẩu ngẫu nhiên hoặc không set
        const newUser = this.userRepository.create({
          id: uuidv4(),
          ...updateData,
          name: fullName,
          password: hashedPassword,
          createdAt: new Date(),
        });
        user = await this.userRepository.save(newUser);
      } else {
        Object.assign(user, updateData);
        await this.userRepository.save(user);
      }

      // Sau khi tạo hoặc tìm thấy, userRecord chắc chắn không null
      if (!user) {
        throw new HttpException(
          'Không thể tạo hoặc tìm thấy người dùng.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // ======================================================
      // TỰ ĐỘNG GÁN QUYỀN DEFAULT CHO USER CHƯA CÓ QUYỀN HOẶC LẦN ĐẦU ĐĂNG NHẬP
      // ======================================================
      try {
        const defaultGroupCode = process.env.DEFAULT_GROUP_CODE;

        if (defaultGroupCode) {
          let userGroups = await this.groupUserRepository
            .createQueryBuilder('group')
            .innerJoin('group.users', 'user')
            .where('user.id = :userId', { userId: user.id })
            .getMany();

          if (userGroups.length === 0) {
            const legacyUserGroups = await this.groupUserRepository
              .createQueryBuilder('group')
              .where('group.userId LIKE :userId', { userId: `%"${user.id}"%` })
              .getMany();

            if (legacyUserGroups.length > 0) {
              userGroups = legacyUserGroups;
            }
          }

          if (userGroups.length === 0) {
            let defaultGroup = await this.groupUserRepository.findOne({
              where: { code: defaultGroupCode },
              relations: ['users'],
            });

            if (!defaultGroup) {
              defaultGroup = this.groupUserRepository.create({
                id: uuidv4(),
                code: defaultGroupCode,
                name: defaultGroupCode,
                userId: [user.id],
                users: [user],
                status: STATUS.ACTIVED,
              });

              await this.groupUserRepository.save(defaultGroup);

              try {
                await this.userRepository
                  .createQueryBuilder()
                  .relation(UserEntity, 'groupUsers')
                  .of(user.id)
                  .add(defaultGroup.id);
              } catch (e) {
                this.logger.warn(`[DEFAULT_GROUP][ERROR] ${e.message}`);
              }
            } else {
              if (!defaultGroup.users) {
                defaultGroup.users = [];
              }

              const userExists = defaultGroup.users.some(
                (u) => String(u.id) === String(user.id),
              );

              if (!userExists) {
                defaultGroup.users.push(user);

                let userIds: string[] = [];

                if (Array.isArray(defaultGroup.userId)) {
                  userIds = [...defaultGroup.userId];
                } else if (typeof defaultGroup.userId === 'string') {
                  try {
                    userIds = JSON.parse(defaultGroup.userId);
                    if (!Array.isArray(userIds)) {
                      userIds = [];
                    }
                  } catch {
                    userIds = [];
                  }
                }

                if (!userIds.includes(String(user.id))) {
                  userIds.push(String(user.id));
                }

                defaultGroup.userId = userIds;
                await this.groupUserRepository.save(defaultGroup);

                try {
                  await this.userRepository
                    .createQueryBuilder()
                    .relation(UserEntity, 'groupUsers')
                    .of(user.id)
                    .add(defaultGroup.id);
                } catch (e) {
                  this.logger.warn(`[DEFAULT_GROUP][ERROR] ${e.message}`);
                }

                if (
                  defaultGroup.roleType === 'dynamic' &&
                  defaultGroup.roles_dynamic &&
                  defaultGroup.roles_dynamic.length > 0
                ) {
                  const mapped = this.mapRolesDynamicToRolesByProcess(
                    defaultGroup.roles_dynamic,
                    defaultGroup.id,
                  );

                  user.rolesByProcess = this.mergeRolesByProcess(
                    Array.isArray(user.rolesByProcess)
                      ? user.rolesByProcess
                      : [],
                    mapped,
                  );

                  await this.userRepository.save(user);
                }
              }
            }
          }
        }
      } catch (err) {
        this.logger.error(`[DEFAULT_GROUP][ERROR] ${err.message}`, err.stack);
      }

      // ======================================================
      // NẾU USER THUỘC ADMIN_TANCANG → THÊM VÀO GROUP USERS
      // ======================================================
      // if (isInAdminTancang) {
      //   const processGroupCode =
      //     process.env.NHOM_QUY_TRINH_CODE || 'NHOMquytrinh';
      //   let processGroup = await this.groupUserRepository.findOne({
      //     where: { code: processGroupCode },
      //     // relations: ['users'],
      //   });

      //   if (!processGroup) {
      //     this.logger.log(`Creating new process group: ${processGroupCode}`);
      //     processGroup = this.groupUserRepository.create({
      //       code: processGroupCode,
      //       name: processGroupCode,
      //       users: [user],
      //       status: STATUS.ACTIVED,
      //     });
      //     await this.groupUserRepository.save(processGroup);
      //     this.logger.log(
      //       `Created new GroupUsers (${processGroupCode}) with userId`,
      //       user.id,
      //     );
      //   } else {
      //     const rawUserIds = processGroup?.userId || [];
      //     let userIds: string[] = [];
      //     if (typeof rawUserIds === 'string') {
      //       const parsed = JSON.parse(rawUserIds);
      //       userIds = Array.isArray(parsed) ? parsed.map(String) : [];
      //     }
      //     const userExistsInGroup = userIds
      //       .map((id) => id.trim())
      //       .includes(user.id.trim());

      //     if (!userExistsInGroup) {
      //       this.logger.log(
      //         `Adding user ${user.id} to group ${processGroupCode}`,
      //       );
      //       userIds.push(user.id);

      //       // ⚠️ QUAN TRỌNG:
      //       // KHÔNG stringify
      //       // KHÔNG thêm dấu '
      //       (processGroup as any).userId = JSON.stringify(userIds);
      //       console.log(
      //         'Updated userId array for group:',
      //         (processGroup as any).userId,
      //       );
      //       await this.groupUserRepository.save(processGroup);
      //       this.logger.log(
      //         `Added userId ${user.id} to GroupUsers(${processGroupCode})`,
      //       );
      //     } else {
      //       this.logger.log(
      //         `User ${user.id} already exists in GroupUsers(${processGroupCode})`,
      //       );
      //     }
      //   }
      // }

      // ======================================================
      // TRẢ JWT VỀ CHO CLIENT
      // ======================================================

      const tokenPayload: {
        user: string;
        username: string;
        email: string | null;
        roles: string[];
      } = {
        user: user.id,
        username: user.username,
        email: user.emailUser ?? null,
        roles: keycloakGroups,
      };

      // Tự động tạo/bổ sung cấu hình notification cho user
      await this.notificationConfigService.checkAndInitDataForUser(user.id);

      return {
        // Trả về token của Keycloak và thông tin user cho controller
        success: true,
        message: 'Login successful',
        token: accessToken, // Dùng thẳng Keycloak Access Token
        user: tokenPayload,
      };
    } catch (error: any) {
      this.logger.error(`❌ Error in callbackLifeSSO: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to process user information',
          error: error.message,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  /**
   * Xóa dấu tiếng Việt cho username
   */
  removeVietnameseAccents(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase();
  }

  async getAdminToken(): Promise<string | null> {
    try {
      const config = await this.getEffectiveConfig();
      if (!config.issuer || !config.clientId) {
        this.logger.error('❌ Config Keycloak không đầy đủ để lấy Admin Token');
        return null;
      }

      const { issuer, clientId, clientSecret } = config;
      const tokenUrl = `${issuer}/protocol/openid-connect/token`;

      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('client_id', clientId);
      params.append('client_secret', clientSecret);

      const agent = new https.Agent({ rejectUnauthorized: false });
      const res = await axios.post(tokenUrl, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        httpsAgent: agent,
      });

      return res.data.access_token;
    } catch (err) {
      this.logger.error(`❌ getAdminToken failed: ${err.message}`);
      return null;
    }
  }

  async logoutUser(keycloakUserId: string): Promise<boolean> {
    try {
      const adminToken = await this.getAdminToken();
      if (!adminToken) {
        this.logger.error('❌ Cannot get Admin Token for logout');
        return false;
      }

      const config = await this.getEffectiveConfig();
      if (!config.issuer) return false;

      const { issuer } = config;
      const realm = issuer.split('/').pop();
      const keycloakBaseUrl = issuer.replace(/\/realms\/[^/]+$/, '');

      const logoutUrl = `${keycloakBaseUrl}/admin/realms/${realm}/users/${keycloakUserId}/logout`;
      const agent = new https.Agent({ rejectUnauthorized: false });

      await axios.post(
        logoutUrl,
        {},
        {
          httpsAgent: agent,
          headers: { Authorization: `Bearer ${adminToken}` },
        },
      );

      return true;
    } catch (err) {
      this.logger.error(
        `❌ Failed to logout user ${keycloakUserId}: ${err.message}`,
      );
      return false;
    }
  }

  private redactTokenRequestData(data: unknown): string {
    if (!data) return '';
    try {
      const params = new URLSearchParams(String(data));
      for (const key of ['code', 'client_secret', 'refresh_token', 'access_token', 'id_token']) {
        if (params.has(key)) params.set(key, '[REDACTED]');
      }
      return params.toString();
    } catch {
      return String(data).replace(/([?&]?(?:code|client_secret|refresh_token|access_token|id_token)=)[^&]+/gi, '$1[REDACTED]');
    }
  }

  private mergeRolesByProcess(current: any[], incoming: any[]): any[] {
    const resultMap = new Map<string, { name: string; roles: any[] }>();

    for (const item of current) {
      resultMap.set(item.processKey, {
        name: item.name ?? item.processKey,
        roles: Array.isArray(item.roles) ? [...item.roles] : [],
      });
    }

    for (const item of incoming) {
      const existed = resultMap.get(item.processKey);

      if (existed) {
        existed.roles.push(...item.roles);
      } else {
        resultMap.set(item.processKey, {
          name: item.name ?? item.processKey,
          roles: [...item.roles],
        });
      }
    }

    return Array.from(resultMap.entries()).map(([processKey, value]) => ({
      processKey,
      name: value.name,
      roles: value.roles,
    }));
  }

  private mapRolesDynamicToRolesByProcess(
    rolesDynamic: {
      processKey: string;
      roleCode: string;
      name: string;
    }[],
    groupId: string,
  ): any[] {
    const map = new Map<string, any[]>();

    for (const r of rolesDynamic) {
      if (!map.has(r.processKey)) {
        map.set(r.processKey, []);
      }

      map.get(r.processKey)!.push({
        roleCode: r.roleCode,
        name: r.name,
        __groupId: groupId,
      });
    }

    return Array.from(map.entries()).map(([processKey, roles]) => ({
      processKey,
      name: processKey,
      roles,
    }));
  }
}
