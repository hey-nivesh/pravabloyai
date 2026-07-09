/**
 * cloudinaryUpload.ts — Avatar upload service.
 *
 * Primary path: authenticated server proxy (signed Cloudinary upload).
 * Fallback: direct unsigned client upload when the server is unreachable.
 */

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

import { API_BASE } from '@/hooks/use-daily-word';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CloudinaryUploadResult = {
  secureUrl: string;
  publicId: string;
};

export type AvatarUploadInput = {
  uri: string;
  /** Prefer passing base64 from ImagePicker (`base64: true`) — most reliable on RN */
  base64?: string | null;
  mimeType?: string | null;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeUploadUri(localUri: string): string {
  if (Platform.OS === 'android' && !localUri.startsWith('file://') && !localUri.startsWith('content://')) {
    return `file://${localUri}`;
  }
  return localUri;
}

function resolveMimeType(localUri: string, pickerMime?: string | null): string {
  if (pickerMime?.startsWith('image/')) {
    // HEIC/HEIF from the picker — Cloudinary accepts JPEG uploads
    if (pickerMime === 'image/heic' || pickerMime === 'image/heif') {
      return 'image/jpeg';
    }
    return pickerMime;
  }

  const extension = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/jpeg',
    heif: 'image/jpeg',
  };
  return mimeMap[extension] ?? 'image/jpeg';
}

function assertBase64Size(base64: string): void {
  if (!base64) {
    throw new CloudinaryUploadError('The selected image appears to be empty.', 'UPLOAD_FAILED');
  }
  // Base64 is ~4/3 of raw size
  const approxBytes = Math.ceil((base64.length * 3) / 4);
  if (approxBytes > MAX_FILE_SIZE_BYTES) {
    throw new CloudinaryUploadError(
      `Image is too large (max ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB). Please pick a smaller image.`,
      'FILE_TOO_LARGE',
    );
  }
}

async function readImageBase64(input: AvatarUploadInput): Promise<{ base64: string; mimeType: string }> {
  const mimeType = resolveMimeType(input.uri, input.mimeType);

  if (input.base64) {
    assertBase64Size(input.base64);
    return { base64: input.base64, mimeType };
  }

  const uri = normalizeUploadUri(input.uri);

  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    assertBase64Size(base64);
    return { base64, mimeType };
  } catch {
    throw new CloudinaryUploadError(
      'Could not read the selected image. Please try another photo.',
      'UPLOAD_FAILED',
    );
  }
}

async function parseJsonResponse(response: Response): Promise<Record<string, unknown>> {
  const rawText = await response.text();
  try {
    return JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    const preview = rawText.trim().slice(0, 120);
    throw new CloudinaryUploadError(
      response.ok
        ? 'Upload failed — server returned an invalid response.'
        : `Upload failed (HTTP ${response.status}). ${preview.startsWith('<') ? 'Is the API server running?' : preview}`,
      response.ok ? 'UPLOAD_FAILED' : 'NETWORK',
    );
  }
}

async function uploadViaServerProxy(input: AvatarUploadInput): Promise<CloudinaryUploadResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new CloudinaryUploadError('You must be signed in to upload an avatar.', 'UPLOAD_FAILED');
  }

  const { base64, mimeType } = await readImageBase64(input);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/profile/avatar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageBase64: base64, mimeType }),
    });
  } catch {
    throw new CloudinaryUploadError(
      'Upload failed due to a network error. Please check your connection and try again.',
      'NETWORK',
    );
  }

  const json = await parseJsonResponse(response);
  if (!response.ok) {
    const detail = (json.error as string | undefined) ?? `HTTP ${response.status}`;
    if (response.status === 413) {
      throw new CloudinaryUploadError(detail, 'FILE_TOO_LARGE');
    }
    throw new CloudinaryUploadError(detail, 'UPLOAD_FAILED');
  }

  const secureUrl = json.secureUrl as string | undefined;
  const publicId = json.publicId as string | undefined;
  if (!secureUrl || !publicId) {
    throw new CloudinaryUploadError(
      'Upload succeeded but the server returned an unexpected response.',
      'UPLOAD_FAILED',
    );
  }

  return { secureUrl, publicId };
}

async function uploadViaCloudinaryDirect(
  input: AvatarUploadInput,
  userId: string,
): Promise<CloudinaryUploadResult> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new CloudinaryUploadError(
      'Cloudinary is not configured. Set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and ' +
        'EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET in your .env file.',
      'CONFIG_MISSING',
    );
  }

  const { base64, mimeType } = await readImageBase64(input);

  const formData = new FormData();
  // Cloudinary accepts data-URI base64 for unsigned uploads
  formData.append('file', `data:${mimeType};base64,${base64}`);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', `pravabloyai/avatars/${userId}`);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

  let response: Response;
  try {
    response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });
  } catch {
    throw new CloudinaryUploadError(
      'Upload failed due to a network error. Please check your connection and try again.',
      'NETWORK',
    );
  }

  const json = await parseJsonResponse(response);
  if (!response.ok) {
    const detail =
      (json?.error as { message?: string } | undefined)?.message ?? `HTTP ${response.status}`;
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

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Uploads an avatar image picked from the device photo library.
 * Pass `base64` from ImagePicker (`base64: true`) for best reliability on mobile.
 */
export async function uploadAvatarImage(
  input: AvatarUploadInput,
  userId: string,
): Promise<CloudinaryUploadResult> {
  try {
    return await uploadViaServerProxy(input);
  } catch (serverErr) {
    if (__DEV__) {
      console.warn('[uploadAvatarImage] server proxy failed, trying direct Cloudinary:', serverErr);
    }

    if (
      serverErr instanceof CloudinaryUploadError &&
      (serverErr.code === 'NETWORK' || serverErr.code === 'UPLOAD_FAILED')
    ) {
      return uploadViaCloudinaryDirect(input, userId);
    }

    throw serverErr;
  }
}
