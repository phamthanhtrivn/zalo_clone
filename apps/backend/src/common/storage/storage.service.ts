import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/cloudfront-signer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileType } from '@zalo-clone/shared-types';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client;
  private readonly privateKey: string;

  constructor(private readonly configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.getOrThrow<string>('aws.region'),
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('aws.accessKeyId'),
        secretAccessKey: this.configService.getOrThrow<string>(
          'aws.secretAccessKey',
        ),
      },
    });
    this.privateKey = fs.readFileSync(
      path.join(process.cwd(), 'secrets/private_key.pem'),
      'utf8',
    );
  }

  private resolveFileType(mimeType: string): FileType {
    if (mimeType.startsWith('image/')) {
      return FileType.IMAGE;
    } else if (mimeType.startsWith('video/')) {
      return FileType.VIDEO;
    } else {
      return FileType.FILE;
    }
  }

  private sanitizeFileName(filename: string): string {
    const ext = filename.substring(filename.lastIndexOf('.'));
    const name = filename.substring(0, filename.lastIndexOf('.'));

    const safeName = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9-_]/g, '')
      .toLowerCase();

    return `${safeName}${ext}`;
  }

  async uploadFile(file: Express.Multer.File) {
    const bucket = this.configService.get<string>('aws.s3Bucket') || '';
    const safeName = this.sanitizeFileName(file.originalname);
    const key = `messages/${randomUUID()}-${safeName}`;
    const fileType = this.resolveFileType(file.mimetype);

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return {
      fileKey: key,
      fileSize: file.size,
      type: fileType,
    };
  }

  async deleteFile(fileKey: string) {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.configService.getOrThrow<string>('aws.s3Bucket'),
        Key: fileKey,
      }),
    );
  }

  signFileUrl(fileKey: string) {
    if (!fileKey) {
      return null;
    }

    console.log(
      this.configService.getOrThrow<string>('aws.cloudFrontDomain') + fileKey,
    );

    return getSignedUrl({
      url:
        this.configService.getOrThrow<string>('aws.cloudFrontDomain') + fileKey,
      dateLessThan: new Date(Date.now() + 1000 * 60 * 60 * 24),
      privateKey: this.privateKey,
      keyPairId: this.configService.getOrThrow<string>(
        'aws.cloudFrontKeyPairId',
      ),
    });
  }
}
