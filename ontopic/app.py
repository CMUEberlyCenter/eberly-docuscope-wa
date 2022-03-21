from flask import Flask, make_response
import ontopic

app = Flask(__name__)
driver=ontopic.OnTopic ();

##
#
##
@app.route("/api/ontopic/ping")
def ping():
  return (driver.ping());

##
#
##
@app.route("/api/ontopic/metrics")
def metrics():
  return (driver.metrics ());

##
#
##
@app.route("/api/ontopic/rules")
def rules():
  return (driver.getRules ());  

if __name__ == '__main__':
  app.run(debug=True)
