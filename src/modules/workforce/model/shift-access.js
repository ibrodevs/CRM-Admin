// Shift hours and fees belong exclusively to the operator role.
export function canUseShiftControl(role) {
  return role === 'Оператор' || role === 'operator';
}
