# IdealOS Sidecar

Sidecar is a local web-based debugger app for IdealOS. It's written in React and should run on the same machine as your
IdealOS instance.

Sidecar lets you connect to a running IdealOS instance, list the apps, view the logs, and visually interact
with the OS, just like the main display server. Thus it serves as an alternate implementation of the
Display API for IdealOS (the other one is written in native Rust code).



connection button on the side
refresh apps button
app inspector: list of apps, details of each app, view messages for just that app
log: views all logs. set limit. filter to show app logs, server logs, drawing commands
desktop: acts as a desktop client.