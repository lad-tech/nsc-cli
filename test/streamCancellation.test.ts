import { strict as assert } from 'node:assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { Ajv } from 'ajv';
import { Project } from 'ts-morph';
import { generateIndexFile } from '../src/files/generateIndexFile.ts';
import { generateInterfacesFile } from '../src/files/generateInterfacesFile.ts';
import { generateMethods } from '../src/files/generateMethods.ts';
import { DefaultProjectSettings } from '../src/helpers/index.ts';
import type { MethodDefinition, ServiceSchema } from '../src/interfaces.ts';
import validator from '../src/serviceSchemaValidator.json' with { type: 'json' };

const method = (action: string, options: MethodDefinition['options'] = {}): MethodDefinition => ({
  action,
  description: action,
  request: { type: 'object', properties: {} },
  response: { type: 'object', properties: {} },
  options,
});

const schema: ServiceSchema = {
  name: 'Files',
  description: 'Stream cancellation generation',
  methods: {
    Plain: method('plain'),
    Upload: method('upload', {
      useStream: { request: true, maxRequestBytes: 1024, cancelOnDisconnect: true },
    }),
    Download: method('download', { useStream: { response: true, cancelOnDisconnect: true } }),
    Duplex: method('duplex', { useStream: { request: true, response: true } }),
  },
};

