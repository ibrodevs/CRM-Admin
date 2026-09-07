import { fUsd } from '../../shared/lib/money.js';
import { finPayable, finDebt } from '../../modules/finance/model.js';
import { DocCard, DocUploadModal, DocCenter, DocCenterPage, FulfillmentRegistry, FulfillmentPage } from '../../modules/documents/index.js';
import { OrderStageBar, FinanceOpCard, FinanceRegistry, FinancePageNew } from '../../modules/finance/index.js';
import { ReceiptEditorPage } from '../../modules/receipts/index.js';

Object.assign(window, {
  OrderStageBar, FinanceOpCard, FinanceRegistry, FinancePageNew,
  DocCard, DocCenter, DocCenterPage, DocUploadModal, ReceiptEditorPage, FulfillmentRegistry, FulfillmentPage,
  fUsd, finPayable, finDebt,
});

