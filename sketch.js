// =====================================================================
//  《舞蹈 · Dance》— 起始文件 / starter
//  PART A（下面）是身体姿态引擎，不要修改。/ PART A (below) is the pose engine: don't change it.
//  PART B 只留下 5 个 ★ 标记的函数：每一步让 Qwen 改写其中一个。
//  PART B leaves 5 functions marked with ★: at each step, Qwen rewrites one of them.
// =====================================================================


// ---------------------------------------------------------------------
//  PART A — 身体姿态引擎（三个项目完全相同，不要修改）
//  PART A — body pose engine (identical in all three projects, don't change it)
// ---------------------------------------------------------------------
const MP_VERSION = "0.10.21";
// MediaPipe 的两个下载来源：先用国内镜像 npmmirror，失败再用 jsDelivr
const MP_URLS = [
  `https://registry.npmmirror.com/@mediapipe/tasks-vision/${MP_VERSION}/files`,
  `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}`,
];
// 姿态模型：先找项目文件夹里的 pose_landmarker_lite.task，没有再从 Google 下载
const MODEL_URLS = [
  "pose_landmarker_lite.task",
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
];

// 常用的身体关键点编号（一共 33 个点）。画面是镜像的：你的左手显示在画面左边。
// Body landmark numbers (33 in total). The picture is mirrored: your left hand is on the left of the screen.
const BODY = {
  NOSE: 0,
  L_SHOULDER: 11, R_SHOULDER: 12,
  L_ELBOW: 13, R_ELBOW: 14,
  L_WRIST: 15, R_WRIST: 16,
  L_HIP: 23, R_HIP: 24,
  L_KNEE: 25, R_KNEE: 26,
  L_ANKLE: 27, R_ANKLE: 28,
};

let video;                 // 摄像头画面 / the webcam
let poseLandmarker = null; // MediaPipe 姿态模型 / the pose model
let poses = [];            // 每一帧：看到的所有人（最多 2 个）。每个人 = 33 个点 {x, y, z, visibility}
                           // every frame: the people the camera sees (max 2); each = 33 points {x, y, z, visibility}
                           // x、y 是画布像素坐标（已经镜像）/ x, y are canvas pixels (already mirrored)
let lastVideoTime = -1;
let started = false;
let showCamera = false;
let showSkeleton = false;

async function loadPoseLandmarker() {
  setStatus("正在加载姿态模型… / Loading the pose model…");
  for (const base of MP_URLS) {
    let vision, fileset;
    try {
      vision = await import(`${base}/vision_bundle.mjs`);
      fileset = await vision.FilesetResolver.forVisionTasks(`${base}/wasm`);
    } catch (e) {
      continue;
    }
    for (const model of MODEL_URLS) {
      for (const delegate of ["GPU", "CPU"]) {
        try {
          poseLandmarker = await vision.PoseLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: model, delegate },
            runningMode: "VIDEO",
            numPoses: 2,
          });
          return;
        } catch (e) {
          // 失败就试下一个 / try the next one
        }
      }
    }
  }
  setStatus("⚠️ 姿态模型加载失败：请把 pose_landmarker_lite.task 放进项目文件夹 / Pose model failed to load: put pose_landmarker_lite.task in the project folder");
}

// 每一帧调用一次 / call once per frame
let cameraOk = null;
function updatePoses() {
  if (!poseLandmarker || !video) return;
  const ok = video.elt.readyState >= 2;
  if (ok !== cameraOk) {
    cameraOk = ok;
    setStatus(ok ? "退后一点，让摄像头看到你的上半身 🧍 / Step back so the camera sees your upper body"
                 : "正在等待摄像头… / Waiting for the camera…");
  }
  if (!ok) return;
  if (video.elt.currentTime === lastVideoTime) return;
  lastVideoTime = video.elt.currentTime;

  const result = poseLandmarker.detectForVideo(video.elt, performance.now());
  poses = result.landmarks.map((pts) =>
    pts.map((p) => ({ x: (1 - p.x) * width, y: p.y * height, z: p.z, visibility: p.visibility === undefined ? 1 : p.visibility }))
  );
}

// 这个点看得清楚吗？/ is this point clearly visible?
function isVisible(p) {
  return p && p.visibility > 0.5 && p.x > -50 && p.x < width + 50 && p.y > -50 && p.y < height + 50;
}

