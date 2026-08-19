import { Controller, Get, Post, Body, Query, Res, Req, UnauthorizedException, HttpException, HttpStatus, ConsoleLogger, Inject, forwardRef, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { AuthKeycloakService } from './auth-keycloak.service';
import * as jwt from 'jsonwebtoken';
import { verifyKeycloakToken } from '../utils/keycloak-verify';
import { Public } from 'src/oauth/decorator/public.decorator';
// import { LogAction } from 'src/user-log/log.decorator'; // ✅ Commented - module deleted
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { AuthConfigEntity } from 'src/auth-config/entities/auth-config.entity';
import { UsersService } from 'src/users/users.service';
import { AuthService } from 'src/auth-sso/auth-sso.service';

@ApiTags('Xác thực Keycloak')
@Controller('auth-keycloak')
export class AuthKeycloakController {
  private readonly logger = new Logger(AuthKeycloakController.name);

  constructor(
    private readonly authKeycloakService: AuthKeycloakService,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(AuthConfigEntity, 'mssqlConnection')
    private readonly authConfigRepository: Repository<AuthConfigEntity>,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) { }

  @Public()
  @Get('login')
  @ApiOperation({
    summary: 'Chuyển hướng đến trang đăng nhập Keycloak',
    description: 'Chuyển hướng người dùng đến Keycloak để đăng nhập',
  })
  @ApiResponse({
    status: 302,
    description: 'Chuyển hướng đến Keycloak',
  })
  @ApiResponse({
    status: 500,
    description: 'Keycloak chưa được cấu hình',
  })
  async login(@Query('redirect_uri') customRedirectUri: string, @Res() res: Response) {
    const authConfig = await this.authConfigRepository.findOne({
      where: { authType: 'keycloak', isActive: true },
    });
    
    // Lấy config hiệu dụng (trộn Env + DB)
    const config = await this.authKeycloakService.getEffectiveConfig(authConfig?.config);
    
    if (!config.issuer || !config.baseUrl) { 
      throw new HttpException('Chưa cấu hình Keycloak issuer hoặc baseUrl.', HttpStatus.INTERNAL_SERVER_ERROR); 
    }
 
    const { clientId, redirectUri, scope, issuer } = config;
    const finalRedirectUri = customRedirectUri || redirectUri;
    const authorizeUrl = `${issuer}/protocol/openid-connect/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(finalRedirectUri)}&scope=${encodeURIComponent(scope)}`;
    return res.redirect(authorizeUrl);
  }

  @Public()
  // @LogAction('Đăng nhập') // ✅ Commented - module deleted
  @Get('callback')
  @ApiOperation({
    summary: 'Xử lý callback từ Keycloak',
    description: 'Nhận mã xác thực từ Keycloak và thực hiện đăng nhập',
  })
  @ApiQuery({
    name: 'code',
    type: String,
    required: true,
    description: 'Mã xác thực từ Keycloak',
  })
  @ApiResponse({
    status: 302,
    description: 'Chuyển hướng tới trang chấp nhận',
  })
  @ApiResponse({
    status: 400,
    description: 'Mã xác thực không hợp lệ',
  })
  async callback(@Query('code') code: string, @Req() req: Request, @Res() res: Response) {
    try {
      // Lấy cấu hình hiệu dụng để biết domain FE cần redirect về
      const authConfig = await this.authConfigRepository.findOne({
        where: { authType: 'keycloak', isActive: true },
      });
      const config = await this.authKeycloakService.getEffectiveConfig(authConfig?.config);

      // Sau khi Keycloak callback về BE, chúng ta redirect về FE kèm theo code
      // FE sẽ nhận code này và gọi API exchange-code để lấy token
      const feBaseUrl = config.domainFe || process.env.REDIRECT_URI_FE || '/';

      const redirectUrl = feBaseUrl.startsWith('http')
        ? new URL(feBaseUrl)
        : new URL(feBaseUrl, process.env.REDIRECT_URI_FE || 'http://localhost:3000');

      // Thêm code vào query parameters để FE xử lý
      redirectUrl.searchParams.append('code', code);

      return res.redirect(redirectUrl.toString());

    } catch (err) {
      console.error('❌ Callback failed:', err.message);
      return res.status(401).send(`Authentication failed: ${err.message}. Vui lòng kiểm tra log backend.`);
    }
  } 

  @Public()
  @Post('exchange-code')
  @ApiOperation({
    summary: 'Trao đổi authorization code lấy token cho Frontend',
    description: 'Nhận authorization code từ Web Frontend, đổi lấy token từ Keycloak và set HTTP-only Cookie',
  })
  async exchangeCode(
    @Body() body: { code: string; redirectUri: string; codeVerifier?: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const traceId = this.createAuthTraceId();
    try {
      const { code, redirectUri, codeVerifier } = body;
      this.logger.log(
        `[KC_EXCHANGE_IN] ${JSON.stringify({
          traceId,
          method: req.method,
          url: req.originalUrl || req.url,
          ip: req.ip,
          forwardedFor: req.get('x-forwarded-for') || null,
          forwardedProto: req.get('x-forwarded-proto') || null,
          host: req.get('host') || null,
          referer: req.get('referer') || null,
          userAgent: req.get('user-agent') || null,
          hasCode: Boolean(code),
          codeLength: typeof code === 'string' ? code.length : 0,
          redirectUri: redirectUri || null,
          hasCodeVerifier: Boolean(codeVerifier),
        })}`,
      );

      const tokens = await this.authKeycloakService.getToken(code, redirectUri);
      const accessTokenMeta = this.decodeJwtMetadata(tokens.access_token);
      const idTokenMeta = this.decodeJwtMetadata(tokens.id_token);
      this.logger.log(
        `[KC_EXCHANGE_OK] ${JSON.stringify({
          traceId,
          accessToken: accessTokenMeta,
          idToken: idTokenMeta,
          hasRefreshToken: Boolean(tokens.refresh_token),
          expiresIn: tokens.expires_in || null,
          userId: (tokens as any)?.user?.user || null,
          username: (tokens as any)?.user?.username || null,
        })}`,
      );

      // x-forwarded-proto có thể là 'https, http' khi qua nhiều tầng proxy → lấy phần tử đầu
      const forwardedProtoEx = (req.get('x-forwarded-proto') || '').split(',')[0].trim();
      const isHttps = req.protocol === 'https' || forwardedProtoEx === 'https';
      const cookieOptions = {
        httpOnly: true,
        secure: isHttps,
        sameSite: (isHttps ? 'none' : 'lax') as any,
        path: '/',
        domain: this.getCookieDomain(redirectUri || process.env.REDIRECT_URI_FE || ''),
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 ngày
      };

      // === KHÔNG DÙNG COOKIE ===
      // res.cookie('token', tokens.access_token, cookieOptions);
      // if (tokens.refresh_token) {
      //     res.cookie('refresh_token', tokens.refresh_token, cookieOptions);
      // }

      // Trả về JSON cho FE Web
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Đăng nhập thành công',
        token: tokens.token, // Token hệ thống
        access_token: tokens.access_token,
        id_token: tokens.id_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        refresh_expires_in: tokens.refresh_expires_in,
        user: (tokens as any).user,
      });
    } catch (err) {
      this.logger.error(
        `[KC_EXCHANGE_ERROR] ${JSON.stringify({
          traceId,
          message: err?.message || String(err),
          status: err?.status || err?.response?.status || null,
          responseData: err?.response?.data || null,
        })}`,
      );
      console.error('❌ [Exchange Code] Lỗi:', err.message);
      throw new HttpException(
        err.message || 'Lỗi trao đổi token Keycloak cho Frontend',
        err.status || HttpStatus.UNAUTHORIZED,
      );
    }
  }

  @Public()
  @Get('me')
  async getProfile(@Req() req: Request) {
    try {
      // Ưu tiên đọc từ Authorization header
      let tokenUser = '';
      const authHeader = req.headers.authorization;
      
      if (authHeader?.startsWith('Bearer ')) {
        tokenUser = authHeader.substring(7);
      }

      // Nếu không có header, thử đọc từ cookies
      if (!tokenUser) {
        tokenUser = req.cookies['tokenUser'] || req.cookies['token'];
      }
      
      

      const token = req.cookies['token'] || tokenUser;

      if (!tokenUser) {
        return { loggedIn: false, message: 'Bạn chưa đăng nhập' };
      }

      const decoded = await verifyKeycloakToken(tokenUser);

      // Tìm user bằng keycloakUserId thay vì internal userId
      const keycloakUserId = decoded.sub;
      const userByKeycloak = await this.userRepository.findOne({
        where: { keycloakUserId: keycloakUserId },
      });

      let profileData: any;
      if (userByKeycloak) {
        // Tìm thấy user bằng keycloakUserId → dùng internal userId
        const profileDataById = await this.authService.getProfile(userByKeycloak.id);
        profileData = { ...profileDataById, keycloakLinked: true };
      } else {
        // Không tìm thấy bằng keycloakUserId → thử theo internal userId cũ
        const userId = decoded.sub || decoded.user || decoded.id;
        profileData = await this.authService.getProfile(userId);
      }

      const userObj = profileData.user;

      // ✅ Quad Check for Super Admin
      // SUPER_ADMIN env có thể là: Keycloak UUID, internal DB id, username, hoặc email
      const superAdminIdentifier = process.env.SUPER_ADMIN?.trim();
      const isSuperAdmin = superAdminIdentifier && (
        userObj?._id === superAdminIdentifier ||
        userObj?.keycloakUserId === superAdminIdentifier ||  // ← Keycloak UUID
        userObj?.username === superAdminIdentifier ||
        userObj?.emailUser === superAdminIdentifier
      );

      // Map position sang positionName dùng usersService
      const positionName = await this.usersService.getPositionName(userObj?.position);
      const {user, ...otherData} = profileData;
      return {
        ...otherData,
        isSuperAdmin: !!isSuperAdmin,
        token,
        tokenUser,
        roles: isSuperAdmin ? ['SUPER_ADMIN'] : (decoded.roles || []),
        user: {...user, positionName: positionName},
        userFromDb: { ...userObj, positionName: positionName }
      };
    } catch (err) {
      console.error("❌ Error in getProfile (/me):", err.message, err);
      if (err instanceof HttpException) {
        throw err;
      }
      // Trả về 401 Unauthorized nếu token hết hạn thay vì 400 Bad Request
      if (err.name === 'TokenExpiredError' || err.message?.includes('expired')) {
        throw new HttpException('jwt expired', HttpStatus.UNAUTHORIZED);
      }
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Public()
  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh token',
    description: 'Nhận refresh token từ Web Frontend, đổi lấy token từ Keycloak',
  })
  async refresh(@Req() req: Request, @Body('refresh_token') bodyRefreshToken: string, @Res() res: Response) {
    try {
      const rawCookieHeader = req.headers.cookie;
      // Thử lấy refresh_token từ Body hoặc Cookie (ưu tiên Body từ FE)
      let refreshToken = bodyRefreshToken || req.body?.refresh_token || req.cookies?.['refresh_token'];

      if (!refreshToken && rawCookieHeader) {
        const cookies = rawCookieHeader.split(';').reduce((acc, cookie) => {
          const [name, ...value] = cookie.split('=');
          acc[name.trim()] = value.join('=');
          return acc;
        }, {});
        refreshToken = cookies['refresh_token'];
      }

      if (!refreshToken) {
        throw new UnauthorizedException('Không tìm thấy refresh token trong cookie.');
      }

      const tokens = await this.authKeycloakService.refreshAccessToken(refreshToken);

      const isHttps = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https';
      const config = await this.authKeycloakService.getEffectiveConfig();
      const cookieOptions = { 
        httpOnly: true, 
        secure: isHttps,
        sameSite: (isHttps ? 'none' : 'lax') as any,
        path: '/',
        domain: this.getCookieDomain(config.domainFe || process.env.REDIRECT_URI_FE || ''),
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 ngày để đảm bảo persistent
      };

      // === KHÔNG DÙNG COOKIE ===
      const tokenToUse = tokens.id_token || tokens.access_token;
      // res.cookie('token', tokenToUse, cookieOptions);
      // if (tokens.refresh_token) {
      //   res.cookie('refresh_token', tokens.refresh_token, cookieOptions);
      // }

      return res.json({ 
        success: true, 
        token: tokenToUse, // id_token || access_token
        access_token: tokens.access_token, // Trả thêm access_token gốc nếu cần
        id_token: tokens.id_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        refresh_expires_in: tokens.refresh_expires_in,
      });
    } catch (err) {
      console.error("❌ Lỗi khi làm mới token:", err.message);
      throw new HttpException(err.message, HttpStatus.UNAUTHORIZED);
    }
  }

  //   @Public()
  // @Get('me')
  // async getProfile(@Req() req: Request, @Res() res: Response) {
  //   const tokenUser = req.cookies['tokenUser'];

  //   // === 1. KIỂM TRA COOKIE ===
  //   if (!tokenUser) {
  //     // const loginUrl = process.env.REDIRECT_URI_FE || 'http://localhost:8081';
  //     const loginUrl = `http://192.168.0.63:8080/realms/master/protocol/openid-connect/auth?client_id=qlqt&redirect_uri=http%3A%2F%2Flocalhost%3A3156%2Fapi%2Fauth-keycloak%2Fcallback&response_type=code&scope=openid`;
  //     return res.redirect(loginUrl);
  //   }

  //   // === 2. VERIFY TOKEN ===
  //   if (!process.env.JWT_SECRET) {
  //     throw new Error('JWT_SECRET is not defined');
  //   }

  //   let decoded: jwt.JwtPayload & { user: string; roles?: string[] };
  //   try {
  //     decoded = jwt.verify(tokenUser, process.env.JWT_SECRET) as any;
  //   } catch (error) {
  //     // Token hết hạn hoặc sai → redirect login
  //     const loginUrl = `http://192.168.0.63:8080/realms/master/protocol/openid-connect/auth?client_id=qlqt&redirect_uri=http%3A%2F%2Flocalhost%3A3156%2Fapi%2Fauth-keycloak%2Fcallback&response_type=code&scope=openid`;
  //     return res.redirect(loginUrl);
  //   }

  //   // === 3. LẤY USER TỪ DB ===
  //   try {
  //     const userFromDb = await this.userModel
  //       .findOne({ _id: new Types.ObjectId(decoded.user) })
  //       .populate('parent', 'name')
  //       .select('avatar parent')
  //       .lean();

  //     if (!userFromDb) {
  //       throw new UnauthorizedException('User not found');
  //     }

  //     const organizationName = (userFromDb.parent as any)?.name || null;

  //     return res.json({
  //       loggedIn: true,
  //       token: req.cookies['token'],
  //       tokenUser,
  //       roles: decoded.roles || [],
  //       user: { ...decoded, avatar: userFromDb.avatar || [], organizationName },
  //       userFromDb,
  //     });
  //   } catch (error) {
  //     throw new HttpException(
  //       error.message || 'Failed to fetch profile',
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }


  // @Public()
  // @LogAction('Đăng xuất')
  // @Get('logout')
  // async logout(@Req() req: Request, @Res() res: Response) {
  //   // Lấy id_token (khi login về bạn phải lưu cả id_token bên cạnh access_token)
  //   const idToken = req.cookies['id_token'];
  //   console.log("🚀 ~ AuthKeycloakController ~ logout ~ idToken:", idToken )

  //   // Xóa cookie
  //   res.clearCookie('token');
  //   res.clearCookie('id_token');

  //   const postLogoutRedirectUri = process.env.REDIRECT_URI_KEYCLOAK || '';
  //   const idpLogoutUrl = `${process.env.}/logout?id_token_hint=${idToken}&post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`;

  //   return res.redirect(idpLogoutUrl);
  // }

  //   @Public()
  // @LogAction('Đăng xuất')
  //   @Get('logout')
  //   async logout(@Req() req: Request, @Res() res: Response) {
  //     // Lấy id_token (khi login về bạn phải lưu cả id_token bên cạnh access_token)
  //     const idToken = req.cookies['id_token'];

  //     // Xóa cookie
  //     res.clearCookie('token');
  //     res.clearCookie('id_token');
  //     res.clearCookie('tokenUser');


  //     const postLogoutRedirectUri = process.env.REDIRECT_URI_FE || '';
  //     const idpLogoutUrl = `${process.env.}/logout?id_token_hint=${idToken}&post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`;

  //     return res.redirect(idpLogoutUrl);
  //   }
  @Public()
  @Get('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    const traceId = this.createAuthTraceId();
    // 1. Lấy thông tin cấu hình hiệu dụng (Ưu tiên Env, sau đó đến DB)
    const config = await this.authKeycloakService.getEffectiveConfig();
    
    // 2. Lấy id_token và redirect_uri từ query/cookie
    const idToken = req.query?.id_token || req.body?.id_token || req.cookies['id_token'];
    const queryRedirectUri = req.query?.redirect_uri as string;
    const idTokenMeta = this.decodeJwtMetadata(idToken);
    this.logger.warn(
      `[KC_LOGOUT_IN] ${JSON.stringify({
        traceId,
        method: req.method,
        url: this.redactUrl(req.originalUrl || req.url),
        ip: req.ip,
        forwardedFor: req.get('x-forwarded-for') || null,
        forwardedProto: req.get('x-forwarded-proto') || null,
        host: req.get('host') || null,
        referer: req.get('referer') || null,
        userAgent: req.get('user-agent') || null,
        hasIdToken: Boolean(idToken),
        idToken: idTokenMeta,
        queryRedirectUri: queryRedirectUri || null,
        cookieNames: Object.keys(req.cookies || {}),
      })}`,
    );
    
    // 3. Xóa cookie xác thực (nhiều options để đảm bảo xóa sạch)
    this.clearAllAuthCookies(res);

    // 4. Xây dựng URL điều hướng
    const feRedirectUrl = queryRedirectUri || config.domainFe || process.env.REDIRECT_URI_FE || '';
    const issuer = config.issuer;

    if (issuer) {
      // ✅ Dùng OIDC end_session_endpoint — Xóa session tập trung trên Keycloak
      const endSessionUrl = new URL(`${issuer}/protocol/openid-connect/logout`);
      
      // Đảm bảo URL chuyển hướng về FE là tuyệt đối
      let feRedirectUrlFixed = feRedirectUrl;
      if (feRedirectUrlFixed && !feRedirectUrlFixed.startsWith('http')) {
        const host = req.get('host');
        const protocol = req.protocol;
        feRedirectUrlFixed = `${protocol}://${host}${feRedirectUrlFixed.startsWith('/') ? '' : '/'}${feRedirectUrlFixed}`;
      }

      if (feRedirectUrlFixed) {
        // Tham số chuẩn OIDC: post_logout_redirect_uri
        endSessionUrl.searchParams.append('post_logout_redirect_uri', feRedirectUrlFixed);
      }
      
      if (idToken) {
        // Cung cấp hint cho Keycloak để không hiện màn hình xác nhận logout
        endSessionUrl.searchParams.append('id_token_hint', idToken);
      } else if (config.clientId) {
        // Dự phòng nếu mất id_token
        endSessionUrl.searchParams.append('client_id', config.clientId);
      }
      this.logger.warn(
        `[KC_LOGOUT_REDIRECT] ${JSON.stringify({
          traceId,
          issuer,
          clientId: config.clientId || null,
          postLogoutRedirectUri: feRedirectUrlFixed || null,
          hasIdTokenHint: Boolean(idToken),
          idToken: idTokenMeta,
          redirectTo: this.redactUrl(endSessionUrl.toString()),
        })}`,
      );
      return res.redirect(endSessionUrl.toString());
    }

    // Fallback nếu hoàn toàn mất config issuer
    console.warn('⚠ [Logout] Mất cấu hình issuer, chỉ xóa cookie cục bộ.');
    this.logger.warn(
      `[KC_LOGOUT_LOCAL_ONLY] ${JSON.stringify({
        traceId,
        reason: 'missing_issuer',
        redirectUri: feRedirectUrl || '/',
      })}`,
    );
    return res.redirect(feRedirectUrl || '/');
  }

  /**
   * Xóa session khi chuyển chế độ login (VD: Keycloak → Local)
   * FE gọi endpoint này trước khi chuyển sang login local
   */
  @Public()
  @Get('clear-session')
  async clearSession(@Res() res: Response) {
    this.clearAllAuthCookies(res);
    return res.json({ success: true, message: 'Đã xóa session.' });
  }

  /**
   * Helper: Xóa tất cả cookie xác thực với nhiều options khác nhau
   * để đảm bảo xóa sạch bất kể cookie được set với options nào
   */
  private clearAllAuthCookies(res: Response) {
    const cookieNames = ['token', 'id_token', 'tokenUser', 'refresh_token'];
    const optionsList = [
      { httpOnly: true, secure: true, sameSite: 'none' as const },
      { httpOnly: true, secure: false },
      { httpOnly: true },
      {},
    ];

    for (const name of cookieNames) {
      for (const opts of optionsList) {
        res.clearCookie(name, opts);
      }
    }
  }

  private createAuthTraceId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private decodeJwtMetadata(token: unknown): Record<string, unknown> | null {
    if (typeof token !== 'string' || !token) return null;

    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || typeof decoded !== 'object') return null;

      return {
        sid: decoded.sid || null,
        sub: decoded.sub || null,
        iss: decoded.iss || null,
        aud: decoded.aud || null,
        azp: decoded.azp || null,
        typ: decoded.typ || decoded.type || null,
        preferred_username: decoded.preferred_username || decoded.username || null,
        iat: decoded.iat || null,
        exp: decoded.exp || null,
        auth_time: decoded.auth_time || null,
        jti: decoded.jti || null,
      };
    } catch (err) {
      return {
        decodeError: err?.message || String(err),
      };
    }
  }

  private redactUrl(url: string | undefined): string | null {
    if (!url) return null;

    try {
      const parsed = new URL(url, 'http://local.invalid');
      for (const sensitiveParam of [
        'id_token',
        'id_token_hint',
        'access_token',
        'refresh_token',
        'token',
        'code',
        'client_secret',
      ]) {
        if (parsed.searchParams.has(sensitiveParam)) {
          parsed.searchParams.set(sensitiveParam, '[REDACTED]');
        }
      }

      const redacted = parsed.toString();
      return url.startsWith('http') ? redacted : `${parsed.pathname}${parsed.search}`;
    } catch {
      return url.replace(/([?&](?:id_token|id_token_hint|access_token|refresh_token|token|code|client_secret)=)[^&]+/gi, '$1[REDACTED]');
    }
  }

  private getCookieDomain(feUrl: string): string | undefined {
    if (process.env.COOKIE_DOMAIN) return process.env.COOKIE_DOMAIN;
    if (!feUrl || feUrl === '/' || feUrl.includes('localhost')) return undefined;

    try {
      const url = new URL(feUrl.startsWith('http') ? feUrl : `https://${feUrl}`);
      const hostname = url.hostname;
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        // doffice-uat.snp.com.vn -> .snp.com.vn
        return `.${parts.slice(1).join('.')}`;
      }
      return hostname;
    } catch (e) {
      return undefined;
    }
  }
}
