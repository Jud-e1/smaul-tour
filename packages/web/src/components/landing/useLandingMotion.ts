'use client';

import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import VanillaTilt from 'vanilla-tilt';

type TiltElement = HTMLElement & { vanillaTilt?: { destroy: () => void } };

export function useLandingMotion(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.registerPlugin(ScrollTrigger);

    const context = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((element) => {
        gsap.from(element, {
          y: 32,
          opacity: 0,
          duration: 0.75,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: element,
            start: 'top 90%',
            once: true,
          },
        });
      });
    }, root);

    const tiltNodes = Array.from(root.querySelectorAll<TiltElement>('[data-tilt]'));
    if (tiltNodes.length > 0) {
      VanillaTilt.init(tiltNodes, {
        max: 7,
        speed: 500,
        glare: true,
        'max-glare': 0.12,
        scale: 1.02,
        perspective: 900,
      });
    }

    return () => {
      context.revert();
      tiltNodes.forEach((node) => node.vanillaTilt?.destroy());
    };
  }, [rootRef]);
}
