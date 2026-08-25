/**
 * AUTH_SECRET is mandatory. There is deliberately no fallback value:
 * starting the application with a predictable default secret would allow
 * tokens to be forged. The application therefore fails securely at startup
 * when the secret is missing or too short.
 */
export function getJwtSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new Error(
      'AUTH_SECRET environment variable is required and must be at least 32 characters long',
    );
  }
  return secret.trim();
}