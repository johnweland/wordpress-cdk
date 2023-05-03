import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CfnParameter } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as efs from 'aws-cdk-lib/aws-efs';

export class WordpressStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const environment = new CfnParameter(this, 'environment', {
      type: 'String',
      description: 'The environment to deploy to',
      default: 'dev',
      allowedValues: ['dev', 'uat', 'prod'],
    });

    // create resources to run wordpress using aws ecs fargate, aurora serverless, efs, s3 and cloudfront
    const vpc = new ec2.Vpc(this, 'VPC', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          name: 'protected',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // create security groups
    const httpSecurityGroup = new ec2.SecurityGroup(this, 'HTTPSecurityGroup', {
      vpc,
      securityGroupName: `wordpress-${environment.valueAsString}-http-sg`,
      description: 'Allow HTTP access to the ECS cluster',
    });
    httpSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP access from anywhere');
    httpSecurityGroup.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(0), 'Allow HTTP access to anywhere');

    const httpsSecurityGroup = new ec2.SecurityGroup(this, 'HTTPSSecurityGroup', {
      vpc,
      securityGroupName: `wordpress-${environment.valueAsString}-https-sg`,
      description: 'Allow HTTPS access to the ECS cluster',
    });
    httpsSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS access from anywhere');
    httpsSecurityGroup.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(0), 'Allow HTTPS access to anywhere');

    const serviceSecurityGroup = new ec2.SecurityGroup(this, 'ServiceSecurityGroup', {
      vpc,
      securityGroupName: `wordpress-${environment.valueAsString}-service-sg`,
      description: 'Allow access to the ECS cluster',
    });

    const databaseSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc,
      securityGroupName: `wordpress-${environment.valueAsString}-database-sg`,
      description: 'Allow access to the database',
    });
    databaseSecurityGroup.addIngressRule(serviceSecurityGroup, ec2.Port.tcp(3306), 'Allow access from the ECS cluster');

    const efsSecurityGroup = new ec2.SecurityGroup(this, 'EFSSecurityGroup', {
      vpc,
      securityGroupName: `wordpress-${environment.valueAsString}-efs-sg`,
      description: 'Allow access to the EFS file system',
    });
    efsSecurityGroup.addIngressRule(serviceSecurityGroup, ec2.Port.tcp(2049), 'Allow access from the ECS cluster');

    const filesystem = new efs.FileSystem(this, 'EFS', {
      vpc,
      fileSystemName: `wordpress-${environment.valueAsString}-efs`,
      securityGroup: efsSecurityGroup,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encrypted: true,
      lifecyclePolicy: efs.LifecyclePolicy.AFTER_14_DAYS,
      performanceMode: efs.PerformanceMode.GENERAL_PURPOSE,
      throughputMode: efs.ThroughputMode.BURSTING,
      vpcSubnets: {
        subnets: vpc.privateSubnets
      }
    });

    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      clusterName: `wordpress-${environment.valueAsString}-cluster`,
    });

    new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'FargateService', {
      cluster,
      taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry('wordpress:latest'),
        containerPort: 80,
      },
      memoryLimitMiB: 2048,
      cpu: 1024,
      desiredCount: 1,
      publicLoadBalancer: true,
    });
  }
}
