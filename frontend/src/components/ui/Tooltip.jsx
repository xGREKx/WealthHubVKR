import { useState } from 'react';

/**
 * Лёгкий tooltip, показывает подсказку при наведении.
 * Использование:
 *   <Tooltip content={<div>...</div>}>
 *     <element>...</element>
 *   </Tooltip>
 */
export default function Tooltip({ content, children, position = 'top' }) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords]   = useState({ x: 0, y: 0 });

  const handleMove = (e) => {
    setCoords({ x: e.clientX, y: e.clientY });
  };

  return (
    <>
      <span
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onMouseMove={handleMove}
        className="contents"
      >
        {children}
      </span>
      {visible && content && (
        <div
          className="fixed z-[100] pointer-events-none anim-fade-in"
          style={{
            left:  coords.x + 12,
            top:   coords.y + 12,
            transform: 'translateY(-100%)',
          }}
        >
          <div className="bg-ink text-white text-xs px-3 py-2 shadow-xl border border-orange/30 max-w-[260px]">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
