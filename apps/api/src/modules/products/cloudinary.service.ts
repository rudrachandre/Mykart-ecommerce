import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private configured = false;

  constructor() {
    this.ensureConfigured();
  }

  private ensureConfigured(): boolean {
    if (this.configured) return true;

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim().replace(/^["']|["']$/g, '');
    const apiKey = process.env.CLOUDINARY_API_KEY?.trim().replace(/^["']|["']$/g, '');
    const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim().replace(/^["']|["']$/g, '');
    const cloudinaryUrl = process.env.CLOUDINARY_URL?.trim().replace(/^["']|["']$/g, '');

    if ((cloudName && apiKey && apiSecret) || cloudinaryUrl) {
      if (cloudinaryUrl) {
        cloudinary.config({ cloudinary_url: cloudinaryUrl });
      } else {
        cloudinary.config({
          cloud_name: cloudName,
          api_key: apiKey,
          api_secret: apiSecret,
        });
      }
      this.configured = true;
      return true;
    }

    if (process.env.NODE_ENV !== 'test') {
      console.warn('[CloudinaryService] Cloudinary configuration missing on server:', {
        CLOUDINARY_CLOUD_NAME: Boolean(cloudName),
        CLOUDINARY_API_KEY: Boolean(apiKey),
        CLOUDINARY_API_SECRET: Boolean(apiSecret),
        CLOUDINARY_URL: Boolean(cloudinaryUrl),
      });
    }
    return false;
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string,
  ): Promise<{ url: string; publicId: string }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException(
        'Invalid file type. Only images are allowed.',
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    if (!this.ensureConfigured()) {
      throw new BadRequestException('Cloudinary is not configured');
    }

    const result = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        const upload = cloudinary.uploader.upload_stream(
          {
            folder: `mykart/${folder}`,
            resource_type: 'image',
            transformation: [{ quality: 'auto', fetch_format: 'auto' }],
          },
          (error, result) => {
            if (error) {
              reject(new BadRequestException('Upload failed'));
            } else if (result) {
              resolve(result);
            } else {
              reject(new BadRequestException('Upload failed'));
            }
          },
        );
        upload.end(file.buffer);
      },
    );

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  }

  async deleteImage(publicId: string): Promise<void> {
    if (!publicId) return;

    if (!this.ensureConfigured()) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error) => {
        if (error) {
          reject(new BadRequestException('Failed to delete image'));
        } else {
          resolve();
        }
      });
    });
  }
}
