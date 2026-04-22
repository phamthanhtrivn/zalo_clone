import UAParserImport from 'ua-parser-js';
import geoip from 'geoip-lite';

const UAParser = UAParserImport as unknown as {
  new (ua?: string): UAParserImport.UAParser;
};

// Hàm này không quan tâm là HTTP hay WebSocket, cứ đưa IP và UA đây là nó parse
export function parseClientInfo(userAgent: string, ipStr: string) {
  let ip = ipStr || '127.0.0.1';
  if (typeof ip !== 'string') ip = ip[0];
  ip = ip.split(',')[0].trim();

  const parser = new UAParser(userAgent);
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();

  let deviceName = 'Thiết bị không xác định';
  if (device.model) {
    deviceName = `${device.vendor || ''} ${device.model}`.trim();
  } else if (os.name) {
    deviceName =
      `${os.name} ${os.version || ''} - ${browser.name || ''}`.trim();
  }

  let deviceType: 'browser' | 'mobile' | 'tablet' = 'browser';
  if (device.type === 'mobile' || device.type === 'wearable') {
    deviceType = 'mobile';
  } else if (device.type === 'tablet') {
    deviceType = 'tablet';
  }

  const geo = geoip.lookup(ip);
  const location = geo
    ? `${geo.city}, ${geo.country}`
    : 'Vị trí không xác định';

  return { deviceName, deviceType, ip, location };
}
