// Local calendar dates only: the month grids must not shift with UTC offsets.
export function calendarMonthCells(year, month) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Monday first.
  const count = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: 42 }, (_, index) => {
    const day = index - offset + 1;
    return day >= 1 && day <= count ? new Date(year, month, day) : null;
  });
}

export function calendarMonths(year, month, count = 2) {
  return Array.from({ length: count }, (_, index) => {
    const start = new Date(year, month + index, 1);
    return {
      year: start.getFullYear(), month: start.getMonth(),
      cells: calendarMonthCells(start.getFullYear(), start.getMonth()),
    };
  });
}
