#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SetupStack } from '../lib/setup-stack';
import { WordpressStack } from '../lib/wordpress-stack';

const app = new cdk.App();
new SetupStack(app, 'WordPress-Setup-Stack', {
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});

new WordpressStack(app, 'WordPress-Infrastructure-Stack', {
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});