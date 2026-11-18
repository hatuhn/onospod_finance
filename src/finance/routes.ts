export const base = (process.env.NEXT_PUBLIC_BASE_PATH || '') + '/admin/finance-demo';
export const navigation = {
  financialOperations: {
    overview: 'financeOverview', orders: 'orderProfit', 'order-invoices': 'orderInvoices', customers: 'customersFinance',
    balances: 'customerBalances', wallet: 'walletTopup', transactions: 'transactions', reports: 'monthlyReports',
  },
  debtGroup: {debit: 'debitReceivables', 'debt-orders': 'debtByOrder', invoices: 'monthlyInvoices', payments: 'paymentRecords'},
  manufacturing: {'production-sku': 'productionSkuDashboard', 'production-invoices': 'productionInvoices', 'production-expenses': 'productionExpenses', shipping: 'shippingTax'},
} as const;
export const pages = {...navigation.financialOperations, ...navigation.debtGroup, ...navigation.manufacturing};
export type Screen = keyof typeof pages;
