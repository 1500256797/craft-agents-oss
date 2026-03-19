export const VIDEO_EXTENSIONS = new Set([
  'mp4',
  'webm',
  'mov',
  'm4v',
  'ogv',
])

const VIDEO_MIME_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
  ogv: 'video/ogg',
}

export function getVideoMimeType(filePath: string): string {
  const basename = filePath.split('/').pop() ?? filePath
  const dotIndex = basename.lastIndexOf('.')
  const ext = dotIndex === -1 ? '' : basename.slice(dotIndex + 1).toLowerCase()
  return VIDEO_MIME_TYPES[ext] || 'video/mp4'
}
