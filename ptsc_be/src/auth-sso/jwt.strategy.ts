import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';

const cookieExtractor = (req: any) => {
  const v = req?.cookies?.tokenUser || req?.cookies?.token;
  return (typeof v === 'string' && v.split('.').length === 3) ? v : null;
};

import * as jwt from 'jsonwebtoken';

const customSecretOrKeyProvider = (req: any, rawJwtToken: any, done: any) => {
  try {
    const decoded = jwt.decode(rawJwtToken, { complete: true }) as any;
    if (decoded?.header?.alg === 'HS256') {
      return done(null, process.env.JWT_SECRET || '0a6b944d-d2fb-46fc-a85e-0295c986cd9f');
    }
  } catch {
    // ignore
  }
  const keyProvider = passportJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/certs`,
  });
  return keyProvider(req, rawJwtToken, done);
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt-cookie') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepo: Repository<UserEntity>,
  ) {
    super({
      // Prefer header first so Postman Bearer tests always work; cookie as fallback
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKeyProvider: customSecretOrKeyProvider,
      algorithms: ['RS256', 'HS256'],
    });
  }

  async validate(payload: any) {
    const keycloakUserId = payload.sub;
    const directUserId = payload.id || payload.user;
    const preferredUsername = payload.preferred_username || payload.username;

    let user: UserEntity | null = null;

    if (keycloakUserId) {
      user = await this.userRepo.findOne({
        where: [{ keycloakUserId: keycloakUserId }, { id: keycloakUserId }],
        select: ['id', 'status'],
      });
    }

    if (!user && directUserId) {
      user = await this.userRepo.findOne({
        where: { id: directUserId },
        select: ['id', 'status'],
      });
    }

    if (!user && preferredUsername) {
      user = await this.userRepo.findOne({
        where: { username: preferredUsername },
        select: ['id', 'status'],
      });

      if (!user) {
        const fullName = `${payload.given_name || ''} ${payload.family_name || ''}`.trim() || preferredUsername;
        const hashedPassword = await bcrypt.hash('12345678', 10);

        const newUser = this.userRepo.create({
          id: uuidv4(),
          name: fullName,
          username: preferredUsername,
          emailUser: payload.email,
          keycloakUserId: keycloakUserId || undefined,
          status: 1, // STATUS.ACTIVED
          password: hashedPassword,
          createdAt: new Date(),
        });

        user = await this.userRepo.save(newUser);
      } else if (keycloakUserId && !user.keycloakUserId) {
        await this.userRepo.update(user.id, { keycloakUserId: keycloakUserId });
      }
    }

    if (!user) {
      throw new UnauthorizedException('Không tìm thấy tài khoản người dùng tương ứng với token.');
    }

    return { userId: user.id };
  }
}

