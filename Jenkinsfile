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
                    additionalArguments: '--project "Blog" --scan . --format XML --failOnCVSS 7'
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
                sh 'docker run --rm -v "$WORKSPACE:/usr/src/app" -w /usr/src/app node:20-alpine'
                sh -c "apk add --no-cache python3 py3-pip build-base && npm ci && npm test"'
            }
        }
        stage('Build') {
            steps {
                sh 'docker build --pull --rm -f "Dockerfile" -t blog:latest "."'
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
                sh 'nikto -h http://192.168.196.131:3000'
            }
        }
    }
}