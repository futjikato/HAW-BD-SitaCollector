#!/bin/sh
if ! id "appu" >/dev/null 2>&1; then
    adduser --disabled-password --gecos "" appu
fi
cd /app
export DEBUG=*
exec /sbin/setuser appu node index.js
