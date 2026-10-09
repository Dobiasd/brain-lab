// Shareable links: every page and every guided tour has its own address after "#",
// e.g. daiw.de/brain/#coffee opens the coffee tour and #day opens "Your day".
import { tourById } from '../sim/tours';

export type View = 'home' | 'tour' | 'day' | 'chemicals' | 'glossary' | 'graph';

/** Pages with their own address (the question list is the bare address). */
export const pageViews: View[] = ['day', 'chemicals', 'glossary', 'graph'];

export function parseHash(hash: string): { view: View; tourId?: string } {
  const id = decodeURIComponent(hash.replace(/^#\/?/, '')).trim();
  if ((pageViews as string[]).includes(id)) return { view: id as View };
  if (tourById[id]) return { view: 'tour', tourId: id };
  return { view: 'home' };
}

export function hashFor(view: View, tourId: string): string {
  if (view === 'tour') return `#${tourId}`;
  return view === 'home' ? '' : `#${view}`;
}
