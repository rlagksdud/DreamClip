const KLING_API_KEY = process.env.KLING_API_KEY || "apikey-c06c6129a2a24dbab85373fa86a493b4";
const BASE_URL = "https://api.klingapi.com";

async function createVideo(prompt, style) {
  const stylePrompts = {
    "몽환적": "dreamy, surreal, soft glow, ethereal atmosphere",
    "수채화풍": "watercolor style, soft brushstrokes, pastel colors",
    "우주적": "cosmic, space, nebula, stars, infinite universe",
    "필름감성": "film grain, vintage, cinematic, warm tones",
    "사이버": "cyberpunk, neon lights, futuristic, digital glitch"
  };
  const styleAdd = stylePrompts[style] || stylePrompts["몽환적"];
  const fullPrompt = `${prompt}, ${styleAdd}, cinematic quality`;

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
      aspect_ratio: "9:16",
      mode: "standard"
    })
  });

  const data = await res.json();
  return data;
}

async function checkVideo(taskId) {
  const res = await fetch(`${BASE_URL}/v1/videos/${taskId}`, {
    headers: { "Authorization": `Bearer ${KLING_API_KEY}` }
  });
  return await res.json();
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "POST") {
    try {
      const { dreamText, style } = req.body;
      if (!dreamText) return res.status(400).json({ error: "꿈 내용을 입력해주세요" });

      const result = await createVideo(dreamText, style);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "GET") {
    try {
      const taskId = req.query.taskId;
      if (!taskId) return res.status(400).json({ error: "taskId 필요" });

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
};
