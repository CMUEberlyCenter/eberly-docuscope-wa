import { Router, Request, Response } from 'express';
import { mem, time } from 'systeminformation'; // https://www.npmjs.com/package/systeminformation

export const metrics = Router();

type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary' | 'untyped';
type Metric = {
  metric: string;
  value: number;
  type: MetricType;
  help: string;
};
/**
 *
 */
class PrometheusMetrics {
  metricTracker: Metric[] = [];
  METRIC_TYPE_COUNTER = 'counter';
  METRIC_TYPE_GAUGE = 'gauge';
  METRIC_TYPE_HISTOGRAM = 'histogram';
  METRIC_TYPE_SUMMARY = 'summary';
  METRIC_TYPE_UNTYPED = 'untyped';

  /**
   * Let's switch to a hashtable soon!
   */
  getMetricObject(aMetric: string) {
    return this.metricTracker.find((tracker) => tracker.metric === aMetric);
  }

  /**
   * If the token is TYPE, exactly two more tokens are expected. The first is the metric name, and the second is
   * either counter, gauge, histogram, summary, or untyped, defining the type for the metric of that name. Only
   * one TYPE line may exist for a given metric name. The TYPE line for a metric name must appear before the
   * first sample is reported for that metric name. If there is no TYPE line for a metric name, the type is
   * set to untyped.
   */
  addMetric(aMetric: string, aValue: number, aType: string, aHelp: string) {
    return `# HELP ${aHelp}\n# TYPE ${aMetric} ${aType}\n${aMetric} ${aValue}\n`;
  }

  /**
   * If the token is TYPE, exactly two more tokens are expected. The first is the metric name, and the second is
   * either counter, gauge, histogram, summary, or untyped, defining the type for the metric of that name. Only
   * one TYPE line may exist for a given metric name. The TYPE line for a metric name must appear before the
   * first sample is reported for that metric name. If there is no TYPE line for a metric name, the type is
   * set to untyped.
   */
  setMetricObject(
    aMetric: string,
    aValue: number,
    aType: MetricType,
    aHelp: string
  ) {
    let metricObject = this.getMetricObject(aMetric);
    if (!metricObject) {
      metricObject = {
        metric: aMetric,
        value: aValue,
        type: aType,
        help: aHelp,
      };
      this.metricTracker.push(metricObject);
    }

    metricObject.value = aValue;

    return metricObject;
  }

  /**
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function
   */
  async build() {
    let formatted = '';

    const uptime = time();

    formatted = formatted.concat(
      ...this.metricTracker.map((tracker) =>
        this.addMetric(
          tracker.metric,
          tracker.value,
          tracker.type,
          tracker.help
        )
      )
    );

    formatted = formatted.concat(
      this.addMetric(
        'eberly_node_system_uptime',
        uptime.uptime,
        this.METRIC_TYPE_COUNTER,
        'Uptime since metric service start'
      )
    );

    const memory = await mem();
    formatted = formatted.concat(
      this.addMetric(
        'eberly_node_system_memory_total',
        memory.total,
        this.METRIC_TYPE_COUNTER,
        'Total memory in bytes'
      )
    );
    formatted = formatted.concat(
      this.addMetric(
        'eberly_node_system_memory_free',
        memory.free,
        this.METRIC_TYPE_COUNTER,
        'Not used in bytes'
      )
    );
    formatted = formatted.concat(
      this.addMetric(
        'eberly_node_system_memory_used',
        memory.used,
        this.METRIC_TYPE_COUNTER,
        'Used (incl. buffers/cache)'
      )
    );
    formatted = formatted.concat(
      this.addMetric(
        'eberly_node_system_memory_active',
        memory.active,
        this.METRIC_TYPE_COUNTER,
        'Used actively (excl. buffers/cache)'
      )
    );
    formatted = formatted.concat(
      this.addMetric(
        'eberly_node_system_memory_buffcache',
        memory.buffcache,
        this.METRIC_TYPE_COUNTER,
        'Used by buffers+cache'
      )
    );
    formatted = formatted.concat(
      this.addMetric(
        'eberly_node_system_memory_buffers',
        memory.buffers,
        this.METRIC_TYPE_COUNTER,
        'Used by buffers'
      )
    );
    formatted = formatted.concat(
      this.addMetric(
        'eberly_node_system_memory_cached',
        memory.cached,
        this.METRIC_TYPE_COUNTER,
        'Used by cache'
      )
    );
    formatted = formatted.concat(
      this.addMetric(
        'eberly_node_system_memory_slab',
        memory.slab,
        this.METRIC_TYPE_COUNTER,
        'Used by slab'
      )
    );
    formatted = formatted.concat(
      this.addMetric(
        'eberly_node_system_memory_available',
        memory.available,
        this.METRIC_TYPE_COUNTER,
        'Potentially available (total - active)'
      )
    );
    formatted = formatted.concat(
      this.addMetric(
        'eberly_node_system_memory_swaptotal',
        memory.swaptotal,
        this.METRIC_TYPE_COUNTER,
        'Total swap space available'
      )
    );
    formatted = formatted.concat(
      this.addMetric(
        'eberly_node_system_memory_swapused',
        memory.swapused,
        this.METRIC_TYPE_COUNTER,
        'Total swap space used'
      )
    );
    formatted = formatted.concat(
      this.addMetric(
        'eberly_node_system_memory_swapfree',
        memory.swapfree,
        this.METRIC_TYPE_COUNTER,
        'Total swap sace free'
      )
    );

    return formatted;
  }
}

