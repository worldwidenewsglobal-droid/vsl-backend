const express = require("express");
const fs = require("fs");
const https = require("https");
const { exec } = require("child_process");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

let progress = {
  total: 0,
  downloaded: 0,
  status: "idle"
};

app.post("/download", async (req, res) => {
  const { tsUrl } = req.body;

  if (!tsUrl) return res.status(400).send("Erro: tsUrl não enviado");

  const base = tsUrl.substring(0, tsUrl.lastIndexOf("/") + 1);

  if (fs.existsSync("segments")) {
    fs.rmSync("segments", { recursive: true, force: true });
  }
  fs.mkdirSync("segments");

  let current = 0;
  let fails = 0;

  progress = {
    total: 0,
    downloaded: 0,
    status: "downloading"
  };

  console.log("🚀 Iniciando brute force...");

  function download(index) {
    return new Promise((resolve) => {
      const url = base + `segment_${index}.ts`;
      const filePath = `segments/${index}.ts`;

      https.get(url, (res) => {
        if (res.statusCode !== 200) {
          return resolve(false);
        }

        const file = fs.createWriteStream(filePath);
        res.pipe(file);

        file.on("finish", () => {
          progress.downloaded++;
          console.log("📥", index);
          resolve(true);
        });
      }).on("error", () => resolve(false));
    });
  }

  while (fails < 200) {
    const ok = await download(current);

    if (!ok) {
      fails++;
    } else {
      fails = 0;
      current++;
    }
  }

  progress.total = progress.downloaded;
  progress.status = "processing";

  console.log("🎬 Montando vídeo...");

  const lista = Array.from({ length: progress.downloaded }, (_, i) => `file '${i}.ts'`).join("\n");

  fs.writeFileSync("segments/lista.txt", lista);

  exec(`ffmpeg -f concat -safe 0 -i segments/lista.txt -c copy video.mp4`, (err) => {
    if (err) {
      console.log("❌ ERRO:", err);
      progress.status = "error";
      return;
    }

    progress.status = "finished";
    console.log("🔥 VIDEO PRONTO!");
  });

  res.send("Download iniciado 🚀");
});

app.get("/progress", (req, res) => {
  res.json(progress);
});

app.get("/video", (req, res) => {
  const filePath = path.join(__dirname, "video.mp4");

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Video não encontrado");
  }

  res.download(filePath);
});

app.listen(PORT, () => {
  console.log(`🚀 Server rodando na porta ${PORT}`);
});