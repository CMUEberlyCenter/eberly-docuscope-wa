# Via: https://docs.locust.io/en/stable/quickstart.html#quickstart
#
# Common options:
#  -h, --help            show this help message and exit
#  -f LOCUSTFILE, --locustfile LOCUSTFILE
#                        Python module to import, e.g. '../other_test.py'. Either a .py file or a package directory. Defaults to 'locustfile'
#  --config CONFIG       Config file path
#  -H HOST, --host HOST  Host to load test in the following format: http://10.21.32.33
#  -u NUM_USERS, --users NUM_USERS
#                        Peak number of concurrent Locust users. Primarily used together with --headless or --autostart. Can be changed during a test by keyboard inputs w, W (spawn
#                        1, 10 users) and s, S (stop 1, 10 users)
#  -r SPAWN_RATE, --spawn-rate SPAWN_RATE
#                        Rate to spawn users at (users per second). Primarily used together with --headless or --autostart
#  -t RUN_TIME, --run-time RUN_TIME
#                        Stop after the specified amount of time, e.g. (300s, 20m, 3h, 1h30m, etc.). Only used together with --headless or --autostart. Defaults to run forever.
#  -l, --list            Show list of possible User classes and exit

clear
locust -f ./script.py --host https://projects.eberly.cmu.edu -u 10 -t 30s --headless --autostart
