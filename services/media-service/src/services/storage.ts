import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config/index.js';

/**
 * S3-compatible storage service.
 *
 * Works with AWS S3, MinIO, or any S3-compatible object store.
 * Provides presigned URL generation for secure direct uploads / downloads
 * without proxying bytes through the application server.
 */
export class S3StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.client = new S3Client({
      endpoint: config.S3_ENDPOINT,
      region: config.S3_REGION,
      credentials: {
        accessKeyId: config.S3_ACCESS_KEY,
        secretAccessKey: config.S3_SECRET_KEY,
      },
      forcePathStyle: config.S3_FORCE_PATH_STYLE,
    });

    this.bucket = config.S3_BUCKET_MEDIA;
  }

  /**
   * Generate a presigned URL that allows the client to upload a file
   * directly to S3 via HTTP PUT.
   */
  async generatePresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn = 3600,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Generate a presigned URL that allows the client to download a file
   * directly from S3 via HTTP GET.
   */
  async generatePresignedDownloadUrl(
    key: string,
    expiresIn = 3600,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Delete an object from S3.
   */
  async deleteObject(bucket: string, key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await this.client.send(command);
    console.log(`[S3StorageService] Deleted object ${bucket}/${key}`);
  }
}

export const storageService = new S3StorageService();
