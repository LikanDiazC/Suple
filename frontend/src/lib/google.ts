import { google } from 'googleapis';

/**
 * Creates a configured OAuth2 client with the given access token.
 * Reuses GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET from environment variables.
 */
export function getOAuth2Client(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );

  oauth2Client.setCredentials({ access_token: accessToken });

  return oauth2Client;
}
