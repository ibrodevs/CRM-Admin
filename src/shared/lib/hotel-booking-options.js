// Keep guest placement and the operator's text when an offer becomes an order service.
export function hotelBookingOptions(service, participantIds = service.participantIds) {
  const body = {};
  if (Object.hasOwn(service, 'hotelOperatorRequest')) body.hotel_operator_request = service.hotelOperatorRequest;
  if (Object.hasOwn(service, 'hotelRemarks')) body.hotel_remarks = service.hotelRemarks;
  if (Object.hasOwn(service, 'specialRequests')) body.special_requests = service.specialRequests;
  if (service.guestRoomRefs) {
    const ids = participantIds || [];
    if (!ids.length || ids.length !== service.guestRoomRefs.length || new Set(ids).size !== ids.length
      || service.guestRoomRefs.some((ref) => !/^room:\d+$/.test(ref))) {
      throw new Error('Не удалось сопоставить гостей с номерами. Проверьте размещение перед добавлением услуги.');
    }
    body.room_assignments = Object.fromEntries(ids.map((id, index) => [id, service.guestRoomRefs[index]]));
    body.main_guest = ids[0];
  }
  return body;
}
