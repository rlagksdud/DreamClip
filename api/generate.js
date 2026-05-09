const KLING_API_KEY = process.env.KLING_API_KEY || "apikey-c06c6129a2a24dbab85373fa86a493b4";
const BASE_URL = "https://api.atlascloud.ai/api/v1";

const stylePrompts = {
  "몽환적": "dreamy, surreal, soft glow, ethereal atmosphere, floating",
  "수채화풍": "watercolor style, soft brushstrokes, pastel colors, artistic",
  "우주적": "cosmic, space, nebula, stars, infinite universe",
  "필름감성": "film grain, vintage, cinematic, 35mm, warm tones",
  "사이버": "cyberpunk, neon lights, futuristic, digital glitch"
};

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // POST: 영상 생성 요청
  if (req.method === "POST") {
    try {
      const { dreamText, style } = req.body;
      if (!dreamText) return res.status(400).json({ error: "꿈 내용을 입력해주세요" });

      const styleAdd = stylePrompts[style] || stylePrompts["몽환적"];
      const prompt = `${dreamText}, ${styleAdd}, cinematic quality, vertical video`;

      const response = await fetch(`${BASE_URL}/model/generateVideo`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${KLING_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "kwaivgi/kling-v2.6-pro/text-to-video",
          prompt: prompt,
          duration: 5,
          aspect_ratio: "9:16"
        })
      });

      const data = await response.json();
      console.log("Atlas Cloud 응답:", JSON.stringify(data));

      const predictionId = data?.data?.id;
      if (predictionId) {
        return res.status(200).json({ task_id: predictionId });
      } else {
        return res.status(500).json({ error: "prediction_id 없음", detail: JSON.stringify(data) });
      }

    } catch (err) {
      console.error("생성 오류:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // GET: 영상 완료 여부 확인
  if (req.method === "GET") {
    try {
      const { taskId } = req.query;
      if (!taskId) return res.status(400).json({ error: "taskId 필요" });

      const response = await fetch(`${BASE_URL}/model/prediction/${taskId}`, {
        headers: { "Authorization": `Bearer ${KLING_API_KEY}` }
      });

      const data = await response.json();
      console.log("상태 확인:", JSON.stringify(data));

      const status = data?.data?.status;
      const videoUrl = data?.data?.output?.video_url || data?.data?.output?.[0]?.url;

      if (status === "succeeded" || status === "completed") {
        return res.status(200).json({ status: "done", videoUrl });
      } else if (status === "failed") {
        return res.status(200).json({ status: "failed" });
      } else {
        return res.status(200).json({ status: "processing" });
      }

    } catch (err) {
      console.error("상태 확인 오류:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(404).json({ error: "Not found" });
};
