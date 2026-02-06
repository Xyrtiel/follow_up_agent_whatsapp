#!/bin/bash
set -e

# Log to help debugging init-time execution
echo "Executing /docker-entrypoint-initdb.d/init-mongo.sh"

mongosh <<EOF
use admin
// Authenticate as the root user created by Docker's MONGO_INITDB_* variables
if (!db.auth('$MONGO_INITDB_ROOT_USERNAME', '$MONGO_INITDB_ROOT_PASSWORD')) {
  throw new Error('Root authentication failed')
}

// Create the application user in the application database (idempotent)
use $MONGO_INITDB_DATABASE
if (!db.getUser('$APP_DB_USER')) {
  db.createUser({
    user: '$APP_DB_USER',
    pwd: '$APP_DB_PASSWORD',
    roles: [{ role: 'readWrite', db: '$MONGO_INITDB_DATABASE' }]
  })
} else {
  print('User $APP_DB_USER already exists in $MONGO_INITDB_DATABASE')
}
EOF