import { Injectable, NotFoundException } from '@nestjs/common';
import { FilesManagementService } from '../files-managerment/files-management-mssql.service';
import { WopiFileInfoDto } from './dto/wopi-file-info.dto';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import { Readable } from 'stream';

@Injectable()
export class WopiService {
        constructor(
                private readonly filesService: FilesManagementService,
        ) { }

        /**
         * Helper to find the latest version ID for a given file ID
         * This now handles nested versioning (chains) by finding the true root first.
         */
        private async getLatestVersionId(fileId: number): Promise<number> {
                const pool = await this.filesService['getMsPool']();

                // 1. Find the Root ID recursively (climb up the parent_id chain)
                const rootRequest = pool.request();
                rootRequest.input('id', fileId);
                const rootResult = await rootRequest.query(`
                        WITH RootFinder AS (
                                SELECT id, parent_id FROM files WHERE id = @id
                                UNION ALL
                                SELECT f.id, f.parent_id FROM files f
                                INNER JOIN RootFinder rf ON f.id = rf.parent_id
                        )
                        SELECT id FROM RootFinder WHERE parent_id IS NULL
                `);

                const rootId = rootResult.recordset[0]?.id || fileId;

                // 2. Find the latest version under this root (at any depth)
                const latestRequest = pool.request();
                latestRequest.input('rootId', rootId);
                // We order by numeric version descending, then by updated_at
                const latestResult = await latestRequest.query(`
                        WITH Descendants AS (
                                SELECT id, version, updated_at FROM files WHERE id = @rootId
                                UNION ALL
                                SELECT f.id, f.version, f.updated_at FROM files f
                                INNER JOIN Descendants d ON f.parent_id = d.id
                        )
                        SELECT TOP 1 id
                        FROM Descendants
                        ORDER BY TRY_CONVERT(decimal(10,2), version) DESC, updated_at DESC, id DESC
                `);

                if (latestResult.recordset.length) {
                        return latestResult.recordset[0].id;
                }

                return fileId;
        }

        async getFileInfo(
                fileId: number,
                userId: string,
                canEdit: boolean,
        ): Promise<WopiFileInfoDto> {
                // Always show the latest version
                const latestId = await this.getLatestVersionId(fileId);

                const fileData = await this.filesService.getFileForView(latestId);

                if (!fileData) {
                        throw new NotFoundException('File not found');
                }

                // Calculate SHA256 hash
                let sha256 = '';
                if (fileData.fileBuffer) {
                        sha256 = crypto
                                .createHash('sha256')
                                .update(fileData.fileBuffer)
                                .digest('base64');
                } else if (fileData.fullPath) {
                        const content = await fs.promises.readFile(fileData.fullPath);
                        sha256 = crypto.createHash('sha256').update(content).digest('base64');
                }

                // Get file metadata to get actual version string and owner
                const pool = await this.filesService['getMsPool']();
                const vRequest = pool.request();
                vRequest.input('id', latestId);
                const vResult = await vRequest.query(`SELECT version, created_by, updated_at FROM files WHERE id = @id`);
                const fileMeta = vResult.recordset[0] || {};

                // Use a combination of version number and timestamp to ensure its unique for every change
                const versionString = fileMeta.updated_at
                        ? `${fileMeta.version || '1.0'}.${fileMeta.updated_at.getTime()}`
                        : (fileMeta.version || '1.0');


                let size = 0;

                if (fileData.fileBuffer) {
                        size = fileData.fileBuffer.length;
                } else if (fileData.fullPath) {
                        const stat = await fs.promises.stat(fileData.fullPath);
                        size = stat.size;
                }
                const fileInfo: WopiFileInfoDto = {
                        // Required fields
                        BaseFileName: fileData.filename,
                        OwnerId: fileMeta.created_by?.toString() || userId,
                        Size: size,
                        UserId: userId,
                        Version: versionString,

                        // Permissions
                        UserCanWrite: canEdit,
                        UserCanNotWriteRelative: false,
                        ReadOnly: !canEdit,

                        // WOPI Locking Support
                        SupportsUpdate: true,
                        SupportsLocks: false,
                        SupportsGetLock: false,

                        // Optional fields
                        UserFriendlyName: userId,
                        LastModifiedTime: (fileMeta.updated_at || new Date()).toISOString(),
                        SHA256: sha256,

                        // Collabora settings
                        DisablePrint: false,
                        DisableExport: false,
                        DisableCopy: false,

                        SupportsRename: false,
                        UserCanRename: false,
                };

                return fileInfo;
        }

