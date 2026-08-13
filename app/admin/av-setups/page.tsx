import { createServiceClient } from '@/lib/supabase'
import type { AvSetup } from './actions'
import AvSetupsClient from './AvSetupsClient'

export default async function AvSetupsPage() {
  const supabase = createServiceClient()
  const { data } = await supabase.from('av_setups').select('*').order('name')
  return <AvSetupsClient setups={(data ?? []) as AvSetup[]} />
}
