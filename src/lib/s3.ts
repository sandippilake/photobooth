import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

if (!process.env.S3_ENDPOINT && process.env.NODE_ENV === 'production') {
  console.warn('[s3] S3_ENDPOINT not set — photo storage will fail')
}

export const s3 = new S3Client({
  region:   process.env.S3_REGION   || 'auto',
  endpoint: process.env.S3_ENDPOINT || '',
  credentials: {
    accessKeyId:     process.env.S3_ACCESS_KEY || '',
    secretAccessKey: process.env.S3_SECRET_KEY || '',
  },
  // Required for Cloudflare R2
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
})

export const S3_BUCKET = process.env.S3_BUCKET || 'photobooth'

/** Upload a base64 data URL as a JPEG to S3/R2. Returns the public URL. */
export async function uploadPhoto(
  dataUrl: string,
  key: string
): Promise<string> {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
  const buffer = Buffer.from(base64, 'base64')

  await s3.send(new PutObjectCommand({
    Bucket:      S3_BUCKET,
    Key:         key,
    Body:        buffer,
    ContentType: 'image/jpeg',
    CacheControl: 'public, max-age=31536000',
  }))

  const publicBase = (process.env.S3_PUBLIC_URL || '').replace(/\/$/, '')
  return publicBase + '/' + key
}

/** Upload a Buffer (e.g. generated PDF) to S3/R2. Returns the public URL. */
export async function uploadBuffer(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  await s3.send(new PutObjectCommand({
    Bucket:      S3_BUCKET,
    Key:         key,
    Body:        buffer,
    ContentType: contentType,
  }))
  const publicBase = (process.env.S3_PUBLIC_URL || '').replace(/\/$/, '')
  return publicBase + '/' + key
}
