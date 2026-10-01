import { describe, it, expect } from 'vitest'
import {
  computeAnalyticsKpis,
  formatPercentage,
  formatCurrency,
  type AnalyticsDataPoint,
} from '../analyticsKpis'

describe('analyticsKpis', () => {
  const mockCurrentData: AnalyticsDataPoint[] = [
    { name: 'Mon', success: 80, failed: 20, capital: 2800, milestones: 2 },
    { name: 'Tue', success: 85, failed: 15, capital: 2900, milestones: 3 },
    { name: 'Wed', success: 78, failed: 22, capital: 2750, milestones: 2 },
    { name: 'Thu', success: 90, failed: 10, capital: 3100, milestones: 4 },
    { name: 'Fri', success: 88, failed: 12, capital: 3050, milestones: 3 },
    { name: 'Sat', success: 92, failed: 8, capital: 3200, milestones: 5 },
    { name: 'Sun', success: 87, failed: 13, capital: 3150, milestones: 3 },
  ]

  const mockPreviousData: AnalyticsDataPoint[] = [
    { name: 'Mon', success: 60, failed: 40, capital: 2000, milestones: 1 },
    { name: 'Tue', success: 65, failed: 35, capital: 2100, milestones: 2 },
    { name: 'Wed', success: 70, failed: 30, capital: 2200, milestones: 2 },
    { name: 'Thu', success: 72, failed: 28, capital: 2300, milestones: 2 },
    { name: 'Fri', success: 68, failed: 32, capital: 2150, milestones: 1 },
    { name: 'Sat', success: 75, failed: 25, capital: 2400, milestones: 3 },
    { name: 'Sun', success: 71, failed: 29, capital: 2350, milestones: 2 },
  ]

  describe('computeAnalyticsKpis', () => {
    it('should compute correct totals and averages from current data', () => {
      const kpis = computeAnalyticsKpis(mockCurrentData)

      // Verify totals
      expect(kpis.totalCapital).toBe(20950)
      expect(kpis.totalMilestones).toBe(22)

      // Verify averages (rounded to 2 decimals)
      // (80+85+78+90+88+92+87) / 7 = 600 / 7 = 85.71
      expect(kpis.averageSuccessRate).toBe(85.71)
    })

    it('should compute period-over-period deltas when previous data is provided', () => {
      const kpis = computeAnalyticsKpis(mockCurrentData, mockPreviousData)

      // Current period: total capital = 20950, previous = 15500
      // Delta: 20950 - 15500 = 5450
      expect(kpis.capitalDelta).toBe(5450)

      // Current success avg = 85.71%, previous = 68.71%
      // (60+65+70+72+68+75+71) / 7 = 481 / 7 = 68.71
      expect(kpis.successDelta).toBeCloseTo(85.71 - 68.71, 1)

      // Current milestones = 22, previous = 13
      // (1+2+2+2+1+3+2) = 13
      expect(kpis.milestoneDelta).toBe(9)
    })

    it('should set positive trends when deltas are positive', () => {
      const kpis = computeAnalyticsKpis(mockCurrentData, mockPreviousData)

      expect(kpis.capitalTrend).toBe(true)
      expect(kpis.successTrend).toBe(true)
      expect(kpis.milestoneTrend).toBe(true)
    })

    it('should set negative trends when deltas are negative', () => {
      const kpis = computeAnalyticsKpis(mockPreviousData, mockCurrentData)

      expect(kpis.capitalTrend).toBe(false)
      expect(kpis.successTrend).toBe(false)
      expect(kpis.milestoneTrend).toBe(false)
    })

    it('should handle empty current data gracefully', () => {
      const kpis = computeAnalyticsKpis([])

      expect(kpis).toMatchObject({
        totalCapital: 0,
        prevTotalCapital: 0,
        averageSuccessRate: 0,
        prevAverageSuccessRate: 0,
        totalMilestones: 0,
        prevTotalMilestones: 0,
        capitalDelta: 0,
        successDelta: 0,
        milestoneDelta: 0,
        capitalTrend: false,
        successTrend: false,
        milestoneTrend: false,
      })
    })

    it('should handle null current data gracefully', () => {
      // @ts-expect-error - testing edge case
      const kpis = computeAnalyticsKpis(null)

      expect(kpis).toMatchObject({
        totalCapital: 0,
        averageSuccessRate: 0,
        totalMilestones: 0,
      })
    })

    it('should compute deltas as 0 when no previous data is provided', () => {
      const kpis = computeAnalyticsKpis(mockCurrentData)

      expect(kpis.capitalDelta).toBe(0)
      expect(kpis.successDelta).toBe(0)
      expect(kpis.milestoneDelta).toBe(0)
    })

    it('should compute deltas as 0 when previous data is empty', () => {
      const kpis = computeAnalyticsKpis(mockCurrentData, [])

      expect(kpis.capitalDelta).toBe(0)
      expect(kpis.successDelta).toBe(0)
      expect(kpis.milestoneDelta).toBe(0)
    })

    it('should handle single data point without previous period', () => {
      const singlePoint: AnalyticsDataPoint[] = [
        { name: 'Mon', success: 80, failed: 20, capital: 2800, milestones: 2 },
      ]

      const kpis = computeAnalyticsKpis(singlePoint)

      expect(kpis.totalCapital).toBe(2800)
      expect(kpis.totalMilestones).toBe(2)
      expect(kpis.averageSuccessRate).toBe(80)
      expect(kpis.capitalDelta).toBe(0)
    })

    it('should handle zero capital values', () => {
      const zeroCapitalData: AnalyticsDataPoint[] = [
        { name: 'Mon', success: 80, failed: 20, capital: 0, milestones: 2 },
        { name: 'Tue', success: 85, failed: 15, capital: 0, milestones: 3 },
      ]

      const kpis = computeAnalyticsKpis(zeroCapitalData)

      expect(kpis.totalCapital).toBe(0)
      expect(kpis.capitalDelta).toBe(0)
    })

    it('should handle missing fields in data points', () => {
      const incompleteData: any[] = [
        { name: 'Mon', success: 80, capital: 2800 }, // missing failed, milestones
        { name: 'Tue', success: 85, capital: 2900 },
      ]

      const kpis = computeAnalyticsKpis(incompleteData)

      expect(kpis.totalCapital).toBe(5700)
      expect(kpis.averageSuccessRate).toBe(82.5)
      expect(kpis.totalMilestones).toBe(0)
    })

    it('should round average success rate to 2 decimal places', () => {
      const data: AnalyticsDataPoint[] = [
        { name: 'A', success: 33.333, failed: 66.667, capital: 1000, milestones: 1 },
        { name: 'B', success: 33.333, failed: 66.667, capital: 1000, milestones: 1 },
        { name: 'C', success: 33.334, failed: 66.666, capital: 1000, milestones: 1 },
      ]

      const kpis = computeAnalyticsKpis(data)

      // Average should be 33.33 (rounded)
      expect(kpis.averageSuccessRate).toBe(33.33)
    })

    it('should round deltas to 2 decimal places', () => {
      const current: AnalyticsDataPoint[] = [
        { name: 'A', success: 85.5555, failed: 14.4445, capital: 2000.99, milestones: 1 },
      ]

      const previous: AnalyticsDataPoint[] = [
        { name: 'A', success: 80.1111, failed: 19.8889, capital: 1000.50, milestones: 1 },
      ]

      const kpis = computeAnalyticsKpis(current, previous)

      expect(kpis.capitalDelta).toBe(1000.49)
      expect(kpis.successDelta).toBeCloseTo(5.44, 1)
    })

    it('should correctly identify zero delta as positive trend for capital', () => {
      const sameData: AnalyticsDataPoint[] = [
        { name: 'A', success: 80, failed: 20, capital: 2000, milestones: 2 },
      ]

      const kpis = computeAnalyticsKpis(sameData, sameData)

      expect(kpis.capitalDelta).toBe(0)
      expect(kpis.capitalTrend).toBe(true)
    })

    it('should correctly calculate deltas when previous period has zero values (0 -> N increase)', () => {
      const prevZeroData: AnalyticsDataPoint[] = [
        { name: 'Mon', success: 0, failed: 0, capital: 0, milestones: 0 },
      ]
      const currentData: AnalyticsDataPoint[] = [
        { name: 'Mon', success: 80, failed: 20, capital: 2000, milestones: 2 },
      ]

      const kpis = computeAnalyticsKpis(currentData, prevZeroData)

      expect(kpis.capitalDelta).toBe(2000)
      expect(kpis.successDelta).toBe(80)
      expect(kpis.milestoneDelta).toBe(2)
      
      expect(kpis.capitalTrend).toBe(true)
      expect(kpis.successTrend).toBe(true)
      expect(kpis.milestoneTrend).toBe(true)
    })

    it('should handle large numbers correctly', () => {
      const largeData: AnalyticsDataPoint[] = [
        { name: 'A', success: 90, failed: 10, capital: 1000000, milestones: 100 },
        { name: 'B', success: 85, failed: 15, capital: 2500000, milestones: 150 },
      ]

      const kpis = computeAnalyticsKpis(largeData)

      expect(kpis.totalCapital).toBe(3500000)
      expect(kpis.totalMilestones).toBe(250)
      expect(kpis.averageSuccessRate).toBe(87.5)
    })
  })

  describe('formatPercentage', () => {
    it('should format percentage without decimals by default', () => {
      expect(formatPercentage(85)).toBe('85%')
      expect(formatPercentage(85.4)).toBe('85%')
    })

    it('should format percentage with specified decimal places', () => {
      expect(formatPercentage(85.456, 2)).toBe('85.46%')
      expect(formatPercentage(85.1, 1)).toBe('85.1%')
    })

    it('should handle zero percentage', () => {
      expect(formatPercentage(0)).toBe('0%')
    })

    it('should handle negative percentages', () => {
      expect(formatPercentage(-5.5, 1)).toBe('-5.5%')
    })

    it('should handle 100 percentage', () => {
      expect(formatPercentage(100)).toBe('100%')
    })
  })

  describe('formatCurrency', () => {
    it('should format currency with comma separators', () => {
      expect(formatCurrency(12450)).toBe('$12,450')
      expect(formatCurrency(3200)).toBe('$3,200')
    })

    it('should handle large numbers with multiple comma separators', () => {
      expect(formatCurrency(1234567)).toBe('$1,234,567')
    })

    it('should handle zero currency', () => {
      expect(formatCurrency(0)).toBe('$0')
    })

    it('should round decimal currency values', () => {
      expect(formatCurrency(12450.6)).toBe('$12,451')
      expect(formatCurrency(12450.4)).toBe('$12,450')
    })

    it('should handle small currency values', () => {
      expect(formatCurrency(100)).toBe('$100')
      expect(formatCurrency(50)).toBe('$50')
    })

    it('should handle negative currency values', () => {
      expect(formatCurrency(-12450)).toBe('$-12,450')
    })
  })
})
