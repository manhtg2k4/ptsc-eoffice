import { Body, Controller, HttpStatus, Inject, Post, Req, Res, UnauthorizedException, InternalServerErrorException, Get, BadRequestException, ForbiddenException, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SignOtpService } from './sign-otp.service';
import { EffectiveUser } from 'src/authority-documents';
import { Request, Response } from 'express';
import { SendOtpDto } from './dto/SendOtpDto';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { UsersService } from 'src/users/users.service';
import * as jwt from 'jsonwebtoken';
import { UserEntity } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { FilesViewPermissionGuard } from 'src/files-managerment/guards/files-view-permission.guard';

@ApiTags('Sign OTP')
@Controller('sign-otp')
export class SignOtpController {
    constructor(private readonly signOtpService: SignOtpService,
        @Inject('MSSQL_REPO') private readonly repo: MSSQLRepository,
        private readonly usersService: UsersService,
        @InjectRepository(UserEntity, 'mssqlConnection')
        private readonly userRepository: Repository<UserEntity>,
    ) { }
    private async createTokenForSign(userId: string): Promise<string> {
        try {
            if (!userId) {
                throw new UnauthorizedException('Không xác định được user để tạo token');
            }

            const keySign = await this.repo.getSigningConfig();
            const secret = keySign?.secretSign || process.env.SECRET_SIGN;
            if (!secret) {
                console.error('SECRET_SIGN is not configured');
                throw new InternalServerErrorException('Server chưa cấu hình SECRET_SIGN');
            }
            const expiresIn = keySign?.expiresIn || (process.env.EXPIRES_IN_TOKEN_SIGN as string) || '300s';

            const data = await this.usersService.findById(userId);
            // Sign a minimal payload to avoid serializing the full request user object
            const payload = {
                userId: data.id,
                username: data.username,
                email: data.emailUser,
                phoneNumber: data.phoneNumberUser || null,
                iss: process.env.REDIRECT_URI_FE,
                sub: 'service:document-service',
                aud: ['signing-service']
            };
            return jwt.sign(payload, secret, { expiresIn } as any);
        } catch (error) {
            console.error('createTokenForSign', error)
            throw error;
        }
    }
    @Get('request-otp')
    async requestOtp(@Res() res: Response,
        @EffectiveUser() userId: string, @Req() req: Request) {
        try {
            const serviceID = req.headers['x-service-id'] as string;
            const authHeader = req.headers['authorization'] as string;
            if (!authHeader) {
                throw new BadRequestException('Missing authorization header');
            }
            const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
            
            const user = await this.usersService.findById(userId);
            const phone = user?.phoneNumberUser;
            const email = user?.emailUser;
            const userName = user?.username;
            console.log('------------------------user--------------------', user)

            const result = await this.signOtpService.requestOtp({ token, serviceID, phone, email, userName });
            const status = result?.success === false ? HttpStatus.BAD_REQUEST : HttpStatus.OK;
            return res.status(status).json(result);
        } catch (error) {
            const errorResponse = error?.response || error?.getResponse?.();
            const message = errorResponse?.message || error?.message || 'Gửi OTP thất bại';
            return res.status(error?.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message,
                error: message,
            });
        }
    }

    @Post('verify-otp')
    async verifyOtp(@Res() res: Response, @Body() dto: SendOtpDto, @EffectiveUser() userId: string, @Req() req: Request) {
        try {
            const serviceID = req.headers['x-service-id'] as string;
            const authHeader = req.headers['authorization'] as string;
            if (!authHeader) {
                throw new BadRequestException('Missing authorization header');
            }
            const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

            const user = await this.usersService.findById(userId);
            const userName = user?.username;

            const result = await this.signOtpService.verifyOtp({ otpDto: dto, token, serviceID, userName });
            return res.status(200).json(result);
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    // @Post('sign-otp')
    // @ApiOperation({ summary: 'Ký file' })
    // async signOTP(
    //     @Body() dto: SignFileOtpDto,
    //     @Headers() headers: any,
    //     @Req() req,
    //     @OriginalUser() originalUser: string,
    // ) {
    //     try {
    //         const serviceId = headers['x-service-id'] as string;
    //         const tokenSigning = headers['token-signing'] as string;
    //         const userId = req.user?.userId;
    //         let userDoc;
    //         // paraphSignImage Ảnh chữ ký nháy có nền
    //         // paraphSignTransparentImage Ảnh chữ ký nháy không nền
    //         // contentSignImage Ảnh chữ ký phê duyệt
    //         //stampSignImage Ảnh chữ ký đóng dấu
    //         const tokenAccessSign = await this.createTokenForSign(userId);
    //         if (userId) {
    //             userDoc = await this.userRepository.findOne({
    //                 where: { id: userId },
    //                 select: ['username', 'emailUser', 'stampSignImage', 'contentSignImage', 'paraphSignImage', 'paraphSignTransparentImage'],
    //             });
    //         }
    //         if (!tokenSigning) {
    //             throw new BadRequestException('Missing token-signing header');
    //         }
    //         let imageId;
    //         if (dto.type === 'signFormatDraft' || dto.type === 'signContentDraft' || dto.type === 'signCopy') {
    //             if (dto?.isBackground) {
    //                 imageId = userDoc?.paraphSignImage;
    //             }
    //             else {
    //                 imageId = userDoc?.paraphSignTransparentImage;
    //             }
    //         }
    //         else if (dto.type === 'reportSigner') {
    //             imageId = userDoc?.contentSignImage;
    //         }
    //         else if (dto.type === 'stampDoc') {
    //             imageId = userDoc?.stampSignImage
    //         }
    //         const token = dto?.tokenAccessSign;

    //         return this.signOtpService.signOTP({
    //             dto: dto,
    //             serviceId: serviceId,
    //             tokenSigning: tokenSigning,
    //             token: token,
    //             userId: userId,
    //             originalUser: originalUser,
    //             imageId: imageId,
    //             tokenAccessSign: tokenAccessSign
    //         }
    //         );
    //     } catch (error) {
    //         console.error('❌ [sign-otp] Controller error:', error.message);
    //         if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
    //             throw error;
    //         }
    //         throw new BadRequestException(`OTP signing failed: ${error.message}`);
    //     }
    // }

    // @Post('sign-batch')
    // async signBatch(
    //     @Body() dto: SignFilesOtpDto,
    //     @Headers() headers: any,
    //     @Req() req,
    //     @OriginalUser() originalUser: string,
    // ) {
    //     try {
    //         const serviceId = headers['x-service-id'] as string;
    //         const tokenSigning = headers['token-signing'] as string;
    //         const userId = req.user?.userId;
    //         let userDoc;
    //         // paraphSignImage Ảnh chữ ký nháy có nền
    //         // paraphSignTransparentImage Ảnh chữ ký nháy không nền
    //         // contentSignImage Ảnh chữ ký phê duyệt
    //         //stampSignImage Ảnh chữ ký đóng dấu
    //         const tokenAccessSign = await this.createTokenForSign(userId);
    //         if (userId) {
    //             userDoc = await this.userRepository.findOne({
    //                 where: { id: userId },
    //                 select: ['username', 'emailUser', 'stampSignImage', 'contentSignImage', 'paraphSignImage', 'paraphSignTransparentImage'],
    //             });
    //         }
    //         if (!tokenSigning) {
    //             throw new BadRequestException('Missing token-signing header');
    //         }
    //         let imageId;
    //         if (dto.type === 'signFormatDraft' || dto.type === 'signContentDraft' || dto.type === 'signCopy') {
    //             if (dto?.isBackground) {
    //                 imageId = userDoc?.paraphSignImage;
    //             }
    //             else {
    //                 imageId = userDoc?.paraphSignTransparentImage;
    //             }
    //         }
    //         else if (dto.type === 'reportSigner') {
    //             imageId = userDoc?.contentSignImage;
    //         }
    //         else if (dto.type === 'stampDoc') {
    //             imageId = userDoc?.stampSignImage
    //         }
    //         const token = dto?.tokenAccessSign;
    //         return this.signOtpService.signBatch({
    //             dto: dto,
    //             serviceId: serviceId,
    //             tokenSigning: tokenSigning,
    //             token: token,
    //             userId: userId,
    //             originalUser: originalUser,
    //             imageId: imageId,
    //             tokenAccessSign: tokenAccessSign
    //         }
    //         );
    //     } catch (error) {
    //         console.error('❌ [sign-batch] Controller error:', error.message);
    //         if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
    //             throw error;
    //         }
    //         throw new BadRequestException(`Batch signing failed: ${error.message}`);
    //     }
    // }

    @Post('check-files-signatures')
    @UseGuards(FilesViewPermissionGuard)
    @ApiOperation({ summary: 'Kiểm tra trạng thái ký số của một danh sách các file' })
    async checkFilesSignatureStatus(
        @Res() res: Response,
        @Req() req: any,
        @Body() body: { fileIds: (string | number)[]; verifyContent?: boolean }
    ) {
        try {
            const userId = req?.authorizedUser || req?.user?.userId || req?.user?.id;
            const { fileIds, verifyContent } = body;
            const result = await this.signOtpService.checkFilesSignatureStatus(fileIds, userId, verifyContent);
            return res.status(HttpStatus.OK).json(result);
        } catch (error) {
            console.error('❌ [check-files-signatures] Controller error:', error.message);
            if (error instanceof ForbiddenException) {
                throw error;
            }
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message
            });
        }
    }

    @Get('verify-pdf/:fileId')
    @ApiOperation({ summary: 'Kiểm tra chữ ký số trong file PDF' })
    async verifyPdfSignature(@Res() res: Response, @Req() req: any) {
        try {
            const fileId = req.params.fileId;
            const userId = req?.authorizedUser || req?.user?.userId || req?.user?.id;
            if (!userId) {
                throw new ForbiddenException('Khong xac dinh duoc nguoi dung');
            }
            const result = await this.signOtpService.verifyPdfSignature(fileId, userId);
            return res.status(HttpStatus.OK).json(result);
        } catch (error) {
            console.error('❌ [verify-pdf] Controller error:', error.message);
            if (error instanceof BadRequestException || error instanceof InternalServerErrorException || error instanceof ForbiddenException) {
                throw error;
            }
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message
            });
        }
    }
}
