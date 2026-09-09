import Redis from 'ioredis';
import { redisConfig } from '../lib/redis';

const redis = new Redis(redisConfig);

const RELEASE_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

export class UserExecutionLock {
  private static LOCK_TTL_SECONDS = 120; // 2 minutes max lock timeout to prevent deadlocks

  /**
   * Tries to acquire a lock for a specific user to ensure FIFO sequential processing per-user.
   * If acquired, returns the lockToken string. If locked by another worker/job, returns null.
   */
  static async acquire(userId: string, jobId: string): Promise<string | null> {
    const lockKey = `lock:user-execution:${userId}`;
    const token = `${jobId}:${Date.now()}`;

    const acquired = await redis.set(
      lockKey,
      token,
      'EX',
      this.LOCK_TTL_SECONDS,
      'NX'
    );

    return acquired === 'OK' ? token : null;
  }

  /**
   * Releases the per-user lock safely using an atomic Lua script.
   */
  static async release(userId: string, token: string): Promise<boolean> {
    const lockKey = `lock:user-execution:${userId}`;
    try {
      const result = await redis.eval(RELEASE_LOCK_SCRIPT, 1, lockKey, token);
      return result === 1;
    } catch (err) {
      console.error(`[UserExecutionLock] Error releasing lock for user ${userId}:`, err);
      return false;
    }
  }

  /**
   * Waits and polls for lock availability with timeout.
   */
  static async acquireWithWait(
    userId: string,
    jobId: string,
    maxWaitMs: number = 30000,
    pollIntervalMs: number = 300
  ): Promise<string> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const token = await this.acquire(userId, jobId);
      if (token) {
        return token;
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Timeout waiting for user ${userId} FIFO execution lock`);
  }
}
