import {
  Injectable,
  NestMiddleware,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { NetworkAdministrationService } from 'src/networkAdministration/network-administration.service';

/**
 * Chuẩn hóa địa chỉ IP.
 * Chuyển đổi '::1' và '::ffff:127.0.0.1' thành '127.0.0.1'.
 * @param ip Địa chỉ IP đầu vào.
 * @returns Địa chỉ IP đã được chuẩn hóa.
 */
function normalizeIp(ip: string | undefined): string {
  if (!ip) return '';
  if (ip === '::1' || ip === '::ffff:127.0.0.1') return '127.0.0.1';
  // Loại bỏ tiền tố '::ffff:' cho các địa chỉ IPv4-mapped IPv6 khác
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  return ip;
}

@Injectable()
export class IpBlockMiddleware implements NestMiddleware {
  private readonly logger = new Logger(IpBlockMiddleware.name);

  constructor(
    private readonly networkAdminService: NetworkAdministrationService,
  ) { }

  async use(req: Request, res: Response, next: NextFunction) {
    const clientIp = normalizeIp(req.socket.remoteAddress);

    // const blockedIps = await this.networkAdminService.getBlockedIps();

    // if (blockedIps.includes(clientIp)) {
    //   this.logger.warn(`Đã chặn truy cập từ IP: ${clientIp}`);
    //   // Thay vì throw exception, chúng ta sẽ gửi về một trang HTML.
    //   res.status(403).send(`
    //     <!DOCTYPE html>
    //     <html lang="vi">
    //     <head>
    //         <meta charset="UTF-8">
    //         <meta name="viewport" content="width=device-width, initial-scale=1.0">
    //         <title>Truy cập bị từ chối</title>
    //         <style>
    //             body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f0f2f5; color: #333; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; text-align: center; }
    //             .container { padding: 40px; background-color: #fff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 500px; width: 90%; }
    //             h1 { color: #d9534f; font-size: 24px; margin-bottom: 10px; }
    //             p { font-size: 16px; color: #555; }
    //         </style>
    //     </head>
    //     <body>
    //         <div class="container">
    //             <h1>Truy cập bị từ chối</h1>
    //             <p>Dải mạng của bạn không có quyền truy cập phần mềm.</p>
    //         </div>
    //     </body>
    //     </html>
    //   `);
    //   return; // Dừng xử lý các middleware và route handler tiếp theo.
    //   // Chuyển hướng người dùng đến một trang lỗi cụ thể trên frontend.
    //   // URL này cần được định nghĩa trong ứng dụng frontend của bạn.
    //   // Ví dụ: http://your-frontend-app.com/access-denied
    //   //   res.redirect('/access-denied');
    //   //   return;
    // }

    next();
  }
}