import { CurrencyCode, Expense, Trip, DebtSettlement, ExpenseCategory } from '../types';
import { CURRENCIES } from '../data/currencies';

export function formatMoney(amount: number, currency: CurrencyCode = 'USD'): string {
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'CLP' || currency === 'JPY' || currency === 'COP' ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const sym = CURRENCIES[currency]?.symbol || '$';
    return `${sym} ${amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

/**
 * Converts an expense amount to the user's home currency.
 * If expense currency equals trip currency, we use the trip's exchange rate (1 dest = X home).
 * If expense currency equals home currency, rate is 1.
 * Otherwise, uses cross-rates based on USD approximations.
 */
export function convertToHomeCurrency(
  amount: number,
  expenseCurrency: CurrencyCode,
  trip: Trip,
  homeCurrency: CurrencyCode
): number {
  if (expenseCurrency === homeCurrency) {
    return amount;
  }
  if (expenseCurrency === trip.currency) {
    return amount * trip.exchangeRate;
  }
  // Cross conversion using approx USD table
  const fromRate = CURRENCIES[expenseCurrency]?.approxRateToUSD || 1;
  const toRate = CURRENCIES[homeCurrency]?.approxRateToUSD || 1;
  return (amount * fromRate) / toRate;
}

/**
 * Calculates net balances per person and finds the minimal set of debt settlements.
 */
export function calculateSplitDebts(
  expenses: Expense[],
  trip: Trip,
  homeCurrency: CurrencyCode
): { settlements: DebtSettlement[]; balances: Record<string, number>; totalSpent: number } {
  const balances: Record<string, number> = {};
  let totalSpent = 0;

  // Initialize members from trip
  trip.members.forEach(member => {
    balances[member] = 0;
  });

  expenses.forEach(expense => {
    const costInHome = convertToHomeCurrency(expense.amount, expense.currency, trip, homeCurrency);
    totalSpent += costInHome;

    const payer = expense.paidBy || 'Yo';
    const splitWith = expense.splitBetween && expense.splitBetween.length > 0 
      ? expense.splitBetween 
      : ['Yo'];

    // Ensure participants exist in balances map
    if (balances[payer] === undefined) balances[payer] = 0;
    splitWith.forEach(person => {
      if (balances[person] === undefined) balances[person] = 0;
    });

    // Payer paid the full amount (+ credit)
    balances[payer] += costInHome;

    // Each participant owes their fraction (- debit)
    const share = costInHome / splitWith.length;
    splitWith.forEach(person => {
      balances[person] -= share;
    });
  });

  // Split into debtors and creditors
  const debtors: { person: string; amount: number }[] = [];
  const creditors: { person: string; amount: number }[] = [];

  Object.entries(balances).forEach(([person, balance]) => {
    const rounded = Math.round(balance * 100) / 100;
    if (rounded < -0.01) {
      debtors.push({ person, amount: -rounded });
    } else if (rounded > 0.01) {
      creditors.push({ person, amount: rounded });
    }
  });

  // Settle with two-pointer greedy algorithm
  const settlements: DebtSettlement[] = [];
  let d = 0;
  let c = 0;

  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];
    const settleAmount = Math.min(debtor.amount, creditor.amount);

    if (settleAmount > 0.01) {
      settlements.push({
        from: debtor.person,
        to: creditor.person,
        amount: Math.round(settleAmount * 100) / 100,
      });
    }

    debtor.amount -= settleAmount;
    creditor.amount -= settleAmount;

    if (debtor.amount < 0.01) d++;
    if (creditor.amount < 0.01) c++;
  }

  return { settlements, balances, totalSpent };
}

/**
 * Calculates expenses grouped by category
 */
export function getCategoryBreakdown(
  expenses: Expense[],
  trip: Trip,
  homeCurrency: CurrencyCode
): Record<ExpenseCategory, number> {
  const breakdown: Record<string, number> = {
    Alojamiento: 0,
    Comida: 0,
    Transporte: 0,
    Vuelos: 0,
    Actividades: 0,
    Compras: 0,
    Seguro: 0,
    Imprevistos: 0,
  };

  expenses.forEach(expense => {
    const cost = convertToHomeCurrency(expense.amount, expense.currency, trip, homeCurrency);
    breakdown[expense.category] = (breakdown[expense.category] || 0) + cost;
  });

  return breakdown as Record<ExpenseCategory, number>;
}

/**
 * Calculates daily spending aggregation
 */
export function getDailySpending(
  expenses: Expense[],
  trip: Trip,
  homeCurrency: CurrencyCode
): { date: string; formattedDate: string; amount: number }[] {
  const map: Record<string, number> = {};

  expenses.forEach(expense => {
    const cost = convertToHomeCurrency(expense.amount, expense.currency, trip, homeCurrency);
    map[expense.date] = (map[expense.date] || 0) + cost;
  });

  const sortedDates = Object.keys(map).sort();
  return sortedDates.map(date => {
    const d = new Date(date + 'T00:00:00');
    const formattedDate = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    return {
      date,
      formattedDate,
      amount: Math.round(map[date] * 100) / 100,
    };
  });
}
