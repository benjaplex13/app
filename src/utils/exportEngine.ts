import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Trip, Expense, User, ExpenseCategory } from '../types';
import { CURRENCIES } from '../data/currencies';
import { formatMoney, convertToHomeCurrency, calculateSplitDebts, getCategoryBreakdown } from './finance';
import { api } from './api';

export interface ExportTripPdfOptions {
  trip: Trip;
  expenses: Expense[];
  user: User;
  onProgress?: (step: string) => void;
}

/**
 * Generates an executive AI summary for the given trip using the Gemini backend endpoint.
 */
export async function fetchAiTripSummary(trip: Trip, expenses: Expense[]): Promise<string> {
  try {
    const res = await api.getTripAiSummary(trip.id, trip, expenses);
    if (res?.summary) {
      return res.summary;
    }
  } catch (err) {
    console.warn('Could not fetch AI trip summary from server, generating algorithmic fallback', err);
  }

  // Local fallback summary
  const totalTripCurr = expenses.reduce((acc, e) => {
    const rate = e.currency === trip.currency ? 1 : (trip.exchangeRate > 0 ? (1 / trip.exchangeRate) : 1);
    return acc + (e.amount * rate);
  }, 0);
  const budgetPct = trip.budget > 0 ? Math.round((totalTripCurr / trip.budget) * 100) : 0;
  
  const categoryMap: Record<string, number> = {};
  expenses.forEach(e => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
  });
  let topCat = 'General';
  let topAmt = 0;
  Object.entries(categoryMap).forEach(([k, v]) => {
    if (v > topAmt) {
      topAmt = v;
      topCat = k;
    }
  });

  return `Durante tu estadía en ${trip.destination || trip.name}, registraste un gasto total de ${formatMoney(totalTripCurr, trip.currency)} (${budgetPct}% de tu presupuesto fijado de ${formatMoney(trip.budget, trip.currency)}). Tu categoría principal de consumo fue ${topCat} con ${formatMoney(topAmt, trip.currency)}.`;
}

/**
 * Builds and downloads a professional, vector-clean PDF Report of the trip.
 */
