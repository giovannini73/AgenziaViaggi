import { CalendarDays, Car, FileText, ListOrdered, Map } from 'lucide-react'

const icons = { detail: FileText, stops: ListOrdered, map: Map, transfers: Car, days: CalendarDays }

export function TripTabLabel({ id, label }: { id: keyof typeof icons; label: string }) {
  const Icon = icons[id]
  return <><Icon className="hidden h-5 w-5 phone-port:block" aria-hidden /><span className="phone-port:hidden">{label}</span></>
}
