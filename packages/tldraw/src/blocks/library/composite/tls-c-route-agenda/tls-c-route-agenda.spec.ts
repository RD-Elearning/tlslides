/** tls.c.route-agenda — spro creative CR8 (the shared wave-1 suite). */
import { tlsCRouteAgenda, buildRouteAgenda } from './index'
import { wave1Suite } from '../wave1-test'

wave1Suite({
  def: tlsCRouteAgenda, build: buildRouteAgenda, category: 'agenda', scope: 'slide',
  overflow: { stops: Array.from({ length: 8 }, (_, i) => ({ label: `Stop ${i}` })) },
  variants: { slot: 'variant', values: ["road", "metro", "stepping-stones", "river"] },
  long: { stops: Array.from({ length: 6 }, (_, i) => ({ label: `Stop ${i} of the route`, note: 'A short note about it' })) }, parts: ["route"],
})
