import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { IntervalHistogram, monitorEventLoopDelay } from 'node:perf_hooks';

/** In-process counters, exposed at GET /api/metrics. */
@Injectable()
export class MetricsService implements OnApplicationShutdown {
  messagesSent = 0;
  bytesSent = 0;
  ticksSkippedForSlowClients = 0;
  slowClientsDisconnected = 0;
  private ticks = 0;
  private fanOutTotalMs = 0;
  private fanOutMaxMs = 0;
  private readonly loopDelay: IntervalHistogram = monitorEventLoopDelay({ resolution: 10 });

  constructor() {
    this.loopDelay.enable();
  }

  recordSend(message: string): void {
    this.messagesSent += 1;
    this.bytesSent += message.length; // payloads are ASCII
  }

  recordFanOut(durationMs: number): void {
    this.ticks += 1;
    this.fanOutTotalMs += durationMs;
    this.fanOutMaxMs = Math.max(this.fanOutMaxMs, durationMs);
  }

  snapshot() {
    const { rss, heapUsed } = process.memoryUsage();
    const cpu = process.cpuUsage();
    const round = (n: number) => Math.round(n * 100) / 100;
    return {
      uptimeSeconds: round(process.uptime()),
      ticks: this.ticks,
      fanOutMs: { average: round(this.ticks ? this.fanOutTotalMs / this.ticks : 0), max: round(this.fanOutMaxMs) },
      messagesSent: this.messagesSent,
      bytesSent: this.bytesSent,
      ticksSkippedForSlowClients: this.ticksSkippedForSlowClients,
      slowClientsDisconnected: this.slowClientsDisconnected,
      memoryMb: { rss: round(rss / 1048576), heapUsed: round(heapUsed / 1048576) },
      cpuSeconds: round((cpu.user + cpu.system) / 1e6),
      // The histogram includes its own 10 ms sampling interval.
      eventLoopDelayMs: { p99: round(Math.max(0, this.loopDelay.percentile(99) / 1e6 - 10)) },
    };
  }

  onApplicationShutdown(): void {
    this.loopDelay.disable();
  }
}
