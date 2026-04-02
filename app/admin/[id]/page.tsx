import { redirect } from 'next/navigation'

export default async function AdminAuditRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/admin/quotes/${id}`)
}
