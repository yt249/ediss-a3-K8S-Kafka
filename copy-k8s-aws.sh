#!/bin/bash

AWS_URL='ec2-user@ec2-13-216-70-18.compute-1.amazonaws.com:/home/ec2-user'

# Copy current make file
scp -i $(PWD)/labsuser.pem $(PWD)/Makefile ${AWS_URL}
# Copy all k8s files
scp -i $(PWD)/labsuser.pem $(PWD)/k8s/* ${AWS_URL}/k8s
# Copy all bff-web k8s files
scp -i $(PWD)/labsuser.pem $(PWD)/bff-web/k8s/* ${AWS_URL}/bff-web/k8s
# Copy all bff-mobile k8s files
scp -i $(PWD)/labsuser.pem $(PWD)/bff-mobile/k8s/* ${AWS_URL}/bff-mobile/k8s
# Copy all customer-service k8s files
scp -i $(PWD)/labsuser.pem $(PWD)/customer-service/k8s/* ${AWS_URL}/customer-service/k8s
# Copy all book-service k8s files
scp -i $(PWD)/labsuser.pem $(PWD)/book-service/k8s/* ${AWS_URL}/book-service/k8s
# Copy all crm-service k8s files
scp -i $(PWD)/labsuser.pem $(PWD)/crm-service/k8s/* ${AWS_URL}/crm-service/k8s