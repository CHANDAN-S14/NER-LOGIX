import { XMLParser } from 'fast-xml-parser';
import { AppError } from '../middleware/errorMiddleware.js';

const DEFAULT_SACHET_URL =
  'https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml';

const TRANSLATE_URL =
  'https://translate.googleapis.com/translate_a/single';

const cache = {
  expires: 0,
  data: null,
};

const CACHE_TTL_MS = 3 * 60 * 1000;
const TRANSLATION_CACHE_TTL_MS = 60 * 60 * 1000;

const translationCache = new Map();

/* ==========================================================
   BASIC HELPERS
========================================================== */

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function textOf(value) {
  if (value == null) {
    return null;
  }

  if (typeof value === 'string') {
    return value.trim() || null;
  }

  if (typeof value === 'object') {
    if (typeof value['#text'] === 'string') {
      return value['#text'].trim() || null;
    }
    if (typeof value._ === 'string') {
      return value._.trim() || null;
    }
  }

  return String(value).trim() || null;
}

/* ==========================================================
   LANGUAGE DETECTION & TRANSLATION
========================================================== */

function isProbablyEnglish(text) {
  if (!text) {
    return true;
  }

  const value = String(text).trim();
  if (!value) {
    return true;
  }

  /*
   * English letters, numbers and normal ASCII punctuation only.
   */
  return !/[^\x00-\x7F]/.test(value);
}

/**
 * Translate live SACHET text to English.
 * Uses Google's public translation endpoint.
 *
 * Important:
 * - No alert data is fabricated.
 * - If translation fails, original text is preserved.
 * - English text is returned unchanged.
 */
