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
  const outputFile = path.join(__dirname, "video.mp4");

  // limpa pasta antiga
  if (fs.existsSync("segments")) {
    fs.rmSync("segments", { recursive: true, force: true });
  }

  fs.mkdirSync("segments");

  let current = 0;
  const MAX = 3000;
  const CONCURRENCY = 20;

  progress = {
    total: MAX,
    downloaded: 0,
    status: "downloading"
  };

  async function download(index) {
    return new Promise((resolve) => {
      const url = base + `segment_${index}.ts`;
      const filePath = `segments/segment_${index}.ts`;

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

  async function worker() {
  let fails = 0;

  while (fails < 20) {
    const i = current++;
    const ok = await download(i);

    if (!ok) {
      fails++;
    } else {
      fails = 0;
    }
  }

  console.log("✅ TOTAL REAL:", progress.downloaded);
}

  // workers paralelos
  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);

  progress.status = "processing";

  console.log("📄 Gerando lista...");

  const files = fs.readdirSync("segments")
    .filter(f => f.endsWith(".ts"))
    .sort((a, b) => {
      const n1 = parseInt(a.match(/\d+/)[0]);
      const n2 = parseInt(b.match(/\d+/)[0]);
      return n1 - n2;
    });

  const lista = files.map(f => `file '${f}'`).join("\n");
  fs.writeFileSync("segments/lista.txt", lista);

  console.log("🎬 Rodando ffmpeg...");

  exec(`ffmpeg -f concat -safe 0 -i segments/lista.txt -c copy "${outputFile}"`, (err) => {
    if (err) {
      console.log("❌ ERRO FFMPEG:", err);
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

// rota raiz (opcional)
app.get("/", (req, res) => {
  res.send("🔥 VSL Backend rodando!");
});

app.listen(PORT, () => {
  console.log(`🚀 Server rodando na porta ${PORT}`);
});