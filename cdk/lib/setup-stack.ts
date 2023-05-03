import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { CfnParameter } from 'aws-cdk-lib';

export class SetupStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const environment = new CfnParameter(this, 'environment', {
      type: 'String',
      description: 'The environment to deploy to',
      default: 'dev',
      allowedValues: ['dev', 'uat', 'prod'],
    });

    const repository = new ecr.Repository(this, 'ecr-repository', {
      repositoryName: `wordpress-${environment.valueAsString}`,
      imageTagMutability: ecr.TagMutability.IMMUTABLE,
      imageScanOnPush: true,
      encryption: ecr.RepositoryEncryption.KMS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

  }
}
