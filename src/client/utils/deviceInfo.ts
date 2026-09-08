/**
 * Utilidad para detección de características del equipo/máquina de votación
 * Garantiza persistencia del identificador de estación y recopilación de huella técnica
 */

export interface DeviceMetadata {
  station_id: string;
  device_type: string;
  os_name: string;
  browser_name: string;
  screen_resolution: string;
}

const STATION_KEY = 'colegio_voting_station_id';
const STATION_NAME_KEY = 'colegio_voting_station_name';

export function getOrInitStationId(): string {
  try {
    const customName = localStorage.getItem(STATION_NAME_KEY);
    if (customName && customName.trim()) {
      return customName.trim();
    }

    let stationId = localStorage.getItem(STATION_KEY);
    if (!stationId) {
      // Generar identificador único y legible para el equipo
      const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      stationId = `EQUIPO-${randomSuffix}`;
      localStorage.setItem(STATION_KEY, stationId);
    }
    return stationId;
  } catch {
    return 'EQUIPO-LOCAL';
  }
}

export function setCustomStationName(name: string): void {
  try {
    if (name && name.trim()) {
      localStorage.setItem(STATION_NAME_KEY, name.trim());
    } else {
      localStorage.removeItem(STATION_NAME_KEY);
    }
  } catch {
    // Ignorar si localStorage está bloqueado
  }
}

export function getCustomStationName(): string | null {
  try {
    return localStorage.getItem(STATION_NAME_KEY);
  } catch {
    return null;
  }
}

export function detectDeviceMetadata(): DeviceMetadata {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  let os_name = 'Desconocido';
  let browser_name = 'Navegador Web';
  let device_type = 'Computador de Escritorio';

  // Detección de Sistema Operativo
  if (/Windows NT 10.0/i.test(ua)) os_name = 'Windows 10/11';
  else if (/Windows NT 6.3/i.test(ua)) os_name = 'Windows 8.1';
  else if (/Windows/i.test(ua)) os_name = 'Windows';
  else if (/Macintosh|Mac OS X/i.test(ua)) os_name = 'macOS';
  else if (/CrOS/i.test(ua)) os_name = 'ChromeOS';
  else if (/Android/i.test(ua)) os_name = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os_name = 'iOS';
  else if (/Linux/i.test(ua)) os_name = 'Linux';

  // Detección de Navegador
  if (/Edg\//i.test(ua)) browser_name = 'Microsoft Edge';
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser_name = 'Google Chrome';
  else if (/Firefox\//i.test(ua)) browser_name = 'Mozilla Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser_name = 'Apple Safari';
  else if (/Opera|OPR\//i.test(ua)) browser_name = 'Opera';

  // Detección de Tipo de Dispositivo
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) {
    device_type = 'Tablet Institucional';
  } else if (/Mobi|iPhone|Android.*Mobile/i.test(ua)) {
    device_type = 'Dispositivo Móvil';
  } else {
    // Computador (PC / Laptop)
    const isTouch = typeof navigator !== 'undefined' && (navigator.maxTouchPoints > 0);
    device_type = isTouch ? 'Portátil / Táctil' : 'PC de Escritorio';
  }

  // Resolución
  const screen_resolution = typeof window !== 'undefined' && window.screen
    ? `${window.screen.width}x${window.screen.height}`
    : 'N/A';

  return {
    station_id: getOrInitStationId(),
    device_type,
    os_name,
    browser_name,
    screen_resolution
  };
}
