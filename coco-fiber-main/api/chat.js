// api/chat.js
// Vercel Serverless Function — proxies chat requests to Groq so the API key
// never reaches the browser. Deploy target: Vercel (Node.js runtime).

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'openai/gpt-oss-120b';

const SYSTEM_PROMPT = `Kamu adalah asisten virtual untuk CocoFiber (dikelola oleh CV Kreasi Asa Indonesia / PT Apa Saja Indonesia), eksportir coco fiber, cocopeat, dan produk turunan sabut kelapa dari Sidoarjo, Jawa Timur, Indonesia.

INFORMASI PERUSAHAAN:
- Produk: Coco Fiber (serat sabut kelapa), Cocopeat (media tanam), Cocomesh, dan produk turunan sabut kelapa lainnya.
- Melayani buyer di 35+ negara, kapasitas produksi 200+ ton/tahun.
- Bersertifikat ISO & Phytosanitary.
- Lokasi: Sidoarjo, Jawa Timur, Indonesia.
- Kontak: WhatsApp +62 852-5793-0183, jam operasional Senin-Jumat 08.00-17.00 WIB.
- Coco Fiber: kadar air ≤17%, panjang serat 100-200mm, kemasan 95-130kg/bal, harga $260-300 USD/MT, min order 18 MT (1 kontainer 40ft), pembayaran L/C atau T/T, lead time 14 hari untuk 1-18 MT.
- Cocopeat: tersedia washed (low EC) dan unwashed (high EC), dikompresi dalam block 5kg.

ATURAN:
- Jawab dengan ramah, profesional, dan singkat (maksimal 3-4 kalimat per jawaban).
- Gunakan Bahasa Indonesia, kecuali jika pengguna bertanya dalam Bahasa Inggris — maka jawab dalam Bahasa Inggris.
- Untuk pertanyaan harga detail, negosiasi volume besar, atau permintaan yang sangat spesifik, arahkan pengguna untuk menghubungi tim via WhatsApp di +62 852-5793-0183.
- Jangan mengarang informasi (harga, sertifikasi, kapasitas) yang tidak ada di atas. Jika tidak yakin, arahkan ke WhatsApp.
- Jangan membahas topik di luar produk, layanan, dan proses bisnis CocoFiber.`;

export default async function handler(req, res) {
  // CORS / method guard
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('GROQ_API_KEY is not set in environment variables');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const incoming = Array.isArray(body?.messages) ? body.messages : null;
  if (!incoming || incoming.length === 0) {
    return res.status(400).json({ error: 'Missing "messages" array' });
  }

  // Basic sanitation: keep only role/content, cap length, cap history size
  const MAX_MESSAGES = 20;
  const MAX_CHARS = 2000;

  const cleaned = incoming
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));

  if (cleaned.length === 0) {
    return res.status(400).json({ error: 'No valid messages provided' });
  }

  const lastUserMsg = cleaned[cleaned.length - 1];
  if (lastUserMsg.role !== 'user' || !lastUserMsg.content.trim()) {
    return res.status(400).json({ error: 'Last message must be a non-empty user message' });
  }

  try {
    const groqRes = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...cleaned],
        temperature: 0.4,
        max_tokens: 400,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('Groq API error:', groqRes.status, errText);
      return res.status(502).json({ error: 'Upstream AI service error' });
    }

    const data = await groqRes.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(502).json({ error: 'Empty response from AI service' });
    }

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Chat handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
