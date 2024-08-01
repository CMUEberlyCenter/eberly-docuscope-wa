from flask import Flask, make_response, request
import logging
import sys
import ontopic

print ("Booting ...")
print (sys.version)

app = Flask(__name__)
driver = ontopic.OnTopic()

##
#
##
@app.route("/metrics")
def metrics():
  return (driver.metrics())

##
#
##
@app.route("/api/v1/ping")
def ping():
  return (driver.ping())

##
#
##
@app.route("/api/v1/rules")
def rules():
  return (driver.rules())

##
#
##
@app.route("/api/v1/ontopic",methods = ['POST'])
def ontopic():
  return (driver.ontopic(request))    

##
# If you run with app.run(debug=True), it will run the reloader as part of 
# debug mode. If you don't want to use debug mode, pass debug=False or 
# don't pass it at all.
##
if __name__ == '__main__':
  from waitress import serve
  logging.setLevel(logging.INFO)
  serve(app, host="0.0.0.0", port=5000)
  # app.run(debug=False)
  # app.run(host="0.0.0.0", port=5000, debug=False)