// export default PrometheusMetrics;

const prometheus = new PrometheusMetrics();
let onTopicRequests = 0;
let onTopicRequestsAvg = 0;
let onTopicResponseAvg = 0;
let onTopicResponseAvgCount = 0;

prometheus.setMetricObject(
  'eberly_dswa_requests_total',
  onTopicRequests,
  'counter',
  'Number of requests made to the OnTopic backend'
);
prometheus.setMetricObject(
  'eberly_dswa_requests_avg',
  onTopicRequestsAvg,
  'counter',
  'Average number of requests made to the OnTopic backend'
);
prometheus.setMetricObject(
  'eberly_dswa_uptime_total',
  process.uptime(),
  'counter',
  'DSWA Server uptime'
);
prometheus.setMetricObject(
  'eberly_dswa_response_avg',
  onTopicResponseAvg,
  'counter',
  'DSWA OnTopic average response time'
);

/**
 * Reset the average counters every 5 minutes. That way the code can just keep adding and re-calculating without having
 * to worry about moving averages and queue sizes. We should probably change this in the near future to be more
 * representative
 */
function updateMetricsAvg() {
  onTopicRequestsAvg = 0;
  onTopicResponseAvg = 0;
  onTopicResponseAvgCount = 0;

  prometheus.setMetricObject(
    'eberly_dswa_requests_total',
    onTopicRequests,
    'counter',
    'Number of requests made to the OnTopic backend'
  );
  prometheus.setMetricObject(
    'eberly_dswa_requests_avg',
    onTopicRequestsAvg,
    'counter',
    'Average number of requests made to the OnTopic backend'
  );
  prometheus.setMetricObject(
    'eberly_dswa_response_avg',
    0,
    'counter',
    'DSWA OnTopic average response time'
  );
}
/**
 *
 */
function updateUptime() {
  prometheus.setMetricObject(
    'eberly_dswa_uptime_total',
    process.uptime(),
    'counter',
    'DSWA Server uptime'
  );
}
/**
 *
 */
export function updateMetrics() {
  onTopicRequests++;
  onTopicRequestsAvg++;

  prometheus.setMetricObject(
    'eberly_dswa_requests_total',
    onTopicRequests,
    'counter',
    'Number of requests made to the OnTopic backend'
  );
  prometheus.setMetricObject(
    'eberly_dswa_requests_avg',
    onTopicRequestsAvg,
    'counter',
    'Average number of requests made to the OnTopic backend'
  );
}

/**
 *
 */
export function updateResponseAvg(aValue: number) {
  onTopicResponseAvg += aValue;
  onTopicResponseAvgCount++;

  const average = onTopicResponseAvg / onTopicResponseAvgCount;
  prometheus.setMetricObject(
    'eberly_dswa_response_avg',
    average,
    'counter',
    'DSWA OnTopic average response time'
  );
}

////////// Metrics Endpoint /////////////
metrics.get('/metrics', async (_request: Request, response: Response) => {
  updateUptime();
  const metricsString = await prometheus.build();
  response.contentType('text/text').send(metricsString);
});

/** Setup periodic updates. */
function startup() {
  // Reset the avg values every 5 minutes
  setInterval(updateMetricsAvg, 5 * 60 * 1000); // Every 5 minutes
}
startup();
