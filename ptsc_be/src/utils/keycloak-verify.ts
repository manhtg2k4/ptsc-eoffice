import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';

const keycloakJwksClient = jwksClient({
  jwksUri: `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/certs`,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
});

function getKey(header: any, callback: any) {
  keycloakJwksClient.getSigningKey(header.kid, function(err: any, key: any) {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Xác thực token: Ưu tiên Keycloak RS256 qua jwks-rsa,
 * nếu không được (hoặc token nội bộ HS256) sẽ fallback sang xác thực bằng JWT_SECRET.
 */
export function verifyKeycloakToken(token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    // 1. Kiểm tra thuật toán trong header trước nếu có
    const decodedHeader = jwt.decode(token, { complete: true }) as any;
    const alg = decodedHeader?.header?.alg;

    if (alg === 'HS256') {
      const secret = process.env.JWT_SECRET || '0a6b944d-d2fb-46fc-a85e-0295c986cd9f';
      return jwt.verify(token, secret, { algorithms: ['HS256'] }, (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded);
      });
    }

    // 2. Thử xác thực qua Keycloak RS256
    jwt.verify(token, getKey as any, { algorithms: ['RS256'] }, (err, decoded) => {
      if (!err && decoded) {
        return resolve(decoded);
      }
      // 3. Fallback xác thực bằng local secret nếu RS256 lỗi
      const secret = process.env.JWT_SECRET || '0a6b944d-d2fb-46fc-a85e-0295c986cd9f';
      jwt.verify(token, secret, { algorithms: ['HS256'] }, (err2, decoded2) => {
        if (!err2 && decoded2) {
          return resolve(decoded2);
        }
        reject(err || err2);
      });
    });
  });
}
