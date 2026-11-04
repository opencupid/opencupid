/**
 * Events (and communities) have no separate title field: the first line of
 * `content` is the name, the rest is the description.
 */
export function splitContentTitle(content: string): { title: string; body: string } {
  const [title = '', ...rest] = content.split('\n')
  return { title, body: rest.join('\n').trim() }
}
