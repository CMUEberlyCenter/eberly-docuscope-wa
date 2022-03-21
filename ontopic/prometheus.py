import os, threading, psutil, platform;
from datetime import datetime
import time

##
#
##
class PythonPrometheus:

  METRIC_TYPE_COUNTER = "counter";
  METRIC_TYPE_GAUGE = "gauge";
  METRIC_TYPE_HISTOGRAM = "histogram";
  METRIC_TYPE_SUMMARY = "summary";
  METRIC_TYPE_UNTYPED = "untyped";  

  def __init__(self):
    print ("PythonPrometheus()");
    self.boottime = datetime.now()
    self.starttime = time.time()
    self.nowtime = time.time()
    current_time = self.boottime.strftime("%H:%M:%S")
    print("Service started at: ", current_time)

  ##
  # If the token is TYPE, exactly two more tokens are expected. The first is the metric name, and the second is 
  # either counter, gauge, histogram, summary, or untyped, defining the type for the metric of that name. Only 
  # one TYPE line may exist for a given metric name. The TYPE line for a metric name must appear before the 
  # first sample is reported for that metric name. If there is no TYPE line for a metric name, the type is 
  # set to untyped.
  ##
  def addMetric (self, aMetric, aValue, aType, aHelp):
    formatted="";  
    formatted = formatted + ("# HELP " + aHelp + "\n");
    formatted = formatted + ("# TYPE " + aMetric + " " + aType + "\n");
    formatted = formatted + (aMetric + " " + aValue + "\n");  
    return (formatted);

  ##
  #
  #
  def metrics (self):
    self.nowtime = time.time()

    formatted = "";
    formatted = formatted + self.addMetric ("node_system_uptime",str(self.nowtime - self.starttime),PythonPrometheus.METRIC_TYPE_COUNTER,"Uptime since metric service start");
    formatted = formatted + self.addMetric ("node_system_memory_used",str(psutil.Process(os.getpid()).memory_info().rss / 1024 ** 2),PythonPrometheus.METRIC_TYPE_COUNTER,"Total memory used in bytes");
    formatted = formatted + self.addMetric ("node_system_thread_count",str(threading.active_count()),PythonPrometheus.METRIC_TYPE_COUNTER,"Total amount of threads in this application");
    return(formatted);
