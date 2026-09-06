import { ORDERS } from '../../../legacy/data/index';

function ordersForCompany(company, orders = ORDERS) {
  return orders.filter((order) => (
    (company?.id != null && order.client_company != null && String(order.client_company) === String(company.id))
    || (company?.name && order.client === company.name)
  ));
}

const toUiDepartment = (department) => ({
  ...department,
  id: department.id,
  name: department.name,
  policy: department.travel_policy || '',
});

const toUiEmployee = (employee) => {
  const person = employee.person_detail || {};
  const name = person.full_name || [person.surname, person.given_name, person.middle_name].filter(Boolean).join(' ');
  return {
    ...employee,
    id: employee.id,
    personId: employee.person,
    name: name || 'Сотрудник',
    position: employee.position || '',
    dept: employee.department || '',
    phone: person.phone || '—',
    email: person.email || '',
    doc: '—',
    dob: person.birth_date || '—',
    inPolicy: true,
    source: employee,
    personSource: person,
  };
};

export { ordersForCompany, toUiDepartment, toUiEmployee };
