// Stars product viewer: a different real-3D object per pack, built in three.js like vip3d.js / mask3d.js.
//   <=100  one star coin            <=500  a fan of three coins       <=1000 a wrapped coin roll
//   <=2500 an engraved medallion    above  a star trophy on a pedestal
// Coins are lathe-turned (raised rim, recessed field, edge groove) with extruded enamel MPStars.
// The stage's data-pack attribute picks the object; changing it swaps with a small pop.
var MPStars3D = (function () {
  "use strict";
  var PACK_IMGS = [100, 500, 1000, 2400, 2500, 6500];
  function packNum(el) {
    return parseInt(String(el.getAttribute("data-pack") || "").replace(/[^\d]/g, ""), 10) || 0;
  }
  function tierFor(n) {
    return !n || n <= 100 ? "coin" : n <= 500 ? "fan" : n <= 1000 ? "roll" : n <= 2500 ? "medal" : "trophy";
  }
  function isLight() {
    var t = document.documentElement.getAttribute("data-theme");
    return t ? t === "light" : !!(window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches);
  }
  function fallbackSrc(el) {
    var n = packNum(el);
    return "/img/stars-" + (PACK_IMGS.indexOf(n) > -1 ? n + "-" : "") + (isLight() ? "light" : "dark") + ".jpg?v=5";
  }

  return {
    tierFor: tierFor,
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
        var still = el.hasAttribute("data-still"); // single frame, used by tools/stars/render-stills.cjs
        var reduce = still || !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
        try {
          renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: still });
        } catch (e) {
          return fallback();
        }
        renderer.setPixelRatio(still ? 1 : Math.min(window.devicePixelRatio || 1, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        el.appendChild(renderer.domElement);

        var scene = new THREE.Scene();
        var pmrem = new THREE.PMREMGenerator(renderer);
        scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

        var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
        var frameR = 1.3;
        function resize() {
          var w = el.clientWidth || 300,
            h = el.clientHeight || 300;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          var fit = frameR / Math.sin((camera.fov * Math.PI) / 360);
          if (camera.aspect < 1) fit /= camera.aspect;
          camera.position.set(0, 0, fit);
          camera.lookAt(0, 0, 0);
          camera.updateProjectionMatrix();
        }
        if (window.ResizeObserver) (ro = new ResizeObserver(resize)).observe(el);

        var key = new THREE.DirectionalLight(0xffffff, light ? 1.8 : 1.7);
        key.position.set(1.5, 4, 8);
        key.castShadow = true;
        key.shadow.mapSize.set(2048, 2048);
        key.shadow.radius = 10;
        var sc = key.shadow.camera;
        sc.left = sc.bottom = -4;
        sc.right = sc.top = 4;
        sc.near = 1;
        sc.far = 30;
        key.shadow.bias = -3e-4;
        scene.add(key);
        var rim = new THREE.DirectionalLight(light ? 0xd6e6ff : 0xa9d7f5, light ? 1.1 : 1.2);
        rim.position.set(-5, 3, -4);
        scene.add(rim);
        var spot = new THREE.PointLight(0xffffff, light ? 9 : 14, 30);
        spot.position.set(2.5, 1.5, 4);
        scene.add(spot);

        // ---- materials ----
        // Light mode: frosted pale-blue coins with navy enamel stars (contrast from colour, not from shadow).
        // Dark mode: navy coins with pale-blue stars.
        var M = light
          ? {
              coin: new THREE.MeshPhysicalMaterial({ color: 0xc9d9ea, roughness: 0.34, metalness: 0.08, clearcoat: 0.8, clearcoatRoughness: 0.22, envMapIntensity: 0.9 }),
              star: new THREE.MeshPhysicalMaterial({ color: 0x14204a, roughness: 0.22, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 1 }),
              accent: new THREE.MeshPhysicalMaterial({ color: 0x14204a, roughness: 0.3, metalness: 0.1, clearcoat: 0.8 }),
              wrap: new THREE.MeshPhysicalMaterial({ color: 0x14204a, roughness: 0.62, metalness: 0, sheen: 0.5, sheenColor: 0x8fb4dd, side: THREE.DoubleSide }),
              band: new THREE.MeshPhysicalMaterial({ color: 0xc9d9ea, roughness: 0.5, metalness: 0 }),
            }
          : {
              coin: new THREE.MeshPhysicalMaterial({ color: 0x31447c, roughness: 0.32, metalness: 0.2, clearcoat: 0.9, clearcoatRoughness: 0.18, envMapIntensity: 1 }),
              star: new THREE.MeshPhysicalMaterial({ color: 0xa9d7f5, roughness: 0.18, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, emissive: 0x5b9fd0, emissiveIntensity: 0.05, envMapIntensity: 1 }),
              accent: new THREE.MeshStandardMaterial({ color: 0xa9d7f5, emissive: 0x6fa8d6, emissiveIntensity: 0.25, roughness: 0.3 }),
              wrap: new THREE.MeshPhysicalMaterial({ color: 0xa9d7f5, roughness: 0.6, metalness: 0, sheen: 0.5, sheenColor: 0xffffff, side: THREE.DoubleSide }),
              band: new THREE.MeshPhysicalMaterial({ color: 0x31447c, roughness: 0.5, metalness: 0.1 }),
            };

        // ---- shared geometry builders ----
        var geoCache = {};
        function coinGeo(R, T) {
          var k = R + ":" + T;
          if (geoCache[k]) return geoCache[k];
          var F = T / 2 - 0.028 * (T / 0.17),
            C = 0.06 * R,
            prof = [new THREE.Vector2(0, F), new THREE.Vector2(0.79 * R, F), new THREE.Vector2(0.84 * R, T / 2), new THREE.Vector2(R - C, T / 2)],
            i,
            a;
          for (i = 1; i <= 6; i++) {
            a = (i / 6) * (Math.PI / 2);
            prof.push(new THREE.Vector2(R - C + C * Math.sin(a), T / 2 - C + C * Math.cos(a)));
          }
          prof.push(new THREE.Vector2(R, 0.014), new THREE.Vector2(R - 0.012, 0), new THREE.Vector2(R, -0.014));
          for (i = 0; i <= 6; i++) {
            a = (i / 6) * (Math.PI / 2);
            prof.push(new THREE.Vector2(R - C + C * Math.cos(a), -T / 2 + C - C * Math.sin(a)));
          }
          prof.push(new THREE.Vector2(0.84 * R, -T / 2), new THREE.Vector2(0.79 * R, -F), new THREE.Vector2(0, -F));
          prof.reverse(); // bottom-to-top so the lathe's faces point outward
          return (geoCache[k] = { geo: new THREE.LatheGeometry(prof, 128), F: F });
        }
        // MPStar outline (the site star) with its stroke-rounded corners. w = width.
        var P = [[12, 3.5], [14.6, 8.8], [20.5, 9.7], [16.2, 13.8], [17.2, 19.6], [12, 16.9], [6.8, 19.6], [7.8, 13.8], [3.5, 9.7], [9.4, 8.8]];
        function starShape(w) {
          var K = w / 17,
            pts = P.map(function (p) {
              return new THREE.Vector2((p[0] - 12) * K, -(p[1] - 11.9) * K);
            }),
            s = new THREE.Shape();
          for (var i = 0; i < pts.length; i++) {
            var v = pts[i],
              p0 = v.clone().lerp(pts[(i + pts.length - 1) % pts.length], i % 2 ? 0.16 : 0.2),
              p1 = v.clone().lerp(pts[(i + 1) % pts.length], i % 2 ? 0.16 : 0.2);
            if (i === 0) s.moveTo(p0.x, p0.y);
            else s.lineTo(p0.x, p0.y);
            s.quadraticCurveTo(v.x, v.y, p1.x, p1.y);
          }
          s.closePath();
          return s;
        }
        function starGeo(w, depth, bevel) {
          var k = "s" + w + ":" + depth + ":" + bevel;
          return (
            geoCache[k] ||
            (geoCache[k] = new THREE.ExtrudeGeometry(starShape(w), {
              depth: depth,
              bevelEnabled: true,
              bevelThickness: bevel,
              bevelSize: bevel * 1.3,
              bevelSegments: 5,
              curveSegments: 12,
            }))
          );
        }
        function mesh(g, m) {
          var x = new THREE.Mesh(g, m);
          x.castShadow = x.receiveShadow = true;
          return x;
        }
        // A coin lying flat (axis Y). o: R, T, starW, ring (force rim ring), small (count of small stars in a ring)
        function makeCoin(o) {
          o = o || {};
          var R = o.R || 1,
            T = o.T || 0.17,
            cg = coinGeo(R, T),
            g = new THREE.Group();
          g.add(mesh(cg.geo, M.coin));
          [1, -1].forEach(function (s) {
            var st = mesh(starGeo(o.starW || 1.02 * R, 0.012 * (T / 0.17), 0.016 * (T / 0.17)), M.star);
            st.rotation.x = (-s * Math.PI) / 2;
            st.position.y = s * (cg.F - 0.004);
            g.add(st);
            if (!light || o.ring) {
              var rg = new THREE.Mesh(new THREE.TorusGeometry(0.815 * R, 0.007 * R, 8, 128), M.accent);
              rg.rotation.x = Math.PI / 2;
              rg.position.y = s * (cg.F + 0.012);
              g.add(rg);
            }
            for (var i = 0; i < (o.small || 0); i++) {
              var a = (i / o.small) * Math.PI * 2,
                sm = mesh(starGeo(0.15 * R, 0.008, 0.012), M.star);
              sm.rotation.set((-s * Math.PI) / 2, 0, -a);
              sm.position.set(Math.sin(a) * 0.66 * R, s * (cg.F - 0.002), -s * Math.cos(a) * 0.66 * R);
              g.add(sm);
            }
          });
          return g;
        }
        function upright(obj) {
          var g = new THREE.Group();
          obj.rotation.x = Math.PI / 2;
          g.add(obj);
          return g;
        }

        // ---- the five objects ----
        var BUILD = {
          coin: function () {
            return { obj: upright(makeCoin()), floor: false, pitch: 0.12 };
          },
          fan: function () {
            // three coins standing in a shingled row: parallel faces 0.24 apart (more than a coin's thickness),
            // so they overlap from the front but never touch
            var g = new THREE.Group();
            [-1, 0, 1].forEach(function (k) {
              var c = upright(makeCoin());
              c.position.set(k * 0.62, -k * 0.1, k * 0.24);
              g.add(c);
            });
            g.rotation.y = 0.28;
            return { obj: g, floor: false, pitch: 0.1 };
          },
          roll: function () {
            // a wrapped roll of 14 coins on its side; the end coins show their stars
            var g = new THREE.Group(),
              n = 14,
              gap = 0.173,
              L = (n - 1) * gap;
            for (var i = 0; i < n; i++) {
              var c = makeCoin();
              c.rotation.z = Math.PI / 2;
              c.position.x = -L / 2 + i * gap;
              g.add(c);
            }
            var wl = L * 0.7,
              wrap = mesh(new THREE.CylinderGeometry(1.025, 1.025, wl, 96, 1, true), M.wrap);
            wrap.rotation.z = Math.PI / 2;
            g.add(wrap);
            [-1, 1].forEach(function (s) {
              var b = mesh(new THREE.CylinderGeometry(1.03, 1.03, 0.07, 96, 1, true), M.band);
              b.rotation.z = Math.PI / 2;
              b.position.x = s * wl * 0.32;
              g.add(b);
            });
            g.rotation.y = -0.35;
            return { obj: g, floor: true, pitch: 0.32 };
          },
          medal: function () {
            // a thick, larger coin with a ring of small stars around the big one
            return { obj: upright(makeCoin({ R: 1.25, T: 0.3, starW: 0.82, ring: true, small: 12 })), floor: false, pitch: 0.12 };
          },
          trophy: function () {
            // a pillowy enamel star standing on a turned pedestal, with a small star coin set in front
            var g = new THREE.Group();
            var prof = [[0, 0], [1.0, 0], [1.03, 0.04], [1.0, 0.1], [0.86, 0.14], [0.8, 0.42], [0.9, 0.47], [0.92, 0.53], [0.9, 0.56], [0, 0.56]].map(function (p) {
              return new THREE.Vector2(p[0], p[1]);
            });
            g.add(mesh(new THREE.LatheGeometry(prof, 128), M.coin));
            var ring = new THREE.Mesh(new THREE.TorusGeometry(0.905, 0.012, 8, 128), M.accent);
            ring.rotation.x = Math.PI / 2;
            ring.position.y = 0.5;
            g.add(ring);
            var sg = starGeo(2.1, 0.22, 0.14);
            sg.computeBoundingBox();
            var bb = sg.boundingBox,
              star = mesh(sg, M.star);
            star.position.set(0, 0.56 - bb.min.y - 0.02, -(bb.max.z + bb.min.z) / 2);
            g.add(star);
            var mini = upright(makeCoin({ R: 0.3, T: 0.07 }));
            mini.position.set(0, 0.28, 0.86);
            g.add(mini);
            return { obj: g, floor: true, pitch: 0.16 };
          },
        };

        // ---- scene graph: turntable (yaw + pitch from drag) > content ----
        var turntable = new THREE.Group();
        scene.add(turntable);
        var content = null,
          basePitch = 0.12,
          pop = 0,
          groundMat = new THREE.ShadowMaterial({ color: 0x0a1230, opacity: 0.3 }),
          ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), groundMat);
        ground.receiveShadow = true;

        function layout(n, animate) {
          if (content) turntable.remove(content);
          var made = BUILD[tierFor(n)]();
          content = new THREE.Group();
          content.add(made.obj);
          var box = new THREE.Box3().setFromObject(made.obj),
            ctr = box.getCenter(new THREE.Vector3()),
            size = box.getSize(new THREE.Vector3());
          made.obj.position.sub(ctr); // centre on the turntable
          // light mode: no backdrop shadow, only a faint contact shadow under things that stand on a floor
          groundMat.opacity = light ? (made.floor ? 0.08 : 0) : 0.3;
          if (made.floor) {
            ground.rotation.set(-Math.PI / 2, 0, 0);
            ground.position.set(0, -size.y / 2 - 0.001, 0);
            content.add(ground);
          } else {
            ground.rotation.set(0, 0, 0);
            ground.position.set(0, 0, -1.6);
            scene.add(ground);
          }
          frameR = 0.5 * Math.max(size.x, size.y, size.z * 0.8) * 1.12 + 0.12;
          basePitch = made.pitch;
          turntable.add(content);
          pop = animate && !reduce ? performance.now() : 0;
          if (pop) content.scale.setScalar(0.82);
          resize();
        }

        var curPack = packNum(el);
        layout(curPack, false);
        if (window.MutationObserver) {
          mo = new MutationObserver(function () {
            var n = packNum(el);
            if (tierFor(n) !== tierFor(curPack)) layout(n, true);
            curPack = n;
          });
          mo.observe(el, { attributes: true, attributeFilter: ["data-pack"] });
        }

        // ---- drag to spin (same feel as the VIP card) ----
        var yaw = still ? parseFloat(el.getAttribute("data-still")) || -0.45 : -0.45,
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
        function frame() {
          if (dead) return;
          raf = still ? 0 : requestAnimationFrame(frame);
          var t = clock.getElapsedTime(),
            now = performance.now();
          if (!dragging) {
            yaw += vYaw;
            vYaw *= 0.955;
            vPitch = 0.9 * (vPitch + 0.045 * (basePitch - pitch));
            pitch += vPitch;
            if (!reduce && now - lastTouch > 2600 && Math.abs(vYaw) < 0.002) yaw += 0.0035;
          }
          if (still) pitch = basePitch;
          turntable.rotation.set(pitch, yaw, 0, "XYZ");
          turntable.position.y = reduce ? 0 : 0.03 * Math.sin(1.15 * t);
          if (pop) {
            var p = Math.min(1, (now - pop) / 420),
              s = 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2); // ease-out-back
            content.scale.setScalar(0.82 + 0.18 * s);
            if (p >= 1) {
              content.scale.setScalar(1);
              pop = 0;
            }
          }
          spot.position.x = 3 * Math.sin(yaw) + 1.2;
          renderer.render(scene, camera);
          if (still) el.setAttribute("data-ready", "1");
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
