import { createContext, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { PanelLeftOpen } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "../ui/sheet";

/** Below this width the sub-rail (a view's table or concept list) moves into a drawer. Matches styles.css. */
const NARROW_QUERY = "(max-width: 960px)";

function subscribeNarrow(onChange: () => void): () => void {
  const mql = window.matchMedia(NARROW_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function isNarrow(): boolean {
  return window.matchMedia(NARROW_QUERY).matches;
}

type SubRailState = {
  narrow: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SubRailContext = createContext<SubRailState | null>(null);

/** Holds whether the window is narrow and whether the list's drawer is open, for `SubRail` and `SubRailTrigger`. */
export function SubRailProvider({ children }: { children: ReactNode }) {
  const narrow = useSyncExternalStore(subscribeNarrow, isNarrow, () => false);
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ narrow, open: narrow && open, setOpen }), [narrow, open]);
  return <SubRailContext.Provider value={value}>{children}</SubRailContext.Provider>;
}

export function useSubRail(): SubRailState {
  const ctx = useContext(SubRailContext);
  if (!ctx) throw new Error("useSubRail must be used inside SubRailProvider");
  return ctx;
}

/**
 * A view's list column. On a wide window it sits beside the detail pane; on a narrow one it opens
 * as a drawer from `SubRailTrigger`, so the list stays reachable (#954).
 */
export function SubRail({ title, children, style }: { title: string; children: ReactNode; style?: React.CSSProperties }) {
  const { narrow, open, setOpen } = useSubRail();
  if (!narrow) {
    return (
      <div className="sub-rail" style={style}>
        {children}
      </div>
    );
  }
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="sub-rail-sheet" aria-describedby={undefined}>
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <div className="sub-rail">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

/** The header button that opens the list's drawer. Renders nothing on a wide window, where the list is visible. */
export function SubRailTrigger({ label }: { label: string }) {
  const { narrow, setOpen } = useSubRail();
  if (!narrow) return null;
  return (
    <button type="button" className="btn sm" onClick={() => setOpen(true)} aria-haspopup="dialog">
      <PanelLeftOpen size={14} /> {label}
    </button>
  );
}
