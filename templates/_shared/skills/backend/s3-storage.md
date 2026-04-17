# S3 / Object Storage

Rules and patterns for file storage with S3-compatible services (AWS S3, MinIO,
Cloudflare R2). Apply on top of `conventions.md` and `security-basics.md`.

## Rules

- **Use the AWS SDK v3.** Import only the clients you need:
  `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`. Never install the
  monolithic `aws-sdk` v2. Configure a single `S3Client` instance shared across
  the application.
- **Presigned URLs for uploads.** Never proxy file uploads through your API
  server. Generate a presigned PUT URL (5–15 min expiry) and let the client
  upload directly to S3. This saves server bandwidth, memory, and CPU.
- **Presigned URLs for private downloads.** For access-controlled files,
  generate short-lived presigned GET URLs (15 min – 1 hour). Never expose raw S3
  bucket URLs or make buckets public unless serving truly public static assets.
- **Validate before signing.** Before generating a presigned upload URL,
  validate: file type (allowlist MIME types), max file size (set
  `Content-Length` conditions), user permissions. Don't trust the client.
- **Structured key naming.** Use predictable, collision-free keys:
  `{entity}/{id}/{uuid}.{ext}` — e.g., `avatars/user-123/a1b2c3.webp`. Never use
  user-provided filenames as S3 keys — sanitize or replace with UUIDs.
- **Store metadata in the database.** Save `key`, `bucket`, `contentType`,
  `size`, `uploadedBy`, `createdAt` in a `files` table. The S3 object is
  storage; the database is the source of truth for ownership and relationships.
- **Lifecycle policies for cleanup.** Configure S3 lifecycle rules to
  auto-delete: incomplete multipart uploads (after 1 day), temporary uploads
  (after 7 days), old versions if versioning is enabled. Don't rely on
  application code for cleanup.
- **Separate buckets by access pattern.** Public assets (logos, marketing) in
  one bucket with CloudFront. Private uploads (documents, user files) in another
  with strict IAM. Temporary processing files in a third with aggressive
  lifecycle rules.
- **Multipart upload for large files.** Files > 100MB should use multipart
  upload. Use `@aws-sdk/lib-storage` `Upload` class which handles chunking
  automatically. Set a reasonable part size (5–10MB).
- **Error handling.** Handle `NoSuchKey` (file not found), `AccessDenied`
  (permissions), and network errors explicitly. Retry transient failures with
  exponential backoff (SDK v3 handles this by default, but verify config).
- **Local development with MinIO.** Use MinIO in Docker for local development
  and testing. Same S3 API, no AWS credentials needed. Configure endpoint URL
  via env var so switching between local/production is a config change.

## Patterns

```ts
// Presigned upload URL
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

async function createUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: config.S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3Client, command, { expiresIn: 900 });
}
```

## Anti-Patterns

- Streaming file uploads through the API server (memory leaks, slow).
- Using user-provided filenames as S3 keys (path traversal, collisions).
- Making buckets public with wildcard policies.
- Hardcoding bucket names or regions instead of config/env vars.
- Storing file bytes in the database instead of object storage.
