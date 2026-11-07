import dns from 'node:dns/promises';
import net from 'node:net';
import type { LookupFunction } from 'node:net';

export type RemoteAddress = { address: string; family: 4 | 6 };
export type ValidatedRemoteUrl = { url: URL; addresses: RemoteAddress[] };
type Resolver = (hostname: string) => Promise<Array<{ address: string; family?: number }>>;

const v4Denied = ['0.0.0.0/8','10.0.0.0/8','100.64.0.0/10','127.0.0.0/8','169.254.0.0/16','172.16.0.0/12','192.0.0.0/24','192.0.2.0/24','192.88.99.0/24','192.168.0.0/16','198.18.0.0/15','198.51.100.0/24','203.0.113.0/24','224.0.0.0/4','240.0.0.0/4'];
const v6Allowed = ['2000::/3'];
const v6Denied = ['2001::/23','2001:db8::/32','2002::/16','3fff::/20'];
function inCidr(ip: string, cidr: string): boolean {
  const [base, bitsText] = cidr.split('/'); const bits = Number(bitsText);
  const family = net.isIP(ip); if (!family || family !== net.isIP(base)) return false;
  const toBig = (value: string) => {
    if (family === 4) return value.split('.').reduce((n, octet) => (n << 8n) | BigInt(octet), 0n);
    const normalized = value.toLowerCase();
    const halves = normalized.split('::');
    const left = halves[0] ? halves[0].split(':') : []; const right = halves[1] ? halves[1].split(':') : [];
    const words = halves.length === 2 ? [...left, ...Array(8-left.length-right.length).fill('0'), ...right] : left;
    return words.reduce((n, word) => (n << 16n) | BigInt(parseInt(word || '0', 16)), 0n);
  };
  const width = family === 4 ? 32 : 128; const shift = BigInt(width - bits);
  return (toBig(ip) >> shift) === (toBig(base) >> shift);
}
export function isPublicAddress(address: string): boolean {
  const family = net.isIP(address);
  if (family === 4) return !v4Denied.some((cidr) => inCidr(address, cidr));
  if (family === 6) return !address.toLowerCase().startsWith('::ffff:') && v6Allowed.some((cidr) => inCidr(address, cidr)) && !v6Denied.some((cidr) => inCidr(address, cidr));
  return false;
}

export async function validateRemoteUrl(value: string, resolver: Resolver = async (host) => dns.lookup(host, { all: true })): Promise<ValidatedRemoteUrl> {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Niedozwolony adres URL.');
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host === 'metadata.google.internal') throw new Error('Niedozwolony host URL.');
  const records = net.isIP(host) ? [{ address: host, family: net.isIP(host) }] : await resolver(host);
  const addresses = records.map(({ address, family }) => ({ address, family: (family || net.isIP(address)) as 4 | 6 }));
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) throw new Error('Niedozwolony adres sieciowy.');
  return { url, addresses };
}

export function pinnedLookup(addresses: RemoteAddress[]): LookupFunction {
  return ((_hostname: string, options: number | { all?: boolean }, callback: (...args: any[]) => void) => {
    const all = typeof options === 'object' && options.all;
    if (all) callback(null, addresses);
    else callback(null, addresses[0].address, addresses[0].family);
  }) as LookupFunction;
}
