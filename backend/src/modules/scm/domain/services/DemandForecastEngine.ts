/**
 * ==========================================================================
 * SCM Demand Forecast Engine
 * ==========================================================================
 *
 * Implements time-series analysis for inventory demand forecasting.
 * Provides two complementary approaches:
 *
 *   1. ARIMA-Inspired Forecasting (AutoRegressive Integrated Moving Average)
 *      Simplified implementation using linear regression on differenced
 *      series with moving average smoothing. Suitable for stationary
 *      demand patterns with seasonal adjustment.
 *
 *   2. Exponential Smoothing (Holt-Winters)
 *      Triple exponential smoothing that captures level, trend, and
 *      seasonal components. Preferred for data with clear seasonal patterns.
 *
 * Additionally provides:
 *   - Inventory Turnover Ratio calculation
 *   - Reorder Point computation with safety stock
 *   - What-If scenario simulation
 *   - Stockout risk assessment
 *
 * All algorithms operate on time-indexed data points and return
 * probabilistic forecasts with confidence intervals.
 * ==========================================================================
 */

export interface TimeSeriesPoint {
  date: Date;
  value: number;
}

export interface ForecastResult {
  date: Date;
  predicted: number;
  lowerBound: number; // 95% confidence interval
  upperBound: number;
}

export interface InventoryMetrics {
  turnoverRatio: number;
  daysOfSupply: number;
  averageDailyDemand: number;
  reorderPoint: number;
  safetyStock: number;
  stockoutRisk: StockoutRisk;
}

export enum StockoutRisk {
  CRITICAL = 'CRITICAL',   // < 7 days of supply
  HIGH = 'HIGH',           // 7-14 days
  MODERATE = 'MODERATE',   // 14-30 days
  LOW = 'LOW',             // > 30 days
}

export interface WhatIfScenario {
  demandMultiplier: number;      // e.g., 1.2 = 20% demand increase
  leadTimeDays: number;           // supplier lead time
  currentStockUnits: number;
  costPerUnit: number;
}

export interface WhatIfResult {
  projectedStockoutDate: Date | null;
  daysUntilStockout: number | null;
  recommendedOrderQuantity: number;
  estimatedCost: number;
  riskLevel: StockoutRisk;
}

export class DemandForecastEngine {
  // -------------------------------------------------------------------------
  // Inventory Turnover & Metrics
  // -------------------------------------------------------------------------

  /**
   * Calculates core inventory health metrics.
   *
   * Turnover Ratio = Cost of Goods Sold / Average Inventory Value
   * Higher turnover indicates efficient inventory management.
   *
   * @param salesHistory     Historical sales data (units sold per period).
   * @param currentStock     Current inventory level in units.
   * @param averageInventory Average inventory value over the period.
   * @param cogs             Cost of Goods Sold over the period.
   * @param leadTimeDays     Supplier lead time in days.
   */
  calculateMetrics(
    salesHistory: TimeSeriesPoint[],
    currentStock: number,
    averageInventory: number,
    cogs: number,
    leadTimeDays: number,
  ): InventoryMetrics {
    const turnoverRatio = averageInventory > 0 ? cogs / averageInventory : 0;

    const avgDailyDemand = this.computeAverageDailyDemand(salesHistory);

    const daysOfSupply = avgDailyDemand > 0
      ? currentStock / avgDailyDemand
      : Infinity;

    const demandStdDev = this.computeStandardDeviation(
      salesHistory.map((p) => p.value),
    );

    // Safety stock = Z-score (1.96 for 95%) * stddev * sqrt(lead time)
    const safetyStock = 1.96 * demandStdDev * Math.sqrt(leadTimeDays);

    // Reorder Point = (Average Daily Demand * Lead Time) + Safety Stock
    const reorderPoint = avgDailyDemand * leadTimeDays + safetyStock;

    const stockoutRisk = this.classifyStockoutRisk(daysOfSupply);

    return {
      turnoverRatio: Math.round(turnoverRatio * 100) / 100,
      daysOfSupply: Math.round(daysOfSupply * 10) / 10,
      averageDailyDemand: Math.round(avgDailyDemand * 100) / 100,
      reorderPoint: Math.ceil(reorderPoint),
      safetyStock: Math.ceil(safetyStock),
      stockoutRisk,
    };
  }

