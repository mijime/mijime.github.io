export function humanReadableDate(date: Date) {
  const delta = Math.round((new Date().getTime() - date.getTime()) / 1000)

  const minute = 60
  const hour = minute * 60
  const day = hour * 24
  const month = day * 30
  const year = day * 365

  if (delta < 30) {
    return 'just then'
  }
  if (delta < minute) {
    return delta + ' seconds ago'
  }
  if (delta < 2 * minute) {
    return 'a minute ago'
  }
  if (delta < hour) {
    return Math.floor(delta / minute) + ' minutes ago'
  }
  if (Math.floor(delta / hour) === 1) {
    return '1 hour ago'
  }
  if (delta < day) {
    return Math.floor(delta / hour) + ' hours ago'
  }
  if (delta < day * 2) {
    return 'yesterday'
  }
  if (delta < month) {
    return Math.floor(delta / day) + ' days ago'
  }
  if (Math.floor(delta / month) === 1) {
    return 'a month ago'
  }
  if (delta < year) {
    return Math.floor(delta / month) + ' months ago'
  }
  if (Math.floor(delta / year) === 1) {
    return 'a year ago'
  }
  return Math.floor(delta / year) + ' years ago'
}
