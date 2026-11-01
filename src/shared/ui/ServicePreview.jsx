import { serviceSummary, serviceTechnicalLabel } from '../lib/service-presentation.js';

// Span-based markup also works inside calendar summaries and agenda buttons.
export function ServicePreview({ service, className = '', showSupplier = true }) {
  const summary = serviceSummary(service);
  const technical = serviceTechnicalLabel(service);
  const supplier = service.supplier_name || (typeof service.supplier === 'string' ? service.supplier : service.supplier?.name);
  return <span className={'service-preview ' + className}>
    <strong className="service-preview-title">{summary.title}</strong>
    <span className="service-preview-dates">{summary.dates}</span>
    {(technical || (showSupplier && supplier)) && <span className="service-preview-source">{[showSupplier && supplier, technical].filter(Boolean).join(' · ')}</span>}
  </span>;
}
