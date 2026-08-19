import * as dns from 'dns';
import * as net from 'net';

// Cache để track DNS changes
let cachedAddresses: string[] = [];
let lastDnsCheckTime = 0;

export function getCachedAddresses(): string[] {
  return cachedAddresses;
}

export function setCachedAddresses(addresses: string[]): void {
  cachedAddresses = addresses;
}

export function customLookup(
  hostname: string,
  options: any,
  callback: (err: NodeJS.ErrnoException | null, address: any, family?: number) => void
): void {
  // Nếu đã là IP thì trả về luôn
  const ipVersion = net.isIP(hostname);
  if (ipVersion !== 0) {
    if (options?.all === true) {
      return callback(null, [{ address: hostname, family: ipVersion }]);
    }
    return callback(null, hostname, ipVersion);
  }

  // Phân giải DNS với all: true để lấy tất cả IP
  dns.lookup(hostname, { all: true, family: 4 }, (err, addresses: any) => {
    if (err || !addresses || addresses.length === 0) {
      console.warn(`[customLookup] DNS resolve failed for ${hostname}: ${err?.message}`);
      return callback(err || new Error(`No addresses found for ${hostname}`), null);
    }

    // ✅ Check if DNS addresses changed (FAILOVER DETECTION)
    const newAddresses = addresses.map((a: any) => a.address).sort();
    const oldAddresses = cachedAddresses.sort();
    
    if (JSON.stringify(oldAddresses) !== JSON.stringify(newAddresses)) {
      console.warn(`[customLookup] ⚠️ DNS CHANGE DETECTED for ${hostname}`);
      console.log(`[customLookup]   Old IPs: ${oldAddresses.join(', ')}`);
      console.log(`[customLookup]   New IPs: ${newAddresses.join(', ')}`);
      cachedAddresses = addresses.map((a: any) => a.address);
      
      // 🔴 Signal failover event to pool
      (process as any).emit('SQL_FAILOVER_DETECTED', { 
        hostname, 
        oldIps: oldAddresses, 
        newIps: newAddresses 
      });
    } else {
      cachedAddresses = addresses.map((a: any) => a.address);
    }

    // ✅ Return IPs in order DNS gives (không cần sắp xếp)
    // DNS server đã sắp xếp theo priority (AlwaysOn listener syntax)
    const wantAll = options?.all === true;

    if (wantAll) {
      // Trả về tất cả IPs theo thứ tự DNS
      console.log(`[customLookup] DNS returned IPs (in order): ${addresses.map((a: any) => a.address).join(', ')}`);
      callback(null, addresses);
    } else {
      // Trả về IP đầu tiên (DNS đã ưu tiên)
      const first = addresses[0];
      console.log(`[customLookup] Using first DNS IP: ${first.address}`);
      callback(null, first.address, first.family);
    }
  });
}