export class DeduplicationManager {
  private readonly messageIds = new Set<string>()
  private readonly locks = new Set<string>()

  constructor(private interval: number) {}

  isMessageProcessed(messageId: string): boolean {
    if (this.messageIds.has(messageId)) return true
    this.messageIds.add(messageId)
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
    this.messageIds.clear()
    this.locks.clear()
  }
}