// 画出细细的骨架（学习和调试用，按 K 显示/隐藏）/ thin skeleton for learning and debugging (key K)
const SKELETON = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]];
function drawSkeleton() {
  push();
  for (const pose of poses) {
    stroke(255, 255, 0, 200);
    strokeWeight(2);
    for (const [a, b] of SKELETON) {
      if (isVisible(pose[a]) && isVisible(pose[b])) line(pose[a].x, pose[a].y, pose[b].x, pose[b].y);
    }
    noStroke();
    fill(255, 80, 80);
    for (const i of Object.values(BODY)) if (isVisible(pose[i])) circle(pose[i].x, pose[i].y, 8);
  }
  pop();
}

function drawCamera() {
  push();
  translate(width, 0);
  scale(-1, 1);
  tint(255, 90);
  image(video, 0, 0, width, height);
  pop();
}

function setStatus(msg) {
  select("#status").html(msg);
}


// ---------------------------------------------------------------------
//  PART B — 作品：《舞蹈》（致敬亨利·马蒂斯，1910）
//  PART B — artwork: "Dance" (after Henri Matisse, 1910)
// ---------------------------------------------------------------------

const SKY = "#2b4fa3";    // 深蓝的天空 / deep blue sky
const HILL = "#3d8b4f";   // 绿色的山坡 / green hill
const RED = "#d9542f";    // 朱红色的舞者 / vermilion dancers
// G 大调五声音阶（MIDI），从低到高 / G major pentatonic (MIDI), low to high
const HARP = [55, 57, 59, 62, 64, 67, 69, 71, 74, 76, 79, 81];
const PAD_CHORD = [55, 59, 62, 66, 69]; // Gmaj9：双手举起时的和弦 / chord when both arms are up

let history = [];      // 最近 40 帧的姿态（给“回声舞者”用）/ last 40 poses (for the echo dancers)
let paper = null;      // 水粉纸张的着色器 / gouache paper shader
let shaderError = "";
let lastNote = {};     // 每只手上一次弹的音 / last note of each wrist
let lastPluck = {};

// 声音 / sound
let bus, reverb;       // 所有声音都经过：低通滤波 → 混响 / everything goes: low-pass → reverb
let harp = [];         // 6 个拨弦声部 / 6 harp voices
let nextHarp = 0;
let pad = [];          // 和弦垫音 / pad chord oscillators

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  makeShader();
  select("#start").mouseClicked(startExperience);
}

// 编译着色器；如果 GLSL 有错误，就不用它，并在左下角显示错误
// compile the shader; if the GLSL has an error, skip it and show the error bottom-left
function makeShader() {
  const src = gouacheShader();
  shaderError = glslError(src);
  paper = shaderError ? null : createFilterShader(src);
  if (shaderError) setStatus("⚠️ GLSL: " + shaderError);
}

function startExperience() {
  userStartAudio();
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  bus = new p5.LowPass();
  bus.freq(2800);
  bus.res(1);
  bus.disconnect();
  reverb = new p5.Reverb();
  reverb.process(bus, 3.5, 2);
  reverb.drywet(0.4);

  for (let i = 0; i < 6; i++) {
    const osc = new p5.Oscillator("triangle");
    osc.disconnect();
    osc.connect(bus);
    osc.amp(0);
    osc.start();
    const env = new p5.Envelope();
    env.setADSR(0.005, 1.2, 0, 0.4);
    env.setRange(0.16, 0);
    harp.push({ osc, env });
  }
  for (const m of PAD_CHORD) {
    const osc = new p5.Oscillator("sine");
    osc.disconnect();
    osc.connect(bus);
    osc.freq(midiToFreq(m));
    osc.amp(0);
    osc.start();
    pad.push(osc);
  }

  select("#intro").hide();
  started = true;
  loadPoseLandmarker();
}

function draw() {
  // 1. 马蒂斯的背景：蓝天 + 绿色山坡 / Matisse background: blue sky + green hill
  background(SKY);
  noStroke();
  fill(HILL);
  beginShape();
  vertex(0, height);
  for (let x = 0; x <= width; x += 20) vertex(x, height * 0.68 - sin(map(x, 0, width, 0, PI)) * height * 0.12);
  vertex(width, height);
  endShape(CLOSE);

  if (started) {
    updatePoses();
    if (showCamera) drawCamera();
    if (poses.length > 0) {
      history.push(poses[0].map((p) => ({ ...p })));
      if (history.length > 40) history.shift();
    }
    // 2. 回声舞者，然后是真正的你 / echo dancers, then the real you
    drawEchoes(history);
    for (const pose of poses) drawFigure(pose, figureWidth(pose));
    playMusic();
    if (showSkeleton) drawSkeleton();
  }

  // 3. 水粉纸张效果（着色器滤镜）/ gouache paper effect (shader filter)
  if (paper) {
    paper.setUniform("uTime", millis() / 1000);
    filter(paper);
  }
}

