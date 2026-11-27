// Enraged Beanie 3D viewer (per dc): a real 3D model, not a spinning photo.
// Shape: the beanie's silhouette traced from dc's front/back product photos (cuff radius = 1), turned into a
// lathe (round cross-section). Texture: the front and back photos unwrapped around that shape
// (img/enraged-beanie-tex.jpg, 2048x1024, u = angle around the head with the front at u=0.5), sides filled
// with clean knit from the back photo, baked edge shading flattened so three.js lights the shape.
// Interaction matches the mask/VIP viewers: drag to spin with inertia, gentle idle spin, slight bob.
var MPBeanie3D = (function () {
  "use strict";
  var PROFILE = [[0.4333,0.0],[0.7381,0.0149],[0.8988,0.0298],[0.9559,0.0447],[0.9752,0.0596],[0.9845,0.0745],[0.9901,0.0894],[0.9975,0.1043],[1.0,0.1192],[1.0,0.1341],[1.0,0.149],[1.0,0.1639],[1.0,0.1788],[1.0,0.1937],[1.0,0.2086],[1.0,0.2235],[1.0,0.2384],[1.0,0.2533],[1.0,0.2682],[1.0,0.2831],[1.0,0.298],[1.0,0.3128],[1.0,0.3277],[0.9994,0.3426],[0.9994,0.3575],[0.9994,0.3724],[1.0,0.3873],[1.0,0.4022],[1.0,0.4171],[1.0,0.432],[1.0,0.4469],[1.0,0.4618],[1.0,0.4767],[1.0,0.4916],[1.0,0.5065],[1.0,0.5214],[1.0,0.5363],[1.0,0.5512],[1.0,0.5661],[1.0,0.581],[1.0,0.5959],[1.0,0.6108],[1.0,0.6257],[1.0,0.6406],[1.0,0.6555],[0.9994,0.6704],[0.9957,0.6853],[0.9882,0.7002],[0.9739,0.7151],[0.9336,0.73],[0.9292,0.7449],[0.9286,0.7598],[0.9299,0.7747],[0.9292,0.7896],[0.9286,0.8045],[0.9286,0.8194],[0.9274,0.8343],[0.9261,0.8492],[0.9249,0.8641],[0.9224,0.879],[0.9205,0.8939],[0.9181,0.9088],[0.9174,0.9236],[0.9137,0.9385],[0.9112,0.9534],[0.9069,0.9683],[0.905,0.9832],[0.9032,0.9981],[0.9001,1.013],[0.897,1.0279],[0.892,1.0428],[0.8883,1.0577],[0.8839,1.0726],[0.8821,1.0875],[0.8796,1.1024],[0.8752,1.1173],[0.8715,1.1322],[0.8672,1.1471],[0.861,1.162],[0.8585,1.1769],[0.8516,1.1918],[0.8485,1.2067],[0.843,1.2216],[0.8386,1.2365],[0.8336,1.2514],[0.8281,1.2663],[0.8225,1.2812],[0.8156,1.2961],[0.8094,1.311],[0.8032,1.3259],[0.797,1.3408],[0.7896,1.3557],[0.7821,1.3706],[0.7753,1.3855],[0.7666,1.4004],[0.7585,1.4153],[0.7505,1.4302],[0.7424,1.4451],[0.7325,1.46],[0.7244,1.4749],[0.7151,1.4898],[0.7058,1.5047],[0.6946,1.5196],[0.6847,1.5345],[0.6729,1.5493],[0.6617,1.5642],[0.6493,1.5791],[0.6387,1.594],[0.6257,1.6089],[0.6127,1.6238],[0.599,1.6387],[0.5835,1.6536],[0.568,1.6685],[0.5537,1.6834],[0.5363,1.6983],[0.5189,1.7132],[0.4997,1.7281],[0.4817,1.743],[0.4575,1.7579],[0.4358,1.7728],[0.4097,1.7877],[0.383,1.8026],[0.3526,1.8175],[0.3215,1.8324],[0.2843,1.8473],[0.2452,1.8622],[0.1912,1.8771],[0.1266,1.892],[0.0,1.897]];
  var TEX = "/img/enraged-beanie-tex.jpg?v=1";
  var TEX_IN = "/img/enraged-beanie-inner.jpg?v=1";
  return {
    mount: function (el) {
      var dead = false, raf = 0, renderer = null, ro = null, loop = null;
      function sheetOpen() { return document.documentElement.classList.contains("mp-pay-open"); }
      var painted = false;
      function noteReady() {
        if (painted) return;
        painted = true;
        try { window.dispatchEvent(new Event("mp-3d-ready")); } catch (_) {}
      }
      function kickLoop() {
        if (!dead && !raf && loop && !sheetOpen()) raf = requestAnimationFrame(loop);
      }
      window.addEventListener("mp-pay-open", kickLoop);
      document.addEventListener("visibilitychange", kickLoop);
      function fallback() {
        if (dead) return;
        var light = document.documentElement.getAttribute("data-theme") === "light";
        el.innerHTML = '<img src="' + (light ? "/img/enraged-beanie-light.jpg?v=1" : "") + '" alt="Enraged Beanie" style="width:100%;height:100%;object-fit:contain">';
      }
      Promise.all([
        import("/vendor/three-0.160.0/build/three.module.min.js"),
        import("/vendor/three-0.160.0/examples/jsm/environments/RoomEnvironment.js?v=2")
      ]).then(function (mods) {
        if (dead) return;
        var THREE = mods[0], Room = mods[1].RoomEnvironment;
        var light = document.documentElement.getAttribute("data-theme") === "light";
        try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return fallback(); }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = light ? 1.2 : 1.12;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        el.appendChild(renderer.domElement);
        var scene = new THREE.Scene(), pmrem = new THREE.PMREMGenerator(renderer);
        scene.environment = pmrem.fromScene(new Room(), 0.04).texture;
        var camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
        camera.position.set(0, 1.25, 6.2);
        camera.lookAt(0, 0.86, 0);
        scene.add(new THREE.HemisphereLight(0xffffff, light ? 0xd5d9e2 : 0x2a3466, light ? 0.95 : 0.8));
        var key = new THREE.DirectionalLight(0xffffff, light ? 0.95 : 0.9);
        key.position.set(2.6, 4.2, 4.5);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.camera.left = key.shadow.camera.bottom = -2.5;
        key.shadow.camera.right = key.shadow.camera.top = 2.5;
        key.shadow.radius = 6;
        scene.add(key);
        var rim = new THREE.DirectionalLight(light ? 0xe8eefc : 0xa9d7f5, light ? 0.45 : 0.7);
        rim.position.set(-3.5, 2.4, -3);
        scene.add(rim);
        // Outer shell: the traced profile, with an open bottom (the photo's rounded bottom corners are dropped)
        // ending in a soft rounded cuff edge. Inner shell: the same profile pulled in by the fabric thickness,
        // drawn from the inside with a purl-side knit. A rounded rim joins them, so you can look underneath (per dc).
        var T = 0.055, top = PROFILE[PROFILE.length - 1][1];
        var prof = PROFILE.filter(function (p) { return p[0] >= 0.955 || p[1] > 0.2; });
        var outer = [new THREE.Vector2(0.912, 0.0), new THREE.Vector2(0.945, 0.012)];
        prof.forEach(function (p) { outer.push(new THREE.Vector2(p[0], p[1])); });
        var inner = [new THREE.Vector2(0.858, 0.0)];
        prof.forEach(function (p) { if (p[1] < top - T) inner.push(new THREE.Vector2(Math.max(0.001, p[0] - T * 1.05), p[1])); });
        inner.push(new THREE.Vector2(0, top - T));
        var rimPts = [new THREE.Vector2(0.858, 0.0), new THREE.Vector2(0.864, -0.011), new THREE.Vector2(0.885, -0.017), new THREE.Vector2(0.905, -0.01), new THREE.Vector2(0.912, 0.0)];
        function lathe(p, n) {
          var g = new THREE.LatheGeometry(p, n, -Math.PI, Math.PI * 2), uv = g.attributes.uv, pos = g.attributes.position;
          // v follows height, not point index, so textures line up with the photo rows
          for (var i = 0; i < uv.count; i++) uv.setY(i, Math.max(0, Math.min(1, pos.getY(i) / top)));
          g.computeVertexNormals();
          return g;
        }
        var geo = lathe(outer, 160), innerGeo = lathe(inner, 160), rimGeo = lathe(rimPts, 160);
        // inside depth shading: lighter at the opening, darker towards the crown
        var cols = new Float32Array(innerGeo.attributes.position.count * 3), ip = innerGeo.attributes.position;
        for (var k = 0; k < ip.count; k++) { var d = Math.min(1, ip.getY(k) / top), s1 = 1 - 0.62 * Math.pow(d, 0.8); cols[k * 3] = cols[k * 3 + 1] = cols[k * 3 + 2] = s1; }
        innerGeo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
        // inside: purl side of the knit, generated from the outside texture so every square sits
        // exactly behind its outside square (tools/beanie/make-inner-texture.py); same UV layout
        var ik = new THREE.TextureLoader().load(TEX_IN);
        ik.colorSpace = THREE.SRGBColorSpace; ik.anisotropy = renderer.capabilities.getMaxAnisotropy();
        var ikBump = new THREE.TextureLoader().load(TEX_IN); ikBump.colorSpace = THREE.NoColorSpace;
        var innerMat = new THREE.MeshStandardMaterial({ map: ik, bumpMap: ikBump, bumpScale: 1.2, roughness: 1, metalness: 0, vertexColors: true, envMapIntensity: 0.45, side: THREE.BackSide });
        var rimMat = new THREE.MeshStandardMaterial({ map: ik, roughness: 1, metalness: 0, color: 0xb0b0b6, envMapIntensity: 0.5, side: THREE.DoubleSide });
        // the model turns around its middle (so tilting to look underneath doesn't swing it off screen)
        var group = new THREE.Group(), body = new THREE.Group();
        body.position.y = -0.92;
        group.add(body);
        body.add(new THREE.Mesh(innerGeo, innerMat));
        body.add(new THREE.Mesh(rimGeo, rimMat));
        var loader = new THREE.TextureLoader();
        loader.load(TEX, function (tex) {
          if (dead) return;
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
          var bump = tex.clone();
          bump.colorSpace = THREE.NoColorSpace;
          bump.needsUpdate = true;
          var mat = new THREE.MeshStandardMaterial({ map: tex, bumpMap: bump, bumpScale: 0.7, roughness: 0.94, metalness: 0, envMapIntensity: light ? 0.85 : 0.7, side: THREE.FrontSide });
          var mesh = new THREE.Mesh(geo, mat);
          mesh.castShadow = true;
          body.add(mesh);
        }, undefined, fallback);
        scene.add(group);
        var shadow = new THREE.Mesh(new THREE.CircleGeometry(1.6, 48), new THREE.ShadowMaterial({ opacity: light ? 0.16 : 0.32 }));
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = -0.02;
        shadow.receiveShadow = true;
        shadow.material.depthWrite = false;
        shadow.renderOrder = -1;
        scene.add(shadow);
        function size() {
          var w = el.clientWidth || 300, h = el.clientHeight || 300;
          renderer.setSize(w, h, false);
          renderer.domElement.style.width = "100%";
          renderer.domElement.style.height = "100%";
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        }
        size();
        if (window.ResizeObserver) { ro = new ResizeObserver(size); ro.observe(el); }
        // drag to spin with inertia, idle spin, gentle tilt return (same feel as the mask viewer)
        var yaw = -0.25, pitch = 0.06, rest = 0.06, vy = 0, vp = 0, dragging = false, lx = 0, ly = 0, lt = 0, idleAt = performance.now();
        var c = renderer.domElement;
        c.style.touchAction = "pan-y";
        c.addEventListener("pointerdown", function (e) { dragging = true; lx = e.clientX; ly = e.clientY; lt = performance.now(); vy = vp = 0; try { c.setPointerCapture(e.pointerId); } catch (x) {} idleAt = lt; });
        c.addEventListener("pointermove", function (e) {
          if (!dragging) return;
          var t = performance.now(), dt = Math.max(1, t - lt), dx = e.clientX - lx, dy = e.clientY - ly;
          yaw += 0.0085 * dx; pitch = Math.max(-1.35, Math.min(0.7, pitch + 0.005 * dy)); /* drag up to tilt it and look underneath */
          vy = 0.0085 * dx / dt * 16.7; vp = 0.005 * dy / dt * 16.7;
          lx = e.clientX; ly = e.clientY; lt = t; idleAt = t;
        });
        function up() { if (dragging) { dragging = false; idleAt = performance.now(); } }
        c.addEventListener("pointerup", up);
        c.addEventListener("pointercancel", up);
        var clock = new THREE.Clock(), reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
        (function tick() {
          if (dead) return;
          loop = tick;
          if (sheetOpen()) { raf = 0; return; }
          raf = requestAnimationFrame(tick);
          var t = clock.getElapsedTime();
          if (!dragging) {
            yaw += vy; vy *= 0.955;
            vp = 0.9 * (vp + 0.045 * (rest - pitch)); pitch += vp;
            if (!reduce && performance.now() - idleAt > 2600 && Math.abs(vy) < 0.002) yaw += 0.0035;
          }
          group.rotation.set(pitch, yaw, 0);
          group.position.y = 0.92 + (reduce ? 0 : 0.03 * Math.sin(t * 1.15));
          shadow.material.opacity = (light ? 0.16 : 0.32) * Math.max(0, Math.cos(pitch * 1.3));
          renderer.render(scene, camera);
          noteReady();
        })();
      }).catch(fallback);
      return function () {
        dead = true;
        window.removeEventListener("mp-pay-open", kickLoop);
        document.removeEventListener("visibilitychange", kickLoop);
        cancelAnimationFrame(raf);
        ro && ro.disconnect();
        if (renderer) { renderer.dispose(); renderer.domElement.remove(); }
      };
    }
  };
})();
