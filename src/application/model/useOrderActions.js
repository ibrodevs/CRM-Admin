export function useOrderActions({ workspace, toast, openOrder }) {
  const addOrder = async (draft) => {
    try {
      const created = await workspace.createOrder(draft);
      toast(`Заказ № ${created.no} сохранён в backend`, 'ok');
      return created;
    } catch (error) {
      toast(error.message || 'Не удалось сохранить заказ', 'err');
      throw error;
    }
  };

  const createOrderFromPicker = async (draft) => {
    const created = await addOrder(draft);
    openOrder(created);
    return created;
  };
  // Заказ по маршрут-квитанциям: клиента выбирает оператор в окне импорта,
  // маршрут, даты и участники уже распознаны в бланках. Шага поиска услуг
  // здесь нет — услуги создаются самими квитанциями.
  const createReceiptOrder = async (draft) => {
    try {
      let clientPersonId = draft.clientPersonId || null;
      if (draft.clientMode === 'new') {
        const client = await workspace.createPersonClient({
          source: draft.person,
          client_type: 'individual',
        });
        clientPersonId = client.id;
      }
      const plan = draft.plan || {};
      const created = await workspace.createOrder({
        request_type: draft.clientMode === 'company' ? 'Корпоративная' : 'Индивидуальная',
        client_person: draft.clientMode === 'company' ? null : clientPersonId,
        client_company: draft.clientMode === 'company' ? draft.companyId : null,
        base_currency: plan.currency || 'RUB',
        planned_start: plan.plannedStart || null,
        planned_end: plan.plannedEnd || null,
        purpose: plan.serviceKinds?.length ? `Заказ по бланкам: ${plan.serviceKinds.join(', ')}` : 'Заказ по бланкам поставщика',
        route: plan.points?.length >= 2 ? { kind: plan.kind, points: plan.points } : null,
        participants: (draft.passengers || []).map((passenger, index) => ({
          guest_snapshot: {
            full_name: passenger.name,
            birth_date: passenger.dob || '',
            document: passenger.document || '',
            ticket_no: passenger.ticketNo || '',
          },
          role: 'passenger',
          is_contact: index === 0,
        })),
        receipt_services: plan.receiptServices || [],
      });
      toast(`Заказ № ${created.no} создан по бланкам`, 'ok');
      return created;
    } catch (error) {
      toast(error.message || 'Не удалось создать заказ по бланкам', 'err');
      return null;
    }
  };

  return { addOrder, createOrderFromPicker, createReceiptOrder };
}
