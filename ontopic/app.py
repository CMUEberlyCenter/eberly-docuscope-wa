import os, threading, psutil, platform
from flask import Flask, make_response
import prometheus

app = Flask(__name__)
driver=prometheus.PythonPrometheus ()

##
#
##
@app.route("/api/ontopic/ping")
def ping():
  memInString = "<tr><td>" + str(psutil.Process(os.getpid()).memory_info().rss / 1024 ** 2) + " Mb</td></tr>";
  # https://docs.python.org/3/library/threading.html
  threadString = "<tr><td>" + str(threading.active_count()) + " threads</td></tr>";
  machineString = "<tr><td>" + platform.machine() + "</td></tr>"
  versionString = "<tr><td>" + platform.version() + "</td></tr>"
  platformString = "<tr><td>" + platform.platform() + "</td></tr>"
  nameString = "<tr><td>" + str(platform.uname()) + "</td></tr>"
  systemString = "<tr><td>" + platform.system() + "</td></tr>"
  cpuString = "<tr><td>" + platform.processor() + "</td></tr>"
  return ("<html><body><table>" + memInString+threadString+machineString+versionString+platformString+nameString+systemString+cpuString + "<table></body></html>");

##
#
##
@app.route("/api/ontopic/metrics")
def metrics():
  response = make_response(driver.metrics(), 200)
  response.mimetype = "text/plain"
  return response

if __name__ == '__main__':
  app.run(debug=True)

