import { createLogger, format, transports } from 'winston';

// Create a logger instance with the desired configuration.
export const logger = createLogger({
  level: 'info', // Set the logging level (e.g., 'info', 'error', 'debug').
  format: format.json(), // Log in JSON format for better structure and readability.
  defaultMeta: { service: 'myprose-service' }, // Default metadata for each log entry.
  transports: [
    new transports.Console({
      format: format.simple(), // Log in a simple format for console readability.
    }), // Log to the console.
    new transports.File({ filename: 'error.log', level: 'error' }), // Log errors to a file.
    // new transports.File({ filename: 'combined.log' }), // Log all levels to a combined file.
  ],
});

// If we're not in production, also log to the console with a simpler format.
// if (process.env.NODE_ENV !== 'production') {
//   logger.add(
//     new transports.Console({
//       format: format.simple(), // Log in a simple format for console readability.
//     })
//   );
// }
