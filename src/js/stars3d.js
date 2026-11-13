// Stars product viewer: real 3D star coins (lathe-turned body with raised rim and edge groove, extruded enamel star on
// both faces), stacked by pack size. Same loading, lighting and drag-to-spin feel as vip3d.js / mask3d.js.
// The stage's data-pack attribute picks the stack; changing it re-stacks with a drop-in animation.
var MPStars3D = (function () {
  "use strict";
  var PACK_IMGS = [100, 500, 1000, 2400, 2500, 6500];
  function packNum(el) {
    return parseInt(String(el.getAttribute("data-pack") || "").replace(/[^\d]/g, ""), 10) || 0;
  }
  function coinsFor(n) {
    return !n || n <= 100 ? 1 : n <= 500 ? 3 : n <= 1000 ? 6 : n <= 5000 ? 21 : 32;
  }
  // How each coin count splits into stacks, and where stacks stand (coin radii, x/z). Centres are >= 2.1 apart so
  // neighbouring stacks never touch. Must match tools/stars/gen.py.
  var STACKS = { 3: [3], 6: [6], 10: [6, 4], 15: [6, 5, 4], 21: [7, 6, 5, 3], 32: [7, 7, 6, 5, 4, 3] };
  var SPOTS = {
    1: [[0, 0]],
    2: [[-1.05, -0.35], [1.05, 0.35]],
    3: [[-1.1, -0.6], [1.1, -0.6], [0, 1.3]],
    4: [[-1.05, -1.05], [1.05, -1.05], [-1.05, 1.05], [1.05, 1.05]],
    6: [[-2.1, -1.05], [0, -1.05], [2.1, -1.05], [-2.1, 1.05], [0, 1.05], [2.1, 1.05]],
  };
  function isLight() {
    var t = document.documentElement.getAttribute("data-theme");
    return t ? t === "light" : !!(window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches);
  }
  function fallbackSrc(el) {
    var n = packNum(el);
    return "/img/stars-" + (PACK_IMGS.indexOf(n) > -1 ? n + "-" : "") + (isLight() ? "light" : "dark") + ".jpg?v=4";
  }

  return {
    mount: function (el) {
      var dead = false,
        raf = 0,
        ro = null,
        mo = null,
        renderer = null;
      function fallback() {
        if (!dead) el.innerHTML = '<img src="' + fallbackSrc(el) + '" alt="Stars">';
      }

      Promise.all([
        import("/vendor/three-0.160.0/build/three.module.min.js"),
        import("/vendor/three-0.160.0/examples/jsm/environments/RoomEnvironment.js?v=2"),
      ])
        .then(function (mods) {
          if (dead) return;
          try {
            build(mods[0], mods[1].RoomEnvironment);
          } catch (err) {
            fallback();
          }
        })
        .catch(fallback);

      function build(THREE, RoomEnvironment) {
        var light = isLight();
        var reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
        try {
          renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        } catch (e) {
          return fallback();
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = light ? 1.1 : 1.05;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        el.appendChild(renderer.domElement);

        var scene = new THREE.Scene();
        var pmrem = new THREE.PMREMGenerator(renderer);
        scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

        var camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
        var frameR = 1.3; // radius of the sphere to keep in view; set per layout
        function resize() {
          var w = el.clientWidth || 300,
            h = el.clientHeight || 300;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          var half = (camera.fov * Math.PI) / 360;
          var fit = frameR / Math.sin(half);
          if (camera.aspect < 1) fit /= camera.aspect;
          camera.position.set(0, 0, fit * 1.04);
          camera.lookAt(0, 0, 0);
          camera.updateProjectionMatrix();
        }
        if (window.ResizeObserver) (ro = new ResizeObserver(resize)).observe(el);

        var key = new THREE.DirectionalLight(0xffffff, light ? 2.1 : 1.7);
        key.position.set(2, 6, 6);
        key.castShadow = true;
        key.shadow.mapSize.set(2048, 2048);
        key.shadow.radius = 8;
        var sc = key.shadow.camera;
        sc.left = sc.bottom = -4;
        sc.right = sc.top = 4;
        sc.near = 1;
        sc.far = 30;
        key.shadow.bias = -3e-4;
        scene.add(key);
        var rim = new THREE.DirectionalLight(light ? 0xbcd9ff : 0xa9d7f5, light ? 0.8 : 1.2);
        rim.position.set(-5, 2, -4);
        scene.add(rim);
        var spot = new THREE.PointLight(0xffffff, light ? 10 : 14, 30);
        spot.position.set(2.5, 1.5, 4);
        scene.add(spot);

        // ---- coin geometry (radius 1, axis = Y) ----
        var T = 0.17, // thickness
          F = T / 2 - 0.028, // recessed field height
          C = 0.06; // edge rounding
        var prof = [new THREE.Vector2(0, F), new THREE.Vector2(0.79, F), new THREE.Vector2(0.84, T / 2), new THREE.Vector2(1 - C, T / 2)];
        var i, a;
        for (i = 1; i <= 6; i++) {
          a = (i / 6) * (Math.PI / 2);
          prof.push(new THREE.Vector2(1 - C + C * Math.sin(a), T / 2 - C + C * Math.cos(a)));
        }
        prof.push(new THREE.Vector2(1, 0.014), new THREE.Vector2(0.988, 0), new THREE.Vector2(1, -0.014));
        for (i = 0; i <= 6; i++) {
          a = (i / 6) * (Math.PI / 2);
          prof.push(new THREE.Vector2(1 - C + C * Math.cos(a), -T / 2 + C - C * Math.sin(a)));
        }
        prof.push(new THREE.Vector2(0.84, -T / 2), new THREE.Vector2(0.79, -F), new THREE.Vector2(0, -F));
        prof.reverse(); // bottom-to-top so the lathe's faces point outward
        var coinGeo = new THREE.LatheGeometry(prof, 128);

        // MPStar outline (the site star), corners rounded the way its stroke-linejoin rounds them.
        var P = [[12, 3.5], [14.6, 8.8], [20.5, 9.7], [16.2, 13.8], [17.2, 19.6], [12, 16.9], [6.8, 19.6], [7.8, 13.8], [3.5, 9.7], [9.4, 8.8]];
        var K = 1.02 / 17;
        var pts = P.map(function (p) {
          return new THREE.Vector2((p[0] - 12) * K, -(p[1] - 11.9) * K);
        });
        var shape = new THREE.Shape();
        for (i = 0; i < pts.length; i++) {
          var v = pts[i],
            pv = pts[(i + pts.length - 1) % pts.length],
            nx = pts[(i + 1) % pts.length],
            tt = i % 2 ? 0.16 : 0.2;
          var p0 = v.clone().lerp(pv, tt),
            p1 = v.clone().lerp(nx, tt);
          if (i === 0) shape.moveTo(p0.x, p0.y);
          else shape.lineTo(p0.x, p0.y);
          shape.quadraticCurveTo(v.x, v.y, p1.x, p1.y);
        }
        shape.closePath();
        var starGeo = new THREE.ExtrudeGeometry(shape, {
          depth: 0.012,
          bevelEnabled: true,
          bevelThickness: 0.016,
          bevelSize: 0.022,
          bevelSegments: 4,
          curveSegments: 10,
        });

        var coinMat = light
          ? new THREE.MeshPhysicalMaterial({ color: 0xeceef3, roughness: 0.4, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.28, envMapIntensity: 0.75 })
          : new THREE.MeshPhysicalMaterial({ color: 0x31447c, roughness: 0.32, metalness: 0.2, clearcoat: 0.9, clearcoatRoughness: 0.18, envMapIntensity: 1 });
        var starMat = light
          ? new THREE.MeshPhysicalMaterial({ color: 0x86b4da, roughness: 0.16, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.1 })
          : new THREE.MeshPhysicalMaterial({ color: 0xa9d7f5, roughness: 0.18, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, emissive: 0x5b9fd0, emissiveIntensity: 0.05, envMapIntensity: 1 });
        var ringMat = new THREE.MeshStandardMaterial({ color: 0xa9d7f5, emissive: 0x6fa8d6, emissiveIntensity: light ? 0 : 0.3, roughness: 0.3 });
        var ringGeo = light ? null : new THREE.TorusGeometry(0.815, 0.007, 8, 128);

        function makeCoin() {
          var g = new THREE.Group();
          var body = new THREE.Mesh(coinGeo, coinMat);
          body.castShadow = body.receiveShadow = true;
          g.add(body);
          [1, -1].forEach(function (s) {
            var st = new THREE.Mesh(starGeo, starMat);
            st.rotation.x = -s * Math.PI / 2;
            st.position.y = s * (F - 0.004);
            st.castShadow = true;
            g.add(st);
            if (ringGeo) {
              var rg = new THREE.Mesh(ringGeo, ringMat);
              rg.rotation.x = Math.PI / 2;
              rg.position.y = s * (F + 0.012);
              g.add(rg);
            }
          });
          return g;
        }

        // ---- scene graph: turntable (yaw + pitch from drag) > content ----
        var turntable = new THREE.Group();
        scene.add(turntable);
        var content = null,
          coins = [],
          basePitch = 0,
          ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ color: 0x0a1230, opacity: light ? 0.2 : 0.35 }));
        ground.receiveShadow = true;

        function seeded(k) {
          var x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
          return x - Math.floor(x);
        }
        function layout(n, animate) {
          if (content) turntable.remove(content);
          content = new THREE.Group();
          coins = [];
          var count = coinsFor(n);
          if (count === 1) {
            // a single coin stands face-on, like the hero image; spinning shows the edge and the back
            var c = makeCoin();
            c.rotation.x = Math.PI / 2;
            content.add(c);
            coins.push({ obj: c, y: 0, delay: 0 });
            basePitch = 0.12;
            key.position.set(1.5, 3, 9);
            frameR = 1.3;
            ground.rotation.set(0, 0, 0);
            ground.position.set(0, 0, -1.3);
            scene.add(ground);
          } else {
            var counts = STACKS[count],
              spots = SPOTS[counts.length],
              idx = 0,
              spread = 0;
            counts.forEach(function (cnt, si) {
              var sx = spots[si][0],
                sz = spots[si][1];
              spread = Math.max(spread, Math.sqrt(sx * sx + sz * sz));
              for (var k = 0; k < cnt; k++, idx++) {
                var c2 = makeCoin();
                var y = T / 2 + k * (T + 0.004);
                // coins in a stack only shift sideways and turn about their axis: no tilt, so they never cut into each other
                c2.position.set(sx + (seeded(idx) - 0.5) * 0.05, y, sz + (seeded(idx + 50) - 0.5) * 0.05);
                c2.rotation.set(0, seeded(idx + 3) * Math.PI * 2, 0);
                content.add(c2);
                coins.push({ obj: c2, y: y, delay: idx * 55 + si * 40 });
              }
            });
            var h = T * (counts[0] + 0.4);
            content.position.y = -h / 2; // centre the stacks on the turntable
            basePitch = 0.52;
            frameR = counts.length > 1 ? spread + 1.15 : Math.max(1.25, h * 0.75 + 0.9);
            key.position.set(2, 6, 6);
            ground.rotation.set(-Math.PI / 2, 0, 0);
            ground.position.set(0, 0, 0);
            content.add(ground);
          }
          turntable.add(content);
          var now = performance.now();
          coins.forEach(function (c) {
            c.start = animate && !reduce ? now + c.delay : 0;
            if (c.start) c.obj.position.y = c.y + 1.6;
          });
          if (count === 1 && animate && !reduce) {
            coins[0].obj.position.y = 0;
            coins[0].obj.scale.setScalar(0.6);
          }
          resize();
        }

        var curPack = packNum(el);
        layout(curPack, false);
        if (window.MutationObserver) {
          mo = new MutationObserver(function () {
            var n = packNum(el);
            if (coinsFor(n) !== coinsFor(curPack)) layout(n, true);
            curPack = n;
          });
          mo.observe(el, { attributes: true, attributeFilter: ["data-pack"] });
        }

        // ---- drag to spin (same feel as the VIP card) ----
        var yaw = -0.5,
          pitch = basePitch,
          vYaw = 0,
          vPitch = 0,
          dragging = false,
          lx = 0,
          ly = 0,
          lt = 0,
          lastTouch = performance.now(),
          canvas = renderer.domElement;
        function up() {
          if (dragging) {
            dragging = false;
            lastTouch = performance.now();
          }
        }
        canvas.addEventListener("pointerdown", function (e) {
          dragging = true;
          lx = e.clientX;
          ly = e.clientY;
          lt = performance.now();
          vYaw = vPitch = 0;
          try {
            canvas.setPointerCapture(e.pointerId);
          } catch (err) {}
          lastTouch = lt;
        });
        canvas.addEventListener("pointermove", function (e) {
          if (!dragging) return;
          var now = performance.now(),
            dt = Math.max(1, now - lt),
            dx = e.clientX - lx,
            dy = e.clientY - ly;
          yaw += 0.0085 * dx;
          pitch = Math.max(-1.1, Math.min(1.25, pitch + 0.006 * dy));
          vYaw = ((0.0085 * dx) / dt) * 16.7;
          vPitch = ((0.006 * dy) / dt) * 16.7;
          lx = e.clientX;
          ly = e.clientY;
          lt = now;
          lastTouch = now;
        });
        canvas.addEventListener("pointerup", up);
        canvas.addEventListener("pointercancel", up);

        var clock = new THREE.Clock();
        function easeOut(t) {
          return 1 - Math.pow(1 - t, 3);
        }
        function frame() {
          if (dead) return;
          raf = requestAnimationFrame(frame);
          var t = clock.getElapsedTime(),
            now = performance.now();
          if (!dragging) {
            yaw += vYaw;
            vYaw *= 0.955;
            vPitch = 0.9 * (vPitch + 0.045 * (basePitch - pitch));
            pitch += vPitch;
            if (!reduce && now - lastTouch > 2600 && Math.abs(vYaw) < 0.002) yaw += 0.0035;
          }
          turntable.rotation.set(pitch, yaw, 0, "XYZ");
          turntable.position.y = reduce ? 0 : 0.03 * Math.sin(1.15 * t);
          for (var k = 0; k < coins.length; k++) {
            var c = coins[k];
            if (!c.start) continue;
            var p = Math.min(1, Math.max(0, (now - c.start) / 520));
            if (coins.length === 1) {
              c.obj.scale.setScalar(0.6 + 0.4 * easeOut(p));
            } else {
              c.obj.position.y = c.y + 1.6 * (1 - easeOut(p));
            }
            if (p >= 1) c.start = 0;
          }
          spot.position.x = 3 * Math.sin(yaw) + 1.2;
          renderer.render(scene, camera);
        }
        frame();
      }

      return function () {
        dead = true;
        if (raf) cancelAnimationFrame(raf);
        if (ro) ro.disconnect();
        if (mo) mo.disconnect();
        if (renderer)
          try {
            renderer.dispose();
          } catch (e) {}
        el.innerHTML = "";
      };
    },
  };
})();
