import { apiPath, apiRequest, queryString } from '../../../shared/api/client.js';
import { list, get, create, patch, remove } from '../../../shared/api/operations.js';

export const serviceFeeApi = {
  // Сервисный сбор считает backend по договору контрагента: фронт передаёт
  // только контекст (контрагент, вид услуги, база поставщика).
  resolveServiceFee: (body, signal) => create('service-fee/resolve/', body, { idempotent: false, signal }),
};
