export function popoverPosition(anchor, size, viewport, { align = 'start', gap = 6, padding = 8, placement = 'auto' } = {}) {
  const width = Math.min(size.width, Math.max(0, viewport.width - padding * 2));
  const below = Math.max(0, viewport.height - anchor.bottom - gap - padding);
  const above = Math.max(0, anchor.top - gap - padding);
  const contentHeight = Math.min(size.height, size.contentHeight ?? size.height);
  const desiredLeft = align === 'end' ? anchor.right - width : anchor.left;
  const left = Math.max(padding, Math.min(desiredLeft, viewport.width - width - padding));
  // A calendar is a complete form, not a short option list. When it cannot fit
  // below its field, show it in the viewport instead of crushing its date grid.
  if (placement === 'calendar') {
    const maxHeight = Math.min(size.height, Math.max(0, viewport.height - padding * 2));
    return { left, top: below >= maxHeight ? anchor.bottom + gap : Math.max(padding, (viewport.height - maxHeight) / 2), width, maxHeight };
  }
  // Choose the side from the height budget, not the async result count.
  // Otherwise a loading message can open below and jump above when results arrive.
  const upward = placement !== 'bottom' && size.height > below && above > below;
  const maxHeight = Math.min(size.height, upward ? above : below);
  return {
    left,
    top: upward ? Math.max(padding, anchor.top - gap - Math.min(contentHeight, maxHeight)) : anchor.bottom + gap,
    width, maxHeight,
  };
}
