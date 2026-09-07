import { readFile as read } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { relative } from 'node:path';

// Existing source contracts span mechanically extracted files. Assertions remain unchanged.
const root = fileURLToPath(new URL('../../', import.meta.url));
const bundles = {
  "app/globals.css": ["src/styles/tokens.css", "src/styles/base.css", "src/styles/layout.css", "src/styles/components.css"],
  "src/shared/ui/index.jsx": [
    "src/shared/ui/Toast.jsx",
    "src/shared/ui/Button.jsx",
    "src/shared/ui/Pill.jsx",
    "src/shared/ui/plural.js",
    "src/shared/ui/Toggle.jsx",
    "src/shared/ui/Checkbox.jsx",
    "src/shared/ui/Radio.jsx",
    "src/shared/ui/Field.jsx",
    "src/shared/ui/Input.jsx",
    "src/shared/ui/Select.jsx",
    "src/shared/ui/SearchBox.jsx",
    "src/shared/ui/Combobox.jsx",
    "src/shared/ui/TimePickers.jsx",
    "src/shared/ui/Avatar.jsx",
    "src/shared/ui/Overlays.jsx",
    "src/shared/ui/Tabs.jsx",
    "src/shared/ui/FilterChip.jsx",
    "src/shared/ui/Pagination.jsx",
    "src/shared/ui/Table.jsx",
    "src/shared/ui/EmptyState.jsx",
    "src/shared/ui/ActionMenu.jsx",
    "src/shared/ui/DateFields.jsx"
  ],
  "src/modules/clients/ui/ClientsPage.jsx": [
    "src/modules/clients/model/people-helpers.js",
    "src/modules/companies/model/people-helpers.js",
    "src/modules/clients/ui/ClientsPage.jsx",
    "src/modules/companies/ui/CompaniesPage.jsx"
  ],
  "src/modules/receipts/ui/ReceiptEditorPage.jsx": [
    "src/shared/lib/money.js",
    "src/modules/finance/model/operations.js",
    "src/modules/finance/ui/FinanceRegistry.jsx",
    "src/modules/documents/model/supplier-pdf.js",
    "src/modules/documents/ui/DocumentsPage.jsx",
    "src/modules/receipts/ui/ReceiptEditorPage.jsx",
    "src/modules/documents/ui/FulfillmentPage.jsx"
  ],
  "src/modules/clients/ui/UnifiedForms.jsx": [
    "src/shared/ui/UnifiedDateField.jsx",
    "src/modules/clients/ui/UnifiedForms.jsx"
  ],
  "src/legacy/adapters/ui-adapters.js": [
    "src/shared/auth/user.mapper.js",
    "src/shared/lib/adapter-dates.js",
    "src/shared/constants/service-kind.js",
    "src/modules/orders/model/orders.mapper.js",
    "src/modules/suppliers/model/suppliers.mapper.js",
    "src/modules/notifications/model/notifications.mapper.js",
    "src/modules/chats/model/chats.mapper.js",
    "src/modules/clients/model/clients.mapper.js",
    "src/modules/companies/model/companies.mapper.js"
  ],
  "src/modules/clients/api/crmApi.js": [
    "src/modules/clients/api/clientsApi.js",
    "src/modules/companies/api/companiesApi.js",
    "src/modules/finance/api/serviceFeeApi.js"
  ]
};

export async function readFile(file, options) {
  const key = relative(root, file instanceof URL ? fileURLToPath(file) : file);
  const parts = bundles[key];
  if (!parts) return read(file, options);
  return (await Promise.all(parts.map(part => read(new URL('../../' + part, import.meta.url), options)))).join('\n');
}
