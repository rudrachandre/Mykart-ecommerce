import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private configured = false;

  constructor() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      this.configured = true;
    }
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string,
  ): Promise<{ url: string; publicId: string }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Invalid file type. Only images are allowed.');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    if (!this.configured) {
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

    if (!this.configured) {
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
