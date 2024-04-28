# Post mortem

## Problem explanation

Not easy to see what's in the database and if everything it set as wanted.
My goal was to setup a GUI for the postgres database running in docker.

1. I did installed a new docker container with the following:

```yml
pgadmin:
  container_name: pgadmin
  image: "dpage/pgadmin4"
  ports:
    - 5050:80
  environment:
    PGADMIN_DEFAULT_EMAIL: example@email.com
    PGADMIN_DEFAULT_PASSWORD: password
  restart: unless-stopped
```

2. I was entering those steps to access the DB on `http://localhost:5050/`
  - Connect with the cred setup in the yml file
  - once connected, register a new server (right click on the left menu)
  - Put a meaningful name in `General` section
  - In the `Connection` tab, I've used:
    - Host name/address: `localhost`
    - Port: `5432`
    - Maintenance database: `postgres`
    - Username: `admin` from the env var `DATABASE_URL`
    - Password: same as above

3. I got an error message saying that the host was not accepting TCP/IP connection (see [here](https://www.pgadmin.org/docs/pgadmin4/development/connect_error.html))

4. Checked the Postgres connection configuration with those steps:
  - run `docker exec -it api-dev-db-1 bash` to access my container
  - run `cd /var/lib/postgresql/data` to navigate to the config file
  - check that `postgresql.conf` does contain `listen_addresses` field and must be set to `'*'`
  - It was the case
  - check that `pg_hba.conf` allow TCI/IP connection by having a line similar to `host all all 0.0.0.0/0 md5`
  - It was the case as well
  - Just exit typing the command `exit`

5. Problem fixed by following steps [here](https://stackoverflow.com/a/72595405/9018593).
  - Get docker container id via `docker ps` (eg: `a19741097fd2`)
  - Run `docker inspect CONTAINER_ID` (eg: `docker inspect a19741097fd2`)
  - Just had to replace in `Connection` the Host name/address from `localhost` to the IP address found in the `Network.bridge.IPAddress`
  - Alternatively run `docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' a19741097fd2`

6. If the problem persist, replace the IP address by this
- See: https://github.com/npgsql/efcore.pg/issues/225#issuecomment-532313931

6. It works 🥳