function figureWidth(pose) {
  return max(dist(pose[11].x, pose[11].y, pose[12].x, pose[12].y) * 0.35, 12);
}

// ★★★★★★ 第 1 步 开始 / STEP 1 START：drawLimb（把整个函数换成 Qwen 写的版本 / replace the whole function with Qwen's version）★★★★★★
function drawLimb(a, b, w) {
  // 临时版本：一条细细的白线 / placeholder: a thin white line
  if (!isVisible(a) || !isVisible(b)) return;
  stroke(255);
  strokeWeight(2);
  line(a.x, a.y, b.x, b.y);
}
// ★★★★★★ 第 1 步 结束 / STEP 1 END ★★★★★★

// ★★★★★★ 第 2 步 开始 / STEP 2 START：drawFigure（把整个函数换成 Qwen 写的版本 / replace the whole function with Qwen's version）★★★★★★
function drawFigure(pose, w) {
  // 临时版本：只画手臂 / placeholder: only the arms
  drawLimb(pose[11], pose[13], w);
  drawLimb(pose[13], pose[15], w);
  drawLimb(pose[12], pose[14], w);
  drawLimb(pose[14], pose[16], w);
}
// ★★★★★★ 第 2 步 结束 / STEP 2 END ★★★★★★

// ★★★★★★ 第 3 步 开始 / STEP 3 START：gouacheShader（把整个函数换成 Qwen 写的版本 / replace the whole function with Qwen's version）★★★★★★
function gouacheShader() {
  // 临时版本：什么都不改变的着色器 / placeholder: a shader that changes nothing
  return `precision mediump float;
varying vec2 vTexCoord;
uniform sampler2D tex0;
uniform float uTime;
void main() {
  gl_FragColor = texture2D(tex0, vTexCoord);
}`;
}
// ★★★★★★ 第 3 步 结束 / STEP 3 END ★★★★★★

// ★★★★★★ 第 4 步 开始 / STEP 4 START：drawEchoes（把整个函数换成 Qwen 写的版本 / replace the whole function with Qwen's version）★★★★★★
function drawEchoes(history) {
  // 临时版本：还没有回声舞者 / placeholder: no echo dancers yet
}
// ★★★★★★ 第 4 步 结束 / STEP 4 END ★★★★★★

// ★★★★★★ 第 5 步 开始 / STEP 5 START：wristToNote（把整个函数换成 Qwen 写的版本 / replace the whole function with Qwen's version）★★★★★★
function wristToNote(y) {
  // 临时版本：永远是同一个音 / placeholder: always the same note
  return 67;
}
// ★★★★★★ 第 5 步 结束 / STEP 5 END ★★★★★★

// ---------- 下面这些已经写好了，不需要改 / already written, no need to change ----------

// 两只手腕弹竖琴；双手举过头顶，和弦慢慢出现 / wrists play the harp; both arms above the head swells the chord
function playMusic() {
  if (harp.length === 0) return;
  let armsUp = false;
  poses.forEach((pose, n) => {
    for (const w of [15, 16]) {
      const p = pose[w];
      if (!isVisible(p)) continue;
      const key = n + "-" + w;
      const note = wristToNote(p.y);
      if (note !== lastNote[key] && frameCount - (lastPluck[key] || 0) > 5) {
        pluck(note, map(p.x, 0, width, -0.7, 0.7, true));
        lastNote[key] = note;
        lastPluck[key] = frameCount;
      }
    }
    if (isVisible(pose[0]) && isVisible(pose[15]) && isVisible(pose[16]) && pose[15].y < pose[0].y && pose[16].y < pose[0].y) armsUp = true;
  });
  for (const osc of pad) osc.amp(armsUp ? 0.035 : 0, armsUp ? 1.5 : 2.5);
}

function pluck(midi, pan) {
  const v = harp[nextHarp];
  nextHarp = (nextHarp + 1) % harp.length;
  v.osc.freq(midiToFreq(midi));
  v.osc.pan(pan);
  v.env.play(v.osc);
}

// 用浏览器检查 GLSL 有没有错误（返回错误信息，没有错误就返回 ""）
function glslError(src) {
  const gl = document.createElement("canvas").getContext("webgl");
  if (!gl) return "";
  const s = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? "" : (gl.getShaderInfoLog(s) || "compile error").split("\n")[0];
}

function keyPressed() {
  if (key === "s" || key === "S") saveCanvas("my-matisse", "png");
  if (key === "v" || key === "V") showCamera = !showCamera;
  if (key === "k" || key === "K") showSkeleton = !showSkeleton;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
