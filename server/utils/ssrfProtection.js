/**
 * MediAgent — SSRF Protection
 *
 * Validates outbound URL destinations to prevent Server-Side Request
 * Forgery attacks against internal infrastructure, cloud metadata
 * endpoints, and private networks.
 *
 * Only HTTP/HTTPS schemes are allowed. Destinations are resolved and
 * checked against private/reserved IP ranges per RFC 1918, RFC 5735,
 * RFC 6598, and cloud metadata ranges.
 */

const net = require('net');
const dns = require('dns').promises;

/**
 * Private/reserved IP ranges (CIDR) that must not be accessed.
 * Includes RFC 1918, loopback, link-local, multicast, and cloud metadata.
 */
const PRIVATE_RANGES = [
  { start: '0.0.0.0', end: '0.255.255.255' },        // "This" network
  { start: '10.0.0.0', end: '10.255.255.255' },      // RFC 1918
  { start: '100.64.0.0', end: '100.127.255.255' },   // RFC 6598 (CGN)
  { start: '127.0.0.0', end: '127.255.255.255' },    // Loopback
  { start: '169.254.0.0', end: '169.254.255.255' },  // Link-local / metadata
  { start: '172.16.0.0', end: '172.31.255.255' },    // RFC 1918
  { start: '192.0.0.0', end: '192.0.0.255' },        // IETF protocol assignments
  { start: '192.0.2.0', end: '192.0.2.255' },        // TEST-NET-1
  { start: '192.88.99.0', end: '192.88.99.255' },    // 6to4 relay anycast
  { start: '192.168.0.0', end: '192.168.255.255' },  // RFC 1918
  { start: '198.18.0.0', end: '198.19.255.255' },    // Benchmarking
  { start: '198.51.100.0', end: '198.51.100.255' },  // TEST-NET-2
  { start: '203.0.113.0', end: '203.0.113.255' },    // TEST-NET-3
  { start: '224.0.0.0', end: '239.255.255.255' },    // Multicast
  { start: '240.0.0.0', end: '255.255.255.255' },    // Reserved
  { start: '::1', end: '::1' },                       // IPv6 loopback
  { start: 'fc00::', end: 'fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff' }, // IPv6 unique local
  { start: 'fe80::', end: 'febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff' }, // IPv6 link-local
];

// AWS / GCP / Azure metadata endpoints (hostname-based)
const METADATA_HOSTNAMES = [
  '169.254.169.254',           // AWS / GCP / Azure metadata
  'metadata.google.internal',  // GCP metadata
  'metadata.azure.com',        // Azure metadata
  'local.mediagent.internal',
];

/**
 * Convert an IPv4 string to a 32-bit integer.
 * @param {string} ip
 * @returns {number|null}
 */
function ipToNumber(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let num = 0;
  for (const part of parts) {
    const val = parseInt(part, 10);
    if (isNaN(val) || val < 0 || val > 255) return null;
    num = (num << 8) | val;
  }
  return num >>> 0;
}

/**
 * Check whether an IPv4 address falls within a private range.
 * @param {string} ip
 * @returns {boolean}
 */
function isPrivateIPv4(ip) {
  const num = ipToNumber(ip);
  if (num === null) return false;
  for (const range of PRIVATE_RANGES) {
    if (!range.start.includes(':')) {
      const start = ipToNumber(range.start);
      const end = ipToNumber(range.end);
      if (start !== null && end !== null && num >= start && num <= end) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check whether an IPv6 address is loopback or unique-local.
 * @param {string} ip
 * @returns {boolean}
 */
function isPrivateIPv6(ip) {
  if (ip === '::1' || ip === '::/128') return true;
  if (ip.startsWith('fc00:') || ip.startsWith('fd')) return true;
  if (ip.startsWith('fe80:')) return true;
  return false;
}

/**
 * Validate a URL destination for SSRF safety.
 * Resolves hostnames and checks resolved IPs against private ranges.
 * @param {string} url - URL string
 * @returns {Object} { allowed: boolean, reason?: string, hostname?: string, ips?: string[] }
 */
async function validateUrlDestination(url) {
  if (!url || typeof url !== 'string') {
    return { allowed: false, reason: 'URL is required' };
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { allowed: false, reason: 'Invalid URL format' };
  }

  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    return { allowed: false, reason: `Unsupported protocol: ${protocol}` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block metadata hostnames directly
  if (METADATA_HOSTNAMES.includes(hostname)) {
    return { allowed: false, reason: 'Metadata endpoint access is not allowed' };
  }

  // Block localhost/loopback hostnames
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return { allowed: false, reason: 'Localhost access is not allowed' };
  }

  // Resolve hostname to IPs and check each
  let ips;
  try {
    const resolved = await dns.lookup(hostname, { all: true });
    ips = resolved.map((r) => r.address);
  } catch {
    return { allowed: false, reason: 'Unable to resolve hostname' };
  }

  if (!ips || ips.length === 0) {
    return { allowed: false, reason: 'No IP addresses resolved' };
  }

  for (const ip of ips) {
    if (ip.includes(':')) {
      if (isPrivateIPv6(ip)) {
        return { allowed: false, reason: `Resolved IP ${ip} is in a private range` };
      }
    } else {
      if (isPrivateIPv4(ip)) {
        return { allowed: false, reason: `Resolved IP ${ip} is in a private range` };
      }
    }
  }

  return {
    allowed: true,
    hostname,
    ips,
    reason: null,
  };
}

/**
 * Synchronous URL scheme check (for quick validation without DNS lookup).
 * @param {string} url
 * @returns {boolean}
 */
function isAllowedScheme(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

module.exports = {
  validateUrlDestination,
  isAllowedScheme,
  PRIVATE_RANGES,
  METADATA_HOSTNAMES,
};
