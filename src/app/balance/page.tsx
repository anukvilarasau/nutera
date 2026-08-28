import { getBalance } from '@/lib/actions'
import BalanceClient from '@/components/balance/balance-client'
import type { VentaRentabilidad, ItemCosto } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function BalancePage() {
  let ventas: VentaRentabilidad[] = []
  let itemsCosto: ItemCosto[] = []
  try {
    ;({ ventas, itemsCosto } = await getBalance())
  } catch (e) {
    console.error('Error cargando balance:', e)
  }
  return <BalanceClient ventas={ventas} itemsCosto={itemsCosto} />
}
