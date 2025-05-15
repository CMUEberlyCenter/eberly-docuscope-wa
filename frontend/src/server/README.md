For testing LTI connection with a local docker Moodle instance:

Setup:

1. go to Site administration > External tool > Manage tools.
1. Use Add LTI Advantage button to initialize tool.
1. Approve for usage.
1. Edit tool and change Public keyset url to http://host.dock.internal:8088/keys
1. May need to adjust security settings in Site administration > Security > HTTP security to allow localhost and service ports (8088)
