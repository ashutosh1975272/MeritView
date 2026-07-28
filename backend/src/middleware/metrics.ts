import { Request, Response, NextFunction } from 'express';

interface MetricCounter {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram';
  labels: Record<string, string>;
  value: number;
}

const counters = new Map<string, number>();

function inc(name: string, labels: Record<string, string> = {}): void {
  const key = name + ':' + JSON.stringify(labels);
  counters.set(key, (counters.get(key) || 0) + 1);
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const route = (req.route?.path as string) || req.path;
    const method = req.method;
    const status = res.statusCode.toString();

    inc('http_requests_total', { method, route, status });
    inc('http_request_duration_ms', { method, route });
  });

  next();
}

export function metricsEndpoint(_req: Request, res: Response): void {
  const lines: string[] = [];

  for (const [key, value] of counters) {
    const [name, labelsJson] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
    const labels = JSON.parse(labelsJson);
    const labelStr = Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',');
    if (labelStr) {
      lines.push(`${name}{${labelStr}} ${value}`);
    } else {
      lines.push(`${name} ${value}`);
    }
  }

  lines.push(`# HELP http_requests_total Total HTTP requests`);
  lines.push(`# TYPE http_requests_total counter`);
  lines.push(`# HELP http_request_duration_ms HTTP request duration in ms`);
  lines.push(`# TYPE http_request_duration_ms gauge`);
  lines.push(`process_start_time_seconds ${Math.floor(Date.now() / 1000)}`);

  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.send(lines.join('\n') + '\n');
}
