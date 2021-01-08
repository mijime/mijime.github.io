import {
  LANG,
  PAGE_SIZE,
  SITE_NAME,
  SITE_URL,
  SITE_VERIFICATION
} from '@/infrastructures/config/'

export const SitesApp = {
  getSiteName() {
    return SITE_NAME
  },
  getSiteURL() {
    return SITE_URL
  },
  getSiteVerification() {
    return SITE_VERIFICATION
  },
  getLangugage() {
    return LANG
  },
  getPageSize() {
    return PAGE_SIZE
  },
  getGithubEditURL() {
    return 'https://github.com/mijime/mijime.github.io/edit/master'
  }
}