export async function exportTripToProfessionalPDF({
  trip,
  expenses,
  user,
  onProgress,
}: ExportTripPdfOptions): Promise<void> {
  onProgress?.('Generando análisis financiero con IA...');
  const aiSummary = await fetchAiTripSummary(trip, expenses);

  onProgress?.('Construyendo documento PDF...');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = 14;

  // Color Palette (High contrast, refined navy & azure)
  const primaryNavy = [11, 19, 43]; // #0b132b
  const accentBlue = [37, 99, 235]; // #2563eb
  const textDark = [15, 23, 42]; // #0f172a
  const textMuted = [100, 116, 139]; // #64748b
  const cardBg = [248, 250, 252]; // #f8fafc
  const successGreen = [22, 101, 52]; // #166534

  // Helper for text wrapping & auto spacing
  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 18) {
      doc.addPage();
      currentY = 16;
    }
  };

  // 1. TOP HEADER BANNER
  doc.setFillColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 28, 3, 3, 'F');

  // Brand Name & Tagline
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('RUMBIO', margin + 6, currentY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(147, 197, 253);
  doc.text('TRAVEL FINANCE & EXPENSE INTELLIGENCE', margin + 6, currentY + 17);

  // Badge on the right
  doc.setFillColor(30, 58, 138);
  doc.roundedRect(pageWidth - margin - 48, currentY + 6, 42, 16, 2, 2, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('INFORME EJECUTIVO', pageWidth - margin - 44, currentY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(191, 219, 254);
  doc.text(`Emitido: ${new Date().toLocaleDateString('es-ES')}`, pageWidth - margin - 44, currentY + 18);

  currentY += 34;

  // 2. TRIP TITLE & METADATA
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(trip.name, margin, currentY);

  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  const dateRange = `${trip.startDate || 'Inicio sin definir'} — ${trip.endDate || 'Fin sin definir'}`;
  const travelersList = trip.members && trip.members.length > 0 ? trip.members.join(', ') : 'Viajero individual';
  doc.text(`Destino: ${trip.destination || trip.name}   |   Fechas: ${dateRange}   |   Viajeros: ${travelersList}`, margin, currentY);

  currentY += 7;

  // 3. AI EXECUTIVE SUMMARY CALLOUT BOX
  doc.setFillColor(239, 246, 255); // light blue #eff6ff
  doc.setDrawColor(191, 219, 254);
  doc.setLineWidth(0.5);
  
  const summaryLines = doc.splitTextToSize(aiSummary, pageWidth - margin * 2 - 12);
  const boxHeight = 12 + summaryLines.length * 4.2;

  doc.roundedRect(margin, currentY, pageWidth - margin * 2, boxHeight, 2.5, 2.5, 'FD');

  // AI Badge
  doc.setFillColor(accentBlue[0], accentBlue[1], accentBlue[2]);
  doc.roundedRect(margin + 4, currentY + 4, 38, 5.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text('RESUMEN INTELIGENTE IA', margin + 6, currentY + 7.8);

  // Summary Text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 58, 138);
  doc.text(summaryLines, margin + 4, currentY + 13.5);

  currentY += boxHeight + 7;

  // 4. FINANCIAL KPI CARDS
  const totalSpentInTripCurrency = expenses.reduce((acc, e) => {
    if (e.currency === trip.currency) return acc + e.amount;
    const rate = trip.exchangeRate > 0 ? (1 / trip.exchangeRate) : 1;
    return acc + (e.amount * rate);
  }, 0);

  const totalSpentInHome = expenses.reduce((acc, e) => {
    return acc + convertToHomeCurrency(e.amount, e.currency, trip, user.homeCurrency);
  }, 0);

  const remainingBudget = trip.budget - totalSpentInTripCurrency;
  const budgetUsagePercent = trip.budget > 0 ? (totalSpentInTripCurrency / trip.budget) * 100 : 0;

  const cardWidth = (pageWidth - margin * 2 - 9) / 4;
  const cardHeight = 18;

  const kpis = [
    {
      title: 'PRESUPUESTO',
      val: formatMoney(trip.budget, trip.currency),
      sub: `Moneda: ${trip.currency}`,
      color: [15, 23, 42],
    },
    {
      title: 'GASTO TOTAL',
      val: formatMoney(totalSpentInTripCurrency, trip.currency),
      sub: `${budgetUsagePercent.toFixed(1)}% del límite`,
      color: budgetUsagePercent > 100 ? [220, 38, 38] : [37, 99, 235],
    },
    {
      title: remainingBudget >= 0 ? 'DISPONIBLE' : 'SOBREGIRO',
      val: formatMoney(Math.abs(remainingBudget), trip.currency),
      sub: remainingBudget >= 0 ? 'Dentro del plan' : 'Superó presupuesto',
      color: remainingBudget >= 0 ? successGreen : [220, 38, 38],
    },
    {
      title: 'EQUIVALENTE BASE',
      val: formatMoney(totalSpentInHome, user.homeCurrency),
      sub: `Moneda: ${user.homeCurrency}`,
      color: [15, 23, 42],
    },
  ];

  kpis.forEach((kpi, idx) => {
    const cardX = margin + idx * (cardWidth + 3);
    doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(kpi.title, cardX + 3, currentY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.val, cardX + 3, currentY + 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(kpi.sub, cardX + 3, currentY + 15);
  });

  currentY += cardHeight + 8;

  // 5. CATEGORY BREAKDOWN TABLE
  const categoryMapData = getCategoryBreakdown(expenses, trip, user.homeCurrency);
  const totalHomeCategorySpent = Object.values(categoryMapData).reduce((a, b) => a + b, 0) || 1;
  
  const categoryStats = (Object.entries(categoryMapData) as [ExpenseCategory, number][])
    .filter(([_, total]) => total > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, total]) => ({
      category: cat,
      total,
      percentage: (total / totalHomeCategorySpent) * 100,
      count: expenses.filter(e => e.category === cat).length,
    }));
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Distribución de Gastos por Categoría', margin, currentY);
  currentY += 3;

  const categoryTableRows = categoryStats.map((c) => [
    c.category,
    formatMoney(c.total, user.homeCurrency),
    `${c.percentage.toFixed(1)}%`,
    `${c.count} ${c.count === 1 ? 'gasto' : 'gastos'}`,
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Categoría', `Monto (${user.homeCurrency})`, 'Porcentaje', 'Registros']],
    body: categoryTableRows.length > 0 ? categoryTableRows : [['Sin gastos registrados', '-', '-', '-']],
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 2.2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // @ts-ignore
  currentY = (doc as any).lastAutoTable.finalY + 8;
  checkPageBreak(30);

  // 6. ITEMIZED EXPENSES TABLE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Detalle Cronológico de Transacciones', margin, currentY);
  currentY += 3;

  const sortedExpenses = [...expenses].sort((a, b) => (b.date > a.date ? 1 : -1));
  const expenseRows = sortedExpenses.map((e) => {
    const homeVal = convertToHomeCurrency(e.amount, e.currency, trip, user.homeCurrency);
    return [
      e.date || '-',
      e.title || 'Sin concepto',
      e.category || 'Varios',
      e.paidBy || user.name,
      formatMoney(e.amount, e.currency),
      formatMoney(homeVal, user.homeCurrency),
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Fecha', 'Concepto / Descripción', 'Categoría', 'Pagador', 'Monto Original', `Equiv. (${user.homeCurrency})`]],
    body: expenseRows.length > 0 ? expenseRows : [['-', 'No se han ingresado gastos para este viaje', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 2.2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // @ts-ignore
  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 7. GROUP BALANCES (If multiple travelers)
  if (trip.members && trip.members.length > 1) {
    checkPageBreak(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text('Liquidación y Balances Grupales', margin, currentY);
    currentY += 3;

    const debts = calculateSplitDebts(expenses, trip, user.homeCurrency);
    const debtRows = debts.settlements.map((d) => [
      d.from,
      'debe transferir a',
      d.to,
      formatMoney(d.amount, user.homeCurrency),
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['Deudor', '', 'Acreedor', `Monto a Transferir (${user.homeCurrency})`]],
      body: debtRows.length > 0 ? debtRows : [['Cuentas al día', '-', 'Todos han aportado por igual', formatMoney(0, user.homeCurrency)]],
      theme: 'grid',
      headStyles: {
        fillColor: [71, 85, 105],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
        cellPadding: 2.5,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [30, 41, 59],
        cellPadding: 2.2,
      },
    });
  }

  // 8. ADD PAGE NUMBERS & PROFESSIONAL FOOTER TO ALL PAGES
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('Rumbio Travel Finance — Plataforma de Gestión de Gastos y Viajes Inteligente', margin, pageHeight - 7);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin - 18, pageHeight - 7);
  }

  // Trigger download
  const cleanName = (trip.destination || trip.name).replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Rumbio_Reporte_${cleanName}_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Builds a structured, rich, and highly readable JSON export of user data.
 */
export function generateStructuredJSON(
  user: User,
  trips: Trip[],
  allExpenses: Expense[]
): string {
  const homeCurrency = user.homeCurrency;

  const structuredTrips = trips.map((trip) => {
    const tripExpenses = allExpenses.filter((e) => e.tripId === trip.id);
    
    // Total spent in trip currency
    const totalSpentInTripCurrency = tripExpenses.reduce((acc, e) => {
      if (e.currency === trip.currency) return acc + e.amount;
      const rate = trip.exchangeRate > 0 ? (1 / trip.exchangeRate) : 1;
      return acc + (e.amount * rate);
    }, 0);

    // Total spent in user base home currency
    const totalSpentInHomeCurrency = tripExpenses.reduce((acc, e) => {
      return acc + convertToHomeCurrency(e.amount, e.currency, trip, homeCurrency);
    }, 0);

    const categoryMapData = getCategoryBreakdown(tripExpenses, trip, homeCurrency);
    const totalHomeCat = Object.values(categoryMapData).reduce((a, b) => a + b, 0) || 1;
    const categoryDistribution = (Object.entries(categoryMapData) as [ExpenseCategory, number][])
      .map(([cat, total]) => ({
        category: cat,
        totalInHomeCurrency: Number(total.toFixed(2)),
        percentageOfTripTotal: Number(((total / totalHomeCat) * 100).toFixed(2)),
        transactionCount: tripExpenses.filter(e => e.category === cat).length,
      }));

    const splitData = (trip.members && trip.members.length > 1)
      ? calculateSplitDebts(tripExpenses, trip, homeCurrency)
      : { settlements: [], balances: {}, totalSpent: 0 };

    return {
      tripId: trip.id,
      name: trip.name,
      destination: trip.destination,
      period: {
        startDate: trip.startDate,
        endDate: trip.endDate,
      },
      budget: {
        plannedAmount: trip.budget,
        currency: trip.currency,
        exchangeRateToHomeCurrency: trip.exchangeRate,
        homeCurrencyEquivalent: convertToHomeCurrency(trip.budget, trip.currency, trip, homeCurrency),
      },
      financialSummary: {
        totalSpentInTripCurrency: Number(totalSpentInTripCurrency.toFixed(2)),
        totalSpentInHomeCurrency: Number(totalSpentInHomeCurrency.toFixed(2)),
        remainingBudget: Number((trip.budget - totalSpentInTripCurrency).toFixed(2)),
        budgetUtilizationPercentage: trip.budget > 0 ? Number(((totalSpentInTripCurrency / trip.budget) * 100).toFixed(2)) : 0,
        totalTransactionsCount: tripExpenses.length,
      },
      members: trip.members || [user.name],
      debtSettlementMatrix: splitData.settlements,
      balancesByMember: splitData.balances,
      categoryDistribution,
      checklist: trip.checklist || [],
      plans: trip.plans || [],
      itemizedExpenses: tripExpenses.map((e) => ({
        id: e.id,
        date: e.date,
        title: e.title,
        category: e.category,
        amount: e.amount,
        currency: e.currency,
        convertedHomeCurrencyAmount: Number(convertToHomeCurrency(e.amount, e.currency, trip, homeCurrency).toFixed(2)),
        paidBy: e.paidBy || user.name,
        splitBetween: e.splitBetween || [user.name],
        notes: e.notes || null,
        createdAt: e.createdAt,
      })),
    };
  });

  const totalPortfolioSpentHome = allExpenses.reduce((acc, e) => {
    const parentTrip = trips.find(t => t.id === e.tripId);
    if (!parentTrip) return acc + e.amount;
    return acc + convertToHomeCurrency(e.amount, e.currency, parentTrip, homeCurrency);
  }, 0);

  const payload = {
    schemaVersion: '2.1.0',
    generator: 'Rumbio Travel Finance Platform',
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      primaryHomeCurrency: user.homeCurrency,
    },
    portfolioStatistics: {
      totalTripsCount: trips.length,
      totalExpensesCount: allExpenses.length,
      accumulatedExpensesInHomeCurrency: Number(totalPortfolioSpentHome.toFixed(2)),
      homeCurrencySymbol: CURRENCIES[homeCurrency]?.symbol || '$',
    },
    trips: structuredTrips,
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Initiates the download of structured JSON.
 */
export function downloadStructuredJSON(user: User, trips: Trip[], expenses: Expense[]): void {
  const jsonStr = generateStructuredJSON(user, trips, expenses);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const cleanUserName = user.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  link.setAttribute('download', `Rumbio_Export_${cleanUserName}_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
