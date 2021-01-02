import { GA_TRACKING_ID } from '@/infrastructures/config/'

export const AnalyticsApp = {
  getTrackingID() {
    return GA_TRACKING_ID
  }
}
