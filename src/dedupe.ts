export class DeduplicationManager {
  private readonly messageTimes = new Map<string, number>()
  private readonly locks = new Set<string>()

  constructor(private interval: number) {}

  isMessageProcessed(messageId: string): boolean {
    if (this.interval <= 0) return false
    const now = Date.now()
    for (const [id, timestamp] of this.messageTimes) {
      if (now - timestamp >= this.interval * 1000) this.messageTimes.delete(id)
    }
    if (this.messageTimes.has(messageId)) return true
    this.messageTimes.set(messageId, now)
    return false
  }

  acquireLock(messageId: string): boolean {
    if (this.locks.has(messageId)) return false
    this.locks.add(messageId)
    return true
  }

  releaseLock(messageId: string): void {
    this.locks.delete(messageId)
  }

  clear(): void {
    this.messageTimes.clear()
    this.locks.clear()
  }
}
