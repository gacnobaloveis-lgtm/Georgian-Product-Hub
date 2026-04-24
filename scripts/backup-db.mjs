import pg from 'pg';
import fs from 'fs';
import zlib from 'zlib';

const client = new pg.Client({ connectionString: process.env.RAILWAY_DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

const tables = (await client.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`)).rows.map(r => r.tablename);

const out = [];
out.push(`-- spiningebi.ge backup ${new Date().toISOString()}\n`);
out.push(`-- Tables: ${tables.length}\n\n`);

let totalRows = 0;
const stats = [];

for (const t of tables) {
  const cols = (await client.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, [t])).rows.map(r => r.column_name);
  const r = await client.query(`SELECT * FROM "${t}"`);
  totalRows += r.rowCount;
  stats.push(`${t}: ${r.rowCount}`);
  out.push(`-- Table: ${t} (${r.rowCount} rows)\n`);
  if (r.rowCount === 0) { out.push(`\n`); continue; }
  for (const row of r.rows) {
    const vals = cols.map(c => {
      const v = row[c];
      if (v === null) return 'NULL';
      if (typeof v === 'number') return String(v);
      if (typeof v === 'boolean') return v ? 'true' : 'false';
      if (v instanceof Date) return `'${v.toISOString()}'`;
      if (Buffer.isBuffer(v)) return `'\\x${v.toString('hex')}'`;
      if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
      return `'${String(v).replace(/'/g, "''")}'`;
    }).join(',');
    out.push(`INSERT INTO "${t}" (${cols.map(c => `"${c}"`).join(',')}) VALUES (${vals});\n`);
  }
  out.push(`\n`);
}

await client.end();

const sql = out.join('');
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const path = `attached_assets/db_backups/backup_${ts}.sql.gz`;
fs.mkdirSync('attached_assets/db_backups', { recursive: true });
fs.writeFileSync(path, zlib.gzipSync(Buffer.from(sql, 'utf8'), { level: 9 }));

console.log(`Backup: ${path}`);
console.log(`Size: ${(fs.statSync(path).size / 1024).toFixed(1)} KB (${(sql.length / 1024).toFixed(1)} KB raw)`);
console.log(`Total tables: ${tables.length}, total rows: ${totalRows}`);
console.log('Per table:');
stats.forEach(s => console.log('  ' + s));
