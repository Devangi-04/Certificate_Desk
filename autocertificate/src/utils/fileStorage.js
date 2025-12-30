const fs = require('fs');
const path = require('path');
const { v4: uuid } = require('uuid');

const ROOT_DIR = path.resolve(__dirname, '../../');
const STORAGE_ROOT = path.join(ROOT_DIR, 'storage');

const STORAGE_DIRECTORIES = {
  templates: path.join(STORAGE_ROOT, 'templates'),
  data: path.join(STORAGE_ROOT, 'data'),
  generated: path.join(STORAGE_ROOT, 'generated'),
};

function getBlobToken() {
  const token = process.env['BLOB_READ_WRITE_TOKEN'];
  return typeof token === 'string' ? token.trim() : '';
}

function useBlobStorage() {
  return Boolean(getBlobToken());
}

let blobModulePromise;
async function getBlobModule() {
  if (!blobModulePromise) {
    blobModulePromise = import('@vercel/blob');
  }
  return blobModulePromise;
}

function ensureDirectorySync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function ensureStorageDirectories() {
  if (useBlobStorage()) {
    return;
  }
  ensureDirectorySync(STORAGE_ROOT);
  Object.values(STORAGE_DIRECTORIES).forEach(ensureDirectorySync);
}

function getStorageDir(key) {
  const target = STORAGE_DIRECTORIES[key];
  if (!target) {
    throw new Error(`Unsupported storage directory key: ${key}`);
  }
  return target;
}

function buildFileName(dirKey, extension = '', customName = '') {
  const ext = extension || '';
  if (customName) {
    return `${dirKey}/${customName}${ext}`.replace(/\/+/, '/');
  }
  return `${dirKey}/${uuid()}${ext}`;
}

async function saveBufferToStorage(buffer, dirKey, extension = '', customName = '', options = {}) {
  if (useBlobStorage()) {
    const { put } = await getBlobModule();
    const blobPath = buildFileName(dirKey, extension, customName);
    const blobToken = getBlobToken();
    const result = await put(blobPath, buffer, {
      access: 'public',
      token: blobToken,
      contentType: options.contentType || 'application/octet-stream',
    });

    return {
      storedName: path.basename(result.pathname),
      absolutePath: null,
      relativePath: result.url,
      blob: result,
    };
  }

  const targetDir = getStorageDir(dirKey);
  const ext = extension || '';
  const fileName = customName ? `${customName}${ext}` : `${uuid()}${ext}`;
  const absolutePath = path.join(targetDir, fileName);

  await fs.promises.writeFile(absolutePath, buffer);

  const relativePath = path.relative(ROOT_DIR, absolutePath).replace(/\\/g, '/');

  return {
    storedName: fileName,
    absolutePath,
    relativePath,
  };
}

function resolveFromRoot(relativePath) {
  if (!relativePath) return relativePath;
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  return path.join(ROOT_DIR, relativePath);
}

async function deleteFromStorage(storedPath) {
  if (!storedPath) return;
  if (storedPath.startsWith('http://') || storedPath.startsWith('https://')) {
    if (!useBlobStorage()) return;
    const { del } = await getBlobModule();
    await del(storedPath, { token: getBlobToken() }).catch(() => null);
    return;
  }

  const absolutePath = resolveFromRoot(storedPath);
  await fs.promises.unlink(absolutePath).catch(() => null);
}

async function readFromStorage(storedPath) {
  if (!storedPath) {
    throw new Error('Stored path is required to read from storage');
  }
  if (storedPath.startsWith('http://') || storedPath.startsWith('https://')) {
    const response = await fetch(storedPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch file from blob storage: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  const absolutePath = resolveFromRoot(storedPath);
  return fs.promises.readFile(absolutePath);
}

module.exports = {
  ensureStorageDirectories,
  saveBufferToStorage,
  getStorageDir,
  resolveFromRoot,
  deleteFromStorage,
  readFromStorage,
  STORAGE_ROOT,
  ROOT_DIR,
  useBlobStorage,
};
