

function finPayable(op) { return op.tariff + op.taxes + op.fee + op.penalty - op.discount; }

function finDebt(op) { return Math.max(0, finPayable(op) - op.paid); }

export { finPayable, finDebt };