const withDirectory = async (run: (directory: string) => Promise<void>) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'nsc-cli-stream-'));
  try {
    await run(directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
};

const generate = async (directoryPath: string) => {
  await fs.writeFile(path.join(directoryPath, 'service.schema.json'), JSON.stringify(schema));
  await fs.writeFile(path.join(directoryPath, 'package.json'), '{"type":"module"}');
  const project = new Project({
    ...DefaultProjectSettings,
    compilerOptions: {
      ...DefaultProjectSettings.compilerOptions,
      lib: ['lib.es2022.d.ts'],
      skipLibCheck: true,
    },
  });
  const options = { project, schema, directoryPath, schemaFileName: 'service.schema.json' };
  await generateInterfacesFile(options);
  await generateIndexFile(options);
  await generateMethods(options);
  await project.save();
  return options;
};

test('generated clients forward optional call options for every transport', async () => {
  await withDirectory(async directory => {
    await fs.symlink(path.resolve('node_modules'), path.join(directory, 'node_modules'), 'dir');
    const { project } = await generate(directory);
    const source = project.getSourceFileOrThrow(path.join(directory, 'index.ts'));
    const clientClass = source.getClassOrThrow('Files');
    for (const action of ['plain', 'upload', 'download', 'duplex']) {
      const parameter = clientClass.getMethodOrThrow(action).getParameters()[1];
      assert.equal(parameter.getName(), 'callOptions');
      assert.equal(parameter.getTypeNodeOrThrow().getText(), 'CallOptions');
      assert.equal(parameter.hasQuestionToken(), true);
    }
    assert.match(source.getFullText(), /type CallOptions/);

    const { default: GeneratedClient } = await import(pathToFileURL(path.join(directory, 'index.ts')).href);
    const client = new GeneratedClient({});
    const calls: unknown[][] = [];
    client.request = async (...args: unknown[]) => {
      calls.push(args);
      return 'result';
    };
    const callOptions = { signal: new AbortController().signal };
    for (const [name, definition] of Object.entries(schema.methods)) {
      const payload = definition.options.useStream?.request ? Readable.from(['file']) : {};
      assert.equal(await client[definition.action](payload, callOptions), 'result');
      assert.deepEqual(calls.at(-1), [`Files.${definition.action}`, payload, schema.methods[name], callOptions]);
      assert.equal(await client[definition.action](payload), 'result');
      assert.equal(calls.at(-1)?.[3], undefined);
    }
  });
});

test('new handlers and their generated tests receive MethodContext and compile with toolkit 2.7', async () => {
  await withDirectory(async directory => {
    await fs.symlink(path.resolve('node_modules'), path.join(directory, 'node_modules'), 'dir');
    const { project } = await generate(directory);
    // Generated test skeletons use the consumer's Jest globals; no Jest runtime is needed here.
    project.createSourceFile(
      path.join(directory, 'test-globals.d.ts'),
      `
      declare const describe: (name: string, run: () => void) => void;
      declare const beforeEach: (run: () => void) => void;
      declare const jest: { clearAllMocks(): void };
      declare const test: { skip(name: string, run: () => Promise<void>): void };
      declare const expect: (value: unknown) => { rejects: { toThrow(): Promise<void> } };
    `,
    );
    for (const name of Object.keys(schema.methods)) {
      const source = project.getSourceFileOrThrow(path.join(directory, 'methods', name, 'index.ts'));
      const handler = source.getClassOrThrow(name).getMethodOrThrow('handler');
      const parameter = handler.getParameters()[1];
      assert.equal(parameter.getName(), 'context');
      assert.equal(parameter.getTypeNodeOrThrow().getText(), 'MethodContext');
      assert.match(source.getFullText(), /type MethodContext/);
      const tests = project.getSourceFileOrThrow(path.join(directory, 'methods', name, 'index.test.ts'));
      assert.match(tests.getFullText(), /signal: new AbortController\(\).signal/);
      assert.match(tests.getFullText(), /handler.call\(ctx, testData, methodContext\)/);
      // Demonstrate that signal-aware adapter code is type-safe in the generated handler.
      handler.setBodyText('context.signal.throwIfAborted(); throw new Error("not implemented");');
    }
    assert.equal(project.formatDiagnosticsWithColorAndContext(project.getPreEmitDiagnostics()), '');
  });
});

test('regeneration preserves existing handler and test implementations', async () => {
  await withDirectory(async directory => {
    const options = await generate(directory);
    const handlerPath = path.join(directory, 'methods', 'Upload', 'index.ts');
    const testPath = path.join(directory, 'methods', 'Upload', 'index.test.ts');
    const handler = '// User implementation: do not replace\n';
    const tests = '// User tests: do not replace\n';
    await fs.writeFile(handlerPath, handler);
    await fs.writeFile(testPath, tests);
    const project = new Project(DefaultProjectSettings);
    await generateMethods({ ...options, project });
    await generateIndexFile({ ...options, project });
    await project.save();
    assert.equal(await fs.readFile(handlerPath, 'utf8'), handler);
    assert.equal(await fs.readFile(testPath, 'utf8'), tests);
    assert.match(await fs.readFile(path.join(directory, 'index.ts'), 'utf8'), /callOptions/);
  });
});

test('the service schema validates HTTP stream limits and disconnect cancellation', () => {
  const validate = new Ajv().compile(validator);
  assert.equal(validate(schema), true);
  for (const maxRequestBytes of [1, Number.MAX_SAFE_INTEGER]) {
    assert.equal(
      validate({ ...schema, methods: { Upload: method('upload', { useStream: { maxRequestBytes } }) } }),
      true,
    );
  }
  for (const maxRequestBytes of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, '1024']) {
    const input = {
      ...schema,
      methods: { Upload: { ...schema.methods.Upload, options: { useStream: { maxRequestBytes } } } },
    };
    assert.equal(validate(input), false, `Accepted invalid maxRequestBytes: ${maxRequestBytes}`);
  }
  for (const cancelOnDisconnect of [true, false]) {
    assert.equal(
      validate({
        ...schema,
        methods: { Upload: method('upload', { useStream: { cancelOnDisconnect } }) },
      }),
      true,
    );
  }
  assert.equal(
    validate({
      ...schema,
      methods: { Upload: { ...schema.methods.Upload, options: { useStream: { cancelOnDisconnect: 'true' } } } },
    }),
    false,
  );
  assert.equal(validate({ ...schema, methods: { Plain: method('plain') } }), true);
});
