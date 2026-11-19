import { apiPath, apiRequest, queryString } from '../../../shared/api/client.js';
import { list, listAll, get, create, patch, remove } from '../../../shared/api/operations.js';

const hotelContentPath = ({ offerId, serviceId }) => serviceId
  ? `services/${serviceId}/hotel-content/`
  : `service-offers/${offerId}/hotel-content/`;

export const servicesApi = {
  all: (params = {}, signal) => listAll('services/', params, signal),
  hotelRemarks: (offerId, signal) => get(`service-offers/${offerId}/hotel-remarks/`, signal),
  hotelContent: (ids, signal) => get(hotelContentPath(ids), signal),
  hotelRoomsCsv: (ids) => apiRequest(apiPath(`${hotelContentPath(ids)}?export=csv`), { accept: 'text/csv' }),
  hotelCertificate: (id) => create(`services/${id}/hotel-certificate/`, {}),
  list: (params = {}, signal) => list('services/', { page_size: 100, ...params }, signal),
  detail: (id, signal) => get(`services/${id}/`, signal),
  update: (id, body) => patch(`services/${id}/`, body),
  remove: (id) => remove(`services/${id}/`),
  search: (body) => create('service-searches/', body),
  searchV1: (body) => create('services/search/', body),
  searchStatus: (id, signal) => get(`service-searches/${id}/`, signal),
  offers: (id, params = {}, signal) => list(`service-searches/${id}/offers/`, params, signal),
  cancelSearch: (id) => create(`service-searches/${id}/cancel/`, {}),
  compare: (offerIds) => create('service-offers/compare/', { offer_ids: offerIds }),
  revalidate: (id) => create(`service-offers/${id}/revalidate/`, {}),
  fareRules: async (id, signal) => {
    try { return await get(`service-offers/${id}/fare-rules/`, signal); }
    catch (error) {
      if (error.code !== 'PREFLIGHT_REQUIRED' || signal?.aborted) throw error;
      const checked = await create(`service-offers/${id}/revalidate/`, {}, { signal });
      try {
        const payload = await get(`service-offers/${id}/fare-rules/`, signal);
        return { ...payload, offer: checked.offer, revalidation: checked.revalidation };
      } catch (error) { error.offer = checked.offer; throw error; }
    }
  },
  addToOrder: (orderId, body) => create(`orders/${orderId}/services/`, body),
  transition: (id, body) => create(`services/${id}/transition/`, body),
  passengers: (id, signal) => get(`services/${id}/passengers/`, signal),
  updatePassengers: (id, body) => apiRequest(apiPath(`services/${id}/passengers/`), { method: 'PUT', body }),
  manualBook: (id, body) => create(`services/${id}/manual-book/`, body),
  manualIssue: (id, body) => create(`services/${id}/manual-issue/`, body),
  revalidateService: (id, body = {}) => create(`services/${id}/revalidate/`, body),
  book: (id, body = {}) => create(`services/${id}/book/`, body),
  issue: (id, body = {}) => create(`services/${id}/issue/`, body),
  cancel: (id, body = {}) => create(`services/${id}/cancel/`, body),
  extras: (id, signal) => get(`services/${id}/extras/`, signal),
  addExtra: (id, body) => create(`services/${id}/extras/`, body),
  extraCatalog: (params = {}, signal) => list('service-extra-catalog/', { page_size: 100, ...params }, signal),
  createExtraCatalogItem: (body) => create('service-extra-catalog/', body),
  setResponsible: (id, responsible) => apiRequest(apiPath(`services/${id}/responsible/`), { method: 'PUT', body: { responsible } }),
};
