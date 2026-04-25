pipeline {
    agent any

    environment {
        AWS_REGION = "us-east-1"
        ECR_URI = "280019642606.dkr.ecr.us-east-1.amazonaws.com/fixmycity"
        APP_SERVER_IP = "98.95.245.91"
        IMAGE_TAG = "${BUILD_NUMBER}"
    }

    stages {
        stage("Install and Build") {
            steps {
                withCredentials([
                    string(credentialsId: "VITE_SUPABASE_URL", variable: "SUPABASE_URL"),
                    string(credentialsId: "VITE_SUPABASE_ANON_KEY", variable: "SUPABASE_KEY")
                ]) {
                    sh '''
                    bash -lc "
                    export NVM_DIR=/home/ec2-user/.nvm
                    source \\$NVM_DIR/nvm.sh
                    nvm use 20
        
                    export VITE_SUPABASE_URL=$SUPABASE_URL
                    export VITE_SUPABASE_ANON_KEY=$SUPABASE_KEY
        
                    node -v
                    npm -v
                    npm install
                    npm run build
                    "
                    '''
                }
            }
        }

        stage("Docker Build") {
            steps {
                withCredentials([
                    string(credentialsId: "VITE_SUPABASE_URL", variable: "SUPABASE_URL"),
                    string(credentialsId: "VITE_SUPABASE_ANON_KEY", variable: "SUPABASE_KEY")
                ]) {
                    sh '''
                    docker build \
                    --build-arg VITE_SUPABASE_URL=$SUPABASE_URL \
                    --build-arg VITE_SUPABASE_ANON_KEY=$SUPABASE_KEY \
                    -t fixmycity:${IMAGE_TAG} .

                    docker tag fixmycity:${IMAGE_TAG} ${ECR_URI}:latest
                    docker tag fixmycity:${IMAGE_TAG} ${ECR_URI}:${IMAGE_TAG}
                    '''
                }
            }
        }

        stage("Push to ECR") {
            steps {
                sh '''
                aws ecr get-login-password --region ${AWS_REGION} \
                | docker login --username AWS --password-stdin ${ECR_URI}

                docker push ${ECR_URI}:latest
                docker push ${ECR_URI}:${IMAGE_TAG}
                '''
            }
        }

        stage("Deploy to EC2") {
            steps {
                sshagent(["app-server-key"]) {
                    sh '''
                    ssh -o StrictHostKeyChecking=no ec2-user@${APP_SERVER_IP} << EOF
                    aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_URI}
                    docker pull ${ECR_URI}:latest
                    docker stop fixmycity 2>/dev/null || true
                    docker rm fixmycity 2>/dev/null || true
                    docker run -d --name fixmycity --restart unless-stopped -p 80:80 ${ECR_URI}:latest
                    docker image prune -f
EOF
                    '''
                }
            }
        }
    }

    post {
        success {
            echo "Live at http://${APP_SERVER_IP}"
        }
        failure {
            echo "Build failed — check stage logs above."
        }
        always {
            cleanWs()
        }
    }
}