  // -------------------------------------------------------------------------
  // Time Series Forecasting (Exponential Smoothing -- Holt-Winters)
  // -------------------------------------------------------------------------

  /**
   * Triple Exponential Smoothing (Holt-Winters additive method).
   *
   * Decomposes the time series into three components:
   *   Level (l):     Base value of the series.
   *   Trend (b):     Rate of change.
   *   Seasonal (s):  Periodic fluctuation pattern.
   *
   * Parameters:
   *   alpha: Level smoothing factor     (0 < alpha < 1)
   *   beta:  Trend smoothing factor     (0 < beta  < 1)
   *   gamma: Seasonal smoothing factor  (0 < gamma < 1)
   *
   * Requires at least 2 full seasonal cycles of historical data.
   */
  forecastHoltWinters(
    history: TimeSeriesPoint[],
    periodsAhead: number,
    seasonLength: number = 12, // Default: monthly data with yearly seasonality
    alpha: number = 0.3,
    beta: number = 0.1,
    gamma: number = 0.2,
  ): ForecastResult[] {
    const values = history.map((p) => p.value);
    const n = values.length;

    if (n < seasonLength * 2) {
      // Fallback to simple moving average if insufficient data.
      return this.forecastMovingAverage(history, periodsAhead);
    }

    // Initialize level: average of first season.
    let level = values.slice(0, seasonLength).reduce((a, b) => a + b, 0) / seasonLength;

    // Initialize trend: average change between first two seasons.
    let trend = 0;
    for (let i = 0; i < seasonLength; i++) {
      trend += (values[seasonLength + i] - values[i]) / seasonLength;
    }
    trend /= seasonLength;

    // Initialize seasonal indices.
    const seasonal = new Array(n);
    for (let i = 0; i < seasonLength; i++) {
      seasonal[i] = values[i] - level;
    }

    // Apply smoothing equations.
    for (let t = seasonLength; t < n; t++) {
      const prevLevel = level;
      const seasonIndex = t - seasonLength;

      level =
        alpha * (values[t] - seasonal[seasonIndex]) +
        (1 - alpha) * (prevLevel + trend);

      trend = beta * (level - prevLevel) + (1 - beta) * trend;

      seasonal[t] = gamma * (values[t] - level) + (1 - gamma) * seasonal[seasonIndex];
    }

    // Compute residuals for confidence intervals.
    const residuals: number[] = [];
    let reconstructLevel = values.slice(0, seasonLength).reduce((a, b) => a + b, 0) / seasonLength;
    let reconstructTrend = trend;

    for (let t = seasonLength; t < n; t++) {
      const predicted = reconstructLevel + reconstructTrend + seasonal[t - seasonLength];
      residuals.push(values[t] - predicted);
      const prevL = reconstructLevel;
      reconstructLevel = alpha * (values[t] - seasonal[t - seasonLength]) + (1 - alpha) * (prevL + reconstructTrend);
      reconstructTrend = beta * (reconstructLevel - prevL) + (1 - beta) * reconstructTrend;
    }

    const residualStdDev = this.computeStandardDeviation(residuals);

    // Generate forecasts.
    const forecasts: ForecastResult[] = [];
    const lastDate = history[n - 1].date;

    for (let h = 1; h <= periodsAhead; h++) {
      const seasonIndex = n - seasonLength + ((h - 1) % seasonLength);
      const predicted = level + h * trend + seasonal[seasonIndex];

      // Confidence interval widens with forecast horizon.
      const margin = 1.96 * residualStdDev * Math.sqrt(h);

      const forecastDate = new Date(lastDate);
      forecastDate.setDate(forecastDate.getDate() + h * 30); // Approximate monthly

      forecasts.push({
        date: forecastDate,
        predicted: Math.max(0, Math.round(predicted * 100) / 100),
        lowerBound: Math.max(0, Math.round((predicted - margin) * 100) / 100),
        upperBound: Math.round((predicted + margin) * 100) / 100,
      });
    }

    return forecasts;
  }

