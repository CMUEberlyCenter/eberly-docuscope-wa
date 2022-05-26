import time, json
from locust import HttpUser, task, between

class EberlyTestUser(HttpUser):
    wait_time = between(1.0, 3.0)
    
    def on_start(self):
        """ on_start is called when a Locust start before any task is scheduled """
        pass

    def on_stop(self):
        """ on_stop is called when the TaskSet is stopping """
        pass

    @task(1)
    def api_page(self):
        payload = {
          "status": "request",
          "data": {
            "base": "SSUyMGFtJTIwYXBwbHlpbmclMjBmb3IlMjB0aGUlMjBHcmFkdWF0ZSUyMEFzc2lzdGFudCUyMHBvc2l0aW9uJTIwYXQlMjBDcmFuZSUyMCUyNiUyMEplbmtpbnMlMjBVbml2ZXJzaXR5LiUyMEFzJTIwYSUyMFNwb3J0cyUyMFN0dWRpZXMlMjBncmFkdWF0ZSUyMHN0dWRlbnQlMjBhdCUyMHRoZSUyMHVuaXZlcnNpdHklMkMlMjBJJTIwYW0lMjBlYWdlciUyMHRvJTIwc3RhcnQlMjBhJTIwcG9zaXRpb24lMjB0byUyMHN1cHBsZW1lbnQlMjBteSUyMHN0dWRpZXMuJTIwSSUyMGhhdmUlMjBrbm93bGVkZ2UlMjBvZiUyMGljZSUyMGhvY2tleSUyQyUyMGZpZWxkJTIwaG9ja2V5JTJDJTIwYmFkbWludG9uJTIwYW5kJTIwZ3ltbmFzdGljcyUyQyUyMHdoaWNoJTIwYXJlJTIwYWxsJTIwc3BvcnRzJTIwdGhlJTIwdW5pdmVyc2l0eSUyMG9mZmVycy4lMjBGdXJ0aGVybW9yZSUyQyUyMEklMjBhbSUyMGNyZWF0aXZlJTJDJTIwZmFzdC10aGlua2luZyUyMGFuZCUyMGlubm92YXRpdmUlMjBhbmQlMjBncmVhdCUyMGF0JTIwYW5hbHl6aW5nJTIwZ2FtZSUyMGZvb3RhZ2UuJTIwSSUyMGFtJTIwdGhyaWxsZWQlMjBhYm91dCUyMHRoZSUyMGlkZWElMjBvZiUyMGhlbHBpbmclMjBvdXQlMjB0aGUlMjBkZXBhcnRtZW50JTJDJTIwdGhlJTIwc3R1ZGVudC1hdGhsZXRlcyUyMGFuZCUyMHRoZSUyMGZhbnMuJTBBJTBBJTBBJTBBQXQlMjBDb3JhbCUyMFNwcmluZ3MlMjBVbml2ZXJzaXR5JTJDJTIwSSUyMHNlcnZlZCUyMGFzJTIwdGhlJTIwTWFya2V0aW5nJTIwSW50ZXJuJTIwZm9yJTIwdGhlJTIwRGVwYXJ0bWVudCUyMG9mJTIwQXRobGV0aWNzJTJDJTIwc3BlY2lmaWNhbGx5JTIwZm9yJTIwbWVuJUUyJTgwJTk5cyUyMGljZSUyMGhvY2tleSUyMGFuZCUyMHRoZSUyMHdvbWVuJUUyJTgwJTk5cyUyMGd5bW5hc3RpY3MlMjB0ZWFtcy4lMjBJJTIwcHV0JTIwdG9nZXRoZXIlMjBnYW1lLWRheSUyMHJvc3RlcnMlMkMlMjBwbGF5LWJ5LXBsYXklMjB2aWRlb3MlMjBhbmQlMjBtZWRpYSUyMGd1aWRlcy4lMjBJJTIwYWxzbyUyMHNob3QlMjBwcmFjdGljZSUyMGZvb3RhZ2UlMkMlMjBpbnRlcnZpZXdlZCUyMHN0dWRlbnQtYXRobGV0ZXMlMjBhbmQlMjBtYW5hZ2VkJTIwZ2FtZS1kYXklMjBwcm9tb3Rpb25zLiUyMEklMjBhc3Npc3RlZCUyMGluJTIwY3JlYXRpbmclMjBhJTIwcG9zaXRpdmUlMjBlbnZpcm9ubWVudCUyMGZvciUyMGZhbnMlMkMlMjBhdGhsZXRlcyUyMGFuZCUyMHN0YWZmJTIwbWVtYmVycy4lMEElMEElMEElMEFUaGUlMjBDcmFuZSUyMCUyNiUyMEplbmtpbnMlMjBDcmFuZXMlMjBjYW4lMjBhbHdheXMlMjB1c2UlMjBtb3JlJTIwZmFucyUyMGF0JTIwdGhlaXIlMjBnYW1lcy4lMjBUaHJvdWdoJTIwbXklMjBpbnRlcm5zaGlwJTJDJTIwSSVFMiU4MCU5OXZlJTIwZ2FpbmVkJTIwZXhwZXJpZW5jZSUyMHdpdGglMjBjcmVhdGluZyUyMGV5ZS1jYXRjaGluZyUyMG1hcmtldGluZyUyMG1hdGVyaWFscyUyMHRoYXQlMjBoYXZlJTIwYmVlbiUyMHByb3ZlbiUyMHRvJTIwaW5jcmVhc2UlMjBnYW1lJTIwYXR0ZW5kYW5jZS4lMjBJJTIwdGhyaXZlJTIwb24lMjB0aGUlMjBuZXJ2ZXMlMjBvZiUyMGdhbWUlMjBkYXlzJTIwYW5kJTIwdGlnaHQlMjBkZWFkbGluZXMuJTIwV2l0aCUyMGElMjBnb2FsJTIwdG8lMjBpbmNyZWFzZSUyMHN0dWRlbnQlMjBhdHRlbmRhbmNlJTIwYXQlMjB0aGUlMjBtYWpvciUyMGhvY2tleSUyMGdhbWUlMjBvZiUyMHRoZSUyMHNlYXNvbiUyQyUyMEklMjBzcGVhcmhlYWRlZCUyMGFuJTIwb24tY2FtcHVzJTIwdGlja2V0JTIwZ2l2ZWF3YXklMkMlMjBhbmQlMjA4MCUyNSUyMG1vcmUlMjBzdHVkZW50cyUyMGNsYWltZWQlMjB0aGVpciUyMHRpY2tldHMlMjB0aGFuJTIwaW4lMjB5ZWFycyUyMHBhc3QuJTBBJTBBJTBBJTBBQXR0YWNoZWQlMjBpcyUyMG15JTIwcmVzdW1lJTIwZm9yJTIweW91ciUyMHJldmlldy4lMjBUaGFuayUyMHlvdSUyMGZvciUyMHlvdXIlMjBjb25zaWRlcmF0aW9uLiUyMEklMjBsb29rJTIwZm9yd2FyZCUyMHRvJTIwbGVhcm5pbmclMjBtb3JlJTIwYWJvdXQlMjB0aGUlMjBHcmFkdWF0ZSUyMEFzc2lzdGFudCUyMHBvc2l0aW9uJTIwYXQlMjBDcmFuZSUyMCUyNiUyMEplbmtpbnMlMjBVbml2ZXJzaXR5LiUyMEklMjBiZWxpZXZlJTIwdGhhdCUyMEklMjB3b3VsZCUyMGJlJTIwYW4lMjBleGNlbGxlbnQlMjBtYXRjaCUyMGZvciUyMHRoZSUyMHJvbGUlMjBhbmQlMjB0aGUlMjBwb3NpdGlvbiUyMGFsaWducyUyMHdpdGglMjBteSUyMHNraWxscyUyMGFuZCUyMGludGVyZXN0cy4lMjBHZXR0aW5nJTIwZXhwZXJpZW5jZSUyMGluJTIweW91ciUyMGF0aGxldGljJTIwZGVwYXJ0bWVudCUyMHdvdWxkJTIwaGVscCUyMG1lJTIwZ2V0JTIwY2xvc2VyJTIwdG8lMjBteSUyMGdvYWwlMjBvZiUyMGJlaW5nJTIwdGhlJTIwTWFya2V0aW5nJTIwRGlyZWN0b3IlMjBvZiUyMGElMjB0ZWFtLiUwQSUwQQ=="
          }
        }
        
        headers = {
          'content-type': 'application/json'
        }
        
        response = self.client.post("/api/v1/ontopic", data=json.dumps(payload), headers=headers)