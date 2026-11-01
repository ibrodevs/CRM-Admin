export function popoverPosition(anchor, size, viewport, { align = 'start', gap = 6, padding = 8 } = {}) {
  const width = Math.min(size.width, Math.max(0, viewport.width - padding * 2));
  const below = Math.max(0, viewport.height - anchor.bottom - gap - padding);
  const above = Math.max(0, anchor.top - gap - padding);
  const contentHeight = Math.min(size.height, size.contentHeight ?? size.height);
  const upward = contentHeight > below && above > below;
  const maxHeight = Math.min(size.height, upward ? above : below);
  const desiredLeft = align === 'end' ? anchor.right - width : anchor.left;
  return {
    left: Math.max(padding, Math.min(desiredLeft, viewport.width - width - padding)),
    top: upward ? Math.max(padding, anchor.top - gap - Math.min(contentHeight, maxHeight)) : anchor.bottom + gap,
    width, maxHeight,
  };
}
