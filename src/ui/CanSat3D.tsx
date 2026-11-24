/**
 * A CanSat you can turn around in your hands.
 *
 * Built from primitives rather than a downloaded model, for two reasons: the
 * whole thing is a few kilobytes instead of a few megabytes, and every part is
 * a named object we can highlight and attach a label to.
 *
 * Three.js is imported here and nowhere else, and this component is loaded
 * lazily, so a student reading the Start here chapters never downloads it.
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

import { CANSAT_PARTS, type Part } from './cansatParts';
export { CANSAT_PARTS };
export type { Part };

export function CanSat3D({
  selected,
  onSelect,
  chuteOpen,
}: {
  selected: string | null;
  onSelect: (id: string) => void;
  chuteOpen: boolean;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const [labels, setLabels] = useState<{ id: string; x: number; y: number; z: number }[]>([]);
  const [ready, setReady] = useState(false);

  // Live values the animation loop reads without needing to restart.
  const state = useRef({ selected, chuteOpen, spin: true, yaw: 0.6, pitch: -0.25, zoom: 1 });
  state.current.selected = selected;
  state.current.chuteOpen = chuteOpen;

  useEffect(() => {
    const el = mount.current;
    if (!el) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    // Warm, soft lighting so the aluminium reads as metal without a texture.
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const key = new THREE.DirectionalLight(0xfff4e2, 1.5);
    key.position.set(4, 6, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fb6d8, 0.7);
    rim.position.set(-5, 2, -4);
    scene.add(rim);

    const root = new THREE.Group();
    scene.add(root);

    /** Where each part's label should float, in model space. */
    const anchors: Record<string, THREE.Vector3> = {};
    const meshes: Record<string, THREE.Mesh[]> = {};

    const register = (id: string, mesh: THREE.Mesh) => {
      (meshes[id] ??= []).push(mesh);
      mesh.userData.partId = id;
    };

    // --- the can -----------------------------------------------------------
    const canH = 2.3, canR = 0.66;
    const canMat = new THREE.MeshStandardMaterial({
      color: 0xb9bec7, metalness: 0.85, roughness: 0.34,
      transparent: true, opacity: 0.42, side: THREE.DoubleSide,
    });
    const can = new THREE.Mesh(new THREE.CylinderGeometry(canR, canR, canH, 48, 1, true), canMat);
    root.add(can);
    register('can', can);
    anchors.can = new THREE.Vector3(canR + 0.1, 0.1, 0);

    const lidMat = new THREE.MeshStandardMaterial({
      color: 0xa8adb6, metalness: 0.9, roughness: 0.3,
    });
    for (const y of [canH / 2, -canH / 2]) {
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(canR, canR, 0.045, 48), lidMat);
      lid.position.y = y;
      root.add(lid);
      register('can', lid);
    }

    // --- the stack inside --------------------------------------------------
    const board = (id: string, y: number, h: number, colour: number) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(0.92, h, 0.62),
        new THREE.MeshStandardMaterial({ color: colour, metalness: 0.2, roughness: 0.65 }),
      );
      m.position.y = y;
      root.add(m);
      register(id, m);
      anchors[id] = new THREE.Vector3(0.52, y, 0.42);
      return m;
    };

    board('battery', -0.74, 0.44, 0x6b8f5e);
    board('board', -0.12, 0.26, 0x5a7fb5);
    board('radio', 0.28, 0.2, 0x2a4d8f);
    board('sensor', 0.62, 0.14, 0x8a6bab);

    // --- antenna -----------------------------------------------------------
    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 1.0, 8),
      new THREE.MeshStandardMaterial({ color: 0x4f9e94, metalness: 0.6, roughness: 0.4 }),
    );
    antenna.position.set(0.42, -1.55, 0.18);
    root.add(antenna);
    register('antenna', antenna);
    anchors.antenna = new THREE.Vector3(0.5, -1.9, 0.18);

    // --- parachute ---------------------------------------------------------
    const chute = new THREE.Group();
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: 0xc58b3c, roughness: 0.85, metalness: 0.05, side: THREE.DoubleSide,
      }),
    );
    chute.add(canopy);
    register('parachute', canopy);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const line = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 1, 4),
        new THREE.MeshStandardMaterial({ color: 0xe8ddc8, roughness: 0.9 }),
      );
      line.position.set(Math.cos(a) * 0.5, -0.5, Math.sin(a) * 0.5);
      line.rotation.z = Math.cos(a) * 0.5;
      line.rotation.x = -Math.sin(a) * 0.5;
      chute.add(line);
    }
    chute.position.y = canH / 2 + 0.9;
    root.add(chute);
    anchors.parachute = new THREE.Vector3(0.9, canH / 2 + 1.5, 0);

    // --- interaction -------------------------------------------------------
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let dragging = false;
    let moved = false;
    let lastX = 0, lastY = 0;

    const onDown = (e: PointerEvent) => {
      dragging = true; moved = false;
      lastX = e.clientX; lastY = e.clientY;
      state.current.spin = false;
      (e.target as Element).setPointerCapture?.(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      state.current.yaw += dx * 0.01;
      state.current.pitch = Math.max(-1.2, Math.min(1.2, state.current.pitch + dy * 0.01));
      lastX = e.clientX; lastY = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      if (moved) return; // a drag is not a click
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(root.children, true);
      const hit = hits.find((h) => (h.object as THREE.Mesh).userData?.partId);
      if (hit) onSelect((hit.object as THREE.Mesh).userData.partId as string);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      state.current.zoom = Math.max(0.6, Math.min(2, state.current.zoom + e.deltaY * 0.0012));
    };

    const dom = renderer.domElement;
    dom.style.touchAction = 'none';
    dom.addEventListener('pointerdown', onDown);
    dom.addEventListener('pointermove', onMove);
    dom.addEventListener('pointerup', onUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    // --- resize ------------------------------------------------------------
    /**
     * Resize without feeding back into itself.
     *
     * `setSize(w, h, false)` leaves the CSS size alone, so the canvas is laid
     * out purely by the stylesheet. Without that, the canvas renders at its
     * attribute width, which widens its own container, which asks for a bigger
     * canvas - and it runs away to millions of pixels within a second.
     *
     * The guard also skips no-op resizes, so the observer cannot loop.
     */
    let lastW = 0, lastH = 0;
    const resize = () => {
      const w = Math.round(el.clientWidth);
      const h = Math.round(el.clientHeight);
      if (!w || !h || (w === lastW && h === lastH)) return;
      lastW = w; lastH = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    // --- loop --------------------------------------------------------------
    let raf = 0;
    let cancelled = false;
    let prev = 0;
    let chuteScale = 0.02;

    const step = (now: number) => {
      if (cancelled) return;
      raf = requestAnimationFrame(step);
      if (!prev) prev = now;
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;

      const s = state.current;
      if (s.spin) s.yaw += dt * 0.28;

      // The parachute grows when deployed and folds away when not.
      const target = s.chuteOpen ? 1 : 0.02;
      chuteScale += (target - chuteScale) * Math.min(1, dt * 3.2);
      chute.scale.setScalar(chuteScale);
      chute.visible = chuteScale > 0.05;

      root.rotation.y = s.yaw;
      root.rotation.x = s.pitch;

      // Highlight the selected part by lifting its brightness.
      for (const [id, list] of Object.entries(meshes)) {
        for (const m of list) {
          const mat = m.material as THREE.MeshStandardMaterial;
          const on = id === s.selected;
          mat.emissive.setHex(on ? 0x2a4d8f : 0x000000);
          mat.emissiveIntensity = on ? 0.42 : 0;
          if (id === 'can') mat.opacity = s.selected === 'can' ? 0.72 : 0.42;
        }
      }

      const dist = 6.4 * s.zoom;
      camera.position.set(0, 0.5, dist);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);

      // Project each anchor to screen space so HTML labels can follow it.
      const rect = el.getBoundingClientRect();
      setLabels(
        Object.entries(anchors).map(([id, v]) => {
          const p = v.clone().applyMatrix4(root.matrixWorld).project(camera);
          return {
            id,
            x: ((p.x + 1) / 2) * rect.width,
            y: ((-p.y + 1) / 2) * rect.height,
            z: p.z,
          };
        }),
      );
    };
    raf = requestAnimationFrame(step);
    setReady(true);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      dom.removeEventListener('pointerdown', onDown);
      dom.removeEventListener('pointermove', onMove);
      dom.removeEventListener('pointerup', onUp);
      dom.removeEventListener('wheel', onWheel);
      renderer.dispose();
      el.removeChild(dom);
    };
  }, [onSelect]);

  return (
    <div className="c3-stage">
      <div className="c3-canvas" ref={mount} />

      {ready && labels.map((l) => {
        const part = CANSAT_PARTS.find((p) => p.id === l.id);
        if (!part || l.z > 1) return null;
        return (
          <button
            key={l.id}
            className={`c3-label${selected === l.id ? ' on' : ''}`}
            style={{ left: l.x, top: l.y }}
            onClick={() => onSelect(l.id)}
          >
            <span className="dot" style={{ background: part.colour }} />
            {part.label}
          </button>
        );
      })}

      <div className="c3-controls">
        <button onClick={() => { state.current.spin = !state.current.spin; }}
                title="Start or stop turning">&#8635;</button>
        <button onClick={() => { state.current.zoom = Math.max(0.6, state.current.zoom - 0.2); }}
                title="Closer">+</button>
        <button onClick={() => { state.current.zoom = Math.min(2, state.current.zoom + 0.2); }}
                title="Further away">&minus;</button>
        <button onClick={() => {
          state.current.yaw = 0.6; state.current.pitch = -0.25;
          state.current.zoom = 1; state.current.spin = true;
        }} title="Back to the start">&#9678;</button>
      </div>

      <span className="c3-hint">drag to turn it &middot; scroll to zoom &middot; click a part</span>
    </div>
  );
}
