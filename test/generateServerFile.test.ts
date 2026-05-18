import { strict as assert } from 'node:assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { Node, Project, SyntaxKind } from 'ts-morph';
import { generateServerFile } from '../src/files/generateServerFile.ts';
import { DefaultProjectSettings } from '../src/helpers/index.ts';

const fixtureDirectory = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'generateServerFile-regression',
);

const schema = {
  name: 'regression-service',
  description: 'Regression schema for generateServerFile',
  methods: {
    ping: {
      action: 'ping',
      description: 'Ping method',
      request: {
        type: 'object',
        properties: {},
      },
      response: {
        type: 'object',
        properties: {},
      },
      options: {},
    },
  },
  events: {
    streamOptions: {
      prefix: 'regression',
      actions: {
        action: 'user.created',
        storage: 'file',
        retentionPolicy: 'limits',
        discardPolicy: 'old',
        duplicateTrackingTime: 1000,
        replication: 1,
        rollUps: false,
      },
    },
    list: {
      userCreated: {
        action: 'user.created',
        description: 'User created event',
        options: {
          stream: true,
        },
        event: {
          type: 'object',
          properties: {},
        },
      },
    },
  },
};

test('generateServerFile updates only new Service(...) when events are added', async () => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'nsc-cli-generate-server-file-'));

  try {
    await fs.cp(fixtureDirectory, tempDirectory, { recursive: true });

    const project = new Project(DefaultProjectSettings);

    await generateServerFile({
      project,
      schema,
      directoryPath: tempDirectory,
      schemaFileName: 'service.schema',
    });

    const serviceFilePath = path.join(tempDirectory, 'service.ts');
    const updatedProject = new Project(DefaultProjectSettings);
    updatedProject.addSourceFileAtPath(serviceFilePath);
    const updatedFile = updatedProject.getSourceFileOrThrow(serviceFilePath);
    const newExpressions = updatedFile
      .getFunctionOrThrow('main')
      .getDescendantsOfKind(SyntaxKind.NewExpression);

    const serviceExpression = newExpressions.find(expression => expression.getExpression().getText() === 'Service');
    const semanticExpression = newExpressions.find(
      expression => expression.getExpression().getText() === 'SemanticEmbeddingService',
    );

    assert.ok(serviceExpression, 'Expected to find Service constructor call');
    assert.ok(semanticExpression, 'Expected to find SemanticEmbeddingService constructor call');

    const serviceConfig = serviceExpression.getArguments().find(Node.isObjectLiteralExpression);
    const semanticConfig = semanticExpression.getArguments().find(Node.isObjectLiteralExpression);

    assert.ok(serviceConfig, 'Expected Service to receive an object literal config');
    assert.ok(semanticConfig, 'Expected SemanticEmbeddingService to receive an object literal config');
    assert.ok(serviceConfig.getProperty('events'), 'Expected events to be added to Service config');
    assert.equal(
      semanticConfig.getProperty('events'),
      undefined,
      'Did not expect events to be added to SemanticEmbeddingService config',
    );

    const methodsProperty = serviceConfig.getPropertyOrThrow('methods');
    assert.equal(methodsProperty.getText(), 'methods: [ping]');
  } finally {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  }
});
