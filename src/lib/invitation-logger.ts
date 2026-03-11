type LogLevel = 'info' | 'warn' | 'error'

function maskEmail(email?: string): string | undefined {
  if (!email || !email.includes('@')) return email
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  if (local.length <= 2) return `${local[0] || '*'}***@${domain}`
  return `${local.slice(0, 2)}***@${domain}`
}

function write(level: LogLevel, event: string, payload: Record<string, unknown>) {
  const message = `[INVITE_FLOW] ${event}`
  if (level === 'error') {
    console.error(message, payload)
    return
  }
  if (level === 'warn') {
    console.warn(message, payload)
    return
  }
  console.info(message, payload)
}

export function logInviteInfo(event: string, payload: Record<string, unknown>) {
  write('info', event, payload)
}

export function logInviteWarn(event: string, payload: Record<string, unknown>) {
  write('warn', event, payload)
}

export function logInviteError(event: string, payload: Record<string, unknown>) {
  write('error', event, payload)
}

export function safeEmail(email?: string): string | undefined {
  return maskEmail(email)
}
