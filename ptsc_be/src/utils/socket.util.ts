import { Socket } from 'socket.io';

/**
 * Hàm dùng chung để trích xuất JWT Token từ handshake của Socket.IO
 * Hỗ trợ: handshake.auth, Authorization header và Cookie
 */
export function extractSocketToken(client: Socket): string | undefined {
  // 1. Ưu tiên lấy từ auth.token (Dành cho Socket.IO client config)
  if (client.handshake.auth?.token) return client.handshake.auth.token;

  // 2. Thử lấy từ Authorization Header (Bearer token)
  const authHeader = client.handshake.headers?.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '');
  }

  // 3. Thử lấy từ Cookie (Hỗ trợ OIDC flow trả về cookies như tokenUser hoặc token)
  const cookieHeader = client.handshake.headers?.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc: Record<string, string>, curr) => {
      const [key, value] = curr.split('=').map(c => c.trim());
      if (key && value) acc[key] = value;
      return acc;
    }, {});
    
    // Trả về tokenUser (thường dùng trong hệ thống hiện tại) hoặc token (hợp lệ cho Keycloak)
    return cookies['tokenUser'] || cookies['token'];
  }

  return undefined;
}
