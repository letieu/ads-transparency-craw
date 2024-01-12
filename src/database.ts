import mysql2 from "mysql2/promise"
import 'dotenv/config'
import { Advertiser, Creative } from "./router.js";

console.log("MYSQL_HOST");
console.log(process.env.MYSQL_HOST);

export const dbPool = mysql2.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  database: process.env.MYSQL_DATABASE,
  password: process.env.MYSQL_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
  idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

export namespace DB {
  export async function saveCreative(creative: Creative) {
    const advertiser = creative.advertiser;
    const variants = creative.variants;
    const image = getPreviewImage(creative);

    const connection = await dbPool.getConnection();
    await connection.beginTransaction();
    let error: any;

    try {
      const savedDomainId = await insertDomain(creative.domain);
      const savedAdvId = await insertAdvertiser(advertiser);
      const savedCreativeId = await insertCreative(creative, image, savedAdvId, savedDomainId);
      await insertManyRegions(creative.regions, savedCreativeId);

      await removeAllVariants(savedCreativeId);
      await insertManyVariant(variants, savedCreativeId);

      await connection.commit();
      console.log(`Updated creative ${creative.id} with ${variants.length} variants`);
    } catch (error) {
      await connection.rollback();
      console.log(error);
      error = error;
    } finally {
      connection.release();
    }

    if (error) throw error;
  }

  export async function getAllActiveDomains() {
    const [rows] = await dbPool.query<mysql2.RowDataPacket[]>(`
    SELECT * FROM domain WHERE status = 1
  `);

    return rows;
  }

  async function insertDomain(domain: string): Promise<number> {
    if (!domain || !domain?.trim()) return 0;

    const domainId = await searchDomainId(domain);
    if (domainId) return domainId;

    const [res] = await dbPool.query<mysql2.ResultSetHeader>(`
    INSERT INTO domain (domain)
    VALUES (?)
    ON DUPLICATE KEY UPDATE domain = ?
  `, [domain, domain]);

    return res.insertId;
  }

  async function searchDomainId(domain: string) {
    const [rows] = await dbPool.query<mysql2.RowDataPacket[]>(`
    SELECT id FROM domain
    WHERE domain = ?
  `, [domain]);

    return rows[0]?.id;
  }

  export async function insertAdvertiser(advertiser: Advertiser): Promise<number> {
    const advertiserId = await searchAdvertiserId(advertiser.id);
    if (advertiserId) return advertiserId;

    const [res] = await dbPool.query<mysql2.ResultSetHeader>(`
    INSERT INTO advertiser (code, name)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE name = ?
  `, [advertiser.id, advertiser.name, advertiser.name]);

    return res.insertId;
  }

  async function searchAdvertiserId(advertiserCode: string) {
    const [rows] = await dbPool.query<mysql2.RowDataPacket[]>(`
    SELECT id FROM advertiser
    WHERE code = ?
  `, [advertiserCode]);

    return rows[0]?.id;
  }

  async function insertCreative(creative: Creative, image: string, advertiserDbId: number, domainDbId: number): Promise<number> {
    const creativeId = await searchCreativeId(creative.id);
    if (creativeId) return creativeId;

    const [res] = await dbPool.query<mysql2.ResultSetHeader>(`
    INSERT INTO creative (code, last_show, type, advertiser_id, image, domain_id, link)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE last_show = ?, image = ?
  `, [creative.id, creative.lastShow, creativeFormatToNumber(creative.format), advertiserDbId, image, domainDbId, creative.link, creative.lastShow, image]);

    return res.insertId;
  }

  async function searchCreativeId(creativeCode: string) {
    const [rows] = await dbPool.query<mysql2.RowDataPacket[]>(`
    SELECT id FROM creative
    WHERE code = ?
  `, [creativeCode]);

    return rows[0]?.id;
  }

  async function insertManyVariant(variants: Creative['variants'], creativeDbId: number) {
    const template = `
    INSERT INTO creative_detail (creative_id, content, content_html, image_screenshot, url_video, urls, images)
    VALUES ?
    `;

    const values = variants.map((variant) => {
      const { images, urls } = variant.medias
        .filter((media) => media.type === 'image')
        .reduce((acc, media) => {
          if (media.url) {
            acc.images.push(media.url);
            acc.urls.push(media.clickUrl);
          }
          return acc;
        }, { images: [], urls: [] } as { images: string[], urls: string[] });

      const videoUrl = variant.medias.find((media) => media.type === 'video')?.url || '';

      return [
        creativeDbId,
        variant.iframeUrl,
        variant.html,
        variant.screenshot,
        videoUrl,
        JSON.stringify(urls),
        JSON.stringify(images),
      ];
    });

    const [res] = await dbPool.query<mysql2.ResultSetHeader>(template, [values]);

    return res.affectedRows;
  }

  async function removeAllVariants(creativeId: number) {
    const [res] = await dbPool.query<mysql2.ResultSetHeader>(`
    DELETE FROM creative_detail
    WHERE creative_id = ?
  `, [creativeId]);

    return res;
  }

  async function insertManyRegions(regions: string[], savedCreativeId: number) {
    const regionIds = await searchRegionsByNames(regions);

    const template = `
    INSERT INTO creative_region (creative_id, region_id)
    VALUES ?
    `;

    const values = regionIds.map((region) => [savedCreativeId, region.id]);

    const [res] = await dbPool.query<mysql2.ResultSetHeader>(template, [values]);
    return res;
  }

  async function searchRegionsByNames(regions: string[]) {
    const [rows] = await dbPool.query<mysql2.RowDataPacket[]>(`
    SELECT id, name FROM region
    WHERE name IN (?)
  `, [regions]);

    return rows;
  }
}

function creativeFormatToNumber(format: Creative['format']) {
  switch (format) {
    case 'TEXT':
      return 1;
    case 'IMAGE':
      return 2;
    case 'VIDEO':
      return 3;
    default:
      return 0;
  }
}

function getPreviewImage(creative: Creative) {
  // use preview image if available
  if (creative.previewImage) return creative.previewImage;

  const variants = creative.variants;

  // use screenshot if available
  for (const variant of variants) {
    if (variant.screenshot) {
      return variant.screenshot;
    }
  }

  // use first image if available
  for (const variant of variants) {
    if (variant.medias.length) {
      return variant.medias[0].url;
    }
  }

  return '';
}