        async getFileForView(fileId: number) {
                const latestId = await this.getLatestVersionId(fileId);
                return await this.filesService.getFileForView(latestId);
        }

        async getFileContent(fileId: number): Promise<Buffer> {
                const latestId = await this.getLatestVersionId(fileId);
                const fileData = await this.filesService.getFileForView(latestId);

                if (!fileData.fileBuffer) {
                        // If only path provided, read it
                        if (fileData.fullPath) {
                                return await fs.promises.readFile(fileData.fullPath);
                        }
                        throw new NotFoundException('File content not available');
                }

                return fileData.fileBuffer;
        }

        /**
         * Save file content using FilesManagementService.uploadFile
         * This will automatically handle multi-user versioning
         */
        async saveFileContent(
                fileId: number,
                userId: string,
                filePath: string,
                fileSize: number
        ): Promise<void> {

                // 1. Get current file metadata to get object info
                const pool = await this.filesService['getMsPool']();
                const request = pool.request();
                request.input('id', fileId);
                const result = await request.query(
                        `SELECT * FROM files WHERE id = @id`
                );

                if (!result.recordset.length) {
                        throw new NotFoundException('File not found');
                }
                const file = result.recordset[0];

                // 2. We already have the file at filePath, so just create Multer-like file object
                const ext = path.extname(file.file_name);
                const tmpFilename = path.basename(filePath);
                const tmpDir = path.dirname(filePath);
                
                const pseudoFile: Express.Multer.File = {
                        fieldname: 'file',
                        originalname: file.file_name,
                        encoding: '7bit',
                        mimetype: file.mime_type || this.getMimeType(ext),
                        size: fileSize,
                        destination: tmpDir,
                        filename: tmpFilename,
                        path: filePath,
                        buffer: null as any,
                } as any;

                // 4. Get object info from file_relations to preserve context
                // Also find the true Root ID to maintain a flat version hierarchy
                const infoRequest = pool.request();
                infoRequest.input('fileId', fileId);
                const infoResult = await infoRequest.query(`
                        -- Get object relation
                        SELECT TOP 1 object_type, object_id FROM file_relations WHERE file_id = @fileId AND status = 1;
                        
                        -- Get true Root ID
                        WITH RootFinder AS (
                                SELECT id, parent_id FROM files WHERE id = @fileId
                                UNION ALL
                                SELECT f.id, f.parent_id FROM files f
                                INNER JOIN RootFinder rf ON f.id = rf.parent_id
                        )
                        SELECT id FROM RootFinder WHERE parent_id IS NULL;
                `);

                const relation = infoResult.recordsets[0][0] || {};
                const rootId = infoResult.recordsets[1][0]?.id || fileId;

                // 5. Create DTO for uploadFile
                const dto: any = {
                        object_id: relation.object_id || file.object_id || '0',
                        object_type: relation.object_type || file.object_type || 'wopi-edit',
                        folder_name: 'wopi-edit',
                        edit_file_id: rootId.toString(), // Use the ROOT ID to keep versioning flat
                };

                try {
                        const uploadResult = await this.filesService.uploadFile(dto, pseudoFile, userId);
                } catch (error) {
                        console.error(`[WOPI Service] uploadFile FAILED:`, error);
                        throw error;
                } finally {
                        // Cleanup original uploaded file
                        if (fs.existsSync(filePath)) {
                                try {
                                        await fs.promises.unlink(filePath);
                                } catch {
                                        console.warn('[WOPI Service] Failed to delete temp file:', filePath);
                                }
                        }
                }
        }

        private getMimeType(ext: string): string {
                const mimeTypes: Record<string, string> = {
                        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                        '.doc': 'application/msword',
                        '.xls': 'application/vnd.ms-excel',
                        '.ppt': 'application/vnd.ms-powerpoint',
                        '.odt': 'application/vnd.oasis.opendocument.text',
                        '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
                        '.odp': 'application/vnd.oasis.opendocument.presentation',
                        '.pdf': 'application/pdf',
                };
                return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
        }
}
