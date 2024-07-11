import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import * as sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
@Injectable()
export class DmsService {
  private client: S3Client;
  private bucketName = this.configService.get('S3_BUCKET_NAME');

  constructor(private readonly configService: ConfigService) {
    const s3_region = this.configService.get('S3_REGION');

    if (!s3_region) {
      throw new Error('S3_REGION not found in environment variables');
    }
    this.client = new S3Client({
      region: s3_region,
      credentials: {
        accessKeyId: this.configService.get('S3_ACCESS_KEY'),
        secretAccessKey: this.configService.get('S3_SECRET_ACCESS_KEY'),
      },
      forcePathStyle: true,
    });
  }

  async uploadSingleFile({
    buffer,
    fileName,
    isPublic = true,
  }: {
    buffer: Buffer;
    fileName: string;
    isPublic: boolean;
  }) {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: buffer,
        ContentType: 'image/webp',
      });

      const uploadResult = await this.client.send(command);

      console.log(uploadResult);

      return {
        url: isPublic
          ? (await this.getFileUrl(fileName)).url
          : (await this.getPresignedSignedUrl(fileName)).url,
        fileName,
        isPublic,
      };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async getFileUrl(key: string) {
    return { url: `https://${this.bucketName}.s3.amazonaws.com/${key}` };
  }

  async getPresignedSignedUrl(key: string) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const url = await getSignedUrl(this.client, command, {
        expiresIn: 60 * 60 * 24, // 24 hours
      });

      return { url };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async deleteFile(key: string) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.client.send(command);

      return { message: 'File deleted successfully' };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async processImages(files: Express.Multer.File[], isPublic = true) {
    const processedImages = [];

    for (const file of files) {
      const filename = Date.now() + '-' + uuidv4() + '.webp';
      const processedImage = await sharp(file.buffer)
        .resize(1024)
        .webp({ lossless: true })
        .keepMetadata()
        .toBuffer();

      const result = await this.uploadSingleFile({
        buffer: processedImage,
        fileName: filename,
        isPublic,
      });

      processedImages.push(result);
    }

    return processedImages;
  }
}
