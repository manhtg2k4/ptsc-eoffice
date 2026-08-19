import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { SendOtpDto } from './dto/SendOtpDto';
import axios from 'axios';
import { FilesManagementService } from 'src/files-managerment/files-management-mssql.service';
import { ConnectionPool } from 'mssql';
import { getMssqlPool } from 'src/database/mssql.pool';
import { ConfigService } from '@nestjs/config';
import * as sql from 'mssql';
import * as fsPromises from 'fs/promises'; // Import fs.promises for async file operations
import { WorkItemsService } from 'src/work-items/work-items.service';
import { FilesRepository } from 'src/files-managerment/repositories/files.repository';
import * as verifyPdfLib from '@ninja-labs/verify-pdf';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class SignOtpService {
    private pool: ConnectionPool | null = null;
    private dbname: string;
    private readonly logger = new Logger(SignOtpService.name);
    private readonly verifyPdfCacheTtlMs = 5 * 60 * 1000;
    private readonly verifyPdfCacheMaxEntries = 200;
    private readonly verifyPdfSignatureCache = new Map<string, { expiresAt: number; value: any }>();
    private readonly verifyPdfSignaturePending = new Map<string, Promise<any>>();
    constructor(
        private readonly fileService: FilesManagementService,
        private readonly workItemsService: WorkItemsService,
        private readonly configService: ConfigService,
        private readonly filesRepository: FilesRepository,
        private readonly usersService: UsersService,
    ) {
        this.dbname = this.configService.get<string>('SQLSERVER_DATABASE') || '';
    }
    private async getMsPool(): Promise<ConnectionPool> {
        // Nếu đã có pool instance và nó còn sống thì trả về luôn
        if (this.pool?.connected) {
            return this.pool;
        }

        // Nếu pool disconnected, cố gắng reconnect
        if (this.pool && !this.pool.connected && !this.pool.connecting) {
            console.warn('[MSSQL] Pool disconnected, attempting to reconnect...');
            try {
                await this.pool.connect();
                return this.pool;
            } catch (err) {
                console.error('[MSSQL] Reconnect failed, creating new pool...', err);
                try {
                    await this.pool.close();
                } catch { }
                this.pool = null;
            }
        }

        // Nếu chưa có hoặc reconnect failed, tạo pool mới
        this.pool = await getMssqlPool(this.configService);

        if (!this.pool.connected) {
            throw new InternalServerErrorException('MSSQL pool not connected');
        }

        return this.pool;
    }
    async requestOtp({ token, serviceID, phone, email, userName }: { token: string, serviceID: string, phone?: string, email?: string, userName?: string }) {
        // const url =
        // `https://kysotaptrung-service.lifetex.vn/api/sign/request-otp`;
        const url =
            `${process.env.URL_SERVICE_SIGNING}api/sign/request-otp`;

        try {
            const data: { username?: string; email?: string; phoneNumber?: string } = {};
            if (userName) data.username = userName;
            if (email) data.email = email;
            if (phone) data.phoneNumber = phone;

            const response = await axios.post(
                url,
                data,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'x-service-id': serviceID,
                        'Content-Type': 'application/json',
                    },
                },
            );

            return response.data;
        } catch (error) {
            if (error.response) {
                this.logger.warn(
                    `[requestOtp] Signing service returned ${error.response.status}: ${JSON.stringify(error.response.data)}`,
                );
                return error.response.data || {
                    success: false,
                    message: 'Signing service request OTP failed',
                };
            }

            this.logger.error(
                `[requestOtp] Failed to call signing service: ${error.message}`,
                error.stack,
            );
            throw new Error(`Failed to call external API: ${error.message}`);
        }
    }

    async verifyOtp({ otpDto, token, serviceID, userName }: { otpDto: SendOtpDto, token: string, serviceID: string, userName?: string }) {
        // const url = `https://kysotaptrung-service.lifetex.vn/api/sign/verify-otp`;
        const url = `${process.env.URL_SERVICE_SIGNING}api/sign/verify-otp`;

        try {
            const response = await axios.post(
                url,
                {
                    otp: otpDto.otp,
                    username: userName,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'x-service-id': serviceID,
                        'Content-Type': 'application/json',
                    },
                },
            );

            return response.data;
        } catch (error) {
            if (error?.response?.data?.message) {
                throw new BadRequestException(error?.response?.data);
            }
            console.error('Error calling verify-otp API:', error.message);

            if (error.response) {
                throw new Error(
                    `External API Error: ${JSON.stringify(error.response.data)}`,
                );
            }

            throw new Error(`Failed to call external API: ${error.message}`);
        }
    }



    // async signOTP({ dto, serviceId, tokenSigning, token, userId, originalUser, imageId, tokenAccessSign }:
    //     { dto: SignFileOtpDto, serviceId: string, tokenSigning: string, token: string, userId: string, originalUser: string, imageId: string, tokenAccessSign: string }) {

    //     // 1. FAIL-FAST: Validate Config trước khi làm bất kì tác vụ nặng nào
    //     if (!process.env.URL_SERVICE_SIGNING) {
    //         throw new InternalServerErrorException('Chưa cấu hình biến môi trường URL_SERVICE_SIGNING');
    //     }
    //     const { docId, id, type, actionCode, workItemId, keyword, isOTP, isIncommingDoc } = dto;
    //     let objectType = isIncommingDoc ? 'incommingdocument' : 'docDraft';
    //     const isOTPBoolean = isOTP ?? true;

    //     // 2. SONG SONG HOÁ TRUY VẤN CSDL: Lấy Image và Document File Info đồng thời
    //     const [imageInsert, fileData] = await Promise.all([
    //         this.fileService.getFileForView(+imageId),
    //         this.fileService.getFileForView(+id)
    //     ]);

    //     if (!imageInsert || !imageInsert.fileBuffer) {
    //         throw new BadRequestException(`Không tìm thấy ảnh chữ ký của người dùng`);
    //     }
    //     if (!fileData) {
    //         throw new BadRequestException(`Không tìm thấy file ID ${id}`);
    //     }

    //     // 3. XÁC ĐỊNH URL ENDPOINT SỚM VÀ CẤU TRÚC JSON
    //     let URL_SIGN = '';
    //     const formData = new FormData();
    //     const cleanType = type.trim();

    //     switch (cleanType) {
    //         case 'signContentDraft':
    //         case 'reportSigner':
    //         case 'stampDoc':
    //         case 'signCopy':
    //             URL_SIGN = `${process.env.URL_SERVICE_SIGNING}api/${isOTPBoolean ? 'sign' : 'desktop'}/document-with-image`;
    //             if (!keyword) throw new BadRequestException(`Không tìm thấy từ khóa ký số`);

    //             const pWidth = cleanType === 'signContentDraft' ? 60 : 100;
    //             const pHeight = cleanType === 'signContentDraft' ? 40 : 80;

    //             const imageMetadata = [{
    //                 keyWord: `${keyword}`,
    //                 imagesBase: imageInsert.fileBuffer.toString('base64'),
    //                 width: pWidth,
    //                 height: pHeight,
    //             }];
    //             formData.append('imageMetadata', JSON.stringify(imageMetadata));
    //             break;

    //         case 'signFormatDraft':
    //             URL_SIGN = `${process.env.URL_SERVICE_SIGNING}api/${isOTPBoolean ? 'sign' : 'desktop'}/document-formal-initial-signature`;
    //             formData.append('base64Image', imageInsert.fileBuffer.toString('base64'));
    //             break;

    //         default:
    //             throw new BadRequestException('Thể loại ký không lệ. Cần là "digital" hoặc "draft".');
    //     }

    //     // 4.TỐI ƯU HOÁ ĐỌC FILE NGUỒN (Dùng Stream nếu có đường dẫn, thay vì load full Buffer vào RAM)
    //     let fileToAppend: any; // Có thể chứa stream hoặc Buffer
    //     if (fileData.fileBuffer) {
    //         fileToAppend = fileData.fileBuffer;
    //     } else if (fileData.fullPath) {
    //         // [Tối ưu] Stream dữ liệu thẳng thay vì fsPromises.readFile gây tốn RAM 
    //         fileToAppend = fs.createReadStream(fileData.fullPath);
    //     } else {
    //         throw new BadRequestException(`Không thể đọc nội dung file ID ${id}`);
    //     }

    //     formData.append('file', fileToAppend, {
    //         filename: fileData.filename,
    //         contentType: fileData.mimetype,
    //     });
    //     formData.append('username', dto.username);
    //     formData.append('password', dto.password);
    //     formData.append('reason', dto.reason || 'Ký số điện tử');
    //     formData.append('location', dto.location || 'Việt Nam');
    //     formData.append('signatureLevel', dto.signatureLevel || 'B');

    //     // 5. GỌI API KÝ SỐ CHIẾM THỜI GIAN LỚN (Lúc này CHƯA mở Transaction SQL)
    //     const signResponse = await axios.post(URL_SIGN, formData, {
    //         headers: {
    //             ...formData.getHeaders(),
    //             'Authorization': `Bearer ${token}`,
    //             'Token-signing': tokenAccessSign,
    //             'X-Service-Id': serviceId || '',
    //         },
    //         responseType: 'arraybuffer',
    //         timeout: 120000,
    //     });

    //     const item = signResponse;
    //     const signedBase64 = item?.data || item;
    //     if (!signedBase64) throw new InternalServerErrorException('API không trả về dữ liệu file đã ký');
    //     const signedBuffer = Buffer.from(signedBase64);

    //     // Xác định tên file
    //     let fileName = fileData.filename || "signed.pdf";
    //     const contentDisposition = signResponse.headers?.["content-disposition"];
    //     if (contentDisposition) {
    //         const match = contentDisposition.match(/filename[^;=\n]*=(?:(['"]).*?\1|[^;\n]*)/);
    //         if (match && match[0]) {
    //             fileName = match[0].replace(/filename[^=]*=/, "").replace(/['"]/g, "").split("\\").pop() || fileName;
    //         }
    //     }

    //     // Xử lý File Tạm để Upload
    //     const uploadBase = path.join(process.cwd(), 'upload');
    //     const tmpDir = path.join(uploadBase, 'tmp-signing');
    //     await fsPromises.mkdir(tmpDir, { recursive: true });

    //     const tmpPath = path.join(tmpDir, `${id}-${Date.now()}.pdf`);
    //     await fsPromises.writeFile(tmpPath, signedBuffer);

    //     const pseudoFile: Express.Multer.File = {
    //         fieldname: 'file', originalname: fileName, encoding: '7bit',
    //         mimetype: 'application/pdf', size: signedBuffer.length,
    //         destination: tmpDir, filename: path.basename(tmpPath),
    //         path: tmpPath, buffer: signedBuffer, stream: Readable.from(signedBuffer),
    //     } as any;

    //     const uploadDto: UploadFileDto = {
    //         object_id: docId,
    //         object_type: objectType || 'docDraft',
    //         signed_file_id: +id,
    //     };

    //     // 6. SQL TRANSACTION ZONE: Chỉ mở connection/transaction Database tại bước này để tránh tắc nghẽn
    //     const pool = await this.getMsPool();
    //     const transaction = new sql.Transaction(pool);
    //     await transaction.begin();

    //     let uploadResult;
    //     try {
    //         // [Cảnh báo] Cần sửa this.fileService.uploadFile để support truyền param transaction vào nếu muốn an toàn DB đồng bộ
    //         uploadResult = await this.fileService.uploadFile(uploadDto, pseudoFile, 'system-sign-otp' /*, transaction */);

    //         const payloadSignDoc = {
    //             docIds: docId, actionCode: actionCode, userId: userId, displayName: '',
    //             receiver_unit: '', group_: '', deadline: '', note: '', targetRole: '', roles: '', signerType: '',
    //         };
    //         // [Cảnh báo] Tương tự với workItemsService.signDoc
    //         await this.workItemsService.signDoc(workItemId, payloadSignDoc, userId, originalUser /*, transaction */);

    //         await transaction.commit(); // Cập nhật db thành công

    //         return {
    //             success: true,
    //             signedFileId: uploadResult.id,
    //             fileName: uploadResult?.signedFileName,
    //         };

    //     } catch (error) {
    //         let errorMsg = error.message;
    //         if (error.response?.data) {
    //             try {
    //                 const data = error.response.data;
    //                 const dataStr = Buffer.isBuffer(data) ? data.toString('utf-8') : (typeof data === 'object' ? JSON.stringify(data) : data);
    //                 const errorObj = JSON.parse(dataStr);
    //                 errorMsg = errorObj.message || errorObj.errorMessage || errorObj.error || dataStr;
    //             } catch (e) {
    //                 // Bỏ qua nếu không parse được
    //             }
    //         }

    //         await transaction.rollback().catch(() => { });
    //         console.error('[sign-otp] Service error:', errorMsg);
    //         throw new BadRequestException(`Lỗi khi ký OTP: ${errorMsg}`);
    //     } finally {
    //         // Dù thành công hay lỗi ở SQL, file rác tạm phải được dọn
    //         await fsPromises.unlink(tmpPath).catch(() => { });
    //     }
    // }


    /**
   * Ký số hàng loạt - Download nhiều file, gửi sang API ký số, upload lại
   * @param docId - ID của document
   * @param ids - Mảng ID của các file cần ký
   * @param tokenSigning - Token ký số
   * @param token - JWT token để xác thực
   * @param signingParams - Các tham số ký số (username, password, reason, location, signatureLevel)
   * @returns Kết quả ký số
   */
    //     async signBatch({
    //         dto,
    //         serviceId,
    //         tokenSigning,
    //         token,
    //         userId,
    //         originalUser,
    //         imageId,
    //         tokenAccessSign
    //     }: {
    //         dto: SignFilesOtpDto,
    //         serviceId: string,
    //         tokenSigning: string,
    //         token: string,
    //         userId: string,
    //         originalUser: string,
    //         imageId: string,
    //         tokenAccessSign: string
    //     }) {
    //         const { docId, ids, type, actionCode, workItemId, keyword, isOTP, isIncommingDoc } = dto;

    //         const imageInsert = await this.fileService.getFileForView(+imageId);
    //         if (!imageInsert || !imageInsert.fileBuffer) {
    //             throw new BadRequestException(`Không tìm thấy ảnh chữ ký của người dùng`);
    //         }

    //         const pool = await this.getMsPool();


    //         let objectType = 'docDraft';
    //         const transaction = new sql.Transaction(pool);
    //         await transaction.begin();

    //         const signedResults: Array<{
    //             originalFileId: number;
    //             signedFileId: number;
    //             fileName: string;
    //         }> = [];

    //         try {
    //             // ✅ Parse ids sang number array an toàn (handle cả string và number)
    //             const numericIds = ids.map(id => Number(id)).filter(id => !isNaN(id) && id > 0);

    //             if (numericIds.length === 0) {
    //                 throw new BadRequestException('Không có ID hợp lệ để ký');
    //             }


    //             // 1️⃣ Download tất cả files một lần
    //             const fileDatas = await this.fileService.getMultipleFilesForView(numericIds);


    //             // 2️⃣ Validate và chuẩn bị buffers cho tất cả files
    //             const fileBuffersToSign: Array<{
    //                 id: number;
    //                 fileBuffer: Buffer;
    //                 filename: string;
    //                 filePath?: string;
    //                 fileSize?: number;
    //                 mimetype: string;
    //             }> = [];

    //             for (const id of numericIds) {
    //                 const fileData = fileDatas.find(f => f.id === id);

    //                 if (!fileData) {
    //                     throw new BadRequestException(`Không tìm thấy file ID ${id}`);
    //                 }

    //                 if (fileData.error) {
    //                     throw new BadRequestException(`Lỗi khi tải file ID ${id}: ${fileData.error}`);
    //                 }

    //                 if (!fileData.fileBuffer && !fileData.fullPath) {
    //                     throw new BadRequestException(`Không thể download file ID ${id}`);
    //                 }

    //                 // Lấy buffer từ file
    //                 let fileBuffer: Buffer;
    //                 if (fileData.fileBuffer) {
    //                     fileBuffer = fileData.fileBuffer;
    //                 } else if (fileData.fullPath) {
    //                     fileBuffer = await fsPromises.readFile(fileData.fullPath);
    //                 } else {
    //                     throw new BadRequestException(`Không thể đọc nội dung file ID ${id}`);
    //                 }

    //                 fileBuffersToSign.push({
    //                     id: +id,
    //                     fileBuffer: fileBuffer,
    //                     filename: fileData.filename,
    //                     filePath: fileData.filePath,
    //                     fileSize: fileData.fileSize,
    //                     mimetype: fileData.mimetype,
    //                 });
    //             }

    //             // 3️⃣ Xác định endpoint theo loại ký
    //             let URL_SIGN = '';
    //             const isOTPBoolean = isOTP ?? true;
    //             if (!process.env.URL_SERVICE_SIGNING) {
    //                 throw new InternalServerErrorException('Chưa cấu hình biến môi trường URL_SERVICE_SIGNING');
    //             }

    //             // Gọi 1 lần: append tất cả file vào field `files`
    //             // eslint-disable-next-line @typescript-eslint/no-require-imports
    //             const formData = new FormData();

    //             fileBuffersToSign.forEach((fileInfo) => {
    //                 formData.append('files', fileInfo.fileBuffer, {
    //                     filename: fileInfo.filename,
    //                     contentType: fileInfo.mimetype,
    //                 });
    //             });

    //             formData.append('username', dto.username);
    //             formData.append('password', dto.password);
    //             formData.append('reason', dto.reason || 'Ký số điện tử');
    //             formData.append('location', dto.location || 'Việt Nam');
    //             formData.append('signatureLevel', dto.signatureLevel || 'B');

    //             switch (type.trim()) {
    //                 case 'signContentDraft':
    //                 case 'reportSigner':
    //                 case 'stampDoc':
    //                 case 'signCopy':
    //                     URL_SIGN = `${process.env.URL_SERVICE_SIGNING}api/sign/documents-with-image`;
    //                     if (!isOTPBoolean) {
    //                        URL_SIGN = `${process.env.URL_SERVICE_SIGNING}api/desktop/documents-with-image`;
    //                     }
    //                     if (isIncommingDoc) {
    //                         objectType = 'incommingdocument'
    //                     }
    //                     if (!keyword) {
    //                         throw new BadRequestException(`Không tìm thấy từ khóa ký số`);
    //                     }
    //                     let imageMetadata = [
    //                         {
    //                             "keyWord": `${keyword}`,
    //                             "imagesBase": imageInsert?.fileBuffer.toString('base64'),
    //                             "width": 100,
    //                             "height": 80,
    //                         }
    //                     ]
    //                     if (type.trim() === 'signContentDraft') {
    //                         imageMetadata = [
    //                             {
    //                                 "keyWord": `${keyword}`,
    //                                 "imagesBase": imageInsert?.fileBuffer.toString('base64'),
    //                                 "width": 60,
    //                                 "height": 40,
    //                             }
    //                         ]
    //                     }
    //                     formData.append('imageMetadata', JSON.stringify(imageMetadata));
    //                     break;
    //                 case 'signFormatDraft':
    //                     URL_SIGN = `${process.env.URL_SERVICE_SIGNING}api/sign/documents-formal-initial-signature`;
    //                     if (!isOTPBoolean) {
    //                         URL_SIGN = `${process.env.URL_SERVICE_SIGNING}api/desktop/documents-formal-initial-signature`;
    //                     }
    //                     formData.append('base64Image', imageInsert?.fileBuffer.toString('base64'));
    //                     break;
    //                 default:
    //                     throw new BadRequestException('Thể loại ký không hợp lệ.');
    //             }
    //             const signedFiles: any[] = [];
    //             try {
    //                 // Log formData ra terminal
    //                 // if (typeof formData === 'object' && formData instanceof FormData) {
    //                 //   // Log headers
    //                 //   console.log('formData headers:', formData.getHeaders());
    //                 //   // Log các trường đã append
    //                 //   console.log('formData fields:', {
    //                 //     files: fileBuffersToSign.map(f => f.filename),
    //                 //     username: signingParams.username,
    //                 //     password: signingParams.password,
    //                 //     reason: signingParams.reason || 'Ký số điện tử',
    //                 //     location: signingParams.location || 'Việt Nam',
    //                 //     signatureLevel: signingParams.signatureLevel || 'B',
    //                 //     imageMetadata: signingParams.imageMetadata && typeSign === 'digital' ? JSON.stringify(signingParams.imageMetadata) : undefined,
    //                 //     base64Image: typeSign === 'draft' ? signingParams?.base64Image : undefined,
    //                 //   });
    //                 // }
    //                 // Nếu muốn log chi tiết hơn, có thể dùng formData.submit hoặc formData.getBuffer()
    //                 // Tuy nhiên, getBuffer() có thể lớn và không nên log toàn bộ buffer

    //                 const signResponse = await axios.post(
    //                     URL_SIGN,
    //                     formData,
    //                     {
    //                         headers: {
    //                             ...formData.getHeaders(),
    //                             'Authorization': `Bearer ${token}`,
    //                             'Token-signing': tokenSigning,
    //                             'X-Service-Id': serviceId || '',
    //                         },
    //                         responseType: 'json',
    //                         timeout: 120000,
    //                     },
    //                 );

    //                 const batchSignedFiles =
    //                     signResponse?.data?.documents ||
    //                     signResponse?.data?.data?.documents ||
    //                     [];

    //                 if (Array.isArray(batchSignedFiles) && batchSignedFiles.length > 0) {
    //                     signedFiles.push(...batchSignedFiles);
    //                 } else {
    //                     const item =
    //                         signResponse?.data?.documents ||
    //                         signResponse?.data?.data ||
    //                         signResponse?.data;

    //                     if (item) {
    //                         signedFiles.push({
    //                             filename: item?.filename || fileBuffersToSign[0]?.filename,
    //                             signedBase64: item?.signedBase64 || item?.data || item?.base64 || null,
    //                         });
    //                     }
    //                 }
    //             } catch (error) {
    //                 let errorMsg = error.message;
    //                 let errorDetails = {};

    //                 if (error.response?.data) {
    //                     try {
    //                         errorMsg = JSON.stringify(error.response.data);
    //                         errorDetails = error.response.data;
    //                     } catch (e) {
    //                         errorMsg = 'Cannot parse error response';
    //                     }
    //                 }

    //                 console.error(`❌ Lỗi khi ký batch ${type}:`, {
    //                     status: error.response?.status,
    //                     statusText: error.response?.statusText,
    //                     errorMsg,
    //                     errorDetails,
    //                     requestHeaders: {
    //                         hasAuth: !!token,
    //                         hasTokenSigning: !!tokenSigning,
    //                         hasUsername: !!dto.username,
    //                         hasPassword: !!dto.password,
    //                     },
    //                 });

    //                 throw new BadRequestException(
    //                     `Lỗi ký số batch ${type}: ${errorMsg}. `,
    //                 );
    //             }

    //             // 5️⃣ Xử lý response từ API
    //             console.log(`API trả về ${signedFiles.length} files đã ký`);

    //             if (signedFiles.length !== fileBuffersToSign.length) {
    //                 console.warn(`Số file đã ký (${signedFiles.length}) khác số file gửi đi (${fileBuffersToSign.length})`);
    //             }

    //             // 6️⃣ Upload từng file đã ký
    //             const uploadBase = path.join(process.cwd(), 'upload');
    //             const tmpDir = path.join(uploadBase, 'tmp-signing');
    //             await fsPromises.mkdir(tmpDir, { recursive: true });

    //             for (let i = 0; i < fileBuffersToSign.length; i++) {
    //                 const originalFile = fileBuffersToSign[i];
    //                 const signedFileData = signedFiles[i];

    //                 if (!signedFileData || !signedFileData.signedBase64) {
    //                     console.warn(`⚠️ Không có dữ liệu file đã ký cho ${originalFile.filename}`);
    //                     continue;
    //                 }

    //                 // Convert base64 string sang Buffer (API trả về base64 trực tiếp)
    //                 // const signedBuffer = Buffer.from(signedFileData.data, 'base64');
    //                 const signedBuffer = Buffer.from(signedFileData.signedBase64, 'base64');
    //                 console.log(`File ${originalFile.filename} đã ký, kích thước: ${(signedBuffer.length / 1024).toFixed(2)} KB`);

    //                 // Tạo pseudo Multer file để upload
    //                 const signedFileName = signedFileData.filename || originalFile.filename.replace(/\.[^/.]+$/, '') + '_signed.pdf';
    //                 const tmpFilename = `${originalFile.id}-${Date.now()}.pdf`;
    //                 const tmpPath = path.join(tmpDir, tmpFilename);

    //                 await fsPromises.writeFile(tmpPath, signedBuffer);

    //                 const pseudoFile: Express.Multer.File = {
    //                     fieldname: 'file',
    //                     originalname: signedFileName,
    //                     encoding: '7bit',
    //                     mimetype: 'application/pdf',
    //                     size: signedBuffer.length,
    //                     destination: tmpDir,
    //                     filename: tmpFilename,
    //                     path: tmpPath,
    //                     buffer: signedBuffer,
    //                     stream: null as any,
    //                 } as any;

    //                 // Upload file đã ký
    //                 const dto: UploadFileDto = {
    //                     object_id: docId,
    //                     object_type: 'docDraft',
    //                     signed_file_id: originalFile.id,
    //                 } as any;

    //                 const uploadResult = await this.fileService.uploadFile(dto, pseudoFile, 'system-batch-sign');

    //                 if (!uploadResult || !uploadResult.id) {
    //                     throw new InternalServerErrorException(`Upload file đã ký thất bại cho file ${originalFile.id}`);
    //                 }

    //                 // Cleanup temp file
    //                 await fsPromises.unlink(tmpPath).catch(() => { });

    //                 signedResults.push({
    //                     originalFileId: originalFile.id,
    //                     signedFileId: uploadResult.id,
    //                     fileName: signedFileName,
    //                 });
    //             }

    //             // 4️⃣ Commit transaction
    //             await transaction.commit();

    //             return {
    //                 success: true,
    //                 signed: signedResults.length,
    //                 results: signedResults,
    //             };

    //         } catch (error) {
    //             let errorMsg = error.message;
    //             if (error.response?.data) {
    //                 try {
    //                     const data = error.response.data;
    //                     const dataStr = Buffer.isBuffer(data) ? data.toString('utf-8') : (typeof data === 'object' ? JSON.stringify(data) : data);
    //                     const errorObj = JSON.parse(dataStr);
    //                     errorMsg = errorObj.message || errorObj.errorMessage || errorObj.error || dataStr;
    //                 } catch (e) {
    //                     // Bỏ qua nếu không parse được
    //                 }
    //             }

    //             // 5️⃣ Rollback transaction nếu có lỗi
    //             console.error('Lỗi trong quá trình ký batch, rollback...', errorMsg);

    //             try {
    //                 await transaction.rollback();
    //                 console.log('Đã rollback transaction');
    //             } catch (rollbackError) {
    //                 console.error('Lỗi khi rollback:', rollbackError);
    //             }

    //             // Cleanup các file đã được tạo trong signedResults (nếu có)
    //             for (const result of signedResults) {
    //                 try {
    //                     await this.filesRepository.softDeleteFiles([result.signedFileId]);
    //                     console.log(`Đã cleanup file ${result.signedFileId}`);
    //                 } catch (cleanupError) {
    //                     console.error(`Không thể cleanup file ${result.signedFileId}:`, cleanupError);
    //                 }
    //             }

    //             throw new BadRequestException(`Lỗi khi ký batch: ${errorMsg}`);
    //         }
    //     }

    private getVerifyPdfSignatureCacheKey(fileId: number, fileRecord: any) {
        const updatedAt = fileRecord?.updated_at instanceof Date
            ? fileRecord.updated_at.getTime()
            : String(fileRecord?.updated_at || '');
        const storageRef = fileRecord?.storage_path || fileRecord?.file_path || '';
        return [
            fileId,
            Number(fileRecord?.file_size) || 0,
            updatedAt,
            fileRecord?.storage_type || '',
            storageRef,
        ].join(':');
    }

    private getCachedVerifyPdfSignature(cacheKey: string) {
        const cached = this.verifyPdfSignatureCache.get(cacheKey);
        if (!cached) return null;

        if (cached.expiresAt <= Date.now()) {
            this.verifyPdfSignatureCache.delete(cacheKey);
            return null;
        }

        return cached.value;
    }

    private setCachedVerifyPdfSignature(cacheKey: string, value: any) {
        this.verifyPdfSignatureCache.set(cacheKey, {
            expiresAt: Date.now() + this.verifyPdfCacheTtlMs,
            value,
        });

        if (this.verifyPdfSignatureCache.size <= this.verifyPdfCacheMaxEntries) {
            return;
        }

        const now = Date.now();
        for (const [key, cached] of this.verifyPdfSignatureCache) {
            if (cached.expiresAt <= now || this.verifyPdfSignatureCache.size > this.verifyPdfCacheMaxEntries) {
                this.verifyPdfSignatureCache.delete(key);
            }
        }
    }
    /**
     * Kiểm tra và lấy thông tin chữ ký số từ file PDF
     * @param fileId ID của file cần kiểm tra (hoặc UUID)
     * @returns Thông tin các chữ ký tìm thấy và trạng thái xác thực
     */
    async verifyPdfSignature(fileId: string | number, currentUserId?: string) {
        const startedAt = Date.now();
        if (!currentUserId) {
            throw new ForbiddenException('Không xác định được người dùng hiện tại');
        }

        const resolvedId = await this.fileService.resolveFileIdOrThrow(fileId);
        const resolvedAt = Date.now();

        const hasPermission = await this.filesRepository.canUserViewFile(
            String(resolvedId),
            String(currentUserId),
        );
        const permissionCheckedAt = Date.now();
        if (!hasPermission) {
            throw new ForbiddenException('Bạn không có quyền xem file này');
        }

        const fileRecord = await this.filesRepository.getFileForView(resolvedId);
        const metadataLoadedAt = Date.now();
        if (!fileRecord) {
            throw new BadRequestException(`Không tìm thấy file với ID ${resolvedId}`);
        }

        const cacheKey = this.getVerifyPdfSignatureCacheKey(resolvedId, fileRecord);
        const cached = this.getCachedVerifyPdfSignature(cacheKey);
        if (cached) {
            this.logger.log(`[verifyPdfSignature] fileId=${resolvedId} cache=hit resolve=${resolvedAt - startedAt}ms permission=${permissionCheckedAt - resolvedAt}ms metadata=${metadataLoadedAt - permissionCheckedAt}ms total=${Date.now() - startedAt}ms`);
            return cached;
        }

        const pending = this.verifyPdfSignaturePending.get(cacheKey);
        if (pending) {
            this.logger.log(`[verifyPdfSignature] fileId=${resolvedId} cache=pending`);
            return pending;
        }

        const pendingVerification = Promise.resolve().then(async () => {
            const fileDataStartedAt = Date.now();
            const fileData = await this.fileService.getFileForView(resolvedId);
            const fileDataLoadedAt = Date.now();
            if (!fileData) {
                throw new BadRequestException(`Không tìm thấy file với ID ${resolvedId}`);
            }

            let pdfBuffer: Buffer;
            const readStartedAt = Date.now();
            if (fileData.fileBuffer) {
                pdfBuffer = fileData.fileBuffer;
            } else if (fileData.fullPath) {
                pdfBuffer = await fsPromises.readFile(fileData.fullPath);
            } else {
                throw new BadRequestException(`Không thể đọc nội dung file ID ${resolvedId}`);
            }
            const readFinishedAt = Date.now();

            try {
                const verifyPDF = (verifyPdfLib as any).default || verifyPdfLib;

                if (typeof verifyPDF !== 'function') {
                    throw new Error('Không tìm thấy hàm verifyPDF trong thư viện @ninja-labs/verify-pdf');
                }

                const parseStartedAt = Date.now();
                const result = verifyPDF(pdfBuffer);
                const parseFinishedAt = Date.now();

                if (result?.error || result?.message) {
                    throw new BadRequestException(result.message || 'File PDF này không chứa chữ ký số hợp lệ.');
                }

                const signatures = result?.signatures || [];
                if (signatures.length === 0) {
                    throw new BadRequestException('File PDF này không chứa bất kỳ chữ ký số nào.');
                }

                const response = {
                    success: true,
                    hasSignature: true,
                    overallStatus: {
                        verified: result.verified,
                        authenticity: result.authenticity,
                        integrity: result.integrity,
                        expired: result.expired,
                        isTrusted: result.verified && result.integrity && !result.expired,
                    },
                    message: `Tìm thấy ${signatures.length} chữ ký số`,
                    signatures: signatures.map((sig) => {
                        const decodeUtf8 = (str: string) => {
                            if (!str) return '';
                            try {
                                return Buffer.from(str, 'latin1').toString('utf8');
                            } catch (e) {
                                return str;
                            }
                        };

                        const signatureMeta = sig?.meta?.signatureMeta || {};
                        const certs = sig?.meta?.certs || [];
                        const clientCert = certs.find((c: any) => c.clientCertificate) || certs[0] || null;
                        const issuedTo = clientCert?.issuedTo || {};
                        const issuedBy = clientCert?.issuedBy || {};
                        const validity = clientCert?.validityPeriod || {};

                        let mst = '';
                        if (issuedTo.serialNumber) {
                            mst = issuedTo.serialNumber;
                        } else if (issuedTo.organizationIdentifier) {
                            mst = issuedTo.organizationIdentifier;
                        } else {
                            const cn = issuedTo.commonName || signatureMeta.Name || '';
                            const mstMatch = cn.match(/MST:?\s*([0-9-]+)/i);
                            if (mstMatch) mst = mstMatch[1];
                        }

                        return {
                            signerName: decodeUtf8(issuedTo.commonName || signatureMeta.Name || ''),
                            organization: decodeUtf8(issuedTo.organizationName || ''),
                            taxCode: mst,
                            provider: decodeUtf8(issuedBy.commonName || issuedBy.organizationName || ''),
                            validFrom: validity.notBefore || '',
                            validTo: validity.notAfter || '',
                            isTrusted: sig.verified && sig.integrity && !sig.expired,
                        };
                    })
                };

                this.logger.log(`[verifyPdfSignature] fileId=${resolvedId} cache=miss resolve=${resolvedAt - startedAt}ms permission=${permissionCheckedAt - resolvedAt}ms metadata=${metadataLoadedAt - permissionCheckedAt}ms loadFile=${fileDataLoadedAt - fileDataStartedAt}ms read=${readFinishedAt - readStartedAt}ms parse=${parseFinishedAt - parseStartedAt}ms total=${Date.now() - startedAt}ms`);
                return response;
            } catch (error) {
                const errorMsg = error.message || '';
                if (errorMsg.toLowerCase().includes('cannot find subfilter')) {
                    throw new BadRequestException('File PDF có cấu trúc chữ ký không hợp lệ hoặc chưa được ký đúng cách');
                }
                throw new BadRequestException(`Lỗi khi kiểm tra chữ ký PDF: ${errorMsg}`);
            }
        });

        this.verifyPdfSignaturePending.set(cacheKey, pendingVerification);
        try {
            const result = await pendingVerification;
            this.setCachedVerifyPdfSignature(cacheKey, result);
            return result;
        } finally {
            this.verifyPdfSignaturePending.delete(cacheKey);
        }
    }
    /**
     * Kiểm tra trạng thái ký số của một danh sách các file theo ID
     * @param fileIds Mảng các ID của file cần kiểm tra
     */
    async checkFilesSignatureStatus(fileIds: (string | number)[], currentUserId?: string, verifyContent = false) {
        if (!fileIds || fileIds.length === 0) {
            return {
                success: true,
                message: 'Không có fileId để kiểm tra.',
                files: []
            };
        }

        const numericIds = [...new Set(fileIds.map(id => Number(id)).filter(id => !isNaN(id) && id > 0))];

        if (numericIds.length === 0) {
            return {
                success: true,
                message: 'Không có ID file hợp lệ để kiểm tra.',
                files: []
            };
        }

        const startGetFiles = Date.now();
        const files = await this.filesRepository.getItemsByIds(numericIds);
        const filesById = new Map(files.map(file => [Number(file.id), file]));
        this.logger.log(`[checkFilesSignatureStatus] Load metadata for files ${numericIds.join(', ')} took ${Date.now() - startGetFiles}ms`);

        const results = await Promise.all(numericIds.map(async (fileId) => {
            const file = filesById.get(Number(fileId));
            if (!file) {
                return { fileId, message: 'Không tìm thấy file trong hệ thống', isDigitalSigned: false, isTrusted: false };
            }

            const isPdf = file.file_name?.toLowerCase().endsWith('.pdf');
            const isSignedFromMetadata = Number(file.is_signed_file) === 1 || file.is_signed_file === true;

            let signatureInfo = {
                hasSignature: isSignedFromMetadata,
                isTrusted: false,
                message: isSignedFromMetadata ? 'File đã được đánh dấu đã ký số' : 'Chưa ký số'
            };

            if (!isPdf) {
                signatureInfo = {
                    hasSignature: false,
                    isTrusted: false,
                    message: 'Không phải file PDF'
                };
            } else if (verifyContent) {
                try {
                    const verification = await this.verifyPdfSignature(fileId, currentUserId);
                    signatureInfo = {
                        hasSignature: verification.hasSignature,
                        isTrusted: verification.overallStatus?.isTrusted || false,
                        message: verification.message
                    };
                } catch (e) {
                    signatureInfo = {
                        hasSignature: false,
                        isTrusted: false,
                        message: e.message || 'Chưa ký số'
                    };
                }
            }

            return {
                fileId: file.id,
                fileName: file.file_name,
                isDigitalSigned: signatureInfo.hasSignature,
                isTrusted: signatureInfo.isTrusted,
                message: signatureInfo.message,
                verificationSource: verifyContent ? 'content' : 'metadata',
            };
        }));

        return {
            success: true,
            files: results
        };
    }
}
