
//https://www.npmjs.com/package/systeminformation
const si = require ('systeminformation');

/**
 *
 */
class PrometheusMetrics {

  /**
   *
   */
  constructor () {
    console.log ("PrometheusMetrics: constructor ()");

    this.metricTracker=[];

    this.METRIC_TYPE_COUNTER = "counter";
    this.METRIC_TYPE_GAUGE = "gauge";
    this.METRIC_TYPE_HISTOGRAM = "histogram";
    this.METRIC_TYPE_SUMMARY = "summary";
    this.METRIC_TYPE_UNTYPED = "untyped";

    this.memory=null;
    this.memoryDriver=si.mem();

    this.updateValues=this.updateValues.bind (this);

    this.timeoutTracker=setInterval(this.updateValues,1000);
  }

  /**
   *
   */
  updateValues () {
    this.memoryDriver=si.mem();
    this.memoryDriver.then(memory => {
      this.memory=memory;
    });    
  }

  /**
   * Let's switch to a hashtable soon!
   */
  getMetricObject (aMetric) {
    for (let i=0;i<this.metricTracker.length;i++) {
      let testMetric=this.metricTracker[i];
      if (testMetric.metric==aMetric) {
        return (testMetric);
      }
    }

    return (null);
  }

  /**
   * If the token is TYPE, exactly two more tokens are expected. The first is the metric name, and the second is 
   * either counter, gauge, histogram, summary, or untyped, defining the type for the metric of that name. Only 
   * one TYPE line may exist for a given metric name. The TYPE line for a metric name must appear before the 
   * first sample is reported for that metric name. If there is no TYPE line for a metric name, the type is 
   * set to untyped.
   */
  addMetric (aMetric, aValue, aType, aHelp) {
    let formatted="";
    
    formatted = formatted.concat ("# HELP " + aHelp + "\n");
    formatted = formatted.concat ("# TYPE " + aMetric + " " + aType + "\n");
    formatted = formatted.concat (aMetric + " " + aValue + "\n");
    
    return (formatted);
  }  

  /**
   * If the token is TYPE, exactly two more tokens are expected. The first is the metric name, and the second is 
   * either counter, gauge, histogram, summary, or untyped, defining the type for the metric of that name. Only 
   * one TYPE line may exist for a given metric name. The TYPE line for a metric name must appear before the 
   * first sample is reported for that metric name. If there is no TYPE line for a metric name, the type is 
   * set to untyped.
   */
  setMetricObject (aMetric, aValue, aType, aHelp) {
    let metricObject=this.getMetricObject (aMetric);
    if (metricObject==null) {
      metricObject={
        metric: aMetric,
        value: aValue,
        type: aType,
        help: aHelp
      };
      this.metricTracker.push(metricObject);  
    }
    
    metricObject.value=aValue;
  }  

  /**
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function
   */
  build () {
    let formatted="";

    let uptime=si.time();

    for (let i=0;i<this.metricTracker.length;i++) {
      let tempMetric=this.metricTracker[i];
      formatted = formatted.concat (this.addMetric (tempMetric.metric,tempMetric.value,tempMetric.type,tempMetric.help));
    }

    formatted = formatted.concat (this.addMetric ("eberly_node_system_uptime",uptime.uptime,this.METRIC_TYPE_COUNTER,"Uptime since metric service start"));

    if (this.memory!=null) {
      formatted = formatted.concat (this.addMetric ("eberly_node_system_memory_total",this.memory.total,this.METRIC_TYPE_COUNTER,"Total memory in bytes"));
      formatted = formatted.concat (this.addMetric ("eberly_node_system_memory_free",this.memory.free,this.METRIC_TYPE_COUNTER,"Not used in bytes"));
      formatted = formatted.concat (this.addMetric ("eberly_node_system_memory_used",this.memory.used,this.METRIC_TYPE_COUNTER,"Used (incl. buffers/cache)"));
      formatted = formatted.concat (this.addMetric ("eberly_node_system_memory_active",this.memory.active,this.METRIC_TYPE_COUNTER,"Used actively (excl. buffers/cache)"));
      formatted = formatted.concat (this.addMetric ("eberly_node_system_memory_buffcache",this.memory.buffcache,this.METRIC_TYPE_COUNTER,"Used by buffers+cache"));
      formatted = formatted.concat (this.addMetric ("eberly_node_system_memory_buffers",this.memory.buffers,this.METRIC_TYPE_COUNTER,"Used by buffers"));
      formatted = formatted.concat (this.addMetric ("eberly_node_system_memory_cached",this.memory.cached,this.METRIC_TYPE_COUNTER,"Used by cache"));
      formatted = formatted.concat (this.addMetric ("eberly_node_system_memory_slab",this.memory.slab,this.METRIC_TYPE_COUNTER,"Used by slab"));
      formatted = formatted.concat (this.addMetric ("eberly_node_system_memory_available",this.memory.available,this.METRIC_TYPE_COUNTER,"Potentially available (total - active)"));
      formatted = formatted.concat (this.addMetric ("eberly_node_system_memory_swaptotal",this.memory.swaptotal,this.METRIC_TYPE_COUNTER,"Total swap space available"));
      formatted = formatted.concat (this.addMetric ("eberly_node_system_memory_swapused",this.memory.swapused,this.METRIC_TYPE_COUNTER,"Total swap space used"));
      formatted = formatted.concat (this.addMetric ("eberly_node_system_memory_swapfree",this.memory.swapfree,this.METRIC_TYPE_COUNTER,"Total swap sace free"));
    }

    return formatted;
  }
}

//export default PrometheusMetrics;
module.exports = PrometheusMetrics;
