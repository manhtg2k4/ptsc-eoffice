import { TokenResponseDto } from './dto/token.response.dto';
import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as jwt from 'jsonwebtoken';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import axios from 'axios';
import * as https from 'https';
import { STATUS, ORG_UNIT_TYPES } from 'src/variables/CONST_STATUS';
import { GroupUserEntity } from 'src/group-users/entities/group-users.entity';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';

import { AuthConfigService } from 'src/auth-config/auth-config.service';
import { AuthorityDocumentEntity } from 'src/authority-documents';
import { NotificationConfigService } from 'src/notifycation/notification-config/notification-config.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly httpService: HttpService,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(GroupUserEntity, 'mssqlConnection')
    private readonly groupUserRepo: Repository<GroupUserEntity>,
    @InjectRepository(OrganizationUnitEntity, 'mssqlConnection')
    private readonly orgUnitRepo: Repository<OrganizationUnitEntity>,
    @InjectRepository(AuthorityDocumentEntity, 'mssqlConnection')
    private readonly authorityDocumentRepo: Repository<AuthorityDocumentEntity>,
    private readonly authConfigService: AuthConfigService,
    private readonly notificationConfigService: NotificationConfigService,

  ) { }

  // async getToken(code: string): Promise<TokenResponseDto> {
  //   const params = new URLSearchParams();
  //   params.append("grant_type", "authorization_code");
  //   params.append("code", code);
  //   params.append("redirect_uri", this.redirectUri);
  //   params.append("client_id", this.clientId);
  //   params.append("client_secret", this.clientSecret);

  //   const res = await axios.post<TokenResponseDto>(this.tokenUrl, params, {
  //     headers: { "Content-Type": "application/x-www-form-urlencoded" },
  //   });

  //   const data: any = await this.callbackLifeSSO(res.data)
  //   return {
  //     ...res.data,
  //     ...data
  //   };
  // }
  // async getToken(code: string): Promise<TokenResponseDto> {
  //   const params = new URLSearchParams();
  //   params.append("grant_type", "authorization_code");
  //   params.append("code", code);
  //   params.append("redirect_uri", this.redirectUri);
  //   params.append("client_id", this.clientId);
  //   params.append("client_secret", this.clientSecret);

  //   const res = await axios.post<TokenResponseDto>(this.tokenUrl, params, {
  //     headers: { "Content-Type": "application/x-www-form-urlencoded" },
  //     httpsAgent: new https.Agent({
  //       rejectUnauthorized: false,
  //     }),
  //   });

  //   const data: any = await this.callbackLifeSSO(res.data)
  //   return {
  //     ...res.data,
  //     ...data
  //   };
  // }

  removeVietnameseAccents(text: string): string {
    return text
      .normalize('NFD') // Tách dấu khỏi ký tự gốc
      .replace(/[\u0300-\u036f]/g, '') // Xóa dấu
      .replace(/đ/g, 'd') // Chuyển đ → d
      .replace(/Đ/g, 'D') // Chuyển Đ → D
      .toLowerCase(); // Chuyển về chữ thường
  }

  async callbackLifeSSOv1tthc(resData: any) {
    try {
      const access_token = resData.access_token;
      const id_token = resData.id_token;
      const expires_in = resData.expires_in; // Lấy thời gian hết hạn từ SSO (tính bằng giây)
      if (!access_token)
        throw new HttpException('No token', HttpStatus.UNAUTHORIZED);
      const decodedToken: any = jwt.decode(id_token);

      if (!decodedToken) {
        throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
      }
      const userId = decodedToken.sub.split('@')[0];
      // 🟢 Gọi API lấy thông tin user từ SCIM2
      const agent = new https.Agent({ rejectUnauthorized: false });
      const scim2Url = `${userId}`;

      const config = {
        httpsAgent: agent, // ⚡️ Thêm vào đây để bỏ kiểm tra SSL
        headers: {
          Authorization: `Bearer ${access_token}`,
          Accept: 'application/scim+json',
        },
      };

      const userResponse = await axios.get(scim2Url, config);
      if (!userResponse.data.id) {
        throw new HttpException(
          'Không tìm thấy người dùng trong cơ sở dữ liệu SSO',
          HttpStatus.NOT_FOUND,
        );
      }

      const userData = userResponse.data;
      const email = userData.emails[0];
      const username = userData.userName;
      const userActualname = userData.name.givenName;

      // 🟢 Kiểm tra và cập nhật nhân sự
      let userRecord = await this.userRepo.findOneBy({ emailUser: email });

      if (!userRecord) {
        const newUser = this.userRepo.create({
          emailUser: email,
          username: username,
          name: userActualname,
          createdAt: new Date(),
        });

        userRecord = await this.userRepo.save(newUser);
      }

      // 🟢 Trả về thông tin user - không cần tạo token nội bộ
      // Hệ thống 100% Keycloak, FE dùng token từ keycloak-js
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
        token: access_token, // trả thẳng Keycloak access_token
        user: tokenPayload,
      };
    } catch (error) {
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

  //đang chạy
  async callbackLifeSSO(
    accessToken: string,
    req?: any,
  ): Promise<{
    success: boolean;
    message: string;
    token?: string;
    user?: any;
    departmentCodes: any;
  }> {
    const config = await this.authConfigService.findActive();

    if (!config) {
      throw new NotFoundException(
        `Không tìm thấy cấu hình xác thực nào đang hoạt động.`,
      );
    }
    let baseUrl = '';
    if (config.authType === 'wso2') {
      baseUrl = new URL((config as any)?.config.authUrl).origin;
    }

    const decodedToken: any = jwt.decode(accessToken);
    if (!decodedToken || !decodedToken['sub']) {
      throw new HttpException('Invalid access token', HttpStatus.BAD_REQUEST);
    }

    let subValue = decodedToken['sub'];
    if (typeof subValue === 'function') subValue = subValue();
    if (typeof subValue !== 'string') {
      throw new HttpException(
        'Invalid sub value in access token',
        HttpStatus.BAD_REQUEST,
      );
    }

    const userId = subValue.split('@')[0];
    const userNameFromToken = decodedToken?.username;

    const tokenExp = decodedToken.exp;
    if (!tokenExp || typeof tokenExp !== 'number') {
      throw new HttpException(
        'Expiration time not found in access token',
        HttpStatus.BAD_REQUEST,
      );
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const expiresIn = tokenExp - currentTime;

    try {
      // === 1. Gọi SCIM2 để lấy user ===
      const scim2Url = `${baseUrl}/scim2/Users?filter=id eq "${userId}"`;
      let userResponse;
      try {
        userResponse = await axios.get(scim2Url, {
          headers: {
            Authorization: `Basic ${Buffer.from('admin:admin').toString('base64')}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.error('Error calling SCIM2 API:', error);
        throw new HttpException(
          'Failed to fetch user from SCIM2',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      if (userResponse.data.totalResults === 0) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const scimUser = userResponse.data.Resources[0];

      // === 2. Lấy role và permissions ===
      const roleStrings = scimUser.roles?.map((r: any) => r.display) || [];
      const roleRefs = scimUser.roles?.map((r: any) => r.$ref) || [];

      const permissionsList: string[] = [];
      for (const roleRef of roleRefs) {
        try {
          const roleRes = await axios.get(roleRef, {
            headers: {
              Authorization: `Basic ${Buffer.from('admin:admin').toString('base64')}`,
              'Content-Type': 'application/json',
            },
          });
          const permissions = roleRes.data.permissions || /* fallback */[];
          permissions.forEach((perm: any) => {
            if (perm.value) permissionsList.push(perm.value);
          });
        } catch (error) {
          console.warn(`Failed to fetch role from ${roleRef}:`, error.message);
        }
      }

      // === 3. Xử lý UserGroupManagement ===
      // const orgCode = scimUser.groups?.[0]?.display || 'DEFAULT_GROUP';
      // let organization = await this.orgUnitRepo.findOne({
      //   where: { code: orgCode },
      // });

      // if (!organization) {
      //   const newOrg = this.orgUnitRepo.create({
      //     id: uuidv4(),
      //     code: orgCode,
      //     name: orgCode,
      //     description: `Auto-created by SSO for group: ${orgCode}`,
      //     // createdBy: 'SSO_SYSTEM', // Cần thêm cột này vào entity nếu có
      //     status: STATUS.ACTIVED,
      //   });
      //   organization = await this.orgUnitRepo.save(newOrg);
      // console.log('New OrganizationUnit created:', organization);
      // } else {
      // console.log('OrganizationUnit found:', organization);
      // }

      const fullName = scimUser?.userName || '';
      const email = scimUser?.emails?.[0] || '';
      const userNameFromToken = scimUser?.userName || '';

      // Sau khi xử lý group xong
      const canBoCodeEnv = process.env.CANBO_GROUP_CODE || 'CANBO';
      const isCanBo = Array.isArray(scimUser?.groups)
        ? scimUser.groups.some(
          (g) => g?.display === canBoCodeEnv || g?.value === canBoCodeEnv,
        )
        : false;

      // === Tìm / Tạo User ===
      let user = await this.userRepo.findOne({ where: { username: userNameFromToken } });

      // Id string an toàn

      // Chuẩn bị data update
      const updateData: Partial<UserEntity> = {
        name: fullName,
        username: userNameFromToken || fullName,
        emailUser: email,
        phoneNumberUser: scimUser.phoneNumbers?.[0]?.value || null,
        // identificationCard: userId,
        // parent: organization, // Phòng ban của user
        // organizationUnit: organization, // Phòng ban của user
        status: STATUS.ACTIVED,
        role: roleStrings.join(', '),
      };
      if (!user) {
        const newUser = this.userRepo.create({
          id: uuidv4(),
          ...updateData,
          password: await bcrypt.hash('12345678', 10), // Cần hash password
          createdAt: new Date(),
          // firstLogin: true, // Cần thêm cột này vào entity nếu có
        });

        user = await this.userRepo.save(newUser);
      } else {
        Object.assign(user, updateData);
        await this.userRepo.save(user);
      }

      // XỬ LÝ THÊM USER VÀO GROUP QUY TRÌNH (NHÓMQUYTRINH)
      if (isCanBo) {
        const processGroupCode =
          process.env.NHOM_QUY_TRINH_CODE || 'NHOMquytrinh';
        let processGroup = await this.groupUserRepo.findOne({
          where: { code: processGroupCode },
        });

        if (!processGroup) {
          const newProcessGroup = this.groupUserRepo.create({
            code: processGroupCode,
            name: processGroupCode,
            users: [user],
            // createdBy: 'SSO_SYSTEM', // Cần thêm cột này vào entity nếu có
            status: STATUS.ACTIVED,
          });

          processGroup = await this.groupUserRepo.save(newProcessGroup);
        } else {
          // 1. Chuẩn hoá userIds từ DB
          let userIds: string[] = [];

          const rawUserIds = processGroup?.userId || [];

          if (Array.isArray(rawUserIds)) {
            // Trường hợp đã là array
            userIds = rawUserIds.map(String);
          } else if (typeof rawUserIds === 'string') {
            // Trường hợp NVARCHAR lưu JSON string
            try {
              const parsed = JSON.parse(rawUserIds);
              userIds = Array.isArray(parsed) ? parsed.map(String) : [];
            } catch (e) {
              console.error(
                'Invalid JSON in group.userId, reset to empty array',
                rawUserIds,
              );
              userIds = [];
            }
          } else {
            userIds = [];
          }

          // 2. Chuẩn hoá userId cần thêm
          const userIdStr = String(user.id);

          // 3. Check tồn tại
          const userExistsInGroup = userIds
            .map((id) => id.trim())
            .includes(userIdStr.trim());

          if (!userExistsInGroup) {
            // 4. Add userId
            userIds.push(userIdStr);

            // ⚠️ QUAN TRỌNG:
            // KHÔNG stringify
            // KHÔNG thêm dấu '
            (processGroup as any).userId = JSON.stringify(userIds);
            // 5. Save
            await this.groupUserRepo.save(processGroup);
          }
        }
      }

      if (!user) {
        throw new HttpException(
          'User not created or found after SSO',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      // === 7. Trả về access token của Keycloak ===
      const tokenPayload = {
        user: user.id,
        username: user.username,
        email: user.emailUser,
        idNumber: user.identificationCard,
      };

      // Tự động tạo/bổ sung cấu hình notification cho user
      await this.notificationConfigService.checkAndInitDataForUser(user.id);

      return {
        success: true,
        message: 'Login successful',
        token: accessToken, // trả thẳng Keycloak access_token
        user: tokenPayload,
        departmentCodes: permissionsList,
      };
    } catch (error) {
      // === Xử lý lỗi ===
      // try {
      //   const userInfo = getUserInfoFromRequest(req);
      //   const currentIp = req.ip;
      //   const forwardedFor = req.headers['x-forwarded-for']
      //     ? `${req.headers['x-forwarded-for']}, ${currentIp}`
      //     : currentIp;

      //   await createLog({
      //     data: {
      //       action: 'OAUTH',
      //       details: `Đăng nhập thất bại: ${error.message}`,
      //       method: 'GET',
      //       timestamp: new Date().toISOString(),
      //       type: 'lgspnb',
      //       status: 'error',
      //     },
      //     userInfo,
      //     customHeaders: {
      //       'X-Forwarded-For': forwardedFor,
      //       'X-Real-IP': req.headers['x-real-ip'] || currentIp,
      //     },
      //   });
      // } catch (logError) {
      //   console.error('Log error failed:', logError);
      // }

      console.error('SSO Callback Error:', error);
      if (error.response?.status === 401) {
        throw new HttpException(
          'Access token expired',
          HttpStatus.UNAUTHORIZED,
        );
      }
      throw new HttpException(
        'Failed to process SSO login',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getGroupCodesByUserId(userId: string): Promise<string[]> {
    try {
      const user = await this.userRepo.findOne({
        where: { id: userId },
        relations: ['groupUsers'],
        select: ['id'],
      });

      if (!user || !user.groupUsers) return [];

      return user.groupUsers.map((g) => g.code);
    } catch (error) {
      console.warn(`[getGroupCodesByUserId] Cannot query user ${userId}:`, error?.message);
      return [];
    }
  }

  async getProfile(userId: string): Promise<any> {
    // Lấy user và chỉ lấy parentId
    const user = await this.userRepo
      .createQueryBuilder('u')
      .leftJoin('u.parent', 'o') // liên kết với bảng organization_units
      .leftJoin('o.parent', 'op') // liên kết với đơn vị cha của parent
      .select([
        'u.id AS id',
        'u.avatar AS avatar',
        'u.profileImage AS profileImage',
        'u.username AS username',
        'u.emailUser AS emailUser',
        'u.address_user AS address_user',
        'u.position AS position',
        'u.phone_number_user AS phone_number_user',
        'u.birthday AS birthday',
        'u.gender AS gender',
        'u.name AS name',
        'u.is_google_calendar_verified AS is_google_calendar_verified',
        'u.parent AS parentId',
        'o.name AS parentName',
        'o.code AS parentCode',
        'o.type AS orgType',
        'o.parentId AS orgParentId',
        'op.id AS grandParentId',
        'op.name AS grandParentName',
        'op.code AS grandParentCode',
        'op.type AS grandParentType',
        'u.contentSignImage AS contentSignImage',
        'u.paraphSignImage AS paraphSignImage',
        'u.contentSignTransparentImage AS contentSignTransparentImage',
        'u.paraphSignTransparentImage AS paraphSignTransparentImage',
        'u.stampSignImage AS stampSignImage',
        'u.keycloakUserId AS keycloakUserId',
      ])
      .where('u.id = :id', { id: userId })
      .getRawOne();

    if (!user) {
      throw new HttpException(
        'User not found in database',
        HttpStatus.NOT_FOUND,
      );
    }

    // Parse JSON fields since getRawOne returns strings
    try {
      user.avatar = user.avatar ? (typeof user.avatar === 'string' ? JSON.parse(user.avatar) : user.avatar) : [];
    } catch {
      user.avatar = [];
    }

    try {
      user.profileImage = user.profileImage ? (typeof user.profileImage === 'string' ? JSON.parse(user.profileImage) : user.profileImage) : null;
    } catch {
      user.profileImage = null;
    }
    // 👉 Lấy group code của user
    const groupCodes = await this.getGroupCodesByUserId(userId);
    let author: string | null = null;

    try {
      const authority = await this.authorityDocumentRepo.findOne({
        where: {
          authorized: userId,
          stage: '1',
          status: '1',
        },
        order: {
          createdAt: 'DESC',
        },
        select: ['author'],
      });

      author = authority?.author ?? null;
    } catch (err) {
      console.error('[getProfile][authority]', err?.message);
    }
    const { parentId, parentName, parentCode, is_google_calendar_verified, ...rest } = user;
    const isPhongTCT = user.orgType === 'PhongTCT';
    const isHeadCompany = user.orgParentId === null || isPhongTCT;

    let grandParent: any = null;
    if (user.orgType === ORG_UNIT_TYPES.BAN) {
      grandParent = {
        _id: user.grandParentId,
        name: user.grandParentName,
        code: user.grandParentCode,
      };
    }

    return {
      loggedIn: true,
      user: {
        _id: user.id,
        ...rest,
        author: author,
        keycloakUserId: user.keycloakUserId || null,
        parent: {
          _id: user.parentId,
          name: user.parentName,
          code: user.parentCode,
          isHeadCompany
        },
        grandParent,
        isGoogleCalendarVerified: user.is_google_calendar_verified,
        groupCodes: groupCodes,
        organizationName: user?.parentName || null,
        organizationCode: user?.parentCode || null,
      },
    };
  }

  async testSsoConnection(
    body: any,
    config: any,
  ): Promise<{ success: boolean; message: string; data?: any }> {
    const { authType } = body;
    const { authUrl, clientId, redirectUri, scope, issuer } = config;

    if (!clientId) {
      throw new HttpException(
        'Thiếu các trường cấu hình bắt buộc ( clientId )',
        HttpStatus.BAD_REQUEST,
      );
    }

    const buildWso2Url = () => {
      return (
        `${authUrl}?response_type=code` +
        `&client_id=${clientId}` +
        `&redirect_uri=${redirectUri}` +
        `&scope=${scope}`
      );
    };

    const buildKeycloakUrl = () => {
      if (!issuer) {
        throw new HttpException(
          'Thiếu issuer của Keycloak',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (!clientId) {
        throw new HttpException(
          'Thiếu clientId của Keycloak',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (!redirectUri) {
        throw new HttpException(
          'Thiếu redirectUri của Keycloak',
          HttpStatus.BAD_REQUEST,
        );
      }

      return (
        `${issuer}/protocol/openid-connect/auth` +
        `?response_type=code` +
        `&client_id=${clientId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${scope || 'openid'}`
      );
    };

    let testUrl = '';

    // BẮT BUỘC phải cover hết các trường hợp
    if (authType === 'wso2') {
      testUrl = buildWso2Url();
    } else if (authType === 'keycloak') {
      testUrl = buildKeycloakUrl();
    } else {
      return {
        success: false,
        message: `authType ${authType} không hỗ trợ`,
      };
    }

    try {
      const agent = new https.Agent({ rejectUnauthorized: false });

      const response = await axios.get(testUrl, {
        httpsAgent: agent,
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400,
      });

      // ---------------- WSO2 --------------------
      if (authType === 'wso2') {
        const location = response.headers.location || '';

        if (response.status >= 300 && response.status < 400) {
          if (
            location.includes('error') ||
            location.includes('oauthErrorCode')
          ) {
            return {
              success: false,
              message: 'Cấu hình WSO2 không hợp lệ.',
              data: { redirectUrl: location },
            };
          }
        }

        return {
          success: true,
          message: 'Kết nối WSO2 hợp lệ.',
        };
      }

      // ---------------- KEYCLOAK --------------------
      if (authType === 'keycloak') {
        const location = response.headers.location || '';

        if (location.includes('error=')) {
          return {
            success: false,
            message: 'Cấu hình Keycloak không hợp lệ.',
            data: { redirectUrl: location },
          };
        }

        if (response.status === 302 && location.includes('/login')) {
          return {
            success: true,
            message: 'Kết nối Keycloak hợp lệ.',
          };
        }

        return {
          success: true,
          message: 'Kết nối Keycloak thành công.',
          data: { redirectUrl: location },
        };
      }

      // Không bao giờ chạy tới đây nhưng vẫn return để TypeScript không lỗi
      return {
        success: false,
        message: 'Không xác định được authType.',
      };
    } catch (error) {
      const errorMessage =
        error.response?.data?.error_description ||
        error.response?.data ||
        error.message;

      return {
        success: false,
        message: `Cấu hình không hợp lệ, vui long kiểm tra lại.`,
        // err: `Kiểm tra kết nối thất bại: ${errorMessage}`,
      };
    }
  }
}
