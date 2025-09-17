import { db } from '@/lib/db';
import { getSettingsByCategory } from '@/lib/settings';
import { FileUpload } from '@prisma/client';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface UploadOptions {
  userId: string;
  category?: string;
  description?: string;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export interface ProcessedFile {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
}

export class FileUploadService {
  private uploadPath: string;
  private maxFileSize: number;
  private allowedImageTypes: string[];
  private allowedDocumentTypes: string[];

  constructor() {
    this.uploadPath = 'public/uploads';
    this.maxFileSize = 5 * 1024 * 1024; // Default 5MB
    this.allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    this.allowedDocumentTypes = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
  }

  /**
   * 시스템 설정에서 업로드 설정을 로드합니다.
   */
  async loadSettings(): Promise<void> {
    try {
      const uploadSettings = await getSettingsByCategory('upload');

      if (uploadSettings.maxFileSize) {
        this.maxFileSize = uploadSettings.maxFileSize as number;
      }

      if (uploadSettings.allowedImageTypes) {
        this.allowedImageTypes = uploadSettings.allowedImageTypes as string[];
      }

      if (uploadSettings.allowedDocumentTypes) {
        this.allowedDocumentTypes = uploadSettings.allowedDocumentTypes as string[];
      }

      if (uploadSettings.uploadPath) {
        this.uploadPath = uploadSettings.uploadPath as string;
      }
    } catch (error) {
      console.error('Failed to load upload settings, using defaults:', error);
    }
  }

  /**
   * 파일 검증
   */
  validateFile(file: File | Buffer, mimeType: string, size: number): FileValidationResult {
    // 파일 크기 검증
    if (size > this.maxFileSize) {
      return {
        valid: false,
        error: `파일 크기가 ${Math.round(this.maxFileSize / 1024 / 1024)}MB를 초과합니다.`
      };
    }

    // MIME 타입 검증
    const allAllowedTypes = [...this.allowedImageTypes, ...this.allowedDocumentTypes];
    if (!allAllowedTypes.includes(mimeType)) {
      return {
        valid: false,
        error: `허용되지 않는 파일 형식입니다. (${mimeType})`
      };
    }

    return { valid: true };
  }

  /**
   * 고유한 파일명 생성
   */
  generateUniqueFilename(originalName: string): string {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, extension);

    // 파일명 정규화 (특수문자 제거)
    const cleanName = nameWithoutExt.replace(/[^a-zA-Z0-9-_]/g, '_');

    return `${timestamp}_${randomString}_${cleanName}${extension}`;
  }

  /**
   * 파일 카테고리 결정
   */
  determineCategory(mimeType: string): string {
    if (this.allowedImageTypes.includes(mimeType)) {
      return 'images';
    } else if (this.allowedDocumentTypes.includes(mimeType)) {
      return 'documents';
    }
    return 'others';
  }

  /**
   * 파일을 디스크에 저장
   */
  async saveFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<ProcessedFile> {
    const filename = this.generateUniqueFilename(originalName);
    const category = this.determineCategory(mimeType);
    const relativePath = path.join(this.uploadPath, category, filename);
    const absolutePath = path.join(process.cwd(), relativePath);
    const dirPath = path.dirname(absolutePath);

    // 디렉토리 생성 (없으면)
    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true });
    }

    // 파일 저장
    await writeFile(absolutePath, buffer);

    // URL 경로 생성 (public 제거)
    const url = relativePath.replace(/^public/, '');

    return {
      filename,
      originalName,
      mimeType,
      size: buffer.length,
      path: relativePath,
      url
    };
  }

  /**
   * 파일 업로드 처리
   */
  async uploadFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    options: UploadOptions
  ): Promise<FileUpload> {
    // 설정 로드
    await this.loadSettings();

    // 파일 검증
    const validation = this.validateFile(buffer, mimeType, buffer.length);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // 파일 저장
    const processedFile = await this.saveFile(buffer, originalName, mimeType);

    // DB에 메타데이터 저장
    const fileUpload = await db.fileUpload.create({
      data: {
        filename: processedFile.filename,
        originalName: processedFile.originalName,
        mimeType: processedFile.mimeType,
        size: processedFile.size,
        path: processedFile.path,
        url: processedFile.url,
        category: options.category || this.determineCategory(mimeType),
        description: options.description,
        uploadedById: options.userId,
      },
    });

    return fileUpload;
  }

  /**
   * 여러 파일 업로드
   */
  async uploadMultipleFiles(
    files: Array<{
      buffer: Buffer;
      originalName: string;
      mimeType: string;
    }>,
    options: UploadOptions
  ): Promise<FileUpload[]> {
    const uploadedFiles: FileUpload[] = [];

    for (const file of files) {
      try {
        const uploaded = await this.uploadFile(
          file.buffer,
          file.originalName,
          file.mimeType,
          options
        );
        uploadedFiles.push(uploaded);
      } catch (error) {
        console.error(`Failed to upload ${file.originalName}:`, error);
        // 실패한 파일은 건너뛰고 계속
      }
    }

    return uploadedFiles;
  }

  /**
   * 파일 삭제
   */
  async deleteFile(fileId: string, userId: string): Promise<void> {
    const file = await db.fileUpload.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new Error('파일을 찾을 수 없습니다.');
    }

    // 권한 확인 (업로드한 사용자만 삭제 가능하도록 할 수도 있음)
    // if (file.uploadedById !== userId) {
    //   throw new Error('파일 삭제 권한이 없습니다.');
    // }

    // 물리적 파일 삭제
    const absolutePath = path.join(process.cwd(), file.path);
    try {
      if (existsSync(absolutePath)) {
        await unlink(absolutePath);
      }
    } catch (error) {
      console.error('Failed to delete physical file:', error);
    }

    // DB에서 삭제
    await db.fileUpload.delete({
      where: { id: fileId },
    });
  }

  /**
   * 파일 목록 조회
   */
  async getFiles(
    options: {
      category?: string;
      userId?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ files: FileUpload[]; total: number }> {
    const { category, userId, page = 1, limit = 20 } = options;

    const where: { category?: string; uploadedBy?: string } = {};

    if (category) {
      where.category = category;
    }

    if (userId) {
      where.uploadedById = userId;
    }

    const [files, total] = await Promise.all([
      db.fileUpload.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { uploadedAt: 'desc' },
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      db.fileUpload.count({ where }),
    ]);

    return { files, total };
  }

  /**
   * 파일 상세 정보 조회
   */
  async getFile(fileId: string): Promise<FileUpload | null> {
    return await db.fileUpload.findUnique({
      where: { id: fileId },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * 파일 정보 업데이트
   */
  async updateFile(
    fileId: string,
    data: {
      description?: string;
      category?: string;
    }
  ): Promise<FileUpload> {
    return await db.fileUpload.update({
      where: { id: fileId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }
}

// 싱글톤 인스턴스 export
export const fileUploadService = new FileUploadService();