export async function translateToEnglish(text) {
  if (!text) {
    return text || '';
  }

  const value = String(text).trim();
  if (!value) {
    return '';
  }

  /*
   * Already English / ASCII.
   */
  if (isProbablyEnglish(value)) {
    return value;
  }

  const cached = translationCache.get(value);
  if (cached && cached.expires > Date.now()) {
    return cached.value;
  }

  try {
    const params = new URLSearchParams({
      client: 'gtx',
      sl: 'auto',
      tl: 'en',
      dt: 't',
      q: value.slice(0, 4500),
    });

    const response = await fetch(`${TRANSLATE_URL}?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'NER-LOGIX/1.0',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`Translation request failed (${response.status})`);
    }

    const data = await response.json();

    const translated = Array.isArray(data?.[0])
      ? data[0].map((part) => part?.[0] || '').join('').trim()
      : '';

    if (!translated) {
      throw new Error('Translation returned empty text');
    }

    translationCache.set(value, {
      value: translated,
      expires: Date.now() + TRANSLATION_CACHE_TTL_MS,
    });

    return translated;
  } catch (error) {
    console.warn('[SACHET] English translation fallback:', error.message);
    /*
     * Preserve original government text instead of inventing fake text.
     */
    return value;
  }
}

/**
 * Translate the user-visible fields of a SACHET alert.
 */
export async function translateAlert(alert) {
  if (!alert) {
    return alert;
  }

  const [
    englishTitle,
    englishDescription,
    englishArea,
    englishUrgency,
    englishSeverity,
    englishEvent,
  ] = await Promise.all([
    translateToEnglish(alert.title),
    translateToEnglish(alert.description),
    translateToEnglish(alert.area),
    translateToEnglish(alert.urgency),
    translateToEnglish(alert.severity),
    translateToEnglish(alert.event),
  ]);

  return {
    ...alert,

    /*
     * Keep original values for traceability.
     */
    originalTitle: alert.originalTitle || alert.title || null,
    originalDescription: alert.originalDescription || alert.description || null,
    originalArea: alert.originalArea || alert.area || null,

    /*
     * English display values.
     */
    title: englishTitle || alert.title || 'SACHET Hazard Alert',
    headline: englishTitle || alert.headline || alert.title || 'SACHET Hazard Alert',
    description: englishDescription || alert.description || '',
    area: englishArea || alert.area || '',
    urgency: englishUrgency || alert.urgency || null,
    severity: englishSeverity || alert.severity || null,
    event: englishEvent || alert.event || 'Disaster alert',

    language: 'en',
    translatedToEnglish: true,
  };
}

/* ==========================================================
   GEOMETRY EXTRACTION (WITHOUT INVENTING COORDINATES)
========================================================== */

function parsePolygonString(polyStr) {
  if (!polyStr) return null;
  const pairs = String(polyStr).match(/-?\d+\.?\d*\s*,\s*-?\d+\.?\d*/g);
  if (!pairs || pairs.length < 3) return null;

  const coordinates = [];
  for (const pair of pairs) {
    const [a, b] = pair.split(',').map((n) => Number(n.trim()));
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;

    /*
     * CAP format is lat,lon. GeoJSON format is [lng, lat].
     */
    if (Math.abs(a) <= 90 && Math.abs(b) <= 180) {
      coordinates.push([b, a]);
    } else if (Math.abs(b) <= 90 && Math.abs(a) <= 180) {
      coordinates.push([a, b]);
    }
  }

  if (coordinates.length < 3) return null;

  return {
    polygon: {
      type: 'Polygon',
      coordinates: [coordinates],
    },
    coordinates,
    latitude: coordinates[0][1],
    longitude: coordinates[0][0],
  };
}

function parseCircleString(circleStr) {
  if (!circleStr) return null;
  const match = String(circleStr).match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
  if (!match) return null;

  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    return { latitude: lat, longitude: lng };
  }
  return null;
}

function parsePointString(pointStr) {
  if (!pointStr) return null;
  const match = String(pointStr).match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
  if (!match) return null;

  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    return { latitude: lat, longitude: lng };
  }
  return null;
}

function parseGeoFromText(text) {
  if (!text) {
    return { polygon: null, area: null };
  }

  const areaMatch = text.match(/area[:\s]+([^\n|;]+)/i);
  const area = areaMatch ? areaMatch[1].trim() : null;

  const polyMatch = text.match(
    /(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)(?:\s+(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*))+/
  );

  if (!polyMatch) {
    return { polygon: null, area };
  }

  const parsed = parsePolygonString(text);
  return {
    polygon: parsed?.polygon || null,
    area,
  };
}

function extractCapGeo(capAlert, primaryInfo, areaDesc, entry) {
  const polyStr =
    textOf(primaryInfo?.['cap:area']?.['cap:polygon']) ||
    textOf(primaryInfo?.area?.polygon) ||
    textOf(capAlert?.['cap:polygon']) ||
    textOf(capAlert?.polygon);

  if (polyStr) {
    const parsed = parsePolygonString(polyStr);
    if (parsed) return parsed;
  }

  const circleStr =
    textOf(primaryInfo?.['cap:area']?.['cap:circle']) ||
    textOf(primaryInfo?.area?.circle);

  if (circleStr) {
    const parsed = parseCircleString(circleStr);
    if (parsed) {
      return {
        polygon: null,
        coordinates: null,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
      };
    }
  }

  const pointStr =
    textOf(primaryInfo?.['cap:area']?.['cap:point']) ||
    textOf(primaryInfo?.area?.point);

  if (pointStr) {
    const parsed = parsePointString(pointStr);
    if (parsed) {
      return {
        polygon: null,
        coordinates: null,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
      };
    }
  }

  const textBlob = [
    areaDesc,
    textOf(entry?.title),
    textOf(entry?.['georss:where']),
    textOf(entry?.['georss:point']),
  ]
    .filter(Boolean)
    .join('\n');

  const fromText = parseGeoFromText(textBlob);
  if (fromText?.polygon) {
    const firstCoord = fromText.polygon.coordinates?.[0]?.[0];
    return {
      polygon: fromText.polygon,
      coordinates: fromText.polygon.coordinates[0],
      latitude: firstCoord ? firstCoord[1] : null,
      longitude: firstCoord ? firstCoord[0] : null,
    };
  }

  /*
   * If coordinates are unavailable, do NOT invent fake coordinates.
   */
  return {
    polygon: null,
    coordinates: null,
    latitude: null,
    longitude: null,
  };
}

/* ==========================================================
   NORMALIZATION
========================================================== */

function normalizeItem(item, index = 0) {
  const title = textOf(item?.title);
  const description = textOf(item?.description);
  const guid = textOf(item?.guid) || textOf(item?.link) || `sachet-${index}`;
  const pubDate = textOf(item?.pubDate) || textOf(item?.published) || null;
  const category = textOf(item?.category);

  const blob = [title, description, category].filter(Boolean).join('\n');
  const { polygon, area } = parseGeoFromText(blob);

  const lower = blob.toLowerCase();
  let severity = null;
  if (/\b(extreme|catastrophic)\b/.test(lower)) severity = 'Extreme';
  else if (/\b(severe|high)\b/.test(lower)) severity = 'Severe';
  else if (/\b(moderate|medium)\b/.test(lower)) severity = 'Moderate';
  else if (/\b(minor|low)\b/.test(lower)) severity = 'Minor';

  let urgency = null;
  if (/\b(immediate|now)\b/.test(lower)) urgency = 'Immediate';
  else if (/\b(expected|soon)\b/.test(lower)) urgency = 'Expected';
  else if (/\b(future)\b/.test(lower)) urgency = 'Future';

  return {
    id: `sachet:${guid}`,
    source: 'SACHET / NDMA',
    sourceType: 'government',
    sourceAlertId: guid,
    type: 'potential_hazard',
    event: category || 'Disaster alert',
    title: title || 'SACHET Hazard Alert',
    headline: title || 'SACHET Hazard Alert',
    description: description || title || '',
    instruction: '',
    severity,
    urgency,
    certainty: null,
    effective: pubDate,
    expires: null,
    area: area || textOf(item?.['georss:where']) || '',
    originalTitle: title,
    originalDescription: description,
    originalArea: area || textOf(item?.['georss:where']) || '',
    polygon,
    coordinates: polygon ? polygon.coordinates[0] : null,
    latitude: polygon?.coordinates?.[0]?.[0]?.[1] ?? null,
    longitude: polygon?.coordinates?.[0]?.[0]?.[0] ?? null,
    status: 'open',
    link: textOf(item?.link),
    officialUrl: textOf(item?.link) || 'https://sachet.ndma.gov.in/',
    timestamp: pubDate || new Date().toISOString(),
    live: true,
  };
}

function parseCapAlertXml(xml, entry) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: true,
  });

  const parsed = parser.parse(xml);
  const capAlert = parsed?.['cap:alert'] || parsed?.alert;

  if (!capAlert) {
    return normalizeItem(entry);
  }

  const identifier =
    textOf(capAlert['cap:identifier']) ||
    textOf(capAlert.identifier) ||
    textOf(entry?.guid) ||
    textOf(entry?.link);

  const sender =
    textOf(capAlert['cap:sender']) ||
    textOf(capAlert.sender) ||
    textOf(entry?.author);

  const sent =
    textOf(capAlert['cap:sent']) ||
    textOf(capAlert.sent) ||
    textOf(entry?.pubDate) ||
    new Date().toISOString();

  const msgType =
    textOf(capAlert['cap:msgType']) ||
    textOf(capAlert.msgType) ||
    'Alert';

  const scope =
    textOf(capAlert['cap:scope']) ||
    textOf(capAlert.scope) ||
    'Public';

  const rawInfos = asArray(capAlert['cap:info'] || capAlert.info);

  /*
   * Identify English vs regional language info blocks.
   * NDMA CAP alerts often provide both an English (en-IN) block
   * and a regional language block (e.g., TL, HI, BN).
   */
  const englishInfo = rawInfos.find((inf) => {
    const lang = String(textOf(inf?.['cap:language']) || textOf(inf?.language) || '').toLowerCase();
    return lang.startsWith('en') || isProbablyEnglish(textOf(inf?.['cap:headline']) || textOf(inf?.headline));
  });

  const regionalInfo = rawInfos.find((inf) => {
    const lang = String(textOf(inf?.['cap:language']) || textOf(inf?.language) || '').toLowerCase();
    return !lang.startsWith('en') && !isProbablyEnglish(textOf(inf?.['cap:headline']) || textOf(inf?.headline));
  });

  const primaryInfo = englishInfo || rawInfos[0] || {};

  const headline =
    textOf(primaryInfo['cap:headline']) ||
    textOf(primaryInfo.headline) ||
    textOf(entry?.title) ||
    'SACHET Hazard Alert';

  const description =
    textOf(primaryInfo['cap:description']) ||
    textOf(primaryInfo.description) ||
    textOf(primaryInfo['cap:instruction']) ||
    textOf(primaryInfo.instruction) ||
    textOf(entry?.description) ||
    '';

  const instruction =
    textOf(primaryInfo['cap:instruction']) ||
    textOf(primaryInfo.instruction) ||
    '';

  const event =
    textOf(primaryInfo['cap:event']) ||
    textOf(primaryInfo.event) ||
    textOf(entry?.category) ||
    'Disaster alert';

  const urgency =
    textOf(primaryInfo['cap:urgency']) ||
    textOf(primaryInfo.urgency) ||
    null;

  const severity =
    textOf(primaryInfo['cap:severity']) ||
    textOf(primaryInfo.severity) ||
    null;

  const certainty =
    textOf(primaryInfo['cap:certainty']) ||
    textOf(primaryInfo.certainty) ||
    null;

  const effective =
    textOf(primaryInfo['cap:effective']) ||
    textOf(primaryInfo.effective) ||
    sent;

  const expires =
    textOf(primaryInfo['cap:expires']) ||
    textOf(primaryInfo.expires) ||
    null;

  const areaDesc =
    textOf(primaryInfo['cap:area']?.['cap:areaDesc']) ||
    textOf(primaryInfo.area?.areaDesc) ||
    textOf(primaryInfo['cap:area']) ||
    '';

  /*
   * Keep original government text for traceability.
   */
  const originalTitle =
    (regionalInfo ? (textOf(regionalInfo['cap:headline']) || textOf(regionalInfo.headline)) : null) ||
    textOf(entry?.title) ||
    headline;

  const originalDescription =
    (regionalInfo ? (textOf(regionalInfo['cap:description']) || textOf(regionalInfo.description) || textOf(regionalInfo['cap:instruction']) || textOf(regionalInfo.instruction)) : null) ||
    textOf(entry?.description) ||
    description;

  const originalArea =
    (regionalInfo ? (textOf(regionalInfo['cap:area']?.['cap:areaDesc']) || textOf(regionalInfo.area?.areaDesc)) : null) ||
    areaDesc;

  const geo = extractCapGeo(capAlert, primaryInfo, areaDesc, entry);

  return {
    id: `sachet:${identifier}`,
    source: 'SACHET / NDMA',
    sourceType: 'government',
    sourceAlertId: identifier,
    type: 'potential_hazard',
    event,
    title: headline,
    headline,
    description: description || instruction || '',
    instruction,
    severity,
    urgency,
    certainty,
    effective,
    expires,
    area: areaDesc,
    originalTitle,
    originalDescription,
    originalArea,
    polygon: geo.polygon,
    coordinates: geo.coordinates,
    latitude: geo.latitude,
    longitude: geo.longitude,
    sender,
    msgType,
    scope,
    status: 'open',
    link: textOf(entry?.link),
    officialUrl: textOf(entry?.link) || 'https://sachet.ndma.gov.in/',
    timestamp: effective || sent,
    live: true,
  };
}

/* ==========================================================
   DEDUPLICATION & EXPIRATION
========================================================== */

export function deduplicateAlerts(alerts) {
  const map = new Map();
  for (const alert of alerts) {
    if (!alert) continue;
    const key = alert.sourceAlertId || alert.id;
    if (key) {
      map.set(key, alert);
    }
  }
  return [...map.values()];
}

export function isExpired(alert) {
  if (!alert?.expires) {
    return false;
  }

  const expiresAt = Date.parse(alert.expires);
  if (!Number.isFinite(expiresAt)) {
    return false;
  }

  return expiresAt <= Date.now();
}

export function filterActiveAlerts(alerts) {
  return alerts.filter((alert) => !isExpired(alert));
}

/* ==========================================================
   FETCH LOGIC
========================================================== */

async function fetchSachetFeed(url) {
  let response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
        'User-Agent': 'NER-LOGIX/1.0',
      },
    });
  } catch (error) {
    throw new AppError(`SACHET feed unreachable: ${error.message}`, 503);
  }

  if (!response.ok) {
    throw new AppError(`SACHET feed failed (${response.status})`, 502);
  }

  return response.text();
}

export function getRelevantFeedItems(items) {
  return asArray(items).filter((item) => {
    if (!item) return false;
    const link = textOf(item.link);
    const title = textOf(item.title);
    return Boolean(link || title);
  });
}

export async function fetchCapAlert(entry) {
  const link = textOf(entry?.link);
  if (!link) {
    return normalizeItem(entry);
  }

  try {
    const response = await fetch(link, {
      headers: {
        Accept: 'application/cap+xml, application/xml, text/xml, */*',
        'User-Agent': 'NER-LOGIX/1.0',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn(`[SACHET] CAP request returned status ${response.status} for ${link}`);
      return normalizeItem(entry);
    }

    const xml = await response.text();
    return parseCapAlertXml(xml, entry);
  } catch (error) {
    console.warn(`[SACHET] Failed to fetch individual CAP alert (${link}):`, error.message);
    return normalizeItem(entry);
  }
}

/* ==========================================================
   MAIN GET ALERTS PIPELINE
========================================================== */

export async function getAlerts() {
  if (cache.data && cache.expires > Date.now()) {
    return {
      ...cache.data,
      alerts: cache.data.alerts.map((a) => ({ ...a, cached: true })),
    };
  }

  const url = process.env.SACHET_CAP_URL || DEFAULT_SACHET_URL;

  try {
    const xml = await fetchSachetFeed(url);
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      trimValues: true,
    });

    let parsed;
    try {
      parsed = parser.parse(xml);
    } catch (error) {
      throw new AppError(`Failed to parse SACHET XML: ${error.message}`, 502);
    }

    const channel = parsed?.rss?.channel || parsed?.feed || {};
    const rawItems = asArray(channel.item || channel.entry);

    /*
     * 1. Extract ALL relevant feed items
     */
    const feedEntries = getRelevantFeedItems(rawItems);

    /*
     * 2. Controlled concurrency fetching of individual CAP alerts (batchSize = 5)
     */
    const batchSize = 5;
    const fetchedAlerts = [];

    for (let i = 0; i < feedEntries.length; i += batchSize) {
      const batch = feedEntries.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map((entry) => fetchCapAlert(entry))
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          fetchedAlerts.push(result.value);
        }
      }
    }

    /*
     * 3. Deduplicate alerts
     */
    const uniqueAlerts = deduplicateAlerts(fetchedAlerts);

    /*
     * 4. Remove expired alerts
     */
    const activeAlerts = filterActiveAlerts(uniqueAlerts);

    /*
     * 5. Translate active alerts to English
     */
    const translateBatchSize = 5;
    const englishAlerts = [];
    for (let i = 0; i < activeAlerts.length; i += translateBatchSize) {
      const batch = activeAlerts.slice(i, i + translateBatchSize);
      const translatedBatch = await Promise.all(
        batch.map((alert) => translateAlert(alert))
      );
      englishAlerts.push(...translatedBatch);
    }

    /*
     * Backend debugging log (Requirement 17)
     */
    console.log(`[SACHET]
RSS feed items: ${feedEntries.length}
CAP alerts fetched: ${fetchedAlerts.length}
Active alerts: ${activeAlerts.length}
English alerts: ${englishAlerts.length}`);

    const result = {
      provider: 'SACHET / NDMA',
      configured: true,
      alerts: englishAlerts.map((a) => ({ ...a, cached: false })),
      count: englishAlerts.length,
    };

    cache.data = result;
    cache.expires = Date.now() + CACHE_TTL_MS;

    return result;
  } catch (error) {
    console.error('[SACHET] Feed error:', error.message);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(`SACHET service failed: ${error.message}`, 502);
  }
}

/* ==========================================================
   CACHE STATUS & CLEAR
========================================================== */

export function getSachetCacheStatus() {
  return {
    feedCached: Boolean(cache.data?.alerts),
    expires: cache.expires || null,
    cachedAlerts: cache.data?.alerts?.length || 0,
    translationsCached: translationCache.size,
  };
}

export function clearSachetCache() {
  cache.data = null;
  cache.expires = 0;
  translationCache.clear();
}

export default {
  getAlerts,
  getSachetCacheStatus,
  clearSachetCache,
  getRelevantFeedItems,
  fetchCapAlert,
  deduplicateAlerts,
  filterActiveAlerts,
  translateAlert,
  translateToEnglish,
};