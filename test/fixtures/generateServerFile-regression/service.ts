import { Service } from '@lad-tech/nsc-toolkit';
import { connect, NatsConnection } from 'nats';
import { SemanticEmbeddingService } from '@lad-tech/semantic-embedding';
import { oldMethod } from './methods/oldMethod';
import { name } from './service.schema';

export async function main(broker?: NatsConnection) {
  const brokerConnection =
    broker ||
    (await connect({
      servers: ['localhost:4222'],
      maxReconnectAttempts: -1,
    }));

  const embedding = new SemanticEmbeddingService({
    provider: 'openai',
    model: 'text-embedding-3-large',
  });

  const service = new Service({
    name,
    brokerConnection,
    methods: [oldMethod],
    gracefulShutdown: {
      additional: [embedding],
    },
  });

  await service.start();

  return service;
}
