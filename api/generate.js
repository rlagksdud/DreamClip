// DreamClip — Kling API 연결 코드
// 파일명: api/generate.js
// Vercel에 올리면 자동으로 백엔드 함수로 작동해요

const KLING_API_KEY = "apikey-c06c6129a2a24dbab85373fa86a493b4"; // ← 여기에 새 API 키 붙여넣기
const BASE_URL = "https://api.klingapi.com";

// 한국어 → 영어 번역 (Kling은 영어 프롬프트가 결과가 좋아요)
async function translateToEnglish(koreanText) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY, // Vercel 환경변수로 관리
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: `다음 한국어 꿈 내용을 AI 영상 생성에 최적화된 영어 프롬프트로 번역해줘. 몽환적이고 시네마틱한 느낌으로. 한국어 없이 영어만 출력해:
        
"${koreanText}"`
      }]
    })
  });
  const data = await res.json();
  return data.content[0].text.trim();
}

// 영상 생성 요청
async function createVideo(prompt, style) {
  const stylePrompts = {
    "몽환적": "dreamy, surreal, soft glow, ethereal atmosphere, floating",
    "수채화풍": "watercolor style, soft brushstrokes, pastel colors, artistic",
    "우주적": "cosmic, space, nebula, stars, infinite universe",
    "필름감성": "film grain, vintage, cinematic, 35mm, warm tones",
    "사이버": "cyberpunk, neon lights, futuristic, digital glitch"
  };

  const styleAdd = stylePrompts[style] || stylePrompts["몽환적"];
  const fullPrompt = `${prompt}, ${styleAdd}, cinematic quality, 9:16 vertical video`;

  const res = await fetch(`${BASE_URL}/v1/videos/text2video`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${KLING_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "kling-v2.6-pro",
      prompt: fullPrompt,
      duration: 5,
      aspect_ratio: "9:16", // 틱톡/인스타 세로 포맷
      mode: "standard"
    })
  });

  const data = await res.json();
  return data.task_id;
}

// 영상 완료 여부 확인 (폴링)
async function checkVideo(taskId) {
  const res = await fetch(`${BASE_URL}/v1/videos/${taskId}`, {
    headers: { "Authorization": `Bearer ${KLING_API_KEY}` }
  });
  return await res.json();
}

// Vercel API 라우트
export default async function handler(req, res) {
  // CORS 허용
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // 영상 생성 요청
  if (req.method === "POST" && req.url.includes("/generate")) {
    try {
      const { dreamText, style } = req.body;
      if (!dreamText) return res.status(400).json({ error: "꿈 내용을 입력해주세요" });

      // 한국어 번역
      const englishPrompt = await translateToEnglish(dreamText);

      // 영상 생성 시작
      const taskId = await createVideo(englishPrompt, style);

      return res.status(200).json({ taskId, prompt: englishPrompt });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 영상 상태 확인
  if (req.method === "GET" && req.url.includes("/status")) {
    try {
      const taskId = req.query.taskId;
      const result = await checkVideo(taskId);

      if (result.status === "completed") {
        return res.status(200).json({ status: "done", videoUrl: result.video_url });
      } else if (result.status === "failed") {
        return res.status(200).json({ status: "failed" });
      } else {
        return res.status(200).json({ status: "processing" });
      }
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(404).json({ error: "Not found" });
}
