import { useRouter } from 'next/router'
import { useEffect } from 'react'

// https://developers.google.com/analytics/devguides/collection/gtagjs/events
interface GTagEvent {
  action: string
  category: string
  label: string
  value: number
}

export const event = function event({
  action,
  category,
  label,
  value
}: GTagEvent) {
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value
  })
}

const GoogleAnalyticsRouter = function GoogleAnalyticsRouter({
  trackingID
}: {
  trackingID: string
}) {
  const handleRouteChange = function handleRouteChange(url: string) {
    window.gtag('config', trackingID, { page_path: url })
  }

  const router = useRouter()
  useEffect(() => {
    router.events.on('routeChangeComplete', handleRouteChange)
    return () => router.events.off('routeChangeComplete', handleRouteChange)
  }, [router.events])
  return <></>
}

export default GoogleAnalyticsRouter
