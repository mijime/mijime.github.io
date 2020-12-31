import { GA_TRACKING_ID } from '@/lib/config'

// https://developers.google.com/analytics/devguides/collection/gtagjs/pages
export function pageview(url: string) {
  window.gtag('config', GA_TRACKING_ID, {
    page_path: url
  })
}

// https://developers.google.com/analytics/devguides/collection/gtagjs/events
interface GTagEvent {
  action: string
  category: string
  label: string
  value: number
}

export function event({ action, category, label, value }: GTagEvent) {
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value
  })
}
