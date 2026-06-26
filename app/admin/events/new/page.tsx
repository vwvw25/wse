import { createServiceClient } from '@/lib/supabase'
import type { DressCodeTemplate } from '../../dress-codes/actions'
import NewEventForm from './NewEventForm'

export default async function NewEventPage() {
  const supabase = createServiceClient()
  const { data } = await supabase.from('dress_code_templates').select('*').order('name')
  return <NewEventForm dressCodeTemplates={(data ?? []) as DressCodeTemplate[]} />
}
