import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import {
  LoggerProvider,
  BatchLogRecordProcessor,
} from "@opentelemetry/sdk-logs";

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

const loggerProvider = new LoggerProvider({
  processors: [
    new BatchLogRecordProcessor(
      new OTLPLogExporter({
        url: `${endpoint}/v1/logs`,
      }),
    ),
  ],
});

const sdk = new NodeSDK({
  loggerProvider,
});

sdk.start();

console.log("OpenTelemetry iniciado");
