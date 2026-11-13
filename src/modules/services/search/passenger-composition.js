export function passengerComposition(form) {
  return form.passenger_composition || { adults: Math.max(0, Number(form.pax ?? 1) || 0), children: [] };
}
export const passengerTotal = (value) => value.adults + value.children.length;
export function passengerCriteria(form, kind) {
  if (!form.passenger_composition) return {};
  const value = passengerComposition(form);
  if (!Number.isInteger(value.adults) || value.adults < 0 || !Array.isArray(value.children)) throw new Error('Проверьте состав пассажиров');
  if (!passengerTotal(value)) throw new Error('Укажите хотя бы одного пассажира');
  const maxAge = kind === 'transfer' ? 11 : 17;
  if (value.children.some((child) => !Number.isInteger(child.age) || child.age < 0 || child.age > maxAge)) throw new Error('Укажите возраст каждого ребёнка на дату поездки');
  if (kind === 'rail' && value.children.some((child) => child.age >= 5 && !child.with_seat)) throw new Error('Для ребёнка от 5 лет выберите отдельное место');
  if (kind === 'rail' && value.children.filter((child) => child.with_seat === false).length > value.adults) throw new Error('На ребёнка без места нужен сопровождающий взрослый');
  return {
    passenger_composition: { adults: value.adults, children: value.children.map((child) => ({ age: child.age, with_seat: kind === 'transfer' || child.with_seat !== false })) },
    passengers: passengerTotal(value),
    seats_required: value.adults + value.children.filter((child) => kind === 'transfer' || child.with_seat !== false).length,
  };
}
export function transferChildSeats(form) {
  const children = passengerComposition(form).children;
  return children.filter((child) => Number.isInteger(child.age)).map((child) => child.age < 1 ? 'infant_seat' : child.age < 3 ? 'seat' : 'booster');
}
export function railPassengerDrafts(form) {
  const value = passengerComposition(form);
  return [...Array.from({ length: value.adults }, (_, index) => ({ name: `Взрослый ${index + 1}`, role: 'Взрослый', with_seat: true })), ...value.children.map((child, index) => ({ name: `Ребёнок ${index + 1}`, role: `Ребёнок · ${child.age} лет`, ...child }))];
}
