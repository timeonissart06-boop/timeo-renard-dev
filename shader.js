// =========================================================
// Fond animé WebGL (vagues néon) — version JS pure, sans dépendance.
// Adapté du shader three.js "web-gl-shader" pour le site statique.
// Rendu en fond fixe plein écran, derrière tout le contenu.
// =========================================================
(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const canvas = document.createElement("canvas");
  canvas.id = "bg-shader";
  canvas.setAttribute("aria-hidden", "true");
  const mount = () => document.body.insertBefore(canvas, document.body.firstChild);
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);

  const glOpts = { antialias: true, preserveDrawingBuffer: true, powerPreference: "low-power" };
  const gl = canvas.getContext("webgl", glOpts) || canvas.getContext("experimental-webgl", glOpts);
  if (!gl) { canvas.style.background = "#05060a"; return; } // pas de WebGL : fond uni

  const vertexSrc = `
    attribute vec3 position;
    void main() { gl_Position = vec4(position, 1.0); }
  `;

  const fragmentSrc = `
    precision highp float;
    uniform vec2 resolution;
    uniform float time;
    uniform float xScale;
    uniform float yScale;
    uniform float distortion;

    void main() {
      vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
      float d = length(p) * distortion;

      float rx = p.x * (1.0 + d);
      float gx = p.x;
      float bx = p.x * (1.0 - d);

      float r = 0.06 / abs(p.y + sin((rx + time) * xScale) * yScale);
      float g = 0.06 / abs(p.y + sin((gx + time) * xScale) * yScale);
      float b = 0.06 / abs(p.y + sin((bx + time) * xScale) * yScale);

      gl_FragColor = vec4(r, g, b, 1.0);
    }
  `;

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };

  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSrc));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSrc));
  gl.linkProgram(program);
  gl.useProgram(program);

  // Deux triangles couvrant tout l'écran
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 0,  1, -1, 0,  -1, 1, 0,
     1, -1, 0, -1,  1, 0,   1, 1, 0,
  ]), gl.STATIC_DRAW);

  const posLoc = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

  const uResolution = gl.getUniformLocation(program, "resolution");
  const uTime = gl.getUniformLocation(program, "time");
  gl.uniform1f(gl.getUniformLocation(program, "xScale"), 1.0);
  gl.uniform1f(gl.getUniformLocation(program, "yScale"), 0.5);
  gl.uniform1f(gl.getUniformLocation(program, "distortion"), 0.05);

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uResolution, canvas.width, canvas.height);
  };
  resize();
  window.addEventListener("resize", resize);

  let time = 0;
  let rafId = null;

  const drawFrame = () => {
    gl.uniform1f(uTime, time);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };
  const render = () => {
    time += 0.01;
    drawFrame();
    rafId = requestAnimationFrame(render);
  };

  // Toujours dessiner une première image, même si l'onglet est masqué
  // (requestAnimationFrame est gelé tant que la page n'est pas visible).
  time = reduce ? 1.6 : 0;
  drawFrame();

  if (!reduce && !document.hidden) render();

  // Démarre / met en pause l'animation selon la visibilité de l'onglet
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { if (rafId) cancelAnimationFrame(rafId); rafId = null; }
    else if (!reduce && !rafId) render();
  });
})();
