import schedule from 'node-schedule';

/**
 * Interface for a task scheduler
 */
export interface Scheduler {
  /**
   * Schedule a task to run at a specific interval
   * @param id Unique identifier for the job
   * @param callback Function to execute
   * @param interval Interval in milliseconds
   */
  scheduleInterval(id: string, callback: () => void, interval: number): void;
  
  /**
   * Schedule a task to run at a specific time each day
   * @param id Unique identifier for the job
   * @param time Time in format "HH:MM"
   * @param callback Function to execute
   */
  scheduleDaily(id: string, time: string, callback: () => void): void;
  
  /**
   * Schedule a task using a cron expression
   * @param id Unique identifier for the job
   * @param cronExpression Cron expression (e.g., "0 0 * * *" for midnight)
   * @param callback Function to execute
   */
  scheduleCron(id: string, cronExpression: string, callback: () => void): void;
  
  /**
   * Clear a specific scheduled job
   * @param id Job identifier
   */
  clear(id: string): void;
  
  /**
   * Clear all scheduled jobs
   */
  clearAll(): void;
}

/**
 * Implementation of the Scheduler using node-schedule
 */
class NodeScheduler implements Scheduler {
  private jobs: Map<string, schedule.Job> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  
  /**
   * Schedule a task to run at a specific interval
   */
  scheduleInterval(id: string, callback: () => void, interval: number): void {
    // Clear any existing job with this ID
    this.clear(id);
    
    // Schedule the interval
    const timeoutId = setInterval(callback, interval);
    this.intervals.set(id, timeoutId);
  }
  
  /**
   * Schedule a task to run at a specific time each day
   */
  scheduleDaily(id: string, time: string, callback: () => void): void {
    // Clear any existing job with this ID
    this.clear(id);
    
    // Parse the time (HH:MM)
    const [hours, minutes] = time.split(':').map(t => parseInt(t, 10));
    
    // Create a rule for daily execution at the specified time
    const rule = new schedule.RecurrenceRule();
    rule.hour = hours;
    rule.minute = minutes;
    
    // Schedule the job
    const job = schedule.scheduleJob(rule, callback);
    this.jobs.set(id, job);
  }
  
  /**
   * Schedule a task using a cron expression
   */
  scheduleCron(id: string, cronExpression: string, callback: () => void): void {
    // Clear any existing job with this ID
    this.clear(id);
    
    // Schedule the job using the cron expression
    const job = schedule.scheduleJob(cronExpression, callback);
    this.jobs.set(id, job);
  }
  
  /**
   * Clear a specific scheduled job
   */
  clear(id: string): void {
    // Clear interval if it exists
    if (this.intervals.has(id)) {
      clearInterval(this.intervals.get(id));
      this.intervals.delete(id);
    }
    
    // Cancel job if it exists
    if (this.jobs.has(id)) {
      this.jobs.get(id)?.cancel();
      this.jobs.delete(id);
    }
  }
  
  /**
   * Clear all scheduled jobs
   */
  clearAll(): void {
    // Clear all intervals
    for (const [id, interval] of this.intervals) {
      clearInterval(interval);
    }
    this.intervals.clear();
    
    // Cancel all jobs
    for (const [id, job] of this.jobs) {
      job.cancel();
    }
    this.jobs.clear();
  }
}

/**
 * Factory function to create a new node scheduler
 */
export function createNodeScheduler(): Scheduler {
  return new NodeScheduler();
}