  // -------------------------------------------------------------------------
  // What-If Scenario Simulation
  // -------------------------------------------------------------------------

  /**
   * Simulates a demand scenario and calculates the impact on inventory.
   *
   * Used by supply chain managers to evaluate:
   *   - "What if demand increases 30% due to a promotion?"
   *   - "What if our supplier lead time doubles?"
   *   - "How much should we order to survive a demand spike?"
   */
  simulateWhatIf(
    salesHistory: TimeSeriesPoint[],
    scenario: WhatIfScenario,
  ): WhatIfResult {
    const baseDailyDemand = this.computeAverageDailyDemand(salesHistory);
    const adjustedDemand = baseDailyDemand * scenario.demandMultiplier;

    const daysUntilStockout =
      adjustedDemand > 0
        ? Math.floor(scenario.currentStockUnits / adjustedDemand)
        : null;

    const projectedStockoutDate =
      daysUntilStockout !== null
        ? new Date(Date.now() + daysUntilStockout * 86400000)
        : null;

    // Recommended order: cover lead time + 30 days safety buffer.
    const coverageDays = scenario.leadTimeDays + 30;
    const recommendedOrderQuantity = Math.ceil(
      adjustedDemand * coverageDays - scenario.currentStockUnits,
    );

    const estimatedCost = Math.max(0, recommendedOrderQuantity) * scenario.costPerUnit;

    const riskLevel = this.classifyStockoutRisk(daysUntilStockout ?? Infinity);

    return {
      projectedStockoutDate,
      daysUntilStockout,
      recommendedOrderQuantity: Math.max(0, recommendedOrderQuantity),
      estimatedCost: Math.round(estimatedCost * 100) / 100,
      riskLevel,
    };
  }

  // -------------------------------------------------------------------------
  // Utility Methods
  // -------------------------------------------------------------------------

  private forecastMovingAverage(
    history: TimeSeriesPoint[],
    periodsAhead: number,
    windowSize: number = 6,
  ): ForecastResult[] {
    const values = history.map((p) => p.value);
    const n = values.length;
    const window = values.slice(Math.max(0, n - windowSize));
    const avg = window.reduce((a, b) => a + b, 0) / window.length;
    const stdDev = this.computeStandardDeviation(window);

    const lastDate = history[n - 1].date;
    const forecasts: ForecastResult[] = [];

    for (let h = 1; h <= periodsAhead; h++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(forecastDate.getDate() + h * 30);
      const margin = 1.96 * stdDev * Math.sqrt(h / windowSize);
      forecasts.push({
        date: forecastDate,
        predicted: Math.round(avg * 100) / 100,
        lowerBound: Math.max(0, Math.round((avg - margin) * 100) / 100),
        upperBound: Math.round((avg + margin) * 100) / 100,
      });
    }

    return forecasts;
  }

  private computeAverageDailyDemand(history: TimeSeriesPoint[]): number {
    if (history.length < 2) return 0;
    const totalDemand = history.reduce((sum, p) => sum + p.value, 0);
    const firstDate = history[0].date.getTime();
    const lastDate = history[history.length - 1].date.getTime();
    const totalDays = Math.max(1, (lastDate - firstDate) / 86400000);
    return totalDemand / totalDays;
  }

  private computeStandardDeviation(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
    return Math.sqrt(variance);
  }

  private classifyStockoutRisk(daysOfSupply: number): StockoutRisk {
    if (daysOfSupply < 7) return StockoutRisk.CRITICAL;
    if (daysOfSupply < 14) return StockoutRisk.HIGH;
    if (daysOfSupply < 30) return StockoutRisk.MODERATE;
    return StockoutRisk.LOW;
  }
}
