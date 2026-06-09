interface ScrollButtonsProps {
  showTop: boolean;
  showBottom: boolean;
  onTop: () => void;
  onBottom: () => void;
  /** distance from the right window edge in px (to clear the TOC panel) */
  rightPx?: number;
}

const BTN =
  "flex cursor-pointer items-center gap-1.5 rounded-full bg-zinc-200/90 px-3.5 py-2 text-xs font-medium text-zinc-900 shadow-lg backdrop-blur-sm transition-all hover:bg-zinc-100";

function ScrollButtons({ showTop, showBottom, onTop, onBottom, rightPx = 24 }: ScrollButtonsProps) {
  if (!showTop && !showBottom) {
    return null;
  }
  return (
    <div
      className="fixed bottom-4 z-20 flex flex-col items-end gap-2"
      style={{ right: rightPx }}
    >
      {showTop && (
        <button onClick={onTop} className={BTN} title="Scroll to top">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          <span>Top</span>
        </button>
      )}
      {showBottom && (
        <button onClick={onBottom} className={BTN} title="Scroll to latest">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
          <span>Latest</span>
        </button>
      )}
    </div>
  );
}

export default ScrollButtons;
