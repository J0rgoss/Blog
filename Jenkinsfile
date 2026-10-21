pipeline {
    agent any
    stages {
        stage('Checkout') {
            steps {
                sh 'git pull origin main'
            }
        }
        stage('OWASP Dependency Check') {
            steps {
                dependencyCheck(
                    odcInstallation: 'Dependency-Check',
                    nvdCredentialsId: 'nvd-api-key',
                    additionalArguments: '--data "$HOME/.dependency-check/data" --failOnCVSS 7'
                )
            }
            post {
                always {
                    dependencyCheckPublisher pattern: '**/dependency-check-report.xml'
                }
            }
        }
        stage('Unit Tests') {
            steps {
                sh 'docker run --rm -v "$WORKSPACE:/usr/src/app" -w /usr/src/app node:20-alpine sh -c "apk add --no-cache python3 py3-pip build-base && npm ci && npm test"'
            }
        }
        stage('Build') {
            steps {
                sh 'docker build --pull --rm -f "Dockerfile" -t blog:latest "."'
            }
        }
        stage('Trivy Image Scan') {
            steps {
                sh 'docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v trivy-cache:/root/.cache/ aquasec/trivy:0.76.0 image --scanners vuln --exit-code 1 --severity HIGH,CRITICAL blog:latest'
            }
        }
        stage('Run') {
            steps {
                sh 'docker stop blog || true'
                sh 'docker rm blog || true'
                sh 'docker run -d -p 3000:3000 --name blog blog'
            }
        }
        stage('Nikto Scan') {
            steps {
                sh '''
                    for attempt in $(seq 1 30); do
                        if curl --silent --show-error --fail --output /dev/null http://127.0.0.1:3000/; then
                            break
                        fi
                        if [ "$attempt" -eq 30 ]; then
                            docker logs blog
                            echo "Blog did not become reachable on 127.0.0.1:3000"
                            exit 1
                        fi
                        sleep 2
                    done
                    nikto -h http://127.0.0.1:3000
                '''
            }
        }
    }
}