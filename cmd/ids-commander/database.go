package main

import (
	"database/sql"
	"fmt"
	"io"
	"log"
	"net"
	"os"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"golang.org/x/crypto/ssh"
)

func getDB() (*sql.DB, error) {
	dbMu.Lock()
	defer dbMu.Unlock()

	if globalDB != nil {
		if err := globalDB.Ping(); err == nil {
			return globalDB, nil
		}
		log.Printf("[DB] Connection lost, reconnecting...")
		if globalCleanup != nil {
			globalCleanup()
		}
		globalDB.Close()
		globalDB = nil
	}

	db, cleanup, err := createDBConnection()
	if err != nil {
		return nil, err
	}
	globalDB = db
	globalCleanup = cleanup
	return globalDB, nil
}

func createDBConnection() (*sql.DB, func(), error) {
	dbHost := strings.TrimSpace(os.Getenv("MYSQL_HOST"))
	if dbHost == "" {
		dbHost = "localhost"
	}
	dbUser := strings.TrimSpace(os.Getenv("MYSQL_USER"))
	if dbUser == "" {
		dbUser = "root"
	}
	dbPwd := strings.TrimSpace(os.Getenv("MYSQL_PASSWORD"))
	dbName := strings.TrimSpace(os.Getenv("MYSQL_DB"))
	if dbName == "" {
		dbName = "deploy_logs"
	}
	dbPort := strings.TrimSpace(os.Getenv("MYSQL_PORT"))
	if dbPort == "" {
		dbPort = "3306"
	}

	appEnv := strings.ToLower(strings.TrimSpace(os.Getenv("APP_ENV")))
	if appEnv == "" {
		appEnv = "local"
	}
	useSSH := strings.ToLower(strings.TrimSpace(os.Getenv("USE_SSH"))) == "true" || appEnv == "local"

	log.Printf("[DB] Config: APP_ENV=%s, USE_SSH=%s (effective useSSH=%v)", os.Getenv("APP_ENV"), os.Getenv("USE_SSH"), useSSH)

	var cleanup func() = func() {}

	if useSSH && appEnv == "local" {
		sshHost := strings.TrimSpace(os.Getenv("SSH_HOST"))
		sshPort := strings.TrimSpace(os.Getenv("SSH_PORT"))
		if sshPort == "" {
			sshPort = "22"
		}
		sshUser := strings.TrimSpace(os.Getenv("SSH_USER"))
		sshKey := strings.TrimSpace(os.Getenv("SSH_KEY_PATH"))
		sshPwd := strings.TrimSpace(os.Getenv("SSH_PASSWORD"))

		if sshHost != "" && sshUser != "" {
			log.Printf("[SSH] Connecting to %s:%s as %s...", sshHost, sshPort, sshUser)
			var auth []ssh.AuthMethod
			if sshKey != "" {
				key, err := os.ReadFile(sshKey)
				if err != nil {
					log.Printf("[SSH] Error reading key %s: %v", sshKey, err)
					return nil, cleanup, fmt.Errorf("failed to read SSH key: %v", err)
				}
				signer, err := ssh.ParsePrivateKey(key)
				if err != nil {
					log.Printf("[SSH] Error parsing key %s: %v", sshKey, err)
					return nil, cleanup, fmt.Errorf("failed to parse SSH key: %v", err)
				}
				auth = append(auth, ssh.PublicKeys(signer))
			} else {
				auth = append(auth, ssh.Password(sshPwd))
			}

			sshConfig := &ssh.ClientConfig{
				User:            sshUser,
				Auth:            auth,
				HostKeyCallback: ssh.InsecureIgnoreHostKey(),
				Timeout:         10 * time.Second,
			}

			sshClient, err := ssh.Dial("tcp", net.JoinHostPort(sshHost, sshPort), sshConfig)
			if err != nil {
				log.Printf("[SSH] Dial error: %v", err)
				return nil, cleanup, fmt.Errorf("failed to connect to SSH: %v", err)
			}
			log.Printf("[SSH] Connected successfully")

			localListener, err := net.Listen("tcp", "127.0.0.1:0")
			if err != nil {
				sshClient.Close()
				return nil, cleanup, fmt.Errorf("failed to start local listener for SSH: %v", err)
			}

			localPort := localListener.Addr().(*net.TCPAddr).Port
			log.Printf("[SSH] Local tunnel listener on 127.0.0.1:%d", localPort)

			go func() {
				for {
					localConn, err := localListener.Accept()
					if err != nil {
						return
					}

					log.Printf("[SSH] Tunnel: Accepted local connection, dialing remote %s:%s...", dbHost, dbPort)
					remoteConn, err := sshClient.Dial("tcp", net.JoinHostPort(dbHost, dbPort))
					if err != nil {
						log.Printf("[SSH] Tunnel: Dial remote error: %v", err)
						localConn.Close()
						continue
					}
					log.Printf("[SSH] Tunnel: Connected to remote DB host")

					go func() {
						defer localConn.Close()
						defer remoteConn.Close()
						io.Copy(localConn, remoteConn)
					}()
					go func() {
						defer localConn.Close()
						defer remoteConn.Close()
						io.Copy(remoteConn, localConn)
					}()
				}
			}()

			cleanup = func() {
				log.Printf("[SSH] Closing tunnel and client")
				localListener.Close()
				sshClient.Close()
			}

			dsn := fmt.Sprintf("%s:%s@tcp(127.0.0.1:%d)/%s?parseTime=true", dbUser, dbPwd, localPort, dbName)
			db, err := sql.Open("mysql", dsn)
			return db, cleanup, err
		}
	}

	log.Printf("[DB] Connecting directly to %s:%s...", dbHost, dbPort)
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true", dbUser, dbPwd, dbHost, dbPort, dbName)
	db, err := sql.Open("mysql", dsn)
	return db, cleanup, err
}

func logToDB(userName, serviceName, env, branch, message, status string) error {
	db, err := getDB()
	if err != nil {
		return err
	}

	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS deployments (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_name VARCHAR(100), service VARCHAR(100),
			environment VARCHAR(50), branch VARCHAR(100),
			message TEXT,
			status VARCHAR(50),
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		return err
	}

	var colName string
	err = db.QueryRow("SELECT column_name FROM information_schema.columns WHERE table_name = 'deployments' AND column_name = 'status'").Scan(&colName)
	if err == sql.ErrNoRows {
		log.Printf("[DB] Adding status column to deployments table")
		db.Exec("ALTER TABLE deployments ADD COLUMN status VARCHAR(50) DEFAULT 'Success'")
	}

	_, err = db.Exec(`
		INSERT INTO deployments (user_name, service, environment, branch, message, status, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, userName, serviceName, env, branch, message, status, time.Now())

	return err
}
