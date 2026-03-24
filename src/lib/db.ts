import mysql from 'mysql2/promise'
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || '127.0.0.1',
  port:     Number(process.env.DB_PORT || 3309),
  user:     process.env.DB_USER     || 'directus',
  password: process.env.DB_PASSWORD || 'directuspassword',
  database: process.env.DB_NAME     || 'photobooth',
  waitForConnections: true,
  connectionLimit: 10,
})
export default pool
