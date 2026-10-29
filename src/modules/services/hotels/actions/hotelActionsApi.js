import { get, create } from '../../../../shared/api/operations.js';
const path = (serviceId) => `services/${serviceId}/hotel-actions/`;
export const hotelActionsApi = {
  detail: (serviceId, signal) => get(path(serviceId), signal),
  create: (serviceId, body, idempotencyKey) => create(path(serviceId), body, { idempotencyKey }),
  confirm: (serviceId, operation, body) => create(`${path(serviceId)}${operation.id}/confirm/`, { version: operation.version, ...body }, { idempotencyKey: `hotel-confirm-${operation.id}` }),
  resolve: (serviceId, operation, status, note) => create(`${path(serviceId)}${operation.id}/resolve/`, { version: operation.version, status, note }),
};
