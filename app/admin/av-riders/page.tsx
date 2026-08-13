import { createServiceClient } from '@/lib/supabase'
import type { AvRider } from './actions'
import AvRidersClient from './AvRidersClient'

export default async function AvRidersPage() {
  const supabase = createServiceClient()
  const { data } = await supabase.from('av_riders').select('*').order('name')
  return <AvRidersClient riders={(data ?? []) as AvRider[]} />
}
