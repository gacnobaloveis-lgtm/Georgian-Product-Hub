import pg from 'pg';
const { Client } = pg;

const c = new Client({ connectionString: process.env.RAILWAY_DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();

try {
  await c.query('BEGIN');
  console.log('Starting migration...');

  // Quick sanity check on prefixes
  const pre = await c.query(`SELECT COUNT(*) AS hex_rows FROM media WHERE data IS NOT NULL AND substr(data, 1, 2) = E'\\\\x'`);
  console.log('Rows with \\x prefix:', pre.rows[0].hex_rows);

  const sql = `
    ALTER TABLE media ALTER COLUMN data TYPE bytea USING (
      CASE
        WHEN data IS NULL THEN NULL
        WHEN substr(data, 1, 2) = E'\\\\x' THEN decode(substring(data from 3), 'hex')
        ELSE NULL
      END
    )
  `;
  await c.query(sql);
  console.log('ALTER OK');

  const v = await c.query(`SELECT COUNT(*) FILTER (WHERE data IS NOT NULL) AS with_data, COUNT(*) FILTER (WHERE data IS NULL) AS null_data, COUNT(*) AS total FROM media`);
  console.log('After migration counts:', v.rows[0]);

  const types = await c.query(`SELECT atttypid::regtype AS type FROM pg_attribute WHERE attrelid='media'::regclass AND attname='data'`);
  console.log('New column type:', types.rows[0].type);

  const sample = await c.query(`SELECT id, filename, octet_length(data) AS bytes FROM media WHERE data IS NOT NULL ORDER BY id LIMIT 5`);
  console.log('Sample after:');
  console.table(sample.rows);

  if (Number(v.rows[0].with_data) === 67) {
    await c.query('COMMIT');
    console.log('✅ COMMITTED — 67 rows preserved, column is now bytea');
  } else {
    await c.query('ROLLBACK');
    console.log(`❌ ROLLED BACK — expected 67 with_data, got ${v.rows[0].with_data}`);
  }
} catch (e) {
  await c.query('ROLLBACK');
  console.error('❌ ROLLED BACK due to error:', e.message);
}

await c.end();
