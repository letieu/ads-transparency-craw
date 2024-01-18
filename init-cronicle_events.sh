#!/bin/bash
#
# Check if API_KEY is set
if [ -z "$API_KEY" ]; then
    echo "API_KEY is not set. Please set the API_KEY environment variable."
    exit 1
fi

# load crawler host from environment, if not set, use default
if [ -z "$CRAWLER_HOST" ]; then
    CRAWLER_HOST="http://crawler:3000"
fi

# Create: create_crawl_job
echo "Create: create_crawl_job event"
curl -X POST \
  http://localhost:3012/api/app/create_event/v1?api_key=$API_KEY \
  -H 'Content-Type: application/json' \
  -d '{
    "enabled": 1,
    "params": {
        "method": "POST",
        "url": "'$CRAWLER_HOST'/create-crawl-jobs",
        "headers": "User-Agent: Cronicle/1.0",
        "data": "",
        "timeout": "60",
        "follow": 0,
        "ssl_cert_bypass": 0,
        "success_match": "",
        "error_match": ""
    },
    "timing": {
        "hours": [23],
        "minutes": [0]
    },
    "max_children": 1,
    "timeout": 3600,
    "catch_up": 0,
    "queue_max": 1000,
    "timezone": "Asia/Saigon",
    "plugin": "urlplug",
    "title": "create_crawl_job",
    "category": "general",
    "target": "allgrp",
    "algo": "random",
    "multiplex": 0,
    "stagger": 0,
    "retries": 2,
    "retry_delay": 2,
    "detached": 0,
    "queue": 0,
    "chain": "",
    "chain_error": "",
    "notify_success": "",
    "notify_fail": "",
    "web_hook": "",
    "cpu_limit": 0,
    "cpu_sustain": 0,
    "memory_limit": 0,
    "memory_sustain": 0,
    "log_max_size": 0,
    "notes": ""
}'

# # Create: crawl
echo "Create: crawl event"
curl -X POST \
  http://localhost:3012/api/app/create_event/v1?api_key=$API_KEY \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": 1,
    "params": {
      "method": "GET",
      "url": "https://postman-echo.com",
      "headers": "User-Agent: Cronicle/1.0; Content-Type: application/json; Connection: keep-alive",
      "data": "{ \"name\": \"test\" }",
      "timeout": "10000",
      "follow": 0,
      "ssl_cert_bypass": 0,
      "success_match": "",
      "error_match": ""
    },
    "timing": false,
    "max_children": 1,
    "timeout": 3600,
    "catch_up": 0,
    "queue_max": 100,
    "timezone": "Asia/Saigon",
    "plugin": "urlplug",
    "title": "background_crawl",
    "category": "general",
    "target": "allgrp",
    "algo": "random",
    "multiplex": 0,
    "stagger": 0,
    "retries": 0,
    "retry_delay": 0,
    "detached": 0,
    "queue": 1,
    "chain": "",
    "chain_error": "",
    "notify_success": "",
    "notify_fail": "",
    "web_hook": "",
    "cpu_limit": 0,
    "cpu_sustain": 0,
    "memory_limit": 0,
    "memory_sustain": 0,
    "log_max_size": 0,
    "notes": ""
}'

# Create: crawl by domain
echo "Create: crawl_by_domain event"
curl -X POST \
  http://localhost:3012/api/app/create_event/v1?api_key=$API_KEY \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": 1,
    "params": {
      "method": "GET",
      "url": "https://postman-echo.com",
      "headers": "User-Agent: Cronicle/1.0; Content-Type: application/json; Connection: keep-alive",
      "data": "{ \"name\": \"test\" }",
      "timeout": "10000",
      "follow": 0,
      "ssl_cert_bypass": 0,
      "success_match": "",
      "error_match": ""
    },
    "timing": false,
    "max_children": 1,
    "timeout": 3600,
    "catch_up": 0,
    "queue_max": 100,
    "timezone": "Asia/Saigon",
    "plugin": "urlplug",
    "title": "crawl_by_domain",
    "category": "general",
    "target": "allgrp",
    "algo": "random",
    "multiplex": 0,
    "stagger": 0,
    "retries": 0,
    "retry_delay": 0,
    "detached": 0,
    "queue": 1,
    "chain": "",
    "chain_error": "",
    "notify_success": "",
    "notify_fail": "",
    "web_hook": "",
    "cpu_limit": 0,
    "cpu_sustain": 0,
    "memory_limit": 0,
    "memory_sustain": 0,
    "log_max_size": 0,
    "notes": ""
}'
