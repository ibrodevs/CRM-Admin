export async function waitForFlightProviderJob(jobId, serviceId, { readJob, readService, delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), attempts = 120 }) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const job = await readJob(jobId);
    if (job.status === 'succeeded') return { job, service: await readService(serviceId) };
    if (['failed', 'dead', 'cancelled'].includes(job.status)) throw new Error(job.error_message || 'Операция у поставщика не завершена');
    await delay(1500);
  }
  throw new Error('Поставщик ещё обрабатывает запрос. Проверьте статус позднее.');
}

export function flightTicketNumbers(service, passenger) {
  return (service.tickets || []).filter((ticket) => String(ticket.passenger || '') === String(passenger.id)).map((ticket) => ticket.ticket_number).filter(Boolean);
}
