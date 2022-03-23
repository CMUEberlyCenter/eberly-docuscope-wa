from flask import Flask, make_response, request
import ontopic

app = Flask(__name__)
driver=ontopic.OnTopic ();

##
#
##
@app.route("/api/v1/ping")
def ping():
  return (driver.ping());

##
#
##
@app.route("/api/v1/metrics")
def metrics():
  return (driver.metrics ());

##
#
##
@app.route("/api/v1/rules")
def rules():
  return (driver.rules ());  

##
#
##
@app.route("/api/v1/ontopic",methods = ['POST'])
def ontopic():
  return (driver.ontopic (request));    

if __name__ == '__main__':
  app.run(debug=True)
