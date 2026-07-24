import { NodeSDK } from "@opentelemetry/sdk-node";

import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";

import {
  LoggerProvider,
  BatchLogRecordProcessor,
} from "@opentelemetry/sdk-logs";

const exporter = new OTLPLogExporter({
  url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/logs`,
});

const loggerProvider = new LoggerProvider();

loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(exporter));

loggerProvider.register();

const sdk = new NodeSDK();

sdk.start();

console.log("OpenTelemetry iniciado");
