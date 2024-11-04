// index.ts
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';

const app = express();
const port = 3001;

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'danawa_cpu'
});

app.use(cors());
app.use(express.json());

// 상품 목록 조회 API
app.get('/api/products', async (req, res) => {
  const [rows] = await pool.query('SELECT c_id, c_name, c_price FROM cpu_tb');
  res.json(rows);
  
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  
});