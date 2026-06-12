#!/bin/bash
#Deploy the application to the Docker container 
#server OS : Ubuntu 22.04
#Author : Newton
#version : 1.0
#date : 12-06-2026
#download the code to the local machine
#update system and install git

sudo apt update -y
sudo apt install git -y

#docker installation
sudo apt install docker.io -y
#docker group setup
sudo usermod -aG docker $USER
#docker status check
source .bash_history
source .viminfo
source .Xauthority
source .bash_logout
source .bashrc
source .profile
sudo systemctl start docker
sudo systemctl enable docker    
if [ $? -ne 0 ]; 
    then
        echo "Failed to install Docker. Exiting."
    exit 1
fi

#download the code to the local machine
git clone https://github.com/newton9979/AWS_C03_tests.git
if [ $? -ne 0 ]; 
    then # varify the repository is cloned successfully
        if [ -d "AWS_C03_tests" ]; then
            echo "Repository cloned successfully."
            else
            echo "Repository not found. Exiting."
            exit 1
        fi
        else
    echo "Failed to clone the repository. Exiting."

fi  
#build the docker image
cd AWS_C03_tests
#run dockerfile to build the image
docker build -t exam-app:v1 .
if [ $? -ne 0 ]; then
    echo "Failed to build the Docker image. Exiting."
    exit 1
fi
#varifythe image is built successfully
docker images | grep exam-app
if [ $? -eq 0 ]; 
then  
    echo "Docker image found."
else
    echo "Docker image not found. Exiting."
    exit 1
fi
#build the docker container
docker run -d -p 8080:80 --name exam-app exam-app:v1
if [ $? -ne 0 ]; then
    echo "Failed to run the Docker container. Exiting."
    exit 1
fi
#varify the container is running successfully
docker ps | grep exam-app
if [ $? -eq 0 ];
then
    echo "Docker container is running."
else
    echo "Docker container is not running. Exiting."
    exit 1
fi
#Access the application in the browser using the server's IP address and port 8080 (http://<server-ip>:8080) to verify that it is working correctly. 
IPAdderss=$(curl -s https://checkip.amazonaws.com)
echo "$IPAdderss:8080"


