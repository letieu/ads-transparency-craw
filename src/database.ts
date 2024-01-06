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

    const savedAdvId = await insertAdvertiser(advertiser);
    const savedCreativeId = await insertCreative(creative, savedAdvId);

    await removeAllVariants(savedCreativeId);
    await insertManyVariant(variants, savedCreativeId);

    console.log(`Updated creative ${creative.id} with ${variants.length} variants`);
  }

  async function insertAdvertiser(advertiser: Advertiser): Promise<number> {
    const [res] = await dbPool.query<mysql2.ResultSetHeader>(`
    INSERT INTO advertiser (code, name)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE name = ?
  `, [advertiser.id, advertiser.name, advertiser.name]);

    return res.insertId;
  }

  async function insertCreative(creative: Creative, advertiserDbId: number): Promise<number> {
    const [res] = await dbPool.query<mysql2.ResultSetHeader>(`
    INSERT INTO creative (code, last_show, type, advertiser_id)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE last_show = ?
  `, [creative.id, creative.lastShow, creativeFormatToNumber(creative.format), advertiserDbId, creative.lastShow]);

    return res.insertId;
  }

  async function insertManyVariant(variants: Creative['variants'], creativeDbId: number) {
    const values = variants.map((variant) => {
      return [creativeDbId, variant.screenshot];
    });

    const [res] = await dbPool.query<mysql2.ResultSetHeader>(`
    INSERT INTO creative_detail (creative_id, content)
    VALUES ?
  `, [values]);

    return res.affectedRows;
  }

  async function removeAllVariants(creativeId: number) {
    const [res] = await dbPool.query<mysql2.ResultSetHeader>(`
    DELETE FROM creative_detail
    WHERE creative_id = ?
  `, [creativeId]);

    return res;
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
