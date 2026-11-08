import { useEffect, useRef } from 'react';
import type { GameStore } from '../game/gameState';
import { CafeScene } from '../pixi/CafeScene';

/** Mounts the PixiJS scene into a host div and tears it down on unmount. */
export function CafeCanvas({ store }: { store: GameStore }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = new CafeScene(hostRef.current!, store);
    scene.init().catch((err) => console.error('Failed to start cafe scene', err));
    return () => scene.destroy();
  }, [store]);

  return <div ref={hostRef} className="scene" data-testid="cafe-scene" />;
}
