export interface TravelExpense {
  id: string
  event_id: string
  description: string
  amount: number
  sort_order: number
  created_at: string
}

export function travelExpensesTotal(items: TravelExpense[]): number {
  return items.reduce((sum, i) => sum + i.amount, 0)
}
