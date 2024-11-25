import { Logs } from '@lad-tech/toolbelt';

          export type Logger = Logs.Logger;
          
          export class LogsOutputFormatter implements Logs.OutputFormatter {
            public format(params: Logs.FormatParameters): string {
              const time = new Date().toISOString();
              return JSON.stringify({
                time,
                request_id: params.metadata.traceId,
                level: params.verbosityString,
                location: params.location,
                msg: params.parsedArgs.join(' '),
              });
            }
          }
          
          export const logger = new Logs.Logger({
            outputFormatter: new LogsOutputFormatter(),
          });

