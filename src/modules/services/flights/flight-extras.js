// The current flight adapter exposes fares/rules, but no ancillary quote or
// purchase endpoint. Never infer purchasable extras from demo catalogues or
// from baggage already included in a fare.
export function flightExtrasStatus(offer) {
  const fare = offer?.backendOffer?.fare || {};
  const baggage = typeof fare.baggage === 'string' ? fare.baggage.trim() : '';
  const noBaggage = /^(0PC|0KG|0)$/i.test(baggage);
  const baggageLabel = !baggage ? 'Норма багажа не указана в предложении' : noBaggage ? 'Багаж не включён в тариф' : `Багаж по тарифу: ${baggage}`;
  return {
    available: false,
    title: 'Выбор допуслуг сейчас недоступен',
    description: 'Для этого предложения нет вариантов допуслуг, доступных к заказу в CRM. Стоимость и возможность оформления нужно уточнить отдельно.',
    baggageLabel,
    categories: [
      { key: 'seats', icon: 'idcard', label: 'Места', description: 'Схема салона и цены на выбор места недоступны.' },
      { key: 'baggage', icon: 'luggage', label: 'Дополнительный багаж', description: 'Нет предложений на покупку багажа сверх выбранного тарифа.' },
      { key: 'meal', icon: 'utensils', label: 'Питание', description: 'Варианты дополнительного питания и их стоимость недоступны.' },
      { key: 'insurance', icon: 'shield', label: 'Страхование', description: 'Страховые предложения для этого перелёта не загружены.' },
      { key: 'comfort', icon: 'star', label: 'Комфорт и сервис', description: 'Нет предложений на дополнительные услуги для этого перелёта.' },
    ],
  };
}
