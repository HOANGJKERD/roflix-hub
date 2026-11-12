// Private Backblaze B2 playback signer for RoFlix.
// Uses Node built-ins only. Never expose B2 credentials to the browser.
const crypto = require('crypto');

function encodeRfc3986(value) {
  return encodeURIComponent(String(value)).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function encodeObjectKey(key) {
  return String(key).split('/').map(encodeRfc3986).join('/');
}

function hmac(key, value, encoding) {
  return crypto.createHmac('sha256', key).update(value, 'utf8').digest(encoding);
}

function signedGetUrl({ endpoint, bucket, region, accessKeyId, secretAccessKey, key, expires = 900, now = new Date() }) {
  const base = new URL(endpoint);
  if (base.protocol !== 'https:') throw new Error('B2 endpoint must use HTTPS');
  if (!Number.isInteger(expires) || expires < 1 || expires > 604800) throw new Error('Invalid URL expiry');

  const host = base.host;
  const canonicalUri = (base.pathname.replace(/\/$/, '') || '') + '/' + encodeRfc3986(bucket) + '/' + encodeObjectKey(key);
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const scope = dateStamp + '/' + region + '/s3/aws4_request';
  const params = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': accessKeyId + '/' + scope,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expires),
    'X-Amz-SignedHeaders': 'host'
  };
  const canonicalQuery = Object.keys(params).sort().map(k => encodeRfc3986(k) + '=' + encodeRfc3986(params[k])).join('&');
  const canonicalRequest = ['GET', canonicalUri, canonicalQuery, 'host:' + host + '\n', 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, crypto.createHash('sha256').update(canonicalRequest).digest('hex')].join('\n');
  const kDate = hmac('AWS4' + secretAccessKey, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = hmac(kSigning, stringToSign, 'hex');
  return base.origin + canonicalUri + '?' + canonicalQuery + '&X-Amz-Signature=' + signature;
}

function safeObjectKey(value) {
  const key = String(value || '').trim().replace(/^\/+/, '');
  if (!key || key.length > 1024 || key.includes('\\') || /[?#\u0000-\u001f]/.test(key)) return '';
  const parts = key.split('/');
  if (parts.some(part => !part || part === '.' || part === '..')) return '';
  // Existing test uploads live in "ben 10"; future RoFlix uploads use roflix/.
  if (!(key.startsWith('ben 10/') || key.startsWith('roflix/'))) return '';
  if (!/\.(?:mp4|m4v|webm)$/i.test(key)) return '';
  return key;
}


module.exports = async function b2PlaybackHandler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Accept');
    return res.status(204).end();
  }
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  const key = safeObjectKey(req.query?.key);
  if (!key) return res.status(400).json({ ok: false, error: 'invalid_or_disallowed_object_key' });

  const required = ['B2_ENDPOINT', 'B2_REGION', 'B2_BUCKET', 'B2_ACCESS_KEY_ID', 'B2_SECRET_ACCESS_KEY'];
  const missing = required.filter(name => !process.env[name]);
  if (missing.length) return res.status(503).json({ ok: false, error: 'b2_configuration_missing', missing });

  try {
    const url = signedGetUrl({
      endpoint: process.env.B2_ENDPOINT,
      region: process.env.B2_REGION,
      bucket: process.env.B2_BUCKET,
      accessKeyId: process.env.B2_ACCESS_KEY_ID,
      secretAccessKey: process.env.B2_SECRET_ACCESS_KEY,
      key,
      expires: 7200
    });
    return res.status(200).json({ ok: true, url, expiresIn: 7200, contentType: /\.m3u8$/i.test(key) ? 'application/vnd.apple.mpegurl' : 'video/mp4' });
  } catch (error) {
    console.error('[RoFlix B2 signer]', error && error.message);
    return res.status(502).json({ ok: false, error: 'b2_signing_failed' });
  }
};

module.exports._test = { encodeRfc3986, encodeObjectKey, safeObjectKey, signedGetUrl };
