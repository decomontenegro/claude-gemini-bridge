#!/bin/bash

# Claude-Gemini Bridge Runner
cd "$(dirname "$0")"
node dist/index.js "$@"