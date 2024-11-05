// index.ts
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { SpeechClient } from '@google-cloud/speech';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, './key.json');




// db연동
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
// db 연동



// Google Cloud 클라이언트 초기화
const speechClient = new SpeechClient();
const ttsClient = new TextToSpeechClient();

app.get('/api/products/search', async (req, res) => {
  const productName = req.query.name;
  try {
    const [rows] = await pool.query(
      'SELECT c_id, c_name, c_price FROM cpu_tb WHERE c_name LIKE ?',
      [`%${productName}%`]
    );
    res.json(rows);
  } catch (error) {
    console.error('Product search error:', error);
    res.status(500).json({ error: 'Product search failed' });
  }
});


// STT (음성을 텍스트로 변환) API 엔드포인트
app.post('/api/speech-to-text', async (req, res) => {
  try {
    const audioBytes = req.body.audioData;
    
    const audio = {
      content: audioBytes,
    };
    const config = {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: 'ko-KR',
    };
    const request = {
      audio: audio,
      config: config,
    };

    const [response] = await speechClient.recognize(request);
    // 음성 인식 결과 처리
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');
    // 상품 이름 추출 (예: "XX 주문" 형식의 음성 명령 처리)
    const orderMatch = transcription.match(/(.*?)\s*주문/);
    if (orderMatch) {
      const productName = orderMatch[1];
      
      // 상품 검색
      const [rows] = await pool.query(
        'SELECT c_name, c_price FROM cpu_tb WHERE c_name LIKE ?',
        [`%${productName}%`]
      );

      if (rows.length > 0) {
        const product = rows[0];
        const responseText = `${product.c_name}의 가격은 ${product.c_price}원 입니다.`;
        res.json({ text: transcription, product: product, responseText: responseText });
      } else {
        res.json({ text: transcription, responseText: "해당 상품을 찾을 수 없습니다." });
      }
    } else {
      res.json({ text: transcription, responseText: "주문 명령을 인식하지 못했습니다." });
    }  
  } catch (error) {
    console.error('Speech-to-text error:', error);
    res.status(500).json({ error: 'Speech-to-text failed' });
  }

  
});

// TTS (텍스트를 음성으로 변환) API 엔드포인트
app.post('/api/text-to-speech', async (req, res) => {
  try {
    const text = req.body.text;
    
    const request = {
      input: { text: text },
      voice: { languageCode: 'ko-KR', ssmlGender: 'NEUTRAL' },
      audioConfig: { audioEncoding: 'MP3' },
    };

    const [response] = await ttsClient.synthesizeSpeech(request);
    res.send(response.audioContent);
  } catch (error) {
    console.error('Text-to-speech error:', error);
    res.status(500).json({ error: 'Text-to-speech failed' });
  }

  
});

// ... existing code ...
