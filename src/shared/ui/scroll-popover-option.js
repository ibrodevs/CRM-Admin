// Keep keyboard navigation inside the list; scrollIntoView also scrolls ancestor
// drawers/the page, moving the anchor and causing the popup to reposition.
export function scrollPopoverOption(panel, option) {
  if (!panel || !option || !panel.contains(option)) return;
  const bounds = panel.getBoundingClientRect();
  const row = option.getBoundingClientRect();
  const top = bounds.top + panel.clientTop;
  const bottom = top + panel.clientHeight;
  if (row.top < top) panel.scrollTop += row.top - top;
  else if (row.bottom > bottom) panel.scrollTop += row.bottom - bottom;
}
