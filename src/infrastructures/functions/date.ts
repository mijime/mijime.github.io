const minute = 60
const hour = minute * 60
const day = hour * 24
const month = day * 30
const year = day * 365

export const humanReadableDate = function humanReadableDate(date: Date) {
  const delta = Math.round((new Date().getTime() - date.getTime()) / 1000)

  for (const { expr, value } of [
    { expr: delta < 30, value: 'just then' },
    { expr: delta < minute, value: `${delta} seconds ago` },
    { expr: delta < 2 * minute, value: 'a minute ago' },
    { expr: delta < hour, value: `${Math.floor(delta / minute)} minutes ago` },
    { expr: Math.floor(delta / hour) === 1, value: '1 hour ago' },
    { expr: delta < day, value: `${Math.floor(delta / hour)} hours ago` },
    { expr: delta < day * 2, value: 'yesterday' },
    { expr: delta < month, value: `${Math.floor(delta / day)} days ago` },
    { expr: Math.floor(delta / month) === 1, value: 'a month ago' },
    { expr: delta < year, value: `${Math.floor(delta / month)} months ago` },
    { expr: Math.floor(delta / year) === 1, value: 'a year ago' }
  ]) {
    if (expr) {
      return value
    }
  }

  return `${Math.floor(delta / year)} years ago`
}
