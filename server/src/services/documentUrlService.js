const s3 = require("../config/awsConfig");

const SIGNED_DOWNLOAD_TTL_SECONDS = 15 * 60;

function getStoredS3Key(value) {
  if (!value || !process.env.BUCKET_NAME) return null;

  let parsed;
  try {
    parsed = new URL(String(value));
  } catch (_error) {
    return null;
  }

  const bucket = String(process.env.BUCKET_NAME);
  const region = String(process.env.AWS_REGION || "");
  const virtualHost = `${bucket}.s3.${region}.amazonaws.com`;
  const regionalVirtualHost = `${bucket}.s3.amazonaws.com`;
  if (parsed.hostname !== virtualHost && parsed.hostname !== regionalVirtualHost) {
    return null;
  }

  const key = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  return key || null;
}

async function getPrivateDocumentUrl(value, { s3Client = s3 } = {}) {
  const key = getStoredS3Key(value);
  if (!key) return value;

  return s3Client.getSignedUrlPromise("getObject", {
    Bucket: process.env.BUCKET_NAME,
    Key: key,
    Expires: SIGNED_DOWNLOAD_TTL_SECONDS,
  });
}

module.exports = {
  SIGNED_DOWNLOAD_TTL_SECONDS,
  getStoredS3Key,
  getPrivateDocumentUrl,
};
