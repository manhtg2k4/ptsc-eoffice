// import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
// import { JwtService } from '@nestjs/jwt';
// import { HttpService } from '@nestjs/axios';
// import { firstValueFrom } from 'rxjs';
// import * as jwt from 'jsonwebtoken';
// import * as config from 'config';
// import { InjectModel } from '@nestjs/mongoose';
// // import { User, UserDocument } from 'src/user/user.schema';
// import { OrganizationUnit, OrganizationUnitDocument } from 'src/organization-unit/organization-unit.schema';
// import { Model } from 'mongoose';
// import axios from 'axios';
// import * as https from 'https';

// @Injectable()
// export class OauthService {
//     private readonly logger = new Logger(OauthService.name);

//     constructor(
//         private readonly jwtService: JwtService,
//         private readonly httpService: HttpService,
//         @InjectModel(User.name)
//         private readonly userModel: Model<UserDocument>,
//         @InjectModel(OrganizationUnit.name)
//         private readonly organizationUnitModel: Model<OrganizationUnitDocument>,
//     ) { }

//     removeVietnameseAccents(text: string): string {
//         return text
//             .normalize("NFD") // Tách dấu khỏi ký tự gốc
//             .replace(/[\u0300-\u036f]/g, "") // Xóa dấu
//             .replace(/đ/g, "d") // Chuyển đ → d
//             .replace(/Đ/g, "D") // Chuyển Đ → D
//             .toLowerCase(); // Chuyển về chữ thường
//     }

//     async callbackLifeSSO(access_token: string) {
//         try {
//             // 🟢 Giải mã access_token để lấy userId
//             const decodedToken: any = jwt.decode(access_token);

//             if (!decodedToken) {
//                 throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
//             }
//             const userId = decodedToken.sub.split('@')[0];
//             // 🟢 Gọi API lấy thông tin user từ SCIM2
//             const credentials = Buffer.from('admin:admin').toString('base64');
//             const agent = new https.Agent({ rejectUnauthorized: false });
//             const scim2Url = `${SCIM2_API} eq "${userId}"`;
//             this.logger.log(`Fetching user data from: ${scim2Url}`);

//             const config = {
//                 httpsAgent: agent, // ⚡️ Thêm vào đây để bỏ kiểm tra SSL
//                 headers: {
//                     Authorization: `Basic ${credentials}`,
//                     'Content-Type': 'application/json',
//                 },
//             };
//             const userResponse = await axios.get(scim2Url, config);
//             if (userResponse.data.totalResults === 0) {
//                 throw new HttpException('User not found', HttpStatus.NOT_FOUND);
//             }

//             const userData = userResponse.data.Resources[0];

//             // 🟢 Lấy thông tin tổ chức
//             const organizationUnitCode = userData.groups?.[0]?.display ?? 'DEFAULT_GROUP';

//             // 🟢 Kiểm tra và tạo tổ chức nếu chưa tồn tại
//             let organizationUnit: OrganizationUnitDocument | null = await this.organizationUnitModel.findOne({ code: organizationUnitCode });
//             if (!organizationUnit) {
//                 organizationUnit = new this.organizationUnitModel({
//                     name: organizationUnitCode,
//                     code: organizationUnitCode,
//                     type: 'department',
//                     priority: 1,
//                     createdAt: new Date(),
//                 });
//                 await organizationUnit.save();
//             }

//             // 🟢 Gọi API lấy thông tin user từ access_token
//             const userInfoResponse = await firstValueFrom(
//                 this.httpService.get(USER_INFO_API, {
//                     headers: { Authorization: `Bearer ${access_token}` },
//                     httpsAgent: agent,
//                 }),
//             );
//             const { email, username, sub } = userInfoResponse.data;

//             // 🟢 Kiểm tra và cập nhật nhân sự
//             let userRecord: UserDocument | any = await this.userModel.findOne({ email });

//             if (!userRecord) {
//                 userRecord = new this.userModel({
//                     email,
//                     username,
//                     name: username,
//                     code: this.removeVietnameseAccents(username),
//                     organizationUnit: organizationUnit._id,
//                     user: {
//                         userId: sub,
//                         accessToken: access_token,
//                         expiresIn: process.env.EXPIRES_IN_TOKEN,
//                     },
//                     createdAt: new Date(),
//                 });

//                 await userRecord.save();
//             } else {
//                 userRecord.organizationUnit = userRecord.organizationUnit ?? {};
//                 userRecord.organizationUnit.organizationUnitId = organizationUnit._id;
//                 userRecord.organizationUnit.name = organizationUnit.name;

//                 userRecord.user = userRecord.user ?? {};
//                 userRecord.user.accessToken = access_token;
//                 userRecord.user.expiresIn = process.env.EXPIRES_IN_TOKEN;

//                 userRecord.updatedAt = new Date();
//                 await userRecord.save();
//             }

//             // 🟢 Tạo token mới
//             const tokenPayload = {
//                 user: userRecord._id,
//                 username: userRecord.username,
//                 email: userRecord.email,
//             };


//             if (!process.env.JWT_SECRET) {
//                 throw new Error('JWT_SECRET is not defined');
//             }
//             const secret = process.env.JWT_SECRET as string;
//             const token = jwt.sign(tokenPayload, secret, { expiresIn: (process.env.EXPIRES_IN_TOKEN as string) || '24h' } as any);

//             userRecord.user.accessToken = token;
//             await userRecord.save();

//             return {
//                 success: true,
//                 message: 'Login successful',
//                 token,
//                 user: tokenPayload,
//             };
//         } catch (error) {
//             this.logger.error('Error in callbackLifeSSO:', error.message);

//             throw new HttpException(
//                 {
//                     success: false,
//                     message: 'Failed to process user information',
//                     error: error.message,
//                 },
//                 HttpStatus.INTERNAL_SERVER_ERROR,
//             );
//         }
//     }

// }
