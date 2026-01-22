#!/usr/bin/env node

import { Ajv } from 'ajv';
import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { MicroService } from '../MicroService.js';
import ValidateSchema from '../serviceSchemaValidator.json' with { type: 'json' };
import { logger } from '../logger/index.js';
import { CLIError, SchemaValidationError } from '../errors/index.js';
import { validateSchemaPath, validateSchema } from '../validation/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));

async function main() {
  try {
    const program = new Command();
    program
      .name('nsc-cli')
      .version(packageJson.version)
      .description('Generate microservice from JSON schema')
      .requiredOption('-s, --schema <path>', 'Path to service schema (must be .json file)')
      .option('-p, --prettier-config <path>', 'Path to prettier config file')
      .option('-v, --verbose', 'Enable verbose logging')
      .option('-o, --output <path>', 'Output directory (defaults to schema directory)')
      .addHelpText(
        'after',
        `
Examples:
  $ nsc-cli --schema ./service.schema.json
  $ nsc-cli -s ./service.schema.json -v
  $ nsc-cli -s ./service.schema.json -p ./.prettierrc
  `,
      )
      .parse();

    const options = program.opts();

    // Enable verbose logging if requested
    if (options.verbose) {
      process.env.LOG_LEVEL = 'DEBUG';
    }

    const prettierConfigPath = options.prettierConfig;
    const pathToSchema = resolve(options.schema);

    validateSchemaPath(pathToSchema);

    const directoryPath = options.output || dirname(pathToSchema);
    const schemaFileName = `${pathToSchema.split('/').pop()}`;

    logger.info('Starting generation in:', directoryPath);

    const schema = JSON.parse(readFileSync(pathToSchema, 'utf-8'));
    validateSchema(schema);

    const validate = new Ajv().compile(ValidateSchema);
    const valid = validate(schema);
    if (!valid) {
      throw new SchemaValidationError('Schema validation failed', validate.errors || []);
    }

    await new MicroService().generate({
      schema,
      directoryPath,
      prettierConfigPath,
      schemaFileName,
    });
  } catch (err) {
    if (err instanceof CLIError) {
      logger.error(err.message);
      if (err instanceof SchemaValidationError) {
        logger.error('Validation errors:', JSON.stringify(err.errors, null, 2));
      }
      process.exit(err.exitCode);
    }
    logger.error('Unexpected error:', err);
    process.exit(1);
  }
}

main().catch(err => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
