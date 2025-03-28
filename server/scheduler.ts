import * as schedule from 'node-schedule';

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
    // Clear any existing job with the same ID
    this.clear(id);
    
    // Schedule the interval
    const intervalId = setInterval(callback, interval);
    this.intervals.set(id, intervalId);
    
    console.log(`Scheduled interval job: ${id}, every ${interval}ms`);
  }
  
  /**
   * Schedule a task to run at a specific time each day
   */
  scheduleDaily(id: string, time: string, callback: () => void): void {
    // Clear any existing job with the same ID
    this.clear(id);
    
    // Parse time (HH:MM)
    const [hour, minute] = time.split(':').map(Number);
    
    // Create a recurring rule for the specified time
    const rule = new schedule.RecurrenceRule();
    rule.hour = hour;
    rule.minute = minute;
    
    // Schedule the job
    const job = schedule.scheduleJob(rule, callback);
    this.jobs.set(id, job);
    
    console.log(`Scheduled daily job: ${id}, at ${time}`);
  }
  
  /**
   * Schedule a task using a cron expression
   */
  scheduleCron(id: string, cronExpression: string, callback: () => void): void {
    // Clear any existing job with the same ID
    this.clear(id);
    
    // Schedule the job with the cron expression
    const job = schedule.scheduleJob(cronExpression, callback);
    this.jobs.set(id, job);
    
    console.log(`Scheduled cron job: ${id}, expression: ${cronExpression}`);
  }
  
  /**
   * Clear a specific scheduled job
   */
  clear(id: string): void {
    // Clear interval if it exists
    if (this.intervals.has(id)) {
      clearInterval(this.intervals.get(id));
      this.intervals.delete(id);
      console.log(`Cleared interval job: ${id}`);
    }
    
    // Cancel scheduled job if it exists
    if (this.jobs.has(id)) {
      const job = this.jobs.get(id);
      job?.cancel();
      this.jobs.delete(id);
      console.log(`Cleared scheduled job: ${id}`);
    }
  }
  
  /**
   * Clear all scheduled jobs
   */
  clearAll(): void {
    // Clear all intervals
    for (const [id, intervalId] of this.intervals) {
      clearInterval(intervalId);
      console.log(`Cleared interval job: ${id}`);
    }
    this.intervals.clear();
    
    // Cancel all scheduled jobs
    for (const [id, job] of this.jobs) {
      job.cancel();
      console.log(`Cleared scheduled job: ${id}`);
    }
    this.jobs.clear();
    
    console.log('All jobs cleared');
  }
}

/**
 * Factory function to create a new node scheduler
 */
export function createNodeScheduler(): Scheduler {
  return new NodeScheduler();
}