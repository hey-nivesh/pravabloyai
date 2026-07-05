/**
 * cloudinaryUpload.ts — Cloudinary unsigned upload service.
 *
 * This module handles uploading an image file directly from the client to
 * Cloudinary using an unsigned upload preset (no API secret in the bundle).
 *
 * Environment variables required (set in .env):
 *   EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME   — your Cloudinary cloud name
 *   EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET — unsigned upload preset name
 *
 * Usage (from Profile screen, after image is picked):
 *   const result = await uploadAvatarImage(pickedImageUri, userId);
 *   // result.secureUrl → store in public.users.avatar_url
 *   // result.publicId  → store in public.users.avatar_public_id
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type CloudinaryUploadResult = {
  secureUrl: string;
  publicId: string;
};

export class CloudinaryUploadError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'NETWORK'
      | 'FILE_TOO_LARGE'
      | 'INVALID_FILE_TYPE'
      | 'UPLOAD_FAILED'
      | 'CONFIG_MISSING',
  ) {
    super(message);
    this.name = 'CloudinaryUploadError';
  }
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? '';

/** Maximum allowed file size: 10 MB */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Uploads an image file (by local URI) to Cloudinary using an unsigned preset.
 *
 * The caller is responsible for obtaining the local URI via expo-image-picker.
 * This function does NOT open the picker itself.
 *
 * @param localUri   - The local file URI returned by expo-image-picker
 *                     (e.g. "file:///data/user/.../cache/image.jpg")
 * @param userId     - The Supabase user id, used to organise the upload folder
 * @returns          A promise resolving to { secureUrl, publicId }
 * @throws           CloudinaryUploadError with a human-readable message
 */
export async function uploadAvatarImage(
  localUri: string,
  userId: string,
): Promise<CloudinaryUploadResult> {
  // ── Config guard ──────────────────────────────────────────────────────────
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new CloudinaryUploadError(
      'Cloudinary is not configured. Set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and ' +
        'EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET in your .env file.',
      'CONFIG_MISSING',
    );
  }

  // ── Build multipart body ──────────────────────────────────────────────────

  // Derive the file name and MIME type from the URI
  const filename = localUri.split('/').pop() ?? 'avatar.jpg';
  const extension = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
  };
  const mimeType = mimeMap[extension];

  if (!mimeType) {
    throw new CloudinaryUploadError(
      `Unsupported image format ".${extension}". Please pick a JPEG, PNG, or WebP image.`,
      'INVALID_FILE_TYPE',
    );
  }

  const formData = new FormData();
  // React Native's FormData accepts the { uri, name, type } object shape
  formData.append('file', { uri: localUri, name: filename, type: mimeType } as unknown as Blob);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', `pravabloyai/avatars/${userId}`);

  // ── Upload ────────────────────────────────────────────────────────────────

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

  let response: Response;
  try {
    response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      // Do NOT set Content-Type — let the runtime set it with the boundary
    });
  } catch (networkError) {
    throw new CloudinaryUploadError(
      'Upload failed due to a network error. Please check your connection and try again.',
      'NETWORK',
    );
  }

  // ── Parse response ────────────────────────────────────────────────────────

  let json: Record<string, unknown>;
  try {
    json = (await response.json()) as Record<string, unknown>;
  } catch {
    throw new CloudinaryUploadError(
      'Upload failed — unexpected response from Cloudinary.',
      'UPLOAD_FAILED',
    );
  }

  if (!response.ok) {
    // Cloudinary error responses include a `error.message` field
    const detail =
      (json?.error as { message?: string } | undefined)?.message ?? `HTTP ${response.status}`;

    // 413 = file too large (Cloudinary returns this as a 400 with a message)
    if (
      response.status === 413 ||
      (typeof detail === 'string' && detail.toLowerCase().includes('too large'))
    ) {
      throw new CloudinaryUploadError(
        `Image is too large (max ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB). Please pick a smaller image.`,
        'FILE_TOO_LARGE',
      );
    }

    throw new CloudinaryUploadError(`Upload failed: ${detail}`, 'UPLOAD_FAILED');
  }

  const secureUrl = json.secure_url as string | undefined;
  const publicId = json.public_id as string | undefined;

  if (!secureUrl || !publicId) {
    throw new CloudinaryUploadError(
      'Upload succeeded but Cloudinary returned an unexpected response shape.',
      'UPLOAD_FAILED',
    );
  }

  return { secureUrl, publicId };
}
