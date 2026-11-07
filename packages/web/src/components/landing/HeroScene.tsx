'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const PHOTOS = [
  '/landing/landmarks.jpg',
  '/landing/journey.jpg',
  '/landing/beach.jpg',
  '/landing/city.jpg',
];

export default function HeroScene() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);
    camera.position.set(0, 0.2, 5.4);

    const root = new THREE.Group();
    scene.add(root);

    scene.add(new THREE.AmbientLight(0xffffff, 1.15));
    const key = new THREE.DirectionalLight(0xfff6df, 1.35);
    key.position.set(4, 5, 6);
    scene.add(key);

    const globe = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.05, 1),
      new THREE.MeshBasicMaterial({
        color: 0x2563eb,
        wireframe: true,
        transparent: true,
        opacity: 0.55,
      }),
    );
    root.add(globe);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.72, 28, 28),
      new THREE.MeshStandardMaterial({
        color: 0x1d4ed8,
        roughness: 0.42,
        metalness: 0.18,
        transparent: true,
        opacity: 0.42,
      }),
    );
    root.add(core);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.85, 0.02, 12, 72),
      new THREE.MeshBasicMaterial({ color: 0xc6a15b, transparent: true, opacity: 0.8 }),
    );
    ring.rotation.x = Math.PI / 2.35;
    root.add(ring);

    const loader = new THREE.TextureLoader();
    const frames: { mesh: THREE.Mesh; angle: number }[] = [];
    PHOTOS.forEach((src, index) => {
      const texture = loader.load(src);
      texture.colorSpace = THREE.SRGBColorSpace;
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1.05, 1.32),
        new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.55,
          metalness: 0.04,
          side: THREE.DoubleSide,
        }),
      );
      const angle = (index / PHOTOS.length) * Math.PI * 2;
      mesh.position.set(Math.cos(angle) * 1.85, 0, Math.sin(angle) * 1.85);
      root.add(mesh);
      frames.push({ mesh, angle });
    });

    const pointer = { x: 0, y: 0 };
    const onMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    let raf = 0;
    let visible = true;
    let time = 0;
    let last = performance.now();
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
    });
    visibility.observe(host);

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      const delta = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!visible || document.hidden) return;
      if (!reduced) time += delta;
      if (!reduced) {
        globe.rotation.y = time * 0.16;
        globe.rotation.x = Math.sin(time * 0.28) * 0.1;
        core.rotation.y = -time * 0.1;
        ring.rotation.z = time * 0.12;
        frames.forEach(({ mesh, angle }, index) => {
          const orbit = angle + time * 0.22;
          mesh.position.x = Math.cos(orbit) * 1.9;
          mesh.position.z = Math.sin(orbit) * 1.9;
          mesh.position.y = Math.sin(time * 0.85 + index) * 0.32;
          mesh.lookAt(camera.position);
        });
        root.rotation.y += (pointer.x * 0.5 - root.rotation.y) * 0.05;
        root.rotation.x += (-pointer.y * 0.28 - root.rotation.x) * 0.05;
        root.position.y = Math.sin(time * 0.7) * 0.14;
      }
      renderer.render(scene, camera);
    };

    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (width === 0 || height === 0) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      visibility.disconnect();
      window.removeEventListener('pointermove', onMove);
      observer.disconnect();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          if (material instanceof THREE.MeshStandardMaterial && material.map) material.map.dispose();
          material.dispose();
        });
      });
      renderer.dispose();
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={hostRef} className="h-full w-full" aria-hidden />;
}
