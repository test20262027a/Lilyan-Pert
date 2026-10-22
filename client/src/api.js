const BASE = '/api';

let businessId = null;

export function setBusinessId(id) {
  businessId = id || null;
}

export function getBusinessId() {
  return businessId;
}

export class ApiError extends Error {
  constructor(code, detail, status) {
    super(code);
    this.code = code;
    this.detail = detail;
    this.status = status;
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (businessId) headers['X-Business-Id'] = businessId;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: 'BAD_RESPONSE' };
    }
  }

  if (!res.ok) {
    throw new ApiError(data?.error || 'REQUEST_FAILED', data?.message, res.status);
  }
  return data;
}

export const get = (path) => api(path);
export const post = (path, body) => api(path, { method: 'POST', body });
export const put = (path, body) => api(path, { method: 'PUT', body });
export const patch = (path, body) => api(path, { method: 'PATCH', body });
export const del = (path) => api(path, { method: 'DELETE' });

/**
 * Stores an already-prepared data URL (a cropped, resized avatar) via the same
 * media endpoint and returns its permanent reference.
 */
export async function uploadImageDataUrl(dataUrl) {
  const result = await post('/manage/media', { data_url: dataUrl });
  return result.url;
}

/** Reads an image file and stores it via the media endpoint. */
export function uploadImage(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('NO_FILE'));
    if (file.size > 8 * 1024 * 1024) return reject(new Error('IMAGE_TOO_LARGE'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('READ_FAILED'));
    reader.onload = async () => {
      try {
        const result = await post('/manage/media', { data_url: reader.result });
        resolve(result.url);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsDataURL(file);
  });
}
