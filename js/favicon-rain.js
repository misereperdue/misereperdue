// Animated raindrop favicon for misereperdue.com
// Draws falling raindrops on navy, updates the favicon via canvas
(function() {
  var size = 32;
  var canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  var ctx = canvas.getContext("2d");

  // Raindrops: x, y, length, speed
  var drops = [];
  var DROP_COUNT = 9;
  for (var i = 0; i < DROP_COUNT; i++) {
    drops.push({
      x: Math.random() * size,
      y: Math.random() * size,
      len: 4 + Math.random() * 5,
      speed: 0.6 + Math.random() * 0.9
    });
  }

  var link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }

  var frame = 0;
  function draw() {
    // Navy background
    ctx.fillStyle = "#0a1230";
    ctx.fillRect(0, 0, size, size);

    // Draw drops
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 1.4;
    ctx.lineCap = "round";
    for (var i = 0; i < drops.length; i++) {
      var d = drops[i];
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x, d.y + d.len);
      ctx.stroke();
      // Fall
      d.y += d.speed;
      if (d.y > size + d.len) {
        d.y = -d.len;
        d.x = Math.random() * size;
      }
    }

    // Update favicon every 3rd frame (~20fps)
    if (frame % 3 === 0) {
      link.href = canvas.toDataURL("image/png");
    }
    frame++;
    requestAnimationFrame(draw);
  }

  // Respect reduced motion
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    // Static: single frame
    ctx.fillStyle = "#0a1230";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 1.4;
    ctx.lineCap = "round";
    for (var j = 0; j < drops.length; j++) {
      var sd = drops[j];
      ctx.beginPath();
      ctx.moveTo(sd.x, sd.y);
      ctx.lineTo(sd.x, sd.y + sd.len);
      ctx.stroke();
    }
    link.href = canvas.toDataURL("image/png");
  } else {
    draw();
  }
})();
