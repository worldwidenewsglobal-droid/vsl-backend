const fs = require("fs");
const https = require("https");
const { exec } = require("child_process");

const BASE_URL = "COLE_AQUI_UM_TS_EXEMPLO";

// extrai base
const base = BASE_URL.substring(0, BASE_URL.lastIndexOf("/") + 1);

const TOTAL = 1500; // ajusta se quiser
const CONCURRENCY = 20;

if (!fs.existsSync("segments")) fs.mkdirSync("segments");

let current = 0;

function download(index) {
  return new Promise((resolve) => {
    const url = base + `segment_${index}.ts`;
    const filePath = `segments/segment_${index}.ts`;

    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        return resolve(false);
      }

      const file = fs.createWriteStream(filePath);
      res.pipe(file);
      file.on("finish", () => resolve(true));
    }).on("error", () => resolve(false));
  });
}

async function worker() {
  while (current < TOTAL) {
    const i = current++;
    console.log("📥", i);

    const ok = await download(i);

    if (!ok) break;
  }
}

async function start() {
  const workers = [];

  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);

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

  console.log("🎬 Montando vídeo...");

  exec(`ffmpeg -f concat -safe 0 -i segments/lista.txt -c copy video.mp4`, (err) => {
    if (err) console.log(err);
    else console.log("🔥 VIDEO PRONTO!");
  });
}

start();