import { createServiceClient } from '@/lib/supabase'
import type { DressCodeTemplate } from './actions'
import DressCodesClient from './DressCodesClient'

export default async function DressCodesPage() {
  const supabase = createServiceClient()
  const { data } = await supabase.from('dress_code_templates').select('*').order('name')
  return <DressCodesClient templates={(data ?? []) as DressCodeTemplate[]} />
}
